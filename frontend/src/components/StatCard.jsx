import clsx from 'clsx';

export default function StatCard({ icon: Icon, label, value, suffix, accent = 'blue', sub }) {
  const accents = {
    blue: 'from-sky-100 to-white border-sky-200 text-flag-blue',
    red: 'from-rose-100 to-white border-rose-200 text-flag-red',
    yellow: 'from-amber-100 to-white border-amber-200 text-amber-700',
    green: 'from-emerald-100 to-white border-emerald-200 text-emerald-700',
  };
  return (
    <div
      className={clsx(
        'card p-5 bg-gradient-to-br relative overflow-hidden',
        accents[accent],
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            {label}
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-display font-extrabold text-3xl md:text-4xl text-ink">
              {value}
            </span>
            {suffix && (
              <span className="text-sm font-medium text-ink-muted">{suffix}</span>
            )}
          </div>
          {sub && <div className="mt-1 text-xs text-ink-muted">{sub}</div>}
        </div>
        {Icon && (
          <div className="w-11 h-11 rounded-xl bg-white shadow-soft flex items-center justify-center">
            <Icon className="w-5 h-5" strokeWidth={2.2} />
          </div>
        )}
      </div>
      {/* tiny flag stripe at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 flag-stripe opacity-70" />
    </div>
  );
}
