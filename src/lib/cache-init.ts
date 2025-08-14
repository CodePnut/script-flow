/**
 * Cache Initialization and Startup
 *
 * This module handles cache initialization, monitoring startup,
 * and graceful shutdown procedures for the Redis caching layer.
 *
 * Features:
 * - Automatic cache monitoring startup
 * - Graceful shutdown handling
 * - Development vs production configuration
 * - Error handling and fallback strategies
 */

import { cacheMonitor } from './cache-monitor'
import { disconnectRedis, getRedisClient } from './redis'

/**
 * Initialize cache system and start monitoring
 * Should be called during application startup
 */
export async function initializeCache(): Promise<void> {
  try {
    console.log('🚀 Initializing cache system...')

    // Test Redis connection with timeout
    const connectionPromise = getRedisClient()
    const timeoutPromise = new Promise<null>(
      (resolve) => setTimeout(() => resolve(null), 5000), // 5 second timeout
    )

    const client = await Promise.race([connectionPromise, timeoutPromise])

    if (client) {
      console.log('✅ Redis client initialized successfully')

      // Start cache monitoring only when explicitly enabled
      const shouldMonitor = process.env.ENABLE_CACHE_MONITORING === 'true'

      if (shouldMonitor) {
        // Start monitoring with appropriate interval
        const monitoringInterval =
          process.env.NODE_ENV === 'production'
            ? 5 * 60 * 1000 // 5 minutes in production
            : 2 * 60 * 1000 // 2 minutes in development

        cacheMonitor.startMonitoring(monitoringInterval)
        console.log('📊 Cache monitoring started')
      } else {
        console.log(
          '📊 Cache monitoring disabled (set ENABLE_CACHE_MONITORING=true to enable)',
        )
      }

      // Perform initial health check (non-blocking)
      cacheMonitor
        .performHealthCheck()
        .then((healthReport) => {
          console.log(`🏥 Initial cache health: ${healthReport.status}`)
        })
        .catch(() => {
          // Ignore health check errors
        })
    } else {
      console.log('🟡 Redis not available, running without cache')
    }
  } catch (error) {
    console.warn(
      '🟡 Cache initialization failed:',
      error instanceof Error ? error.message : 'Unknown error',
    )
    console.log('📝 Application will continue without caching')
  }
}

/**
 * Graceful shutdown of cache system
 * Should be called during application shutdown
 */
export async function shutdownCache(): Promise<void> {
  try {
    console.log('🛑 Shutting down cache system...')

    // Stop monitoring
    cacheMonitor.stopMonitoring()
    console.log('📊 Cache monitoring stopped')

    // Disconnect Redis
    await disconnectRedis()
    console.log('✅ Cache system shutdown complete')
  } catch (error) {
    console.error('🔴 Error during cache shutdown:', error)
  }
}

/**
 * Setup process handlers for graceful shutdown
 * Call this during application initialization
 */
export function setupCacheShutdownHandlers(): void {
  // Handle process termination
  process.on('SIGTERM', async () => {
    console.log('📡 SIGTERM received, shutting down cache...')
    await shutdownCache()
    process.exit(0)
  })

  process.on('SIGINT', async () => {
    console.log('📡 SIGINT received, shutting down cache...')
    await shutdownCache()
    process.exit(0)
  })

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    console.error('🔴 Uncaught exception:', error)
    await shutdownCache()
    process.exit(1)
  })

  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason, promise) => {
    console.error('🔴 Unhandled rejection at:', promise, 'reason:', reason)
    await shutdownCache()
    process.exit(1)
  })
}

/**
 * Get cache system status for health checks
 */
export async function getCacheSystemStatus(): Promise<{
  initialized: boolean
  monitoring: boolean
  redis: boolean
  error?: string
}> {
  try {
    const client = await getRedisClient()
    const lastReport = cacheMonitor.getLastHealthReport()

    return {
      initialized: true,
      monitoring: lastReport !== null,
      redis: client !== null && lastReport?.redis.connected === true,
    }
  } catch (error) {
    return {
      initialized: false,
      monitoring: false,
      redis: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
