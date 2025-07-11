import { extractVideoId, fetchVideoMetadata } from './youtube'

/**
 * Transcription utility functions for simulating and managing transcription processes
 */

/**
 * Transcription result interface
 */
export interface TranscriptionResult {
  videoId: string
  title: string
  url: string
  status: 'completed' | 'failed'
  duration: number // Processing duration in milliseconds
}

/**
 * Simulate video transcription process
 * Returns a Promise that resolves after exactly 2000ms as specified
 *
 * @param url - YouTube URL to transcribe
 * @returns Promise<TranscriptionResult> - Resolves with transcription result
 */
export async function simulateTranscription(
  url: string,
): Promise<TranscriptionResult> {
  const startTime = Date.now()

  // Extract video ID from URL
  const videoId = extractVideoId(url)

  if (!videoId) {
    throw new Error('Invalid YouTube URL provided')
  }

  // Simulate transcription processing for exactly 2000ms
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Fetch mock video metadata
  try {
    const metadata = await fetchVideoMetadata()
    const endTime = Date.now()

    return {
      videoId,
      title: metadata.title,
      url: url.trim(),
      status: 'completed',
      duration: endTime - startTime,
    }
  } catch {
    const endTime = Date.now()

    return {
      videoId,
      title: 'Failed to fetch video title',
      url: url.trim(),
      status: 'failed',
      duration: endTime - startTime,
    }
  }
}

/**
 * Validate transcription prerequisites
 * @param url - YouTube URL to validate
 * @returns Object with validation result and error message if applicable
 */
export function validateTranscriptionUrl(url: string): {
  isValid: boolean
  error?: string
  videoId?: string
} {
  if (!url || typeof url !== 'string') {
    return {
      isValid: false,
      error: 'URL is required',
    }
  }

  const videoId = extractVideoId(url.trim())

  if (!videoId) {
    return {
      isValid: false,
      error: 'Invalid YouTube URL format',
    }
  }

  return {
    isValid: true,
    videoId,
  }
}

/**
 * Generate progress updates for the transcription process
 * Yields progress percentages from 0 to 100 over a specified duration
 *
 * @param durationMs - Total duration in milliseconds
 * @param intervalMs - Update interval in milliseconds (default: 100)
 */
export async function* generateProgressUpdates(
  durationMs: number = 2000,
  intervalMs: number = 100,
): AsyncGenerator<number, void, unknown> {
  const startTime = Date.now()
  const totalSteps = Math.floor(durationMs / intervalMs)

  for (let step = 0; step <= totalSteps; step++) {
    const elapsed = Date.now() - startTime
    const progress = Math.min(Math.floor((elapsed / durationMs) * 100), 100)

    yield progress

    if (progress >= 100) break

    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
}
