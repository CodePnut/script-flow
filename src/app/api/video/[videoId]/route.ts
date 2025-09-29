/**
 * GET /api/video/[videoId]
 *
 * Fetch video data and transcript by YouTube video ID
 *
 * This endpoint retrieves video data by video ID, which is what the
 * video viewer expects. It looks up the most recent completed transcript
 * for the given video ID.
 *
 * Features:
 * - Fetch transcript by YouTube video ID
 * - Return most recent completed transcript
 * - Handle missing videos gracefully
 * - Convert database format to frontend format
 * - Privacy-preserving (no sensitive data exposed)
 */

import { NextRequest, NextResponse } from 'next/server'

import { cache } from '@/lib/cache'
import { optimizedQueries } from '@/lib/db-optimization'
import type {
  VideoData,
  TranscriptSegment,
  VideoChapter,
  KeyPointRich,
} from '@/lib/transcript'

/**
 * Type definition for transcript metadata from database
 */
interface TranscriptMetadata {
  keyPoints?: string[]
  keyPointsRich?: Array<{
    text: string
    category?: string
    start?: number
    end?: number
  }>
  summaryConfidence?: number
  [key: string]: unknown
}

/**
 * GET /api/video/[videoId]
 *
 * Fetch video data by YouTube video ID
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ videoId: string }> },
) {
  try {
    const params = await context.params
    const videoId = params?.videoId || ''

    // Validate video ID format
    if (!videoId || typeof videoId !== 'string') {
      return NextResponse.json({ error: 'Invalid video ID' }, { status: 400 })
    }

    // Try to get video data from cache first
    console.log(`🔍 Checking cache for video: ${videoId}`)
    const cachedVideoData = await cache.getVideoMetadata(videoId)

    if (cachedVideoData) {
      console.log(`✅ Cache hit for video: ${videoId}`)
      return NextResponse.json(cachedVideoData)
    }

    // Cache miss - fetch from database
    console.log(`🔍 Cache miss for video: ${videoId}, fetching from database`)

    const transcript = await optimizedQueries.findTranscript(videoId)

    if (!transcript) {
      console.log(`❌ Video not found: ${videoId}`)
      return NextResponse.json(
        { error: 'Video not found or not transcribed yet' },
        { status: 404 },
      )
    }

    // Helper to sanitize rich key points from metadata JSON
    const sanitizeKeyPointsRich = (value: unknown): KeyPointRich[] => {
      if (!Array.isArray(value)) return []
      const allowed = new Set([
        'Concept',
        'Example',
        'Action',
        'Result',
        'Tip',
        'Metric',
        'Best Practice',
        'Warning',
        'Process',
      ])
      return (value as unknown[])
        .map((v) => {
          const o = v as Record<string, unknown>
          const cat =
            typeof o.category === 'string' && allowed.has(o.category)
              ? (o.category as KeyPointRich['category'])
              : undefined
          return {
            text: String(o.text || ''),
            category: cat,
            start: typeof o.start === 'number' ? o.start : undefined,
            end: typeof o.end === 'number' ? o.end : undefined,
          } as KeyPointRich
        })
        .filter((k) => !!k.text)
    }

    // Convert database format to frontend VideoData format
    const videoData: VideoData = {
      id: transcript.id,
      videoId: transcript.videoId,
      title: transcript.title,
      description: transcript.description || '',
      duration: transcript.duration || 0,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      transcript: convertUtterancesToSegments(transcript.utterances),
      summary: transcript.summary || 'No summary available',
      chapters: convertChaptersToVideoChapters(transcript.chapters),
      metadata: {
        language: transcript.language || 'en',
        generatedAt: transcript.createdAt || new Date(),
        source: 'deepgram',
        keyPoints: (transcript.metadata as TranscriptMetadata)?.keyPoints || [],
        keyPointsRich: sanitizeKeyPointsRich(
          (transcript.metadata as TranscriptMetadata)?.keyPointsRich,
        ),
        summaryConfidence:
          (transcript.metadata as TranscriptMetadata)?.summaryConfidence || 0.8,
      },
    }

    // Cache the result
    await cache.setVideoMetadata(videoId, videoData)
    console.log(`💾 Cached video data for: ${videoId}`)

    return NextResponse.json(videoData)
  } catch (error) {
    console.error('🔴 Error fetching video:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * Convert database utterances to frontend transcript segments
 */
function convertUtterancesToSegments(utterances: unknown): TranscriptSegment[] {
  if (!utterances || !Array.isArray(utterances)) {
    return []
  }

  return utterances.map((utterance: unknown, index: number) => {
    const u = utterance as Record<string, unknown>
    return {
      id: (u.id as string) || `seg-${index + 1}`,
      start: (u.start as number) || 0,
      end: (u.end as number) || 0,
      text: (u.text as string) || '',
      speaker:
        u.speaker !== undefined && u.speaker !== null
          ? `Speaker ${u.speaker}`
          : undefined,
      confidence:
        typeof u.confidence === 'number' ? (u.confidence as number) : 0.95,
    }
  })
}

/**
 * Convert database chapters to frontend video chapters
 */
function convertChaptersToVideoChapters(chapters: unknown): VideoChapter[] {
  if (!chapters || !Array.isArray(chapters)) {
    return []
  }

  return chapters.map((chapter: unknown) => {
    const c = chapter as Record<string, unknown>
    return {
      id:
        (c.id as string) ||
        `chapter-${Math.random().toString(36).substr(2, 9)}`,
      title: (c.title as string) || 'Untitled Chapter',
      start: (c.start as number) || 0,
      end: (c.end as number) || 0,
      description: (c.description as string) || '',
    }
  })
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
