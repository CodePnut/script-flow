'use client'

import { motion } from 'framer-motion'
import {
  Clock,
  Play,
  User,
  ScrollText,
  PauseCircle,
  FileText,
  Download,
  Copy,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type { TranscriptSegment } from '@/lib/transcript'
import {
  findActiveSegment,
  formatTimestamp,
  groupSegmentsIntoParagraphs,
} from '@/lib/transcript'
import { cn } from '@/lib/utils'

import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { useToast } from './ui/use-toast'

/**
 * TranscriptViewer component props interface
 */
interface TranscriptViewerProps {
  /** Array of transcript segments to display */
  segments: TranscriptSegment[]
  /** Current playback time in seconds */
  currentTime?: number
  /** Callback when user clicks a timestamp */
  onTimestampClick?: (seconds: number) => void
  /** Custom className for styling */
  className?: string
  /** Whether to auto-scroll to active segment */
  autoScroll?: boolean
  /** Maximum characters per paragraph grouping */
  maxParagraphLength?: number
}

/**
 * Individual transcript paragraph component
 */
interface TranscriptParagraphProps {
  segments: TranscriptSegment[]
  activeSegmentId?: string
  onTimestampClick?: (seconds: number) => void
  index: number
}

function TranscriptParagraph({
  segments,
  activeSegmentId,
  onTimestampClick,
  index,
}: TranscriptParagraphProps) {
  const isActive = segments.some((segment) => segment.id === activeSegmentId)

  // Get speaker for this paragraph (all segments should have same speaker)
  const speaker = segments[0]?.speaker

  // Calculate paragraph start time
  const startTime = segments[0]?.start || 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: [0.4, 0, 0.2, 1],
      }}
      className={cn(
        'group relative rounded-lg p-4 transition-all duration-300 border',
        isActive
          ? 'bg-primary/5 border-primary/20 shadow-sm'
          : 'bg-card border-border/5 hover:bg-muted/30',
      )}
    >
      {/* Speaker and timestamp header */}
      <div className="flex items-center gap-3 mb-3">
        {speaker && (
          <div className="flex items-center gap-2 text-xs text-muted-fg">
            <User className="h-3 w-3" />
            <span className="font-medium">{speaker}</span>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-fg hover:text-primary transition-colors"
          onClick={() => onTimestampClick?.(startTime)}
        >
          <Clock className="h-3 w-3 mr-1" />
          {formatTimestamp(startTime)}
        </Button>

        {isActive && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1 text-xs text-primary"
          >
            <Play className="h-3 w-3 fill-current" />
            <span className="font-medium">Playing</span>
          </motion.div>
        )}
      </div>

      {/* Transcript text with clickable segments */}
      <div className="space-y-1">
        {segments.map((segment, segmentIndex) => (
          <span key={segment.id} className="inline">
            <Button
              variant="ghost"
              className={cn(
                'h-auto p-0 font-normal text-left leading-relaxed inline whitespace-normal',
                'hover:bg-primary/10 hover:text-primary transition-colors',
                segment.id === activeSegmentId
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-fg',
              )}
              onClick={() => onTimestampClick?.(segment.start)}
            >
              {segment.text}
            </Button>
            {segmentIndex < segments.length - 1 && ' '}
          </span>
        ))}
      </div>

      {/* Confidence indicator (if available) */}
      {segments[0]?.confidence && (
        <div className="mt-2 text-xs text-muted-fg">
          Confidence: {Math.round(segments[0].confidence * 100)}%
        </div>
      )}
    </motion.div>
  )
}

/**
 * TranscriptViewer Component
 *
 * Interactive transcript viewer with clickable timestamps and active highlighting
 *
 * Features:
 * - Clickable timestamps for video navigation
 * - Active segment highlighting during playback
 * - Auto-scroll to follow video progress
 * - Grouped paragraphs for better readability
 * - Speaker identification
 * - Framer Motion staggered animations
 * - Responsive design
 */
