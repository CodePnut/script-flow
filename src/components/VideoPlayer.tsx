'use client'

import dynamic from 'next/dynamic'
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

// Dynamically import YouTube component to avoid SSR issues
const YouTube = dynamic(() => import('react-youtube'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-muted">
      Loading player...
    </div>
  ),
})

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
 * Responsive video player wrapper around react-youtube
 * Provides reliable YouTube video playback and seeking
 */
export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  (
    {
      videoId,
      className,
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
    const youtubeRef = useRef<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any
    const [playerError, setPlayerError] = useState<string | null>(null)
    const [isPlayerReady, setIsPlayerReady] = useState(false)
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

    // Debug logging
    React.useEffect(() => {
      console.log('VideoPlayer mounted for videoId:', videoId)
      console.log('VideoPlayer isPlayerReady:', isPlayerReady)
      console.log('VideoPlayer youtubeRef.current:', youtubeRef.current)
    }, [videoId, isPlayerReady])

    // YouTube player options
    const opts = {
      height: '100%',
      width: '100%',
      playerVars: {
        autoplay: playing ? 1 : 0,
        controls: controls ? 1 : 0,
        modestbranding: 1,
        rel: 0,
        origin:
          typeof window !== 'undefined'
            ? window.location.origin
            : 'http://localhost:3000',
      },
    }

    // Expose player methods through ref
    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        console.log('VideoPlayer - Seeking to:', seconds)

        const attemptSeek = () => {
          if (youtubeRef.current && youtubeRef.current.internalPlayer) {
            const player = youtubeRef.current.internalPlayer

            try {
              // Check if player is ready
              if (typeof player.seekTo === 'function') {
                player.seekTo(seconds, true)
                console.log('VideoPlayer - Successfully seeked to:', seconds)
                onSeek?.(seconds)
                return true
              } else {
                console.warn('VideoPlayer - seekTo method not available yet')
                return false
              }
            } catch (error) {
              console.error('VideoPlayer - Seek error:', error)
              return false
            }
          }
          return false
        }

        // Try immediate seek
        if (attemptSeek()) {
          return
        }

        // If player not ready, wait and retry
        console.log('VideoPlayer - Player not ready, retrying in 100ms...')
        setTimeout(() => {
          if (!attemptSeek()) {
            // Final retry after 500ms
            setTimeout(() => {
              if (!attemptSeek()) {
                console.error('VideoPlayer - Failed to seek after retries')
              }
            }, 500)
          }
        }, 100)
      },

      getCurrentTime: () => {
        if (youtubeRef.current && youtubeRef.current.getCurrentTime) {
          try {
            return youtubeRef.current.getCurrentTime() || 0
          } catch (error) {
            console.error('VideoPlayer - getCurrentTime error:', error)
            return 0
          }
        }
        console.warn('VideoPlayer - getCurrentTime: player not available')
        return 0
      },

      getDuration: () => {
        if (youtubeRef.current && youtubeRef.current.getDuration) {
          try {
            return youtubeRef.current.getDuration() || 0
          } catch (error) {
            console.error('VideoPlayer - getDuration error:', error)
            return 0
          }
        }
        console.warn('VideoPlayer - getDuration: player not available')
        return 0
      },

      getInternalPlayer: () => {
        return youtubeRef.current?.internalPlayer || null
      },
    }))

    // Handle player ready
    const handleReady = (event: { target: unknown }) => {
      console.log('YouTube player ready')
      const player = event.target

      // Type the player properly
      const typedPlayer = player as {
        seekTo?: (seconds: number, allowSeekAhead?: boolean) => void
        getCurrentTime?: () => number
        getDuration?: () => number
        setVolume?: (volume: number) => void
        setPlaybackRate?: (rate: number) => void
      }

      // Validate that the player has the required methods
      if (!typedPlayer || typeof typedPlayer.seekTo !== 'function') {
        console.error('YouTube player is not properly initialized')
        setPlayerError('YouTube player initialization failed')
        return
      }

      // Store both the event target and create a proper ref structure
      youtubeRef.current = {
        internalPlayer: player,
        getCurrentTime: () => {
          try {
            return typedPlayer.getCurrentTime?.() || 0
          } catch {
            console.warn('getCurrentTime error')
            return 0
          }
        },
        getDuration: () => {
          try {
            return typedPlayer.getDuration?.() || 0
          } catch {
            console.warn('getDuration error')
            return 0
          }
        },
        seekTo: (seconds: number) => {
          try {
            return typedPlayer.seekTo?.(seconds, true)
          } catch {
            console.warn('seekTo error')
          }
        },
      }

      setIsPlayerReady(true)
      setPlayerError(null)

      // Set initial volume and playback rate
      try {
        if (volume !== undefined) {
          typedPlayer.setVolume?.(volume * 100)
        }
        if (playbackRate !== undefined) {
          typedPlayer.setPlaybackRate?.(playbackRate)
        }
      } catch {
        console.error('VideoPlayer - Error setting initial properties')
      }

      // Start progress tracking
      if (onProgress) {
        progressIntervalRef.current = setInterval(() => {
          if (youtubeRef.current && youtubeRef.current.getCurrentTime) {
            try {
              const currentTime = youtubeRef.current.getCurrentTime()
              onProgress({ playedSeconds: currentTime })
            } catch {
              // Ignore errors during progress tracking
            }
          }
        }, 100) // Update every 100ms
      }
    }

    // Handle player state change
    const handleStateChange = (event: { data: number }) => {
      const playerState = event.data

      // YouTube player states
      // -1: unstarted, 0: ended, 1: playing, 2: paused, 3: buffering, 5: cued
      switch (playerState) {
        case 1: // playing
          console.log('YouTube player playing')
          onPlay?.()
          break
        case 2: // paused
          console.log('YouTube player paused')
          onPause?.()
          break
        case 0: // ended
          console.log('YouTube player ended')
          onEnded?.()
          // Clear progress interval when video ends
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current)
            progressIntervalRef.current = null
          }
          break
      }
    }

    // Handle player error
    const handleError = (event: { data: number }) => {
      console.error('YouTube player error:', event.data)
      setPlayerError(`YouTube error: ${event.data}`)
      setIsPlayerReady(false)

      // Clear progress interval on error
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
    }

    // Cleanup on unmount
    React.useEffect(() => {
      return () => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
        }
      }
    }, [])

    return (
      <div className={cn('relative w-full', className)}>
        {/* Responsive container with 16:9 aspect ratio */}
        <div className="relative w-full pb-[56.25%] h-0 overflow-hidden rounded-lg bg-muted">
          {playerError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center p-4">
                <p className="text-destructive mb-2">Video failed to load</p>
                <p className="text-sm text-muted-fg">{playerError}</p>
                <button
                  onClick={() => setPlayerError(null)}
                  className="mt-2 px-3 py-1 text-sm bg-primary text-primary-foreground rounded"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0">
              <YouTube
                videoId={videoId}
                opts={opts}
                onReady={handleReady}
                onStateChange={handleStateChange}
                onError={handleError}
                className="w-full h-full"
              />
            </div>
          )}
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
