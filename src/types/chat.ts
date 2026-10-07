export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  /** Present only on assistant messages produced by /image commands */
  imageStatus?: 'loading' | 'done' | 'error';
  imageUrl?: string;
  imagePrompt?: string;
}

export interface ChatError {
  message: string;
}

export interface Persona {
  id: string;
  name: string;
  avatar: string;
  description: string;
  color: string;
  systemPrompt: string;
  /** Optional per-persona model settings (undefined = server default) */
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface FactionTheme {
  id: string;
  name: string;
  icon: string;
  description: string;
  accent: string;
}

export interface ArchivedSession {
  id: string;
  title: string;
  personaId: string;
  savedAt: string; // ISO 8601
  messages: Message[];
}

export interface Reaction {
  id: string;
  symbol: string;
  label: string;
  title: string;
}
