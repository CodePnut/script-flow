'use client'

import { motion } from 'framer-motion'
import { Clock, Trash2, Play } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { useHistoryStore } from '@/hooks/useHistoryStore'
import { cn } from '@/lib/utils'

import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

/**
 * Individual video item component
 */
interface VideoItemProps {
  video: {
    id: string
    videoId: string
    title: string
    thumbnailUrl: string
    timestamp: Date
  }
  index: number
  onRemove: (id: string) => void
}

function VideoItem({ video, index, onRemove }: VideoItemProps) {
  const formattedTime = new Intl.RelativeTimeFormat('en', {
    numeric: 'auto',
  }).format(
    Math.floor(
      (video.timestamp.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    ),
    'day',
  )

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="group relative"
    >
      <Link href={`/video/${video.videoId}`}>
        <Card className="hover:shadow-md transition-all duration-300 cursor-pointer border-border/50 hover:border-primary/20 hover:bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* Thumbnail */}
              <div className="relative flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                <Image
                  src={video.thumbnailUrl}
                  alt={`Thumbnail for ${video.title || 'video'}`}
                  width={120}
                  height={90}
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  unoptimized
                  onError={(e) => {
                    console.error(
                      'Thumbnail failed to load:',
                      video.thumbnailUrl,
                    )
                    console.error('Video ID:', video.videoId)
                    // Fallback to a different thumbnail quality
                    const target = e.target as HTMLImageElement
                    if (target.src.includes('mqdefault')) {
                      target.src = `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`
                    } else if (target.src.includes('hqdefault')) {
                      target.src = `https://img.youtube.com/vi/${video.videoId}/default.jpg`
                    }
                  }}
                  onLoad={() => {
                    console.log(
                      'Thumbnail loaded successfully:',
                      video.thumbnailUrl,
                    )
                  }}
                />
                {/* Play overlay */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <Play className="h-8 w-8 text-white fill-white" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                  {video.title}
                </h3>

                <div className="flex items-center gap-2 text-xs text-muted-fg">
                  <Clock className="h-3 w-3" />
                  <span>{formattedTime}</span>
                </div>
              </div>

              {/* Remove button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onRemove(video.id)
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto text-muted-fg hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}

/**
 * RecentVideos component props
 */
interface RecentVideosProps {
  className?: string
}

/**
 * RecentVideos Component
 *
 * Displays a list of recently transcribed videos with thumbnails and metadata
 *
 * Features:
 * - Clickable video items that navigate to video viewer
 * - Thumbnail display with hover effects
 * - Remove functionality
 * - Responsive layout
 * - Smooth animations
 * - Handles empty state
 */
export function RecentVideos({ className }: RecentVideosProps) {
  const { history, removeFromHistory } = useHistoryStore()
  const [isMounted, setIsMounted] = useState(false)

  // Handle client-side hydration
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Don't render until mounted to avoid hydration mismatch
  if (!isMounted) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle>Recent Videos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle>Recent Videos</CardTitle>
        <p className="text-sm text-muted-fg">
          {history.length > 0
            ? `${history.length} video${history.length !== 1 ? 's' : ''} transcribed`
            : 'No videos transcribed yet'}
        </p>
      </CardHeader>

      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-fg">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recent videos</p>
              <p className="text-xs mt-2">
                Your transcribed videos will appear here
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((video, index) => (
              <VideoItem
                key={video.id}
                video={{
                  id: video.id,
                  videoId: video.videoId,
                  title: video.title,
                  thumbnailUrl: `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`,
                  timestamp: video.createdAt,
                }}
                index={index}
                onRemove={removeFromHistory}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
