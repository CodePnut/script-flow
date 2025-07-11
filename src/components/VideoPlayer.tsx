'use client'

import dynamic from 'next/dynamic'
import React, { forwardRef, useImperativeHandle, useRef } from 'react'

import { cn } from '@/lib/utils'

// Dynamically import ReactPlayer to avoid SSR issues
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false })

/**
 * Video player ref interface for external control
 * Exposes methods needed for transcript interaction
 */
export interface VideoPlayerRef {
  seekTo: (seconds: number) => void
  getCurrentTime: () => number
  getDuration: () => number
  getInternalPlayer: () => unknown
}

/**
 * VideoPlayer component props interface
 */
interface VideoPlayerProps {
  /** YouTube video ID */
  videoId: string
  /** Custom className for styling */
  className?: string
  /** Callback when player is ready */
  onReady?: () => void
  /** Callback when playback progress updates */
  onProgress?: (state: { playedSeconds: number }) => void
  /** Callback when video starts playing */
  onPlay?: () => void
  /** Callback when video is paused */
  onPause?: () => void
  /** Callback when video ends */
  onEnded?: () => void
  /** Callback when seek operation completes */
  onSeek?: (seconds: number) => void
  /** Whether to show player controls */
  controls?: boolean
  /** Whether to start playing automatically */
  playing?: boolean
  /** Volume level (0-1) */
  volume?: number
  /** Playback rate (0.5x, 1x, 1.25x, etc.) */
  playbackRate?: number
}

/**
 * VideoPlayer Component
 *
 * Responsive video player wrapper around react-player with YouTube support
 *
 * Features:
 * - YouTube video integration
 * - Ref forwarding for external control
 * - Responsive sizing
 * - Progress tracking for transcript sync
 * - Seek functionality for timestamp navigation
 * - Customizable controls and playback options
 */
export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  (
    {
      videoId,
      className,
      onReady,
      onProgress,
      onPlay,
      onPause,
      onEnded,
      onSeek,
      controls = true,
      playing = false,
      volume = 0.8,
      playbackRate = 1,
    },
    ref,
  ) => {
    const playerRef = useRef<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any

    // Expose player methods through ref
    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        if (playerRef.current) {
          playerRef.current.seekTo(seconds, 'seconds')
          onSeek?.(seconds)
        }
      },

      getCurrentTime: () => {
        return playerRef.current?.getCurrentTime() || 0
      },

      getDuration: () => {
        return playerRef.current?.getDuration() || 0
      },

      getInternalPlayer: () => {
        return playerRef.current?.getInternalPlayer()
      },
    }))

    // Generate YouTube URL from video ID
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`

    return (
      <div className={cn('relative w-full', className)}>
        {/* Responsive container with 16:9 aspect ratio */}
        <div className="relative w-full pb-[56.25%] h-0 overflow-hidden rounded-lg bg-muted">
          {/* Cast to any to bypass type issues - will refactor types later */}
          {React.createElement(ReactPlayer as any, {  // eslint-disable-line @typescript-eslint/no-explicit-any
            ref: playerRef,
            url: videoUrl,
            width: '100%',
            height: '100%',
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
            },
            playing,
            controls,
            volume,
            playbackRate,
            onReady,
            onProgress,
            onPlay,
            onPause,
            onEnded,
          })}
        </div>

        {/* Player controls overlay for custom styling if needed */}
        <div className="absolute inset-0 pointer-events-none rounded-lg ring-1 ring-border/10" />
      </div>
    )
  },
)

VideoPlayer.displayName = 'VideoPlayer'

/**
 * VideoPlayer variants for common use cases
 */
export const VideoPlayerVariants = {
  /** Compact player for smaller viewports */
  Compact: (props: Omit<VideoPlayerProps, 'className'>) => (
    <VideoPlayer {...props} className="max-w-md" />
  ),

  /** Full-width responsive player */
  Responsive: (props: Omit<VideoPlayerProps, 'className'>) => (
    <VideoPlayer {...props} className="w-full" />
  ),

  /** Player optimized for transcript viewing */
  Transcript: (props: Omit<VideoPlayerProps, 'className' | 'controls'>) => (
    <VideoPlayer
      {...props}
      className="w-full lg:sticky lg:top-4"
      controls={true}
    />
  ),
}
