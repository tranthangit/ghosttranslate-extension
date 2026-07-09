import { useEffect, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, type AppConfig, type Settings as SettingsType, type UILanguage } from '@/types';
import { storage } from '@/storage/StorageManager';
import { LANGUAGES, MODELS, TONES } from '@/core/languages';
import { Toggle } from '@/settings/Toggle';
import { t as translate, UI_LANGUAGES, type MessageKey } from '@/i18n/messages';
import { WORKER_ENDPOINT, PRICING_URL } from '@/config';
import { getDeviceId, getActivationId, setActivationId, getSuppressActivate, setSuppressActivate } from '@/core/device';
import { perksForPlan } from '@/core/planPerks';
import { getUsageCount, FREE_DAILY_LIMIT, USAGE_KEY } from '@/core/usage';

type TestState = { status: 'idle' | 'testing' | 'ok' | 'fail'; message?: string; plan?: string; expires?: string };
type SectionId = 'account' | 'defaults' | 'behaviour' | 'sites' | 'shortcuts';

/** Friendly device label sent to Polar so users can recognise their devices. */
function deviceLabel(): string {
  const ua = navigator.userAgent;
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Mac/.test(ua)
      ? 'macOS'
      : /Android/.test(ua)
        ? 'Android'
        : /Linux/.test(ua)
          ? 'Linux'
          : 'Browser';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Brave/.test(ua)
        ? 'Brave'
        : 'Chrome';
  return `${browser} on ${os}`;
}

type IconProps = { className?: string };

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function GhostIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M22 12V19.2058C22 20.4896 20.649 21.3245 19.5008 20.7504C18.5727 20.2864 17.4672 20.3552 16.6039 20.9308C15.6326 21.5782 14.3674 21.5782 13.3961 20.9308L13.0435 20.6957C12.4116 20.2744 11.5884 20.2744 10.9565 20.6957L10.6039 20.9308C9.63264 21.5782 8.36736 21.5782 7.39614 20.9308C6.5328 20.3552 5.42726 20.2864 4.4992 20.7504C3.35098 21.3245 2 20.4896 2 19.2058V12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM9.44661 14.3975C9.11385 14.1508 8.64413 14.2206 8.39747 14.5534C8.15082 14.8862 8.22062 15.3559 8.55339 15.6025C9.5258 16.3233 10.715 16.75 12 16.75C13.285 16.75 14.4742 16.3233 15.4466 15.6025C15.7794 15.3559 15.8492 14.8862 15.6025 14.5534C15.3559 14.2206 14.8862 14.1508 14.5534 14.3975C13.825 14.9373 12.9459 15.25 12 15.25C11.0541 15.25 10.175 14.9373 9.44661 14.3975ZM16 9.5C16 10.3284 15.5523 11 15 11C14.4477 11 14 10.3284 14 9.5C14 8.67157 14.4477 8 15 8C15.5523 8 16 8.67157 16 9.5ZM9 11C9.55228 11 10 10.3284 10 9.5C10 8.67157 9.55228 8 9 8C8.44772 8 8 8.67157 8 9.5C8 10.3284 8.44772 11 9 11Z" />
    </svg>
  );
}

function AccountIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z" {...stroke} />
      <path d="M18.88 21C18.88 17.13 15.79 14 12 14C8.21 14 5.12 17.13 5.12 21" {...stroke} />
    </svg>
  );
}

function TranslateIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M19.06 18.6699L16.92 14.3999L14.78 18.6699" {...stroke} />
      <path d="M15.1699 17.9099H18.6899" {...stroke} />
      <path d="M16.9201 22.0001C14.1201 22.0001 11.8401 19.73 11.8401 16.92C11.8401 14.12 14.1101 11.8401 16.9201 11.8401C19.7201 11.8401 22.0001 14.11 22.0001 16.92C22.0001 19.73 19.7301 22.0001 16.9201 22.0001Z" {...stroke} />
      <path d="M5.02 2H8.94C11.01 2 12.01 3.00002 11.96 5.02002V8.94C12.01 11.01 11.01 12.01 8.94 11.96H5.02C3 12 2 11 2 8.92999V5.01001C2 3.00001 3 2 5.02 2Z" {...stroke} />
      <path d="M9.00995 5.84985H4.94995" {...stroke} />
      <path d="M6.96997 5.16992V5.84991" {...stroke} />
      <path d="M7.98994 5.83984C7.98994 7.58984 6.61994 9.00983 4.93994 9.00983" {...stroke} />
      <path d="M9.0099 9.01001C8.2799 9.01001 7.61991 8.62 7.15991 8" {...stroke} />
      <path d="M2 15C2 18.87 5.13 22 9 22L7.95 20.25" {...stroke} />
      <path d="M22 9C22 5.13 18.87 2 15 2L16.05 3.75" {...stroke} />
    </svg>
  );
}

function SettingIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" {...stroke} strokeWidth={1.5} />
      <path d="M2 12.8799V11.1199C2 10.0799 2.85 9.21994 3.9 9.21994C5.71 9.21994 6.45 7.93994 5.54 6.36994C5.02 5.46994 5.33 4.29994 6.24 3.77994L7.97 2.78994C8.76 2.31994 9.78 2.59994 10.25 3.38994L10.36 3.57994C11.26 5.14994 12.74 5.14994 13.65 3.57994L13.76 3.38994C14.23 2.59994 15.25 2.31994 16.04 2.78994L17.77 3.77994C18.68 4.29994 18.99 5.46994 18.47 6.36994C17.56 7.93994 18.3 9.21994 20.11 9.21994C21.15 9.21994 22.01 10.0699 22.01 11.1199V12.8799C22.01 13.9199 21.16 14.7799 20.11 14.7799C18.3 14.7799 17.56 16.0599 18.47 17.6299C18.99 18.5399 18.68 19.6999 17.77 20.2199L16.04 21.2099C15.25 21.6799 14.23 21.3999 13.76 20.6099L13.65 20.4199C12.75 18.8499 11.27 18.8499 10.36 20.4199L10.25 20.6099C9.78 21.3999 8.76 21.6799 7.97 21.2099L6.24 20.2199C5.33 19.6999 5.02 18.5299 5.54 17.6299C6.45 16.0599 5.71 14.7799 3.9 14.7799C2.85 14.7799 2 13.9199 2 12.8799Z" {...stroke} />
    </svg>
  );
}

function BrowserIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22Z" {...stroke} />
      <path d="M12 16C14.21 16 16 14.21 16 12C16 9.79 14.21 8 12 8C9.79 8 8 9.79 8 12C8 14.21 9.79 16 12 16Z" {...stroke} />
      <path d="M21.17 8C18.15 7.34 15.02 7.34 12 8" {...stroke} />
      <path d="M3.95001 6.06006L3.97001 6.12006C4.98001 9.01006 6.53001 11.6901 8.54001 14.0001" {...stroke} />
      <path d="M10.88 21.94C12.94 19.67 14.49 16.99 15.43 14.08L15.46 14" {...stroke} />
    </svg>
  );
}

function KeyboardIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M7.5 4H16.5C17.12 4 17.67 4.02 18.16 4.09C20.79 4.38 21.5 5.62 21.5 9V15C21.5 18.38 20.79 19.62 18.16 19.91C17.67 19.98 17.12 20 16.5 20H7.5C6.88 20 6.33 19.98 5.84 19.91C3.21 19.62 2.5 18.38 2.5 15V9C2.5 5.62 3.21 4.38 5.84 4.09C6.33 4.02 6.88 4 7.5 4Z" {...stroke} />
      <path d="M13.5 10H17" {...stroke} />
      <path d="M7 15.5H7.02H17" {...stroke} />
      <path d="M10.0946 10H10.1036" {...stroke} strokeWidth={2} />
      <path d="M7.0946 10H7.10359" {...stroke} strokeWidth={2} />
    </svg>
  );
}

function LaptopIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3.69364 4.5019C3.29582 4.11881 2.66277 4.13076 2.27968 4.52858C1.89659 4.9264 1.90854 5.55945 2.30636 5.94254L3.69364 4.5019ZM4.84615 7L4.15251 7.72032C4.53976 8.09323 5.15255 8.09323 5.5398 7.72032L4.84615 7ZM9.69364 3.72032C10.0915 3.33723 10.1034 2.70418 9.72032 2.30636C9.33723 1.90854 8.70418 1.89659 8.30636 2.27968L9.69364 3.72032ZM13 3C12.4477 3 12 3.44772 12 4C12 4.55228 12.4477 5 13 5V3ZM20 16C20 16.5523 20.4477 17 21 17C21.5523 17 22 16.5523 22 16H20ZM19.908 4.21799L20.362 3.32698L19.908 4.21799ZM20.782 5.09202L19.891 5.54601V5.54601L20.782 5.09202ZM2 16C2 16.5523 2.44772 17 3 17C3.55228 17 4 16.5523 4 16H2ZM4 11C4 10.4477 3.55228 10 3 10C2.44772 10 2 10.4477 2 11H4ZM2 16V15C1.44772 15 1 15.4477 1 16H2ZM22 16H23C23 15.4477 22.5523 15 22 15V16ZM3.09202 19.782L3.54601 18.891L3.09202 19.782ZM2.21799 18.908L3.10899 18.454L2.21799 18.908ZM21.782 18.908L20.891 18.454L21.782 18.908ZM20.908 19.782L20.454 18.891L20.908 19.782ZM2.30636 5.94254L4.15251 7.72032L5.5398 6.27968L3.69364 4.5019L2.30636 5.94254ZM5.5398 7.72032L9.69364 3.72032L8.30636 2.27968L4.15251 6.27968L5.5398 7.72032ZM13 5H17.8V3H13V5ZM20 7.2V16H22V7.2H20ZM17.8 5C18.3766 5 18.7488 5.00078 19.0322 5.02393C19.3038 5.04612 19.4045 5.0838 19.454 5.10899L20.362 3.32698C19.9836 3.13419 19.5904 3.06287 19.195 3.03057C18.8114 2.99922 18.3436 3 17.8 3V5ZM22 7.2C22 6.65645 22.0008 6.18864 21.9694 5.80497C21.9371 5.40963 21.8658 5.01641 21.673 4.63803L19.891 5.54601C19.9162 5.59545 19.9539 5.69617 19.9761 5.96784C19.9992 6.25117 20 6.62345 20 7.2H22ZM19.454 5.10899C19.6422 5.20487 19.7951 5.35785 19.891 5.54601L21.673 4.63803C21.3854 4.07354 20.9265 3.6146 20.362 3.32698L19.454 5.10899ZM4 16V11H2V16H4ZM2 17H22V15H2V17ZM21 16V16.8H23V16H21ZM18.8 19H5.2V21H18.8V19ZM3 16.8V16H1V16.8H3ZM5.2 19C4.62345 19 4.25117 18.9992 3.96784 18.9761C3.69617 18.9539 3.59545 18.9162 3.54601 18.891L2.63803 20.673C3.01641 20.8658 3.40963 20.9371 3.80497 20.9694C4.18864 21.0008 4.65645 21 5.2 21V19ZM1 16.8C1 17.3436 0.999222 17.8114 1.03057 18.195C1.06287 18.5904 1.13419 18.9836 1.32698 19.362L3.10899 18.454C3.0838 18.4045 3.04612 18.3038 3.02393 18.0322C3.00078 17.7488 3 17.3766 3 16.8H1ZM3.54601 18.891C3.35785 18.7951 3.20487 18.6422 3.10899 18.454L1.32698 19.362C1.6146 19.9265 2.07354 20.3854 2.63803 20.673L3.54601 18.891ZM21 16.8C21 17.3766 20.9992 17.7488 20.9761 18.0322C20.9539 18.3038 20.9162 18.4045 20.891 18.454L22.673 19.362C22.8658 18.9836 22.9371 18.5904 22.9694 18.195C23.0008 17.8114 23 17.3436 23 16.8H21ZM18.8 21C19.3436 21 19.8114 21.0008 20.195 20.9694C20.5904 20.9371 20.9836 20.8658 21.362 20.673L20.454 18.891C20.4045 18.9162 20.3038 18.9539 20.0322 18.9761C19.7488 18.9992 19.3766 19 18.8 19V21ZM20.891 18.454C20.7951 18.6422 20.6422 18.7951 20.454 18.891L21.362 20.673C21.9265 20.3854 22.3854 19.9265 22.673 19.362L20.891 18.454Z"
      />
    </svg>
  );
}

const NAV: { id: SectionId; Icon: (p: IconProps) => JSX.Element; labelKey: MessageKey }[] = [
  { id: 'account', Icon: AccountIcon, labelKey: 'nav.account' },
  { id: 'defaults', Icon: TranslateIcon, labelKey: 'nav.defaults' },
  { id: 'behaviour', Icon: SettingIcon, labelKey: 'nav.behaviour' },
  { id: 'sites', Icon: BrowserIcon, labelKey: 'nav.sites' },
  { id: 'shortcuts', Icon: KeyboardIcon, labelKey: 'nav.shortcuts' },
];

const UI_FLAG: Record<UILanguage, string> = { en: 'gb.svg', vi: 'vietnam.svg' };

function flagUrl(file: string): string {
  try {
    return chrome.runtime.getURL(`icons/${file}`);
  } catch {
    return `icons/${file}`;
  }
}

