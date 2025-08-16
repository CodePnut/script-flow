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
  Target,
  TrendingUp,
  Clock,
  BarChart3,
} from 'lucide-react'
import { useState } from 'react'

import { cn, formatDate } from '@/lib/utils'

import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { useToast } from './ui/use-toast'

/**
 * Summary style options (removed bullet as requested)
 */
export type SummaryStyle = 'brief' | 'detailed' | 'executive' | 'educational'

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
  /** AI-generated topics */
  topics?: string[]
  /** AI-generated key points */
  keyPoints?: string[]
  /** Summary confidence score (0-1) */
  confidence?: number
  /** Current summary style */
  summaryStyle?: SummaryStyle
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
  onRegenerate?: (style?: SummaryStyle) => void
}

/**
 * SummaryCard Component
 *
 * Displays AI-generated video summary with metadata, topics, and key points
 *
 * Features:
 * - Multiple summary styles (brief, detailed, executive, educational)
 * - AI-generated topics and key points
 * - Confidence scoring
 * - Copy to clipboard functionality
 * - Video metadata display
 * - Responsive design with improved tab indicators
 * - Hover effects and active states
 */
export function SummaryCard({
  summary,
  metadata,
  topics = [],
  keyPoints = [],
  confidence,
  summaryStyle = 'detailed',
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
  const [activeTab, setActiveTab] = useState('summary')
  const { toast } = useToast()

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
      toast({
        title: 'Summary Copied',
        description: 'Summary has been copied to your clipboard.',
      })
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy summary:', error)
      toast({
        title: 'Copy Failed',
        description: 'Could not copy summary to clipboard.',
        variant: 'destructive',
      })
    }
  }

  // Handle export functionality
  const handleExport = () => {
    if (onExport) {
      onExport()
    } else {
      toast({
        title: 'Export Not Available',
        description: 'Export functionality is not implemented yet.',
        variant: 'destructive',
      })
    }
  }

  // Handle share functionality
  const handleShare = async () => {
    if (onShare) {
      onShare()
    } else {
      try {
        if (navigator.share) {
          await navigator.share({
            title: metadata?.title || 'Video Summary',
            text: summary,
            url: window.location.href,
          })
        } else {
          await navigator.clipboard.writeText(window.location.href)
          toast({
            title: 'Link Copied',
            description: 'Video link has been copied to your clipboard.',
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

  // Handle regenerate functionality - now regenerates ALL content
  const handleRegenerate = async (style?: SummaryStyle) => {
    if (onRegenerate) {
      setIsRegenerating(true)
      try {
        await onRegenerate(style)
        toast({
          title: 'Content Regenerated',
          description: `Summary, topics, and key points have been regenerated in ${style || summaryStyle} style.`,
        })
      } catch {
        toast({
          title: 'Regeneration Failed',
          description: 'Could not regenerate content. Please try again.',
          variant: 'destructive',
        })
      } finally {
        setIsRegenerating(false)
      }
    } else {
      toast({
        title: 'Feature Not Available',
        description: 'Content regeneration is not implemented yet.',
        variant: 'destructive',
      })
    }
  }

  // Get confidence color and text
  const getConfidenceInfo = (conf: number) => {
    if (conf >= 0.8)
      return { color: 'text-green-600', text: 'High', icon: TrendingUp }
    if (conf >= 0.6)
      return { color: 'text-yellow-600', text: 'Medium', icon: Target }
    return { color: 'text-red-600', text: 'Low', icon: BarChart3 }
  }

  const confidenceInfo =
    confidence !== undefined ? getConfidenceInfo(confidence) : null

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI Summary
            {summaryStyle && (
              <span className="text-sm font-normal text-muted-foreground capitalize">
                ({summaryStyle})
              </span>
            )}
          </CardTitle>

          {showCopyButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {isCopied ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
          )}
        </div>

        {/* Confidence indicator */}
        {confidenceInfo && confidence !== undefined && (
          <div className="flex items-center gap-2 text-sm">
            <confidenceInfo.icon className="h-4 w-4" />
            <span className={confidenceInfo.color}>
              Confidence: {confidenceInfo.text} ({(confidence * 100).toFixed(0)}
              %)
            </span>
          </div>
        )}

        {/* Summary style selector - removed bullet */}
        {onRegenerate && (
          <div className="flex flex-wrap gap-2 pt-2">
            {(
              [
                'brief',
                'detailed',
                'executive',
                'educational',
              ] as SummaryStyle[]
            ).map((style) => (
              <Button
                key={style}
                variant={style === summaryStyle ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleRegenerate(style)}
                disabled={isRegenerating}
                className={cn(
                  'text-xs capitalize transition-all duration-200',
                  style === summaryStyle
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'hover:bg-primary/10 hover:border-primary/50',
                )}
              >
                {style === summaryStyle && (
                  <CheckCircle className="h-3 w-3 mr-1" />
                )}
                {style}
              </Button>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Enhanced Summary tabs with better indicators */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-lg">
            <TabsTrigger
              value="summary"
              className={cn(
                'text-xs font-medium transition-all duration-200 rounded-md',
                'data-[state=active]:bg-background data-[state=active]:text-foreground',
                'data-[state=active]:shadow-sm data-[state=active]:border',
                'hover:bg-background/50 hover:text-foreground/80',
                activeTab === 'summary' && 'ring-2 ring-primary/20',
              )}
            >
              📊 Summary
            </TabsTrigger>
            <TabsTrigger
              value="topics"
              className={cn(
                'text-xs font-medium transition-all duration-200 rounded-md',
                'data-[state=active]:bg-background data-[state=active]:text-foreground',
                'data-[state=active]:shadow-sm data-[state=active]:border',
                'hover:bg-background/50 hover:text-foreground/80',
                activeTab === 'topics' && 'ring-2 ring-primary/20',
              )}
            >
              🎯 Topics
            </TabsTrigger>
            <TabsTrigger
              value="keypoints"
              className={cn(
                'text-xs font-medium transition-all duration-200 rounded-md',
                'data-[state=active]:bg-background data-[state=active]:text-foreground',
                'data-[state=active]:shadow-sm data-[state=active]:border',
                'hover:bg-background/50 hover:text-foreground/80',
                activeTab === 'keypoints' && 'ring-2 ring-primary/20',
              )}
            >
              💡 Key Points
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-foreground leading-relaxed">
                  {displaySummary}
                </p>

                {shouldTruncate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="mt-2 text-primary hover:text-primary/80 transition-colors"
                  >
                    {isExpanded ? 'Show Less' : 'Read More'}
                  </Button>
                )}
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="topics" className="mt-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {topics.length > 0 ? (
                <div className="space-y-3">
                  {topics.map((topic, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer"
                    >
                      <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {index + 1}
                        </span>
                      </div>
                      <span className="text-foreground capitalize">
                        {topic.replace(/_/g, ' ')}
                      </span>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No topics identified yet.</p>
                  <p className="text-sm">
                    Try regenerating the summary to extract topics.
                  </p>
                </div>
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="keypoints" className="mt-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {keyPoints.length > 0 ? (
                <div className="space-y-3">
                  {keyPoints.map((point, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer"
                    >
                      <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-xs font-semibold text-primary">
                          •
                        </span>
                      </div>
                      <span className="text-foreground text-sm leading-relaxed">
                        {point}
                      </span>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No key points extracted yet.</p>
                  <p className="text-sm">
                    Try regenerating the summary to extract key points.
                  </p>
                </div>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Metadata section */}
        {showMetadata && metadata && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="pt-4 border-t border-border"
          >
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Summary Details
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Source:</span>
                <span className="capitalize">{metadata.source}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Duration:</span>
                <span>{Math.round(metadata.duration / 60)}m</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Generated:</span>
                <span>{formatDate(metadata.generatedAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Language:</span>
                <span className="uppercase">{metadata.language}</span>
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
            className="text-xs hover:bg-primary/10 hover:border-primary/50 transition-colors"
            onClick={handleExport}
          >
            <Download className="h-3 w-3 mr-1" />
            Export Summary
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs hover:bg-primary/10 hover:border-primary/50 transition-colors"
            onClick={handleShare}
          >
            <Share2 className="h-3 w-3 mr-1" />
            Share
          </Button>

          {onRegenerate && (
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'text-xs transition-colors',
                isRegenerating
                  ? 'bg-primary/10 border-primary/50'
                  : 'hover:bg-primary/10 hover:border-primary/50',
              )}
              onClick={() => handleRegenerate()}
              disabled={isRegenerating}
            >
              <RefreshCw
                className={cn('h-3 w-3 mr-1', isRegenerating && 'animate-spin')}
              />
              {isRegenerating ? 'Regenerating...' : 'Regenerate All'}
            </Button>
          )}
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
  Compact: (props: Omit<SummaryCardProps, 'className'>) => (
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
