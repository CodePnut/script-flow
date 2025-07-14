'use client'

import { motion } from 'framer-motion'
import { Download, Trash2, AlertTriangle } from 'lucide-react'
import { useState } from 'react'

import { useHistoryStore } from '@/hooks/useHistoryStore'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'

/**
 * DataExporter component props
 */
interface DataExporterProps {
  className?: string
}

/**
 * DataExporter Component
 *
 * Handles data export and management operations
 *
 * Features:
 * - Export history as JSON file
 * - Clear all data with confirmation dialog
 * - Visual feedback for actions
 * - Error handling for download failures
 */
export function DataExporter({ className }: DataExporterProps) {
  const { history, exportHistory, clearAllHistory } = useHistoryStore()
  const [isExporting, setIsExporting] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)

  /**
   * Export history data as JSON file
   */
  const handleExportData = async () => {
    try {
      setIsExporting(true)

      // Get JSON data from store
      const jsonData = exportHistory()

      // Create blob and download
      const blob = new Blob([jsonData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      // Create temporary download link
      const link = document.createElement('a')
      link.href = url
      link.download = `scriptflow-history-${new Date().toISOString().split('T')[0]}.json`

      // Trigger download
      document.body.appendChild(link)
      link.click()

      // Cleanup
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  /**
   * Clear all history data with confirmation
   */
  const handleClearAllData = () => {
    clearAllHistory()
    setShowClearDialog(false)
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle>Data Management</CardTitle>
        <CardDescription>
          Export your data or clear all stored information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Export Data Section */}
          <div className="space-y-3">
            <div>
              <h3 className="font-medium mb-1">Export Data</h3>
              <p className="text-sm text-muted-fg">
                Download your transcript history as a JSON file
              </p>
            </div>

            <Button
              onClick={handleExportData}
              disabled={isExporting || history.length === 0}
              className="w-full sm:w-auto"
            >
              {isExporting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="mr-2"
                >
                  <Download className="h-4 w-4" />
                </motion.div>
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isExporting ? 'Exporting...' : 'Export JSON'}
            </Button>

            {history.length === 0 && (
              <p className="text-xs text-muted-fg">
                No data to export. Transcribe some videos first.
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Clear Data Section */}
          <div className="space-y-3">
            <div>
              <h3 className="font-medium mb-1 text-destructive">Danger Zone</h3>
              <p className="text-sm text-muted-fg">
                Permanently delete all your transcript history
              </p>
            </div>

            <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={history.length === 0}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All Data
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Clear All Data
                  </DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete all your transcript history?
                    This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>

                <div className="bg-destructive/10 p-3 rounded-lg">
                  <p className="text-sm text-destructive">
                    This will permanently delete:
                  </p>
                  <ul className="text-sm text-destructive mt-2 space-y-1">
                    <li>• All {history.length} transcribed videos</li>
                    <li>• All timestamps and navigation data</li>
                    <li>• All usage statistics</li>
                  </ul>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowClearDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleClearAllData}>
                    Yes, Delete All
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {history.length === 0 && (
              <p className="text-xs text-muted-fg">No data to clear.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
