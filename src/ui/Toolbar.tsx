import { useFullStore } from '@/content/useStore';
import { actions, store } from '@/content/store';
import { Dropdown } from '@/ui/Dropdown';
import { LanguagePicker } from '@/ui/LanguagePicker';
import { LANGUAGE_MAP, MODELS, TONES, modelLabel } from '@/core/languages';
import type { Tone } from '@/types';
import { useLayoutEffect, useRef, useState } from 'react';
import { useT } from '@/i18n/useT';
import type { MessageKey } from '@/i18n/messages';
import { PRICING_URL } from '@/config';

/* ---- Inline icons (inherit currentColor so they follow the theme) -------- */
const ICON = 16;

function TranslateIcon() {
  return (
    <svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19.06 18.6699L16.92 14.3999L14.78 18.6699" />
      <path d="M15.1699 17.9099H18.6899" />
      <path d="M16.9201 22.0001C14.1201 22.0001 11.8401 19.73 11.8401 16.92C11.8401 14.12 14.1101 11.8401 16.9201 11.8401C19.7201 11.8401 22.0001 14.11 22.0001 16.92C22.0001 19.73 19.7301 22.0001 16.9201 22.0001Z" />
      <path d="M5.02 2H8.94C11.01 2 12.01 3.00002 11.96 5.02002V8.94C12.01 11.01 11.01 12.01 8.94 11.96H5.02C3 12 2 11 2 8.92999V5.01001C2 3.00001 3 2 5.02 2Z" />
      <path d="M9.00995 5.84985H4.94995" />
      <path d="M6.96997 5.16992V5.84991" />
      <path d="M7.98994 5.83984C7.98994 7.58984 6.61994 9.00983 4.93994 9.00983" />
      <path d="M9.0099 9.01001C8.2799 9.01001 7.61991 8.62 7.15991 8" />
      <path d="M2 15C2 18.87 5.13 22 9 22L7.95 20.25" />
      <path d="M22 9C22 5.13 18.87 2 15 2L16.05 3.75" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.4001 18.1612L11.4001 18.1612L18.796 10.7653C17.7894 10.3464 16.5972 9.6582 15.4697 8.53068C14.342 7.40298 13.6537 6.21058 13.2348 5.2039L5.83882 12.5999L5.83879 12.5999C5.26166 13.1771 4.97307 13.4657 4.7249 13.7838C4.43213 14.1592 4.18114 14.5653 3.97634 14.995C3.80273 15.3593 3.67368 15.7465 3.41556 16.5208L2.05445 20.6042C1.92743 20.9852 2.0266 21.4053 2.31063 21.6894C2.59466 21.9734 3.01478 22.0726 3.39584 21.9456L7.47918 20.5844C8.25351 20.3263 8.6407 20.1973 9.00498 20.0237C9.43469 19.8189 9.84082 19.5679 10.2162 19.2751C10.5343 19.0269 10.823 18.7383 11.4001 18.1612Z" />
      <path d="M20.8482 8.71306C22.3839 7.17735 22.3839 4.68748 20.8482 3.15178C19.3125 1.61607 16.8226 1.61607 15.2869 3.15178L14.3999 4.03882C14.4121 4.0755 14.4246 4.11268 14.4377 4.15035C14.7628 5.0875 15.3763 6.31601 16.5303 7.47002C17.6843 8.62403 18.9128 9.23749 19.85 9.56262C19.8875 9.57563 19.9245 9.58817 19.961 9.60026L20.8482 8.71306Z" />
    </svg>
  );
}

