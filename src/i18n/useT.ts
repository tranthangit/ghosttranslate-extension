import { useCallback } from 'react';
import { useStore } from '@/content/useStore';
import { t as translate, type MessageKey } from '@/i18n/messages';

/**
 * Returns a `t(key, params?)` function bound to the current UI language from
 * the store, so content components re-render when the language changes.
 */
export function useT() {
  const lang = useStore((s) => s.settings.uiLanguage);
  return useCallback(
    (key: MessageKey, params?: Record<string, string | number>) => translate(lang, key, params),
    [lang],
  );
}
