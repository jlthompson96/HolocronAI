/** Per-persona generation settings. Undefined fields fall back to server defaults. */
export interface ModelSettings {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export const DEFAULT_MODEL = 'local-model';
export const DEFAULT_TEMPERATURE = 0.7;

/** Stats for the most recent streamed assistant response. */
export interface GenerationStats {
  /** Time to first token, in milliseconds */
  ttftMs: number;
  /** Completion tokens per second (measured from first token to end of stream) */
  tokensPerSec: number;
  /** Number of completion tokens */
  tokens: number;
  /** True when token count came from server `usage`, false when approximated */
  exactTokens: boolean;
  /** Model name reported by the server (or the one requested) */
  model: string;
}
