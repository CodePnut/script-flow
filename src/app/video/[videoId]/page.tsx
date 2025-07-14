'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, Share2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { useEffect, useRef, useState, use } from 'react'

import { ChapterList } from '@/components/ChapterList'
import { SummaryCard } from '@/components/SummaryCard'
import { TranscriptViewer } from '@/components/TranscriptViewer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { VideoPlayer, type VideoPlayerRef } from '@/components/VideoPlayer'
import { fetchMockVideoData } from '@/lib/mockData'
import type { VideoData } from '@/lib/transcript'
import { normalizeVideoId } from '@/lib/transcript'

/**
 * Video viewer page props
 */
interface VideoViewerPageProps {
  params: Promise<{
    videoId: string
  }>
}

/**
 * Video viewer page component
 */
export default function VideoViewerPage({ params }: VideoViewerPageProps) {
  const { videoId: rawVideoId } = use(params)

  // Normalize video ID from URL
  const videoId = normalizeVideoId(rawVideoId)

  return <VideoViewerContent videoId={videoId} />
}

/**
 * Video viewer content component (client-side)
 */
function VideoViewerContent({ videoId }: { videoId: string }) {
  const videoPlayerRef = useRef<VideoPlayerRef>(null)
  const [videoData, setVideoData] = useState<VideoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  /**
   * Load video data on mount
   */
  useEffect(() => {
    const loadVideoData = async () => {
      try {
        setLoading(true)
        setError(null)

        const data = await fetchMockVideoData(videoId)

        if (!data) {
          setError('Video not found')
          return
        }

        setVideoData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load video')
      } finally {
        setLoading(false)
      }
    }

    loadVideoData()
  }, [videoId])

  /**
   * Handle video player progress updates
   */
  const handleProgress = (state: { playedSeconds: number }) => {
    setCurrentTime(state.playedSeconds)
  }

  /**
   * Handle timestamp clicks from transcript/chapters
   */
  const handleTimestampClick = (seconds: number) => {
    videoPlayerRef.current?.seekTo(seconds)
  }

  /**
   * Handle video player state changes
   */
  const handlePlay = () => setIsPlaying(true)
  const handlePause = () => setIsPlaying(false)

  /**
   * Share video functionality
   */
  const handleShare = async () => {
    try {
      await navigator.share({
        title: videoData?.title || 'Video',
        text: videoData?.summary || 'Check out this video',
        url: window.location.href,
      })
    } catch {
      // Fallback to clipboard
      await navigator.clipboard.writeText(window.location.href)
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-fg">Loading video...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error || !videoData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="max-w-md w-full">
              <CardContent className="p-6 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                <h2 className="text-xl font-semibold mb-2">Video Not Found</h2>
                <p className="text-muted-fg mb-4">
                  {error || "The video you're looking for doesn't exist."}
                </p>
                <Button asChild>
                  <Link href="/">Return Home</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (!videoData) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/10"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Link>
              </Button>

              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold truncate">
                  {videoData.title}
                </h1>
                <p className="text-sm text-muted-fg">
                  {videoData.metadata.source} •{' '}
                  {videoData.metadata.language.toUpperCase()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>

              <Button variant="ghost" size="sm" asChild>
                <Link
                  href={`https://www.youtube.com/watch?v=${videoId}`}
                  target="_blank"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  YouTube
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Video player column */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-3"
          >
            <div className="space-y-6">
              {/* Video player */}
              <VideoPlayer
                ref={videoPlayerRef}
                videoId={videoId}
                onProgress={handleProgress}
                onPlay={handlePlay}
                onPause={handlePause}
                playing={isPlaying}
                className="w-full"
              />

              {/* Video metadata */}
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-semibold mb-2">
                        {videoData.title}
                      </h2>
                      <p className="text-muted-fg leading-relaxed">
                        {videoData.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-fg">
                      <span>
                        Generated:{' '}
                        {videoData.metadata.generatedAt.toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span>Source: {videoData.metadata.source}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transcript section */}
              <TranscriptViewer
                segments={videoData.transcript}
                currentTime={currentTime}
                onTimestampClick={handleTimestampClick}
              />
            </div>
          </motion.div>

          {/* Sidebar column */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="space-y-6">
              {/* Summary and chapters tabs */}
              <Tabs defaultValue="summary" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="chapters">Chapters</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="mt-6">
                  <SummaryCard
                    summary={videoData.summary}
                    metadata={{
                      title: videoData.title,
                      duration: videoData.duration,
                      generatedAt: videoData.metadata.generatedAt,
                      source: videoData.metadata.source,
                      language: videoData.metadata.language,
                    }}
                  />
                </TabsContent>

                <TabsContent value="chapters" className="mt-6">
                  <ChapterList
                    chapters={videoData.chapters}
                    currentTime={currentTime}
                    onChapterClick={handleTimestampClick}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
