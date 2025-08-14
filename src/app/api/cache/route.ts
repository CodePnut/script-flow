/**
 * GET /api/cache
 *
 * Cache monitoring and management API endpoint
 *
 * This endpoint provides cache performance metrics, health status,
 * and administrative functions for the Redis caching layer.
 *
 * Features:
 * - Cache performance metrics and statistics
 * - Cache health monitoring
 * - Cache invalidation capabilities
 * - Performance insights and recommendations
 */

import { NextRequest, NextResponse } from 'next/server'

import { cacheService } from '@/lib/cache'
import { cacheMonitor } from '@/lib/cache-monitor'
import { checkRedisHealth } from '@/lib/redis'

/**
 * GET /api/cache
 *
 * Get cache status, metrics, and health information
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'health':
        // Get comprehensive health report
        const healthReport = await cacheMonitor.performHealthCheck()
        return NextResponse.json(healthReport)

      case 'metrics':
        // Get performance metrics only
        const metrics = cacheService.getMetrics()
        return NextResponse.json(metrics)

      case 'stats':
        // Get cache statistics
        const stats = await cacheService.getCacheStats()
        return NextResponse.json(stats)

      case 'performance':
        // Get performance summary with insights
        const performanceSummary = await cacheMonitor.getPerformanceSummary()
        return NextResponse.json(performanceSummary)

      default:
        // Default: return comprehensive cache information
        const [health, performanceMetrics, cacheStats] = await Promise.all([
          checkRedisHealth(),
          cacheService.getMetrics(),
          cacheService.getCacheStats(),
        ])

        return NextResponse.json({
          redis: health,
          performance: performanceMetrics,
          cache: cacheStats,
          timestamp: new Date().toISOString(),
        })
    }
  } catch (error) {
    console.error('🔴 Cache API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to retrieve cache information',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * POST /api/cache
 *
 * Cache management operations (invalidation, clearing, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, videoId, pattern } = body

    switch (action) {
      case 'invalidate-transcript':
        if (!videoId) {
          return NextResponse.json(
            { error: 'videoId is required for transcript invalidation' },
            { status: 400 },
          )
        }
        await cacheService.invalidateTranscript(videoId)
        return NextResponse.json({
          success: true,
          message: `Invalidated cache for video: ${videoId}`,
        })

      case 'invalidate-search':
        await cacheService.invalidateSearchResults(pattern)
        return NextResponse.json({
          success: true,
          message: 'Invalidated search results cache',
        })

      case 'clear-all':
        // This is a dangerous operation, only allow in development
        if (process.env.NODE_ENV !== 'development') {
          return NextResponse.json(
            { error: 'Clear all cache is only allowed in development' },
            { status: 403 },
          )
        }
        await cacheService.clearAllCache()
        return NextResponse.json({
          success: true,
          message: 'Cleared all cache entries',
        })

      case 'reset-metrics':
        cacheService.resetMetrics()
        return NextResponse.json({
          success: true,
          message: 'Reset cache metrics',
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('🔴 Cache management error:', error)
    return NextResponse.json(
      {
        error: 'Cache management operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/cache
 *
 * Clear specific cache entries
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')
    const type = searchParams.get('type')

    if (videoId) {
      // Clear cache for specific video
      await cacheService.invalidateTranscript(videoId)
      return NextResponse.json({
        success: true,
        message: `Cleared cache for video: ${videoId}`,
      })
    }

    if (type === 'search') {
      // Clear all search results cache
      await cacheService.invalidateSearchResults()
      return NextResponse.json({
        success: true,
        message: 'Cleared all search results cache',
      })
    }

    return NextResponse.json(
      { error: 'videoId or type parameter is required' },
      { status: 400 },
    )
  } catch (error) {
    console.error('🔴 Cache deletion error:', error)
    return NextResponse.json(
      {
        error: 'Cache deletion failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
