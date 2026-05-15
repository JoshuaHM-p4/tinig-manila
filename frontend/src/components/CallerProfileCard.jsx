import { BadgeCheck, MapPin, Phone, ShieldQuestion, Sparkles } from 'lucide-react';
import clsx from 'clsx';

export default function CallerProfileCard({ profile }) {
  if (!profile) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-sky-100 flex items-center justify-center">
            <ShieldQuestion className="w-5 h-5 text-flag-blue" />
          </div>
          <div>
            <div className="font-semibold text-ink">Hindi pa nakikilala</div>
            <div className="text-xs text-ink-muted">
              Hinihingi pa ni Tinig ang pangalan at kapanganakan.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const verified = profile.egovphStatus === 'VERIFIED';
  const initials = (profile.name || '?')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-flag-blue/5" />
      <div className="absolute -bottom-12 -left-8 w-32 h-32 rounded-full bg-flag-yellow/10" />

      <div className="relative flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-flag-blue to-flag-blue-soft text-white flex items-center justify-center font-display font-extrabold text-xl shadow-soft">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-bold text-lg text-ink truncate">
              {profile.name}
            </h3>
            <span
              className={clsx(
                'chip border',
                verified
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200',
              )}
            >
              <BadgeCheck className="w-3 h-3" />
              {profile.egovphStatus || 'PENDING'}
            </span>
          </div>
          {profile.seniorCitizenId && (
            <div className="mt-1 text-xs text-ink-muted font-mono">
              Senior ID · {profile.seniorCitizenId}
            </div>
          )}
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        {(profile.barangay || profile.city) && (
          <div className="flex items-center gap-2 text-ink-soft">
            <MapPin className="w-4 h-4 text-flag-red shrink-0" />
            <span className="truncate">
              {[profile.barangay, profile.city].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
        {profile.preferredLanguage && (
          <div className="flex items-center gap-2 text-ink-soft">
            <Sparkles className="w-4 h-4 text-flag-yellow shrink-0" />
            <span className="truncate">Wika: {profile.preferredLanguage}</span>
          </div>
        )}
        {profile.phone && (
          <div className="flex items-center gap-2 text-ink-soft">
            <Phone className="w-4 h-4 text-flag-blue shrink-0" />
            <span className="truncate">{profile.phone}</span>
          </div>
        )}
      </div>

      {profile.registeredServices?.length > 0 && (
        <div className="relative mt-4">
          <div className="text-[11px] uppercase tracking-wider font-bold text-ink-muted mb-2">
            Mga rehistradong serbisyo
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.registeredServices.map((s) => (
              <span key={s} className="chip-blue">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
