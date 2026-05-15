import clsx from 'clsx';
import { useEffect, useRef } from 'react';
import { Bot, User } from 'lucide-react';
import { formatTime } from '../lib/format.js';

export default function TranscriptView({ messages = [], emptyHint }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  if (!messages.length) {
    return (
      <div className="h-full flex items-center justify-center text-center p-8 text-ink-muted">
        <div>
          <div className="mx-auto w-14 h-14 rounded-2xl bg-sky-100 flex items-center justify-center mb-3">
            <Bot className="w-6 h-6 text-flag-blue" />
          </div>
          <div className="font-semibold text-ink">Walang transcript pa</div>
          <p className="text-sm mt-1 max-w-xs mx-auto">
            {emptyHint || 'Lalabas dito ang usapan kapag may tumawag.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
      {messages.map((m, i) => (
        <Bubble key={i} role={m.role} text={m.text} at={m.at} />
      ))}
      <div ref={endRef} />
    </div>
  );
}

function Bubble({ role, text, at }) {
  const isUser = role === 'user';
  return (
    <div
      className={clsx(
        'flex gap-2 items-end animate-fade-up',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-flag-blue text-white flex items-center justify-center shrink-0 shadow-soft">
          <Bot className="w-4 h-4" />
        </div>
      )}
      <div
        className={clsx(
          'max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-soft border',
          isUser
            ? 'bg-flag-blue text-white border-flag-blue rounded-br-sm'
            : 'bg-white text-ink border-sky-100 rounded-bl-sm',
        )}
      >
        <p className="whitespace-pre-wrap">{text}</p>
        {at && (
          <div
            className={clsx(
              'text-[10px] mt-1 font-mono',
              isUser ? 'text-white/70' : 'text-ink-muted',
            )}
          >
            {formatTime(at)}
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-flag-red text-white flex items-center justify-center shrink-0 shadow-soft">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}
