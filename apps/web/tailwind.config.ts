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
        brand: {
          amber: '#C8772A',
          gold: '#E8A54B',
          bg: '#FDF3E3',
        },
        navy: {
          DEFAULT: '#1A2332',
          medium: '#2C3A50',
        },
        page: '#F9F7F4',
        surface: '#FFFFFF',
        subtle: '#F2EFE9',
        border: '#E5E1DA',
        success: '#1A7A4A',
        error: '#C0392B',
        text: {
          primary: '#1A2332',
          secondary: '#5A6474',
          muted: '#9AA3AE',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
      },
    },
  },
  plugins: [],
};

export default config;
