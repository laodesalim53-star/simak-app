/** @type {import('tailwindcss').Config} */
// Warna dibaca dari variabel CSS (lihat src/index.css) supaya tiap tenant
// bisa punya palet sendiri tanpa mengubah kelas di halaman mana pun.
const v = (nama) => `rgb(var(--${nama}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: v('ink-950'),
          900: v('ink-900'),
          800: v('ink-800'),
          700: v('ink-700'),
        },
        brass: {
          400: v('brass-400'),
          500: v('brass-500'),
          600: v('brass-600'),
        },
        paper: v('paper'),
        sage: {
          500: v('sage-500'),
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 2px rgba(11,18,32,0.06), 0 8px 24px -8px rgba(11,18,32,0.12)',
      },
    },
  },
  plugins: [],
}
