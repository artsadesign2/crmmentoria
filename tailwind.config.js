/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'theme-primary': 'var(--primary-color)',
        'theme-glow': 'var(--primary-glow)',
        'theme-surface': 'var(--theme-surface)',
        'theme-bg': 'var(--theme-bg)',
        'theme-border': 'var(--theme-border)',
        'theme-text-primary': 'var(--theme-text-primary)',
        'theme-text-secondary': 'var(--theme-text-secondary)',
        'theme-badge-bg': 'var(--theme-badge-bg)',
        'theme-badge-text': 'var(--theme-badge-text)',
        'theme-badge-border': 'var(--theme-badge-border)',
        background: '#0B0F17',
        surface: '#131926',
        surfaceBorder: '#1F293D',
        gold: {
          50: '#FFFBEA',
          100: '#FFF3C4',
          200: '#FFE585',
          300: '#FFD346',
          400: '#FFBE1A',
          500: '#EAB308',
          600: '#CA8A04',
          700: '#A16207',
        },
      },
      boxShadow: {
        'theme-glow': '0 10px 30px -10px var(--primary-glow)',
        'theme-hover': '0 8px 25px -5px var(--primary-glow)',
      },
    },
  },
  plugins: [],
};
