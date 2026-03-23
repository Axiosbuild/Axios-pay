/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        green: {
          900: '#0A2318',
          800: '#0F3524',
          700: '#164D32',
          600: '#1A5C3D',
          500: '#237A52',
          400: '#2D9E6B',
          300: '#50BC88',
          200: '#7DCCA8',
          100: '#B8E8D0',
          50: '#EBF9F2',
        },
        gold: {
          700: '#92620A',
          600: '#C8860A',
          500: '#E09820',
          400: '#F0A832',
          300: '#F5C050',
          200: '#F5C96B',
          100: '#FAE0A8',
          50: '#FEF6E4',
        },
        neutral: {
          950: '#080808',
          900: '#0D0D0D',
          800: '#1A1A1A',
          700: '#2A2A2A',
          600: '#3D3D3D',
          500: '#5A5A5A',
          400: '#7A7A7A',
          300: '#9A9A9A',
          200: '#E0E0D8',
          100: '#EEEEEA',
          50: '#F7F7F4',
        },
      },
      fontFamily: {
        display: ['Clash Display', 'sans-serif'],
        body: ['Cabinet Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out forwards',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'ticker': 'ticker 30s linear infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite',
        'countdown': 'countdown 30s linear forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        countdown: {
          '0%': { strokeDashoffset: '0' },
          '100%': { strokeDashoffset: '283' },
        },
      },
    },
  },
  plugins: [],
};
