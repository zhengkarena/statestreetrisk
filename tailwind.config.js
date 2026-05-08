/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f3f6fa',
          100: '#e3eaf3',
          200: '#c2d1e3',
          300: '#94afcb',
          400: '#6488ad',
          500: '#446a93',
          600: '#345379',
          700: '#2a4262',
          800: '#1e3a5f',
          900: '#152a45',
          950: '#0c1a2c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
