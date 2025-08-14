/**
 * GET /api/db-monitor
 *
 * Database monitoring and performance analysis API endpoint
 *
 * This endpoint provides database performance metrics, slow query analysis,
 * and optimization recommendations for the ScriptFlow application.
 *
 * Features:
 * - Database performance statistics
 * - Slow query analysis and recommendations
 * - Database health monitoring
 * - Search index statistics
 * - Performance optimization suggestions
 */

import { NextRequest, NextResponse } from 'next/server'

import { dbOptimization } from '@/lib/db-optimization'
import { searchIndexing } from '@/lib/search-indexing'

/**
 * GET /api/db-monitor
 *
 * Get database performance monitoring information
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'health':
        // Get database health information
        const health = await dbOptimization.checkDatabaseHealth()
        return NextResponse.json(health)

      case 'stats':
        // Get performance statistics
        const stats = dbOptimization.getDatabaseStats()
        return NextResponse.json(stats)

      case 'slow-queries':
        // Get slow query analysis
        const limit = parseInt(searchParams.get('limit') || '50', 10)
        const slowQueries = await dbOptimization.getSlowQueryAnalysis(limit)
        return NextResponse.json(slowQueries)

      case 'search-index':
        // Get search index statistics
        const indexStats = await searchIndexing.getIndexStats()
        return NextResponse.json(indexStats)

      default:
        // Default: return comprehensive monitoring information
        const [
          dbHealth,
          performanceStats,
          slowQueryAnalysis,
          searchIndexStats,
        ] = await Promise.all([
          dbOptimization.checkDatabaseHealth(),
          Promise.resolve(dbOptimization.getDatabaseStats()),
          dbOptimization.getSlowQueryAnalysis(20),
          searchIndexing.getIndexStats(),
        ])

        return NextResponse.json({
          database: {
            health: dbHealth,
            performance: performanceStats,
          },
          slowQueries: slowQueryAnalysis,
          searchIndex: searchIndexStats,
          timestamp: new Date().toISOString(),
        })
    }
  } catch (error) {
    console.error('🔴 Database monitoring error:', error)
    return NextResponse.json(
      {
        error: 'Failed to retrieve database monitoring information',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * POST /api/db-monitor
 *
 * Database maintenance operations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...params } = body

    switch (action) {
      case 'cleanup-logs':
        // Clean up old performance logs
        const daysToKeep = params.daysToKeep || 30
        const cleanedCount =
          await dbOptimization.cleanupPerformanceLogs(daysToKeep)
        return NextResponse.json({
          success: true,
          message: `Cleaned up ${cleanedCount} old performance logs`,
          cleanedCount,
        })

      case 'reset-metrics':
        // Reset in-memory performance metrics
        dbOptimization.resetMetrics()
        return NextResponse.json({
          success: true,
          message: 'Performance metrics reset',
        })

      case 'index-transcripts':
        // Index unindexed transcripts
        const indexedCount = await searchIndexing.indexAllUnindexedTranscripts()
        return NextResponse.json({
          success: true,
          message: `Indexed ${indexedCount} transcripts`,
          indexedCount,
        })

      case 'reindex-all':
        // Reindex all transcripts
        const batchSize = params.batchSize || 10
        const reindexedCount =
          await searchIndexing.reindexAllTranscripts(batchSize)
        return NextResponse.json({
          success: true,
          message: `Reindexed ${reindexedCount} transcripts`,
          reindexedCount,
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('🔴 Database maintenance error:', error)
    return NextResponse.json(
      {
        error: 'Database maintenance operation failed',
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
