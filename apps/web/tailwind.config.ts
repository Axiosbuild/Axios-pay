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
            amber: '#059669',
            gold: '#10B981',
            bg: '#ECFDF5',
          },
          navy: {
            DEFAULT: '#0F172A',
            medium: '#1E293B',
          },
          page: '#F8FAFC',
          surface: '#FFFFFF',
          subtle: '#F1F5F9',
          border: '#E2E8F0',
          success: '#059669',
          error: '#DC2626',
          text: {
            primary: '#0F172A',
            secondary: '#334155',
            muted: '#64748B',
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
