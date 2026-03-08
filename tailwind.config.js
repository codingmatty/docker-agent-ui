import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        void: {
          primary: '#38bdf8',
          'primary-content': '#040d1a',
          secondary: '#818cf8',
          'secondary-content': '#040d1a',
          accent: '#f59e0b',
          'accent-content': '#040d1a',
          neutral: '#1e2d45',
          'neutral-content': '#94a3b8',
          'base-100': '#060b18',
          'base-200': '#0c1222',
          'base-300': '#172030',
          'base-content': '#dde6f0',
          info: '#06b6d4',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
        },
      },
      'dark',
      'light',
      'cupcake',
      'nord',
      'dracula',
      'business',
    ],
  },
};
