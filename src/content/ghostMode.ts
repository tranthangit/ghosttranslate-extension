import type { EditorAdapter } from '@/content/editorBridge';

// ============================================================================
// Ghost Mode controller
//
// In Ghost Mode the user keeps typing their own language, but the textbox is
// continuously rewritten into the target language so it *feels* like they are
// typing natively in the foreign language.
//
// Strategy:
//   - Track the user's "intent" text separately from what is shown.
//   - When typing pauses (debounced), translate the intent and replace the
//     visible content with the translation.
//   - Guard against feedback loops: programmatic replacements must not be read
//     back as new user input. We do this with a `suppress` flag and by tracking
//     the last value we wrote.
// ============================================================================

export class GhostMode {
  private suppress = false;
  private lastWritten = '';

  constructor(private adapter: EditorAdapter) {}

  /** Whitespace-normalised key (newline representation varies across editors). */
  private static norm(s: string): string {
    return s.replace(/[\u00a0\u200b]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /** True while we are programmatically writing (input events should be ignored). */
  get isSuppressing(): boolean {
    return this.suppress;
  }

  /** Did the current field value originate from our own write? */
  isOwnValue(value: string): boolean {
    return GhostMode.norm(value) === GhostMode.norm(this.lastWritten);
  }

  /** Replace the visible text with the translated version. */
  applyTranslation(translated: string) {
    const current = this.adapter.getComposableText();
    if (!translated || GhostMode.norm(translated) === GhostMode.norm(current)) return;
    this.suppress = true;
    this.lastWritten = translated;
    void this.adapter
      .setComposableAll(translated)
      .catch(() => {})
      .finally(() => {
        // Re-read what actually landed so the echo guard matches even if the
        // editor normalised whitespace.
        try {
          this.lastWritten = this.adapter.getComposableText() || translated;
        } catch {
          /* keep the requested text */
        }
        // Keep suppressing long enough for controlled editors (Slate/Discord,
        // Lexical) to finish their async reconciliation — otherwise the input
        // events from our own write leak through and disrupt the write.
        setTimeout(() => {
          this.suppress = false;
        }, 250);
      });
  }

  reset() {
    this.suppress = false;
    this.lastWritten = '';
  }
}
