/**
 * Database Optimization Service
 *
 * This module provides database query optimization, performance monitoring,
 * and connection management for improved ScriptFlow performance.
 *
 * Features:
 * - Query performance monitoring and logging
 * - Database connection pooling optimization
 * - Slow query detection and alerting
 * - Query optimization recommendations
 * - Database health monitoring
 */

import { prisma } from './prisma'

/**
 * Query performance thresholds (in milliseconds)
 */
const PERFORMANCE_THRESHOLDS = {
  SLOW_QUERY: 1000, // Queries taking longer than 1 second
  WARNING_QUERY: 500, // Queries taking longer than 500ms
  FAST_QUERY: 100, // Queries faster than 100ms
} as const

/**
 * Query types for performance tracking
 */
export type QueryType =
  | 'transcript_fetch'
  | 'transcript_create'
  | 'transcript_search'
  | 'user_history'
  | 'analytics_insert'
  | 'cache_lookup'
  | 'health_check'

/**
 * Query performance metrics
 */
interface QueryMetrics {
  queryType: QueryType
  duration: number
  parameters?: Record<string, unknown>
  timestamp: Date
}

/**
 * Database performance statistics
 */
interface DatabaseStats {
  totalQueries: number
  averageQueryTime: number
  slowQueries: number
  fastQueries: number
  queryTypeBreakdown: Record<
    QueryType,
    {
      count: number
      averageTime: number
      slowCount: number
    }
  >
}

/**
 * Database optimization service class
 */
class DatabaseOptimizationService {
  private queryMetrics: QueryMetrics[] = []
  private readonly maxMetricsHistory = 1000 // Keep last 1000 queries in memory

