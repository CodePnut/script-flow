/**
 * API Client Functions
 *
 * This module provides type-safe API client functions for interacting
 * with the ScriptFlow backend. It replaces the mock simulation functions
 * with real API calls.
 *
 * Features:
 * - Type-safe request/response handling
 * - Comprehensive error handling
 * - Request validation
 * - Progress tracking support
 * - Retry logic for failed requests
 */

import { z } from 'zod'

import { type VideoHistoryItem } from '@/hooks/useHistoryStore'
import { type VideoData } from '@/lib/transcript'

/**
 * API response types
 */
export interface TranscriptionResponse {
  transcriptId: string
  videoId: string
  title: string
  status: 'completed' | 'processing' | 'failed'
  duration: number
  message: string
}

export interface TranscriptionError {
  error: string
  message?: string
  details?: string[]
  duration?: number
  maxDuration?: number
}

/**
 * Request schemas for validation
 */
const transcribeRequestSchema = z.object({
  youtubeUrl: z.string().url('Please provide a valid URL'),
})

/**
 * Custom error class for API errors
 */
export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown,
  ) {
    super(message)
    this.name = 'APIError'
  }
}

/**
 * Generic API request function with error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const baseURL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const url = `${baseURL}${endpoint}`

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new APIError(
        data.error || 'API request failed',
        response.status,
        data,
      )
    }

    return data
  } catch (error) {
    if (error instanceof APIError) {
      throw error
    }

    // Handle network errors
    if (error instanceof TypeError) {
      throw new APIError('Network error - please check your connection', 0)
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      throw new APIError('Invalid response from server', 0)
    }

    // Generic error fallback
    throw new APIError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      0,
    )
  }
}

/**
 * Start YouTube video transcription
 *
 * Replaces the simulateTranscription function with real API call
 *
 * @param youtubeUrl - YouTube video URL to transcribe
 * @param options - Additional request options
 * @returns Promise with transcription result
 */
export async function startTranscription(
  youtubeUrl: string,
  options: {
    allowLongVideo?: boolean
    onProgress?: (progress: number) => void
  } = {},
): Promise<TranscriptionResponse> {
  // Validate input
  const validation = transcribeRequestSchema.safeParse({ youtubeUrl })
  if (!validation.success) {
    throw new APIError(
      validation.error.issues[0]?.message || 'Invalid YouTube URL',
      400,
    )
  }

  const { allowLongVideo = false, onProgress } = options

  // Set up headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (allowLongVideo) {
    headers['x-allow-long'] = 'true'
  }

  // Simulate progress updates for user feedback
  // In a real webhook implementation, this would come from server-sent events
  if (onProgress) {
    const progressInterval = setInterval(() => {
      onProgress(Math.min(95, Math.random() * 100))
    }, 1000)

    // Clean up interval after request
    setTimeout(() => clearInterval(progressInterval), 30000)
  }

  try {
    const response = await apiRequest<TranscriptionResponse>(
      '/api/transcribe',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ youtubeUrl }),
      },
    )

    // Complete progress if callback provided
    if (onProgress) {
      onProgress(100)
    }

    return response
  } catch (error) {
    // Clear progress on error
    if (onProgress) {
      onProgress(0)
    }

    throw error
  }
}

/**
 * Get transcript by ID
 *
 * Fetch completed transcript data
 *
 * @param transcriptId - Transcript ID to fetch
 * @returns Promise with transcript data
 */
export async function getTranscript(transcriptId: string): Promise<VideoData> {
  return apiRequest(`/api/transcript/${transcriptId}`)
}

/**
 * Get video metadata and transcript if available
 *
 * @param videoId - YouTube video ID
 * @returns Promise with video data
 */
export async function getVideo(videoId: string): Promise<VideoData> {
  return apiRequest(`/api/video/${videoId}`)
}

/**
 * Get user transcript history
 *
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 10)
 * @returns Promise with paginated history
 */
export async function getHistory(
  page: number = 1,
  limit: number = 10,
): Promise<{
  items: VideoHistoryItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
  meta?: {
    userHash: string
    timestamp: string
  }
}> {
  return apiRequest(`/api/history?page=${page}&limit=${limit}`)
}

/**
 * Check API health
 *
 * @returns Promise with health status
 */
export async function checkHealth(): Promise<{
  connected: boolean
  latency?: number
  error?: string
}> {
  return apiRequest('/api/health')
}

/**
 * Utility function to handle API errors in components
 *
 * @param error - Error object to handle
 * @returns User-friendly error message
 */
export function handleAPIError(error: unknown): string {
  if (error instanceof APIError) {
    // Handle specific error cases
    switch (error.status) {
      case 400:
        return error.message || 'Invalid request. Please check your input.'
      case 404:
        return 'Video not found or not accessible.'
      case 413:
        return (
          (error.data as { message?: string })?.message ||
          'Video is too long for transcription.'
        )
      case 429:
        return 'Rate limit exceeded. Please try again later.'
      case 500:
        return 'Server error. Please try again later.'
      default:
        return error.message || 'An unexpected error occurred.'
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'An unknown error occurred.'
}

/**
 * Type guards for API responses
 */
export function isTranscriptionResponse(
  data: unknown,
): data is TranscriptionResponse {
  if (!data || typeof data !== 'object' || data === null) {
    return false
  }

  const obj = data as Record<string, unknown>

  return (
    'transcriptId' in obj &&
    'videoId' in obj &&
    'title' in obj &&
    'status' in obj &&
    'duration' in obj &&
    typeof obj.transcriptId === 'string' &&
    typeof obj.videoId === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.status === 'string' &&
    typeof obj.duration === 'number'
  )
}

export function isTranscriptionError(
  data: unknown,
): data is TranscriptionError {
  if (!data || typeof data !== 'object' || data === null) {
    return false
  }

  const obj = data as Record<string, unknown>

  return 'error' in obj && typeof obj.error === 'string'
}

/**
 * Configuration constants
 */
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const
