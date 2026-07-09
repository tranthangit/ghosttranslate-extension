import type { AIRequestPayload, Settings, StreamMessage } from '@/types';
import { buildMessages, buildPolishMessages, stripModelFraming } from '@/ai/prompts';
import { CloudflareProvider } from '@/ai/providers/CloudflareProvider';
import { AIProvider, ProviderError } from '@/ai/providers/ProviderInterface';
import { WORKER_ENDPOINT } from '@/config';

/** Whitespace/zero-width normalised key for comparing source vs. result. */
function normalizeForCompare(s: string): string {
  return (s ?? '').replace(/[\u00a0\u200b]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Output token cap per request. It's an upper LIMIT, not a target — the model
 * stops at end-of-text on its own, so a generous cap doesn't slow short
 * translations. We scale it to the input length so long messages/emails aren't
 * truncated, with a hard ceiling to keep latency and cost bounded.
 */
function maxTokensFor(payload: AIRequestPayload): number {
  switch (payload.action) {
    case 'continue':
      return 80;
    case 'detect':
      return 16;
    case 'reply':
      return payload.replyLength === 'long' ? 1200 : payload.replyLength === 'short' ? 400 : 800;
    default: {
      // translate / rewrite: a translation is roughly as long as its source.
      // ~1 token per 3 chars; give 3x headroom for verbose target languages.
      const approxInputTokens = Math.ceil((payload.text?.length ?? 0) / 3);
      return Math.min(4096, Math.max(512, approxInputTokens * 3));
    }
  }
}

/**
 * AIService lives in the background service worker. It owns the provider
 * instances and tracks in-flight requests so they can be cancelled the moment
 * a newer request arrives or the user keeps typing.
 */
export class AIService {
  private cloudflare: CloudflareProvider;
  private providers: Map<string, AIProvider>;
  private inflight = new Map<string, AbortController>();

  constructor(settings: Settings) {
    this.cloudflare = new CloudflareProvider({
      endpoint: WORKER_ENDPOINT,
      token: settings.licenseKey,
    });
    this.providers = new Map([['cloudflare', this.cloudflare]]);
  }

  updateSettings(settings: Settings) {
    this.cloudflare.updateConfig({
      endpoint: WORKER_ENDPOINT,
      token: settings.licenseKey,
    });
  }

  /** Set the per-device activation id sent with each request. */
  setActivationId(id: string | null) {
    this.cloudflare.updateConfig({ activationId: id });
  }

  /** Set the stable device id used for free-tier usage counting. */
  setDeviceId(id: string | null) {
    this.cloudflare.updateConfig({ deviceId: id });
  }

  private get active(): AIProvider {
    // Single provider today; chosen here so adding more is a one-liner.
    return this.providers.get('cloudflare')!;
  }

  isConfigured(): boolean {
    return this.active.isConfigured();
  }

  /** Cancel a specific in-flight request. */
  cancel(requestId: string) {
    const ctrl = this.inflight.get(requestId);
    if (ctrl) {
      ctrl.abort();
      this.inflight.delete(requestId);
    }
  }

  /** Cancel everything currently running. */
  cancelAll() {
    for (const ctrl of this.inflight.values()) ctrl.abort();
    this.inflight.clear();
  }

  /**
   * Run a request, emitting stream events through `emit`. Resolves when the
   * request fully completes (or rejects on abort/error, already reported).
   */
  async run(payload: AIRequestPayload, emit: (msg: StreamMessage) => void): Promise<void> {
    // A new request supersedes any previous one with the same id.
    this.cancel(payload.requestId);

    const controller = new AbortController();
    this.inflight.set(payload.requestId, controller);

    // Hybrid / Azure translate: get a fast, faithful base translation from
    // Azure Translator first. 'azure' returns it as-is; 'hybrid' then polishes
    // it with the LLM. Falls back to LLM-only translation if Azure fails.
    let messages = buildMessages(payload);
    let azureBase = '';
    if (payload.action === 'translate' && payload.engine && payload.engine !== 'ai') {
      let base = '';
      try {
        base = await this.cloudflare.translate(
          payload.text,
          payload.targetLanguage,
          payload.sourceLanguage ?? 'auto',
          controller.signal,
        );
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          this.inflight.delete(payload.requestId);
          return;
        }
        base = '';
      }
      if (base && base.trim()) {
        azureBase = base.trim();
        if (payload.engine === 'azure') {
          const out = base.trim();
          // Azure returns the whole translation at once. Reveal it word-by-word
          // so it gets the same nice streaming effect as the AI engine.
          if (payload.streaming) {
            const tokens = out.match(/\S+\s*/g) ?? [out];
            for (const tok of tokens) {
              if (controller.signal.aborted) {
                this.inflight.delete(payload.requestId);
                return;
              }
              emit({ type: 'chunk', requestId: payload.requestId, delta: tok });
              await new Promise((r) => setTimeout(r, 18));
            }
          }
          emit({ type: 'done', requestId: payload.requestId, text: out });
          this.inflight.delete(payload.requestId);
          return;
        }
        messages = buildPolishMessages(payload, base); // hybrid
      }
      // else: Azure failed -> keep the LLM-only translate messages.
    }

    const maxTokens = maxTokensFor(payload);

    try {
      const result = await this.active.generate({
        model: payload.model,
        messages,
        signal: controller.signal,
        maxTokens,
        // Lower temperature = more faithful, deterministic translations.
        // Rewrite/reply get more freedom; translate stays tight.
        temperature:
          payload.action === 'rewrite'
            ? 0.5
            : payload.action === 'translate'
              ? 0.2
              : payload.action === 'reply'
                ? 0.6
                : 0.3,
        onChunk: payload.streaming
          ? (delta) => emit({ type: 'chunk', requestId: payload.requestId, delta })
          : undefined,
      });

      let cleaned =
        payload.action === 'detect' ? result.text.trim() : stripModelFraming(result.text);

      // Echo rescue: small/quantised models sometimes return short text (titles,
      // headings) unchanged instead of translating it; some newer models return
      // an empty/unparseable shape. If a pure-AI translation comes back empty or
      // identical to the source, fall back to Azure machine translation so the
      // user never sees nothing (or the original language untranslated).
      if (
        payload.action === 'translate' &&
        (!payload.engine || payload.engine === 'ai') &&
        (!cleaned.trim() || normalizeForCompare(cleaned) === normalizeForCompare(payload.text))
      ) {
        try {
          const rescue = await this.cloudflare.translate(
            payload.text,
            payload.targetLanguage,
            payload.sourceLanguage ?? 'auto',
            controller.signal,
          );
          if (rescue && rescue.trim() && normalizeForCompare(rescue) !== normalizeForCompare(payload.text)) {
            cleaned = rescue.trim();
          }
        } catch {
          /* Azure unavailable -> keep the AI result as-is. */
        }
      }

      emit({ type: 'done', requestId: payload.requestId, text: cleaned });
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        // Silent: superseded or user-cancelled.
        return;
      }
      // Resilience: for translation, never leave the user empty-handed if the
      // chosen model is unavailable/invalid (e.g. a bad model id) — fall back to
      // Azure machine translation before surfacing an error.
      if (payload.action === 'translate' && !controller.signal.aborted) {
        if (azureBase && azureBase.trim()) {
          emit({ type: 'done', requestId: payload.requestId, text: azureBase.trim() });
          return;
        }
        try {
          const rescue = await this.cloudflare.translate(
            payload.text,
            payload.targetLanguage,
            payload.sourceLanguage ?? 'auto',
            controller.signal,
          );
          if (rescue && rescue.trim()) {
            emit({ type: 'done', requestId: payload.requestId, text: rescue.trim() });
            return;
          }
        } catch {
          /* Azure unavailable too -> fall through to the error below. */
        }
      }
      const message =
        err instanceof ProviderError ? err.message : (err as Error).message || 'Unknown error';
      emit({ type: 'error', requestId: payload.requestId, error: message });
    } finally {
      this.inflight.delete(payload.requestId);
    }
  }
}
