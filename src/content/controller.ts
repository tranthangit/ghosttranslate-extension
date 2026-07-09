import {
  type AIAction,
  type AIRequestPayload,
  type AppConfig,
  type LanguageCode,
  type ReplyLength,
  type RuntimeMessage,
  type Settings,
  type Tone,
  DEFAULT_SETTINGS,
} from '@/types';
import { EditorAdapter, isEditableElement, copyToClipboard } from '@/content/editorBridge';
import { GhostMode } from '@/content/ghostMode';
import { AIClient } from '@/content/aiClient';
import { KeyboardManager } from '@/keyboard/KeyboardManager';
import { debounce, nextRequestId, type Debounced } from '@/core/debounce';
import { detectLanguage, needsTranslation } from '@/core/languageDetect';
import { LANGUAGES, languageName } from '@/core/languages';
import { getActivationId, ACTIVATION_STORAGE_KEY } from '@/core/device';
import { getUsageCount, FREE_DAILY_LIMIT, USAGE_KEY } from '@/core/usage';
import { store, bindActions, type Rect, type SuggestionKind } from '@/content/store';
import { WORKER_ENDPOINT } from '@/config';
import { t } from '@/i18n/messages';

function toRect(r: DOMRect): Rect {
  return { top: r.top, left: r.left, bottom: r.bottom, right: r.right, width: r.width };
}

/** Deepest focused element, piercing nested shadow roots (Reddit, YouTube…). */
function deepActiveElement(): Element | null {
  let a: Element | null = document.activeElement;
  while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
  return a;
}

