import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Hero } from '@/components/Hero'

const meta: Meta<typeof Hero> = {
  title: 'Components/Hero',
  component: Hero,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The main hero section with typewriter animation cycling through "Transcribe", "Summarise", and "Navigate".',
      },
    },
  },
}

export const LightMode: Story = {
  parameters: {
    backgrounds: {
      default: 'light',
    },
    docs: {
      description: {
        story: 'Hero component displayed in light mode.',
      },
    },
  },
}

export const DarkMode: Story = {
  parameters: {
    backgrounds: {
      default: 'dark',
    },
    docs: {
      description: {
        story: 'Hero component displayed in dark mode.',
      },
    },
  },
}
