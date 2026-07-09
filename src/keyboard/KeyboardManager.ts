// ============================================================================
// Keyboard Manager
//
// Captures the in-page hotkeys that must intercept the host page before it
// reacts (e.g. Tab in a chat box would normally move focus / send). Uses a
// capture-phase listener and only acts when there is something to act on.
//
//   Tab          accept the current suggestion
//   Esc          dismiss the suggestion
//
// Ctrl+Shift+G (Ghost Mode) and Ctrl+Shift+K (cycle language) are handled by
// chrome.commands in the background and routed here as fallbacks for pages
// that swallow the global shortcut. Ctrl+Shift+Y opens the AI Reply composer.
// ============================================================================

export interface KeyboardCallbacks {
  /** Return true if a suggestion is currently shown (so we should grab Tab/Esc). */
  hasSuggestion: () => boolean;
  onAccept: () => void;
  onDismiss: () => void;
  onToggleGhost: () => void;
  onCycleLanguage: () => void;
  onOpenReply: () => void;
}

export class KeyboardManager {
  private bound = false;

  constructor(private cb: KeyboardCallbacks) {}

  start() {
    if (this.bound) return;
    window.addEventListener('keydown', this.onKeyDown, true);
    this.bound = true;
  }

  stop() {
    window.removeEventListener('keydown', this.onKeyDown, true);
    this.bound = false;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey;

    // Ghost Mode toggle (in-page fallback for chrome.commands).
    if (mod && e.shiftKey && (e.key === 'G' || e.key === 'g')) {
      e.preventDefault();
      e.stopPropagation();
      this.cb.onToggleGhost();
      return;
    }

    // Cycle target language.
    if (mod && e.shiftKey && (e.key === 'K' || e.key === 'k')) {
      e.preventDefault();
      e.stopPropagation();
      this.cb.onCycleLanguage();
      return;
    }

    // Open the AI Reply composer.
    if (mod && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
      e.preventDefault();
      e.stopPropagation();
      this.cb.onOpenReply();
      return;
    }

    if (!this.cb.hasSuggestion()) return;

    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      this.cb.onAccept();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      this.cb.onDismiss();
    }
  };
}
