/**
 * Database Optimization Service Unit Tests
 *
 * Tests for the database optimization functionality including:
 * - Query performance monitoring
 * - Database health checks
 * - Performance metrics tracking
 * - Slow query analysis
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { dbOptimization } from '@/lib/db-optimization'
import { prisma } from '@/lib/prisma'

// Mock the Prisma module
vi.mock('@/lib/prisma', () => ({
  prisma: {
    queryPerformanceLog: {
      create: vi.fn(),
      groupBy: vi.fn(),
      deleteMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}))

describe('Database Optimization Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dbOptimization.resetMetrics()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Query Performance Monitoring', () => {
    it('should track query performance metrics', async () => {
      // Execute a mock query with monitoring
      const mockQueryFn = vi.fn().mockResolvedValue('test result')

      const result = await dbOptimization.executeWithMonitoring(
        'transcript_fetch',
        mockQueryFn,
        { videoId: 'test-video' },
      )

      expect(result).toBe('test result')
      expect(mockQueryFn).toHaveBeenCalledOnce()

      // Check that metrics were recorded
      const stats = dbOptimization.getDatabaseStats()
      expect(stats.totalQueries).toBe(1)
      expect(stats.averageQueryTime).toBeGreaterThanOrEqual(0)
    })

    it('should log slow queries to database', async () => {
      // Mock a slow query (> 1000ms)
      const slowQueryFn = vi
        .fn()
        .mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve('slow result'), 1100),
            ),
        )

      await dbOptimization.executeWithMonitoring(
        'transcript_fetch',
        slowQueryFn,
        { videoId: 'test-video' },
      )

      // Should have attempted to log the slow query
      expect(vi.mocked(prisma.queryPerformanceLog.create)).toHaveBeenCalled()
    })

    it('should handle query errors gracefully', async () => {
      const errorQueryFn = vi
        .fn()
        .mockRejectedValue(new Error('Database error'))

      await expect(
        dbOptimization.executeWithMonitoring('transcript_fetch', errorQueryFn, {
          videoId: 'test-video',
        }),
      ).rejects.toThrow('Database error')

      // Should still track the error in metrics
      const stats = dbOptimization.getDatabaseStats()
      expect(stats.totalQueries).toBe(1)
    })
  })

  describe('Performance Statistics', () => {
    it('should calculate performance statistics correctly', async () => {
      // Execute multiple queries with different performance
      const fastQuery = vi.fn().mockResolvedValue('fast')
      const slowQuery = vi
        .fn()
        .mockImplementation(
          () =>
            new Promise((resolve) => setTimeout(() => resolve('slow'), 600)),
        )

      await dbOptimization.executeWithMonitoring('transcript_fetch', fastQuery)
      await dbOptimization.executeWithMonitoring('user_history', slowQuery)

      const stats = dbOptimization.getDatabaseStats()

      expect(stats.totalQueries).toBe(2)
      expect(stats.averageQueryTime).toBeGreaterThan(0)
      expect(stats.queryTypeBreakdown).toHaveProperty('transcript_fetch')
      expect(stats.queryTypeBreakdown).toHaveProperty('user_history')
    })

    it('should reset metrics correctly', () => {
      // Add some metrics
      const mockQueryFn = vi.fn().mockResolvedValue('test')
      dbOptimization.executeWithMonitoring('transcript_fetch', mockQueryFn)

      // Reset metrics
      dbOptimization.resetMetrics()

      const stats = dbOptimization.getDatabaseStats()
      expect(stats.totalQueries).toBe(0)
      expect(stats.averageQueryTime).toBe(0)
    })
  })

  describe('Database Health Check', () => {
    it('should check database health successfully', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ health: 1 }])

      const health = await dbOptimization.checkDatabaseHealth()

      expect(health.connected).toBe(true)
      expect(health.responseTime).toBeGreaterThanOrEqual(0)
      expect(vi.mocked(prisma.$queryRaw)).toHaveBeenCalled()
    })

    it('should handle database connection errors', async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValue(
        new Error('Connection failed'),
      )

      const health = await dbOptimization.checkDatabaseHealth()

      expect(health.connected).toBe(false)
      expect(health.error).toBe('Connection failed')
    })
  })

  describe('Slow Query Analysis', () => {
    it('should analyze slow queries and provide recommendations', async () => {
      const mockSlowQueries = [
        {
          queryType: 'transcript_fetch',
          queryHash: 'hash1',
          _avg: { duration: 1500 },
          _count: { id: 5 },
          _max: { timestamp: new Date() },
        },
        {
          queryType: 'user_history',
          queryHash: 'hash2',
          _avg: { duration: 800 },
          _count: { id: 3 },
          _max: { timestamp: new Date() },
        },
      ] as any // Cast to any to avoid Prisma type complexity in tests

      vi.mocked(prisma.queryPerformanceLog.groupBy).mockResolvedValue(
        mockSlowQueries,
      )

      const analysis = await dbOptimization.getSlowQueryAnalysis(10)

      expect(analysis.queries).toHaveLength(2)
      expect(analysis.queries[0].queryType).toBe('transcript_fetch')
      expect(analysis.queries[0].averageDuration).toBe(1500)
      expect(analysis.recommendations).toBeInstanceOf(Array)
      expect(analysis.recommendations.length).toBeGreaterThan(0)
    })

    it('should handle analysis errors gracefully', async () => {
      vi.mocked(prisma.queryPerformanceLog.groupBy).mockRejectedValue(
        new Error('Analysis failed'),
      )

      const analysis = await dbOptimization.getSlowQueryAnalysis(10)

      expect(analysis.queries).toEqual([])
      expect(analysis.recommendations).toContain(
        'Unable to analyze slow queries. Check database connection.',
      )
    })
  })

  describe('Performance Log Cleanup', () => {
    it('should clean up old performance logs', async () => {
      vi.mocked(prisma.queryPerformanceLog.deleteMany).mockResolvedValue({
        count: 25,
      })

      const cleanedCount = await dbOptimization.cleanupPerformanceLogs(30)

      expect(cleanedCount).toBe(25)
      expect(
        vi.mocked(prisma.queryPerformanceLog.deleteMany),
      ).toHaveBeenCalledWith({
        where: {
          timestamp: {
            lt: expect.any(Date),
          },
        },
      })
    })

    it('should handle cleanup errors gracefully', async () => {
      vi.mocked(prisma.queryPerformanceLog.deleteMany).mockRejectedValue(
        new Error('Cleanup failed'),
      )

      const cleanedCount = await dbOptimization.cleanupPerformanceLogs(30)

      expect(cleanedCount).toBe(0)
    })
  })
})