/** Custom UI-language dropdown with flag SVGs (native <select> can't show SVG). */
function UiLangSelect({ value, onChange }: { value: UILanguage; onChange: (v: UILanguage) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const cur = UI_LANGUAGES.find((l) => l.value === value) ?? UI_LANGUAGES[0];
  return (
    <div className="gt-select" ref={ref}>
      <button
        type="button"
        className="input !w-auto !py-1.5 text-xs flex items-center gap-1.5"
        onClick={() => setOpen((v) => !v)}
      >
        <img src={flagUrl(UI_FLAG[cur.value])} alt="" className="h-4 w-4 rounded-sm object-cover" />
        <span>{cur.label}</span>
        <span className="opacity-50">▾</span>
      </button>
      {open && (
        <div className="gt-select-menu">
          {UI_LANGUAGES.map((l) => (
            <button
              key={l.value}
              type="button"
              className="gt-select-item"
              onClick={() => {
                onChange(l.value);
                setOpen(false);
              }}
            >
              <img src={flagUrl(UI_FLAG[l.value])} alt="" className="h-4 w-4 rounded-sm object-cover" />
              <span>{l.label}</span>
              {l.value === value && <span className="ml-auto text-[#0a84ff]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type ThemeValue = SettingsType['theme'];

function ThemeIcon({ theme }: { theme: ThemeValue }) {
  const p = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (theme === 'light') {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <circle cx="12" cy="12" r="4.2" {...p} />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" {...p} />
      </svg>
    );
  }
  if (theme === 'dark') {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path d="M20 13.5A8 8 0 1 1 10.5 4a6.2 6.2 0 0 0 9.5 9.5z" {...p} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <rect x="3" y="4" width="18" height="12" rx="2" {...p} />
      <path d="M8 20h8M12 16v4" {...p} />
    </svg>
  );
}

/** Custom theme dropdown with SVG icons (native <select> can't show SVG). */
function ThemeSelect({
  value,
  labels,
  onChange,
}: {
  value: ThemeValue;
  labels: Record<ThemeValue, string>;
  onChange: (v: ThemeValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const options: ThemeValue[] = ['system', 'light', 'dark'];
  return (
    <div className="gt-select" ref={ref}>
      <button
        type="button"
        className="input !w-auto !py-1.5 text-xs flex items-center gap-1.5"
        onClick={() => setOpen((v) => !v)}
      >
        <ThemeIcon theme={value} />
        <span>{labels[value]}</span>
        <span className="opacity-50">▾</span>
      </button>
      {open && (
        <div className="gt-select-menu">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              className="gt-select-item"
              onClick={() => {
                onChange(o);
                setOpen(false);
              }}
            >
              <ThemeIcon theme={o} />
              <span>{labels[o]}</span>
              {o === value && <span className="ml-auto text-[#0a84ff]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Settings() {
  const [s, setS] = useState<SettingsType>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [test, setTest] = useState<TestState>({ status: 'idle' });
  const [section, setSection] = useState<SectionId>('account');
  const [devices, setDevices] = useState<
    { id: string; label: string; createdAt?: string | null }[]
  >([]);
  const [deviceLimit, setDeviceLimit] = useState<number | null>(null);
  const [myActivationId, setMyActivationId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [usage, setUsage] = useState(0);

  // Track free-plan daily usage and keep it live.
  useEffect(() => {
    void getUsageCount().then(setUsage);
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes[USAGE_KEY]) {
        const v = changes[USAGE_KEY].newValue as { count?: number } | undefined;
        setUsage(v?.count ?? 0);
      }
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);

  const t = (key: MessageKey, params?: Record<string, string | number>) =>
    translate(s.uiLanguage, key, params);

  useEffect(() => {
    storage.get().then((cur) => {
      setS(cur);
      setLoaded(true);
      // Show last known status instantly (optimistic), then re-verify.
      chrome.storage.local.get('gt:license').then((c) => {
        const cached = c['gt:license'] as { plan?: string; expires?: string } | undefined;
        if (cur.licenseKey && cached) {
          setTest({ status: 'ok', message: t('account.active'), plan: cached.plan, expires: cached.expires });
        }
      });
      // Auto-verify a saved key so the user never has to click Activate again.
      if (cur.licenseKey) activate(cur.licenseKey);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load admin-controlled model config (cache first, then refresh).
  useEffect(() => {
    let alive = true;
    chrome.storage.local.get('gt:appConfig').then((c) => {
      const cached = c['gt:appConfig'] as AppConfig | undefined;
      if (alive && cached?.models) setAppConfig(cached);
    });
    fetch(WORKER_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: true }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!alive || !data || data.ok === false || !Array.isArray(data.models)) return;
        const cfg: AppConfig = {
          models: data.models,
          defaultModel: data.defaultModel,
          allowUserModelSelection: data.allowUserModelSelection !== false,
          freeDailyLimit: Number(data.freeDailyLimit) || undefined,
        };
        setAppConfig(cfg);
        void chrome.storage.local.set({ 'gt:appConfig': cfg });
        // Lock the model when users may not pick one.
        if (!cfg.allowUserModelSelection) {
          setS((prev) => {
            if (prev.model === cfg.defaultModel) return prev;
            storage.set({ model: cfg.defaultModel });
            chrome.runtime.sendMessage({ type: 'SET_SETTINGS', settings: { model: cfg.defaultModel } });
            return { ...prev, model: cfg.defaultModel };
          });
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  function update<K extends keyof SettingsType>(key: K, value: SettingsType[K]) {
    const next = { ...s, [key]: value };
    setS(next);
    storage.set({ [key]: value } as Partial<SettingsType>);
    chrome.runtime.sendMessage({ type: 'SET_SETTINGS', settings: { [key]: value } });
    flashSaved();
  }

  function flashSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  /** Validate / activate the license key for THIS device. */
  async function activate(keyArg?: string, manual = false) {
    const key = (keyArg ?? s.licenseKey).trim();
    if (!key) {
      setTest({ status: 'fail', message: t('account.enterKey') });
      return;
    }
    // Clicking Activate re-enables auto-activation; auto runs skip if suppressed.
    if (manual) await setSuppressActivate(false);
    else if (await getSuppressActivate()) return;

    setTest((prev) => (prev.status === 'ok' ? prev : { status: 'testing' }));

    const ok = (data: { plan?: string; expires?: string }) => {
      void chrome.storage.local.set({ 'gt:license': { plan: data.plan, expires: data.expires } });
      setTest({ status: 'ok', message: t('account.active'), plan: data.plan, expires: data.expires });
      void loadDevices(key);
    };
    const fail = async (message: string) => {
      await chrome.storage.local.remove('gt:license');
      setTest({ status: 'fail', message });
    };

    const post = (payload: object, activationId?: string | null) =>
      fetch(WORKER_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          ...(activationId ? { 'X-Activation-Id': activationId } : {}),
        },
        body: JSON.stringify(payload),
      });

    try {
      const deviceId = await getDeviceId();
      let activationId = await getActivationId();

      // 1. Already activated on this device → just validate the activation.
      if (activationId) {
        const res = await post({ verify: true }, activationId);
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok !== false) return ok(data);
        // Activation no longer valid (revoked/removed) → reset and re-activate.
        activationId = null;
        await setActivationId(null);
      }

      // 2. Activate this device (Polar enforces the device limit here).
      const res = await post({ activate: true, deviceId, label: deviceLabel() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        await fail(data.error || t('account.invalid'));
        return;
      }
      await setActivationId(data.activationId ?? null);
      ok(data);
    } catch (e) {
      setTest({ status: 'fail', message: (e as Error).message });
    }
  }

  /** Load the list of devices activated for the current license key. */
  async function loadDevices(key: string) {
    try {
      setMyActivationId(await getActivationId());
      const res = await fetch(WORKER_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ devices: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok !== false) {
        setDevices(data.devices || []);
        setDeviceLimit(data.limit ?? null);
      }
    } catch {
      /* ignore */
    }
  }

  /** Remove (deactivate) a device so its slot is freed. */
  async function deactivateDevice(activationId: string) {
    const key = s.licenseKey.trim();
    if (!key) return;
    const wasThisDevice = (await getActivationId()) === activationId;
    setRemovingId(activationId);
    try {
      const res = await fetch(WORKER_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ deactivate: true, activationId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok !== false) {
        if (wasThisDevice) {
          // Removed the current device → go inactive and stop auto-reactivating.
          await setActivationId(null);
          await setSuppressActivate(true);
          await chrome.storage.local.remove('gt:license');
          setMyActivationId(null);
          setDevices([]);
          setDeviceLimit(null);
          setTest({ status: 'idle' });
        } else {
          await loadDevices(key);
        }
      }
    } finally {
      setRemovingId(null);
    }
  }

  // Apply the chosen theme to the settings page itself (not just the in-page UI).
  useEffect(() => {
    const root = document.documentElement;
    const apply = (dark: boolean) => root.classList.toggle('gt-dark', dark);
    if (s.theme === 'dark') {
      apply(true);
      return;
    }
    if (s.theme === 'light') {
      apply(false);
      return;
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    apply(mq.matches);
    const onChange = (e: MediaQueryListEvent) => apply(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [s.theme]);

  if (!loaded) return null;

  return (
    <div className="settings-shell">
      {/* Sidebar */}
      <aside className="settings-nav">
        <div className="nav-brand flex items-center gap-2.5 px-2 mb-6">
          <GhostIcon className="w-8 h-8 shrink-0 text-[#0a84ff]" />
          <div>
            <div className="text-base font-bold leading-tight">GhostTranslate</div>
            <div className="text-[11px] opacity-50">v1.0.0</div>
          </div>
        </div>
        {NAV.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${section === item.id ? 'nav-item-active' : ''}`}
            onClick={() => setSection(item.id)}
          >
            <item.Icon className="w-5 h-5 shrink-0" />
            <span>{t(item.labelKey)}</span>
          </button>
        ))}
        <div className="nav-foot mt-auto px-2 pt-4 text-[10px] opacity-40 leading-relaxed">
          {t('settings.footer')}
        </div>
      </aside>

      {/* Content */}
      <main className="settings-main">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <h1 className="text-xl font-bold">{t(NAV.find((n) => n.id === section)!.labelKey)}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full transition-opacity ${
                saved ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ background: 'rgba(52,199,89,0.18)', color: '#28a745' }}
            >
              ✓ {t('settings.saved')}
            </span>
            <UiLangSelect value={s.uiLanguage} onChange={(v) => update('uiLanguage', v)} />
            <ThemeSelect
              value={s.theme}
              labels={{
                system: t('settings.theme.system'),
                light: t('settings.theme.light'),
                dark: t('settings.theme.dark'),
              }}
              onChange={(v) => update('theme', v)}
            />
          </div>
        </div>

        {section === 'account' && (
          <section className="card">
            <h2 className="text-lg font-bold mb-1">{t('account.title')}</h2>
            <p className="field-hint mb-4">{t('account.desc')}</p>

            <div className="mb-4">
              <label className="field-label">{t('account.licenseKey')}</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  className="input font-mono min-w-0"
                  type="text"
                  placeholder="GW-XXXX-XXXX-XXXX"
                  value={s.licenseKey}
                  onChange={(e) => update('licenseKey', e.target.value.trim())}
                />
                <button
                  className="btn btn-primary shrink-0"
                  onClick={() => activate(undefined, true)}
                  disabled={test.status === 'testing'}
                >
                  {test.status === 'testing' ? t('account.checking') : t('account.activate')}
                </button>
              </div>
            </div>

            {test.status === 'ok' && (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{ background: 'rgba(52,199,89,0.14)', color: '#1f9d55' }}
              >
                <div className="font-semibold mb-0.5">✓ {test.message}</div>
                <div className="opacity-80 text-xs">
                  {t('account.plan')}: <b>{test.plan ?? '—'}</b> · {t('account.expires')}:{' '}
                  <b>{test.expires ? new Date(test.expires).toLocaleDateString() : t('account.noExpiry')}</b>
                </div>
              </div>
            )}

            {test.status === 'ok' && (() => {
              const perks = perksForPlan(test.plan);
              if (!perks) return null;
              const limits = [...perks.limits];
              if (deviceLimit != null && !limits.some((l) => /device|thiết bị/i.test(l))) {
                limits.push(`${deviceLimit} ${deviceLimit === 1 ? 'device' : 'devices'}`);
              }
              return (
                <div className="mt-3 rounded-xl border border-[var(--gw-border,rgba(0,0,0,0.08))] p-4">
                  <div className="text-sm font-semibold mb-2">{t('account.benefits')}</div>
                  <ul className="space-y-1.5">
                    {perks.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <span style={{ color: '#34c759' }}>✓</span>
                        <span className="opacity-90">{f}</span>
                      </li>
                    ))}
                  </ul>
                  {limits.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[var(--gw-border,rgba(0,0,0,0.08))]">
                      <div className="field-hint mb-1.5">{t('account.limits')}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {limits.map((l) => (
                          <span
                            key={l}
                            className="rounded-full px-2.5 py-1 text-xs font-medium"
                            style={{ background: 'rgba(99,102,241,0.12)', color: '#4f46e5' }}
                          >
                            {l}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            {test.status === 'fail' && (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{ background: 'rgba(255,59,48,0.12)', color: '#d63b32' }}
              >
                ✕ {test.message}
              </div>
            )}

            {test.status !== 'ok' && test.status !== 'testing' && (() => {
              const perks = perksForPlan('free')!;
              const limit =
                appConfig?.freeDailyLimit && appConfig.freeDailyLimit > 0
                  ? appConfig.freeDailyLimit
                  : FREE_DAILY_LIMIT;
              const pct = Math.min(100, Math.round((usage / limit) * 100));
              const nearLimit = usage >= limit;
              const limitChips = perks.limits.map((l) =>
                /translations?\s*\/\s*day/i.test(l) ? `${limit} translations / day` : l,
              );
              return (
                <div className="mt-3 rounded-xl border border-[var(--gw-border,rgba(0,0,0,0.08))] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">{t('account.freePlan')}</span>
                    <span className="field-hint">
                      {t('account.usageToday', { used: usage, limit })}
                    </span>
                  </div>

                  {/* Usage bar */}
                  <div
                    className="h-2 w-full overflow-hidden rounded-full"
                    style={{ background: 'rgba(120,120,130,0.18)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: nearLimit ? '#d63b32' : '#6366f1',
                      }}
                    />
                  </div>

                  <ul className="mt-3 space-y-1.5">
                    {perks.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <span style={{ color: '#34c759' }}>✓</span>
                        <span className="opacity-90">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {limitChips.map((l) => (
                      <span
                        key={l}
                        className="rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{ background: 'rgba(99,102,241,0.12)', color: '#4f46e5' }}
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            {test.status === 'ok' && devices.length > 0 && (
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">{t('account.devices')}</span>
                  <span className="field-hint">
                    {t('account.deviceCount', {
                      used: devices.length,
                      limit: deviceLimit ?? '∞',
                    })}
                  </span>
                </div>
                <ul className="space-y-2">
                  {devices.map((d) => {
                    const isThis = d.id === myActivationId;
                    return (
                      <li
                        key={d.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 dark:border-white/10 px-3.5 py-2.5"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <LaptopIcon className="w-4 h-4 shrink-0 opacity-70" />
                            <span className="truncate">{d.label}</span>
                            {isThis && (
                              <span className="rounded-full bg-[#0a84ff]/15 px-2 py-0.5 text-[10px] font-semibold text-[#0a84ff]">
                                {t('account.thisDevice')}
                              </span>
                            )}
                          </div>
                          {d.createdAt && (
                            <div className="field-hint">
                              {t('account.activatedOn', {
                                date: new Date(d.createdAt).toLocaleDateString(),
                              })}
                            </div>
                          )}
                        </div>
                        <button
                          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-[#d63b32]/30 px-3 py-1.5 text-xs font-semibold text-[#d63b32] transition hover:bg-[#d63b32]/10 disabled:opacity-50"
                          onClick={() => deactivateDevice(d.id)}
                          disabled={removingId === d.id}
                        >
                          {removingId === d.id ? t('account.removing') : t('account.deactivate')}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-black/10 dark:border-white/10">
              <p className="field-hint mb-2">{t('account.buyHint')}</p>
              <a className="btn btn-ghost inline-flex" href={PRICING_URL} target="_blank" rel="noreferrer">
                {t('account.buy')}
              </a>
            </div>
          </section>
        )}

        {section === 'defaults' && (
          <section className="card">
            <h2 className="text-lg font-bold mb-4">{t('settings.defaults.title')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">{t('settings.defaults.targetLanguage')}</label>
                <select
                  className="input"
                  value={s.targetLanguage}
                  onChange={(e) => update('targetLanguage', e.target.value as SettingsType['targetLanguage'])}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.label} ({l.nativeLabel})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">{t('settings.defaults.selectionTargetLanguage')}</label>
                <select
                  className="input"
                  value={s.selectionTargetLanguage}
                  onChange={(e) =>
                    update('selectionTargetLanguage', e.target.value as SettingsType['selectionTargetLanguage'])
                  }
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.label} ({l.nativeLabel})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">{t('settings.defaults.tone')}</label>
                <select
                  className="input"
                  value={s.tone}
                  onChange={(e) => update('tone', e.target.value as SettingsType['tone'])}
                >
                  {TONES.map((tn) => (
                    <option key={tn.value} value={tn.value}>
                      {tn.emoji} {t(`tone.${tn.value}` as MessageKey)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">{t('settings.defaults.replyLength')}</label>
                <select
                  className="input"
                  value={s.replyLength}
                  onChange={(e) => update('replyLength', e.target.value as SettingsType['replyLength'])}
                >
                  {(['short', 'medium', 'long'] as const).map((len) => (
                    <option key={len} value={len}>
                      {t(`reply.length.${len}` as MessageKey)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                {(() => {
                  const allowModel = appConfig?.allowUserModelSelection ?? true;
                  // Admin disabled user model selection -> hide the field entirely.
                  if (!allowModel) return null;
                  const modelList = appConfig?.models?.length ? appConfig.models : MODELS;
                  return (
                    <>
                      <label className="field-label">{t('settings.defaults.model')}</label>
                      <select className="input" value={s.model} onChange={(e) => update('model', e.target.value)}>
                        {modelList.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label} — {m.id}
                          </option>
                        ))}
                      </select>
                    </>
                  );
                })()}
              </div>
            </div>
          </section>
        )}

        {section === 'behaviour' && (
          <section className="card">
            <h2 className="text-lg font-bold mb-4">{t('settings.behaviour.title')}</h2>
            <div className="space-y-4">
              <Row label={t('settings.behaviour.enabled')} hint={t('settings.behaviour.enabledHint')}>
                <Toggle checked={s.enabled} onChange={(v) => update('enabled', v)} />
              </Row>
              <Row label={t('settings.behaviour.ghost')} hint={t('settings.behaviour.ghostHint')}>
                <Toggle checked={s.ghostMode} onChange={(v) => update('ghostMode', v)} />
              </Row>
              <Row label={t('settings.behaviour.continue')} hint={t('settings.behaviour.continueHint')}>
                <Toggle checked={s.enableContinue} onChange={(v) => update('enableContinue', v)} />
              </Row>
              <Row label={t('settings.behaviour.selection')} hint={t('settings.behaviour.selectionHint')}>
                <Toggle checked={s.selectionTranslate} onChange={(v) => update('selectionTranslate', v)} />
              </Row>
              <Row label={t('settings.behaviour.reply')} hint={t('settings.behaviour.replyHint')}>
                <Toggle checked={s.enableReply} onChange={(v) => update('enableReply', v)} />
              </Row>
              <Row label={t('settings.behaviour.streaming')} hint={t('settings.behaviour.streamingHint')}>
                <Toggle checked={s.streaming} onChange={(v) => update('streaming', v)} />
              </Row>
              <Row
                label={t('settings.behaviour.debounce', { ms: s.debounceMs })}
                hint={t('settings.behaviour.debounceHint')}
              >
                <input
                  type="range"
                  min={150}
                  max={1000}
                  step={50}
                  value={s.debounceMs}
                  onChange={(e) => update('debounceMs', Number(e.target.value))}
                  className="w-40 accent-[#0a84ff]"
                />
              </Row>
              <Row
                label={t('settings.behaviour.ghostDebounce', { ms: s.ghostDebounceMs })}
                hint={t('settings.behaviour.ghostDebounceHint')}
              >
                <input
                  type="range"
                  min={200}
                  max={2000}
                  step={100}
                  value={s.ghostDebounceMs}
                  onChange={(e) => update('ghostDebounceMs', Number(e.target.value))}
                  className="w-40 accent-[#0a84ff]"
                />
              </Row>
            </div>
          </section>
        )}

        {section === 'sites' && (
          <section className="card">
            <h2 className="text-lg font-bold mb-2">{t('settings.sites.title')}</h2>
            <p className="field-hint mb-3">{t('settings.sites.hint')}</p>
            <textarea
              className="input font-mono text-xs"
              rows={8}
              value={s.disabledDomains.join('\n')}
              onChange={(e) =>
                update(
                  'disabledDomains',
                  e.target.value
                    .split('\n')
                    .map((d) => d.trim())
                    .filter(Boolean),
                )
              }
            />
          </section>
        )}

        {section === 'shortcuts' && (
          <section className="card">
            <h2 className="text-lg font-bold mb-4">{t('settings.shortcuts.title')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <Shortcut keys="Tab" desc={t('settings.shortcuts.accept')} />
              <Shortcut keys="Esc" desc={t('settings.shortcuts.dismiss')} />
              <Shortcut keys="Ctrl/⌘ + Shift + G" desc={t('settings.shortcuts.ghost')} />
              <Shortcut keys="Ctrl/⌘ + Shift + K" desc={t('settings.shortcuts.cycle')} />
              <Shortcut keys="Ctrl/⌘ + Shift + R" desc={t('settings.shortcuts.reply')} />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-semibold">{label}</div>
        {hint && <div className="field-hint">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Shortcut({ keys, desc }: { keys: string; desc: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: 'rgba(127,127,127,0.1)' }}>
      <span className="opacity-70">{desc}</span>
      <kbd className="text-xs font-semibold px-2 py-1 rounded-md" style={{ background: 'rgba(127,127,127,0.2)' }}>
        {keys}
      </kbd>
    </div>
  );
}
