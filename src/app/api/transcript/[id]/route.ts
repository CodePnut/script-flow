/**
 * GET /api/transcript/[id]
 *
 * Fetch completed transcript data by ID
 *
 * This endpoint retrieves stored transcript data from the database
 * and formats it for frontend consumption. It handles both successful
 * and error cases gracefully.
 *
 * Features:
 * - Fetch transcript by ID from database
 * - Convert database format to frontend format
 * - Handle missing transcripts gracefully
 * - Privacy-preserving (no sensitive data exposed)
 * - Optimized queries with proper indexing
 */

import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import type {
  VideoData,
  TranscriptSegment,
  VideoChapter,
} from '@/lib/transcript'

/**
 * GET /api/transcript/[id]
 *
 * Fetch transcript data by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    // Validate transcript ID format
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid transcript ID' },
        { status: 400 },
      )
    }

    // Fetch transcript from database
    const transcript = await prisma.transcript.findUnique({
      where: { id },
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
        { error: 'Transcript not found' },
        { status: 404 },
      )
    }

    // Check if transcript is completed
    if (transcript.status !== 'completed') {
      return NextResponse.json(
        {
          error: 'Transcript not ready',
          status: transcript.status,
          message: 'Transcript is still processing',
        },
        { status: 202 }, // Accepted but not ready
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
        // AI summary metadata
        topics: (transcript.metadata as { topics?: string[] })?.topics,
        keyPoints: (transcript.metadata as { keyPoints?: string[] })?.keyPoints,
        summaryConfidence: (
          transcript.metadata as { summaryConfidence?: number }
        )?.summaryConfidence,
        summaryStyle: (transcript.metadata as { summaryStyle?: string })
          ?.summaryStyle as 'brief' | 'detailed' | 'executive' | 'educational',
      },
    }

    return NextResponse.json(videoData)
  } catch (error) {
    console.error('🔴 Error fetching transcript:', error)

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
