import type { Message } from '../types/chat';

export type PreferenceSentiment = 'liked' | 'disliked';

export interface StyleNote {
  /** msgKey of the reacted-to message — used to remove the note when the reaction is removed */
  key: string;
  reactionId: string;
  sentiment: PreferenceSentiment;
  /** Short description of the response (characteristics + excerpt) */
  summary: string;
  savedAt: string;
}

export const MAX_NOTES_PER_PERSONA = 6;
const EXCERPT_LENGTH = 120;

/** Marker that starts the learned-preferences section of the system prompt. */
export const PREFERENCES_HEADER = 'User preferences learned from feedback:';
const PREFERENCES_DELIMITER = `\n\n${PREFERENCES_HEADER}`;

const NEGATIVE_REACTIONS = new Set(['dark-side']);

export function sentimentFor(reactionId: string): PreferenceSentiment {
  return NEGATIVE_REACTIONS.has(reactionId) ? 'disliked' : 'liked';
}

/** Strip markdown noise and collapse whitespace into a single-line excerpt. */
function toExcerpt(content: string): string {
  const plain = content
    .replace(/```[\s\S]*?```/g, ' [code] ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_~]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > EXCERPT_LENGTH ? `${plain.slice(0, EXCERPT_LENGTH - 1).trimEnd()}…` : plain;
}

/** A few cheap, observable traits of a response (length, structure). */
function describeTraits(content: string): string[] {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const traits: string[] = [words < 60 ? 'short' : words < 200 ? 'medium-length' : 'long'];
  if (/^\s{0,3}([-*+]|\d+\.)\s+/m.test(content)) traits.push('uses lists');
  if (/```/.test(content)) traits.push('includes code');
  if (/^\s{0,3}#{1,6}\s+/m.test(content)) traits.push('uses headings');
  return traits;
}

export function buildStyleNote(key: string, reactionId: string, content: string): StyleNote {
  return {
    key,
    reactionId,
    sentiment: sentimentFor(reactionId),
    summary: `(${describeTraits(content).join(', ')}) "${toExcerpt(content)}"`,
    savedAt: new Date().toISOString(),
  };
}

/** Compact prompt section describing the learned preferences, or '' if none. */
export function formatPreferencesSection(notes: StyleNote[]): string {
  if (notes.length === 0) return '';
  const lines = notes.map((n) =>
    n.sentiment === 'liked'
      ? `- The user liked responses like: ${n.summary}`
      : `- The user disliked responses like: ${n.summary}`,
  );
  return `${PREFERENCES_DELIMITER}\n${lines.join('\n')}\nLean toward what the user liked and away from what they disliked, while staying in character.`;
}

/**
 * Returns the history with the leading system message's preferences section
 * replaced by `section` (removed when empty). Other messages are untouched.
 */
export function applyPreferencesSection(history: Message[], section: string): Message[] {
  const first = history[0];
  if (!first || first.role !== 'system') return history;
  const idx = first.content.indexOf(PREFERENCES_DELIMITER);
  const base = idx === -1 ? first.content : first.content.slice(0, idx);
  const content = base + section;
  if (content === first.content) return history;
  return [{ ...first, content }, ...history.slice(1)];
}
