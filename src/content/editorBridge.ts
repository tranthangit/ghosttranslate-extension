// ============================================================================
// Editor Bridge
//
// A uniform adapter over the two kinds of editable surfaces on the web:
//   1. <textarea> / <input type="text|search|...">
//   2. [contenteditable] elements (Gmail, Messenger, Slack, Discord, ...)
//
// It exposes value access, caret position, caret screen-rect (for placing the
// suggestion popup) and text mutation that fires the right input events so the
// host page's framework (React/Vue/Lexical/Draft.js) reacts correctly.
// ============================================================================

const EDITABLE_INPUT_TYPES = new Set([
  'text',
  'search',
  'url',
  'email',
  'tel',
  '',
]);

export function isEditableElement(el: Element | null): el is HTMLElement {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled;
  if (el instanceof HTMLInputElement) {
    return EDITABLE_INPUT_TYPES.has(el.type) && !el.readOnly && !el.disabled;
  }
  if (el.isContentEditable) return true;
  return false;
}

export type EditorKind = 'textarea' | 'contenteditable';

/**
 * Selectors for quoted reply / signature blocks that email clients append below
 * the user's new text (Gmail, Outlook, Thunderbird, Apple Mail, …). Everything
 * from the first match onward is NOT the user's composable text.
 */
const QUOTE_SELECTORS = [
  '.gmail_quote',
  '.gmail_quote_container',
  '.gmail_extra',
  '.gmail_signature',
  'blockquote[type="cite"]',
  '.moz-cite-prefix',
  '#divRplyFwdMsg',
  '#appendonsend',
  '[id^="OLK_SRC_BODY_SECTION"]',
  'div[name="messageReplySection"]',
].join(',');

export class EditorAdapter {
  readonly kind: EditorKind;

  constructor(public readonly el: HTMLElement) {
    this.kind =
      el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement
        ? 'textarea'
        : 'contenteditable';
  }

  getText(): string {
    if (this.kind === 'textarea') {
      return (this.el as HTMLTextAreaElement | HTMLInputElement).value;
    }
    return this.el.innerText;
  }

  /**
   * The user's own text, excluding any quoted reply / signature block. In a
   * Gmail reply this returns only what the user typed above the "On … wrote:"
   * quote, so we don't translate the whole original message.
   *
   * Robust by design: if anything goes wrong, or stripping the quote leaves
   * nothing, we fall back to the full text so translation / Ghost Mode keep
   * working instead of silently doing nothing.
   */
  getComposableText(): string {
    const full = this.getText();
    if (this.kind !== 'contenteditable') return full;
    try {
      if (!this.el.querySelector(QUOTE_SELECTORS)) return full;
      const clone = this.el.cloneNode(true) as HTMLElement;
      clone.querySelectorAll(QUOTE_SELECTORS).forEach((n) => n.remove());
      clone.style.cssText = 'position:absolute;left:-9999px;top:0;white-space:pre-wrap';
      document.body.appendChild(clone);
      const text = clone.innerText;
      clone.remove();
      return text.trim() ? text : full;
    } catch {
      return full;
    }
  }

  /**
   * Replace only the composable text (everything before the quote), preserving
   * the quoted reply. Uses a Range so it works no matter how the typed text and
   * the quote are nested (e.g. both inside one Gmail wrapper). Falls back to a
   * full replace when there's no quote block.
   */
  async setComposableAll(text: string): Promise<void> {
    const quote = this.kind === 'contenteditable' ? this.el.querySelector(QUOTE_SELECTORS) : null;
    if (!quote) {
      await this.setAll(text);
      return;
    }
    this.el.focus();
    try {
      // Select and delete exactly the content before the quote, wherever it is.
      const range = document.createRange();
      range.setStart(this.el, 0);
      range.setEndBefore(quote);
      range.deleteContents();
      // Insert the new text (one <div> per line) right before the quote.
      const frag = document.createDocumentFragment();
      for (const line of text.split('\n')) {
        const div = document.createElement('div');
        if (line === '') div.appendChild(document.createElement('br'));
        else div.appendChild(document.createTextNode(line));
        frag.appendChild(div);
      }
      range.insertNode(frag);
      // Caret just before the quote (end of the composable region).
      const sel = window.getSelection();
      if (sel) {
        const r = document.createRange();
        r.setStartBefore(quote);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
      }
      this.el.dispatchEvent(
        new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText', data: text }),
      );
    } catch {
      await this.setAll(text);
    }
  }

