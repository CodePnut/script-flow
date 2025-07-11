/**
 * Transcript and video data types and utilities
 *
 * Handles mock transcript data structure for video viewer
 * In production, this would integrate with real transcript APIs
 */

/**
 * Individual transcript segment with timing information
 */
export interface TranscriptSegment {
  id: string
  start: number // Start time in seconds
  end: number // End time in seconds
  text: string
  speaker?: string // Optional speaker identification
  confidence?: number // Transcript confidence score (0-1)
}

/**
 * Video chapter for navigation
 */
export interface VideoChapter {
  id: string
  title: string
  start: number // Start time in seconds
  end: number // End time in seconds
  description?: string
}

/**
 * Complete video data structure
 */
export interface VideoData {
  videoId: string
  title: string
  description: string
  duration: number // Total duration in seconds
  thumbnailUrl: string
  transcript: TranscriptSegment[]
  summary: string
  chapters: VideoChapter[]
  metadata: {
    language: string
    generatedAt: Date
    source: 'mock' | 'deepgram' | 'whisper'
  }
}

/**
 * Format seconds to MM:SS or HH:MM:SS timestamp
 * @param seconds - Time in seconds
 * @returns Formatted timestamp string
 */
export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 * Find the active transcript segment for a given time
 * @param segments - Array of transcript segments
 * @param currentTime - Current playback time in seconds
 * @returns Active segment or null
 */
export function findActiveSegment(
  segments: TranscriptSegment[],
  currentTime: number,
): TranscriptSegment | null {
  return (
    segments.find(
      (segment) => currentTime >= segment.start && currentTime <= segment.end,
    ) || null
  )
}

/**
 * Group transcript segments into paragraphs for better readability
 * @param segments - Array of transcript segments
 * @param maxParagraphLength - Maximum characters per paragraph
 * @returns Grouped segments as paragraphs
 */
export function groupSegmentsIntoParagraphs(
  segments: TranscriptSegment[],
  maxParagraphLength: number = 200,
): TranscriptSegment[][] {
  const paragraphs: TranscriptSegment[][] = []
  let currentParagraph: TranscriptSegment[] = []
  let currentLength = 0

  for (const segment of segments) {
    // Start new paragraph if current one is too long or speaker changes
    const shouldStartNew =
      currentLength + segment.text.length > maxParagraphLength ||
      (currentParagraph.length > 0 &&
        currentParagraph[currentParagraph.length - 1].speaker !==
          segment.speaker)

    if (shouldStartNew && currentParagraph.length > 0) {
      paragraphs.push(currentParagraph)
      currentParagraph = []
      currentLength = 0
    }

    currentParagraph.push(segment)
    currentLength += segment.text.length
  }

  // Add final paragraph
  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph)
  }

  return paragraphs
}

/**
 * Parse video ID from URL if needed
 * @param input - Video ID or YouTube URL
 * @returns Clean video ID
 */
export function normalizeVideoId(input: string): string {
  // If it's already a video ID, return as-is
  if (input.match(/^[a-zA-Z0-9_-]{11}$/)) {
    return input
  }

  // Extract from YouTube URL
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ]

  for (const pattern of patterns) {
    const match = input.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return input // Return as-is if no pattern matches
}
