'use client'

import { motion } from 'framer-motion'
import { ChevronDown, ChevronRight, Play, BookOpen, Clock } from 'lucide-react'
import { useState } from 'react'

import type { VideoChapter } from '@/lib/transcript'
import { formatTimestamp } from '@/lib/transcript'
import { cn } from '@/lib/utils'

import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

/**
 * ChapterList component props interface
 */
interface ChapterListProps {
  /** Array of video chapters */
  chapters: VideoChapter[]
  /** Current playback time in seconds */
  currentTime?: number
  /** Callback when user clicks a chapter */
  onChapterClick?: (startTime: number) => void
  /** Custom className for styling */
  className?: string
  /** Whether chapters are collapsible */
  collapsible?: boolean
  /** Whether to show progress bars */
  showProgress?: boolean
}

/**
 * Individual chapter item component
 */
interface ChapterItemProps {
  chapter: VideoChapter
  isActive: boolean
  progress: number
  onChapterClick?: (startTime: number) => void
  index: number
}

function ChapterItem({
  chapter,
  isActive,
  progress,
  onChapterClick,
  index,
}: ChapterItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const duration = chapter.end - chapter.start
  const formattedDuration = formatTimestamp(duration)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.1,
        ease: [0.4, 0, 0.2, 1],
      }}
      className={cn(
        'group relative rounded-lg border transition-all duration-300',
        isActive
          ? 'bg-primary/5 border-primary/20 shadow-sm'
          : 'bg-card border-border/10 hover:bg-muted/30 hover:border-border/20',
      )}
    >
      {/* Chapter header */}
      <div className="flex items-center gap-3 p-4">
        {/* Chapter number */}
        <div
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
            isActive
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-fg group-hover:bg-primary/10 group-hover:text-primary',
          )}
        >
          {index + 1}
        </div>

        {/* Chapter info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3
              className={cn(
                'font-semibold text-sm truncate',
                isActive ? 'text-primary' : 'text-fg',
              )}
            >
              {chapter.title}
            </h3>

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

          <div className="flex items-center gap-2 text-xs text-muted-fg">
            <Clock className="h-3 w-3" />
            <span>{formatTimestamp(chapter.start)}</span>
            <span>•</span>
            <span>{formattedDuration}</span>
          </div>
        </div>

        {/* Expand/collapse button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'h-8 w-8 p-0 text-muted-fg hover:text-primary',
            chapter.description ? 'visible' : 'invisible',
          )}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>

        {/* Play button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChapterClick?.(chapter.start)}
          className="h-8 w-8 p-0 text-muted-fg hover:text-primary"
        >
          <Play className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress bar */}
      {progress > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted rounded-b-lg overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress * 100, 100)}%` }}
            transition={{ duration: 0.5 }}
            className="h-full bg-primary"
          />
        </div>
      )}

      {/* Expanded description */}
      {isExpanded && chapter.description && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="px-4 pb-4"
        >
          <div className="pt-2 border-t border-border/10">
            <p className="text-sm text-muted-fg leading-relaxed">
              {chapter.description}
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

/**
 * Calculate chapter progress based on current time
 */
function calculateChapterProgress(
  chapter: VideoChapter,
  currentTime: number,
): number {
  if (currentTime < chapter.start) return 0
  if (currentTime >= chapter.end) return 1

  const chapterDuration = chapter.end - chapter.start
  const elapsed = currentTime - chapter.start

  return elapsed / chapterDuration
}

/**
 * Find active chapter based on current time
 */
function findActiveChapter(
  chapters: VideoChapter[],
  currentTime: number,
): VideoChapter | null {
  return (
    chapters.find(
      (chapter) => currentTime >= chapter.start && currentTime < chapter.end,
    ) || null
  )
}

/**
 * ChapterList Component
 *
 * Interactive chapter navigation with progress tracking
 *
 * Features:
 * - Clickable chapter navigation
 * - Active chapter highlighting
 * - Progress bars for each chapter
 * - Expandable descriptions
 * - Staggered animations
 * - Responsive design
 */
export function ChapterList({
  chapters,
  currentTime = 0,
  onChapterClick,
  className,
  collapsible = true,
  showProgress = true,
}: ChapterListProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const activeChapter = findActiveChapter(chapters, currentTime)
  const totalDuration =
    chapters.length > 0 ? chapters[chapters.length - 1].end : 0

  if (chapters.length === 0) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Chapters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto text-muted-fg mb-4" />
            <p className="text-muted-fg">
              No chapters available for this video.
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
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Chapters
          </CardTitle>

          {collapsible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-muted-fg hover:text-primary"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-fg">
          <span>{chapters.length} chapters</span>
          <span>•</span>
          <span>{formatTimestamp(totalDuration)} total</span>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent>
          <div className="space-y-3">
            {chapters.map((chapter, index) => (
              <ChapterItem
                key={chapter.id}
                chapter={chapter}
                isActive={activeChapter?.id === chapter.id}
                progress={
                  showProgress
                    ? calculateChapterProgress(chapter, currentTime)
                    : 0
                }
                onChapterClick={onChapterClick}
                index={index}
              />
            ))}
          </div>

          {/* Chapter navigation summary */}
          <div className="mt-6 pt-4 border-t border-border/10">
            <div className="flex items-center justify-between text-xs text-muted-fg">
              <span>
                {activeChapter
                  ? `Playing: ${activeChapter.title}`
                  : 'No active chapter'}
              </span>

              <span>
                {formatTimestamp(currentTime)} /{' '}
                {formatTimestamp(totalDuration)}
              </span>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

/**
 * ChapterList variants for different use cases
 */
export const ChapterListVariants = {
  /** Compact chapters for smaller spaces */
  Compact: (props: Omit<ChapterListProps, 'className' | 'showProgress'>) => (
    <ChapterList {...props} className="max-h-96" showProgress={false} />
  ),

  /** Full chapters with progress */
  Detailed: (props: Omit<ChapterListProps, 'className'>) => (
    <ChapterList {...props} className="h-full" showProgress={true} />
  ),

  /** Sidebar chapters for split layouts */
  Sidebar: (props: Omit<ChapterListProps, 'className' | 'collapsible'>) => (
    <ChapterList
      {...props}
      className="h-full sticky top-0"
      collapsible={false}
    />
  ),
}
