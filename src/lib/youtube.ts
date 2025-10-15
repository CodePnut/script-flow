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

  // If a raw video ID is provided, accept it
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
    return cleanUrl
  }

  // Try structured URL parsing for robust handling of query params and paths
  try {
    const u = new URL(cleanUrl)
    const hostname = u.hostname.replace(/^www\./, '')

    // youtu.be short links: https://youtu.be/VIDEO_ID or with params
    if (hostname === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0]
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id
    }

    // youtube.com variants
    if (hostname.endsWith('youtube.com')) {
      // Standard watch URLs: v param can appear anywhere in the query string
      const v = u.searchParams.get('v')
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v

      // Shorts URLs: /shorts/VIDEO_ID
      const shortsMatch = u.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/)
      if (shortsMatch) return shortsMatch[1]

      // Embed URLs: /embed/VIDEO_ID
      const embedMatch = u.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/)
      if (embedMatch) return embedMatch[1]

      // Old format: /v/VIDEO_ID
      const oldMatch = u.pathname.match(/\/v\/([a-zA-Z0-9_-]{11})/)
      if (oldMatch) return oldMatch[1]
    }
  } catch {
    // Not a full URL - fall back to regex patterns
  }

  // Regex fallbacks, including v= anywhere in query string
  const patterns = [
    /(youtube\.com\/watch.*[?&]v=)([a-zA-Z0-9_-]{11})/,
    /(youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /(youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ]

  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern)
    if (match && match[2]) {
      return match[2]
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