  /**
   * Log query performance metrics
   * @param queryType - Type of query being performed
   * @param duration - Query duration in milliseconds
   * @param parameters - Query parameters (will be anonymized)
   */
  async logQueryPerformance(
    queryType: QueryType,
    duration: number,
    parameters?: Record<string, unknown>,
  ): Promise<void> {
    const metrics: QueryMetrics = {
      queryType,
      duration,
      parameters: this.anonymizeParameters(parameters),
      timestamp: new Date(),
    }

    // Add to in-memory metrics
    this.queryMetrics.push(metrics)

    // Keep only recent metrics in memory
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetricsHistory)
    }

    // Log slow queries to database for analysis
    if (duration > PERFORMANCE_THRESHOLDS.SLOW_QUERY) {
      try {
        await prisma.queryPerformanceLog.create({
          data: {
            queryType,
            queryHash: this.generateQueryHash(queryType, parameters),
            duration,
            parameters: metrics.parameters
              ? JSON.parse(JSON.stringify(metrics.parameters))
              : null, // Prisma JSON type compatibility
          },
        })

        console.warn(`🐌 Slow query detected: ${queryType} took ${duration}ms`)
      } catch (error) {
        console.error('Failed to log slow query:', error)
      }
    }

    // Log warning for moderately slow queries
    if (duration > PERFORMANCE_THRESHOLDS.WARNING_QUERY) {
      console.warn(
        `⚠️ Query performance warning: ${queryType} took ${duration}ms`,
      )
    }
  }

  /**
   * Execute a query with performance monitoring
   * @param queryType - Type of query being performed
   * @param queryFn - Function that executes the query
   * @param parameters - Query parameters for logging
   * @returns Query result
   */
  async executeWithMonitoring<T>(
    queryType: QueryType,
    queryFn: () => Promise<T>,
    parameters?: Record<string, unknown>,
  ): Promise<T> {
    const startTime = Date.now()

    try {
      const result = await queryFn()
      const duration = Date.now() - startTime

      // Log performance metrics
      await this.logQueryPerformance(queryType, duration, parameters)

      return result
    } catch (error) {
      const duration = Date.now() - startTime

      // Log failed query performance
      await this.logQueryPerformance(queryType, duration, {
        ...parameters,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      throw error
    }
  }

  /**
   * Get current database performance statistics
   * @returns Database performance statistics
   */
  getDatabaseStats(): DatabaseStats {
    if (this.queryMetrics.length === 0) {
      return {
        totalQueries: 0,
        averageQueryTime: 0,
        slowQueries: 0,
        fastQueries: 0,
        queryTypeBreakdown: {} as Record<
          QueryType,
          {
            count: number
            averageTime: number
            slowCount: number
          }
        >,
      }
    }

    const totalQueries = this.queryMetrics.length
    const totalTime = this.queryMetrics.reduce(
      (sum, metric) => sum + metric.duration,
      0,
    )
    const averageQueryTime = totalTime / totalQueries

    const slowQueries = this.queryMetrics.filter(
      (metric) => metric.duration > PERFORMANCE_THRESHOLDS.SLOW_QUERY,
    ).length

    const fastQueries = this.queryMetrics.filter(
      (metric) => metric.duration < PERFORMANCE_THRESHOLDS.FAST_QUERY,
    ).length

    // Calculate breakdown by query type
    const queryTypeBreakdown: Record<
      string,
      {
        count: number
        averageTime: number
        slowCount: number
      }
    > = {}

    for (const metric of this.queryMetrics) {
      if (!queryTypeBreakdown[metric.queryType]) {
        queryTypeBreakdown[metric.queryType] = {
          count: 0,
          averageTime: 0,
          slowCount: 0,
        }
      }

      const breakdown = queryTypeBreakdown[metric.queryType]
      breakdown.count++
      breakdown.averageTime =
        (breakdown.averageTime * (breakdown.count - 1) + metric.duration) /
        breakdown.count

      if (metric.duration > PERFORMANCE_THRESHOLDS.SLOW_QUERY) {
        breakdown.slowCount++
      }
    }

    return {
      totalQueries,
      averageQueryTime: Math.round(averageQueryTime * 100) / 100,
      slowQueries,
      fastQueries,
      queryTypeBreakdown: queryTypeBreakdown as Record<
        QueryType,
        {
          count: number
          averageTime: number
          slowCount: number
        }
      >,
    }
  }

  /**
   * Get slow query analysis from database
   * @param limit - Number of slow queries to analyze
   * @returns Slow query analysis
   */
  async getSlowQueryAnalysis(limit: number = 50): Promise<{
    queries: Array<{
      queryType: string
      queryHash: string
      averageDuration: number
      count: number
      lastSeen: Date
    }>
    recommendations: string[]
  }> {
    try {
      // Get slow queries grouped by hash
      const slowQueries = await prisma.queryPerformanceLog.groupBy({
        by: ['queryType', 'queryHash'],
        _avg: {
          duration: true,
        },
        _count: {
          id: true,
        },
        _max: {
          timestamp: true,
        },
        where: {
          duration: {
            gte: PERFORMANCE_THRESHOLDS.WARNING_QUERY,
          },
        },
        orderBy: {
          _avg: {
            duration: 'desc',
          },
        },
        take: limit,
      })

      const queries = slowQueries.map((query) => ({
        queryType: query.queryType,
        queryHash: query.queryHash,
        averageDuration: Math.round((query._avg.duration || 0) * 100) / 100,
        count: query._count.id,
        lastSeen: query._max.timestamp || new Date(),
      }))

      // Generate recommendations based on slow queries
      const recommendations = this.generateOptimizationRecommendations(queries)

      return {
        queries,
        recommendations,
      }
    } catch (error) {
      console.error('Failed to analyze slow queries:', error)
      return {
        queries: [],
        recommendations: [
          'Unable to analyze slow queries. Check database connection.',
        ],
      }
    }
  }

  /**
   * Check database health and connection status
   * @returns Database health information
   */
  async checkDatabaseHealth(): Promise<{
    connected: boolean
    responseTime: number
    activeConnections?: number
    error?: string
  }> {
    const startTime = Date.now()

    try {
      // Simple health check query
      await prisma.$queryRaw`SELECT 1`

      const responseTime = Date.now() - startTime

      return {
        connected: true,
        responseTime,
      }
    } catch (error) {
      return {
        connected: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Clean up old performance logs to prevent database bloat
   * @param daysToKeep - Number of days of logs to keep
   */
  async cleanupPerformanceLogs(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      const result = await prisma.queryPerformanceLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      })

      console.log(`🧹 Cleaned up ${result.count} old performance logs`)
      return result.count
    } catch (error) {
      console.error('Failed to cleanup performance logs:', error)
      return 0
    }
  }

  /**
   * Reset in-memory metrics
   */
  resetMetrics(): void {
    this.queryMetrics = []
  }

  /**
   * Anonymize query parameters for privacy
   * @param parameters - Original parameters
   * @returns Anonymized parameters
   */
  private anonymizeParameters(
    parameters?: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    if (!parameters) return undefined

    const anonymized: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(parameters)) {
      // Anonymize sensitive fields
      if (
        key.toLowerCase().includes('email') ||
        key.toLowerCase().includes('password') ||
        key.toLowerCase().includes('token') ||
        key.toLowerCase().includes('secret')
      ) {
        anonymized[key] = '[REDACTED]'
      } else if (typeof value === 'string' && value.length > 100) {
        // Truncate long strings
        anonymized[key] = `${value.substring(0, 100)}... [TRUNCATED]`
      } else {
        anonymized[key] = value
      }
    }

    return anonymized
  }

  /**
   * Generate a hash for query grouping
   * @param queryType - Type of query
   * @param parameters - Query parameters
   * @returns Query hash
   */
  private generateQueryHash(
    queryType: QueryType,
    parameters?: Record<string, unknown>,
  ): string {
    const hashInput = `${queryType}:${JSON.stringify(parameters || {})}`

    // Simple hash function
    let hash = 0
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36)
  }

  /**
   * Generate optimization recommendations based on slow queries
   * @param slowQueries - Array of slow query data
   * @returns Array of optimization recommendations
   */
  private generateOptimizationRecommendations(
    slowQueries: Array<{
      queryType: string
      averageDuration: number
      count: number
    }>,
  ): string[] {
    const recommendations: string[] = []

    // Analyze query patterns and generate recommendations
    const transcriptQueries = slowQueries.filter((q) =>
      q.queryType.includes('transcript'),
    )
    const searchQueries = slowQueries.filter((q) =>
      q.queryType.includes('search'),
    )
    const analyticsQueries = slowQueries.filter((q) =>
      q.queryType.includes('analytics'),
    )

    if (transcriptQueries.length > 0) {
      recommendations.push(
        'Consider adding indexes on frequently queried transcript fields',
      )
      recommendations.push(
        'Implement pagination for large transcript result sets',
      )
    }

    if (searchQueries.length > 0) {
      recommendations.push(
        'Optimize full-text search indexes for better performance',
      )
      recommendations.push('Consider implementing search result caching')
    }

    if (analyticsQueries.length > 0) {
      recommendations.push('Batch analytics inserts to reduce database load')
      recommendations.push(
        'Consider using a separate analytics database for heavy reporting',
      )
    }

    // General recommendations based on overall performance
    const averageSlowQueryTime =
      slowQueries.reduce((sum, q) => sum + q.averageDuration, 0) /
      slowQueries.length

    if (averageSlowQueryTime > 2000) {
      recommendations.push(
        'Database performance is significantly degraded - consider scaling up resources',
      )
    }

    if (slowQueries.length > 20) {
      recommendations.push(
        'High number of slow queries detected - review query patterns and indexing strategy',
      )
    }

    return recommendations.length > 0
      ? recommendations
      : ['Database performance looks good!']
  }
}

