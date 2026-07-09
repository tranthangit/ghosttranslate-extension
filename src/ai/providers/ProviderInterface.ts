import type { ChatMessage } from '@/ai/prompts';

export interface GenerateOptions {
  model: string;
  messages: ChatMessage[];
  signal: AbortSignal;
  /** Called for each streamed token delta. */
  onChunk?: (delta: string) => void;
  maxTokens?: number;
  temperature?: number;
}

export interface GenerateResult {
  text: string;
}

/**
 * Provider abstraction. Adding a new backend (OpenAI, Anthropic, local, ...)
 * only requires implementing this interface and registering it in AIService.
 */
export interface AIProvider {
  readonly name: string;
  /** Whether this provider is configured and ready to use. */
  isConfigured(): boolean;
  generate(options: GenerateOptions): Promise<GenerateResult>;
}

export class ProviderError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'ProviderError';
  }
}
