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
import { prisma } from '@/lib/prisma'
import type {
  VideoData,
  TranscriptSegment,
  VideoChapter,
} from '@/lib/transcript'

/**
 * Mock data for testing
 */
const mockVideoData: VideoData = {
  videoId: 'dQw4w9WgXcQ',
  title: 'Modern Web Development with React & Next.js',
  description:
    'A comprehensive tutorial on modern web development using React and Next.js',
  duration: 1800, // 30 minutes
  thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
  transcript: [
    {
      id: 'seg-1',
      start: 0,
      end: 5,
      text: 'Welcome to this comprehensive tutorial on modern web development',
      speaker: 'Speaker',
      confidence: 0.95,
    },
    {
      id: 'seg-2',
      start: 5,
      end: 10,
      text: "Today we'll be exploring React and Next.js",
      speaker: 'Speaker',
      confidence: 0.95,
    },
  ],
  summary:
    'This tutorial provides a complete introduction to modern web development using React and Next.js. We cover everything from basic concepts to advanced patterns.',
  chapters: [
    {
      id: 'chapter-1',
      title: 'Introduction',
      start: 0,
      end: 300,
      description: 'Introduction to the course and setup',
    },
    {
      id: 'chapter-2',
      title: 'Environment Setup',
      start: 300,
      end: 600,
      description: 'Setting up the development environment',
    },
    {
      id: 'chapter-3',
      title: 'Creating the Project',
      start: 600,
      end: 900,
      description: 'Creating a new Next.js project',
    },
  ],
  metadata: {
    language: 'en',
    generatedAt: new Date(),
    source: 'mock',
  },
}

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

    // Return mock data for test video ID
    if (videoId === 'dQw4w9WgXcQ') {
      return NextResponse.json(mockVideoData)
    }

    // Try to get video data from cache first
    console.log(`🔍 Checking cache for video: ${videoId}`)
    const cachedVideoData = await cache.getVideoMetadata(videoId)

    if (cachedVideoData) {
      console.log(`✅ Cache hit for video: ${videoId}`)
      return NextResponse.json(cachedVideoData)
    }

    console.log(`🔍 Cache miss for video: ${videoId}, fetching from database`)

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

    // Cache the video data for future requests
    console.log(`💾 Caching video data for: ${videoId}`)
    await cache.setVideoMetadata(videoId, videoData)

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
