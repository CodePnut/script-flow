/**
 * Offline Status Component
 *
 * Displays the current online/offline status and provides information
 * about offline functionality and cached content availability.
 *
 * Features:
 * - Real-time online/offline status indicator
 * - Offline functionality information
 * - Cache status and management
 * - Service worker status display
 * - Offline-first feature highlights
 */

'use client'

import { Cloud, CloudOff, Download, Wifi, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  serviceWorker,
  type ServiceWorkerStatus,
  type CacheStatus,
} from '@/lib/service-worker'

interface OfflineStatusProps {
  className?: string
  showDetails?: boolean
}

export function OfflineStatus({
  className,
  showDetails = false,
}: OfflineStatusProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [serviceWorkerStatus, setServiceWorkerStatus] =
    useState<ServiceWorkerStatus>('unsupported')
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>({})
  const [showOfflineInfo, setShowOfflineInfo] = useState(false)

  useEffect(() => {
    // Initialize status
    setIsOnline(serviceWorker.isOnline())
    setServiceWorkerStatus(serviceWorker.getStatus())

    // Set up event listeners
    const handleOnline = () => {
      setIsOnline(true)
      setShowOfflineInfo(false)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowOfflineInfo(true)
    }

    const handleStatusChange = (...args: unknown[]) => {
      const status = args[0] as ServiceWorkerStatus
      setServiceWorkerStatus(status)
    }

    serviceWorker.addEventListener('online', handleOnline)
    serviceWorker.addEventListener('offline', handleOffline)
    serviceWorker.addEventListener('status-change', handleStatusChange)

    // Load cache status
    loadCacheStatus()

    return () => {
      serviceWorker.removeEventListener('online', handleOnline)
      serviceWorker.removeEventListener('offline', handleOffline)
      serviceWorker.removeEventListener('status-change', handleStatusChange)
    }
  }, [])

  const loadCacheStatus = async () => {
    try {
      const status = await serviceWorker.getCacheStatus()
      setCacheStatus(status)
    } catch (error) {
      console.error('Failed to load cache status:', error)
    }
  }

  const handleClearCache = async () => {
    try {
      await serviceWorker.clearCache()
      await loadCacheStatus()
    } catch (error) {
      console.error('Failed to clear cache:', error)
    }
  }

  const getStatusColor = (online: boolean) => {
    return online ? 'text-green-500' : 'text-orange-500'
  }

  const getStatusIcon = (online: boolean) => {
    return online ? (
      <Wifi className="h-4 w-4" />
    ) : (
      <WifiOff className="h-4 w-4" />
    )
  }

  const getTotalCachedItems = () => {
    return Object.values(cacheStatus).reduce((total, count) => total + count, 0)
  }

  // Simple status indicator for non-detailed view
  if (!showDetails) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`flex items-center gap-1 ${getStatusColor(isOnline)}`}>
          {getStatusIcon(isOnline)}
          <span className="text-sm font-medium">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        {!isOnline && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowOfflineInfo(!showOfflineInfo)}
            className="text-xs"
          >
            Info
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Main Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isOnline ? (
              <Cloud className="h-5 w-5" />
            ) : (
              <CloudOff className="h-5 w-5" />
            )}
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Online/Offline Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={getStatusColor(isOnline)}>
                {getStatusIcon(isOnline)}
              </div>
              <span className="font-medium">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {isOnline ? 'All features available' : 'Limited functionality'}
            </div>
          </div>

          {/* Service Worker Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Service Worker</span>
            <span
              className={`text-sm capitalize ${
                serviceWorkerStatus === 'registered'
                  ? 'text-green-500'
                  : serviceWorkerStatus === 'error'
                    ? 'text-red-500'
                    : 'text-yellow-500'
              }`}
            >
              {serviceWorkerStatus}
            </span>
          </div>

          {/* Cache Information */}
          {Object.keys(cacheStatus).length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Cached Items</span>
                <span className="text-sm text-muted-foreground">
                  {getTotalCachedItems()} items
                </span>
              </div>

              <div className="space-y-1">
                {Object.entries(cacheStatus).map(([cacheName, count]) => (
                  <div
                    key={cacheName}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="capitalize">
                      {cacheName.replace('scriptflow-', '').replace('-v1', '')}
                    </span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cache Management */}
          {getTotalCachedItems() > 0 && (
            <Button
              onClick={handleClearCache}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Clear Cache
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Offline Information */}
      {(showOfflineInfo || !isOnline) && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Offline Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              When offline, you can still:
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>View previously loaded transcripts</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Browse your transcript history</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Navigate between cached pages</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                <span>Queue new transcription requests</span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground pt-2 border-t">
              New transcriptions will be processed when you&apos;re back online.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
