/**
 * Caching Service for ScriptFlow
 *
 * This module provides a comprehensive caching layer for frequently accessed
 * transcripts and video data. It implements cache invalidation strategies,
 * performance monitoring, and graceful fallback when Redis is unavailable.
 *
 * Features:
 * - Transcript caching with automatic TTL management
 * - Cache invalidation strategies
 * - Performance monitoring and metrics
 * - Graceful degradation when Redis is unavailable
 * - Type-safe caching operations
 */

import type { Transcript } from '../generated/prisma'

import { getRedisClient, REDIS_KEYS, CACHE_TTL } from './redis'
import type { VideoData } from './transcript'

/**
 * Cache performance metrics
 */
interface CacheMetrics {
  hits: number
  misses: number
  errors: number
  totalRequests: number
  averageLatency: number
}

/**
 * Cache service class with comprehensive caching functionality
 */
class CacheService {
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    errors: 0,
    totalRequests: 0,
    averageLatency: 0,
  }

  /**
   * Get cached transcript by video ID
   * @param videoId - YouTube video ID
   * @returns Cached transcript data or null
   */
  async getTranscript(videoId: string): Promise<Transcript | null> {
    const startTime = Date.now()
    this.metrics.totalRequests++

    try {
      const client = await getRedisClient()
      if (!client) {
        this.metrics.misses++
        return null
      }

      const key = `${REDIS_KEYS.TRANSCRIPT}${videoId}`
      const cached = await client.get(key)

      if (cached) {
        this.metrics.hits++
        this.updateLatencyMetrics(startTime)
        return JSON.parse(cached) as Transcript
      }

      this.metrics.misses++
      return null
    } catch (error) {
      this.metrics.errors++
      console.warn('🟡 Cache get error for transcript:', error)
      return null
    } finally {
      this.updateLatencyMetrics(startTime)
    }
  }

  /**
   * Cache transcript data
   * @param videoId - YouTube video ID
   * @param transcript - Transcript data to cache
   * @param ttl - Time to live in seconds (optional)
   */
  async setTranscript(
    videoId: string,
    transcript: Transcript,
    ttl: number = CACHE_TTL.TRANSCRIPT,
  ): Promise<void> {
    try {
      const client = await getRedisClient()
      if (!client) return

      const key = `${REDIS_KEYS.TRANSCRIPT}${videoId}`
      const value = JSON.stringify(transcript)

      await client.setEx(key, ttl, value)
      console.log(`✅ Cached transcript for video: ${videoId}`)
    } catch (error) {
      this.metrics.errors++
      console.warn('🟡 Cache set error for transcript:', error)
    }
  }

  /**
   * Get cached video metadata
   * @param videoId - YouTube video ID
   * @returns Cached video metadata or null
   */
  async getVideoMetadata(videoId: string): Promise<VideoData | null> {
    const startTime = Date.now()
    this.metrics.totalRequests++

    try {
      const client = await getRedisClient()
      if (!client) {
        this.metrics.misses++
        return null
      }

      const key = `${REDIS_KEYS.VIDEO_METADATA}${videoId}`
      const cached = await client.get(key)

      if (cached) {
        this.metrics.hits++
        this.updateLatencyMetrics(startTime)
        return JSON.parse(cached) as VideoData
      }

      this.metrics.misses++
      return null
    } catch (error) {
      this.metrics.errors++
      console.warn('🟡 Cache get error for video metadata:', error)
      return null
    } finally {
      this.updateLatencyMetrics(startTime)
    }
  }

  /**
   * Cache video metadata
   * @param videoId - YouTube video ID
   * @param metadata - Video metadata to cache
   * @param ttl - Time to live in seconds (optional)
   */
  async setVideoMetadata(
    videoId: string,
    metadata: VideoData,
    ttl: number = CACHE_TTL.VIDEO_METADATA,
  ): Promise<void> {
    try {
      const client = await getRedisClient()
      if (!client) return

      const key = `${REDIS_KEYS.VIDEO_METADATA}${videoId}`
      const value = JSON.stringify(metadata)

      await client.setEx(key, ttl, value)
      console.log(`✅ Cached video metadata for: ${videoId}`)
    } catch (error) {
      this.metrics.errors++
      console.warn('🟡 Cache set error for video metadata:', error)
    }
  }

  /**
   * Get cached search results
   * @param query - Search query string
   * @returns Cached search results or null
   */
  async getSearchResults(query: string): Promise<unknown[] | null> {
    const startTime = Date.now()
    this.metrics.totalRequests++

    try {
      const client = await getRedisClient()
      if (!client) {
        this.metrics.misses++
        return null
      }

      const key = `${REDIS_KEYS.SEARCH_RESULTS}${this.hashQuery(query)}`
      const cached = await client.get(key)

      if (cached) {
        this.metrics.hits++
        this.updateLatencyMetrics(startTime)
        return JSON.parse(cached)
      }

      this.metrics.misses++
      return null
    } catch (error) {
      this.metrics.errors++
      console.warn('🟡 Cache get error for search results:', error)
      return null
    } finally {
      this.updateLatencyMetrics(startTime)
    }
  }

  /**
   * Cache search results
   * @param query - Search query string
   * @param results - Search results to cache
   * @param ttl - Time to live in seconds (optional)
   */
  async setSearchResults(
    query: string,
    results: unknown[],
    ttl: number = CACHE_TTL.SEARCH_RESULTS,
  ): Promise<void> {
    try {
      const client = await getRedisClient()
      if (!client) return

      const key = `${REDIS_KEYS.SEARCH_RESULTS}${this.hashQuery(query)}`
      const value = JSON.stringify(results)

      await client.setEx(key, ttl, value)
      console.log(`✅ Cached search results for query: ${query}`)
    } catch (error) {
      this.metrics.errors++
      console.warn('🟡 Cache set error for search results:', error)
    }
  }

  /**
   * Invalidate transcript cache
   * @param videoId - YouTube video ID
   */
  async invalidateTranscript(videoId: string): Promise<void> {
    try {
      const client = await getRedisClient()
      if (!client) return

      const transcriptKey = `${REDIS_KEYS.TRANSCRIPT}${videoId}`
      const metadataKey = `${REDIS_KEYS.VIDEO_METADATA}${videoId}`

      await Promise.all([client.del(transcriptKey), client.del(metadataKey)])

      console.log(`✅ Invalidated cache for video: ${videoId}`)
    } catch (error) {
      this.metrics.errors++
      console.warn('🟡 Cache invalidation error:', error)
    }
  }

  /**
   * Invalidate search results cache
   * @param pattern - Optional pattern to match keys (default: all search results)
   */
  async invalidateSearchResults(pattern?: string): Promise<void> {
    try {
      const client = await getRedisClient()
      if (!client) return

      const searchPattern = pattern || `${REDIS_KEYS.SEARCH_RESULTS}*`
      const keys = await client.keys(searchPattern)

      if (keys.length > 0) {
        await client.del(keys)
        console.log(`✅ Invalidated ${keys.length} search result cache entries`)
      }
    } catch (error) {
      this.metrics.errors++
      console.warn('🟡 Search cache invalidation error:', error)
    }
  }

  /**
   * Clear all cache entries (use with caution)
   */
  async clearAllCache(): Promise<void> {
    try {
      const client = await getRedisClient()
      if (!client) return

      await client.flushAll()
      console.log('✅ Cleared all cache entries')
    } catch (error) {
      this.metrics.errors++
      console.warn('🟡 Cache clear error:', error)
    }
  }

  /**
   * Get cache performance metrics
   * @returns Current cache performance metrics
   */
  getMetrics(): CacheMetrics & { hitRate: number } {
    const hitRate =
      this.metrics.totalRequests > 0
        ? (this.metrics.hits / this.metrics.totalRequests) * 100
        : 0

    return {
      ...this.metrics,
      hitRate: Math.round(hitRate * 100) / 100, // Round to 2 decimal places
    }
  }

  /**
   * Reset cache metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      totalRequests: 0,
      averageLatency: 0,
    }
  }

  /**
   * Get cache size and memory usage
   * @returns Cache statistics
   */
  async getCacheStats(): Promise<{
    keyCount: number
    memoryUsage?: string
    error?: string
  }> {
    try {
      const client = await getRedisClient()
      if (!client) {
        return {
          keyCount: 0,
          error: 'Redis client not available',
        }
      }

      // Get total number of keys
      const keys = await client.keys('*')
      const keyCount = keys.length

      // Try to get memory info (may not be available in all Redis configurations)
      let memoryUsage: string | undefined
      try {
        const info = await client.info('memory')
        const memoryMatch = info.match(/used_memory_human:(.+)/)
        if (memoryMatch) {
          memoryUsage = memoryMatch[1].trim()
        }
      } catch {
        // Memory info not available, continue without it
      }

      return {
        keyCount,
        memoryUsage,
      }
    } catch (error) {
      return {
        keyCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Update latency metrics
   * @param startTime - Request start time
   */
  private updateLatencyMetrics(startTime: number): void {
    const latency = Date.now() - startTime
    const totalLatency =
      this.metrics.averageLatency * (this.metrics.totalRequests - 1)
    this.metrics.averageLatency =
      (totalLatency + latency) / this.metrics.totalRequests
  }

  /**
   * Hash query string for consistent cache keys
   * @param query - Query string to hash
   * @returns Hashed query string
   */
  private hashQuery(query: string): string {
    // Simple hash function for cache keys
    let hash = 0
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }
}

/**
 * Singleton cache service instance
 */
export const cacheService = new CacheService()

/**
 * Initialize cache system on module load
 * This ensures cache monitoring starts when the cache is first used
 */
if (typeof window === 'undefined') {
  // Only run on server side
  import('./cache-init')
    .then(({ initializeCache, setupCacheShutdownHandlers }) => {
      initializeCache().catch(console.warn)
      setupCacheShutdownHandlers()
    })
    .catch(console.warn)
}

/**
 * Convenience functions for common caching operations
 */
export const cache = {
  // Transcript operations
  getTranscript: (videoId: string) => cacheService.getTranscript(videoId),
  setTranscript: (videoId: string, transcript: Transcript, ttl?: number) =>
    cacheService.setTranscript(videoId, transcript, ttl),

  // Video metadata operations
  getVideoMetadata: (videoId: string) => cacheService.getVideoMetadata(videoId),
  setVideoMetadata: (videoId: string, metadata: VideoData, ttl?: number) =>
    cacheService.setVideoMetadata(videoId, metadata, ttl),

  // Search operations
  getSearchResults: (query: string) => cacheService.getSearchResults(query),
  setSearchResults: (query: string, results: unknown[], ttl?: number) =>
    cacheService.setSearchResults(query, results, ttl),

  // Invalidation operations
  invalidateTranscript: (videoId: string) =>
    cacheService.invalidateTranscript(videoId),
  invalidateSearchResults: (pattern?: string) =>
    cacheService.invalidateSearchResults(pattern),

  // Metrics and monitoring
  getMetrics: () => cacheService.getMetrics(),
  getCacheStats: () => cacheService.getCacheStats(),
  resetMetrics: () => cacheService.resetMetrics(),

  // Maintenance operations
  clearAll: () => cacheService.clearAllCache(),
}

export default cacheService
