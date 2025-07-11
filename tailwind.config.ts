import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Standardized particle system colors
        'particle-blue': 'rgb(59 130 246 / <alpha-value>)',
        'particle-purple': 'rgb(147 51 234 / <alpha-value>)',
        'particle-green': 'rgb(34 197 94 / <alpha-value>)',
        'particle-violet': 'rgb(168 85 247 / <alpha-value>)',
        'particle-pink': 'rgb(236 72 153 / <alpha-value>)',
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-in-out',
        'slide-down': 'slide-down 0.2s ease-out',
        'slide-up': 'slide-up 0.2s ease-out',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
