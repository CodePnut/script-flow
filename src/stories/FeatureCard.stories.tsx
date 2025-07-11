import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { FileText, Search, BookOpen, Zap, Play, Clock } from 'lucide-react'

import { FeatureCard } from '@/components/FeatureCard'

const meta: Meta<typeof FeatureCard> = {
  title: 'Components/FeatureCard',
  component: FeatureCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    icon: {
      description: 'React node representing the icon for the feature',
      control: false,
    },
    title: {
      description: 'The title of the feature',
      control: 'text',
    },
    description: {
      description: 'The description of the feature',
      control: 'text',
    },
    className: {
      description: 'Additional CSS classes',
      control: 'text',
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    icon: <FileText className="h-6 w-6" />,
    title: 'Instant Transcription',
    description:
      'Convert any YouTube video into accurate, searchable text transcripts powered by advanced AI technology.',
  },
}

export const SmartSearch: Story = {
  args: {
    icon: <Search className="h-6 w-6" />,
    title: 'Smart Search',
    description:
      'Find specific moments in videos instantly with intelligent search that understands context and meaning.',
  },
}

export const Summary: Story = {
  args: {
    icon: <BookOpen className="h-6 w-6" />,
    title: 'AI Summaries',
    description:
      'Get concise summaries and key takeaways from long videos, saving you time and improving comprehension.',
  },
}

export const Performance: Story = {
  args: {
    icon: <Zap className="h-6 w-6" />,
    title: 'Lightning Fast',
    description:
      'Advanced processing engines deliver transcripts in seconds, not minutes.',
  },
}

export const Interactive: Story = {
  args: {
    icon: <Play className="h-6 w-6" />,
    title: 'Interactive Player',
    description:
      'Navigate through videos with timestamp-synced transcripts and seamless playback.',
  },
}

export const Timestamps: Story = {
  args: {
    icon: <Clock className="h-6 w-6" />,
    title: 'Time Stamps',
    description:
      'Every line of text is linked to the exact moment in the video for precise navigation.',
  },
}

export const LongContent: Story = {
  args: {
    icon: <FileText className="h-6 w-6" />,
    title: 'Feature with Very Long Title That Might Wrap',
    description:
      'This is a feature card with a very long description that demonstrates how the component handles longer content. It should wrap gracefully and maintain proper spacing and alignment throughout the card. The text should remain readable and the card should maintain its visual hierarchy.',
  },
}

export const Grid: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl">
      <FeatureCard
        icon={<FileText className="h-6 w-6" />}
        title="Instant Transcription"
        description="Convert any YouTube video into accurate, searchable text transcripts powered by advanced AI technology."
      />
      <FeatureCard
        icon={<Search className="h-6 w-6" />}
        title="Smart Search"
        description="Find specific moments in videos instantly with intelligent search that understands context and meaning."
      />
      <FeatureCard
        icon={<BookOpen className="h-6 w-6" />}
        title="AI Summaries"
        description="Get concise summaries and key takeaways from long videos, saving you time and improving comprehension."
      />
    </div>
  ),
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story:
          'Feature cards displayed in a responsive grid layout as they would appear on the landing page.',
      },
    },
  },
}