function GhostIcon() {
  return (
    <svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M22 12V19.2058C22 20.4896 20.649 21.3245 19.5008 20.7504C18.5727 20.2864 17.4672 20.3552 16.6039 20.9308C15.6326 21.5782 14.3674 21.5782 13.3961 20.9308L13.0435 20.6957C12.4116 20.2744 11.5884 20.2744 10.9565 20.6957L10.6039 20.9308C9.63264 21.5782 8.36736 21.5782 7.39614 20.9308C6.5328 20.3552 5.42726 20.2864 4.4992 20.7504C3.35098 21.3245 2 20.4896 2 19.2058V12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM9.44661 14.3975C9.11385 14.1508 8.64413 14.2206 8.39747 14.5534C8.15082 14.8862 8.22062 15.3559 8.55339 15.6025C9.5258 16.3233 10.715 16.75 12 16.75C13.285 16.75 14.4742 16.3233 15.4466 15.6025C15.7794 15.3559 15.8492 14.8862 15.6025 14.5534C15.3559 14.2206 14.8862 14.1508 14.5534 14.3975C13.825 14.9373 12.9459 15.25 12 15.25C11.0541 15.25 10.175 14.9373 9.44661 14.3975ZM16 9.5C16 10.3284 15.5523 11 15 11C14.4477 11 14 10.3284 14 9.5C14 8.67157 14.4477 8 15 8C15.5523 8 16 8.67157 16 9.5ZM9 11C9.55228 11 10 10.3284 10 9.5C10 8.67157 9.55228 8 9 8C8.44772 8 8 8.67157 8 9.5C8 10.3284 8.44772 11 9 11Z" />
    </svg>
  );
}

function SettingIcon() {
  return (
    <svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeMiterlimit={10} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" />
      <path d="M2 12.8799V11.1199C2 10.0799 2.85 9.21994 3.9 9.21994C5.71 9.21994 6.45 7.93994 5.54 6.36994C5.02 5.46994 5.33 4.29994 6.24 3.77994L7.97 2.78994C8.76 2.31994 9.78 2.59994 10.25 3.38994L10.36 3.57994C11.26 5.14994 12.74 5.14994 13.65 3.57994L13.76 3.38994C14.23 2.59994 15.25 2.31994 16.04 2.78994L17.77 3.77994C18.68 4.29994 18.99 5.46994 18.47 6.36994C17.56 7.93994 18.3 9.21994 20.11 9.21994C21.15 9.21994 22.01 10.0699 22.01 11.1199V12.8799C22.01 13.9199 21.16 14.7799 20.11 14.7799C18.3 14.7799 17.56 16.0599 18.47 17.6299C18.99 18.5399 18.68 19.6999 17.77 20.2199L16.04 21.2099C15.25 21.6799 14.23 21.3999 13.76 20.6099L13.65 20.4199C12.75 18.8499 11.27 18.8499 10.36 20.4199L10.25 20.6099C9.78 21.3999 8.76 21.6799 7.97 21.2099L6.24 20.2199C5.33 19.6999 5.02 18.5299 5.54 17.6299C6.45 16.0599 5.71 14.7799 3.9 14.7799C2.85 14.7799 2 13.9199 2 12.8799Z" />
    </svg>
  );
}

function ReplyIcon() {
  return (
    <svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 17l-5-5 5-5" />
      <path d="M4 12h11a5 5 0 0 1 5 5v1" />
    </svg>
  );
}

function PanelIcon() {
  return (
    <svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M15 4v16" />
      <path d="M17.6 9.2l1.8 1.8-1.8 1.8" opacity={0.7} />
    </svg>
  );
}

/**
 * The floating toolbar shown when an editor is focused.
 *
 *  ⠿  🌐 Auto → English   Tone: Professional   Model: …   407ms   –
 *  ─────────────────────────────────────────────────────────────────
 *  Translate   Rewrite   Ghost Mode   ⚙
 *
 * It can be dragged anywhere (grip handle) and collapsed into a small pill.
 */
