'use client'

import { motion } from 'framer-motion'
import { Database } from 'lucide-react'

import { TranscriptTable } from '@/components/TranscriptTable'

// Note: Metadata export is removed since this is now a client component
// TODO: Move metadata to a parent server component if needed

/**
 * Dashboard Page Component
 *
 * Displays user transcript history in a sortable table format
 *
 * Features:
 * - Sortable table with Title, Date, Duration, Actions columns
 * - Responsive design (table on desktop, cards on mobile)
 * - Empty state handling
 * - Smooth page transitions
 * - Row actions (View, Share, Delete)
 */
export default function DashboardPage() {
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <TranscriptTable />
        </motion.div>
      </div>
    </div>
  )
}
