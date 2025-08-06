'use client'

import { motion } from 'framer-motion'
import {
  CheckCircle,
  Copy,
  FileText,
  Lightbulb,
  User,
  Calendar,
  Download,
  Share2,
  RefreshCw,
} from 'lucide-react'
import { useState } from 'react'

import { cn, formatDate } from '@/lib/utils'

import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { useToast } from './ui/use-toast'

/**
 * SummaryCard component props interface
 */
interface SummaryCardProps {
  /** Main summary text */
  summary: string
  /** Video metadata for context */
  metadata?: {
    title: string
    duration: number
    generatedAt: Date | string
    source: string
    language: string
  }
  /** Custom className for styling */
  className?: string
  /** Whether to show metadata section */
  showMetadata?: boolean
  /** Whether to show copy button */
  showCopyButton?: boolean
  /** Callback for export functionality */
  onExport?: () => void
  /** Callback for share functionality */
  onShare?: () => void
  /** Callback for regenerate functionality */
  onRegenerate?: () => void
}

/**
 * Key points interface for structured summaries
 */
interface KeyPoint {
  title: string
  description: string
  timestamp?: number
}

/**
 * Extract key points from summary text
 * Simple implementation - in production would use AI
 */
function extractKeyPoints(summary: string): KeyPoint[] {
  // Split by sentences and take first few as key points
  const sentences = summary.split('. ').filter((s) => s.length > 20)

  return sentences.slice(0, 3).map((sentence, index) => ({
    title: `Key Point ${index + 1}`,
    description: sentence.endsWith('.') ? sentence : sentence + '.',
  }))
}

/**
 * Format duration from seconds to readable string
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

/**
 * SummaryCard Component
 *
 * Displays AI-generated video summary with metadata and copy functionality
 *
 * Features:
 * - Clean summary display
 * - Key points extraction
 * - Copy to clipboard functionality
 * - Video metadata display
 * - Responsive design
 * - Smooth animations
 */
export function SummaryCard({
  summary,
  metadata,
  className,
  showMetadata = true,
  showCopyButton = true,
  onExport,
  onShare,
  onRegenerate,
}: SummaryCardProps) {
  const [isCopied, setIsCopied] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const { toast } = useToast()

  // Extract key points from summary
  const keyPoints = extractKeyPoints(summary)

  // Determine if summary should be truncated
  const shouldTruncate = summary.length > 300
  const displaySummary =
    shouldTruncate && !isExpanded ? summary.slice(0, 300) + '...' : summary

  /**
   * Copy summary to clipboard
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy summary:', error)
    }
  }

  // Handle export functionality
  const handleExport = () => {
    if (onExport) {
      onExport()
    } else {
      // Default export functionality
      const exportData = {
        title: metadata?.title || 'Video Summary',
        summary,
        keyPoints,
        metadata,
        exportedAt: new Date().toISOString(),
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${metadata?.title?.replace(/[^a-z0-9]/gi, '_') || 'summary'}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: 'Summary Exported',
        description: 'Summary has been downloaded as a JSON file.',
      })
    }
  }

  // Handle share functionality
  const handleShare = async () => {
    if (onShare) {
      onShare()
    } else {
      // Default share functionality
      const shareText = `${metadata?.title || 'Video Summary'}\n\n${summary}`

      try {
        if (navigator.share) {
          await navigator.share({
            title: metadata?.title || 'Video Summary',
            text: shareText,
            url: window.location.href,
          })
        } else {
          // Fallback to clipboard
          await navigator.clipboard.writeText(shareText)
          toast({
            title: 'Summary Copied',
            description: 'Summary has been copied to clipboard.',
          })
        }
      } catch (error) {
        console.error('Failed to share summary:', error)
        toast({
          title: 'Share Failed',
          description: 'Could not share the summary. Please try again.',
          variant: 'destructive',
        })
      }
    }
  }

  // Handle regenerate functionality
  const handleRegenerate = async () => {
    if (onRegenerate) {
      setIsRegenerating(true)
      try {
        await onRegenerate()
        toast({
          title: 'Summary Regenerated',
          description: 'A new summary has been generated.',
        })
      } catch (error) {
        toast({
          title: 'Regeneration Failed',
          description: 'Could not regenerate summary. Please try again.',
          variant: 'destructive',
        })
      } finally {
        setIsRegenerating(false)
      }
    } else {
      // Show not implemented message
      toast({
        title: 'Feature Not Available',
        description: 'Summary regeneration is not implemented yet.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          AI Summary
        </CardTitle>

        {showCopyButton && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="text-muted-fg hover:text-primary"
            >
              {isCopied ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main summary text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-fg leading-relaxed">{displaySummary}</p>

            {shouldTruncate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 text-primary hover:text-primary/80"
              >
                {isExpanded ? 'Show Less' : 'Read More'}
              </Button>
            )}
          </div>
        </motion.div>

        {/* Key points section */}
        {keyPoints.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h3 className="text-sm font-semibold text-fg mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Key Points
            </h3>

            <div className="space-y-3">
              {keyPoints.map((point, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                  className="flex gap-3 p-3 rounded-lg bg-muted/30 border border-border/10"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-fg leading-relaxed">
                      {point.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Metadata section */}
        {showMetadata && metadata && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="pt-4 border-t border-border/10"
          >
            <h3 className="text-sm font-semibold text-fg mb-3">
              Summary Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-fg">
                <FileText className="h-4 w-4" />
                <span>Duration: {formatDuration(metadata.duration)}</span>
              </div>

              <div className="flex items-center gap-2 text-muted-fg">
                <User className="h-4 w-4" />
                <span>Source: {metadata.source}</span>
              </div>

              <div className="flex items-center gap-2 text-muted-fg">
                <Calendar className="h-4 w-4" />
                <span>Generated: {formatDate(metadata.generatedAt)}</span>
              </div>

              <div className="flex items-center gap-2 text-muted-fg">
                <Lightbulb className="h-4 w-4" />
                <span>Language: {metadata.language.toUpperCase()}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-wrap gap-2 pt-2"
        >
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={handleExport}
          >
            <Download className="h-3 w-3 mr-1" />
            Export Summary
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={handleShare}
          >
            <Share2 className="h-3 w-3 mr-1" />
            Share
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={handleRegenerate}
            disabled={isRegenerating}
          >
            <RefreshCw
              className={cn('h-3 w-3 mr-1', isRegenerating && 'animate-spin')}
            />
            Regenerate
          </Button>
        </motion.div>
      </CardContent>
    </Card>
  )
}

/**
 * SummaryCard variants for different use cases
 */
export const SummaryCardVariants = {
  /** Compact summary for smaller spaces */
  Compact: (props: Omit<SummaryCardProps, 'className' | 'showMetadata'>) => (
    <SummaryCard {...props} className="max-h-96" showMetadata={false} />
  ),

  /** Full summary with all metadata */
  Detailed: (props: Omit<SummaryCardProps, 'className'>) => (
    <SummaryCard {...props} className="h-full" showMetadata={true} />
  ),

  /** Sidebar summary for split layouts */
  Sidebar: (props: Omit<SummaryCardProps, 'className' | 'showCopyButton'>) => (
    <SummaryCard
      {...props}
      className="h-full sticky top-0"
      showCopyButton={true}
    />
  ),
}
