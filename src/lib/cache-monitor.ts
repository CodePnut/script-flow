/**
 * Cache Performance Monitoring and Metrics
 *
 * This module provides comprehensive monitoring capabilities for the Redis
 * caching layer, including performance metrics, health checks, and alerting.
 *
 * Features:
 * - Real-time cache performance monitoring
 * - Cache hit/miss ratio tracking
 * - Memory usage monitoring
 * - Performance alerting and logging
 * - Cache health diagnostics
 */

import { cacheService } from './cache'
import { checkRedisHealth } from './redis'

/**
 * Cache performance thresholds for alerting
 */
const PERFORMANCE_THRESHOLDS = {
  MIN_HIT_RATE: 70, // Minimum acceptable hit rate percentage
  MAX_LATENCY: 100, // Maximum acceptable latency in milliseconds
  MAX_ERROR_RATE: 5, // Maximum acceptable error rate percentage
} as const

/**
 * Cache health status
 */
export type CacheHealthStatus =
  | 'healthy'
  | 'degraded'
  | 'unhealthy'
  | 'unavailable'

/**
 * Comprehensive cache health report
 */
export interface CacheHealthReport {
  status: CacheHealthStatus
  timestamp: Date
  redis: {
    connected: boolean
    latency?: number
    error?: string
  }
  performance: {
    hitRate: number
    averageLatency: number
    errorRate: number
    totalRequests: number
  }
  memory: {
    keyCount: number
    memoryUsage?: string
    error?: string
  }
  alerts: string[]
  recommendations: string[]
}

/**
 * Cache monitoring service
 */
class CacheMonitor {
  private healthCheckInterval: NodeJS.Timeout | null = null
  private lastHealthReport: CacheHealthReport | null = null

