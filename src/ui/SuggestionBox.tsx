import { useEffect, useRef, useState } from 'react';
import { useFullStore } from '@/content/useStore';
import { actions } from '@/content/store';
import { useT } from '@/i18n/useT';
import type { MessageKey } from '@/i18n/messages';

const KIND_KEY: Record<string, MessageKey> = {
  translate: 'suggestion.translate',
  continue: 'suggestion.continue',
  rewrite: 'suggestion.rewrite',
};

function DragGripIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor" className="inline-block align-[-2px]">
      <circle cx="9" cy="6" r="1.6" />
      <circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" />
      <circle cx="15" cy="18" r="1.6" />
    </svg>
  );
}

/** Pixels of movement before a press is treated as a drag (not a click). */
const DRAG_THRESHOLD = 4;

/**
 * The floating suggestion popup anchored under the caret. Shows the live
 * (streaming) AI result and Tab/Esc affordances.
 *
 * The whole card can be dragged to move it out of the way (handy for long
 * rewrites). A press that doesn't move is treated as a click — clicking the
 * result text accepts it; mousedown is prevented so the editor keeps focus and
 * the popup never disappears on interaction.
 */
export function SuggestionBox() {
  const { suggestion, caretRect } = useFullStore();
  const t = useT();
  /** Manual position from dragging (null = auto-anchor to caret). */
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ sx: number; sy: number; bx: number; by: number; moved: boolean } | null>(null);

  // Reset the dragged position when the popup closes, so the next suggestion
  // starts anchored to the caret again.
  const isOpen = Boolean(suggestion && caretRect);
  useEffect(() => {
    if (!isOpen) setDragPos(null);
  }, [isOpen]);

  if (!suggestion || !caretRect) return null;

  const maxWidth = Math.min(460, window.innerWidth - 24);
  const left = Math.max(12, Math.min(caretRect.left, window.innerWidth - maxWidth - 12));

  // Flip above the caret when there isn't enough room below.
  const ESTIMATED_H = 120;
  const roomBelow = window.innerHeight - caretRect.bottom;
  const placeAbove = roomBelow < ESTIMATED_H + 16;
  const autoStyle = placeAbove
    ? { bottom: Math.max(12, window.innerHeight - caretRect.top + 8), left, maxWidth }
    : { top: caretRect.bottom + 8, left, maxWidth };

  // A dragged position overrides the auto-anchored one.
  const positionStyle = dragPos ? { top: dragPos.y, left: dragPos.x, maxWidth } : autoStyle;

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    drag.current = {
      sx: e.clientX,
      sy: e.clientY,
      bx: dragPos ? dragPos.x : rect.left,
      by: dragPos ? dragPos.y : rect.top,
      moved: false,
    };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    d.moved = true;
    const nx = Math.max(8, Math.min(d.bx + dx, window.innerWidth - maxWidth - 8));
    const ny = Math.max(8, Math.min(d.by + dy, window.innerHeight - 44));
    setDragPos({ x: nx, y: ny });
  }
  function onPointerUp(e: React.PointerEvent) {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    // Clear the drag flag on the next tick so the click handler can read it.
    setTimeout(() => {
      drag.current = null;
    }, 0);
  }

  const isLoading = suggestion.status === 'loading';
  const isError = suggestion.status === 'error';
  const isActionable = suggestion.status === 'ready' || suggestion.status === 'streaming';

  return (
    <div
      className="fixed z-[2147483647] animate-gw-fade-in"
      style={{ ...positionStyle, width: 'max-content', minWidth: 220 }}
    >
      <div
        className="gw-glass rounded-2xl px-3.5 py-2.5 cursor-move select-none"
        style={{ touchAction: 'none' }}
        onMouseDown={(e) => e.preventDefault()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="flex items-center justify-between gap-3 mb-1">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-70">
            <span className="opacity-50" title={t('suggestion.drag')}>
              <DragGripIcon />
            </span>
            {t(KIND_KEY[suggestion.kind] ?? 'suggestion.suggestion')}
          </span>
          {isActionable && (
            <div className="flex items-center gap-1.5 text-[10px] opacity-75">
              <span className="gw-kbd">Tab</span>
              <span>{t('suggestion.accept')}</span>
              <span className="gw-kbd">Esc</span>
            </div>
          )}
        </div>

        {isError ? (
          <div className="text-[13px] text-red-500 leading-snug max-w-[420px]">
            {suggestion.error}
          </div>
        ) : isLoading ? (
          <div className="flex items-center gap-2 py-1">
            <span className="gw-shimmer-text text-[14px]">
              {t(suggestion.kind === 'translate' ? 'suggestion.translating' : 'suggestion.thinking')}
            </span>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={-1}
            onClick={() => {
              // Ignore the click that ends a drag; only a real click accepts.
              if (drag.current?.moved) return;
              actions.accept();
            }}
            title={t('suggestion.accept')}
            className="text-left text-[14px] leading-snug max-w-[420px] max-h-[50vh] overflow-y-auto gw-scroll whitespace-pre-wrap [word-break:break-word] cursor-pointer hover:opacity-80"
          >
            {suggestion.kind === 'continue' && <span className="opacity-40">…&nbsp;</span>}
            {suggestion.text}
            {suggestion.status === 'streaming' && (
              <span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle bg-current animate-gw-pulse rounded-sm" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