  isEmpty(): boolean {
    return this.getText().trim().length === 0;
  }

  /**
   * True for "controlled" rich-text editors (Slate=Discord, Lexical=Messenger,
   * Draft) that reject continuous programmatic rewriting. Ghost Mode degrades
   * to a Tab-to-accept suggestion on these.
   */
  isControlled(): boolean {
    return this.kind === 'contenteditable' && isControlledEditor(this.el);
  }

  /**
   * True only for Slate editors (Discord), which reject automatic (no user
   * gesture) writes. Ghost Mode degrades to a Tab-to-accept suggestion here;
   * Lexical (Facebook/Messenger) and others stay live.
   */
  isSlate(): boolean {
    return this.kind === 'contenteditable' && isSlateEditor(this.el);
  }

  /**
   * True when this editor can't be auto-filled reliably (Slate / bespoke React
   * contenteditables) — accept should copy the result and ask the user to
   * paste (Ctrl+V) instead.
   */
  needsClipboardFallback(): boolean {
    return this.kind === 'contenteditable' && needsClipboardPaste(this.el);
  }

  /** Caret character offset from the start of the field. */
  getCaretOffset(): number {
    if (this.kind === 'textarea') {
      return (this.el as HTMLTextAreaElement | HTMLInputElement).selectionStart ?? this.getText().length;
    }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return this.getText().length;
    const range = sel.getRangeAt(0).cloneRange();
    range.selectNodeContents(this.el);
    range.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset);
    return range.toString().length;
  }

  /** Text before the caret — used as context for autocomplete. */
  getTextBeforeCaret(): string {
    return this.getText().slice(0, this.getCaretOffset());
  }

  /** Screen rectangle of the caret, used to anchor popups. */
  getCaretRect(): DOMRect {
    if (this.kind === 'contenteditable') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0).cloneRange();
        const rects = range.getClientRects();
        if (rects.length > 0) return rects[rects.length - 1];
      }
    }
    // Fallback: anchor to the element box (also used for textarea, where
    // measuring exact caret pixels is unreliable across fonts/wrapping).
    return this.el.getBoundingClientRect();
  }

  focus() {
    this.el.focus();
  }

  /** Replace the entire content (Ghost Mode rewrites / translate accept). */
  async setAll(text: string): Promise<void> {
    if (this.kind === 'textarea') {
      const input = this.el as HTMLTextAreaElement | HTMLInputElement;
      input.focus();
      // Prefer a native, trusted edit: select everything then insertText. This
      // fires a *trusted* `input` event that React-controlled fields reliably
      // turn into an onChange/state update — unlike a programmatic value set,
      // which some apps (e.g. Google Flow) ignore, leaving their state empty
      // ("you must provide a prompt") even though the DOM shows the text.
      try {
        input.select();
        const ok = document.execCommand('insertText', false, text);
        if (ok && input.value === text) {
          input.setSelectionRange(text.length, text.length);
          input.dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }
      } catch {
        /* fall through to the native-setter path */
      }
      setNativeValue(input, text);
      input.setSelectionRange(text.length, text.length);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      await replaceAllContentEditable(this.el, text);
    }
  }

  /** Insert text at the caret (Tab-accept of a continuation). */
  insertAtCaret(text: string) {
    if (this.kind === 'textarea') {
      const input = this.el as HTMLTextAreaElement | HTMLInputElement;
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? start;
      const next = input.value.slice(0, start) + text + input.value.slice(end);
      setNativeValue(input, next);
      const caret = start + text.length;
      input.setSelectionRange(caret, caret);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      insertAtCaretContentEditable(this.el, text);
    }
  }
}

/**
 * Set a value on an input/textarea while bypassing React's value tracker so
 * the synthetic `input` event is recognised as a real change.
 */
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  const tracker = (el as unknown as { _valueTracker?: { setValue(v: string): void } })._valueTracker;
  if (setter) setter.call(el, value);
  else el.value = value;
  // Reset React's internal tracker so it sees the change.
  tracker?.setValue('');
}

