/**
 * Cache Service Unit Tests
 *
 * Tests for the Redis caching layer functionality including:
 * - Cache operations (get/set/invalidate)
 * - Performance metrics tracking
 * - Error handling and graceful degradation
 * - Cache monitoring and health checks
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import type { Transcript } from '@/generated/prisma'
import { cacheService } from '@/lib/cache'
import type { VideoData } from '@/lib/transcript'

// Mock Redis client
const mockRedisClient = {
  get: vi.fn(),
  setEx: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
  ping: vi.fn(),
  info: vi.fn(),
  isOpen: true,
}

// Mock the Redis module
vi.mock('@/lib/redis', () => ({
  getRedisClient: vi.fn(() => Promise.resolve(mockRedisClient)),
  checkRedisHealth: vi.fn(() =>
    Promise.resolve({ connected: true, latency: 10 }),
  ),
  REDIS_KEYS: {
    TRANSCRIPT: 'transcript:',
    VIDEO_METADATA: 'video:',
    SEARCH_RESULTS: 'search:',
  },
  CACHE_TTL: {
    TRANSCRIPT: 86400,
    VIDEO_METADATA: 43200,
    SEARCH_RESULTS: 1800,
  },
}))

describe('Cache Service', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
    cacheService.resetMetrics()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Transcript Caching', () => {
    const mockTranscript: Transcript = {
      id: 'test-transcript-id',
      videoId: 'test-video-id',
      title: 'Test Video',
      description: 'Test Description',
      summary: 'Test Summary',
      language: 'en',
      duration: 300,
      chapters: [],
      utterances: [],
      metadata: {},
      deepgramJob: 'test-job',
      status: 'completed',
      userId: null,
      ipHash: 'test-hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('should cache and retrieve transcript successfully', async () => {
      // Mock Redis get to return null (cache miss)
      mockRedisClient.get.mockResolvedValueOnce(null)

      // Test cache miss
      const cachedTranscript = await cacheService.getTranscript('test-video-id')
      expect(cachedTranscript).toBeNull()
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        'transcript:test-video-id',
      )

      // Test cache set
      await cacheService.setTranscript('test-video-id', mockTranscript)
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'transcript:test-video-id',
        86400,
        JSON.stringify(mockTranscript),
      )

      // Mock Redis get to return cached data (cache hit)
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(mockTranscript))

      // Test cache hit
      const retrievedTranscript =
        await cacheService.getTranscript('test-video-id')

      // Dates are serialized as strings in JSON, so we need to compare accordingly
      expect(retrievedTranscript).toEqual({
        ...mockTranscript,
        createdAt: mockTranscript.createdAt.toISOString(),
        updatedAt: mockTranscript.updatedAt.toISOString(),
      })
    })

    it('should handle cache errors gracefully', async () => {
      // Mock Redis error
      mockRedisClient.get.mockRejectedValueOnce(
        new Error('Redis connection failed'),
      )

      // Should return null on error and not throw
      const result = await cacheService.getTranscript('test-video-id')
      expect(result).toBeNull()

      // Should track error in metrics
      const metrics = cacheService.getMetrics()
      expect(metrics.errors).toBe(1)
    })

    it('should invalidate transcript cache', async () => {
      await cacheService.invalidateTranscript('test-video-id')

      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'transcript:test-video-id',
      )
      expect(mockRedisClient.del).toHaveBeenCalledWith('video:test-video-id')
    })
  })

  describe('Video Metadata Caching', () => {
    const mockVideoData: VideoData = {
      videoId: 'test-video-id',
      title: 'Test Video',
      description: 'Test Description',
      duration: 300,
      thumbnailUrl: 'https://example.com/thumb.jpg',
      transcript: [],
      summary: 'Test Summary',
      chapters: [],
      metadata: {
        language: 'en',
        generatedAt: new Date(),
        source: 'deepgram',
      },
    }

    it('should cache and retrieve video metadata', async () => {
      // Test cache miss
      mockRedisClient.get.mockResolvedValueOnce(null)
      const cachedData = await cacheService.getVideoMetadata('test-video-id')
      expect(cachedData).toBeNull()

      // Test cache set
      await cacheService.setVideoMetadata('test-video-id', mockVideoData)
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'video:test-video-id',
        43200,
        JSON.stringify(mockVideoData),
      )

      // Test cache hit
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(mockVideoData))
      const retrievedData = await cacheService.getVideoMetadata('test-video-id')

      // Dates are serialized as strings in JSON, so we need to compare accordingly
      expect(retrievedData).toEqual({
        ...mockVideoData,
        metadata: {
          ...mockVideoData.metadata,
          generatedAt: mockVideoData.metadata.generatedAt.toISOString(),
        },
      })
    })
  })

  describe('Search Results Caching', () => {
    const mockSearchResults = [
      { id: '1', title: 'Result 1' },
      { id: '2', title: 'Result 2' },
    ]

    it('should cache and retrieve search results', async () => {
      const query = 'test search query'

      // Test cache miss
      mockRedisClient.get.mockResolvedValueOnce(null)
      const cachedResults = await cacheService.getSearchResults(query)
      expect(cachedResults).toBeNull()

      // Test cache set
      await cacheService.setSearchResults(query, mockSearchResults)
      expect(mockRedisClient.setEx).toHaveBeenCalled()

      // Test cache hit
      mockRedisClient.get.mockResolvedValueOnce(
        JSON.stringify(mockSearchResults),
      )
      const retrievedResults = await cacheService.getSearchResults(query)
      expect(retrievedResults).toEqual(mockSearchResults)
    })

    it('should invalidate search results cache', async () => {
      mockRedisClient.keys.mockResolvedValueOnce([
        'search:hash1',
        'search:hash2',
      ])

      await cacheService.invalidateSearchResults()

      expect(mockRedisClient.keys).toHaveBeenCalledWith('search:*')
      expect(mockRedisClient.del).toHaveBeenCalledWith([
        'search:hash1',
        'search:hash2',
      ])
    })
  })

  describe('Performance Metrics', () => {
    it('should track cache hits and misses', async () => {
      // Initial metrics should be zero
      let metrics = cacheService.getMetrics()
      expect(metrics.hits).toBe(0)
      expect(metrics.misses).toBe(0)
      expect(metrics.totalRequests).toBe(0)

      // Cache miss
      mockRedisClient.get.mockResolvedValueOnce(null)
      await cacheService.getTranscript('test-video-id')

      metrics = cacheService.getMetrics()
      expect(metrics.misses).toBe(1)
      expect(metrics.totalRequests).toBe(1)
      expect(metrics.hitRate).toBe(0)

      // Cache hit
      mockRedisClient.get.mockResolvedValueOnce('{"test": "data"}')
      await cacheService.getTranscript('test-video-id')

      metrics = cacheService.getMetrics()
      expect(metrics.hits).toBe(1)
      expect(metrics.misses).toBe(1)
      expect(metrics.totalRequests).toBe(2)
      expect(metrics.hitRate).toBe(50)
    })

    it('should track errors', async () => {
      mockRedisClient.get.mockRejectedValueOnce(new Error('Test error'))

      await cacheService.getTranscript('test-video-id')

      const metrics = cacheService.getMetrics()
      expect(metrics.errors).toBe(1)
    })

    it('should reset metrics', () => {
      // Generate some metrics
      mockRedisClient.get.mockResolvedValueOnce(null)
      cacheService.getTranscript('test-video-id')

      // Reset metrics
      cacheService.resetMetrics()

      const metrics = cacheService.getMetrics()
      expect(metrics.hits).toBe(0)
      expect(metrics.misses).toBe(0)
      expect(metrics.errors).toBe(0)
      expect(metrics.totalRequests).toBe(0)
    })
  })

  describe('Cache Statistics', () => {
    it('should get cache statistics', async () => {
      mockRedisClient.keys.mockResolvedValueOnce(['key1', 'key2', 'key3'])
      mockRedisClient.info.mockResolvedValueOnce(
        'used_memory_human:1.5M\nother_info:value',
      )

      const stats = await cacheService.getCacheStats()

      expect(stats.keyCount).toBe(3)
      expect(stats.memoryUsage).toBe('1.5M')
      expect(mockRedisClient.keys).toHaveBeenCalledWith('*')
      expect(mockRedisClient.info).toHaveBeenCalledWith('memory')
    })

    it('should handle missing memory info gracefully', async () => {
      mockRedisClient.keys.mockResolvedValueOnce(['key1'])
      mockRedisClient.info.mockRejectedValueOnce(
        new Error('Info not available'),
      )

      const stats = await cacheService.getCacheStats()

      expect(stats.keyCount).toBe(1)
      expect(stats.memoryUsage).toBeUndefined()
    })
  })

  describe('Graceful Degradation', () => {
    it('should handle Redis unavailable gracefully', async () => {
      // Mock getRedisClient to return null (Redis unavailable)
      const { getRedisClient } = await import('@/lib/redis')
      vi.mocked(getRedisClient).mockResolvedValueOnce(null)

      // All operations should return null/undefined without throwing
      const transcript = await cacheService.getTranscript('test-video-id')
      expect(transcript).toBeNull()

      // Set operations should not throw
      await expect(
        cacheService.setTranscript('test-video-id', {} as Transcript),
      ).resolves.toBeUndefined()
    })
  })
})
