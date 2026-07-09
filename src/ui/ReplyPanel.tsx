import { useEffect, useRef, useState } from 'react';
import { useFullStore } from '@/content/useStore';
import { actions } from '@/content/store';
import type { ReplyPane } from '@/content/store';
import { LANGUAGE_MAP } from '@/core/languages';
import type { LanguageCode, ReplyLength } from '@/types';
import { LanguagePicker } from '@/ui/LanguagePicker';
import { Dropdown } from '@/ui/Dropdown';
import { useT } from '@/i18n/useT';
import type { MessageKey } from '@/i18n/messages';

const LENGTHS: ReplyLength[] = ['short', 'medium', 'long'];

function ReplyIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 17l-5-5 5-5" />
      <path d="M4 12h11a5 5 0 0 1 5 5v1" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" className="inline-block align-[-2px]">
      <path d="M15.24 2H11.35C9.58 2 8.18 2 7.09 2.15c-1.13.15-2.04.47-2.75 1.19C3.62 4.06 3.3 4.98 3.15 6.11 3 7.2 3 8.61 3 10.38v5.84A2.5 2.5 0 0 0 5.23 19.56c-.07-.91-.07-2.19-.07-3.25v-4.91c0-1.28 0-2.39.12-3.27.13-.95.42-1.86 1.15-2.6.73-.73 1.64-1.02 2.59-1.15.88-.12 1.98-.12 3.26-.12h2.97c1.28 0 2.37 0 3.25.12C18.06 2.95 16.76 2 15.24 2Z" />
      <path d="M6.6 11.4c0-2.73 0-4.09.84-4.94.85-.85 2.2-.85 4.92-.85h2.88c2.72 0 4.07 0 4.91.85.85.85.85 2.21.85 4.94v4.82c0 2.73 0 4.09-.85 4.94-.84.85-2.19.85-4.91.85h-2.88c-2.72 0-4.07 0-4.92-.85-.84-.85-.84-2.21-.84-4.94V11.4Z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="inline-block align-[-2px]">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

function LangButton({
  value,
  onPick,
  align = 'left',
}: {
  value: LanguageCode;
  onPick: (code: LanguageCode) => void;
  align?: 'left' | 'right';
}) {
  const meta = LANGUAGE_MAP[value];
  return (
    <LanguagePicker
      value={value}
      onPick={onPick}
      align={align}
      trigger={
        <button type="button" className="gw-btn !px-2 !py-1 rounded-full text-[12px]">
          <span className="font-semibold">
            {meta.flag} {meta.label}
          </span>
          <span className="opacity-50">▾</span>
        </button>
      }
    />
  );
}

