import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-fg': 'rgb(var(--accent-fg) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        warn: 'rgb(var(--warn) / <alpha-value>)',
        ok: 'rgb(var(--ok) / <alpha-value>)',
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.04), 0 4px 16px -4px rgb(15 23 42 / 0.08)',
      },
      keyframes: {
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        drift: {
          '0%,100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(4px)' },
        },
        fall: {
          '0%': { transform: 'translateY(-2px)', opacity: '0' },
          '30%': { opacity: '1' },
          '100%': { transform: 'translateY(6px)', opacity: '0' },
        },
        flash: { '0%,90%,100%': { opacity: '1' }, '93%,97%': { opacity: '0.3' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'spin-slow': 'spin-slow 24s linear infinite',
        drift: 'drift 6s ease-in-out infinite',
        fall: 'fall 1.4s linear infinite',
        flash: 'flash 4s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