  /**
   * Start continuous cache monitoring
   * @param intervalMs - Monitoring interval in milliseconds (default: 5 minutes)
   */
  startMonitoring(intervalMs: number = 5 * 60 * 1000): void {
    if (this.healthCheckInterval) {
      console.log('🔍 Cache monitoring already running')
      return
    }

    console.log(`🔍 Starting cache monitoring (interval: ${intervalMs}ms)`)

    // Initial health check
    this.performHealthCheck()

    // Set up periodic monitoring
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck()
    }, intervalMs)
  }

  /**
   * Stop cache monitoring
   */
  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
      console.log('🔍 Cache monitoring stopped')
    }
  }

  /**
   * Perform comprehensive cache health check
   * @returns Cache health report
   */
  async performHealthCheck(): Promise<CacheHealthReport> {
    const timestamp = new Date()
    const alerts: string[] = []
    const recommendations: string[] = []

    try {
      // Check Redis connection health
      const redisHealth = await checkRedisHealth()

      // Get cache performance metrics
      const metrics = cacheService.getMetrics()
      const errorRate =
        metrics.totalRequests > 0
          ? (metrics.errors / metrics.totalRequests) * 100
          : 0

      // Get cache memory statistics
      const memoryStats = await cacheService.getCacheStats()

      // Determine overall health status
      let status: CacheHealthStatus = 'healthy'

      if (!redisHealth.connected) {
        status = 'unavailable'
        alerts.push('Redis connection is not available')
        recommendations.push(
          'Check Redis server status and connection configuration',
        )
      } else {
        // Check performance thresholds
        if (metrics.hitRate < PERFORMANCE_THRESHOLDS.MIN_HIT_RATE) {
          status = status === 'healthy' ? 'degraded' : status
          alerts.push(`Cache hit rate is low: ${metrics.hitRate}%`)
          recommendations.push(
            'Consider increasing cache TTL or reviewing cache strategy',
          )
        }

        if (metrics.averageLatency > PERFORMANCE_THRESHOLDS.MAX_LATENCY) {
          status = status === 'healthy' ? 'degraded' : status
          alerts.push(`Cache latency is high: ${metrics.averageLatency}ms`)
          recommendations.push(
            'Check Redis server performance and network connectivity',
          )
        }

        if (errorRate > PERFORMANCE_THRESHOLDS.MAX_ERROR_RATE) {
          status = 'unhealthy'
          alerts.push(`Cache error rate is high: ${errorRate.toFixed(2)}%`)
          recommendations.push('Investigate cache errors and Redis server logs')
        }

        // Memory usage recommendations
        if (memoryStats.keyCount > 10000) {
          recommendations.push(
            'Consider implementing cache cleanup policies for large key counts',
          )
        }
      }

      const healthReport: CacheHealthReport = {
        status,
        timestamp,
        redis: redisHealth,
        performance: {
          hitRate: metrics.hitRate,
          averageLatency: metrics.averageLatency,
          errorRate: Math.round(errorRate * 100) / 100,
          totalRequests: metrics.totalRequests,
        },
        memory: memoryStats,
        alerts,
        recommendations,
      }

      this.lastHealthReport = healthReport
      this.logHealthReport(healthReport)

      return healthReport
    } catch (error) {
      const errorReport: CacheHealthReport = {
        status: 'unhealthy',
        timestamp,
        redis: {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        performance: {
          hitRate: 0,
          averageLatency: 0,
          errorRate: 100,
          totalRequests: 0,
        },
        memory: {
          keyCount: 0,
          error: 'Unable to retrieve memory stats',
        },
        alerts: ['Cache monitoring failed'],
        recommendations: [
          'Check cache monitoring service and Redis connectivity',
        ],
      }

      this.lastHealthReport = errorReport
      console.error('🔴 Cache health check failed:', error)

      return errorReport
    }
  }

  /**
   * Get the last health report
   * @returns Last health report or null if no check has been performed
   */
  getLastHealthReport(): CacheHealthReport | null {
    return this.lastHealthReport
  }

  /**
   * Get cache performance summary
   * @returns Performance summary with recommendations
   */
  async getPerformanceSummary(): Promise<{
    overall: 'excellent' | 'good' | 'fair' | 'poor'
    metrics: ReturnType<typeof cacheService.getMetrics>
    insights: string[]
  }> {
    const metrics = cacheService.getMetrics()
    const insights: string[] = []

    // Determine overall performance rating
    let overall: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent'

    if (metrics.hitRate >= 90) {
      insights.push('Excellent cache hit rate - cache is very effective')
    } else if (metrics.hitRate >= 70) {
      insights.push('Good cache hit rate - cache is working well')
      overall = 'good'
    } else if (metrics.hitRate >= 50) {
      insights.push('Fair cache hit rate - consider optimizing cache strategy')
      overall = 'fair'
    } else {
      insights.push('Poor cache hit rate - cache strategy needs improvement')
      overall = 'poor'
    }

    if (metrics.averageLatency < 10) {
      insights.push('Excellent cache response time')
    } else if (metrics.averageLatency < 50) {
      insights.push('Good cache response time')
    } else if (metrics.averageLatency < 100) {
      insights.push('Acceptable cache response time')
      overall = overall === 'excellent' ? 'good' : overall
    } else {
      insights.push('High cache latency - check Redis performance')
      overall = 'poor'
    }

    if (metrics.totalRequests > 1000) {
      insights.push(
        `High cache usage: ${metrics.totalRequests} requests processed`,
      )
    } else if (metrics.totalRequests > 100) {
      insights.push(
        `Moderate cache usage: ${metrics.totalRequests} requests processed`,
      )
    } else {
      insights.push(
        `Low cache usage: ${metrics.totalRequests} requests processed`,
      )
    }

    return {
      overall,
      metrics,
      insights,
    }
  }

  /**
   * Log health report to console with appropriate formatting
   * @param report - Health report to log
   */
  private logHealthReport(report: CacheHealthReport): void {
    const statusEmoji = {
      healthy: '✅',
      degraded: '🟡',
      unhealthy: '🔴',
      unavailable: '⚫',
    }

    console.log(
      `${statusEmoji[report.status]} Cache Health: ${report.status.toUpperCase()}`,
    )

    if (report.redis.connected) {
      console.log(`   Redis: Connected (${report.redis.latency}ms)`)
    } else {
      console.log(`   Redis: Disconnected - ${report.redis.error}`)
    }

    console.log(
      `   Performance: ${report.performance.hitRate}% hit rate, ${report.performance.averageLatency}ms avg latency`,
    )
    console.log(
      `   Memory: ${report.memory.keyCount} keys${report.memory.memoryUsage ? `, ${report.memory.memoryUsage}` : ''}`,
    )

    if (report.alerts.length > 0) {
      console.log('   Alerts:')
      report.alerts.forEach((alert) => console.log(`     - ${alert}`))
    }

    if (
      report.recommendations.length > 0 &&
      process.env.NODE_ENV === 'development'
    ) {
      console.log('   Recommendations:')
      report.recommendations.forEach((rec) => console.log(`     - ${rec}`))
    }
  }
}

/**
 * Singleton cache monitor instance
 */
export const cacheMonitor = new CacheMonitor()

/**
 * Convenience functions for cache monitoring
 */
export const monitoring = {
  start: (intervalMs?: number) => cacheMonitor.startMonitoring(intervalMs),
  stop: () => cacheMonitor.stopMonitoring(),
  healthCheck: () => cacheMonitor.performHealthCheck(),
  getLastReport: () => cacheMonitor.getLastHealthReport(),
  getPerformanceSummary: () => cacheMonitor.getPerformanceSummary(),
}

export default cacheMonitor