export function TranscriptViewer({
  segments,
  currentTime = 0,
  onTimestampClick,
  className,
  autoScroll = true,
  maxParagraphLength = 200,
}: TranscriptViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeSegment, setActiveSegment] = useState<TranscriptSegment | null>(
    null,
  )
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(autoScroll)
  const [countdown, setCountdown] = useState(0)
  const [isFullTextDialogOpen, setIsFullTextDialogOpen] = useState(false)
  const lastMousePositionRef = useRef({ x: 0, y: 0 })
  const { toast } = useToast()

  // Internal timers/refs so we can reset without causing re-renders
  const reenableTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pauseUntilRef = useRef<number | null>(null)

  // Find active segment based on current time
  useEffect(() => {
    const active = findActiveSegment(segments, currentTime)
    setActiveSegment(active)
  }, [segments, currentTime])

  // Handle user activity detection (mouse/touch/scroll/wheel/click)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const startOrExtendPause = () => {
      // Set to paused immediately and extend pause window on each activity
      if (reenableTimeoutRef.current) {
        clearTimeout(reenableTimeoutRef.current)
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }

      const PAUSE_MS = 10_000
      pauseUntilRef.current = Date.now() + PAUSE_MS
      setIsAutoScrollEnabled(false)

      // Countdown updater (visual only)
      setCountdown(Math.ceil(PAUSE_MS / 1000))
      countdownIntervalRef.current = setInterval(() => {
        if (!pauseUntilRef.current) {
          setCountdown(0)
          return
        }
        const remainingMs = Math.max(0, pauseUntilRef.current - Date.now())
        const remainingSec = Math.ceil(remainingMs / 1000)
        setCountdown(remainingSec)
        if (remainingMs <= 0) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current)
            countdownIntervalRef.current = null
          }
        }
      }, 250)

      // Timer to re-enable when no activity for PAUSE_MS
      reenableTimeoutRef.current = setTimeout(() => {
        setIsAutoScrollEnabled(true)
        setCountdown(0)
        pauseUntilRef.current = null
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current)
          countdownIntervalRef.current = null
        }
      }, PAUSE_MS)
    }

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e
      const lastPos = lastMousePositionRef.current
      if (
        Math.abs(clientX - lastPos.x) > 5 ||
        Math.abs(clientY - lastPos.y) > 5
      ) {
        lastMousePositionRef.current = { x: clientX, y: clientY }
        startOrExtendPause()
      }
    }

    const handleScrollOrWheel = () => startOrExtendPause()
    const handleClick = () => startOrExtendPause()
    const handleTouch = () => startOrExtendPause()

    // Add listeners for various user activities
    container.addEventListener('scroll', handleScrollOrWheel, { passive: true })
    window.addEventListener('scroll', handleScrollOrWheel, { passive: true })
    window.addEventListener('wheel', handleScrollOrWheel, { passive: true })
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('click', handleClick, { passive: true })
    window.addEventListener('touchstart', handleTouch, { passive: true })
    window.addEventListener('touchmove', handleTouch, { passive: true })

    return () => {
      container.removeEventListener('scroll', handleScrollOrWheel)
      window.removeEventListener('scroll', handleScrollOrWheel)
      window.removeEventListener('wheel', handleScrollOrWheel)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('click', handleClick)
      window.removeEventListener('touchstart', handleTouch)
      window.removeEventListener('touchmove', handleTouch)
      if (reenableTimeoutRef.current) {
        clearTimeout(reenableTimeoutRef.current)
        reenableTimeoutRef.current = null
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
    }
  }, [])

  // Auto-scroll to active segment (only when enabled and not user-scrolling)
  useEffect(() => {
    if (
      autoScroll &&
      isAutoScrollEnabled &&
      activeSegment &&
      containerRef.current
    ) {
      const activeElement = containerRef.current.querySelector(
        `[data-segment-id="${activeSegment.id}"]`,
      )

      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }
    }
  }, [activeSegment, autoScroll, isAutoScrollEnabled])

  // Group segments into paragraphs for better readability
  const paragraphs = groupSegmentsIntoParagraphs(segments, maxParagraphLength)

  /**
   * Generate full transcript text from segments
   */
  const generateFullText = () => {
    return segments
      .map((segment) => segment.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Download transcript as text file
   */
  const downloadTranscript = () => {
    const fullText = generateFullText()
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `transcript-${Date.now()}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast({
      title: 'Download Complete',
      description: 'Transcript downloaded successfully',
      variant: 'default',
    })
  }

  /**
   * Copy transcript to clipboard
   */
  const copyToClipboard = async () => {
    try {
      const fullText = generateFullText()
      await navigator.clipboard.writeText(fullText)

      toast({
        title: 'Copied to Clipboard',
        description: 'Full transcript copied successfully',
        variant: 'default',
      })
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      toast({
        title: 'Copy Failed',
        description: 'Unable to copy to clipboard',
        variant: 'destructive',
      })
    }
  }

  if (segments.length === 0) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Transcript
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Clock className="h-12 w-12 mx-auto text-muted-fg mb-4" />
            <p className="text-muted-fg">
              No transcript available for this video.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Interactive Transcript
            </CardTitle>
            <p className="text-sm text-muted-fg">
              Click any text to jump to that moment in the video
            </p>
            {!isAutoScrollEnabled && countdown > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Auto-scroll resumes in {countdown}s
              </p>
            )}
          </div>

          {/* Auto-scroll status and actions */}
          <div className="flex items-center gap-3">
            {/* Full text dialog trigger */}
            <Dialog
              open={isFullTextDialogOpen}
              onOpenChange={setIsFullTextDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Full Text
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col bg-background/95 backdrop-blur-sm border-2 shadow-2xl z-[100]">
                <DialogHeader className="pb-4 border-b border-border/20">
                  <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                    <FileText className="h-5 w-5 text-primary" />
                    Complete Transcript
                  </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-auto p-6 bg-background border-2 border-border/20 rounded-lg shadow-inner backdrop-blur-sm">
                  <div className="prose prose-sm max-w-none">
                    <p className="leading-relaxed text-base text-foreground whitespace-pre-wrap font-medium tracking-wide selection:bg-primary/20">
                      {generateFullText()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-border/20 bg-background">
                  <div className="text-sm text-muted-foreground font-medium">
                    {segments.length} segments •{' '}
                    {Math.ceil(generateFullText().length / 1000)}k characters
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyToClipboard}
                      className="flex items-center gap-2 hover:bg-muted transition-colors"
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>

                    <Button
                      variant="default"
                      size="sm"
                      onClick={downloadTranscript}
                      className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Auto-scroll status indicator */}
            <div className="flex items-center gap-2 text-xs">
              {isAutoScrollEnabled ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1 text-green-600 dark:text-green-400"
                >
                  <ScrollText className="h-3 w-3" />
                  <span>Auto-scroll</span>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1 text-amber-600 dark:text-amber-400"
                >
                  <PauseCircle className="h-3 w-3" />
                  <span>
                    {countdown > 0 ? `Paused (${countdown}s)` : 'Scroll paused'}
                  </span>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div
          ref={containerRef}
          className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
        >
          {paragraphs.map((paragraphSegments, index) => (
            <div
              key={paragraphSegments[0]?.id || index}
              data-segment-id={
                paragraphSegments.find((s) => s.id === activeSegment?.id)?.id
              }
            >
              <TranscriptParagraph
                segments={paragraphSegments}
                activeSegmentId={activeSegment?.id}
                onTimestampClick={onTimestampClick}
                index={index}
              />
            </div>
          ))}
        </div>

        {/* Transcript controls */}
        <div className="mt-4 pt-4 border-t border-border/10 flex items-center justify-between text-xs text-muted-fg">
          <span>
            {segments.length} segments •{' '}
            {formatTimestamp(segments[segments.length - 1]?.end || 0)} total
          </span>

          {activeSegment && (
            <span className="font-medium">
              Current: {formatTimestamp(currentTime)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * TranscriptViewer variants for different use cases
 */
export const TranscriptViewerVariants = {
  /** Compact transcript for smaller spaces */
  Compact: (
    props: Omit<TranscriptViewerProps, 'className' | 'maxParagraphLength'>,
  ) => (
    <TranscriptViewer
      {...props}
      className="max-h-96"
      maxParagraphLength={150}
    />
  ),

  /** Full-height transcript for main viewing */
  Full: (props: Omit<TranscriptViewerProps, 'className'>) => (
    <TranscriptViewer {...props} className="h-full min-h-[500px]" />
  ),

  /** Sidebar transcript for split layouts */
  Sidebar: (props: Omit<TranscriptViewerProps, 'className' | 'autoScroll'>) => (
    <TranscriptViewer
      {...props}
      className="h-screen sticky top-0"
      autoScroll={true}
    />
  ),
}
