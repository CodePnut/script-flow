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
 * Mock transcript data for testing
 */
const MOCK_TRANSCRIPT_DATA = {
  utterances: [
    {
      id: 'utterance-1',
      start: 0,
      end: 5,
      text: 'Welcome to this comprehensive tutorial on modern web development',
      confidence: 0.95,
      speaker: 0,
    },
    {
      id: 'utterance-2',
      start: 5,
      end: 10,
      text: "Today we'll be exploring React and Next.js",
      confidence: 0.95,
      speaker: 0,
    },
  ],
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
  ],
  summary:
    'This tutorial provides a complete introduction to modern web development using React and Next.js. We cover everything from basic concepts to advanced patterns.',
}

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

    // If no Deepgram API key, use mock data for testing
    if (!process.env.DEEPGRAM_API_KEY) {
      console.log('🟡 No Deepgram API key found, using mock data for testing')

      // Validate request body
      const body = await request.json()
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
      const videoId = extractVideoId(youtubeUrl)

      if (!videoId) {
        return NextResponse.json(
          { error: 'Could not extract video ID from URL' },
          { status: 400 },
        )
      }

      // Get user identifier
      const userHash = getUserIdentifier(request)

      // Create mock transcript record
      const transcriptRecord = await prisma.transcript.create({
        data: {
          videoId: videoId,
          title: 'Mock Video Title',
          description: 'A mock video for testing purposes',
          duration: 1800, // 30 minutes
          summary: MOCK_TRANSCRIPT_DATA.summary,
          language: 'en',
          chapters: MOCK_TRANSCRIPT_DATA.chapters,
          utterances: MOCK_TRANSCRIPT_DATA.utterances,
          metadata: {
            source: 'mock',
            model: 'mock-nova-2',
            confidence: 0.95,
            diarization: true,
            generatedAt: new Date().toISOString(),
          },
          deepgramJob: `mock-job-${Date.now()}-${videoId}`,
          status: 'completed',
          ipHash: userHash,
        },
      })

      console.log('✅ Mock transcription completed for video:', videoId)

      return NextResponse.json({
        transcriptId: transcriptRecord.id,
        videoId: videoId,
        title: 'Mock Video Title',
        status: 'completed',
        duration: 1800,
        message: 'Mock transcription completed successfully',
      })
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

    // Process chapters from paragraphs - create meaningful chapters by grouping paragraphs
    const allParagraphs =
      result.results?.channels?.[0]?.alternatives?.[0]?.paragraphs
        ?.paragraphs || []
    const chapters: any[] = []

    // Group paragraphs into chapters (every 3-5 paragraphs or significant time gaps)
    let currentChapter: { paragraphs: any[]; start: number; end: number } = {
      paragraphs: [],
      start: 0,
      end: 0,
    }

    for (let i = 0; i < allParagraphs.length; i++) {
      const paragraph = allParagraphs[i]

      if (currentChapter.paragraphs.length === 0) {
        currentChapter.start = paragraph.start
      }

      currentChapter.paragraphs.push(paragraph)
      currentChapter.end = paragraph.end

      // Create new chapter after 4 paragraphs or if there's a significant time gap (>30 seconds)
      const nextParagraph = allParagraphs[i + 1]
      const shouldCreateChapter =
        currentChapter.paragraphs.length >= 4 ||
        !nextParagraph ||
        (nextParagraph && nextParagraph.start - paragraph.end > 30)

      if (shouldCreateChapter && currentChapter.paragraphs.length > 0) {
        const chapterTitle: string =
          currentChapter.paragraphs[0]?.sentences?.[0]?.text
            ?.split(' ')
            .slice(0, 6)
            .join(' ') || `Chapter ${chapters.length + 1}`

        chapters.push({
          id: `chapter-${chapters.length + 1}`,
          title: chapterTitle,
          start: currentChapter.start,
          end: currentChapter.end,
          description:
            currentChapter.paragraphs
              .map((p) => p.sentences?.[0]?.text)
              .filter(Boolean)
              .join(' ')
              .slice(0, 200) + '...',
        })

        currentChapter = { paragraphs: [], start: 0, end: 0 }
      }
    }

    // Fallback: if no meaningful chapters, create time-based chapters every 5 minutes
    if (chapters.length === 0 && lengthSeconds > 300) {
      const chapterDuration = 300 // 5 minutes
      const numChapters = Math.ceil(lengthSeconds / chapterDuration)

      for (let i = 0; i < numChapters; i++) {
        const start = i * chapterDuration
        const end = Math.min((i + 1) * chapterDuration, lengthSeconds)

        chapters.push({
          id: `chapter-${i + 1}`,
          title: `Part ${i + 1}`,
          start,
          end,
          description: `Video content from ${Math.floor(start / 60)}:${(start % 60).toString().padStart(2, '0')} to ${Math.floor(end / 60)}:${(end % 60).toString().padStart(2, '0')}`,
        })
      }
    }

    // Process utterances for detailed transcript
    // Use paragraphs/sentences for better utterance grouping instead of individual words
    const utterances: any[] = []
    const paragraphs =
      result.results?.channels?.[0]?.alternatives?.[0]?.paragraphs
        ?.paragraphs || []

    let utteranceIndex = 0
    for (const paragraph of paragraphs) {
      const sentences = paragraph.sentences || []
      for (const sentence of sentences) {
        utterances.push({
          id: `utterance-${utteranceIndex++}`,
          start: sentence.start,
          end: sentence.end,
          text: sentence.text,
          confidence: sentence.confidence || 0.95,
          speaker: sentence.speaker || 0,
        })
      }
    }

    // Fallback to words if no sentences are available
    if (utterances.length === 0) {
      const words =
        result.results?.channels?.[0]?.alternatives?.[0]?.words || []
      const groupedUtterances: any[] = []
      let currentUtterance: {
        words: any[]
        start: number
        end: number
        speaker: number
      } = { words: [], start: 0, end: 0, speaker: 0 }

      for (const word of words) {
        // Group words into utterances of ~10-15 words or by speaker change
        if (currentUtterance.words.length === 0) {
          currentUtterance.start = word.start
          currentUtterance.speaker = word.speaker || 0
        }

        currentUtterance.words.push(word)
        currentUtterance.end = word.end

        // Create new utterance on speaker change or after 15 words
        if (
          currentUtterance.words.length >= 15 ||
          (word.speaker !== undefined &&
            word.speaker !== currentUtterance.speaker)
        ) {
          groupedUtterances.push({
            id: `utterance-${groupedUtterances.length}`,
            start: currentUtterance.start,
            end: currentUtterance.end,
            text: currentUtterance.words
              .map((w) => w.punctuated_word || w.word)
              .join(' '),
            confidence:
              currentUtterance.words.reduce(
                (acc, w) => acc + (w.confidence || 0),
                0,
              ) / currentUtterance.words.length,
            speaker: currentUtterance.speaker,
          })
          currentUtterance = {
            words: [],
            start: 0,
            end: 0,
            speaker: word.speaker || 0,
          }
        }
      }

      // Add remaining words as final utterance
      if (currentUtterance.words.length > 0) {
        groupedUtterances.push({
          id: `utterance-${groupedUtterances.length}`,
          start: currentUtterance.start,
          end: currentUtterance.end,
          text: currentUtterance.words
            .map((w) => w.punctuated_word || w.word)
            .join(' '),
          confidence:
            currentUtterance.words.reduce(
              (acc, w) => acc + (w.confidence || 0),
              0,
            ) / currentUtterance.words.length,
          speaker: currentUtterance.speaker,
        })
      }

      utterances.push(...groupedUtterances)
    }

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
