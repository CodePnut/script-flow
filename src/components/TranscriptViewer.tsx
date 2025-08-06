'use client'

import { motion } from 'framer-motion'
import { Clock, Play, User, ScrollText, PauseCircle } from 'lucide-react'
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
  const [userActivityTimeout, setUserActivityTimeout] =
    useState<NodeJS.Timeout | null>(null)
  const [countdown, setCountdown] = useState(0)
  const [countdownInterval, setCountdownInterval] =
    useState<NodeJS.Timeout | null>(null)
  const isUserActiveRef = useRef(false)
  const lastMousePositionRef = useRef({ x: 0, y: 0 })

  // Find active segment based on current time
  useEffect(() => {
    const active = findActiveSegment(segments, currentTime)
    setActiveSegment(active)
  }, [segments, currentTime])

  // Handle user activity detection (mouse movement, scrolling, clicks)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleUserActivity = () => {
      // Only pause auto-scroll if it's currently enabled
      if (isAutoScrollEnabled && !isUserActiveRef.current) {
        setIsAutoScrollEnabled(false)
        isUserActiveRef.current = true

        // Clear existing timeout and countdown
        if (userActivityTimeout) {
          clearTimeout(userActivityTimeout)
        }
        if (countdownInterval) {
          clearInterval(countdownInterval)
        }

        // Start countdown from 10 seconds
        setCountdown(10)

        // Update countdown every second
        const interval = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              // Countdown finished - re-enable auto-scroll
              setIsAutoScrollEnabled(true)
              isUserActiveRef.current = false
              clearInterval(interval)
              setCountdownInterval(null)
              return 0
            }
            return prev - 1
          })
        }, 1000)

        setCountdownInterval(interval)

        // Backup timeout in case interval fails
        const timeout = setTimeout(() => {
          setIsAutoScrollEnabled(true)
          isUserActiveRef.current = false
          setCountdown(0)
          if (countdownInterval) {
            clearInterval(countdownInterval)
            setCountdownInterval(null)
          }
        }, 10000)

        setUserActivityTimeout(timeout)
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e
      const lastPos = lastMousePositionRef.current

      // Only trigger if mouse actually moved significantly (not just hovering)
      if (
        Math.abs(clientX - lastPos.x) > 5 ||
        Math.abs(clientY - lastPos.y) > 5
      ) {
        lastMousePositionRef.current = { x: clientX, y: clientY }
        handleUserActivity()
      }
    }

    const handleScroll = () => {
      handleUserActivity()
    }

    const handleClick = () => {
      handleUserActivity()
    }

    // Add listeners for various user activities
    container.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('click', handleClick, { passive: true })

    return () => {
      container.removeEventListener('scroll', handleScroll)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('click', handleClick)
      if (userActivityTimeout) {
        clearTimeout(userActivityTimeout)
      }
      if (countdownInterval) {
        clearInterval(countdownInterval)
      }
    }
  }, [userActivityTimeout, countdownInterval, isAutoScrollEnabled])

  // Auto-scroll to active segment (only when enabled and not user-scrolling)
  useEffect(() => {
    if (
      autoScroll &&
      isAutoScrollEnabled &&
      activeSegment &&
      containerRef.current &&
      !isUserActiveRef.current
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
