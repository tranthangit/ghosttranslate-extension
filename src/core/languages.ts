import type { LanguageCode, LanguageMeta, Tone, ModelOption } from '@/types';
import { DEFAULT_MODEL } from '@/config';

export const LANGUAGES: LanguageMeta[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { code: 'vi', label: 'Vietnamese', nativeLabel: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'zh', label: 'Chinese (Simplified)', nativeLabel: '简体中文', flag: '🇨🇳' },
  { code: 'zh-TW', label: 'Chinese (Traditional)', nativeLabel: '繁體中文', flag: '🇹🇼' },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: 'Korean', nativeLabel: '한국어', flag: '🇰🇷' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', label: 'Italian', nativeLabel: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português', flag: '🇵🇹' },
  { code: 'ru', label: 'Russian', nativeLabel: 'Русский', flag: '🇷🇺' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', flag: '🇸🇦' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', flag: '🇮🇳' },
  { code: 'th', label: 'Thai', nativeLabel: 'ไทย', flag: '🇹🇭' },
  { code: 'id', label: 'Indonesian', nativeLabel: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ms', label: 'Malay', nativeLabel: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'nl', label: 'Dutch', nativeLabel: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', label: 'Polish', nativeLabel: 'Polski', flag: '🇵🇱' },
  { code: 'tr', label: 'Turkish', nativeLabel: 'Türkçe', flag: '🇹🇷' },
  { code: 'uk', label: 'Ukrainian', nativeLabel: 'Українська', flag: '🇺🇦' },
  { code: 'fa', label: 'Persian', nativeLabel: 'فارسی', flag: '🇮🇷' },
  { code: 'he', label: 'Hebrew', nativeLabel: 'עברית', flag: '🇮🇱' },
  { code: 'sv', label: 'Swedish', nativeLabel: 'Svenska', flag: '🇸🇪' },
  { code: 'no', label: 'Norwegian', nativeLabel: 'Norsk', flag: '🇳🇴' },
  { code: 'da', label: 'Danish', nativeLabel: 'Dansk', flag: '🇩🇰' },
  { code: 'fi', label: 'Finnish', nativeLabel: 'Suomi', flag: '🇫🇮' },
  { code: 'cs', label: 'Czech', nativeLabel: 'Čeština', flag: '🇨🇿' },
  { code: 'ro', label: 'Romanian', nativeLabel: 'Română', flag: '🇷🇴' },
  { code: 'el', label: 'Greek', nativeLabel: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'hu', label: 'Hungarian', nativeLabel: 'Magyar', flag: '🇭🇺' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা', flag: '🇧🇩' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', flag: '🇮🇳' },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اردو', flag: '🇵🇰' },
  { code: 'fil', label: 'Filipino', nativeLabel: 'Filipino', flag: '🇵🇭' },
  { code: 'km', label: 'Khmer', nativeLabel: 'ខ្មែរ', flag: '🇰🇭' },
  { code: 'lo', label: 'Lao', nativeLabel: 'ລາວ', flag: '🇱🇦' },
  { code: 'my', label: 'Burmese', nativeLabel: 'မြန်မာ', flag: '🇲🇲' },
];

export const LANGUAGE_MAP: Record<LanguageCode, LanguageMeta> = Object.fromEntries(
  LANGUAGES.map((l) => [l.code, l]),
) as Record<LanguageCode, LanguageMeta>;

export function languageName(code: LanguageCode | string): string {
  const found = LANGUAGES.find((l) => l.code === code);
  return found ? found.label : String(code);
}

export const TONES: { value: Tone; label: string; emoji: string }[] = [
  { value: 'default', label: 'Default', emoji: '⚡' },
  { value: 'casual', label: 'Casual', emoji: '😎' },
  { value: 'friendly', label: 'Friendly', emoji: '🙂' },
  { value: 'professional', label: 'Professional', emoji: '💼' },
  { value: 'business', label: 'Business', emoji: '📈' },
  { value: 'academic', label: 'Academic', emoji: '🎓' },
  { value: 'native', label: 'Native Speaker', emoji: '🗣️' },
  { value: 'funny', label: 'Funny', emoji: '😂' },
  { value: 'polite', label: 'Polite', emoji: '🙏' },
];

/**
 * Fallback model list. The real, admin-managed model list is served by the
 * worker at runtime (appConfig.models); this is only used offline before that
 * loads. Kept generic so specific model ids aren't published in the source.
 */
export const MODELS: ModelOption[] = [{ id: DEFAULT_MODEL, label: 'Default model' }];

export function modelLabel(id: string): string {
  return MODELS.find((m) => m.id === id)?.label ?? id;
}
