import { useEffect, useRef, useState } from 'react';
import { Send, RotateCcw, Sparkles, Mic, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { api } from '../lib/api.js';
import Mascot from '../components/Mascot.jsx';
import CallerProfileCard from '../components/CallerProfileCard.jsx';
import SentimentMeter from '../components/SentimentMeter.jsx';
import TranscriptView from '../components/TranscriptView.jsx';
import { intentLabel } from '../lib/format.js';

const SAMPLE_PROMPTS = [
  'Magandang umaga po, ako po si Rosa Dela Cruz, enero beinte, nineteen fifty-two.',
  'Kelan po ang next pension release ko?',
  'Saan po ang pinakamalapit na health center sa akin?',
  'May appointment po ba ako sa health center?',
  'Paano po mag-register sa eGovPH?',
];

export default function Demo() {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [sentiment, setSentiment] = useState(50);
  const [sentimentLabel, setSentimentLabel] = useState('Neutral');
  const [intent, setIntent] = useState('general_inquiry');
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    startSession();
    return () => {
      // best-effort cleanup
      if (sessionId) api.endSession(sessionId).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startSession() {
    try {
      setError(null);
      const res = await api.newSession();
      setSessionId(res.sessionId);
      setMessages([
        {
          role: 'assistant',
          text:
            'Magandang araw po! Ako si Tinig, ang inyong katulong para sa mga serbisyong pang-gobyerno. ' +
            'Paano po kita matutulungan ngayon?',
          at: new Date(),
        },
      ]);
      setProfile(null);
      setSentiment(50);
      setSentimentLabel('Neutral');
      setIntent('general_inquiry');
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (e) {
      setError(
        'Hindi makakonekta sa backend. Tiyaking nag-rurun ang server (npm run dev:backend).',
      );
    }
  }

  async function send(text) {
    const trimmed = (text ?? input).trim();
    if (!trimmed || loading || !sessionId) return;

    const at = new Date();
    setMessages((m) => [...m, { role: 'user', text: trimmed, at }]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await api.chat(sessionId, trimmed);
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: res.reply, at: new Date() },
      ]);
      if (res.callerProfile) setProfile(res.callerProfile);
      if (typeof res.sentiment === 'number') setSentiment(res.sentiment);
      if (res.sentimentLabel) setSentimentLabel(res.sentimentLabel);
      if (res.intent) setIntent(res.intent);
    } catch (e) {
      setError('May problema sa pagtawag kay Tinig. Subukan muli.');
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: 'Pasensya na po, may problema kami sa kasalukuyan. Pakisubukan muli.',
          at: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function reset() {
    if (sessionId) {
      try {
        await api.endSession(sessionId);
      } catch {}
    }
    await startSession();
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-4">
      {/* ── Chat column ──────────────────────────────────── */}
      <div className="card flex flex-col min-h-[640px] max-h-[78vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-sky-100 flex items-center gap-4 bg-gradient-to-r from-sky-50 to-white">
          <Mascot size={64} animate />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display font-extrabold text-xl text-ink">Tinig</h2>
              <span className="chip-green">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Online
              </span>
            </div>
            <p className="text-xs text-ink-muted truncate">
              Filipino AI hotline assistant · powered by Groq Llama-3.3
            </p>
          </div>
          <button onClick={reset} className="btn-secondary" title="Magsimulang muli">
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>

        {/* Sample prompts (only show when conversation is fresh) */}
        {messages.length <= 1 && (
          <div className="px-5 py-3 border-b border-sky-100 bg-cream-50/60">
            <div className="text-[11px] uppercase tracking-wider font-bold text-ink-muted mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-flag-yellow" />
              Subukan ang mga halimbawa
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="text-xs px-3 py-1.5 rounded-full bg-white border border-sky-200 text-flag-blue hover:bg-sky-50 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 flex flex-col min-h-0 bg-cream-50/40">
          <TranscriptView messages={messages} />
          {loading && (
            <div className="px-5 pb-2 flex items-center gap-2 text-xs text-ink-muted">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-flag-blue animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-flag-blue animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-flag-blue animate-bounce" />
              </span>
              Iniisip ni Tinig…
            </div>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="px-5 py-2 text-sm bg-rose-50 text-rose-700 border-t border-rose-200">
            {error}
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="border-t border-sky-100 p-3 bg-white"
        >
          <div className="flex items-end gap-2">
            <button
              type="button"
              className="btn-ghost px-3"
              title="Voice input (coming soon)"
              disabled
            >
              <Mic className="w-4 h-4" />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="I-type ang inyong tanong kay Tinig…"
              className={clsx(
                'flex-1 resize-none rounded-xl border border-sky-200 px-3.5 py-2.5',
                'text-sm focus:outline-none focus:ring-2 focus:ring-flag-blue/40 focus:border-flag-blue',
                'placeholder:text-ink-muted/70 bg-white max-h-32',
              )}
              disabled={loading || !sessionId}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !sessionId || !input.trim()}
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── Right rail ───────────────────────────────────── */}
      <div className="space-y-4">
        <CallerProfileCard profile={profile} />

        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display font-bold">Sentiment</h4>
            <span className="chip-slate">{sentimentLabel}</span>
          </div>
          <SentimentMeter score={sentiment} label={sentimentLabel} />
          <div className="pt-2 border-t border-sky-100">
            <div className="text-[11px] uppercase tracking-wider font-bold text-ink-muted mb-1.5">
              Tinukoy na intent
            </div>
            <span className="chip-yellow">{intentLabel(intent)}</span>
          </div>
        </div>

        <div className="card p-5 bg-gradient-to-br from-flag-yellow/15 via-white to-sky-100/40">
          <div className="flex items-center gap-2 text-flag-blue-deep mb-2">
            <Sparkles className="w-4 h-4" />
            <h4 className="font-display font-bold">Mga tip sa demo</h4>
          </div>
          <ul className="text-sm space-y-2 text-ink-soft">
            <li className="flex gap-2">
              <ChevronRight className="w-4 h-4 text-flag-blue shrink-0 mt-0.5" />
              Simulan sa pag-introduce: pangalan + kapanganakan.
            </li>
            <li className="flex gap-2">
              <ChevronRight className="w-4 h-4 text-flag-blue shrink-0 mt-0.5" />
              Subukang itanong ang benefits, health, o appointment.
            </li>
            <li className="flex gap-2">
              <ChevronRight className="w-4 h-4 text-flag-blue shrink-0 mt-0.5" />
              Pwede ring Taglish — naiintindihan ni Tinig.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
