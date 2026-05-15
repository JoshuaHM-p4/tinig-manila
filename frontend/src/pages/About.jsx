import {
  Phone,
  HeartHandshake,
  Globe,
  Cpu,
  ShieldCheck,
  Github,
  Sparkles,
} from 'lucide-react';
import Mascot from '../components/Mascot.jsx';

const TECH = [
  { name: 'Node.js + Express', tag: 'Server' },
  { name: 'Groq Llama-3.3-70B', tag: 'AI Brain' },
  { name: 'Twilio Voice', tag: 'Phone' },
  { name: 'Socket.io', tag: 'Live' },
  { name: 'React + Vite', tag: 'Frontend' },
  { name: 'Tailwind CSS', tag: 'Style' },
  { name: 'eGovPH SuperApp', tag: 'Gov data' },
];

const PRINCIPLES = [
  {
    icon: HeartHandshake,
    title: 'Mabait, hindi makina',
    desc: 'Banayad na boses, sariling wika, walang prompt na nakakalito.',
  },
  {
    icon: Phone,
    title: 'Isang tawag lang',
    desc: 'Walang app, walang OTP, walang queue. Tumawag at kausapin si Tinig.',
  },
  {
    icon: ShieldCheck,
    title: 'Pribadong usapan',
    desc: 'Identity verification gamit ang eGovPH — walang lumalabas sa private data.',
  },
  {
    icon: Globe,
    title: 'Para sa buong Pilipinas',
    desc: 'Mula Batangas hanggang Caloocan — naa-access kahit walang smartphone.',
  },
];

export default function About() {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="card-flat p-6 md:p-10 bg-gradient-to-br from-white via-sky-50 to-cream-50 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 flag-stripe" />
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-flag-yellow/15 blur-2xl" />
        <div className="absolute -bottom-12 -left-10 w-60 h-60 rounded-full bg-flag-blue/10 blur-2xl" />

        <div className="relative grid md:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <span className="chip-yellow">
              <Sparkles className="w-3 h-3" />
              Tungkol sa Tinig Manila
            </span>
            <h2 className="font-display font-extrabold text-3xl md:text-5xl mt-3 text-balance leading-[1.05]">
              Isang <span className="text-flag-blue">tinig</span>,
              <br className="hidden md:block" /> para sa{' '}
              <span className="text-flag-red">bawat lolo't lola.</span>
            </h2>
            <p className="mt-4 text-ink-soft max-w-2xl leading-relaxed">
              Ang Tinig Manila ay isang libreng AI voice hotline na tumutulong sa mga
              Pilipinong senior citizens na ma-access ang kanilang mga government services
              sa pamamagitan ng eGovPH SuperApp — gamit lang ang isang tawag, sa sariling
              wika nila.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href="https://egovph.gov.ph"
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
              >
                <Globe className="w-4 h-4" />
                eGovPH SuperApp
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="btn-ghost"
              >
                <Github className="w-4 h-4" />
                Source code
              </a>
            </div>
          </div>

          <div className="flex justify-center md:justify-end">
            <Mascot variant="flying" size={220} haloColor="yellow" />
          </div>
        </div>
      </section>

      {/* Principles */}
      <section>
        <h3 className="font-display font-bold text-xl mb-3">Mga prinsipyo namin</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="card p-5">
              <div className="w-11 h-11 rounded-xl bg-flag-blue/10 text-flag-blue flex items-center justify-center mb-3">
                <p.icon className="w-5 h-5" />
              </div>
              <div className="font-display font-bold text-lg">{p.title}</div>
              <p className="text-sm text-ink-soft mt-1 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech */}
      <section className="grid lg:grid-cols-[1fr_1fr] gap-4">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-flag-blue" />
            <h3 className="font-display font-bold text-lg">Tech stack</h3>
          </div>
          <ul className="space-y-2">
            {TECH.map((t) => (
              <li
                key={t.name}
                className="flex items-center justify-between border border-sky-100 rounded-xl px-4 py-2.5 bg-cream-50/40 hover:bg-white transition-colors"
              >
                <span className="font-medium text-ink">{t.name}</span>
                <span className="chip-blue">{t.tag}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-6 bg-gradient-to-br from-flag-blue to-flag-blue-deep text-white relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-flag-yellow/20 blur-2xl" />
          <div className="absolute -bottom-14 -left-10 w-48 h-48 rounded-full bg-flag-red/20 blur-2xl" />
          <div className="relative">
            <div className="font-pixel text-xs text-flag-yellow uppercase tracking-widest mb-3">
              Manifesto
            </div>
            <h3 className="font-display font-extrabold text-2xl leading-tight">
              Ang teknolohiya ay dapat
              <br />
              naa-access ng kahit sino.
            </h3>
            <p className="mt-4 text-white/85 leading-relaxed">
              Marami sa ating mga lolo at lola ay hindi nakakapag-download ng apps.
              Pero alam nila kung paano tumawag. Doon papasok si Tinig — para hindi
              maiwan ang kahit sino sa digital na pamahalaan.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 chip border-white/30 bg-white/10 text-white">
              <Phone className="w-3.5 h-3.5" />
              1-800-TINIG-MNL · Libre 24/7
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section>
        <h3 className="font-display font-bold text-xl mb-3">Team</h3>
        <div className="card p-6 flex items-center gap-5 flex-wrap">
          <Mascot size={90} animate />
          <div className="flex-1 min-w-[200px]">
            <div className="font-display font-bold text-lg">Tinig Manila Team</div>
            <p className="text-sm text-ink-soft mt-1">
              Ginawa nang may pagmamahal para sa{' '}
              <span className="text-flag-blue font-semibold">Hackathon 2026</span>.
              Open-source. Para sa bayan.
            </p>
          </div>
          <a href="#" className="btn-pixel">Salamat po!</a>
        </div>
      </section>
    </div>
  );
}