/** Whitespace-normalised comparison key. */
function normalizeText(s: string): string {
  return s.replace(/[\u00a0\u200b]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Normalise text while preserving line/paragraph structure: collapse spaces
 * within each line, but keep line breaks (and at most one blank line between
 * paragraphs) so translations stay readable instead of one long run.
 */
function normalizeMultiline(s: string): string {
  return s
    .replace(/[\u00a0\u200b]/g, ' ')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[^\S\n]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * GhostTranslateController is the brain of the content script. It owns the focused
 * editor, the typing pipeline (debounce -> detect -> AI -> suggestion/ghost),
 * keyboard handling, and keeps the React store in sync.
 */
export class GhostTranslateController {
  private settings: Settings = DEFAULT_SETTINGS;
  private adapter: EditorAdapter | null = null;
  private ghost: GhostMode | null = null;
  private readonly client = new AIClient();
  /** Separate channel so selection-translate doesn't fight the typing flow. */
  private readonly selClient = new AIClient();
  /** Dedicated channels for the AI Reply composer (draft + its translation). */
  private readonly replyClient = new AIClient();
  private readonly replyTransClient = new AIClient();
  private keyboard: KeyboardManager;
  private debouncedType!: Debounced<[]>;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private rafScheduled = false;
  /** Text we just wrote into the field via accept(); used to ignore the echo. */
  private lastWriteEcho: string | null = null;
  /** Live Range of the current page selection, so the popup can follow it on scroll. */
  private selectionRange: Range | null = null;

  constructor() {
    this.keyboard = new KeyboardManager({
      hasSuggestion: () => store.getState().suggestion?.status === 'ready' ||
        store.getState().suggestion?.status === 'streaming',
      onAccept: () => this.accept(),
      onDismiss: () => this.dismiss(),
      onToggleGhost: () => this.toggleGhostMode(),
      onCycleLanguage: () => this.cycleLanguage(),
      onOpenReply: () => this.openReply(),
    });
  }

  async init() {
    this.settings = await this.fetchSettings();
    store.set({ settings: this.settings });
    this.rebuildDebounce();
    void this.loadAppConfig();

    document.addEventListener('focusin', this.onFocusIn, true);
    document.addEventListener('focusout', this.onFocusOut, true);
    document.addEventListener('input', this.onInput, true);
    document.addEventListener('selectionchange', this.onSelectionChange);
    document.addEventListener('mouseup', this.onMouseUp, true);
    document.addEventListener('mousedown', this.onMouseDown, true);
    window.addEventListener('scroll', this.scheduleReposition, true);
    window.addEventListener('resize', this.scheduleReposition);

    chrome.runtime.onMessage.addListener((msg: RuntimeMessage) => this.onRuntimeMessage(msg));

    // Keep the free-usage counter on the toolbar in sync.
    void this.refreshUsage();
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && (changes[USAGE_KEY] || changes[ACTIVATION_STORAGE_KEY])) {
        void this.refreshUsage();
      }
    });

    this.keyboard.start();
    this.bindUIActions();

    // If an editor is already focused at load time.
    const active = deepActiveElement();
    if (isEditableElement(active)) {
      this.attach(active as HTMLElement);
    }
  }

  // ---- Settings ------------------------------------------------------------
  private fetchSettings(): Promise<Settings> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (res: Settings) => {
        resolve(res ?? DEFAULT_SETTINGS);
      });
    });
  }

  private persistSettings(partial: Partial<Settings>) {
    this.settings = { ...this.settings, ...partial };
    store.set({ settings: this.settings });
    chrome.runtime.sendMessage({ type: 'SET_SETTINGS', settings: partial });
    if ('debounceMs' in partial || 'ghostDebounceMs' in partial || 'ghostMode' in partial) {
      this.rebuildDebounce();
    }
  }

  private rebuildDebounce() {
    this.debouncedType?.cancel();
    // Ghost Mode rewrites the field live, so it gets its own (usually longer)
    // delay to avoid firing on every keystroke.
    const wait = this.settings.ghostMode ? this.settings.ghostDebounceMs : this.settings.debounceMs;
    this.debouncedType = debounce(() => this.runPipeline(), wait);
  }

  /** Show the free-tier daily counter on the toolbar (hidden when activated). */
  private async refreshUsage() {
    const activationId = await getActivationId();
    if (activationId) {
      store.set({ freeUsage: null });
      return;
    }
    const used = await getUsageCount();
    let limit = FREE_DAILY_LIMIT;
    try {
      const c = await chrome.storage.local.get('gt:appConfig');
      const cfg = c['gt:appConfig'] as AppConfig | undefined;
      if (cfg?.freeDailyLimit && cfg.freeDailyLimit > 0) limit = cfg.freeDailyLimit;
    } catch {
      /* ignore */
    }
    store.set({ freeUsage: { used, limit } });
  }

  // ---- App config (admin-controlled model list) ----------------------------
  /**
   * Load the global config from cache (instant) then refresh from the worker.
   * When users aren't allowed to pick a model, force the default.
   */
  private async loadAppConfig() {
    try {
      const cached = await chrome.storage.local.get('gt:appConfig');
      const c = cached['gt:appConfig'] as AppConfig | undefined;
      if (c && Array.isArray(c.models)) this.applyAppConfig(c);
    } catch {
      /* ignore */
    }

    try {
      const res = await fetch(WORKER_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: true }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data && data.ok !== false && Array.isArray(data.models)) {
        const cfg: AppConfig = {
          models: data.models,
          defaultModel: data.defaultModel,
          allowUserModelSelection: data.allowUserModelSelection !== false,
          engines: data.engines,
          freeDailyLimit: Number(data.freeDailyLimit) || undefined,
        };
        await chrome.storage.local.set({ 'gt:appConfig': cfg });
        this.applyAppConfig(cfg);
        void this.refreshUsage();
      }
    } catch {
      /* worker unreachable -> keep cached/default config */
    }
  }

  private applyAppConfig(cfg: AppConfig) {
    store.set({ appConfig: cfg });
    // When selection is locked, or the saved model is no longer offered,
    // force a valid model.
    const offered = cfg.models.some((m) => m.id === this.settings.model);
    if (!cfg.allowUserModelSelection) {
      if (this.settings.model !== cfg.defaultModel) this.persistSettings({ model: cfg.defaultModel });
    } else if (!offered && cfg.defaultModel) {
      this.persistSettings({ model: cfg.defaultModel });
    }
  }

  private isDomainDisabled(): boolean {
    return this.settings.disabledDomains.includes(location.hostname);
  }

  /** Admin-configured engine for a feature, with sensible defaults. */
  private engineFor(feature: 'typing' | 'selection'): 'ai' | 'azure' | 'hybrid' {
    const engines = store.getState().appConfig?.engines;
    if (engines && engines[feature]) return engines[feature];
    return feature === 'selection' ? 'azure' : 'ai';
  }

  // ---- Focus tracking ------------------------------------------------------
  private onFocusIn = (e: FocusEvent) => {
    // Never treat our own in-page UI (e.g. the language search box) as an
    // editor — focusing it must not attach/detach or disturb the page.
    if (this.isOnOwnUI(e)) return;
    const target = this.editableFromEvent(e);
    if (target) this.attach(target);
  };

  /**
   * Find the real editable element for an event, looking through shadow DOM.
   * Sites built on web components (Reddit, YouTube, …) retarget `e.target` to
   * the shadow host, so we scan the composed path for the actual input.
   */
  private editableFromEvent(e: Event): HTMLElement | null {
    const path = (e.composedPath?.() ?? []) as EventTarget[];
    for (const n of path) {
      if (n instanceof HTMLElement && isEditableElement(n)) return n;
    }
    const t = e.target as Element | null;
    return isEditableElement(t) ? (t as HTMLElement) : null;
  }

  private onFocusOut = () => {
    // Delay so clicks on the toolbar (in shadow DOM) don't detach the editor.
    setTimeout(() => {
      const active = document.activeElement;
      // Focus landing inside our own shadow host reports as the host element
      // (not editable) — don't treat that as leaving the editor.
      if (active && active.id === 'ghosttranslate-host') return;
      // Pierce shadow roots so focus moving between web-component editors
      // (Reddit) isn't mistaken for leaving the editor entirely.
      if (!isEditableElement(deepActiveElement())) this.detach();
    }, 150);
  };

  private attach(el: HTMLElement) {
    if (!this.settings.enabled || this.isDomainDisabled()) return;
    if (this.adapter?.el === el) return;
    this.adapter = new EditorAdapter(el);
    this.ghost = new GhostMode(this.adapter);
    this.client.cancelCurrent();
    store.set({
      toolbarVisible: true,
      editorRect: toRect(el.getBoundingClientRect()),
      suggestion: null,
      detectedLanguage: null,
    });
  }

  private detach() {
    this.adapter = null;
    this.ghost?.reset();
    this.ghost = null;
    this.lastWriteEcho = null;
    this.client.cancelCurrent();
    this.debouncedType?.cancel();
    store.set({ toolbarVisible: false, suggestion: null, editorRect: null, caretRect: null });
  }

  // ---- Input pipeline ------------------------------------------------------
  private onInput = (e: Event) => {
    if (!this.adapter) return;
    // In shadow DOM the input event is retargeted to the host, so match the
    // adapter element via the composed path too.
    const path = (e.composedPath?.() ?? []) as EventTarget[];
    if (e.target !== this.adapter.el && !path.includes(this.adapter.el)) return;
    // Ignore our own programmatic writes (Ghost Mode feedback loop guard).
    if (this.ghost?.isSuppressing) return;
    // Ignore the async echo Lexical/Draft emit after our write settles.
    if (this.settings.ghostMode && this.ghost?.isOwnValue(this.adapter.getComposableText())) return;
    // Ignore the echo of an accepted suggestion we just inserted (full field or
    // composable region, depending on the action).
    if (this.lastWriteEcho != null) {
      const echo = normalizeText(this.lastWriteEcho);
      if (
        normalizeText(this.adapter.getText()) === echo ||
        normalizeText(this.adapter.getComposableText()) === echo
      )
        return;
      this.lastWriteEcho = null; // genuine new typing -> resume normally
    }

    this.scheduleReposition();

    if (this.adapter.isEmpty()) {
      this.client.cancelCurrent();
      this.debouncedType.cancel();
      store.set({ suggestion: null, detectedLanguage: null });
      return;
    }
    // Typing invalidates the previous suggestion immediately.
    this.client.cancelCurrent();
    this.debouncedType();
  };

  private onSelectionChange = () => {
    if (this.adapter?.kind === 'contenteditable') this.scheduleReposition();
  };

  // ---- Selection translate (highlight any text on the page) ---------------
  private onMouseDown = (e: MouseEvent) => {
    if (this.isOnOwnUI(e)) return;
    // A pinned card stays open regardless of clicks elsewhere.
    if (store.getState().selectionPinned) return;
    // Starting a new click/selection dismisses any selection popup.
    const st = store.getState();
    if (st.selection || st.selectionTranslation) {
      this.selClient.cancelCurrent();
      this.selectionRange = null;
      store.set({ selection: null, selectionTranslation: null });
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (this.isOnOwnUI(e)) return;
    // Don't override a pinned card with a new selection.
    if (store.getState().selectionPinned) return;
    // Let the browser finalise the selection first.
    setTimeout(() => this.refreshSelection(), 10);
  };

  private isOnOwnUI(e: Event): boolean {
    const path = (e.composedPath?.() ?? []) as HTMLElement[];
    return path.some((n) => n && n.id === 'ghosttranslate-host');
  }

  private refreshSelection() {
    if (!this.settings.enabled || this.isDomainDisabled()) return;
    if (!this.settings.selectionTranslate) return;
    const sel = window.getSelection();
    // Keep line/paragraph breaks so the translation stays nicely formatted
    // instead of collapsing into one long run of text.
    const text = normalizeMultiline(sel?.toString() ?? '');
    if (!sel || sel.isCollapsed || text.length < 2) return;

    // Some editors render their placeholder as real, selectable text. Selecting
    // it inside an otherwise-empty field shouldn't pop the translate bubble.
    if (this.adapter && this.adapter.isEmpty()) {
      const a = sel.anchorNode;
      if (a && (a === this.adapter.el || this.adapter.el.contains(a))) return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (!rect.width && !rect.height) return;

    // Keep a live clone of the range so the popup can re-anchor while the
    // user scrolls the page (or a scrollable container like ChatGPT).
    this.selectionRange = range.cloneRange();

    store.set({
      selection: { text, rect: toRect(rect) },
      selectionTranslation: null,
    });
  }

  translateSelection() {
    const sel = store.getState().selection;
    if (!sel) return;
    if (this.freeLimitReached()) {
      store.set({
        selectionTranslation: { text: '', status: 'error', error: t(this.settings.uiLanguage, 'toast.freeLimit') },
      });
      return;
    }
    const requestId = nextRequestId();
    store.set({ selectionTranslation: { text: '', status: 'loading' } });

    // Read the target straight from the store — that's exactly what the picker
    // shows — so a stale controller copy can never translate into the wrong one.
    const s = store.getState().settings;
    const payload: AIRequestPayload = {
      requestId,
      action: 'translate',
      text: sel.text,
      engine: this.engineFor('selection'),
      tone: s.tone,
      targetLanguage: s.selectionTargetLanguage,
      sourceLanguage: 'auto',
      model: s.model,
      streaming: s.streaming,
    };
    this.selClient.send(payload, {
      onChunk: (_d, full) => store.set({ selectionTranslation: { text: full, status: 'streaming' } }),
      onDone: (full) =>
        store.set({
          selectionTranslation: full
            ? { text: full, status: 'ready' }
            : { text: '', status: 'error', error: 'No result' },
        }),
      onError: (error) => store.set({ selectionTranslation: { text: '', status: 'error', error } }),
    });
  }

  dismissSelection() {
    this.selClient.cancelCurrent();
    this.selectionRange = null;
    store.set({ selection: null, selectionTranslation: null, selectionPinned: false });
  }

  togglePinSelection() {
    store.set({ selectionPinned: !store.getState().selectionPinned });
  }

  /** Core decision: translate, autocomplete, or ghost-rewrite. */
  private runPipeline() {
    if (!this.adapter || !this.settings.enabled) return;
    const text = this.adapter.getComposableText();
    if (!text.trim()) return;

    const target = this.settings.targetLanguage;
    const detected = detectLanguage(text);
    store.set({ detectedLanguage: languageName(detected.language) });

    if (this.settings.ghostMode) {
      // Continuously normalise the whole field into the target language.
      // (We don't skip when it "looks" like the target, because after the
      // first rewrite the field is already target language but the user keeps
      // appending source-language words.) applyTranslation no-ops when the
      // result equals the current text, so this is loop-safe.
      //
      // Exception: Slate editors (Discord) reject automatic programmatic
      // rewriting (no user gesture), so Ghost Mode there degrades to a
      // Tab-to-accept suggestion. Lexical (Facebook/Messenger) writes fine
      // automatically, so it stays live.
      if (this.adapter.isSlate()) {
        this.request('translate', text, undefined, false);
      } else {
        this.request('translate', text, undefined, true);
      }
      return;
    }

    const sameAsTarget = !needsTranslation(this.activeLine(text), target);
    if (sameAsTarget) {
      // Already in the target language -> Copilot-style continuation.
      if (this.settings.enableContinue) {
        const before = this.adapter.getTextBeforeCaret();
        this.request('continue', before, text, false);
      }
    } else {
      // Different language -> live translation suggestion.
      this.request('translate', text, undefined, false);
    }
  }

  /** The most recent non-empty line — what the user is actively typing. */
  private activeLine(text: string): string {
    const lines = text.split('\n').filter((l) => l.trim());
    return lines.length ? lines[lines.length - 1] : text;
  }

  /** True when the free daily quota is used up (only relevant on the free tier). */
  private freeLimitReached(): boolean {
    const fu = store.getState().freeUsage;
    return !!fu && fu.used >= fu.limit;
  }

  private request(action: AIAction, text: string, context: string | undefined, ghost: boolean) {
    if (!this.adapter) return;
    // Block translations once the free daily limit is reached.
    if (action === 'translate' && this.freeLimitReached()) {
      if (!ghost) store.set({ suggestion: null });
      this.showToast(t(this.settings.uiLanguage, 'toast.freeLimit'));
      return;
    }
    const kind: SuggestionKind = action === 'continue' ? 'continue' : action === 'rewrite' ? 'rewrite' : 'translate';
    const requestId = nextRequestId();
    const startedAt = performance.now();
    let firstByte = false;

    const payload: AIRequestPayload = {
      requestId,
      action,
      text,
      context,
      // Engine is admin-configurable per feature (typing covers Ghost Mode too).
      engine: action === 'translate' ? this.engineFor('typing') : undefined,
      tone: this.settings.tone,
      targetLanguage: this.settings.targetLanguage,
      sourceLanguage: 'auto',
      model: this.settings.model,
      streaming: this.settings.streaming,
    };

    if (!ghost) {
      store.set({
        suggestion: { kind, text: '', status: 'loading' },
        caretRect: toRect(this.adapter.getCaretRect()),
      });
    }

    this.client.send(payload, {
      onChunk: (_delta, full) => {
        if (!firstByte) {
          firstByte = true;
          store.set({ latencyMs: Math.round(performance.now() - startedAt) });
        }
        if (!ghost) {
          store.set({ suggestion: { kind, text: full, status: 'streaming' } });
        }
      },
      onDone: (full) => {
        store.set({ latencyMs: Math.round(performance.now() - startedAt) });
        if (ghost) {
          this.ghost?.applyTranslation(full);
        } else if (full && normalizeText(full) !== normalizeText(text)) {
          store.set({ suggestion: { kind, text: full, status: 'ready' } });
        } else {
          // Empty result, or translation identical to the source (already in
          // the target language) -> nothing useful to suggest.
          store.set({ suggestion: null });
        }
      },
      onError: (error) => {
        if (!ghost) store.set({ suggestion: { kind, text: '', status: 'error', error } });
      },
    });
  }

  // ---- Suggestion actions --------------------------------------------------
  accept() {
    const { suggestion } = store.getState();
    if (!this.adapter || !suggestion) return;
    if (suggestion.status !== 'ready' && suggestion.status !== 'streaming') return;
    if (!suggestion.text) return;

    if (suggestion.kind === 'continue') {
      // Expected resulting text (caret usually at end) so we can ignore the echo.
      this.lastWriteEcho = this.adapter.getText() + suggestion.text;
      this.adapter.insertAtCaret(suggestion.text);
    } else if (this.adapter.needsClipboardFallback()) {
      // Stubborn editors (Slate, Google Flow, …): auto-fill desyncs their model,
      // so copy the result and let the user paste it natively (Ctrl+V).
      const text = suggestion.text;
      const el = this.adapter.el;
      void copyToClipboard(text).then((ok) => {
        el.focus();
        this.showToast(
          t(this.settings.uiLanguage, ok ? 'toast.copyPaste' : 'toast.copyFail'),
          ok ? 4000 : 3000,
        );
      });
    } else {
      // Replace the composable text (keeps any quoted reply in email clients).
      this.lastWriteEcho = suggestion.text;
      void this.adapter.setComposableAll(suggestion.text);
    }
    store.set({ suggestion: null });
  }

  dismiss() {
    this.client.cancelCurrent();
    store.set({ suggestion: null });
  }

  // ---- Toolbar-triggered actions ------------------------------------------
  translate() {
    if (!this.adapter) return;
    const text = this.adapter.getComposableText();
    if (text.trim()) this.request('translate', text, undefined, false);
  }

  rewrite() {
    if (!this.adapter) return;
    const text = this.adapter.getComposableText();
    if (text.trim()) this.request('rewrite', text, undefined, false);
  }

  toggleGhostMode() {
    // Slate (Discord, Google Flow, …) rejects programmatic live rewriting, so
    // Ghost Mode can't work there. Refuse to enable it and tell the user.
    if (!this.settings.ghostMode && this.adapter?.isSlate()) {
      this.showToast(t(this.settings.uiLanguage, 'toast.ghostUnsupported'));
      return;
    }
    const next = !this.settings.ghostMode;
    this.persistSettings({ ghostMode: next });
    this.ghost?.reset();
    this.showToast(
      next ? t(this.settings.uiLanguage, 'toast.ghostOn') : t(this.settings.uiLanguage, 'toast.ghostOff'),
    );
    if (next) this.runPipeline();
  }

  cycleLanguage() {
    const idx = LANGUAGES.findIndex((l) => l.code === this.settings.targetLanguage);
    const next = LANGUAGES[(idx + 1) % LANGUAGES.length];
    this.setTargetLanguage(next.code);
    this.showToast(t(this.settings.uiLanguage, 'toast.target', { lang: next.label }));
  }

  setTargetLanguage(code: LanguageCode) {
    this.persistSettings({ targetLanguage: code });
  }

  setSelectionTargetLanguage(code: LanguageCode) {
    this.persistSettings({ selectionTargetLanguage: code });
  }

  setTone(tone: Tone) {
    this.persistSettings({ tone });
  }

  setModel(id: string) {
    this.persistSettings({ model: id });
  }

  toggleCollapsed() {
    this.persistSettings({ toolbarCollapsed: !this.settings.toolbarCollapsed });
  }

  openSettings() {
    chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
  }

  // ---- AI Reply composer ---------------------------------------------------
  /** Open the composer, seeding the source with the selection or editor text. */
  openReply() {
    if (!this.settings.enableReply) return;
    const sel = store.getState().selection?.text?.trim() ?? '';
    const editorText = this.adapter?.getText().trim() ?? '';
    const source = sel || editorText;
    store.set({
      reply: {
        open: true,
        source,
        length: this.settings.replyLength,
        replyLanguage: this.settings.targetLanguage,
        translateTo: this.settings.selectionTargetLanguage,
        draft: { text: '', status: 'idle' },
        translation: { text: '', status: 'idle' },
      },
    });
  }

  closeReply() {
    this.replyClient.cancelCurrent();
    this.replyTransClient.cancelCurrent();
    store.set({ reply: null });
  }

  setReplySource(text: string) {
    const r = store.getState().reply;
    if (!r) return;
    store.set({ reply: { ...r, source: text } });
  }

  setReplyLength(len: ReplyLength) {
    const r = store.getState().reply;
    if (!r) return;
    store.set({ reply: { ...r, length: len } });
    if (r.draft.status !== 'idle') this.generateReply();
  }

  setReplyLanguage(code: LanguageCode) {
    const r = store.getState().reply;
    if (!r) return;
    store.set({ reply: { ...r, replyLanguage: code } });
    if (r.draft.status !== 'idle') this.generateReply();
  }

  setReplyTranslateTo(code: LanguageCode) {
    const r = store.getState().reply;
    if (!r) return;
    store.set({ reply: { ...r, translateTo: code } });
    if (r.draft.status === 'ready' && r.draft.text) this.translateReply(r.draft.text);
  }

  /** Draft (or re-draft, with an optional improvement instruction) the reply. */
  generateReply(instruction?: string) {
    const r = store.getState().reply;
    if (!r || !r.source.trim()) return;
    if (this.freeLimitReached()) {
      store.set({
        reply: {
          ...r,
          draft: { text: '', status: 'error', error: t(this.settings.uiLanguage, 'toast.freeLimit') },
        },
      });
      return;
    }

    const requestId = nextRequestId();
    store.set({
      reply: { ...r, draft: { text: '', status: 'loading' }, translation: { text: '', status: 'idle' } },
    });

    const payload: AIRequestPayload = {
      requestId,
      action: 'reply',
      text: r.source,
      instruction,
      replyLength: r.length,
      replyLanguage: r.replyLanguage,
      tone: this.settings.tone,
      targetLanguage: this.settings.targetLanguage,
      sourceLanguage: 'auto',
      model: this.settings.model,
      streaming: this.settings.streaming,
    };

    this.replyClient.send(payload, {
      onChunk: (_d, full) => {
        const cur = store.getState().reply;
        if (cur) store.set({ reply: { ...cur, draft: { text: full, status: 'streaming' } } });
      },
      onDone: (full) => {
        const cur = store.getState().reply;
        if (!cur) return;
        if (full) {
          store.set({ reply: { ...cur, draft: { text: full, status: 'ready' } } });
          this.translateReply(full);
        } else {
          store.set({ reply: { ...cur, draft: { text: '', status: 'error', error: 'No result' } } });
        }
      },
      onError: (error) => {
        const cur = store.getState().reply;
        if (cur) store.set({ reply: { ...cur, draft: { text: '', status: 'error', error } } });
      },
    });
  }

  /** Translate the drafted reply into the comprehension language. */
  private translateReply(draftText: string) {
    const r = store.getState().reply;
    if (!r) return;
    const requestId = nextRequestId();
    store.set({ reply: { ...r, translation: { text: '', status: 'loading' } } });

    const payload: AIRequestPayload = {
      requestId,
      action: 'translate',
      text: draftText,
      engine: 'azure',
      tone: this.settings.tone,
      targetLanguage: r.translateTo,
      sourceLanguage: 'auto',
      model: this.settings.model,
      streaming: this.settings.streaming,
    };

    this.replyTransClient.send(payload, {
      onChunk: (_d, full) => {
        const cur = store.getState().reply;
        if (cur) store.set({ reply: { ...cur, translation: { text: full, status: 'streaming' } } });
      },
      onDone: (full) => {
        const cur = store.getState().reply;
        if (cur)
          store.set({
            reply: {
              ...cur,
              translation: full
                ? { text: full, status: 'ready' }
                : { text: '', status: 'error', error: 'No result' },
            },
          });
      },
      onError: (error) => {
        const cur = store.getState().reply;
        if (cur) store.set({ reply: { ...cur, translation: { text: '', status: 'error', error } } });
      },
    });
  }

  /** Insert the drafted reply into the focused editor. */
  insertReply() {
    const r = store.getState().reply;
    if (!r || !this.adapter) return;
    const text = r.draft.text;
    if (!text) return;
    this.lastWriteEcho = text;
    void this.adapter.setAll(text);
    store.set({ reply: null });
  }

  openSidePanel() {
    chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
  }

  private showToast(text: string, duration = 1800) {
    store.set({ toast: text });
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => store.set({ toast: null }), duration);
  }

  // ---- External events -----------------------------------------------------
  private onRuntimeMessage(msg: RuntimeMessage) {
    if (msg.type === 'SETTINGS_UPDATED') {
      this.settings = msg.settings;
      store.set({ settings: msg.settings });
      this.rebuildDebounce();
    } else if (msg.type === 'COMMAND') {
      if (msg.command === 'toggle-ghost-mode') this.toggleGhostMode();
      if (msg.command === 'cycle-target-language') this.cycleLanguage();
      if (msg.command === 'open-ai-reply') this.openReply();
    }
  }

  private scheduleReposition = () => {
    if (this.rafScheduled) return;
    this.rafScheduled = true;
    requestAnimationFrame(() => {
      this.rafScheduled = false;
      if (this.adapter) {
        store.set({
          editorRect: toRect(this.adapter.el.getBoundingClientRect()),
          caretRect: toRect(this.adapter.getCaretRect()),
        });
      }
      this.repositionSelection();
    });
  };

  /** Re-anchor the selection popup to the highlighted text as the page scrolls. */
  private repositionSelection() {
    if (!this.selectionRange) return;
    // Pinned cards stay fixed on screen — don't follow the text.
    if (store.getState().selectionPinned) return;
    const sel = store.getState().selection;
    if (!sel) return;

    // Re-validate against the LIVE selection: if the highlight is gone (caret
    // collapsed, e.g. the user clicked into a field or an editor auto-selected
    // its placeholder then cleared it), dismiss the popup instead of keeping a
    // stale one anchored to old text.
    const live = window.getSelection();
    if (!live || live.isCollapsed || (live.toString() ?? '').trim().length < 2) {
      this.selClient.cancelCurrent();
      this.selectionRange = null;
      store.set({ selection: null, selectionTranslation: null });
      return;
    }

    const rect = this.selectionRange.getBoundingClientRect();
    // A zero rect means the range got detached (DOM changed) -> keep last pos.
    if (!rect.width && !rect.height) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Hide while the text is fully outside the viewport; restore when back.
    const hidden =
      rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw;

    store.set({ selection: { ...sel, rect: toRect(rect), hidden } });
  }

  private bindUIActions() {
    bindActions({
      accept: () => this.accept(),
      dismiss: () => this.dismiss(),
      translate: () => this.translate(),
      rewrite: () => this.rewrite(),
      toggleGhostMode: () => this.toggleGhostMode(),
      setTone: (t) => this.setTone(t),
      setTargetLanguage: (c) => this.setTargetLanguage(c),
      setSelectionTargetLanguage: (c) => this.setSelectionTargetLanguage(c),
      setModel: (m) => this.setModel(m),
      toggleCollapsed: () => this.toggleCollapsed(),
      translateSelection: () => this.translateSelection(),
      dismissSelection: () => this.dismissSelection(),
      togglePinSelection: () => this.togglePinSelection(),
      openSettings: () => this.openSettings(),
      openSidePanel: () => this.openSidePanel(),
      openReply: () => this.openReply(),
      closeReply: () => this.closeReply(),
      setReplySource: (text) => this.setReplySource(text),
      setReplyLength: (len) => this.setReplyLength(len),
      setReplyLanguage: (c) => this.setReplyLanguage(c),
      setReplyTranslateTo: (c) => this.setReplyTranslateTo(c),
      generateReply: (instruction) => this.generateReply(instruction),
      insertReply: () => this.insertReply(),
    });
  }
}
