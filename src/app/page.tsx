import { FileText, Search, Play, Zap, Clock, BookOpen } from 'lucide-react'

import { FeatureCard } from '@/components/FeatureCard'
import { Hero } from '@/components/Hero'
import { URLForm } from '@/components/URLForm'

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <Hero />

      {/* Features Section */}
      <section className="py-24 md:py-32 bg-bg/50">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-fg mb-6">
              Transform Your Video Experience
            </h2>
            <p className="text-lg text-fg/70 leading-relaxed">
              Unlock the full potential of YouTube content with our AI-powered
              transcription and analysis tools.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
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
        </div>
      </section>

      {/* URL Form Section */}
      <section className="py-24 md:py-32 bg-gradient-to-b from-bg/50 to-bg">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-fg mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-fg/70 mb-12">
              Paste a YouTube URL below and experience the future of video
              content analysis.
            </p>

            <URLForm className="max-w-2xl mx-auto" />
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="py-24 md:py-32 bg-bg/30">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-fg mb-6">
              Why Choose Script Flow?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Lightning Fast"
              description="Advanced processing engines deliver transcripts in seconds, not minutes."
            />
            <FeatureCard
              icon={<Play className="h-6 w-6" />}
              title="Interactive Player"
              description="Navigate through videos with timestamp-synced transcripts and seamless playback."
            />
            <FeatureCard
              icon={<Clock className="h-6 w-6" />}
              title="Time Stamps"
              description="Every line of text is linked to the exact moment in the video for precise navigation."
            />
          </div>
        </div>
      </section>
    </main>
  )
}
