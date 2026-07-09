// ============================================================================
// Build-time configuration.
//
// The real backend endpoint and default model are injected at build time from
// environment variables (see .env.local, which is git-ignored) so they don't
// appear in the public source. Copy .env.example to .env.local and fill in your
// own values. Note: whatever the extension calls is still visible in the
// shipped bundle / network tab — env only keeps it out of the source repo.
// ============================================================================

/** URL of the Cloudflare Worker that proxies Workers AI. */
export const WORKER_ENDPOINT =
  (import.meta.env.VITE_WORKER_ENDPOINT as string | undefined) || 'https://api.example.com';

/**
 * Optional shared token sent as `X-GT-App` so the worker can reject calls that
 * don't come from this build. Leave empty to rely on the Origin check alone.
 */
export const APP_TOKEN = (import.meta.env.VITE_APP_TOKEN as string | undefined) || '';

/** Default AI model id (the worker may override this server-side). */
export const DEFAULT_MODEL =
  (import.meta.env.VITE_DEFAULT_MODEL as string | undefined) || 'default';

/** Where users buy / manage their subscription. */
export const PRICING_URL = 'https://ghosttranslate.xyz/#pricing';
