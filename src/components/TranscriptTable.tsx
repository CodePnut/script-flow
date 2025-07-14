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

/**
 * TranscriptTable component props
 */
interface TranscriptTableProps {
  className?: string
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
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 2592000)
    return `${Math.floor(diffInSeconds / 86400)}d ago`

  return date.toLocaleDateString()
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
export function TranscriptTable({ className }: TranscriptTableProps) {
  const { history, removeFromHistory } = useHistoryStore()
  const [sorting, setSorting] = useState<SortingState>([])

  // Define table columns
  const columns: ColumnDef<VideoHistoryItem>[] = [
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
      cell: () => (
        <div className="text-muted-fg">
          {formatDuration(180)} {/* Mock 3 minutes */}
        </div>
      ),
      sortingFn: () => 0, // Mock sorting since all durations are the same
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
              <Link href={`/video/${video.videoId}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>

            <Button variant="ghost" size="sm" asChild>
              <Link href={video.url} target="_blank">
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>

            <Button variant="ghost" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeFromHistory(video.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: history,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  })

  // Show empty state if no history
  if (history.length === 0) {
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
          {history.length} video{history.length !== 1 ? 's' : ''} transcribed
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
                    <span>{formatDuration(180)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/video/${video.videoId}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </Button>

                    <Button variant="ghost" size="sm" asChild>
                      <Link href={video.url} target="_blank">
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
