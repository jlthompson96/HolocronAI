import { useState } from 'react';
import type { GenerationStats as Stats } from '../types/modelSettings';
import './ModelSettings.css';
import './Holocron.css';

const HISTORY_LENGTH = 12;
const SPARK_W = 56;
const SPARK_H = 14;

interface GenerationStatsProps {
  stats: Stats | null;
}

/** Hyperdrive telemetry: tok/s over the last few responses, drawn as a tiny sparkline. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = SPARK_W / (HISTORY_LENGTH - 1);
  const x0 = SPARK_W - step * (values.length - 1);
  const points = values.map((v, i) => [x0 + i * step, SPARK_H - 1 - ((v - min) / range) * (SPARK_H - 2)] as const);
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg className="gen-stats__spark" width={SPARK_W} height={SPARK_H} viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} aria-hidden="true">
      <polygon className="gen-stats__spark-area" points={`${x0},${SPARK_H} ${line} ${lastX},${SPARK_H}`} />
      <polyline className="gen-stats__spark-line" points={line} />
      <circle className="gen-stats__spark-dot" cx={lastX} cy={lastY} r={1.8} />
    </svg>
  );
}

/** Small readout for the last response: "⚡ 42 tok/s ∿ · 0.8s TTFT · model-name". */
export default function GenerationStats({ stats }: GenerationStatsProps) {
  const [history, setHistory] = useState<number[]>([]);
  const [seen, setSeen] = useState<Stats | null>(null);

  // Append each new response's speed (derived during render, no effect needed)
  if (stats !== seen) {
    setSeen(stats);
    if (stats) setHistory((h) => [...h, stats.tokensPerSec].slice(-HISTORY_LENGTH));
  }

  if (!stats) return null;
  const ttft = stats.ttftMs >= 1000 ? `${(stats.ttftMs / 1000).toFixed(1)}s` : `${Math.round(stats.ttftMs)}ms`;
  const approx = stats.exactTokens ? '' : '~';
  const historyTitle = history.length > 1 ? ` · recent: ${history.map((v) => v.toFixed(0)).join(', ')} tok/s` : '';
  return (
    <span
      className="gen-stats"
      title={`${approx}${stats.tokens} tokens${stats.exactTokens ? '' : ' (estimated)'} · time to first token ${ttft}${historyTitle}`}
    >
      <span className="gen-stats__bolt" aria-hidden="true">⚡</span>
      {approx}{stats.tokensPerSec.toFixed(stats.tokensPerSec < 10 ? 1 : 0)} tok/s
      <Sparkline values={history} />
      <span className="gen-stats__sep">·</span>
      {ttft} TTFT
      <span className="gen-stats__sep">·</span>
      <span className="gen-stats__model">{stats.model}</span>
    </span>
  );
}
