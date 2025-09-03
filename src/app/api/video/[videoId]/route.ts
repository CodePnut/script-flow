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
} from '@/lib/transcript'

/**
 * Type definition for transcript metadata from database
 */
interface TranscriptMetadata {
  keyPoints?: string[]
  summaryConfidence?: number
  [key: string]: unknown
}

/**
 * GET /api/video/[videoId]
 *
 * Fetch video data by YouTube video ID
 */
export async function GET(request: NextRequest, context: unknown) {
  try {
    const params = (context as { params?: { videoId?: string } })?.params
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
