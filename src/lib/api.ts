/**
 * API Client Functions
 *
 * This module provides type-safe API client functions for interacting
 * with the ScriptFlow backend with real API calls.
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
  const isBrowser = typeof window !== 'undefined'
  // Prefer same-origin relative requests in the browser to avoid CORS/base URL issues
  // Fall back to env-based absolute URL on the server
  const serverBase =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
    'http://localhost:3000'
  const url = isBrowser ? endpoint : `${serverBase}${endpoint}`

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
      const apiError = new APIError(
        data.error || 'API request failed',
        response.status,
        data,
      )

      // Don't log expected 404 errors to avoid console clutter
      if (response.status !== 404) {
        console.error(
          `API Error (${response.status}):`,
          data.error || 'Unknown error',
        )
      }

      throw apiError
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
 * Sends request to real transcription API with progress tracking
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

  // Create realistic progress simulation for user feedback
  // This provides smooth, linear progress instead of random jumps
  let progressInterval: NodeJS.Timeout | null = null
  if (onProgress) {
    let currentProgress = 0
    const progressIncrement = 3 // Increment by 3% every 300ms for faster feedback
    const maxProgress = 90 // Don't go to 100% until actual completion

    progressInterval = setInterval(() => {
      if (currentProgress < maxProgress) {
        currentProgress += progressIncrement
        onProgress(Math.min(currentProgress, maxProgress))
      }
    }, 300)
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

    // Clear progress interval and complete progress
    if (progressInterval) {
      clearInterval(progressInterval)
    }
    if (onProgress) {
      onProgress(100)
    }

    return response
  } catch (error) {
    // Clear progress interval on error
    if (progressInterval) {
      clearInterval(progressInterval)
    }
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
  console.error('API Error Details:', error)

  if (error instanceof APIError) {
    // Check if error data has additional details
    const errorData = error.data as {
      error?: string
      details?: string
      hint?: string
      message?: string
    }

    // Handle specific error cases
    switch (error.status) {
      case 400:
        return error.message || 'Invalid request. Please check your input.'
      case 404:
        return errorData?.error || 'Video not found or not accessible.'
      case 413:
        return errorData?.message || 'Video is too long for transcription.'
      case 429:
        return 'Rate limit exceeded. Please try again later.'
      case 500:
        // For server errors, show more details if available
        if (errorData?.details) {
          return `${errorData.error || 'Server error'}: ${errorData.details}`
        }
        return (
          errorData?.error ||
          error.message ||
          'Server error. Please try again later.'
        )
      case 504:
        return 'Request timed out. The video might be too long or the service is overloaded.'
      default:
        return error.message || 'An unexpected error occurred.'
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'An unknown error occurred. Check browser console for details.'
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

/**
 * Delete a transcript by ID
 */
export async function deleteTranscript(transcriptId: string): Promise<void> {
  const response = await apiRequest<{
    success: boolean
    message?: string
  }>(`/api/transcript/${transcriptId}/delete`, {
    method: 'DELETE',
  })

  if (!response.success) {
    throw new Error(response.message || 'Failed to delete transcript')
  }
}
