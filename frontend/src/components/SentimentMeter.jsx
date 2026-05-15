import clsx from 'clsx';
import { sentimentColor } from '../lib/format.js';

export default function SentimentMeter({ score = 50, label = 'Neutral', compact = false }) {
  const pct = Math.max(0, Math.min(100, score));
  const cls = sentimentColor(pct);

  return (
    <div className={clsx('w-full', compact && 'space-y-1')}>
      {!compact && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Sentiment
          </span>
          <span className={clsx('chip border', cls)}>
            {label} · {pct}
          </span>
        </div>
      )}
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden relative">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background:
              'linear-gradient(90deg, #f43f5e 0%, #f59e0b 40%, #38bdf8 65%, #10b981 100%)',
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-ink shadow-pixel-sm transition-all duration-500"
          style={{ left: `calc(${pct}% - 6px)` }}
        />
      </div>
    </div>
  );
}
