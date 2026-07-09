// Per-device identifiers, stored in chrome.storage.local so they DON'T sync
// across devices — each browser/profile is its own "device" for license
// activation limits.

const DEVICE_KEY = 'gt:deviceId';
const ACTIVATION_KEY = 'gt:activationId';
const USAGE_ID_KEY = 'gt:usageId';

export async function getDeviceId(): Promise<string> {
  const r = await chrome.storage.local.get(DEVICE_KEY);
  let id = r[DEVICE_KEY] as string | undefined;
  if (!id) {
    id =
      (globalThis.crypto?.randomUUID?.() as string) ||
      `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    await chrome.storage.local.set({ [DEVICE_KEY]: id });
  }
  return id;
}

/**
 * Stable identifier used ONLY for free-tier usage counting. Stored in
 * chrome.storage.sync so it survives uninstall/reinstall (Chrome restores sync
 * data for the same extension id when the user is signed in), making the free
 * daily quota much harder to reset by reinstalling. Kept separate from
 * `deviceId` so Pro's per-device activation limit still treats each browser as
 * its own device.
 */
export async function getUsageId(): Promise<string> {
  try {
    const r = await chrome.storage.sync.get(USAGE_ID_KEY);
    let id = r[USAGE_ID_KEY] as string | undefined;
    if (!id) {
      id =
        (globalThis.crypto?.randomUUID?.() as string) ||
        `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      await chrome.storage.sync.set({ [USAGE_ID_KEY]: id });
    }
    return id;
  } catch {
    // Sync unavailable -> fall back to the local device id.
    return getDeviceId();
  }
}

export async function getActivationId(): Promise<string | null> {
  const r = await chrome.storage.local.get(ACTIVATION_KEY);
  return (r[ACTIVATION_KEY] as string | undefined) ?? null;
}

export async function setActivationId(id: string | null): Promise<void> {
  if (id) await chrome.storage.local.set({ [ACTIVATION_KEY]: id });
  else await chrome.storage.local.remove(ACTIVATION_KEY);
}

const SUPPRESS_KEY = 'gt:suppressActivate';

/** When true, auto-activation is paused (user deactivated this device). */
export async function getSuppressActivate(): Promise<boolean> {
  const r = await chrome.storage.local.get(SUPPRESS_KEY);
  return Boolean(r[SUPPRESS_KEY]);
}

export async function setSuppressActivate(on: boolean): Promise<void> {
  if (on) await chrome.storage.local.set({ [SUPPRESS_KEY]: true });
  else await chrome.storage.local.remove(SUPPRESS_KEY);
}

export const ACTIVATION_STORAGE_KEY = ACTIVATION_KEY;
