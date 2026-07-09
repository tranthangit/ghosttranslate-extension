import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Dropdown } from '@/ui/Dropdown';
import { LANGUAGES } from '@/core/languages';
import type { LanguageCode } from '@/types';
import { useT } from '@/i18n/useT';

interface LanguagePickerProps {
  value: LanguageCode;
  onPick: (code: LanguageCode) => void;
  trigger: ReactNode;
  align?: 'left' | 'right';
  /** Auto-focus the search box on open (default true). Disable to keep the
   *  page text selection intact when used inside the selection-translate popup. */
  autoFocusSearch?: boolean;
}

/** Language dropdown with a quick-filter search box (39 languages). */
export function LanguagePicker({ value, onPick, trigger, align = 'left', autoFocusSearch = true }: LanguagePickerProps) {
  return (
    <Dropdown align={align} trigger={trigger}>
      {(close) => <LangList value={value} onPick={onPick} close={close} autoFocusSearch={autoFocusSearch} />}
    </Dropdown>
  );
}

function LangList({
  value,
  onPick,
  close,
  autoFocusSearch,
}: {
  value: LanguageCode;
  onPick: (code: LanguageCode) => void;
  close: () => void;
  autoFocusSearch: boolean;
}) {
  const t = useT();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the search box as soon as the menu opens (unless disabled, to avoid
  // collapsing the page's text selection in the selection-translate popup).
  useEffect(() => {
    if (autoFocusSearch) inputRef.current?.focus({ preventScroll: true });
  }, [autoFocusSearch]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (l) =>
        l.label.toLowerCase().includes(q) ||
        l.nativeLabel.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <>
      <div className="gw-menu-search">
        <input
          ref={inputRef}
          type="text"
          className="gw-search-input"
          placeholder={t('search.placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Keep the page (and our global hotkeys) from reacting to typing.
            e.stopPropagation();
            const el = inputRef.current;

            if (e.key === 'Enter') {
              if (filtered[0]) {
                onPick(filtered[0].code as LanguageCode);
                close();
              }
              return;
            }
            if (e.key === 'Escape') {
              close();
              return;
            }

            // Some sites block Backspace/Delete globally (back-nav guard) and,
            // because our input lives in a Shadow DOM, mistake it for "not an
            // input" and preventDefault it. So we delete manually instead of
            // relying on the (possibly cancelled) native behaviour.
            if (el && (e.key === 'Backspace' || e.key === 'Delete')) {
              e.preventDefault();
              const start = el.selectionStart ?? query.length;
              const end = el.selectionEnd ?? start;
              let next = query;
              let caret = start;
              if (start !== end) {
                next = query.slice(0, start) + query.slice(end);
                caret = start;
              } else if (e.key === 'Backspace' && start > 0) {
                next = query.slice(0, start - 1) + query.slice(start);
                caret = start - 1;
              } else if (e.key === 'Delete' && start < query.length) {
                next = query.slice(0, start) + query.slice(start + 1);
                caret = start;
              }
              setQuery(next);
              requestAnimationFrame(() => {
                try {
                  el.setSelectionRange(caret, caret);
                } catch {
                  /* ignore */
                }
              });
            }
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="gw-menu-empty">{t('search.empty')}</div>
      ) : (
        filtered.map((l) => (
          <div
            key={l.code}
            className="gw-menu-item"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onPick(l.code as LanguageCode);
              close();
            }}
          >
            <span className="whitespace-nowrap">
              {l.flag} {l.label}
            </span>
            {value === l.code ? (
              <span className="text-[#0a84ff]">✓</span>
            ) : (
              <span className="opacity-50 text-xs whitespace-nowrap">{l.nativeLabel}</span>
            )}
          </div>
        ))
      )}
    </>
  );
}
