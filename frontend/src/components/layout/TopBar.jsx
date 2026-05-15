import { useLocation, NavLink } from 'react-router-dom';
import { Radio, Wifi, WifiOff, LayoutDashboard, MessageCircleHeart, BarChart3, Info } from 'lucide-react';
import clsx from 'clsx';
import { useSocketStatus } from '../../hooks/useSocket.js';

const titles = {
  '/': { title: 'Dashboard', subtitle: 'Live calls coming in to the Tinig Manila hotline.' },
  '/demo': { title: 'Demo Chat', subtitle: 'Subukan si Tinig sa browser — walang Twilio bill.' },
  '/analytics': { title: 'Analytics', subtitle: 'Intent at sentiment ng mga tawag.' },
  '/about': { title: 'About', subtitle: 'Ang misyon at team sa likod ng Tinig.' },
};

const mobileLinks = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/demo', icon: MessageCircleHeart, label: 'Demo' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/about', icon: Info, label: 'About' },
];

export default function TopBar() {
  const { pathname } = useLocation();
  const meta = titles[pathname] || titles['/'];
  const connected = useSocketStatus();

  return (
    <header className="sticky top-0 z-20 bg-cream-50/85 backdrop-blur border-b border-sky-100">
      <div className="px-6 md:px-10 py-4 max-w-[1400px] mx-auto flex items-center gap-4">
        {/* Mobile brand */}
        <div className="md:hidden flex items-center gap-2">
          <img src="/logo.png" className="w-8 h-8" alt="Tinig Manila" />
          <div className="font-display font-bold text-flag-blue-deep">Tinig</div>
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-extrabold text-2xl md:text-3xl text-ink leading-tight">
            {meta.title}
          </h1>
          <p className="text-sm text-ink-muted truncate">{meta.subtitle}</p>
        </div>

        {/* Connection status pill */}
        <div
          className={clsx(
            'hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border',
            connected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200',
          )}
          title={connected ? 'WebSocket live' : 'Disconnected'}
        >
          {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          {connected ? 'Live' : 'Offline'}
          {connected && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          )}
        </div>

        {/* Hotline badge */}
        <a
          href="tel:18008464665"
          className="hidden lg:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-flag-yellow text-ink text-xs font-bold border-2 border-ink shadow-pixel-sm hover:translate-y-[-1px] transition-transform"
        >
          <Radio className="w-3.5 h-3.5" />
          1-800-TINIG-MNL
        </a>
      </div>

      {/* Mobile bottom tabs */}
      <nav className="md:hidden grid grid-cols-4 border-t border-sky-100 bg-white">
        {mobileLinks.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center justify-center py-2 text-[11px] font-medium',
                isActive ? 'text-flag-blue' : 'text-ink-muted',
              )
            }
          >
            <l.icon className="w-5 h-5 mb-0.5" />
            {l.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
