'use client'

import { motion } from 'framer-motion'
import { Database } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'

import { DatabaseMonitor } from '@/components/DatabaseMonitor'
import { TranscriptTable } from '@/components/TranscriptTable'
import { useToast } from '@/components/ui/use-toast'
import { type VideoHistoryItem } from '@/hooks/useHistoryStore'
import { getHistory, handleAPIError } from '@/lib/api'

// Note: Metadata export is removed since this is now a client component
// TODO: Move metadata to a parent server component if needed

/**
 * Dashboard Page Component
 *
 * Displays user transcript history in a sortable table format
 *
 * Features:
 * - Server-side paginated data from history API
 * - Sortable table with Title, Date, Duration, Actions columns
 * - Responsive design (table on desktop, cards on mobile)
 * - Empty state handling
 * - Smooth page transitions
 * - Row actions (View, Share, Delete)
 * - Real-time data fetching with error handling
 */
export default function DashboardPage() {
  const [historyData, setHistoryData] = useState<{
    items: VideoHistoryItem[]
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
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const { toast } = useToast()

  /**
   * Fetch history data from API
   */
  const fetchHistory = useCallback(
    async (page: number = 1) => {
      try {
        setLoading(true)
        setError(null)

        const data = await getHistory(page, 10)
        setHistoryData(data)
        setCurrentPage(page)
      } catch (err) {
        const errorMessage = handleAPIError(err)
        setError(errorMessage)

        toast({
          title: 'Error Loading History',
          description: errorMessage,
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    },
    [toast],
  )

  /**
   * Load initial data on component mount
   */
  useEffect(() => {
    fetchHistory(1)
  }, [fetchHistory])

  /**
   * Handle page changes
   */
  const handlePageChange = (page: number) => {
    fetchHistory(page)
  }
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-fg">
                View and manage your transcribed videos
              </p>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-3"
          >
            <TranscriptTable
              data={historyData}
              loading={loading}
              error={error}
              onPageChange={handlePageChange}
              currentPage={currentPage}
            />
          </motion.div>

          {/* Sidebar with Monitoring Components */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-1 space-y-6"
          >
            <DatabaseMonitor />
          </motion.div>
        </div>
      </div>
    </div>
  )
}