/** Resolve after the next animation frame (lets editors flush async work). */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function selectAllContent(el: HTMLElement) {
  el.focus();
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(el);
  sel?.removeAllRanges();
  sel?.addRange(range);
}

/**
 * Put a single collapsed caret at the very end of the editor's content. After a
 * programmatic select-all + paste, the leftover DOM selection can be stale or
 * still span everything, which leaves controlled editors (Google Flow, …) in a
 * state where the user can't click/type/delete. Resetting to a clean collapsed
 * caret — and notifying via selectionchange — restores normal editing.
 */
function placeCaretAtEnd(el: HTMLElement) {
  el.focus();
  try {
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false); // collapse to end
    sel?.removeAllRanges();
    sel?.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  } catch {
    /* ignore */
  }
}

/** True when the editor's text matches the target (whitespace-normalised). */
function ceMatches(el: HTMLElement, text: string): boolean {
  const norm = (s: string) => s.replace(/[\u00a0\u200b]/g, ' ').replace(/\s+/g, ' ').trim();
  return norm(el.innerText) === norm(text);
}

/**
 * Replace ALL content of a contenteditable.
 *
 * Controlled editors (Lexical on Facebook/Messenger, Slate, Draft.js) ignore
 * naive DOM mutations and track their own selection. The reliable recipe is:
 *   1. Clear the field COMPLETELY first (select-all + delete, repeated until
 *      empty) so a following insert can't append onto old content.
 *   2. Insert the new text into the now-empty field.
 *   3. Fallbacks: a synthetic paste (Lexical handles paste well), then a raw
 *      DOM rebuild for plain contenteditables.
 * Clearing first is what prevents the "translation appended 2-3×" bug.
 */
/** Controlled rich-text editors (Slate=Discord, Lexical=Messenger, Draft). */
function isControlledEditor(el: HTMLElement): boolean {
  const SEL = '[data-slate-editor],[data-lexical-editor],[data-contents="true"]';
  try {
    return Boolean(el.matches?.(SEL) || el.closest(SEL) || el.querySelector(SEL));
  } catch {
    return false;
  }
}

/**
 * Slate editors specifically (Discord). Unlike Lexical (Facebook/Messenger),
 * Slate rejects programmatic writes made WITHOUT user activation, so Ghost
 * Mode's automatic (timer-driven) rewrite can't land — it must fall back to a
 * Tab-to-accept suggestion. Lexical handles automatic writes fine, so it stays
 * live.
 */
function isSlateEditor(el: HTMLElement): boolean {
  const SEL = '[data-slate-editor]';
  try {
    return Boolean(el.matches?.(SEL) || el.closest(SEL) || el.querySelector(SEL));
  } catch {
    return false;
  }
}

