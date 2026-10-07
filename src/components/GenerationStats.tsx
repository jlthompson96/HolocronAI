import type { GenerationStats as Stats } from '../types/modelSettings';
import './ModelSettings.css';

interface GenerationStatsProps {
  stats: Stats | null;
}

/** Small readout for the last response: "⚡ 42 tok/s · 0.8s TTFT · model-name". */
export default function GenerationStats({ stats }: GenerationStatsProps) {
  if (!stats) return null;
  const ttft = stats.ttftMs >= 1000 ? `${(stats.ttftMs / 1000).toFixed(1)}s` : `${Math.round(stats.ttftMs)}ms`;
  const approx = stats.exactTokens ? '' : '~';
  return (
    <span
      className="gen-stats"
      title={`${approx}${stats.tokens} tokens${stats.exactTokens ? '' : ' (estimated)'} · time to first token ${ttft}`}
    >
      <span className="gen-stats__bolt" aria-hidden="true">⚡</span>
      {approx}{stats.tokensPerSec.toFixed(stats.tokensPerSec < 10 ? 1 : 0)} tok/s
      <span className="gen-stats__sep">·</span>
      {ttft} TTFT
      <span className="gen-stats__sep">·</span>
      <span className="gen-stats__model">{stats.model}</span>
    </span>
  );
}
