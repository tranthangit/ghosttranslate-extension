// Tracks free-plan daily translation usage in chrome.storage.local.
// Resets automatically when the local calendar day changes.

export const FREE_DAILY_LIMIT = 100;
export const USAGE_KEY = 'gt:usage';

interface Usage {
  date: string; // YYYY-MM-DD (local)
  count: number;
  /** Epoch ms of the last counted translation (for burst throttling). */
  lastAt?: number;
}

/** A live-typing burst within this window counts as a single translation. */
const COUNT_THROTTLE_MS = 5000;

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function getUsageCount(): Promise<number> {
  try {
    const r = await chrome.storage.local.get(USAGE_KEY);
    const u = r[USAGE_KEY] as Usage | undefined;
    if (!u || u.date !== today()) return 0;
    return u.count;
  } catch {
    return 0;
  }
}

/**
 * Increment today's count (resetting on a new day). Returns the current count.
 * Rapid calls within COUNT_THROTTLE_MS (e.g. live typing) collapse into a
 * single increment so one editing burst costs ~1 translation.
 */
export async function incrementUsage(): Promise<number> {
  try {
    const r = await chrome.storage.local.get(USAGE_KEY);
    const u = r[USAGE_KEY] as Usage | undefined;
    const d = today();
    const now = Date.now();

    if (u && u.date === d) {
      if (u.lastAt && now - u.lastAt < COUNT_THROTTLE_MS) {
        // Within the burst window — don't double-count, just refresh nothing.
        return u.count;
      }
      const count = u.count + 1;
      await chrome.storage.local.set({ [USAGE_KEY]: { date: d, count, lastAt: now } });
      return count;
    }

    // New day (or first use today).
    await chrome.storage.local.set({ [USAGE_KEY]: { date: d, count: 1, lastAt: now } });
    return 1;
  } catch {
    return 0;
  }
}
