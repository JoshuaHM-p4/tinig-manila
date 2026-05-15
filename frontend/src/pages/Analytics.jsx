import { useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  HeartHandshake,
  CalendarCheck,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useDashboardStore } from '../hooks/useDashboardStore.js';
import StatCard from '../components/StatCard.jsx';
import Mascot from '../components/Mascot.jsx';
import { intentLabel, formatDuration } from '../lib/format.js';

const PIE_COLORS = ['#0038A8', '#CE1126', '#FCD116', '#3B6BD6', '#10B981', '#F59E0B', '#6366F1'];

export default function Analytics() {
  const { stats, history, intentCounts, sessions } = useDashboardStore();

  // Aggregate intent data from history + live intentCounts.
  const intentData = useMemo(() => {
    const counts = { ...intentCounts };
    history.forEach((h) => {
      if (h.intent) counts[h.intent] = (counts[h.intent] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([key, value]) => ({ key, name: intentLabel(key), value }))
      .sort((a, b) => b.value - a.value);
  }, [history, intentCounts]);

  // Sentiment buckets from history + active sessions.
  const sentimentBuckets = useMemo(() => {
    const buckets = { Positive: 0, Neutral: 0, Concerned: 0, Distressed: 0 };
    const tally = (score) => {
      if (score >= 70) buckets.Positive++;
      else if (score >= 45) buckets.Neutral++;
      else if (score >= 25) buckets.Concerned++;
      else buckets.Distressed++;
    };
    history.forEach((h) => h.sentiment != null && tally(h.sentiment));
    Array.from(sessions.values()).forEach((s) => tally(s.sentiment ?? 50));
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [history, sessions]);

  const totalCalls = stats.resolvedToday + sessions.size;
  const verifiedCount = useMemo(() => {
    let c = 0;
    Array.from(sessions.values()).forEach((s) => {
      if (s.profile?.egovphStatus === 'VERIFIED') c++;
    });
    history.forEach((h) => {
      if (h.profile?.egovphStatus === 'VERIFIED') c++;
    });
    return c;
  }, [sessions, history]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Calls"
          value={totalCalls}
          accent="blue"
          sub="Active + resolved ngayon"
        />
        <StatCard
          icon={HeartHandshake}
          label="Verified Seniors"
          value={verifiedCount}
          accent="green"
          sub="Na-authenticate sa eGovPH"
        />
        <StatCard
          icon={CalendarCheck}
          label="Avg Resolution"
          value={formatDuration(stats.avgResolutionSec)}
          accent="yellow"
          sub="Per natapos na tawag"
        />
        <StatCard
          icon={TrendingUp}
          label="Top Intent"
          value={intentData[0]?.name?.split(' ')[0] || '—'}
          accent="red"
          sub={intentData[0] ? `${intentData[0].value} sa kabuuan` : 'Walang data'}
        />
      </section>

      {/* Charts */}
      <section className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        {/* Intent bars */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-flag-blue" />
              <h3 className="font-display font-bold text-lg">
                Pinakamadalas na hinihingi
              </h3>
            </div>
            <span className="chip-slate">{intentData.length} intents</span>
          </div>
          {intentData.length === 0 ? (
            <EmptyChart text="Wala pang sapat na data. Subukan ang Demo Chat para makapagsimula." />
          ) : (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={intentData} margin={{ top: 8, right: 8, left: -16, bottom: 36 }}>
                  <CartesianGrid stroke="#E2F0FB" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#6B7A8F' }}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6B7A8F' }} />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,56,168,0.05)' }}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {intentData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Sentiment pie */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-flag-yellow" />
            <h3 className="font-display font-bold text-lg">Sentiment ng mga tawag</h3>
          </div>
          {sentimentBuckets.every((b) => b.value === 0) ? (
            <EmptyChart text="Hihintayin natin ang unang kumpletong tawag." />
          ) : (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentBuckets}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={92}
                    paddingAngle={3}
                  >
                    {sentimentBuckets.map((_, i) => (
                      <Cell
                        key={i}
                        fill={['#10B981', '#0038A8', '#F59E0B', '#CE1126'][i % 4]}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12, color: '#3A4A60' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* Recent calls table */}
      <section className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-sky-100 flex items-center justify-between">
          <h3 className="font-display font-bold text-lg">Kamakailang tawag</h3>
          <span className="chip-slate">{history.length} records</span>
        </div>
        {history.length === 0 ? (
          <div className="p-8 text-center">
            <Mascot variant="idle" size={96} className="mb-3" />
            <div className="font-semibold text-ink">Wala pang record</div>
            <p className="text-sm text-ink-muted mt-1">
              Ang lahat ng natapos na tawag ay lalabas dito.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-sky-50 text-ink-muted text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Caller</th>
                  <th className="px-5 py-3 text-left font-semibold">Intent</th>
                  <th className="px-5 py-3 text-left font-semibold">Channel</th>
                  <th className="px-5 py-3 text-left font-semibold">Sentiment</th>
                  <th className="px-5 py-3 text-right font-semibold">Duration</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-t border-sky-50 hover:bg-sky-50/40">
                    <td className="px-5 py-3 font-medium text-ink">{h.callerName}</td>
                    <td className="px-5 py-3 text-ink-soft">{intentLabel(h.intent)}</td>
                    <td className="px-5 py-3">
                      <span className={h.channel === 'phone' ? 'chip-red' : 'chip-blue'}>
                        {h.channel}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-ink-soft">
                      {h.sentimentLabel || '—'}
                      {h.sentiment != null && (
                        <span className="ml-2 text-xs font-mono text-ink-muted">
                          {h.sentiment}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-ink-soft">
                      {formatDuration(h.durationSec)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyChart({ text }) {
  return (
    <div className="h-[320px] flex flex-col items-center justify-center text-center text-ink-muted">
      <Mascot variant="idle" size={84} className="mb-3" />
      <p className="text-sm max-w-xs">{text}</p>
    </div>
  );
}

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #C7E2F7',
  boxShadow: '0 8px 24px -8px rgba(14,27,44,0.15)',
  fontSize: 12,
  color: '#0E1B2C',
};
