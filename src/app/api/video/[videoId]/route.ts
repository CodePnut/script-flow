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

import { prisma } from '@/lib/prisma'
import type {
  VideoData,
  TranscriptSegment,
  VideoChapter,
} from '@/lib/transcript'

/**
 * GET /api/video/[videoId]
 *
 * Fetch video data by YouTube video ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> },
) {
  try {
    const { videoId } = await params

    // Validate video ID format
    if (!videoId || typeof videoId !== 'string') {
      return NextResponse.json({ error: 'Invalid video ID' }, { status: 400 })
    }

    // Fetch the most recent completed transcript for this video
    const transcript = await prisma.transcript.findFirst({
      where: {
        videoId: videoId,
        status: 'completed',
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        videoId: true,
        title: true,
        description: true,
        duration: true,
        summary: true,
        language: true,
        chapters: true,
        utterances: true,
        metadata: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!transcript) {
      return NextResponse.json(
        { error: 'Video not found or not transcribed yet' },
        { status: 404 },
      )
    }

    // Convert database format to frontend VideoData format
    const videoData: VideoData = {
      videoId: transcript.videoId,
      title: transcript.title,
      description: transcript.description || '',
      duration: transcript.duration || 0,
      thumbnailUrl: `https://img.youtube.com/vi/${transcript.videoId}/maxresdefault.jpg`,
      transcript: convertUtterancesToSegments(transcript.utterances),
      summary: transcript.summary || '',
      chapters: convertChaptersToVideoChapters(transcript.chapters),
      metadata: {
        language: transcript.language,
        generatedAt: transcript.createdAt,
        source:
          (transcript.metadata as { source?: 'mock' | 'deepgram' | 'whisper' })
            ?.source || 'deepgram',
      },
    }

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
      speaker: u.speaker ? `Speaker ${u.speaker}` : 'Speaker',
      confidence: (u.confidence as number) || 0.95,
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
