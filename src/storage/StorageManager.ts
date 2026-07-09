import { DEFAULT_SETTINGS, type Settings } from '@/types';

const KEY = 'ghosttranslate:settings';

/**
 * Thin wrapper around chrome.storage.sync with an in-memory cache and a
 * change-subscription API. Works in any extension context (background,
 * content, options page).
 */
export class StorageManager {
  private cache: Settings | null = null;
  private listeners = new Set<(s: Settings) => void>();

  constructor() {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync' || !changes[KEY]) return;
      const next = { ...DEFAULT_SETTINGS, ...(changes[KEY].newValue ?? {}) } as Settings;
      this.cache = next;
      this.listeners.forEach((fn) => fn(next));
    });
  }

  async get(): Promise<Settings> {
    if (this.cache) return this.cache;
    const stored = await chrome.storage.sync.get(KEY);
    const next: Settings = { ...DEFAULT_SETTINGS, ...(stored[KEY] ?? {}) };
    this.cache = next;
    return next;
  }

  async set(partial: Partial<Settings>): Promise<Settings> {
    const current = await this.get();
    const next = { ...current, ...partial };
    this.cache = next;
    await chrome.storage.sync.set({ [KEY]: next });
    return next;
  }

  /** Subscribe to settings changes. Returns an unsubscribe function. */
  subscribe(fn: (s: Settings) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const storage = new StorageManager();