/** Detect a React-managed element by its internal fiber/props keys. */
function isReactManaged(el: HTMLElement | null): boolean {
  let n: HTMLElement | null = el;
  for (let i = 0; i < 4 && n; i++) {
    try {
      if (Object.keys(n).some((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactProps$'))) {
        return true;
      }
    } catch {
      /* ignore */
    }
    n = n.parentElement;
  }
  return false;
}

/**
 * Some rich editors (Slate, bespoke React contenteditables like Google Flow)
 * keep their state entirely in a framework model and ignore — or desync on —
 * programmatic writes, so auto-filled text can't be submitted, edited or
 * deleted. For these we fall back to copying the result and letting the user
 * paste it (Ctrl+V), which every editor handles natively. Lexical
 * (Facebook/Messenger) auto-fills reliably, so it's excluded.
 */
export function needsClipboardPaste(el: HTMLElement): boolean {
  if (!el.isContentEditable) return false;
  try {
    if (el.matches?.('[data-lexical-editor]') || el.closest('[data-lexical-editor]')) return false;
  } catch {
    /* ignore */
  }
  return isSlateEditor(el) || isReactManaged(el);
}

/** Copy text to the clipboard (async API, with an execCommand fallback). */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/**
 * Replace all content in a controlled editor (Slate/Discord, Lexical, Draft).
 *
 * These editors sync their internal selection from the DOM on a *later* tick,
 * so the previous failure (text overlapping instead of replacing) came from
 * editing before the selection had synced. The fix: select all the content via
 * the Selection API, yield a frame so the editor catches up, THEN issue a
 * trusted edit (execCommand/paste) which fires a real `beforeinput` the editor
 * handles — replacing the selection. We try several edit shapes and verify
 * after each, and never touch the DOM directly (they revert it).
 */
async function replaceControlledEditor(el: HTMLElement, text: string): Promise<void> {
  const attempt = async (run: () => void): Promise<boolean> => {
    el.focus();
    // execCommand('selectAll') makes the editor (Slate/Lexical/ProseMirror) sync
    // its OWN selection to the whole field; a manual Selection-API range is
    // ignored by some of them, which is why replacing previously failed.
    selectAllInEditor(el);
    await nextFrame();
    try {
      run();
    } catch {
      /* ignore */
    }
    await nextFrame();
    return ceMatches(el, text);
  };

  // 1. Select-all then paste — frameworks (Lexical/Slate/ProseMirror) run their
  //    own paste handler which updates their internal model (so the field is
  //    submittable and editable afterwards), not just the DOM.
  if (await attempt(() => pasteText(el, text))) {
    placeCaretAtEnd(el);
    return;
  }
  // 2. Select-all then insertText (trusted beforeinput).
  if (await attempt(() => document.execCommand('insertText', false, text))) {
    placeCaretAtEnd(el);
    return;
  }
  // 3. Thoroughly empty the field, then insert into it (still all native edits).
  await clearContentEditable(el);
  if (text.includes('\n')) {
    try {
      pasteText(el, text);
    } catch {
      /* ignore */
    }
    await nextFrame();
    if (ceMatches(el, text)) {
      placeCaretAtEnd(el);
      return;
    }
  }
  selectAllInEditor(el);
  try {
    document.execCommand('insertText', false, text);
  } catch {
    /* ignore */
  }
  await nextFrame();
  if (ceMatches(el, text)) {
    placeCaretAtEnd(el);
    return;
  }
  // 4. Last native fallback: paste once more.
  selectAllInEditor(el);
  try {
    pasteText(el, text);
  } catch {
    /* ignore */
  }
  placeCaretAtEnd(el);
}

async function replaceAllContentEditable(el: HTMLElement, text: string): Promise<void> {
  if (ceMatches(el, text)) return;
  // Always use native, model-syncing edits (select-all + execCommand/paste).
  // Never write to the DOM directly: framework editors (Slate, Lexical,
  // ProseMirror, React contenteditables) don't track raw DOM changes, which
  // leaves their internal model out of sync — the text shows but you can't
  // delete or edit it afterwards.
  await replaceControlledEditor(el, text);
}

/** Select the entire contents of an editor (execCommand, with a manual fallback). */
function selectAllInEditor(el: HTMLElement) {
  el.focus();
  try {
    if (document.execCommand('selectAll')) return;
  } catch {
    /* ignore */
  }
  selectAllContent(el);
}

/** Empty a contenteditable as reliably as possible (select-all + delete loop). */
async function clearContentEditable(el: HTMLElement): Promise<void> {
  for (let i = 0; i < 4; i++) {
    if (!el.innerText.trim()) return;
    el.focus();
    // execCommand('selectAll') makes the editor sync its own selection to the
    // whole field (manual DOM ranges are often ignored by Lexical/Draft).
    try {
      document.execCommand('selectAll');
    } catch {
      selectAllContent(el);
    }
    await nextFrame();
    try {
      document.execCommand('delete');
    } catch {
      /* ignore */
    }
    await nextFrame();
  }
}

/** Replace the current selection via a synthetic paste event. */
function pasteText(el: HTMLElement, text: string) {
  el.focus();
  const dt = new DataTransfer();
  dt.setData('text/plain', text);
  el.dispatchEvent(
    new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }),
  );
}

/** Insert text at the caret of a contenteditable (continuation accept). */
function insertAtCaretContentEditable(el: HTMLElement, text: string) {
  el.focus();
  const before = el.innerText;
  let ok = false;
  try {
    ok = document.execCommand('insertText', false, text);
  } catch {
    ok = false;
  }
  if (ok && el.innerText !== before) return;

  // Fallback for editors that ignore execCommand.
  const notCancelled = el.dispatchEvent(
    new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }),
  );
  if (!notCancelled) return;
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const r = sel.getRangeAt(0);
    r.deleteContents();
    const node = document.createTextNode(text);
    r.insertNode(node);
    r.setStartAfter(node);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
  }
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
}
