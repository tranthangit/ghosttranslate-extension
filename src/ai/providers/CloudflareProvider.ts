import {
  AIProvider,
  GenerateOptions,
  GenerateResult,
  ProviderError,
} from './ProviderInterface';
import { APP_TOKEN } from '@/config';

export interface CloudflareConfig {
  /**
   * URL of a Cloudflare Worker that proxies Workers AI.
   * The worker receives { model, messages, stream, max_tokens, temperature }
   * and forwards to env.AI.run(model, ...).
   */
  endpoint: string;
  /** Optional bearer token validated by the worker. */
  token?: string;
  /** Per-device activation id (for license device limits). */
  activationId?: string | null;
  /** Stable per-device id, used to count free-tier usage server-side. */
  deviceId?: string | null;
}

/**
 * Talks to Cloudflare Workers AI through a user-deployed Worker proxy.
 *
 * We deliberately route through a Worker (instead of calling the Cloudflare
 * REST API directly) so the account id and API token are never shipped inside
 * the extension bundle. A reference worker is provided in `worker/worker.js`.
 *
 * Streaming uses Server-Sent Events. Both the native Workers AI SSE shape
 * (`data: {"response":"..."}`) and the OpenAI-compatible shape
 * (`data: {"choices":[{"delta":{"content":"..."}}]}`) are supported.
 */
export class CloudflareProvider implements AIProvider {
  readonly name = 'cloudflare';

  constructor(private config: CloudflareConfig) {}

  updateConfig(config: Partial<CloudflareConfig>) {
    this.config = { ...this.config, ...config };
  }

  isConfigured(): boolean {
    return Boolean(this.config.endpoint && /^https?:\/\//.test(this.config.endpoint));
  }

  /** Build the auth/identity headers shared by all worker calls. */
  private authHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (APP_TOKEN) headers['X-GT-App'] = APP_TOKEN;
    if (this.config.token && this.config.activationId) {
      headers['Authorization'] = `Bearer ${this.config.token}`;
      headers['X-Activation-Id'] = this.config.activationId;
    } else if (this.config.deviceId) {
      headers['X-Device-Id'] = this.config.deviceId;
    }
    return headers;
  }

  /** Machine translation via Azure Translator (proxied by the worker). */
  async translate(
    text: string,
    to: string,
    from: string | undefined,
    signal: AbortSignal,
  ): Promise<string> {
    if (!this.isConfigured()) throw new ProviderError('Worker URL is not configured.');
    let res: Response;
    try {
      res = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify({ translator: true, text, to, from: from ?? 'auto' }),
        signal,
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      throw new ProviderError(`Network error reaching the worker: ${(err as Error).message}`);
    }
    if (!res.ok) {
      const detail = await safeText(res);
      throw new ProviderError(`Translator responded ${res.status}: ${detail}`, res.status);
    }
    const data = await res.json();
    if (data?.ok === false) throw new ProviderError(data.error || 'Translation failed');
    return String(data?.text ?? '');
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    if (!this.isConfigured()) {
      throw new ProviderError(
        'GhostTranslate is not configured. Open settings and set your Cloudflare Worker URL.',
      );
    }

    const streaming = Boolean(options.onChunk);
    const headers = this.authHeaders();

    const body = JSON.stringify({
      model: options.model,
      messages: options.messages,
      stream: streaming,
      max_tokens: options.maxTokens ?? 512,
      temperature: options.temperature ?? 0.3,
    });

    let res: Response;
    try {
      res = await fetch(this.config.endpoint, {
        method: 'POST',
        headers,
        body,
        signal: options.signal,
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      throw new ProviderError(`Network error reaching the worker: ${(err as Error).message}`);
    }

    if (!res.ok) {
      const detail = await safeText(res);
      throw new ProviderError(
        `Worker responded ${res.status}: ${detail || res.statusText}`,
        res.status,
      );
    }

    if (streaming && res.body) {
      return this.consumeStream(res, options.onChunk!, options.signal);
    }

    // Non-streaming JSON response.
    const data = await res.json();
    return { text: extractText(data) };
  }

  private async consumeStream(
    res: Response,
    onChunk: (delta: string) => void,
    signal: AbortSignal,
  ): Promise<GenerateResult> {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';

    try {
      while (true) {
        if (signal.aborted) {
          await reader.cancel();
          throw new DOMException('Aborted', 'AbortError');
        }
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const json = JSON.parse(payload);
            const delta = extractDelta(json);
            if (delta) {
              full += delta;
              onChunk(delta);
            }
          } catch {
            // Partial JSON across chunk boundaries; ignore until complete.
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return { text: full };
  }
}

function extractDelta(json: any): string {
  // Cloudflare native streaming: { response: "..." }
  if (typeof json.response === 'string') return json.response;
  // OpenAI-compatible: { choices: [{ delta: { content } }] }
  const choice = json.choices?.[0];
  if (choice?.delta?.content) return choice.delta.content;
  if (typeof choice?.text === 'string') return choice.text;
  // OpenAI Responses streaming (gpt-oss): surface only the answer text, not
  // the reasoning trace. { type: 'response.output_text.delta', delta: '...' }
  if (typeof json.type === 'string' && typeof json.delta === 'string') {
    return json.type.includes('output_text') ? json.delta : '';
  }
  return '';
}

function extractText(json: any): string {
  // Cloudflare REST: { result: { response: "..." } }
  if (json?.result?.response) return String(json.result.response).trim();
  if (typeof json?.response === 'string') return json.response.trim();
  // OpenAI-compatible: { choices: [{ message: { content } }] }
  const choice = json?.choices?.[0];
  if (choice?.message?.content) return String(choice.message.content).trim();
  if (typeof choice?.text === 'string') return choice.text.trim();
  // OpenAI Responses API (gpt-oss): { output: [{ type:'message',
  // content:[{ type:'output_text', text }] }, { type:'reasoning', ... }] }.
  if (typeof json?.output_text === 'string') return json.output_text.trim();
  if (Array.isArray(json?.output)) {
    const msg = json.output.find((o: any) => o?.type === 'message') ?? json.output[json.output.length - 1];
    const part = msg?.content?.find?.((c: any) => typeof c?.text === 'string');
    if (part?.text) return String(part.text).trim();
  }
  if (typeof json === 'string') return json.trim();
  return '';
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return '';
  }
}
