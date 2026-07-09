import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

interface DropdownProps {
  trigger: ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'left' | 'right';
}

/** Deepest focused element, piercing nested shadow roots. */
function deepActiveElement(): Element | null {
  let a: Element | null = document.activeElement;
  while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
  return a;
}

/** A small popover menu used for tone / language / model pickers. */
export function Dropdown({ trigger, children, align = 'left' }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<{ up: boolean; maxH: number }>({ up: true, maxH: 280 });
  const ref = useRef<HTMLDivElement>(null);
  // The element focused before the menu opened (usually the page editor). We
  // restore focus to it on close so the toolbar doesn't detach when our search
  // input unmounts and focus would otherwise fall back to <body>.
  const prevFocus = useRef<HTMLElement | null>(null);

  const openMenu = () => {
    const el = deepActiveElement();
    if (el instanceof HTMLElement && el.id !== 'ghosttranslate-host') prevFocus.current = el;
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    const el = prevFocus.current;
    if (el && typeof el.focus === 'function') {
      setTimeout(() => {
        try {
          el.focus({ preventScroll: true });
        } catch {
          /* ignore */
        }
      }, 0);
    }
  };

  // Decide whether to open upward or downward based on available space.
  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const up = spaceAbove >= spaceBelow;
    const maxH = Math.max(140, Math.min(280, (up ? spaceAbove : spaceBelow) - 16));
    setPlacement({ up, maxH });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      // The toolbar lives in a Shadow DOM, so e.target is retargeted to the
      // host. composedPath() preserves the real path through the shadow tree.
      const path = e.composedPath();
      if (ref.current && !path.includes(ref.current)) close();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="relative" ref={ref} data-no-drag>
      <div onMouseDown={(e) => e.preventDefault()} onClick={() => (open ? close() : openMenu())}>
        {trigger}
      </div>
      {open && (
        <div
          className={`absolute animate-gw-fade-in ${placement.up ? 'bottom-full mb-2' : 'top-full mt-2'} ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="gw-menu gw-scroll overflow-y-auto" style={{ maxHeight: placement.maxH }}>
            {children(close)}
          </div>
        </div>
      )}
    </div>
  );
}
