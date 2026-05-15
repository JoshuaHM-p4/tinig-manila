import { Phone, MonitorSmartphone, MessageSquareQuote } from 'lucide-react';
import clsx from 'clsx';
import { timeAgo } from '../lib/format.js';

export default function LiveFeed({ transcripts }) {
  if (!transcripts?.length) {
    return (
      <div className="card p-6 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center mb-3">
          <MessageSquareQuote className="w-5 h-5 text-flag-blue" />
        </div>
        <div className="font-semibold text-ink">Walang live messages pa</div>
        <p className="text-sm text-ink-muted mt-1">
          Ang lahat ng papasok na turn ng usapan ay lalabas dito real-time.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
      {transcripts.map((t) => (
        <li
          key={t.id}
          className="card p-3 hover:shadow-pop transition-all duration-150 animate-fade-up"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div
              className={clsx(
                'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                t.channel === 'phone'
                  ? 'bg-flag-red/10 text-flag-red'
                  : 'bg-flag-blue/10 text-flag-blue',
              )}
            >
              {t.channel === 'phone' ? (
                <Phone className="w-3.5 h-3.5" />
              ) : (
                <MonitorSmartphone className="w-3.5 h-3.5" />
              )}
            </div>
            <span className="font-semibold text-sm text-ink truncate">
              {t.callerName || 'Unknown Caller'}
            </span>
            <span className="ml-auto text-[11px] text-ink-muted font-mono">
              {timeAgo(t.at)}
            </span>
          </div>
          <p className="text-sm text-ink-soft pl-9 italic">
            “{t.callerMessage}”
          </p>
          <p className="text-sm text-flag-blue-deep pl-9 mt-1">
            <span className="font-semibold">Tinig:</span> {t.tinigReply}
          </p>
        </li>
      ))}
    </ul>
  );
}
