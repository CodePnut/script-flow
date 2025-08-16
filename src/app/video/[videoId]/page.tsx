'use client'

import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ExternalLink,
  Share2,
  AlertCircle,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Eye,
  EyeOff,
} from 'lucide-react'
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
import { getVideo, handleAPIError } from '@/lib/api'
import type { VideoData } from '@/lib/transcript'
import { normalizeVideoId } from '@/lib/transcript'
import { formatDate } from '@/lib/utils'

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
  const [showControls, setShowControls] = useState(true)

  /**
   * Load video data on mount
   */
  useEffect(() => {
    const loadVideoData = async () => {
      try {
        setLoading(true)
        setError(null)

        const data = await getVideo(videoId)

        if (!data) {
          setError('Video not found')
          return
        }

        setVideoData(data)
      } catch (err) {
        setError(handleAPIError(err))
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
    console.log('VideoViewer - Timestamp clicked:', seconds)
    if (!videoPlayerRef.current) {
      console.error('VideoViewer - videoPlayerRef.current is null!')
      return
    }

    videoPlayerRef.current?.seekTo(seconds)
  }

  /**
   * Handle video player state changes
   */
  const handlePlay = () => setIsPlaying(true)
  const handlePause = () => setIsPlaying(false)

  /**
   * Video control functions
   */
  const togglePlayPause = () => {
    if (!videoPlayerRef.current) {
      console.warn('Video player ref not available')
      return
    }

    try {
      // Since react-youtube doesn't expose play/pause directly,
      // we'll use the internal player
      const internalPlayer = videoPlayerRef.current.getInternalPlayer() as {
        pauseVideo?: () => void
        playVideo?: () => void
      }
      if (
        internalPlayer &&
        typeof internalPlayer.pauseVideo === 'function' &&
        typeof internalPlayer.playVideo === 'function'
      ) {
        if (isPlaying) {
          internalPlayer.pauseVideo()
        } else {
          internalPlayer.playVideo()
        }
      } else {
        console.warn('Internal player not ready or missing methods')
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error)
    }
  }

  const seekBackward = () => {
    if (!videoPlayerRef.current) return
    const newTime = Math.max(0, currentTime - 10)
    videoPlayerRef.current.seekTo(newTime)
  }

  const seekForward = () => {
    if (!videoPlayerRef.current) return
    const duration = videoPlayerRef.current.getDuration()
    const newTime = Math.min(duration, currentTime + 10)
    videoPlayerRef.current.seekTo(newTime)
  }

  /**
   * Share functionality
   */
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: videoData?.title || 'Video Transcript',
          text: 'Check out this video transcript',
          url: window.location.href,
        })
      } else {
        await navigator.clipboard.writeText(window.location.href)
        // You could add a toast notification here
      }
    } catch (error) {
      console.error('Failed to share:', error)
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
              <div className="relative">
                <VideoPlayer
                  ref={videoPlayerRef}
                  videoId={videoId}
                  onProgress={handleProgress}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  playing={isPlaying}
                  className="w-full"
                />

                {/* Custom video controls overlay */}
                {showControls && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={seekBackward}
                          className="text-white hover:bg-white/20"
                        >
                          <SkipBack className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={togglePlayPause}
                          className="text-white hover:bg-white/20"
                        >
                          {isPlaying ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={seekForward}
                          className="text-white hover:bg-white/20"
                        >
                          <SkipForward className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowControls(!showControls)}
                          className="text-white hover:bg-white/20"
                        >
                          {showControls ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

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
                        Generated: {formatDate(videoData.metadata.generatedAt)}
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
                maxParagraphLength={300}
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
                <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1">
                  <TabsTrigger
                    value="summary"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all duration-200"
                  >
                    📊 Summary
                  </TabsTrigger>
                  <TabsTrigger
                    value="chapters"
                    className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm transition-all duration-200"
                  >
                    📖 Chapters
                  </TabsTrigger>
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
                    topics={videoData.metadata.topics}
                    keyPoints={videoData.metadata.keyPoints}
                    confidence={videoData.metadata.summaryConfidence}
                    summaryStyle={videoData.metadata.summaryStyle}
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
