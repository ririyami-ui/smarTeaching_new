/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Enable dark mode
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'chart-container-glass',
    'chart-glow-purple',
    'chart-glow-orange',
    'chart-glow-blue',
    'glass-icon-container',
    'glass-glow-indigo',
    'glass-glow-blue',
    'glass-glow-yellow',
    'glass-glow-green',
    'glass-glow-red',
    'welcome-glass',
    'animate-welcome-float',
    'animate-fade-in-up',
    'custom-scrollbar',
    'rpp-prose',
    'font-carakan',
    'stagger-entry',
    'animate-pulse-glow-head',
    'animate-shimmer',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366F1', // Indigo 500 (Vibrant)
          '50': '#EEF2FF',
          '100': '#E0E7FF',
          '200': '#C7D2FE',
          '300': '#A5B4FC',
          '400': '#818CF8',
          '500': '#6366F1',
          '600': '#4F46E5',
          '700': '#4338CA',
          '800': '#3730A3',
          '900': '#312E81',
          '950': '#1E1B4B',
        },
        secondary: {
          DEFAULT: '#10B981', // Emerald 500
          '50': '#ECFDF5',
          '100': '#D1FAE5',
          '200': '#A7F3D0',
          '300': '#6EE7B7',
          '400': '#34D399',
          '500': '#10B981',
          '600': '#059669',
          '700': '#047857',
          '800': '#065F46',
          '900': '#064E3B',
          '950': '#022C22',
        },
        ai: {
          indigo: '#6366F1',
          purple: '#A855F7',
          pink: '#EC4899',
        },
        background: {
          light: '#F8FAFC', // Slate 50 (Cleaner)
          dark: '#0F172A',  // Slate 900 (Deep, modern)
        },
        surface: {
          light: '#FFFFFF',
          dark: '#1E293B',  // Slate 800
        },
        text: {
          light: '#0F172A', // Slate 900
          dark: '#F1F5F9',  // Slate 100
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        orbitron: ['Orbitron', 'sans-serif'],
        dseg7classic: ['DSEG7Classic', 'monospace'],
        carakan: ['"Noto Sans Javanese"', 'serif'],
      },
      keyframes: {
        'pulse-yellow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(250, 204, 21, 0.7)' },
          '50%': { boxShadow: '0 0 0 8px rgba(250, 204, 21, 0)' },
        },
      },
      animation: {
        'pulse-yellow': 'pulse-yellow 2s infinite',
      },
    },
  },
  plugins: [],
}