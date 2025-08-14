/**
 * Cache Status Component
 *
 * Displays cache performance metrics and health status
 * for monitoring and debugging purposes.
 *
 * Features:
 * - Real-time cache metrics display
 * - Health status indicators
 * - Performance insights
 * - Cache management actions (development only)
 */

'use client'

import { Activity, Database, TrendingUp, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CacheMetrics {
  hits: number
  misses: number
  errors: number
  totalRequests: number
  hitRate: number
  averageLatency: number
}

interface CacheStats {
  keyCount: number
  memoryUsage?: string
  error?: string
}

interface RedisHealth {
  connected: boolean
  latency?: number
  error?: string
}

interface CacheData {
  redis: RedisHealth
  performance: CacheMetrics
  cache: CacheStats
  timestamp: string
}

export function CacheStatus() {
  const [cacheData, setCacheData] = useState<CacheData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCacheData = async () => {
    try {
      const response = await fetch('/api/cache')
      if (!response.ok) {
        throw new Error('Failed to fetch cache data')
      }
      const data = await response.json()
      setCacheData(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleClearCache = async () => {
    if (process.env.NODE_ENV !== 'development') return

    try {
      const response = await fetch('/api/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear-all' }),
      })

      if (response.ok) {
        await fetchCacheData() // Refresh data
      }
    } catch (err) {
      console.error('Failed to clear cache:', err)
    }
  }

  const handleResetMetrics = async () => {
    try {
      const response = await fetch('/api/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-metrics' }),
      })

      if (response.ok) {
        await fetchCacheData() // Refresh data
      }
    } catch (err) {
      console.error('Failed to reset metrics:', err)
    }
  }

  useEffect(() => {
    fetchCacheData()

    // Refresh every 30 seconds
    const interval = setInterval(fetchCacheData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Cache Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            Loading cache data...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Cache Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500">Error: {error}</div>
          <Button
            onClick={fetchCacheData}
            className="mt-2 w-full"
            variant="outline"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!cacheData) return null

  const getStatusColor = (connected: boolean) => {
    return connected ? 'text-green-500' : 'text-red-500'
  }

  const getHitRateColor = (hitRate: number) => {
    if (hitRate >= 80) return 'text-green-500'
    if (hitRate >= 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Cache Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Redis Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="text-sm font-medium">Redis Connection</span>
          </div>
          <div
            className={`text-sm font-medium ${getStatusColor(cacheData.redis.connected)}`}
          >
            {cacheData.redis.connected ? 'Connected' : 'Disconnected'}
            {cacheData.redis.latency && ` (${cacheData.redis.latency}ms)`}
          </div>
        </div>

        {/* Cache Performance */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">Performance</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Hit Rate</div>
              <div
                className={`font-medium ${getHitRateColor(cacheData.performance.hitRate)}`}
              >
                {cacheData.performance.hitRate.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Avg Latency</div>
              <div className="font-medium">
                {cacheData.performance.averageLatency.toFixed(1)}ms
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Total Requests</div>
              <div className="font-medium">
                {cacheData.performance.totalRequests}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Errors</div>
              <div className="font-medium">{cacheData.performance.errors}</div>
            </div>
          </div>
        </div>

        {/* Cache Statistics */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="text-sm font-medium">Cache Statistics</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Cached Keys</div>
              <div className="font-medium">{cacheData.cache.keyCount}</div>
            </div>
            {cacheData.cache.memoryUsage && (
              <div>
                <div className="text-muted-foreground">Memory Usage</div>
                <div className="font-medium">{cacheData.cache.memoryUsage}</div>
              </div>
            )}
          </div>
        </div>

        {/* Development Actions */}
        {process.env.NODE_ENV === 'development' && (
          <div className="flex gap-2 pt-2 border-t">
            <Button
              onClick={handleResetMetrics}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              Reset Metrics
            </Button>
            <Button
              onClick={handleClearCache}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              Clear Cache
            </Button>
          </div>
        )}

        {/* Last Updated */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Last updated: {new Date(cacheData.timestamp).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  )
}
