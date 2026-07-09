import { useEffect, useRef, useState } from 'react';
import { useFullStore } from '@/content/useStore';
import { actions } from '@/content/store';
import { LANGUAGE_MAP } from '@/core/languages';
import type { LanguageCode } from '@/types';
import { LanguagePicker } from '@/ui/LanguagePicker';
import { useT } from '@/i18n/useT';

function DragGripIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" className="inline-block align-[-2px]">
      <circle cx="9" cy="6" r="1.6" />
      <circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" />
      <circle cx="15" cy="18" r="1.6" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" className="inline-block align-[-2px]">
      <path d="M15.24 2H11.3458C9.58159 1.99999 8.18418 1.99997 7.09054 2.1476C5.96501 2.29953 5.05402 2.61964 4.33559 3.34096C3.61717 4.06227 3.29833 4.97692 3.14701 6.10697C2.99997 7.205 2.99999 8.60802 3 10.3793V16.2169C3 17.725 3.91995 19.0174 5.22717 19.5592C5.15989 18.6498 5.15994 17.3737 5.16 16.312L5.16 11.3976L5.16 11.3024C5.15993 10.0207 5.15986 8.91644 5.27828 8.03211C5.40519 7.08438 5.69139 6.17592 6.4253 5.43906C7.15921 4.70219 8.06404 4.41485 9.00798 4.28743C9.88877 4.16854 10.9887 4.1686 12.2652 4.16867L12.36 4.16868H15.24L15.3348 4.16867C16.6113 4.1686 17.7088 4.16854 18.5896 4.28743C18.0627 2.94779 16.7616 2 15.24 2Z" />
      <path d="M6.6001 11.3974C6.6001 8.67119 6.6001 7.3081 7.44363 6.46118C8.28716 5.61426 9.64481 5.61426 12.3601 5.61426H15.2401C17.9554 5.61426 19.313 5.61426 20.1566 6.46118C21.0001 7.3081 21.0001 8.6712 21.0001 11.3974V16.2167C21.0001 18.9429 21.0001 20.306 20.1566 21.1529C19.313 21.9998 17.9554 21.9998 15.2401 21.9998H12.3601C9.64481 21.9998 8.28716 21.9998 7.44363 21.1529C6.6001 20.306 6.6001 18.9429 6.6001 16.2167V11.3974Z" />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="inline-block align-[-2px]">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M8.5 13h1a1 1 0 0 1 0 2h-1zm0 0v4" opacity={0.85} />
      <path d="M16 13v4M16 13h-1.6M16 15h-1.2" opacity={0.85} />
      <path d="M11.6 13h.4a1.4 1.4 0 0 1 0 4h-.4z" opacity={0.85} />
    </svg>
  );
}

function PinIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="inline-block align-[-2px]">
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
    </svg>
  );
}

function ExpandIcon({ expanded }: { expanded?: boolean }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="inline-block align-[-2px]">
      {expanded ? (
        <>
          <path d="M9 9 4 4m0 0v4m0-4h4" />
          <path d="m15 9 5-5m0 0v4m0-4h-4" />
          <path d="M9 15l-5 5m0 0v-4m0 4h4" />
          <path d="m15 15 5 5m0 0v-4m0 4h-4" />
        </>
      ) : (
        <>
          <path d="M15 3h6v6" />
          <path d="M9 21H3v-6" />
          <path d="M21 3l-7 7" />
          <path d="M3 21l7-7" />
        </>
      )}
    </svg>
  );
}

function SpeakerIcon({ on }: { on?: boolean }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="inline-block align-[-2px]">
      <path d="M11 5 6 9H2v6h4l5 4z" fill="currentColor" stroke="none" />
      {on ? (
        <>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </>
      ) : (
        <>
          <path d="M22 9l-6 6" />
          <path d="M16 9l6 6" />
        </>
      )}
    </svg>
  );
}

