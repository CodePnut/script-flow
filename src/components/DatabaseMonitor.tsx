/**
 * Database Monitor Component
 *
 * Displays database performance metrics, slow query analysis,
 * and search index statistics for monitoring and optimization.
 *
 * Features:
 * - Real-time database performance metrics
 * - Slow query analysis and recommendations
 * - Search index statistics
 * - Database maintenance actions
 * - Performance optimization insights
 */

'use client'

import { AlertTriangle, Database, Search, TrendingUp, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DatabaseHealth {
  connected: boolean
  responseTime: number
  error?: string
}

interface PerformanceStats {
  totalQueries: number
  averageQueryTime: number
  slowQueries: number
  fastQueries: number
  queryTypeBreakdown: Record<
    string,
    {
      count: number
      averageTime: number
      slowCount: number
    }
  >
}

interface SlowQueryAnalysis {
  queries: Array<{
    queryType: string
    queryHash: string
    averageDuration: number
    count: number
    lastSeen: Date
  }>
  recommendations: string[]
}

interface SearchIndexStats {
  totalIndexes: number
  indexesByLanguage: Record<string, number>
  averageTokenCount: number
  lastIndexed: Date | null
  unindexedCount: number
}

interface DatabaseMonitorData {
  database: {
    health: DatabaseHealth
    performance: PerformanceStats
  }
  slowQueries: SlowQueryAnalysis
  searchIndex: SearchIndexStats
  timestamp: string
}

export function DatabaseMonitor() {
  const [monitorData, setMonitorData] = useState<DatabaseMonitorData | null>(
    null,
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMonitorData = async () => {
    try {
      const response = await fetch('/api/db-monitor')
      if (!response.ok) {
        throw new Error('Failed to fetch database monitoring data')
      }
      const data = await response.json()
      setMonitorData(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleMaintenanceAction = async (
    action: string,
    params?: Record<string, unknown>,
  ) => {
    try {
      const response = await fetch('/api/db-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...params }),
      })

      if (response.ok) {
        await fetchMonitorData() // Refresh data
      }
    } catch (err) {
      console.error('Maintenance action failed:', err)
    }
  }

  useEffect(() => {
    fetchMonitorData()

    // Refresh every 30 seconds
    const interval = setInterval(fetchMonitorData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            Loading database metrics...
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
            Database Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500">Error: {error}</div>
          <Button
            onClick={fetchMonitorData}
            className="mt-2 w-full"
            variant="outline"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!monitorData) return null

  const getHealthColor = (connected: boolean) => {
    return connected ? 'text-green-500' : 'text-red-500'
  }

  const getPerformanceColor = (avgTime: number) => {
    if (avgTime < 100) return 'text-green-500'
    if (avgTime < 500) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <div className="space-y-4">
      {/* Database Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="text-sm font-medium">Connection Status</span>
            </div>
            <div
              className={`text-sm font-medium ${getHealthColor(monitorData.database.health.connected)}`}
            >
              {monitorData.database.health.connected
                ? 'Connected'
                : 'Disconnected'}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="text-sm font-medium">Response Time</span>
            </div>
            <div className="text-sm font-medium">
              {monitorData.database.health.responseTime}ms
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Total Queries</div>
              <div className="font-medium">
                {monitorData.database.performance.totalQueries}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Avg Query Time</div>
              <div
                className={`font-medium ${getPerformanceColor(monitorData.database.performance.averageQueryTime)}`}
              >
                {monitorData.database.performance.averageQueryTime.toFixed(1)}ms
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Slow Queries</div>
              <div className="font-medium text-red-500">
                {monitorData.database.performance.slowQueries}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Fast Queries</div>
              <div className="font-medium text-green-500">
                {monitorData.database.performance.fastQueries}
              </div>
            </div>
          </div>

          {/* Query Type Breakdown */}
          {Object.keys(monitorData.database.performance.queryTypeBreakdown)
            .length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Query Types</div>
              {Object.entries(
                monitorData.database.performance.queryTypeBreakdown,
              ).map(([type, stats]) => (
                <div
                  key={type}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="capitalize">{type.replace('_', ' ')}</span>
                  <span className={getPerformanceColor(stats.averageTime)}>
                    {stats.count} queries, {stats.averageTime.toFixed(1)}ms avg
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Index Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Index
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Total Indexes</div>
              <div className="font-medium">
                {monitorData.searchIndex.totalIndexes}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Avg Tokens</div>
              <div className="font-medium">
                {monitorData.searchIndex.averageTokenCount}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Unindexed</div>
              <div
                className={`font-medium ${monitorData.searchIndex.unindexedCount > 0 ? 'text-yellow-500' : 'text-green-500'}`}
              >
                {monitorData.searchIndex.unindexedCount}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Last Indexed</div>
              <div className="font-medium text-xs">
                {monitorData.searchIndex.lastIndexed
                  ? new Date(
                      monitorData.searchIndex.lastIndexed,
                    ).toLocaleTimeString()
                  : 'Never'}
              </div>
            </div>
          </div>

          {/* Languages */}
          {Object.keys(monitorData.searchIndex.indexesByLanguage).length >
            0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">By Language</div>
              {Object.entries(monitorData.searchIndex.indexesByLanguage).map(
                ([lang, count]) => (
                  <div
                    key={lang}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="uppercase">{lang}</span>
                    <span>{count} indexes</span>
                  </div>
                ),
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slow Query Recommendations */}
      {monitorData.slowQueries.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Optimization Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {monitorData.slowQueries.recommendations.map(
                (recommendation, index) => (
                  <div key={index} className="text-sm text-muted-foreground">
                    • {recommendation}
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Maintenance Actions */}
      {process.env.NODE_ENV === 'development' && (
        <Card>
          <CardHeader>
            <CardTitle>Maintenance Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => handleMaintenanceAction('reset-metrics')}
                variant="outline"
                size="sm"
              >
                Reset Metrics
              </Button>
              <Button
                onClick={() => handleMaintenanceAction('cleanup-logs')}
                variant="outline"
                size="sm"
              >
                Cleanup Logs
              </Button>
              <Button
                onClick={() => handleMaintenanceAction('index-transcripts')}
                variant="outline"
                size="sm"
              >
                Index Transcripts
              </Button>
              <Button
                onClick={() => handleMaintenanceAction('reindex-all')}
                variant="outline"
                size="sm"
              >
                Reindex All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Updated */}
      <div className="text-xs text-muted-foreground text-center">
        Last updated: {new Date(monitorData.timestamp).toLocaleTimeString()}
      </div>
    </div>
  )
}
