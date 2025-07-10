// Example Storybook story for ParticleBackground component
// To use this, install Storybook: npx storybook@latest init

import { ParticleBackground } from '@/components/ParticleBackground'
import { ThemeProvider } from '@/components/ThemeProvider'

// This would be the actual Storybook configuration when @storybook/react is installed
const ParticleBackgroundStories = {
  title: 'Components/ParticleBackground',
  component: ParticleBackground,
  parameters: {
    layout: 'fullscreen',
  },
}

export default ParticleBackgroundStories

// Light theme variant
export const Light = {
  render: () => (
    <ThemeProvider defaultTheme="light">
      <div className="h-screen w-full relative bg-white">
        <ParticleBackground />
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-black/20 backdrop-blur-sm rounded-lg p-8">
            <h2 className="text-2xl font-bold text-white">
              Particle Background - Light Mode
            </h2>
            <p className="text-white/80 mt-2">
              Subtle animated particles on light background
            </p>
          </div>
        </div>
      </div>
    </ThemeProvider>
  ),
}

// Dark theme variant
export const Dark = {
  render: () => (
    <ThemeProvider defaultTheme="dark">
      <div className="h-screen w-full relative bg-gray-900">
        <ParticleBackground />
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-8">
            <h2 className="text-2xl font-bold text-black">
              Particle Background - Dark Mode
            </h2>
            <p className="text-black/80 mt-2">
              Glowing animated particles on dark background
            </p>
          </div>
        </div>
      </div>
    </ThemeProvider>
  ),
}
