import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageCircleHeart, BarChart3, Info, Phone } from 'lucide-react';
import clsx from 'clsx';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, hint: 'Live calls' },
  { to: '/demo', label: 'Demo Chat', icon: MessageCircleHeart, hint: 'Subukan si Tinig' },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, hint: 'Insights' },
  { to: '/about', label: 'About', icon: Info, hint: 'Tungkol sa amin' },
];

export default function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-[260px] bg-sky-50/60 backdrop-blur-sm border-r border-sky-100 sticky top-0 h-screen">
      {/* Brand */}
      <div className="px-5 pt-6 pb-5 border-b border-sky-100">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-flag-blue/15 animate-pulse-ring" />
            <div className="relative w-12 h-12 rounded-2xl bg-white border-2 border-flag-blue flex items-center justify-center shadow-pixel-sm">
              <img src="/logo.png" alt="Tinig Manila" className="w-9 h-9 object-contain" />
            </div>
          </div>
          <div className="leading-tight">
            <div className="font-display font-extrabold text-lg text-flag-blue-deep">
              Tinig Manila
            </div>
            <div className="text-[11px] text-ink-muted font-medium uppercase tracking-wider">
              Ang Tinig Ninyo
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) =>
              clsx('nav-link group', isActive && 'nav-link-active')
            }
          >
            <l.icon
              className="w-5 h-5 shrink-0 group-[.nav-link-active]:text-white"
              strokeWidth={2.2}
            />
            <div className="flex flex-col leading-tight">
              <span>{l.label}</span>
              <span className="text-[10px] font-normal opacity-70">{l.hint}</span>
            </div>
          </NavLink>
        ))}
      </nav>

      {/* Hotline card */}
      <div className="m-3 p-4 rounded-2xl bg-gradient-to-br from-flag-blue to-flag-blue-deep text-white relative overflow-hidden">
        <div className="absolute -top-3 -right-3 w-16 h-16 rounded-full bg-flag-yellow/20" />
        <div className="absolute -bottom-6 -left-4 w-20 h-20 rounded-full bg-flag-red/20" />
        <div className="relative">
          <div className="flex items-center gap-2 text-flag-yellow-soft text-[10px] font-bold uppercase tracking-widest">
            <Phone className="w-3 h-3" /> Toll-Free Hotline
          </div>
          <div className="font-pixel text-base mt-2 leading-tight">
            1-800<br />TINIG-MNL
          </div>
          <p className="text-[11px] opacity-80 mt-2 leading-snug">
            Libreng tawag para sa mga lolo at lola.
          </p>
        </div>
      </div>

      {/* Flag stripe accent */}
      <div className="h-1.5 flag-stripe" />
    </aside>
  );
}
