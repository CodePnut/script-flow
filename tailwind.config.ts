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
        bg: 'var(--color-bg)',
        fg: 'var(--color-fg)',
        accent: 'var(--color-accent)',
        accent_fg: 'var(--color-accent-fg)',
        muted: 'var(--color-muted)',
        muted_fg: 'var(--color-muted-fg)',
        border: 'var(--color-border)',
        input: 'var(--color-input)',
        ring: 'var(--color-ring)',
        primary: 'var(--color-primary)',
        primary_fg: 'var(--color-primary-fg)',
        secondary: 'var(--color-secondary)',
        secondary_fg: 'var(--color-secondary-fg)',
        destructive: 'var(--color-destructive)',
        destructive_fg: 'var(--color-destructive-fg)',
        card: 'var(--color-card)',
        card_fg: 'var(--color-card-fg)',
        popover: 'var(--color-popover)',
        popover_fg: 'var(--color-popover-fg)',
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