/** Map our language codes to BCP-47 tags for speech synthesis. */
const SPEECH_LANG: Partial<Record<LanguageCode, string>> = {
  en: 'en-US', vi: 'vi-VN', zh: 'zh-CN', 'zh-TW': 'zh-TW', ja: 'ja-JP', ko: 'ko-KR',
  fr: 'fr-FR', es: 'es-ES', de: 'de-DE', it: 'it-IT', pt: 'pt-PT', ru: 'ru-RU',
  ar: 'ar-SA', hi: 'hi-IN', th: 'th-TH', id: 'id-ID', ms: 'ms-MY', nl: 'nl-NL',
  pl: 'pl-PL', tr: 'tr-TR', uk: 'uk-UA', fa: 'fa-IR', he: 'he-IL', sv: 'sv-SE',
  no: 'nb-NO', da: 'da-DK', fi: 'fi-FI', cs: 'cs-CZ', ro: 'ro-RO', el: 'el-GR',
  hu: 'hu-HU', bn: 'bn-IN', ta: 'ta-IN', te: 'te-IN', ur: 'ur-PK', fil: 'fil-PH',
  km: 'km-KH', lo: 'lo-LA', my: 'my-MM',
};

/** Open a print window with just the translation so the user can save a PDF. */
function exportTranslationPdf(text: string, title: string) {
  const win = window.open('', '_blank', 'width=720,height=860');
  if (!win) return;
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  win.document.open();
  win.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>` +
      `<style>` +
      `*{box-sizing:border-box}` +
      `body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,'Noto Sans',sans-serif;` +
      `line-height:1.7;padding:56px 48px;max-width:760px;margin:0 auto;color:#15171c}` +
      `header{display:flex;align-items:center;gap:8px;border-bottom:1px solid #e6e8ee;` +
      `padding-bottom:14px;margin-bottom:24px;color:#7a8190;font-size:12px;` +
      `font-weight:600;text-transform:uppercase;letter-spacing:.06em}` +
      `.content{font-size:15px;white-space:pre-wrap;word-wrap:break-word}` +
      `footer{margin-top:36px;color:#aab0bc;font-size:11px}` +
      `@media print{body{padding:0}}` +
      `</style></head><body>` +
      `<header>GhostTranslate · ${esc(title)}</header>` +
      `<div class="content">${esc(text)}</div>` +
      `<footer>Generated by GhostTranslate</footer>` +
      `</body></html>`,
  );
  win.document.close();
  // Trigger the print dialog from the opener (avoids inline scripts / CSP).
  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch {
      /* ignore */
    }
  }, 350);
}

/** Compact target-language picker reused in both popup states. */
function LangMenu({
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
      autoFocusSearch={false}
      trigger={
        <button type="button" className="gw-btn !px-2 !py-1 rounded-full text-[12px]">
          <span>🌐</span>
          <span className="font-semibold">
            {meta.flag} {meta.label}
          </span>
          <span className="opacity-50">▾</span>
        </button>
      }
    />
  );
}

/**
 * Shown when the user highlights text anywhere on the page. A language picker
 * lets them choose the target language right here before/after translating.
 */
