import { useEffect, useMemo, useState } from 'react';
import {
  PhoneCall,
  CheckCircle2,
  Clock4,
  Activity,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDashboardStore } from '../hooks/useDashboardStore.js';
import StatCard from '../components/StatCard.jsx';
import ActiveCallsList from '../components/ActiveCallsList.jsx';
import TranscriptView from '../components/TranscriptView.jsx';
import CallerProfileCard from '../components/CallerProfileCard.jsx';
import SentimentMeter from '../components/SentimentMeter.jsx';
import LiveFeed from '../components/LiveFeed.jsx';
import Mascot from '../components/Mascot.jsx';
import { formatDuration, intentLabel } from '../lib/format.js';

export default function Dashboard() {
  const { stats, sessions, transcripts, history } = useDashboardStore();
  const [selectedId, setSelectedId] = useState(null);

  // Auto-select first active session
  useEffect(() => {
    const ids = Array.from(sessions.keys());
    if (!ids.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !sessions.has(selectedId)) {
      setSelectedId(ids[0]);
    }
  }, [sessions, selectedId]);

  const selected = selectedId ? sessions.get(selectedId) : null;
  const hasActive = sessions.size > 0;

  const lastResolved = history[0];

  return (
    <div className="space-y-6">
      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="card-flat p-6 md:p-8 bg-gradient-to-br from-flag-blue via-flag-blue to-flag-blue-deep text-white relative overflow-hidden">
        <div className="absolute -top-10 right-10 w-40 h-40 rounded-full bg-flag-yellow/20 blur-2xl" />
        <div className="absolute -bottom-12 -right-8 w-56 h-56 rounded-full bg-flag-red/20 blur-2xl" />
        <div className="absolute top-0 left-0 right-0 h-1.5 flag-stripe" />

        <div className="relative grid md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-flag-yellow-soft text-xs font-bold uppercase tracking-widest border border-white/20">
              <Sparkles className="w-3.5 h-3.5" />
              Tinig Manila Hotline
            </div>
            <h2 className="font-display font-extrabold text-3xl md:text-4xl mt-3 leading-tight text-balance">
              Ang Tinig Ninyo,<br className="hidden md:block" />
              <span className="text-flag-yellow">Aming Maririnig.</span>
            </h2>
            <p className="mt-3 text-white/80 max-w-xl text-sm md:text-base">
              Isang libreng AI voice hotline para sa mga lolo at lola — naka-konekta sa
              eGovPH para sa benefits, health, appointments, at barangay services.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/demo" className="btn-pixel">
                Subukan si Tinig
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/analytics"
                className="btn bg-white/10 text-white border border-white/20 hover:bg-white/20"
              >
                Tingnan ang Analytics
              </Link>
            </div>
          </div>

          <div className="hidden md:flex justify-end">
            <Mascot variant="flying" size={170} haloColor="yellow" />
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={PhoneCall}
          label="Active Calls"
          value={stats.activeCalls}
          accent="red"
          sub={stats.activeCalls > 0 ? 'Live ngayon' : 'Walang aktibong tawag'}
        />
        <StatCard
          icon={CheckCircle2}
          label="Resolved Today"
          value={stats.resolvedToday}
          accent="green"
          sub="Mga natulungang senior"
        />
        <StatCard
          icon={Clock4}
          label="Avg Resolution"
          value={formatDuration(stats.avgResolutionSec)}
          accent="blue"
          sub="Mas mabilis kaysa sa long queue."
        />
        <StatCard
          icon={Activity}
          label="Today's Last Caller"
          value={lastResolved?.callerName?.split(' ')?.[0] || '—'}
          suffix={lastResolved ? formatDuration(lastResolved.durationSec) : ''}
          accent="yellow"
          sub={lastResolved ? intentLabel(lastResolved.intent) : 'Walang record pa'}
        />
      </section>

      {/* ── Main grid ──────────────────────────────────────── */}
      <section className="grid lg:grid-cols-[320px_1fr_340px] gap-4">
        {/* Active calls list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg">Active Calls</h3>
            <span className="chip-blue">{sessions.size}</span>
          </div>
          <ActiveCallsList
            sessions={sessions}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        {/* Transcript panel */}
        <div className="card flex flex-col min-h-[420px] max-h-[640px] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-sky-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-flag-blue text-white flex items-center justify-center">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-ink truncate">
                {selected ? selected.callerName : 'Walang piniling tawag'}
              </div>
              <div className="text-xs text-ink-muted">
                {selected
                  ? `${intentLabel(selected.intent)} · ${selected.channel === 'phone' ? 'Phone' : 'Browser'}`
                  : 'Pumili ng tawag sa kaliwa.'}
              </div>
            </div>
            {selected && (
              <span className="chip-slate font-mono">
                {selected.id.slice(0, 8)}
              </span>
            )}
          </div>
          <TranscriptView
            messages={selected?.messages || []}
            emptyHint={
              hasActive
                ? 'Naghihintay ng unang turn ng usapan…'
                : 'Buksan ang Demo Chat para mag-test agad.'
            }
          />
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          <CallerProfileCard profile={selected?.profile} />
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold">Sentiment</h4>
              <span className="chip-slate">
                {selected ? selected.sentimentLabel : '—'}
              </span>
            </div>
            <SentimentMeter
              score={selected?.sentiment ?? 50}
              label={selected?.sentimentLabel || 'Neutral'}
            />
            <div className="pt-2 border-t border-sky-100">
              <div className="text-[11px] uppercase tracking-wider font-bold text-ink-muted mb-1.5">
                Tinukoy na intent
              </div>
              <span className="chip-yellow">
                {selected ? intentLabel(selected.intent) : 'Walang aktibo'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Live feed ──────────────────────────────────────── */}
      <section className="grid lg:grid-cols-[1fr_360px] gap-4">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-lg">Live Transcript Feed</h3>
            <span className="text-xs text-ink-muted">
              Pinakahuling {transcripts.length} turns
            </span>
          </div>
          <LiveFeed transcripts={transcripts} />
        </div>

        <div className="space-y-3">
          <h3 className="font-display font-bold text-lg">Kamakailang Nakatulungan</h3>
          {history.length === 0 ? (
            <div className="card p-6 text-center">
              <Mascot variant="idle" size={84} className="mb-2" />
              <div className="font-semibold text-ink">Wala pang nakukumpletong tawag</div>
              <p className="text-sm text-ink-muted mt-1">
                Magsisimula na ang record dito kapag may natapos na tawag.
              </p>
            </div>
          ) : (
            <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
              {history.slice(0, 10).map((h) => (
                <li key={h.id} className="card p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-ink truncate">
                      {h.callerName}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {intentLabel(h.intent)} · {formatDuration(h.durationSec)}
                    </div>
                  </div>
                  <span className="chip-green">Resolved</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
