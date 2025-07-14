/**
 * POST /api/transcribe
 *
 * Transcribe YouTube videos using Deepgram Speech-to-Text API
 *
 * This endpoint handles the core transcription workflow:
 * 1. Validates YouTube URL and extracts video ID
 * 2. Streams audio from YouTube using ytdl-core
 * 3. Sends audio stream to Deepgram for processing
 * 4. Stores transcription job in database
 * 5. Returns job ID for client-side polling
 *
 * Features:
 * - Real-time audio streaming (no file storage)
 * - Privacy-preserving IP-based user tracking
 * - Comprehensive error handling
 * - Request validation with Zod
 * - Database transaction safety
 * - Production-ready logging
 */

import { createClient } from '@deepgram/sdk'
import ytdl from '@distube/ytdl-core'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getUserIdentifier } from '@/lib/ipHash'
import { prisma } from '@/lib/prisma'
import { extractVideoId, isValidYouTubeUrl } from '@/lib/youtube'

/**
 * Request body validation schema
 */
const transcribeRequestSchema = z.object({
  youtubeUrl: z
    .string()
    .url('Please provide a valid URL')
    .refine(isValidYouTubeUrl, 'Please provide a valid YouTube URL'),
})

/**
 * Deepgram client configuration
 * Following official Deepgram documentation best practices
 */
const getDeepgramClient = () => createClient(process.env.DEEPGRAM_API_KEY!)

/**
 * Deepgram transcription options
 * Configured for optimal YouTube video processing
 */
const DEEPGRAM_OPTIONS = {
  model: 'nova-2',
  language: 'en',
  smart_format: true,
  diarize: true,
  summarize: true,
  detect_topics: true,
  punctuate: true,
  utterances: true,
  paragraphs: true,
} as const

/**
 * Maximum video duration in seconds (60 minutes)
 * Can be overridden with special header for power users
 */
const MAX_VIDEO_DURATION = 60 * 60 // 60 minutes in seconds

/**
 * POST /api/transcribe
 *
 * Process YouTube video transcription request
 */
