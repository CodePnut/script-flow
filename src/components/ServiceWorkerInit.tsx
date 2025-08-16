/**
 * Service Worker Initialization Component
 *
 * Handles service worker registration and provides user notifications
 * about offline functionality and app updates.
 *
 * Features:
 * - Automatic service worker registration
 * - Update notifications and prompts
 * - Offline functionality announcements
 * - Error handling and fallback
 */

'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
  initializeServiceWorker,
  serviceWorker,
  type ServiceWorkerStatus,
} from '@/lib/service-worker'

export function ServiceWorkerInit() {
  const [, setStatus] = useState<ServiceWorkerStatus>('unsupported')
  const [, setUpdateAvailable] = useState(false)

  useEffect(() => {
    // Initialize service worker
    initializeServiceWorker()

    // Set up event listeners
    const handleStatusChange = (...args: unknown[]) => {
      const newStatus = args[0] as ServiceWorkerStatus
      setStatus(newStatus)

      switch (newStatus) {
        case 'registered':
          toast.success('✅ Offline functionality enabled', {
            description:
              'You can now use ScriptFlow offline with cached content.',
            duration: 5000,
          })
          break
        case 'error':
          toast.error('❌ Offline functionality unavailable', {
            description:
              'Service worker registration failed. Some features may be limited.',
            duration: 5000,
          })
          break
      }
    }

    const handleUpdateAvailable = () => {
      setUpdateAvailable(true)
      toast.info('🔄 App update available', {
        description:
          'A new version of ScriptFlow is available. Refresh to update.',
        action: {
          label: 'Refresh',
          onClick: () => window.location.reload(),
        },
        duration: 10000,
      })
    }

    const handleOnline = () => {
      toast.success('🌐 Connection restored', {
        description: "You're back online. Queued actions will be processed.",
        duration: 3000,
      })
    }

    const handleOffline = () => {
      toast.warning("📡 You're offline", {
        description:
          'You can still view cached transcripts and queue new requests.',
        duration: 5000,
      })
    }

    const handleSyncSuccess = () => {
      toast.success('✅ Sync completed', {
        description: 'Queued actions have been processed successfully.',
        duration: 3000,
      })
    }

    // Register event listeners
    serviceWorker.addEventListener('status-change', handleStatusChange)
    serviceWorker.addEventListener('update-available', handleUpdateAvailable)
    serviceWorker.addEventListener('online', handleOnline)
    serviceWorker.addEventListener('offline', handleOffline)
    serviceWorker.addEventListener('sync-success', handleSyncSuccess)

    // Initial status
    setStatus(serviceWorker.getStatus())

    return () => {
      serviceWorker.removeEventListener('status-change', handleStatusChange)
      serviceWorker.removeEventListener(
        'update-available',
        handleUpdateAvailable,
      )
      serviceWorker.removeEventListener('online', handleOnline)
      serviceWorker.removeEventListener('offline', handleOffline)
      serviceWorker.removeEventListener('sync-success', handleSyncSuccess)
    }
  }, [])

  // This component doesn't render anything visible
  return null
}

export default ServiceWorkerInit
