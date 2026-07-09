import { AI_PORT, type AIRequestPayload, type StreamMessage } from '@/types';

export interface RequestHandlers {
  onChunk?: (delta: string, full: string) => void;
  onDone?: (text: string) => void;
  onError?: (error: string) => void;
}

/**
 * Content-side client for the background AIService. Maintains a single
 * long-lived Port for streaming and guarantees that only the newest request's
 * results are delivered — older requests are cancelled and their late messages
 * are dropped.
 */
export class AIClient {
  private port: chrome.runtime.Port | null = null;
  private handlers = new Map<string, RequestHandlers>();
  private accumulated = new Map<string, string>();
  /** Only this request id is allowed to surface results to the UI. */
  private latestId: string | null = null;

  private ensurePort(): chrome.runtime.Port {
    if (this.port) return this.port;
    const port = chrome.runtime.connect({ name: AI_PORT });
    port.onMessage.addListener((msg: StreamMessage) => this.handle(msg));
    port.onDisconnect.addListener(() => {
      this.port = null;
    });
    this.port = port;
    return port;
  }

  private handle(msg: StreamMessage) {
    // Drop anything that isn't the most recent request.
    if (msg.requestId !== this.latestId) return;
    const h = this.handlers.get(msg.requestId);
    if (!h) return;

    switch (msg.type) {
      case 'chunk': {
        const full = (this.accumulated.get(msg.requestId) ?? '') + msg.delta;
        this.accumulated.set(msg.requestId, full);
        h.onChunk?.(msg.delta, full);
        break;
      }
      case 'done': {
        h.onDone?.(msg.text || this.accumulated.get(msg.requestId) || '');
        this.cleanup(msg.requestId);
        break;
      }
      case 'error': {
        h.onError?.(msg.error);
        this.cleanup(msg.requestId);
        break;
      }
    }
  }

  private cleanup(id: string) {
    this.handlers.delete(id);
    this.accumulated.delete(id);
  }

  /** Send a request, superseding any previous one. */
  send(payload: AIRequestPayload, handlers: RequestHandlers) {
    // Cancel the previous in-flight request.
    if (this.latestId && this.latestId !== payload.requestId) {
      this.cancel(this.latestId);
    }
    this.latestId = payload.requestId;
    this.handlers.set(payload.requestId, handlers);
    this.accumulated.set(payload.requestId, '');
    this.ensurePort().postMessage({ type: 'run', payload });
  }

  cancel(requestId: string) {
    this.cleanup(requestId);
    if (this.latestId === requestId) this.latestId = null;
    this.port?.postMessage({ type: 'cancel', requestId });
  }

  /** Cancel whatever is currently latest. */
  cancelCurrent() {
    if (this.latestId) this.cancel(this.latestId);
  }

  disconnect() {
    this.port?.disconnect();
    this.port = null;
    this.handlers.clear();
    this.accumulated.clear();
    this.latestId = null;
  }
}
