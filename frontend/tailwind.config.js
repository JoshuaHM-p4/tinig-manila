/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ── Philippine Flag inspired palette ────────────────────
        flag: {
          blue: '#0038A8',
          'blue-deep': '#002270',
          'blue-soft': '#3B6BD6',
          red: '#CE1126',
          'red-deep': '#8E0B19',
          yellow: '#FCD116',
          'yellow-soft': '#FFE373',
          white: '#FFFFFF',
        },
        // ── Mascot palette (matches attached pixel mascot) ──────
        sky: {
          50: '#F2F8FE',
          100: '#E2F0FB',
          200: '#C7E2F7',
          300: '#9BC9EE',
          400: '#6BA8E0',
          500: '#4488CC',
          600: '#2E6BAA',
          700: '#1F4E80',
          800: '#143557',
          900: '#0A1F36',
        },
        cream: {
          50: '#FDFBF5',
          100: '#FAF6EA',
          200: '#F2EAD2',
        },
        ink: {
          DEFAULT: '#0E1B2C',
          soft: '#3A4A60',
          muted: '#6B7A8F',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif'],
        pixel: ['"Press Start 2P"', 'monospace'],
      },
      boxShadow: {
        soft: '0 4px 16px -4px rgba(14, 27, 44, 0.08), 0 2px 6px -2px rgba(14, 27, 44, 0.06)',
        pop: '0 10px 28px -8px rgba(0, 56, 168, 0.25), 0 4px 10px -4px rgba(14, 27, 44, 0.10)',
        pixel: '4px 4px 0 0 rgba(14, 27, 44, 0.85)',
        'pixel-sm': '2px 2px 0 0 rgba(14, 27, 44, 0.85)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        bobble: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.95)', opacity: '0.7' },
          '70%, 100%': { transform: 'scale(1.4)', opacity: '0' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        bobble: 'bobble 2.4s ease-in-out infinite',
        wiggle: 'wiggle 1.6s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
        'fade-up': 'fade-up 0.35s ease-out',
        shimmer: 'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
};
