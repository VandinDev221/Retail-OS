import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#090A0F',
        surface: '#12141D',
        'surface-card': '#181B26',
        'surface-border': '#262B3D',
        primary: {
          50: '#FBF8EE',
          100: '#F6F0D8',
          200: '#EDE0B0',
          300: '#E2CC81',
          400: '#D4B44F',
          500: '#C29B27', // Dourado Retail OS
          600: '#A47E1D',
          700: '#7E5E19',
          800: '#614819',
          900: '#4F3A19',
        },
      },
    },
  },
  plugins: [],
};

export default config;
