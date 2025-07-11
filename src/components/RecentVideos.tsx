'use client'

import { motion } from 'framer-motion'
import { Clock, ExternalLink, Trash2, Video } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { useHistoryStore, type VideoHistoryItem } from '@/hooks/useHistoryStore'
import { cn } from '@/lib/utils'
import { getThumbnailUrl } from '@/lib/youtube'

import { Button } from './ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card'

/**
 * RecentVideos component props interface
 */
interface RecentVideosProps {
  /** Maximum number of videos to display */
  limit?: number
  /** Custom className for styling */
  className?: string
  /** Whether to show remove buttons */
  showRemoveButtons?: boolean
  /** Callback when a video is removed */
  onVideoRemoved?: (videoId: string) => void
}

/**
 * Individual video item component
 */
interface VideoItemProps {
  item: VideoHistoryItem
  showRemoveButton: boolean
  onRemove: (id: string) => void
}

function VideoItem({ item, showRemoveButton, onRemove }: VideoItemProps) {
  // Format the creation date
  const formatDate = (date: Date) => {
    const now = new Date()
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    )

    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays}d ago`
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="group"
    >
      <Card className="overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-primary/5">
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Video thumbnail */}
            <div className="relative flex-shrink-0 w-20 h-15 rounded-md overflow-hidden bg-muted">
              <Image
                src={getThumbnailUrl(item.videoId)}
                alt={`${item.title} thumbnail`}
                width={80}
                height={60}
                className="object-cover w-full h-full"
                onError={(e) => {
                  // Fallback to placeholder if thumbnail fails to load
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  target.parentElement
                    ?.querySelector('.fallback-icon')
                    ?.classList.remove('hidden')
                }}
              />
              {/* Fallback icon */}
              <div className="fallback-icon hidden absolute inset-0 flex items-center justify-center bg-muted">
                <Video className="h-6 w-6 text-muted-fg" />
              </div>
            </div>

            {/* Video details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-fg truncate text-sm">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-fg">
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(new Date(item.createdAt))}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* View transcript link */}
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-8 w-8 p-0"
                  >
                    <Link href={`/video/${item.videoId}`}>
                      <ExternalLink className="h-3 w-3" />
                      <span className="sr-only">View transcript</span>
                    </Link>
                  </Button>

                  {/* Remove button */}
                  {showRemoveButton && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onRemove(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                      <span className="sr-only">Remove from history</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/**
 * RecentVideos Component
 *
 * Displays a list of recently transcribed videos from the history store
 *
 * Features:
 * - Displays video thumbnails, titles, and timestamps
 * - Links to view transcripts
 * - Option to remove videos from history
 * - Responsive layout
 * - Smooth animations
 * - Empty state handling
 */
export function RecentVideos({
  limit = 5,
  className,
  showRemoveButtons = true,
  onVideoRemoved,
}: RecentVideosProps) {
  const [isMounted, setIsMounted] = useState(false)
  const { getRecentVideos, removeFromHistory } = useHistoryStore()

  // Prevent hydration mismatch by only accessing store after client mount
  const recentVideos = isMounted ? getRecentVideos(limit) : []

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleRemove = (id: string) => {
    removeFromHistory(id)
    onVideoRemoved?.(id)
  }

  // Show loading state during hydration
  if (!isMounted) {
    return (
      <Card className={cn('', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Recent Videos
          </CardTitle>
          <CardDescription>
            Your recently transcribed videos will appear here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Video className="h-12 w-12 mx-auto text-muted-fg mb-4" />
            <p className="text-muted-fg text-sm">Loading recent videos...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (recentVideos.length === 0) {
    return (
      <Card className={cn('', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Recent Videos
          </CardTitle>
          <CardDescription>
            Your recently transcribed videos will appear here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Video className="h-12 w-12 mx-auto text-muted-fg mb-4" />
            <p className="text-muted-fg text-sm">
              No videos transcribed yet. Start by entering a YouTube URL above!
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Recent Videos
        </CardTitle>
        <CardDescription>
          {recentVideos.length} recent video
          {recentVideos.length !== 1 ? 's' : ''} transcribed
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentVideos.map((item) => (
            <VideoItem
              key={item.id}
              item={item}
              showRemoveButton={showRemoveButtons}
              onRemove={handleRemove}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
