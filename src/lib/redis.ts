/**
 * Redis Client Configuration and Connection Management
 *
 * This module provides a singleton Redis client instance for caching
 * frequently accessed transcripts and improving application performance.
 *
 * Features:
 * - Singleton pattern to prevent multiple connections
 * - Development and production environment support
 * - Connection health monitoring
 * - Graceful error handling and fallback
 * - Type-safe Redis operations
 */

import { createClient } from 'redis'

type RedisClient = ReturnType<typeof createClient>

/**
 * Global variable to hold the Redis client instance
 * This prevents multiple instances in development due to hot reloading
 */
declare global {
  var __redis: RedisClient | undefined
}

/**
 * Redis client configuration options
 * Supports both local Redis and Upstash Redis (for production)
 */
const getRedisConfig = () => {
  // Production: Use Upstash Redis
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return {
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    }
  }

  // Development: Use local Redis or fallback URL
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

  return {
    url: redisUrl,
  }
}

/**
 * Initialize Redis client with proper error handling
 *
 * @returns Configured Redis client instance or null if connection fails
 */
async function createRedisClient(): Promise<RedisClient | null> {
  try {
    const config = getRedisConfig()

    const client = createClient({
      url: config.url,
      // Connection options
      socket: {
        connectTimeout: 3000, // Shorter timeout
        reconnectStrategy: false, // Disable automatic reconnection to prevent loops
      },
    })

    // Error handling - suppress repeated error messages
    let errorLogged = false
    client.on('error', (error) => {
      if (!errorLogged) {
        console.warn(
          '🟡 Redis client error (suppressing further errors):',
          error.message,
        )
        errorLogged = true
      }
    })

    client.on('connect', () => {
      console.log('✅ Redis client connected')
      errorLogged = false // Reset error logging on successful connection
    })

    client.on('disconnect', () => {
      console.log('🔌 Redis client disconnected')
    })

    // Connect to Redis with timeout
    const connectPromise = client.connect()
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection timeout')), 3000),
    )

    await Promise.race([connectPromise, timeoutPromise])

    return client
  } catch (error) {
    // Only log in development or when explicitly requested
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.VERBOSE_LOGGING === 'true'
    ) {
      console.warn(
        '🟡 Failed to initialize Redis client:',
        error instanceof Error ? error.message : 'Unknown error',
      )
      console.log('📝 Application will continue without caching')
    }
    return null
  }
}

/**
 * Singleton Redis client instance
 * Returns null if Redis is unavailable (graceful degradation)
 */
let redisClient: RedisClient | null = null
let redisInitialized = false
let redisConnectionFailed = false

export async function getRedisClient(): Promise<RedisClient | null> {
  // If Redis connection previously failed, don't try again for this session
  if (redisConnectionFailed) {
    return null
  }

  if (redisInitialized) {
    return redisClient
  }

  // Use global instance in development to prevent multiple connections
  if (process.env.NODE_ENV === 'development' && global.__redis) {
    redisClient = global.__redis
    redisInitialized = true
    return redisClient
  }

  // Initialize new client
  try {
    redisClient = await createRedisClient()
    redisInitialized = true

    // Store globally in development
    if (process.env.NODE_ENV === 'development' && redisClient) {
      global.__redis = redisClient
    }

    return redisClient
  } catch (error) {
    // Only log in development or when explicitly requested
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.VERBOSE_LOGGING === 'true'
    ) {
      console.warn(
        '🟡 Redis connection failed, disabling for this session:',
        error,
      )
    }
    redisConnectionFailed = true
    redisInitialized = true
    return null
  }
}

/**
 * Graceful shutdown handler
 * Ensures Redis connections are properly closed
 */
export async function disconnectRedis(): Promise<void> {
  try {
    const client = await getRedisClient()
    if (client && client.isOpen) {
      await client.disconnect()
      console.log('✅ Redis client disconnected successfully')
    }
  } catch (error) {
    console.error('🔴 Error disconnecting Redis client:', error)
  }
}

/**
 * Redis health check utility
 * Useful for monitoring and debugging connection issues
 */
export async function checkRedisHealth(): Promise<{
  connected: boolean
  latency?: number
  error?: string
}> {
  try {
    const client = await getRedisClient()

    if (!client) {
      return {
        connected: false,
        error: 'Redis client not available',
      }
    }

    const startTime = Date.now()

    // Simple ping to test connection
    await client.ping()

    const latency = Date.now() - startTime

    return {
      connected: true,
      latency,
    }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Redis key prefixes for different data types
 * Helps organize cached data and avoid key collisions
 */
export const REDIS_KEYS = {
  TRANSCRIPT: 'transcript:',
  VIDEO_METADATA: 'video:',
  USER_SESSION: 'session:',
  ANALYTICS: 'analytics:',
  SEARCH_RESULTS: 'search:',
} as const

/**
 * Default cache TTL values (in seconds)
 */
export const CACHE_TTL = {
  TRANSCRIPT: 60 * 60 * 24, // 24 hours
  VIDEO_METADATA: 60 * 60 * 12, // 12 hours
  SEARCH_RESULTS: 60 * 30, // 30 minutes
  ANALYTICS: 60 * 60, // 1 hour
  SESSION: 60 * 60 * 24 * 7, // 7 days
} as const