export function SelectionPopup() {
  const { selection, selectionTranslation, selectionPinned, settings } = useFullStore();
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  /** Manual position from dragging the header (null = auto-anchor to text). */
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const dragState = useRef<{ sx: number; sy: number; bx: number; by: number } | null>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);

  // Stop any speech when the card closes or the text changes.
  const currentText = selectionTranslation?.text ?? '';
  function stopSpeak() {
    if (srcRef.current) {
      try {
        srcRef.current.onended = null;
        srcRef.current.stop();
      } catch {
        /* ignore */
      }
      srcRef.current = null;
    }
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    setSpeaking(false);
  }
  useEffect(() => {
    return () => stopSpeak();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    stopSpeak();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentText]);

  // Reset the dragged position only when a brand-new selection is made (the
  // source text changes) — not when re-translating into another language.
  useEffect(() => {
    setDragPos(null);
  }, [selection?.text]);

  if (!selection || selection.hidden) return null;

  const target = LANGUAGE_MAP[settings.selectionTargetLanguage];
  const rect = selection.rect;

  const W = !selectionTranslation ? 250 : expanded ? 520 : 360;
  const estH = selectionTranslation ? (expanded ? 320 : 140) : 44;
  let top = rect.top - estH - 8;
  const placeBelow = top < 8;
  if (placeBelow) top = rect.bottom + 8;
  const centerX = rect.left + rect.width / 2;
  const left = Math.max(8, Math.min(centerX - W / 2, window.innerWidth - W - 8));

  // Dragged position overrides the auto-anchored one.
  const posLeft = dragPos ? dragPos.x : left;
  const posTop = dragPos ? dragPos.y : top;

  function onDragDown(e: React.PointerEvent) {
    // Don't start a drag from interactive controls (buttons / pickers).
    if ((e.target as HTMLElement).closest('button, [data-no-drag]')) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { sx: e.clientX, sy: e.clientY, bx: posLeft, by: posTop };
  }
  function onDragMove(e: React.PointerEvent) {
    const d = dragState.current;
    if (!d) return;
    const nx = Math.max(8, Math.min(d.bx + (e.clientX - d.sx), window.innerWidth - W - 8));
    const ny = Math.max(8, Math.min(d.by + (e.clientY - d.sy), window.innerHeight - 44));
    setDragPos({ x: nx, y: ny });
  }
  function onDragUp(e: React.PointerEvent) {
    dragState.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  async function copy() {
    if (!selectionTranslation?.text) return;
    try {
      await navigator.clipboard.writeText(selectionTranslation.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  }

  /** Read the translation aloud — Azure (via the worker/background), else browser. */
  async function toggleSpeak() {
    if (speaking) {
      stopSpeak();
      return;
    }
    const text = selectionTranslation?.text?.trim();
    if (!text) return;

    setSpeaking(true);
    try {
      const res: { ok?: boolean; audioB64?: string } = await chrome.runtime.sendMessage({
        type: 'TTS',
        text,
        lang: settings.selectionTargetLanguage,
      });
      if (!res?.ok || !res.audioB64) {
        // Worker/Azure issue -> fall back to the browser voice.
        speakBrowser(text);
        return;
      }
      // Decode base64 -> bytes -> play via Web Audio. Web Audio is NOT subject
      // to the page's `media-src` CSP (which blocks <audio>/blob: on sites like
      // Gmail/Facebook), so Azure audio plays everywhere.
      const bin = atob(res.audioB64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = audioCtxRef.current ?? (audioCtxRef.current = new Ctx());
      if (ctx.state === 'suspended') await ctx.resume();
      const buffer = await ctx.decodeAudioData(bytes.buffer);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.onended = () => {
        if (srcRef.current === src) srcRef.current = null;
        setSpeaking(false);
      };
      srcRef.current = src;
      src.start();
    } catch {
      speakBrowser(text);
    }
  }

  /** Fallback: read using the browser's built-in speech synthesis. */
  function speakBrowser(text: string) {
    if (typeof speechSynthesis === 'undefined') {
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    const lang = SPEECH_LANG[settings.selectionTargetLanguage] ?? settings.selectionTargetLanguage;
    u.lang = lang;
    const voices = speechSynthesis.getVoices();
    const match = voices.find((v) => v.lang?.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
    if (match) u.voice = match;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    utterRef.current = u;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    setSpeaking(true);
  }

  // Compact state (not translated yet): language picker + Translate.
  if (!selectionTranslation) {
    return (
      <div className="fixed z-[2147483647] animate-gw-fade-in" style={{ top: posTop, left: posLeft, width: W }}>
        <div
          className="gw-glass rounded-full pl-1 pr-1 py-1 flex items-center gap-1 cursor-move select-none"
          style={{ touchAction: 'none' }}
          onPointerDown={onDragDown}
          onPointerMove={onDragMove}
          onPointerUp={onDragUp}
        >
          <span className="opacity-40 -ml-0.5 mr-0.5" title={t('selection.drag')}>
            <DragGripIcon />
          </span>
          <LangMenu value={settings.selectionTargetLanguage} onPick={(c) => actions.setSelectionTargetLanguage(c)} />
          <div className="gw-divider" />
          <button
            type="button"
            className="gw-btn !px-3 !py-1 rounded-full text-[13px] font-semibold flex-1 justify-center"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => actions.translateSelection()}
            title={t('selection.translateTitle', { lang: target.label })}
          >
            {t('selection.translate')}
          </button>
        </div>
      </div>
    );
  }

  // Result card.
  return (
    <div className="fixed z-[2147483647] animate-gw-fade-in" style={{ top: posTop, left: posLeft, width: W }}>
      <div className="gw-glass rounded-2xl px-3.5 py-2.5">
        <div
          className="flex items-center justify-between mb-1.5 gap-2 cursor-move select-none"
          style={{ touchAction: 'none' }}
          onPointerDown={onDragDown}
          onPointerMove={onDragMove}
          onPointerUp={onDragUp}
        >
          <span className="opacity-40 ml-0.5" title={t('selection.drag')}>
            <DragGripIcon />
          </span>
          <LangMenu
            value={settings.selectionTargetLanguage}
            onPick={(c) => {
              actions.setSelectionTargetLanguage(c);
              actions.translateSelection(); // re-translate into the new language
            }}
          />
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              className={`gw-btn !px-1.5 !py-0.5 text-xs ${selectionPinned ? 'text-[#0a84ff]' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => actions.togglePinSelection()}
              title={selectionPinned ? t('selection.unpin') : t('selection.pin')}
            >
              <PinIcon filled={selectionPinned} />
            </button>
            <button
              type="button"
              className="gw-btn !px-1.5 !py-0.5 text-xs"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? t('selection.collapse') : t('selection.expand')}
            >
              <ExpandIcon expanded={expanded} />
            </button>
            <button
              type="button"
              className="gw-btn !px-1.5 !py-0.5 text-xs"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => actions.dismissSelection()}
              title={t('selection.close')}
            >
              ✕
            </button>
          </div>
        </div>

        {selectionTranslation.status === 'error' ? (
          <div className="text-[13px] text-red-500 leading-snug">{selectionTranslation.error}</div>
        ) : selectionTranslation.status === 'loading' ? (
          <div className="gw-shimmer-text text-[14px] py-1">{t('selection.translating')}</div>
        ) : (
          <>
            <div
              className="text-[14px] leading-relaxed overflow-y-auto gw-scroll whitespace-pre-wrap [word-break:break-word]"
              style={{ maxHeight: expanded ? '60vh' : 200 }}
            >
              {selectionTranslation.text}
              {selectionTranslation.status === 'streaming' && (
                <span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle bg-current animate-gw-pulse rounded-sm" />
              )}
            </div>
            {selectionTranslation.status === 'ready' && (
              <div className="flex justify-end gap-1.5 mt-2">
                <button
                  type="button"
                  className={`gw-btn !py-1 text-xs ${speaking ? 'text-[#0a84ff]' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={toggleSpeak}
                  title={speaking ? t('selection.stop') : t('selection.read')}
                >
                  <SpeakerIcon on={speaking} /> {speaking ? t('selection.stop') : t('selection.read')}
                </button>
                <button
                  type="button"
                  className="gw-btn !py-1 text-xs"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exportTranslationPdf(selectionTranslation.text, target.label)}
                  title={t('selection.export')}
                >
                  <PdfIcon /> {t('selection.export')}
                </button>
                <button
                  type="button"
                  className="gw-btn !py-1 text-xs"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={copy}
                >
                  {copied ? (
                    `✓ ${t('selection.copied')}`
                  ) : (
                    <>
                      <CopyIcon /> {t('selection.copy')}
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