/** One result column (draft or translation) with copy + body. */
function Pane({
  label,
  pane,
  control,
  onCopy,
}: {
  label: string;
  pane: ReplyPane;
  control: React.ReactNode;
  onCopy: () => void;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  function copy() {
    if (!pane.text) return;
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }
  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide opacity-55">{label}</span>
        {control}
      </div>
      <div className="gw-reply-body gw-scroll text-[13.5px] leading-relaxed whitespace-pre-wrap">
        {pane.status === 'error' ? (
          <span className="text-red-500">{pane.error}</span>
        ) : pane.status === 'loading' ? (
          <span className="gw-shimmer-text">{t('reply.thinking')}</span>
        ) : (
          <>
            {pane.text}
            {pane.status === 'streaming' && (
              <span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle bg-current animate-gw-pulse rounded-sm" />
            )}
          </>
        )}
      </div>
      {pane.status === 'ready' && pane.text && (
        <div className="flex justify-end mt-1.5">
          <button type="button" className="gw-btn !py-1 text-xs" onMouseDown={(e) => e.preventDefault()} onClick={copy}>
            {copied ? `✓ ${t('reply.copied')}` : (<><CopyIcon /> {t('reply.copy')}</>)}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * The "AI Reply" composer. Drafts a reply to a message and shows a side-by-side
 * translation so the user understands it, then inserts it into the editor.
 */
export function ReplyPanel() {
  const { reply } = useFullStore();
  const t = useT();
  const [improve, setImprove] = useState('');
  // Open/close transition: keep the panel mounted briefly so the exit
  // animation can play before `reply` is cleared from the store.
  const [open, setOpen] = useState(false);
  const [render, setRender] = useState(false);
  const last = useRef(reply);
  if (reply) last.current = reply;

  useEffect(() => {
    if (reply?.open) {
      setRender(true);
      // Double rAF: let the browser paint the closed state first, then flip to
      // open so the enter transition actually runs (a single rAF gets skipped).
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setOpen(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    setOpen(false);
    const id = setTimeout(() => setRender(false), 220);
    return () => clearTimeout(id);
  }, [reply?.open]);

  // Close on Escape.
  useEffect(() => {
    if (!reply?.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') actions.closeReply();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [reply?.open]);

  if (!render) return null;
  // Use the live state, falling back to the last value during the exit anim.
  const data = reply ?? last.current;
  if (!data) return null;

  const generated = data.draft.status !== 'idle';
  const drafting = data.draft.status === 'loading' || data.draft.status === 'streaming';

  function send() {
    const text = improve.trim();
    actions.generateReply(text || undefined);
    setImprove('');
  }

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-start justify-center p-4 pt-[8vh]">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/25 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => actions.closeReply()}
      />

      <div
        className={`gw-glass gw-reply relative w-[min(680px,94vw)] rounded-2xl p-4 origin-top transition-all duration-200 ease-out ${
          open ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-3'
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <span className="grid place-items-center h-7 w-7 rounded-lg bg-[#0a84ff] text-white">
              <ReplyIcon size={16} />
            </span>
            <span className="font-bold text-[15px]">{t('reply.title')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] opacity-55">{t('reply.replyIn')}</span>
            <LangButton
              value={data.replyLanguage}
              align="right"
              onPick={(c) => actions.setReplyLanguage(c)}
            />
            <button
              type="button"
              className="gw-btn !px-1.5 !py-0.5 text-xs"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => actions.closeReply()}
              title={t('reply.close')}
            >
              ✕
            </button>
          </div>
        </div>
        <p className="text-[12px] opacity-55 mb-2.5">{t('reply.subtitle')}</p>

        {/* Original message (editable) */}
        <label className="text-[11px] font-semibold uppercase tracking-wide opacity-55">
          {t('reply.original')}
        </label>
        <textarea
          className="gw-reply-input mt-1 mb-3 w-full resize-y gw-scroll"
          rows={3}
          placeholder={t('reply.originalPlaceholder')}
          value={data.source}
          onChange={(e) => actions.setReplySource(e.target.value)}
        />

        {!generated ? (
          <button
            type="button"
            className="gw-btn gw-btn-primary w-full justify-center !py-2 rounded-xl font-semibold"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => actions.generateReply()}
            disabled={!data.source.trim()}
          >
            <ReplyIcon size={15} /> {t('reply.generate')}
          </button>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Pane
                label={t('reply.draft')}
                pane={data.draft}
                onCopy={() => navigator.clipboard.writeText(data.draft.text).catch(() => {})}
                control={
                  <div className="flex items-center gap-1">
                    <Dropdown
                      trigger={
                        <button className="gw-btn !px-2 !py-0.5 rounded-full text-[11px]" type="button">
                          <span className="opacity-65">{t('reply.length')}:</span>
                          <span className="font-semibold">
                            {t(`reply.length.${data.length}` as MessageKey)}
                          </span>
                          <span className="opacity-50">▾</span>
                        </button>
                      }
                    >
                      {(close) => (
                        <>
                          {LENGTHS.map((len) => (
                            <div
                              key={len}
                              className="gw-menu-item"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                actions.setReplyLength(len);
                                close();
                              }}
                            >
                              <span>{t(`reply.length.${len}` as MessageKey)}</span>
                              {data.length === len && <span className="text-[#0a84ff]">✓</span>}
                            </div>
                          ))}
                        </>
                      )}
                    </Dropdown>
                    <button
                      type="button"
                      className="gw-btn !px-1.5 !py-0.5 text-xs"
                      title={t('reply.regenerate')}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => actions.generateReply()}
                      disabled={drafting}
                    >
                      <RefreshIcon />
                    </button>
                  </div>
                }
              />
              <Pane
                label={t('reply.translation')}
                pane={data.translation}
                onCopy={() => navigator.clipboard.writeText(data.translation.text).catch(() => {})}
                control={
                  <LangButton
                    value={data.translateTo}
                    align="right"
                    onPick={(c) => actions.setReplyTranslateTo(c)}
                  />
                }
              />
            </div>

            {/* Improve + insert */}
            <div className="mt-3.5 flex items-center gap-2">
              <input
                className="gw-reply-input flex-1"
                placeholder={t('reply.improve')}
                value={improve}
                onChange={(e) => setImprove(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <button
                type="button"
                className="gw-btn !px-3 !py-2 rounded-xl"
                title={t('reply.regenerate')}
                onMouseDown={(e) => e.preventDefault()}
                onClick={send}
                disabled={drafting}
              >
                <RefreshIcon />
              </button>
              <button
                type="button"
                className="gw-btn gw-btn-primary !px-4 !py-2 rounded-xl font-semibold"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => actions.insertReply()}
                disabled={data.draft.status !== 'ready' || !data.draft.text}
              >
                {t('reply.insert')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