export function Toolbar() {
  const { toolbarVisible, editorRect, settings, detectedLanguage, latencyMs, toolbarPos, appConfig, freeUsage, selection } =
    useFullStore();
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Drag bookkeeping.
  const drag = useRef({ active: false, moved: false, ox: 0, oy: 0, sx: 0, sy: 0 });

  // Measure rendered size to anchor fully above the input and to clamp drags.
  useLayoutEffect(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    if (r.height && (Math.abs(r.height - size.h) > 1 || Math.abs(r.width - size.w) > 1)) {
      setSize({ w: r.width, h: r.height });
    }
  });

  if (!toolbarVisible || !editorRect) return null;
  // Avoid overlapping/cluttering with the selection-translate popup: while the
  // user is translating selected text, hide the typing toolbar.
  if (selection && !selection.hidden) return null;

  const collapsed = settings.toolbarCollapsed;
  const targetMeta = LANGUAGE_MAP[settings.targetLanguage];

  // Admin-controlled model list / picker visibility.
  const allowModel = appConfig?.allowUserModelSelection ?? true;
  const modelList = appConfig?.models?.length ? appConfig.models : MODELS;
  const curModelLabel = modelList.find((m) => m.id === settings.model)?.label ?? modelLabel(settings.model);

  const GAP = 10;
  const h = size.h || (collapsed ? 40 : 92);
  const w = size.w || (collapsed ? 160 : Math.min(editorRect.width || 520, 560));

  // Position: manual (dragged) wins; otherwise anchor above the editor.
  let top: number;
  let left: number;
  if (toolbarPos) {
    left = clamp(toolbarPos.x, 4, window.innerWidth - w - 4);
    top = clamp(toolbarPos.y, 4, window.innerHeight - h - 4);
  } else {
    top = editorRect.top - h - GAP;
    if (top < 8) top = Math.min(editorRect.bottom + GAP, window.innerHeight - h - 8);
    left = Math.max(8, Math.min(editorRect.left, window.innerWidth - w - 8));
  }

  // ---- Drag handlers -------------------------------------------------------
  function onDragStart(e: React.PointerEvent) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    drag.current = {
      active: true,
      moved: false,
      ox: e.clientX - rect.left,
      oy: e.clientY - rect.top,
      sx: e.clientX,
      sy: e.clientY,
    };
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
  }
  function onDragMove(e: PointerEvent) {
    if (!drag.current.active) return;
    if (Math.abs(e.clientX - drag.current.sx) + Math.abs(e.clientY - drag.current.sy) > 4) {
      drag.current.moved = true;
    }
    store.set({ toolbarPos: { x: e.clientX - drag.current.ox, y: e.clientY - drag.current.oy } });
  }
  function onDragEnd() {
    drag.current.active = false;
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
    // Reset shortly after so a subsequent click on the pill isn't blocked by a
    // stale "moved" flag from a previous drag.
    setTimeout(() => {
      drag.current.moved = false;
    }, 0);
  }
  function resetPosition() {
    store.set({ toolbarPos: null });
  }

  const Grip = (
    <button
      type="button"
      title={t('toolbar.dragHint')}
      className="gw-grip"
      onPointerDown={onDragStart}
      onDoubleClick={resetPosition}
      onMouseDown={(e) => e.preventDefault()}
    >
      ⠿
    </button>
  );

  // ---- Collapsed pill ------------------------------------------------------
  if (collapsed) {
    return (
      <div
        ref={ref}
        className="fixed z-[2147483646] animate-gw-fade-in"
        style={{ top, left }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <div className="gw-glass rounded-full pl-0.5 pr-1 py-0.5 flex items-center gap-0.5">
          {Grip}
          <button
            type="button"
            className="gw-btn !px-2 !py-1 rounded-full flex items-center gap-1.5"
            title={t('toolbar.expand')}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => actions.toggleCollapsed()}
          >
            <span className={settings.ghostMode ? 'text-[#0a84ff]' : 'opacity-80'}>
              <GhostIcon />
            </span>
            <span className="gw-chip !px-1.5 !py-0 text-[11px] font-bold tracking-wide">
              {settings.targetLanguage.toUpperCase()}
            </span>
            {freeUsage && (
              <span
                className="text-[11px] font-bold"
                style={{ color: freeUsage.used >= freeUsage.limit ? '#ff3b30' : '#0a84ff' }}
                title={t('toolbar.freeLeft', {
                  left: Math.max(0, freeUsage.limit - freeUsage.used),
                  limit: freeUsage.limit,
                })}
              >
                {Math.max(0, freeUsage.limit - freeUsage.used)}
              </span>
            )}
            {settings.ghostMode && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#0a84ff]" />
            )}
            <span className="opacity-50 text-[11px]">▸</span>
          </button>
        </div>
      </div>
    );
  }

  // ---- Full toolbar --------------------------------------------------------
  return (
    <div
      ref={ref}
      className="fixed z-[2147483646] animate-gw-fade-in"
      style={{ top, left }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="gw-glass rounded-2xl px-2 py-1.5 flex flex-col gap-1">
        <div className="flex items-center gap-1">
          {Grip}
          {/* Language selector */}
          <LanguagePicker
            value={settings.targetLanguage}
            onPick={(code) => actions.setTargetLanguage(code)}
            trigger={
              <button className="gw-btn" type="button">
                <span>🌐</span>
                <span className="opacity-80">{detectedLanguage ?? t('toolbar.auto')}</span>
                <span className="opacity-55">→</span>
                <span className="font-semibold">
                  {targetMeta.flag} {targetMeta.label}
                </span>
              </button>
            }
          />

          <div className="gw-divider" />

          {/* Tone selector */}
          <Dropdown
            trigger={
              <button className="gw-btn" type="button">
                <span className="opacity-70">{t('toolbar.tone')}</span>
                <span className="font-semibold capitalize">{t(`tone.${settings.tone}` as MessageKey)}</span>
              </button>
            }
          >
            {(close) => (
              <>
                {TONES.map((tn) => (
                  <div
                    key={tn.value}
                    className="gw-menu-item"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      actions.setTone(tn.value as Tone);
                      close();
                    }}
                  >
                    <span>
                      {tn.emoji} {t(`tone.${tn.value}` as MessageKey)}
                    </span>
                    {settings.tone === tn.value && <span className="text-[#0a84ff]">✓</span>}
                  </div>
                ))}
              </>
            )}
          </Dropdown>

          {/* Model selector */}
          {allowModel && (
            <>
              <div className="gw-divider" />
              <Dropdown
                trigger={
                  <button className="gw-btn" type="button">
                    <span className="opacity-70">{t('toolbar.model')}</span>
                    <span className="font-semibold">{curModelLabel}</span>
                  </button>
                }
              >
                {(close) => (
                  <>
                    {modelList.map((m) => (
                      <div
                        key={m.id}
                        className="gw-menu-item"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          actions.setModel(m.id);
                          close();
                        }}
                      >
                        <span>{m.label}</span>
                        {settings.model === m.id && <span className="text-[#0a84ff]">✓</span>}
                      </div>
                    ))}
                  </>
                )}
              </Dropdown>
            </>
          )}

          {latencyMs != null && (
            <>
              <div className="gw-divider" />
              <span className="gw-chip opacity-80">
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${
                    latencyMs < 400 ? 'bg-green-500' : latencyMs < 900 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                />
                {latencyMs}ms
              </span>
            </>
          )}

          {freeUsage && (
            <>
              <div className="gw-divider" />
              {(() => {
                const left = Math.max(0, freeUsage.limit - freeUsage.used);
                if (left === 0) {
                  return (
                    <button
                      type="button"
                      className="gw-btn gw-btn-primary !px-3 !py-1 rounded-full text-[12px] font-semibold"
                      title={t('toolbar.freeLeft', { left, limit: freeUsage.limit })}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => window.open(PRICING_URL, '_blank', 'noopener')}
                    >
                      <GhostIcon /> {t('toolbar.upgrade')}
                    </button>
                  );
                }
                return (
                  <span
                    className="gw-chip"
                    title={t('toolbar.freeLeft', { left, limit: freeUsage.limit })}
                  >
                    <GhostIcon />
                    <b>{left}</b>
                    <span className="opacity-60">/{freeUsage.limit}</span>
                  </span>
                );
              })()}
            </>
          )}

          <div className="flex-1" />

          {/* Collapse */}
          <button
            className="gw-btn !px-2"
            type="button"
            title={t('toolbar.collapse')}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => actions.toggleCollapsed()}
          >
            –
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button className="gw-btn" type="button" onClick={() => actions.translate()}>
            <TranslateIcon /> {t('toolbar.translate')}
          </button>
          <button className="gw-btn" type="button" onClick={() => actions.rewrite()}>
            <PenIcon /> {t('toolbar.rewrite')}
          </button>
          <button
            className={`gw-btn ${settings.ghostMode ? 'gw-btn-primary' : ''}`}
            type="button"
            onClick={() => actions.toggleGhostMode()}
          >
            <GhostIcon /> {t('toolbar.ghostMode')}
          </button>
          {settings.enableReply && (
            <button className="gw-btn" type="button" onClick={() => actions.openReply()}>
              <ReplyIcon /> {t('toolbar.reply')}
            </button>
          )}
          <div className="gw-divider" />
          <button
            className="gw-btn"
            type="button"
            title={t('toolbar.sidePanel')}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => actions.openSidePanel()}
          >
            <PanelIcon />
          </button>
          <button
            className="gw-btn"
            type="button"
            title={t('toolbar.settings')}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => actions.openSettings()}
          >
            <SettingIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(v, Math.max(min, max)));
}
