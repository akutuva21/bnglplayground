export default {
  darkMode: 'class',
  content: [
    './index.html',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './VisualizationPanel.tsx',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#21808D',
          50: '#eff8fa',
          100: '#dcf0f3',
          200: '#bfe3e9',
          300: '#93d1db',
          400: '#60b8c6',
          500: '#3fa1af',
          600: '#2f8b98',
          700: '#29727e',
          800: '#285b65',
          900: '#254e56',
          950: '#163138',
        },
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.3s ease-out forwards',
      },
    },
  },
  plugins: [],
};
