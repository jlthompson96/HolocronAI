import type { MissionStats } from '../constants/missions';

export interface ParsedGmReply {
  /** Narrative with the state block and trailing choice list removed */
  narrative: string;
  choices: string[];
  /** Merged stats, or null when no valid state block was found */
  stats: MissionStats | null;
}

// <state>{...}</state>  or  ```state {...} ```  (closing tag/fence optional while streaming)
const STATE_TAG_RE = /<state>\s*([\s\S]*?)\s*(?:<\/state>|$)/i;
const STATE_FENCE_RE = /```\s*state\s*\n?([\s\S]*?)(?:```|$)/i;

/** Index where a (possibly partial) state block begins, or -1. */
function findStateStart(text: string): number {
  const candidates = [
    text.search(/<state>/i),
    text.search(/```\s*state\b/i),
  ].filter((i) => i >= 0);
  if (candidates.length > 0) return Math.min(...candidates);
  // Hide a partially-streamed opening token at the very end, e.g. "<sta" or "```st"
  const partial = text.match(/(<s?t?a?t?e?|`{1,3}\s*s?t?a?t?e?)$/i);
  if (partial && partial[0].length > 0 && (partial[0].startsWith('<') || partial[0].startsWith('`'))) {
    return text.length - partial[0].length;
  }
  return -1;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function toNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}

/** Merge a raw JSON object from the GM onto the previous stats, ignoring anything malformed. */
export function mergeStats(prev: MissionStats, raw: unknown): MissionStats {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return prev;
  const r = raw as Record<string, unknown>;
  const next: MissionStats = { ...prev, inventory: [...prev.inventory] };

  const health = toNumber(r.health ?? r.hp);
  if (health !== undefined) next.health = clamp(Math.round(health), 0, 100);

  const credits = toNumber(r.credits);
  if (credits !== undefined) next.credits = Math.max(0, Math.round(credits));

  const inv = r.inventory ?? r.items;
  if (Array.isArray(inv)) {
    next.inventory = inv.filter((i): i is string | number => typeof i === 'string' || typeof i === 'number')
      .map((i) => String(i).trim())
      .filter(Boolean)
      .slice(0, 30);
  }

  if (typeof r.objective === 'string' && r.objective.trim()) next.objective = r.objective.trim();

  const status = typeof r.status === 'string' ? r.status.toLowerCase() : '';
  if (status === 'victory' || status === 'won' || status === 'win' || status === 'success') next.status = 'victory';
  else if (status === 'defeat' || status === 'dead' || status === 'lost' || status === 'game_over' || status === 'gameover') next.status = 'defeat';
  else if (status === 'active') next.status = 'active';

  if (next.health <= 0 && next.status === 'active') next.status = 'defeat';
  return next;
}

function tryParseJson(body: string): unknown {
  const trimmed = body.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Common model slips: trailing commas, single quotes, extra text around the object
    const objMatch = trimmed.match(/\{[\s\S]*\}/);
    if (!objMatch) return null;
    try {
      return JSON.parse(objMatch[0].replace(/,\s*([}\]])/g, '$1'));
    } catch {
      try {
        return JSON.parse(objMatch[0].replace(/,\s*([}\]])/g, '$1').replace(/'/g, '"'));
      } catch {
        return null;
      }
    }
  }
}

/** Extract the trailing numbered list ("1. Do X") as choices and return the text without it. */
function extractChoices(text: string): { body: string; choices: string[] } {
  const lines = text.replace(/\s+$/, '').split('\n');
  const choices: string[] = [];
  let i = lines.length - 1;
  // Skip trailing blank lines
  while (i >= 0 && !lines[i].trim()) i--;
  while (i >= 0) {
    const m = lines[i].match(/^\s*(?:\*\*)?\(?(\d{1,2})[.)]\)?(?:\*\*)?\s+(.+?)\s*$/);
    if (!m) break;
    choices.unshift(m[2].replace(/^\*\*|\*\*$/g, '').trim());
    i--;
    while (i >= 0 && !lines[i].trim()) i--;
  }
  if (choices.length < 2) return { body: text.trim(), choices: [] };
  // Drop a lead-in line like "What do you do?" only if it's clearly a prompt? Keep it — it reads well.
  return { body: lines.slice(0, i + 1).join('\n').trim(), choices };
}

/**
 * Parse a GM reply. Works on partial (streaming) text: any started state block is hidden.
 * Malformed state blocks yield stats: null so callers keep the previous state.
 */
export function parseGmReply(raw: string, prev: MissionStats): ParsedGmReply {
  const start = findStateStart(raw);
  let stateBody: string | null = null;
  let visible = raw;

  if (start >= 0) {
    const tail = raw.slice(start);
    const m = tail.match(STATE_TAG_RE) ?? tail.match(STATE_FENCE_RE);
    stateBody = m ? m[1] : null;
    // Anything after the closed block is kept (rare), the block itself is removed
    const closeTag = tail.search(/<\/state>/i);
    let after = '';
    if (closeTag >= 0) after = tail.slice(closeTag + 8);
    else {
      const fenceClose = tail.slice(3).search(/```/);
      if (/^```/.test(tail) && fenceClose >= 0) after = tail.slice(fenceClose + 6);
    }
    visible = raw.slice(0, start) + after;
  }

  const parsed = stateBody ? tryParseJson(stateBody) : null;
  const stats = parsed ? mergeStats(prev, parsed) : null;
  const { body, choices } = extractChoices(visible);
  return { narrative: body, choices, stats };
}

/** Plain-text summary of the current stats for the GM's context. */
export function statsToContext(s: MissionStats, turn: number): string {
  return `[Tracked state — turn ${turn}: health ${s.health}/100, credits ${s.credits}, inventory: ${
    s.inventory.length ? s.inventory.join(', ') : 'empty'
  }; objective: ${s.objective}]`;
}
