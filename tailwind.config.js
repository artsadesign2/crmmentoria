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
    },
  },
  plugins: [],
};
