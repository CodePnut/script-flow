'use client'

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { motion } from 'framer-motion'
import { ArrowUpDown, ExternalLink, Eye, Trash2, Share2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { useHistoryStore, type VideoHistoryItem } from '@/hooks/useHistoryStore'
import { deleteTranscript } from '@/lib/api'
import { cn } from '@/lib/utils'

import { Button } from './ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'
import { useToast } from './ui/use-toast'

/**
 * Extended video history item for API responses
 */
interface ApiVideoHistoryItem extends VideoHistoryItem {
  description?: string
  duration?: number
  language?: string
  status?: string
  thumbnailUrl?: string
  updatedAt?: Date | string
}

/**
 * TranscriptTable component props
 */
interface TranscriptTableProps {
  className?: string
  data?: {
    items: ApiVideoHistoryItem[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNextPage: boolean
      hasPreviousPage: boolean
    }
    meta?: {
      userHash: string
      timestamp: string
    }
  } | null // Server-side data from history API
  loading?: boolean
  error?: string | null
  onPageChange?: (page: number) => void
  currentPage?: number
}

/**
 * Format duration in seconds to human readable format
 */
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

/**
 * Format date to relative time string
 */
function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const dateObj = typeof date === 'string' ? new Date(date) : date

  // Handle invalid dates
  if (isNaN(dateObj.getTime())) {
    return 'Unknown date'
  }

  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 2592000)
    return `${Math.floor(diffInSeconds / 86400)}d ago`

  return dateObj.toLocaleDateString()
}

/**
 * TranscriptTable Component
 *
 * Interactive table displaying transcript history with sorting and actions
 *
 * Features:
 * - Sortable columns (Title, Date, Duration)
 * - Row actions (View, Share, Delete)
 * - Responsive design (table on desktop, cards on mobile)
 * - Empty state handling
 * - Smooth animations
 */
export function TranscriptTable({
  className,
  data,
  loading = false,
  error = null,
  onPageChange,
  currentPage = 1,
}: TranscriptTableProps) {
  const { history, removeFromHistory } = useHistoryStore()
  const [sorting, setSorting] = useState<SortingState>([])
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  // Handle delete transcript
  const handleDelete = async (transcriptId: string, title: string) => {
    if (deletingIds.has(transcriptId)) return // Prevent double-clicks

    setDeletingIds((prev) => new Set([...prev, transcriptId]))

    try {
      await deleteTranscript(transcriptId)

      // Remove from client-side store if using it
      if (!useServerData) {
        removeFromHistory(transcriptId)
      }

      toast({
        title: 'Transcript Deleted',
        description: `"${title}" has been deleted successfully.`,
      })

      // Refresh data if using server-side data
      if (useServerData && onPageChange) {
        onPageChange(currentPage)
      }
    } catch (error) {
      console.error('Failed to delete transcript:', error)
      toast({
        title: 'Delete Failed',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to delete transcript',
        variant: 'destructive',
      })
    } finally {
      setDeletingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(transcriptId)
        return newSet
      })
    }
  }

  // Use server-side data if provided, otherwise fall back to client-side store
  const useServerData = data !== undefined
  const items: ApiVideoHistoryItem[] = useServerData
    ? data?.items || []
    : history.map((item) => ({ ...item, duration: 0 }))

  // Define table columns
  const columns: ColumnDef<ApiVideoHistoryItem>[] = [
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-semibold hover:bg-transparent"
        >
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('title')}</div>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-semibold hover:bg-transparent"
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-muted-fg">
          {formatRelativeTime(row.getValue('createdAt'))}
        </div>
      ),
      sortingFn: (rowA, rowB) => {
        const dateA = rowA.getValue('createdAt') as Date
        const dateB = rowB.getValue('createdAt') as Date
        return dateA.getTime() - dateB.getTime()
      },
    },
    {
      accessorKey: 'duration',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-semibold hover:bg-transparent"
        >
          Duration
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const duration = row.getValue('duration') as number
        return (
          <div className="text-muted-fg">
            {duration ? formatDuration(duration) : 'Unknown'}
          </div>
        )
      },
      sortingFn: (rowA, rowB) => {
        const durationA = (rowA.getValue('duration') as number) || 0
        const durationB = (rowB.getValue('duration') as number) || 0
        return durationA - durationB
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const video = row.original

        const handleShare = async () => {
          try {
            await navigator.share({
              title: video.title,
              text: `Check out this video transcript: ${video.title}`,
              url: `${window.location.origin}/video/${video.videoId}`,
            })
          } catch {
            // Fallback to clipboard
            await navigator.clipboard.writeText(
              `${window.location.origin}/video/${video.videoId}`,
            )
          }
        }

        return (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/video/${video.videoId || ''}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>

            <Button variant="ghost" size="sm" asChild>
              <Link
                href={
                  video.url ||
                  `https://www.youtube.com/watch?v=${video.videoId}`
                }
                target="_blank"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>

            <Button variant="ghost" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(video.id, video.title)}
              disabled={deletingIds.has(video.id)}
              className="text-destructive hover:text-destructive disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  })

  // Show loading state
  if (loading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle>Your Transcripts</CardTitle>
          <CardDescription>Loading your transcripts...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-fg">Loading transcripts...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show error state
  if (error) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle>Your Transcripts</CardTitle>
          <CardDescription>Error loading transcripts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="text-destructive">
              <p className="text-lg font-medium mb-2">
                Failed to load transcripts
              </p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show empty state if no history
  if (items.length === 0) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle>Your Transcripts</CardTitle>
          <CardDescription>
            Your transcribed videos will appear here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="text-muted-fg">
              <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No transcripts yet</p>
              <p className="text-sm">Start by transcribing your first video</p>
            </div>
            <Button asChild className="mt-4">
              <Link href="/transcribe">Get Started</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle>Your Transcripts</CardTitle>
        <CardDescription>
          {useServerData
            ? `${data?.pagination?.total || 0} video${(data?.pagination?.total || 0) !== 1 ? 's' : ''} transcribed`
            : `${items.length} video${items.length !== 1 ? 's' : ''} transcribed`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Desktop Table */}
        <div className="hidden md:block">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row, index) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
          {history.map((video, index) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-sm leading-tight">
                      {video.title}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromHistory(video.id)}
                      className="text-destructive hover:text-destructive p-1 h-auto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-fg mb-3">
                    <span>{formatRelativeTime(video.createdAt)}</span>
                    <span>•</span>
                    <span>
                      {formatDuration(
                        (video as ApiVideoHistoryItem).duration || 0,
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/video/${video.videoId || ''}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </Button>

                    <Button variant="ghost" size="sm" asChild>
                      <Link
                        href={
                          video.url ||
                          `https://www.youtube.com/watch?v=${video.videoId}`
                        }
                        target="_blank"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        YouTube
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
