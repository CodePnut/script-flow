/**
 * YouTube utility functions for video URL parsing and validation
 *
 * Supports all YouTube URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://youtube.com/embed/VIDEO_ID
 * - https://youtube.com/v/VIDEO_ID
 */

/**
 * Extract YouTube video ID from various URL formats
 * @param url - YouTube URL to parse
 * @returns Video ID string or null if invalid
 */
export function extractVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null
  }

  // Remove leading/trailing whitespace
  const cleanUrl = url.trim()

  // YouTube URL regex patterns
  const patterns = [
    // Standard watch URL: https://www.youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    // Short URL: https://youtu.be/VIDEO_ID
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    // Embed URL: https://youtube.com/embed/VIDEO_ID
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    // Old format: https://youtube.com/v/VIDEO_ID
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ]

  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

/**
 * Validate if a string is a valid YouTube URL
 * @param url - URL to validate
 * @returns boolean indicating if URL is valid YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
  return extractVideoId(url) !== null
}

/**
 * Generate YouTube thumbnail URL from video ID
 * @param videoId - YouTube video ID
 * @param quality - Thumbnail quality ('default', 'medium', 'high', 'standard', 'maxres')
 * @returns Thumbnail URL
 */
export function getThumbnailUrl(
  videoId: string,
  quality: 'default' | 'medium' | 'high' | 'standard' | 'maxres' = 'medium',
): string {
  // Map quality to correct YouTube thumbnail filename
  const qualityMap = {
    default: 'default',
    medium: 'mqdefault',
    high: 'hqdefault',
    standard: 'sddefault',
    maxres: 'maxresdefault',
  }

  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`
}

/**
 * Generate standard YouTube watch URL from video ID
 * @param videoId - YouTube video ID
 * @returns Standard YouTube watch URL
 */
export function generateWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}

/**
 * Parse YouTube URL and extract comprehensive video information
 * @param url - YouTube URL to parse
 * @returns Object with video information or null if invalid
 */
export function parseYouTubeUrl(url: string): {
  videoId: string
  originalUrl: string
  watchUrl: string
  thumbnailUrl: string
} | null {
  const videoId = extractVideoId(url)

  if (!videoId) {
    return null
  }

  return {
    videoId,
    originalUrl: url.trim(),
    watchUrl: generateWatchUrl(videoId),
    thumbnailUrl: getThumbnailUrl(videoId),
  }
}
