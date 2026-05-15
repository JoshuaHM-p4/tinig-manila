import clsx from 'clsx';
import { Phone, MonitorSmartphone, CircleDot } from 'lucide-react';
import { intentLabel } from '../lib/format.js';

export default function ActiveCallsList({ sessions, selectedId, onSelect }) {
  const items = Array.from(sessions.values()).sort(
    (a, b) => b.lastActivityAt - a.lastActivityAt,
  );

  if (items.length === 0) {
    return (
      <div className="card p-6 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center mb-3">
          <CircleDot className="w-5 h-5 text-flag-blue" />
        </div>
        <div className="font-semibold text-ink">Walang aktibong tawag</div>
        <p className="text-sm text-ink-muted mt-1">
          Maghihintay si Tinig — lalabas dito ang lahat ng papasok na tawag.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((s) => (
        <li key={s.id}>
          <button
            type="button"
            onClick={() => onSelect?.(s.id)}
            className={clsx(
              'w-full text-left card p-3 hover:shadow-pop transition-all duration-150 group',
              selectedId === s.id
                ? 'ring-2 ring-flag-blue/40 border-flag-blue/40'
                : 'hover:-translate-y-0.5',
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={clsx(
                  'relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  s.channel === 'phone'
                    ? 'bg-flag-red/10 text-flag-red'
                    : 'bg-flag-blue/10 text-flag-blue',
                )}
              >
                {s.channel === 'phone' ? (
                  <Phone className="w-4 h-4" />
                ) : (
                  <MonitorSmartphone className="w-4 h-4" />
                )}
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 justify-between">
                  <span className="font-semibold text-ink truncate">
                    {s.callerName || 'Unknown Caller'}
                  </span>
                  <Timer startedAt={s.startedAt} />
                </div>
                <div className="text-xs text-ink-muted truncate">
                  {intentLabel(s.intent)} ·{' '}
                  <span className="font-mono text-[10px] opacity-70">
                    {s.id.slice(0, 8)}
                  </span>
                </div>
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Timer({ startedAt }) {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return (
    <span className="font-mono text-[11px] text-ink-muted">
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}
