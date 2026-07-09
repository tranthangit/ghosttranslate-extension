import type { LanguageCode } from '@/types';

// ============================================================================
// Lightweight, dependency-free language detection.
//
// This is a heuristic detector based on Unicode script ranges and common
// stop-words. It is intentionally fast (runs on every keystroke before the
// debounce window) so it can decide *whether* to call the AI at all.
// The AI itself performs authoritative detection for ambiguous cases.
// ============================================================================

const SCRIPT_PATTERNS: { code: LanguageCode; re: RegExp }[] = [
  { code: 'ja', re: /[\u3040-\u309f\u30a0-\u30ff]/ }, // Hiragana / Katakana
  { code: 'ko', re: /[\uac00-\ud7af\u1100-\u11ff]/ }, // Hangul
  { code: 'zh', re: /[\u4e00-\u9fff]/ }, // CJK (after JP/KR checks)
  { code: 'ru', re: /[\u0400-\u04ff]/ }, // Cyrillic
  { code: 'ar', re: /[\u0600-\u06ff]/ }, // Arabic
  { code: 'hi', re: /[\u0900-\u097f]/ }, // Devanagari
  { code: 'th', re: /[\u0e00-\u0e7f]/ }, // Thai
];

// Vietnamese-specific diacritics.
const VIETNAMESE_RE =
  /[ăâđêôơưĂÂĐÊÔƠƯàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/i;

// Common stop-words by language for Latin-script disambiguation.
const STOPWORDS: Partial<Record<LanguageCode, RegExp>> = {
  en: /\b(the|and|you|with|that|this|have|for|are|your|please|hello|thanks)\b/i,
  fr: /\b(le|la|les|une|des|vous|avec|bonjour|merci|est|pour|dans)\b/i,
  es: /\b(el|los|las|una|usted|con|hola|gracias|por|para|que|está)\b/i,
  de: /\b(der|die|das|und|mit|ich|nicht|sie|guten|danke|bitte|ein)\b/i,
  it: /\b(il|lo|gli|una|con|ciao|grazie|per|che|sono|questo)\b/i,
  pt: /\b(os|as|uma|você|com|olá|obrigado|por|para|que|está|não)\b/i,
};

export interface DetectionResult {
  language: LanguageCode;
  confidence: number;
}

export function detectLanguage(text: string): DetectionResult {
  const sample = text.slice(0, 400).trim();
  if (!sample) return { language: 'en', confidence: 0 };

  // 1. Non-Latin scripts are highly reliable.
  for (const { code, re } of SCRIPT_PATTERNS) {
    if (re.test(sample)) return { language: code, confidence: 0.95 };
  }

  // 2. Vietnamese diacritics.
  if (VIETNAMESE_RE.test(sample)) return { language: 'vi', confidence: 0.9 };

  // 3. Latin stop-word scoring.
  let best: { code: LanguageCode; score: number } = { code: 'en', score: 0 };
  for (const code of Object.keys(STOPWORDS) as LanguageCode[]) {
    const matches = sample.match(STOPWORDS[code]!);
    const score = matches ? matches.length : 0;
    if (score > best.score) best = { code, score };
  }

  const wordCount = sample.split(/\s+/).filter(Boolean).length;
  const confidence = best.score === 0 ? 0.3 : Math.min(0.85, 0.4 + best.score / Math.max(wordCount, 1));
  return { language: best.code, confidence };
}

/**
 * Decide whether the text needs translation given the target language.
 * Returns false when the detected source already matches the target.
 */
export function needsTranslation(text: string, target: LanguageCode): boolean {
  const { language, confidence } = detectLanguage(text);
  if (confidence < 0.4) return true; // unsure -> let the AI decide
  return language !== target;
}
