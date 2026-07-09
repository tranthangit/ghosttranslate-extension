// ============================================================================
// GhostTranslate - Shared Type Definitions
// ============================================================================
import { DEFAULT_MODEL } from '@/config';

/** The kind of AI operation requested. */
export type AIAction = 'translate' | 'rewrite' | 'continue' | 'detect' | 'reply';

/** How long/detailed an AI-drafted reply should be. */
export type ReplyLength = 'short' | 'medium' | 'long';

/**
 * Translation engine:
 *  - 'ai'     : LLM only (context + tone aware).
 *  - 'azure'  : Azure Translator only (fast, faithful, literal).
 *  - 'hybrid' : Azure translates, then the LLM polishes the wording/tone.
 */
export type TranslateEngine = 'ai' | 'azure' | 'hybrid';

/** Writing tone presets exposed in the toolbar. */
export type Tone =
  | 'default'
  | 'casual'
  | 'friendly'
  | 'professional'
  | 'business'
  | 'academic'
  | 'native'
  | 'funny'
  | 'polite';

/** Supported target languages. `auto` only valid as a source notion. */
export type LanguageCode =
  | 'en'
  | 'vi'
  | 'zh'
  | 'zh-TW'
  | 'ja'
  | 'ko'
  | 'fr'
  | 'es'
  | 'de'
  | 'it'
  | 'pt'
  | 'ru'
  | 'ar'
  | 'hi'
  | 'th'
  | 'id'
  | 'ms'
  | 'nl'
  | 'pl'
  | 'tr'
  | 'uk'
  | 'fa'
  | 'he'
  | 'sv'
  | 'no'
  | 'da'
  | 'fi'
  | 'cs'
  | 'ro'
  | 'el'
  | 'hu'
  | 'bn'
  | 'ta'
  | 'te'
  | 'ur'
  | 'fil'
  | 'km'
  | 'lo'
  | 'my';

export type LanguageMeta = {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  flag: string;
};

/** Language of the extension's own interface. */
export type UILanguage = 'en' | 'vi';

/** An AI model option. */
export interface ModelOption {
  /** The backend model id. */
  id: string;
  /** Friendly label shown in the UI. */
  label: string;
}

/**
 * Global app config served by the worker (admin-controlled): the model list,
 * the default model, and whether users may pick their own model.
 */
export interface AppConfig {
  models: ModelOption[];
  defaultModel: string;
  allowUserModelSelection: boolean;
  /** Which engine (ai/azure/hybrid) each feature uses (admin-controlled). */
  engines?: { typing: 'ai' | 'azure' | 'hybrid'; selection: 'ai' | 'azure' | 'hybrid' };
  /** Free-plan daily translation cap (admin-controlled; 0 = unlimited). */
  freeDailyLimit?: number;
}

/** Persisted user settings. */
export interface Settings {
  enabled: boolean;
  ghostMode: boolean;
  /** 'auto' means detect source automatically. */
  targetLanguage: LanguageCode;
  /** Target language for selection-translate (highlighting text on a page). */
  selectionTargetLanguage: LanguageCode;
  tone: Tone;
  model: string;
  /** Subscription license key sent to the worker for authentication. */
  licenseKey: string;
  debounceMs: number;
  /** Debounce (ms) used while Ghost Mode is active. */
  ghostDebounceMs: number;
  streaming: boolean;
  /** Language of the extension's own UI. */
  uiLanguage: UILanguage;
  enableContinue: boolean;
  /** Show the translate popup when the user selects text on the page. */
  selectionTranslate: boolean;
  /** Show the "AI Reply" button and enable its shortcut. */
  enableReply: boolean;
  /** Default length/style for AI-drafted replies. */
  replyLength: ReplyLength;
  /** Collapse the toolbar into a small pill. */
  toolbarCollapsed: boolean;
  /** Domains where the extension is disabled. */
  disabledDomains: string[];
  theme: 'system' | 'light' | 'dark';
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  ghostMode: false,
  targetLanguage: 'en',
  selectionTargetLanguage: 'vi',
  tone: 'default',
  model: DEFAULT_MODEL,
  licenseKey: '',
  debounceMs: 300,
  ghostDebounceMs: 500,
  streaming: true,
  uiLanguage: 'en',
  enableContinue: false,
  selectionTranslate: true,
  enableReply: true,
  replyLength: 'long',
  toolbarCollapsed: false,
  disabledDomains: [],
  theme: 'system',
};

// ----------------------------------------------------------------------------
// Messaging contracts (content <-> background)
// ----------------------------------------------------------------------------

export interface AIRequestPayload {
  requestId: string;
  action: AIAction;
  text: string;
  /** Surrounding context for `continue`. */
  context?: string;
  /** Translation engine for the `translate` action. */
  engine?: 'ai' | 'azure' | 'hybrid';
  /** Extra free-text instruction (e.g. "make it warmer") for `reply`. */
  instruction?: string;
  /** Desired length/detail for `reply`. */
  replyLength?: ReplyLength;
  /** Language to write a `reply` in. 'auto' = same language as the message. */
  replyLanguage?: LanguageCode | 'auto';
  tone: Tone;
  targetLanguage: LanguageCode;
  sourceLanguage?: LanguageCode | 'auto';
  model: string;
  streaming: boolean;
}

export type StreamMessage =
  | { type: 'chunk'; requestId: string; delta: string }
  | { type: 'done'; requestId: string; text: string; detectedLanguage?: string }
  | { type: 'error'; requestId: string; error: string };

/** Port name used for streaming AI responses. */
export const AI_PORT = 'ghosttranslate-stream';

/** One-shot runtime messages. */
export type RuntimeMessage =
  | { type: 'GET_SETTINGS' }
  | { type: 'SET_SETTINGS'; settings: Partial<Settings> }
  | { type: 'SETTINGS_UPDATED'; settings: Settings }
  | { type: 'COMMAND'; command: 'toggle-ghost-mode' | 'cycle-target-language' | 'open-ai-reply' }
  | { type: 'CANCEL_REQUEST'; requestId: string }
  | { type: 'OPEN_OPTIONS' }
  | { type: 'OPEN_SIDE_PANEL' }
  | { type: 'TTS'; text: string; lang: string };
