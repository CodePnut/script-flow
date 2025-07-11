'use client'

import { motion } from 'framer-motion'
import { FileText, Play } from 'lucide-react'
import { useState } from 'react'

import { ProgressBarVariants } from '@/components/ProgressBar'
import { RecentVideos } from '@/components/RecentVideos'
import { useToast } from '@/components/ui/use-toast'
import { URLForm } from '@/components/URLForm'
import { useHistoryStore } from '@/hooks/useHistoryStore'
import { simulateTranscription } from '@/lib/transcription'
import { parseYouTubeUrl } from '@/lib/youtube'

/**
 * Transcribe Page Component
 *
 * Main transcription interface that allows users to:
 * - Submit YouTube URLs for transcription
 * - View transcription progress
 * - See recent transcription history
 * - Receive toast notifications
 *
 * Features:
 * - Form validation with Zod
 * - Progress tracking with animated progress bar
 * - History management with Zustand
 * - Toast notifications for user feedback
 * - Responsive design with animations
 */
export default function TranscribePage() {
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentUrl, setCurrentUrl] = useState('')

  const { addToHistory } = useHistoryStore()
  const { toast } = useToast()

  /**
   * Handle URL form submission
   * Validates URL, simulates transcription, and updates history
   */
  const handleUrlSubmit = async (url: string) => {
    try {
      // Validate and parse the YouTube URL
      const parsedUrl = parseYouTubeUrl(url)

      if (!parsedUrl) {
        toast({
          title: 'Invalid URL',
          description: 'Please enter a valid YouTube URL',
          variant: 'destructive',
        })
        return
      }

      // Set loading state
      setIsTranscribing(true)
      setProgress(0)
      setCurrentUrl(url)

      // Show start toast
      toast({
        title: 'Transcription Started',
        description: 'Processing your video for transcription...',
        variant: 'default',
      })

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + Math.random() * 10
        })
      }, 200)

      // Simulate transcription
      const result = await simulateTranscription(url)

      // Clear progress interval and set complete
      clearInterval(progressInterval)
      setProgress(100)

      // Add to history
      addToHistory({
        videoId: result.videoId,
        title: result.title,
        url: result.url,
      })

      // Show success toast
      toast({
        title: 'Transcription Complete!',
        description: `Successfully transcribed: ${result.title}`,
        variant: 'success',
      })

      // Reset state after a delay
      setTimeout(() => {
        setIsTranscribing(false)
        setProgress(0)
        setCurrentUrl('')
      }, 1500)
    } catch (error) {
      // Handle errors
      console.error('Transcription error:', error)

      toast({
        title: 'Transcription Failed',
        description:
          'An error occurred while processing your video. Please try again.',
        variant: 'destructive',
      })

      setIsTranscribing(false)
      setProgress(0)
      setCurrentUrl('')
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-8">
              <FileText className="w-8 h-8 text-primary" />
            </div>

            <h1 className="text-4xl font-bold text-fg mb-4">
              Transcribe YouTube Videos
            </h1>

            <p className="text-xl text-fg/70 mb-12 max-w-2xl mx-auto">
              Transform any YouTube video into an interactive, searchable
              transcript. Simply paste the URL and let us handle the rest.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Left Column - Form and Progress */}
            <div className="space-y-8">
              {/* URL Form */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div className="bg-card rounded-lg border shadow-sm p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Play className="w-6 h-6 text-primary" />
                    <h2 className="text-2xl font-semibold text-fg">
                      Enter Video URL
                    </h2>
                  </div>

                  <URLForm onSubmit={handleUrlSubmit} className="space-y-6" />
                </div>
              </motion.div>

              {/* Progress Section */}
              {isTranscribing && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="bg-card rounded-lg border shadow-sm p-8"
                >
                  <h3 className="text-lg font-semibold text-fg mb-4">
                    Processing Video
                  </h3>

                  <ProgressBarVariants.Transcription
                    progress={progress}
                    className="mb-4"
                  />

                  <div className="text-sm text-fg/60">
                    <p className="mb-2">Current video: {currentUrl}</p>
                    <p>
                      This process typically takes 1-3 minutes depending on
                      video length.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Feature Highlights */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="bg-card rounded-lg border shadow-sm p-8"
              >
                <h3 className="text-lg font-semibold text-fg mb-4">
                  What You&apos;ll Get
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-medium text-fg">
                        Interactive Transcript
                      </h4>
                      <p className="text-sm text-fg/70">
                        Click any word to jump to that moment in the video
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-medium text-fg">
                        Searchable Content
                      </h4>
                      <p className="text-sm text-fg/70">
                        Find specific topics or quotes instantly
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-medium text-fg">
                        Auto-Generated Chapters
                      </h4>
                      <p className="text-sm text-fg/70">
                        Navigate through key sections easily
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right Column - Recent Videos */}
            <div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <RecentVideos />
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
