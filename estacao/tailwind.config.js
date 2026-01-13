export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    fontFamily: {
      // Usa a variável CSS do next/font para evitar duplicação de fontes
      sans: ['var(--font-fira-sans)', 'system-ui', 'arial', 'sans-serif'],
      'fira-sans': ['var(--font-fira-sans)', 'system-ui', 'arial', 'sans-serif'],
    },
    extend: {
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'loading-bar': 'loading-bar 1s linear infinite',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'loading-bar': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(calc(100% + 100%))' },
        },
      },
    },
  },
  plugins: [],
};