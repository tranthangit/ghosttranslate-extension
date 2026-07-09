import type { AppConfig, LanguageCode, ReplyLength, Settings, Tone } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

export type SuggestionKind = 'translate' | 'continue' | 'rewrite';
export type SuggestionStatus = 'loading' | 'streaming' | 'ready' | 'error';
export type ReplyStatus = 'idle' | 'loading' | 'streaming' | 'ready' | 'error';

export interface ReplyPane {
  text: string;
  status: ReplyStatus;
  error?: string;
}

/** State for the "AI Reply" composer panel. */
export interface ReplyState {
  open: boolean;
  /** The message/email being replied to (user-editable). */
  source: string;
  length: ReplyLength;
  /** Language to write the reply in. */
  replyLanguage: LanguageCode;
  /** Language the draft is translated into for comprehension. */
  translateTo: LanguageCode;
  /** The AI-drafted reply (in `replyLanguage`). */
  draft: ReplyPane;
  /** Translation of the draft into `translateTo`. */
  translation: ReplyPane;
}

export interface Suggestion {
  kind: SuggestionKind;
  text: string;
  status: SuggestionStatus;
  error?: string;
}

export interface Rect {
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
}

export interface UIState {
  settings: Settings;
  /** Admin-controlled config (model list + whether users can pick a model). */
  appConfig: AppConfig | null;
  /** Toolbar visible (an editor is focused & extension enabled). */
  toolbarVisible: boolean;
  /** Where to anchor the toolbar (editor box). */
  editorRect: Rect | null;
  /** Where to anchor the suggestion popup (caret). */
  caretRect: Rect | null;
  suggestion: Suggestion | null;
  detectedLanguage: string | null;
  latencyMs: number | null;
  /** Manual position from drag (viewport coords). null = auto-anchor to editor. */
  toolbarPos: { x: number; y: number } | null;
  /** Active text selection on the page (for selection-translate). */
  selection: { text: string; rect: Rect; hidden?: boolean } | null;
  /** Result of translating the current selection. */
  selectionTranslation: { text: string; status: SuggestionStatus; error?: string } | null;
  /** When pinned, the selection card stays open & fixed (ignores clicks/scroll). */
  selectionPinned: boolean;
  /** Free-plan daily usage (null when on a licensed/activated plan). */
  freeUsage: { used: number; limit: number } | null;
  /** AI Reply composer panel (null when closed). */
  reply: ReplyState | null;
  /** Transient banner (e.g. "Ghost Mode on"). */
  toast: string | null;
}

const initial: UIState = {
  settings: DEFAULT_SETTINGS,
  appConfig: null,
  toolbarVisible: false,
  editorRect: null,
  caretRect: null,
  suggestion: null,
  detectedLanguage: null,
  latencyMs: null,
  toolbarPos: null,
  selection: null,
  selectionTranslation: null,
  selectionPinned: false,
  freeUsage: null,
  reply: null,
  toast: null,
};

/** Minimal observable store compatible with React.useSyncExternalStore. */
export class Store {
  private state: UIState = initial;
  private listeners = new Set<() => void>();

  getState = (): UIState => this.state;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  set(partial: Partial<UIState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((fn) => fn());
  }

  patchSettings(partial: Partial<Settings>) {
    this.set({ settings: { ...this.state.settings, ...partial } });
  }
}

export const store = new Store();

// ---- Actions surfaced to the React UI; wired by the controller ------------
export interface UIActions {
  accept: () => void;
  dismiss: () => void;
  translate: () => void;
  rewrite: () => void;
  toggleGhostMode: () => void;
  setTone: (tone: Tone) => void;
  setTargetLanguage: (code: LanguageCode) => void;
  setSelectionTargetLanguage: (code: LanguageCode) => void;
  setModel: (id: string) => void;
  toggleCollapsed: () => void;
  translateSelection: () => void;
  dismissSelection: () => void;
  togglePinSelection: () => void;
  openSettings: () => void;
  openSidePanel: () => void;
  // AI Reply composer
  openReply: () => void;
  closeReply: () => void;
  setReplySource: (text: string) => void;
  setReplyLength: (len: ReplyLength) => void;
  setReplyLanguage: (code: LanguageCode) => void;
  setReplyTranslateTo: (code: LanguageCode) => void;
  generateReply: (instruction?: string) => void;
  insertReply: () => void;
}

export const actions: UIActions = {
  accept: () => {},
  dismiss: () => {},
  translate: () => {},
  rewrite: () => {},
  toggleGhostMode: () => {},
  setTone: () => {},
  setTargetLanguage: () => {},
  setSelectionTargetLanguage: () => {},
  setModel: () => {},
  toggleCollapsed: () => {},
  translateSelection: () => {},
  dismissSelection: () => {},
  togglePinSelection: () => {},
  openSettings: () => {},
  openSidePanel: () => {},
  openReply: () => {},
  closeReply: () => {},
  setReplySource: () => {},
  setReplyLength: () => {},
  setReplyLanguage: () => {},
  setReplyTranslateTo: () => {},
  generateReply: () => {},
  insertReply: () => {},
};

export function bindActions(impl: UIActions) {
  Object.assign(actions, impl);
}