/**
 * Singleton database optimization service instance
 */
export const dbOptimization = new DatabaseOptimizationService()

/**
 * Convenience functions for common database operations with monitoring
 */
export const optimizedQueries = {
  // Transcript operations with monitoring
  findTranscript: async (videoId: string) => {
    return dbOptimization.executeWithMonitoring(
      'transcript_fetch',
      () =>
        prisma.transcript.findFirst({
          where: { videoId, status: 'completed' },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            videoId: true,
            title: true,
            description: true,
            duration: true,
            summary: true,
            language: true,
            // chapters: true, // Removed - chapters functionality deprecated
            utterances: true,
            metadata: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      { videoId },
    )
  },

  // User history with monitoring
  getUserHistory: async (
    userHash: string,
    page: number = 1,
    limit: number = 10,
  ) => {
    return dbOptimization.executeWithMonitoring(
      'user_history',
      () =>
        prisma.transcript.findMany({
          where: {
            ipHash: userHash,
            status: 'completed',
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            videoId: true,
            title: true,
            description: true,
            duration: true,
            language: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      { userHash, page, limit },
    )
  },

  // Health check with monitoring
  healthCheck: async () => {
    return dbOptimization.executeWithMonitoring(
      'health_check',
      () => prisma.$queryRaw`SELECT 1 as health`,
    )
  },
}

export default dbOptimization