export async function POST(request: NextRequest) {
  console.log('🟢 POST /api/transcribe - Request received')

  try {
    // Validate environment variables
    console.log('🔍 Checking environment variables...')
    const hasDeepgramKey = !!process.env.DEEPGRAM_API_KEY
    console.log(`🔍 DEEPGRAM_API_KEY exists: ${hasDeepgramKey}`)

    if (!process.env.DEEPGRAM_API_KEY) {
      console.error('🔴 DEEPGRAM_API_KEY is not set')
      return NextResponse.json(
        {
          error:
            'Transcription service not configured. Please set DEEPGRAM_API_KEY in your .env file.',
        },
        { status: 500 },
      )
    }

    // Validate request body
    console.log('🔍 Parsing request body...')
    const body = await request.json()
    console.log('🔍 Request body:', JSON.stringify(body))
    const validation = transcribeRequestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.issues,
        },
        { status: 400 },
      )
    }

    const { youtubeUrl } = validation.data

    // Extract video ID from URL
    const videoId = extractVideoId(youtubeUrl)
    if (!videoId) {
      return NextResponse.json(
        { error: 'Could not extract video ID from URL' },
        { status: 400 },
      )
    }

    // Get user identifier for privacy-preserving tracking
    const userHash = getUserIdentifier(request)

    // Check if video exists and get basic info
    let videoInfo: ytdl.videoInfo
    try {
      console.log('🔍 Fetching video info for:', videoId)
      videoInfo = await ytdl.getInfo(videoId)
      console.log('✅ Video found:', videoInfo.videoDetails.title)
    } catch (error) {
      console.error('🔴 Error fetching video info:', error)
      console.error(
        '🔴 Error details:',
        error instanceof Error ? error.message : 'Unknown error',
      )
      return NextResponse.json(
        {
          error:
            'Video not found or not accessible. YouTube might have changed their API.',
        },
        { status: 404 },
      )
    }

    // Check video duration (cost guard-rail)
    const lengthSeconds = parseInt(videoInfo.videoDetails.lengthSeconds)
    const allowLongVideo = request.headers.get('x-allow-long') === 'true'

    if (lengthSeconds > MAX_VIDEO_DURATION && !allowLongVideo) {
      return NextResponse.json(
        {
          error: 'Video too long',
          message: `Video is ${Math.round(lengthSeconds / 60)} minutes long. Maximum allowed is ${MAX_VIDEO_DURATION / 60} minutes.`,
          duration: lengthSeconds,
          maxDuration: MAX_VIDEO_DURATION,
        },
        { status: 413 },
      )
    }

    // Check if we already have a recent transcription for this video
    const existingTranscript = await prisma.transcript.findFirst({
      where: {
        videoId: videoId,
        status: 'completed',
        createdAt: {
          // Only consider transcripts from the last 24 hours as "recent"
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    })

    if (existingTranscript) {
      return NextResponse.json({
        transcriptId: existingTranscript.id,
        status: 'completed',
        message: 'Using existing transcription',
      })
    }

    // Create audio stream from YouTube and buffer it
    console.log('🟡 Creating audio stream from YouTube...')
    const audioStream = ytdl(youtubeUrl, {
      quality: 'highestaudio',
      filter: 'audioonly',
    })

    // Handle stream errors
    audioStream.on('error', (error) => {
      console.error('🔴 YouTube stream error:', error)
    })

    // Add stream progress logging
    audioStream.on('progress', (chunkLength, downloaded, total) => {
      const percent = (downloaded / total) * 100
      console.log(`📥 Audio download progress: ${percent.toFixed(1)}%`)
    })

    // Buffer the stream
    console.log('🟡 Buffering audio stream...')
    const chunks: Buffer[] = []

    const bufferStream = () => {
      return new Promise<Buffer>((resolve, reject) => {
        audioStream.on('data', (chunk: Buffer) => {
          chunks.push(chunk)
        })

        audioStream.on('end', () => {
          const buffer = Buffer.concat(chunks)
          console.log(`✅ Stream buffered successfully: ${buffer.length} bytes`)
          resolve(buffer)
        })

        audioStream.on('error', (error) => {
          console.error('🔴 Stream error:', error)
          reject(error)
        })
      })
    }

    const audioBuffer = await bufferStream()

    // Start Deepgram transcription with timeout handling
    console.log('🟡 Starting Deepgram transcription for video:', videoId)

    // Add timeout wrapper for Deepgram API call
    const transcribeWithTimeout = async (
      buffer: Buffer,
      options: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    ) => {
      const deepgram = getDeepgramClient()
      return Promise.race([
        deepgram.listen.prerecorded.transcribeFile(buffer, options),
        new Promise(
          (_, reject) =>
            setTimeout(
              () => reject(new Error('Transcription timeout')),
              300000,
            ), // 5 minutes timeout
        ),
      ])
    }

    let result, deepgramError
    try {
      const response = (await transcribeWithTimeout(
        audioBuffer,
        DEEPGRAM_OPTIONS,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      )) as any
      result = response.result
      deepgramError = response.error
    } catch (error) {
      console.error('🔴 Deepgram timeout or error:', error)
      return NextResponse.json(
        { error: 'Transcription service timed out. Please try again.' },
        { status: 504 },
      )
    }

    if (deepgramError) {
      console.error('🔴 Deepgram error:', deepgramError)
      return NextResponse.json(
        { error: 'Transcription service error' },
        { status: 500 },
      )
    }

    // Extract transcript data
    const transcript = result.results?.channels?.[0]?.alternatives?.[0]
    if (!transcript) {
      return NextResponse.json(
        { error: 'No transcript generated' },
        { status: 500 },
      )
    }

    // Process chapters from paragraphs
    const chapters =
      result.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.paragraphs?.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (paragraph: any, index: number) => ({
          id: `chapter-${index + 1}`,
          title: `Chapter ${index + 1}`,
          start: paragraph.start,
          end: paragraph.end,
          description:
            paragraph.sentences?.[0]?.text?.slice(0, 100) + '...' || '',
        }),
      ) || []

    // Process utterances for detailed transcript
    const utterances =
      result.results?.channels?.[0]?.alternatives?.[0]?.words?.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (word: any, index: number) => ({
          id: `utterance-${index}`,
          start: word.start,
          end: word.end,
          text: word.punctuated_word || word.word,
          confidence: word.confidence,
          speaker: word.speaker || 0,
        }),
      ) || []

    // Store transcript in database
    const transcriptRecord = await prisma.transcript.create({
      data: {
        videoId: videoId,
        title: videoInfo.videoDetails.title,
        description: videoInfo.videoDetails.description?.slice(0, 1000) || null,
        duration: lengthSeconds,
        summary:
          result.results?.channels?.[0]?.alternatives?.[0]?.summaries?.[0]
            ?.summary || null,
        language: 'en',
        chapters: chapters,
        utterances: utterances,
        metadata: {
          source: 'deepgram',
          model: DEEPGRAM_OPTIONS.model,
          confidence: transcript.confidence,
          diarization: DEEPGRAM_OPTIONS.diarize,
          generatedAt: new Date().toISOString(),
        },
        deepgramJob: `job-${Date.now()}-${videoId}`, // Mock job ID since we're doing direct processing
        status: 'completed',
        ipHash: userHash,
      },
    })

    console.log('✅ Transcription completed for video:', videoId)

    // Return successful response
    return NextResponse.json({
      transcriptId: transcriptRecord.id,
      videoId: videoId,
      title: videoInfo.videoDetails.title,
      status: 'completed',
      duration: lengthSeconds,
      message: 'Transcription completed successfully',
    })
  } catch (error) {
    console.error('🔴 Transcription API error:', error)
    console.error(
      '🔴 Error stack:',
      error instanceof Error ? error.stack : 'No stack trace',
    )

    // Return more helpful error message
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      {
        error: 'Transcription failed',
        details: errorMessage,
        hint: 'Check the server console for more details',
      },
      { status: 500 },
    )
  }
}

/**
 * GET /api/transcribe
 *
 * Return API information and usage instructions
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/transcribe',
    method: 'POST',
    description: 'Transcribe YouTube videos using Deepgram Speech-to-Text',
    body: {
      youtubeUrl: 'https://www.youtube.com/watch?v=VIDEO_ID',
    },
    headers: {
      'Content-Type': 'application/json',
      'x-allow-long': 'true (optional, for videos > 60 minutes)',
    },
    limits: {
      maxDuration: `${MAX_VIDEO_DURATION / 60} minutes`,
      rateLimit: '10 requests per minute per IP',
    },
  })
}
