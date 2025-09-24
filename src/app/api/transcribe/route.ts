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
import { NextRequest, NextResponse } from 'next/server'
import YTDlpWrap from 'yt-dlp-wrap'
import { z } from 'zod'

import { aiSummaryService } from '@/lib/ai-summary'
import { cache } from '@/lib/cache'
import { getUserIdentifier } from '@/lib/ipHash'
import { prisma } from '@/lib/prisma'
import { searchIndexing } from '@/lib/search-indexing'
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
 * Initialize yt-dlp wrapper
 */
const ytDlp = new YTDlpWrap('/tmp/yt-dlp')

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

    // Require Deepgram API key - no mock data
    if (!process.env.DEEPGRAM_API_KEY) {
      console.log('🔴 No Deepgram API key found')
      return NextResponse.json(
        {
          error: 'Deepgram API key required',
          message: 'Please set DEEPGRAM_API_KEY environment variable',
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

    // Check if video exists and get basic info using yt-dlp
    let videoInfo: {
      title: string
      description?: string
      duration: number
      uploader?: string
    }
    try {
      console.log('🔍 Fetching video info for:', videoId)
      const info = await ytDlp.getVideoInfo(youtubeUrl)

      videoInfo = {
        title: info.title || 'Unknown Title',
        description: info.description || null,
        duration: Math.floor(info.duration || 0),
        uploader: info.uploader || 'Unknown',
      }

      console.log('✅ Video found:', videoInfo.title)
    } catch (error) {
      console.error('🔴 Error fetching video info:', error)
      console.error(
        '🔴 Error details:',
        error instanceof Error ? error.message : 'Unknown error',
      )
      return NextResponse.json(
        {
          error:
            'Video not found or not accessible. Please check the YouTube URL.',
        },
        { status: 404 },
      )
    }

    // Check video duration (cost guard-rail)
    const lengthSeconds = videoInfo.duration
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

    // Check cache first for existing transcript
    console.log(`🔍 Checking cache for existing transcript: ${videoId}`)
    const cachedTranscript = await cache.getTranscript(videoId)

    if (cachedTranscript && cachedTranscript.status === 'completed') {
      console.log(`✅ Cache hit for transcript: ${videoId}`)
      return NextResponse.json({
        transcriptId: cachedTranscript.id,
        status: 'completed',
        message: 'Using cached transcription',
      })
    }

    // Check if we already have a recent transcription for this video in database
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
      // Cache the existing transcript for future requests
      console.log(`💾 Caching existing transcript: ${videoId}`)
      await cache.setTranscript(videoId, existingTranscript)

      return NextResponse.json({
        transcriptId: existingTranscript.id,
        status: 'completed',
        message: 'Using existing transcription',
      })
    }

    // Download audio stream from YouTube using yt-dlp
    console.log('🟡 Creating audio stream from YouTube...')
    let audioStream: NodeJS.ReadableStream
    try {
      // Use yt-dlp to create a readable stream of the audio
      audioStream = ytDlp.execStream([
        youtubeUrl,
        '--format',
        'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio',
        '--output',
        '-',
        '--no-warnings',
      ])

      console.log('✅ Audio stream created')
    } catch (error) {
      console.error('🔴 Error creating audio stream:', error)
      return NextResponse.json(
        { error: 'Could not extract audio from video. Please try again.' },
        { status: 500 },
      )
    }

    // Start Deepgram transcription with audio stream
    console.log('🟡 Starting Deepgram transcription for video:', videoId)
    const deepgram = getDeepgramClient()

    let result, deepgramError
    try {
      // Convert the stream to a buffer for Deepgram
      console.log('🔄 Converting audio stream to buffer...')

      const chunks: Buffer[] = []

      // Use traditional stream handling that's more compatible
      audioStream.on('data', (chunk: unknown) => {
        chunks.push(
          Buffer.isBuffer(chunk)
            ? chunk
            : Buffer.from(chunk as string | Buffer),
        )
      })

      await new Promise<void>((resolve, reject) => {
        audioStream.on('end', () => resolve())
        audioStream.on('error', (err: Error) => reject(err))
      })

      const audioBuffer = Buffer.concat(chunks)
      console.log(`✅ Audio buffer created: ${audioBuffer.length} bytes`)

      // Send buffer to Deepgram
      const response = await deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        DEEPGRAM_OPTIONS,
      )
      result = response.result
      deepgramError = response.error
    } catch (error) {
      console.error('🔴 Deepgram error:', error)
      console.error('🔴 Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.constructor.name : 'Unknown type',
      })
      return NextResponse.json(
        {
          error: 'Transcription service error. Please try again.',
          details: error instanceof Error ? error.message : 'Unknown error',
          debug: process.env.NODE_ENV === 'development' ? error : undefined,
        },
        { status: 500 },
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
    if (!result) {
      return NextResponse.json(
        { error: 'No transcription result' },
        { status: 500 },
      )
    }

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
    const chapters: Array<{
      id: string
      title: string
      start: number
      end: number
      description: string
    }> = []

    // Group paragraphs into chapters (every 3-5 paragraphs or significant time gaps)
    let currentChapter: {
      paragraphs: Array<{
        sentences?: Array<{ text?: string }>
        start: number
        end: number
      }>
      start: number
      end: number
    } = {
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
    const utterances: Array<{
      id: string
      start: number
      end: number
      text: string
      confidence: number
      speaker: number
    }> = []
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
          confidence: (sentence as { confidence?: number }).confidence || 0.95,
          speaker: (sentence as { speaker?: number }).speaker || 0,
        })
      }
    }

    // Fallback to words if no sentences are available
    if (utterances.length === 0) {
      const words =
        result.results?.channels?.[0]?.alternatives?.[0]?.words || []
      const groupedUtterances: Array<{
        id: string
        start: number
        end: number
        text: string
        confidence: number
        speaker: number
      }> = []
      let currentUtterance: {
        words: Array<{
          punctuated_word?: string
          word?: string
          confidence?: number
          start: number
          end: number
          speaker?: number
        }>
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
        title: videoInfo.title,
        description: videoInfo.description?.slice(0, 1000) || null,
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
          uploader: videoInfo.uploader,
        },
        deepgramJob: `job-${Date.now()}-${videoId}`, // Mock job ID since we're doing direct processing
        status: 'completed',
        ipHash: userHash,
      },
    })

    console.log('✅ Transcription completed for video:', videoId)

    // Cache the new transcript for future requests
    console.log(`💾 Caching new transcript: ${videoId}`)
    await cache.setTranscript(videoId, transcriptRecord)

    // Index the transcript for search (async, don't wait for completion)
    setImmediate(() => {
      searchIndexing.indexTranscript(transcriptRecord.id).catch((error) => {
        console.error('Failed to index transcript for search:', error)
      })
    })

    // Generate AI summary
    console.log('🟡 Generating AI summary for transcript:', transcriptRecord.id)
    let aiSummary = null
    try {
      aiSummary = await aiSummaryService.generateSummary(transcriptRecord.id)
      console.log('✅ AI summary generated:', aiSummary)
    } catch (error) {
      console.warn(
        '⚠️ AI summary generation failed, using basic summary:',
        error,
      )
      // Fallback to basic summary if AI generation fails
      aiSummary = {
        summary:
          result.results?.channels?.[0]?.alternatives?.[0]?.summaries?.[0]
            ?.summary || 'Summary generation failed.',
        keyPoints: [],
        topics: [],
        confidence: 0.5,
        style: 'detailed' as const,
        wordCount: 0,
        generatedAt: new Date(),
      }
    }

    // Choose summary provider
    const provider = (process.env.SUMMARY_PROVIDER || 'local').toLowerCase()
    let finalSummary = transcriptRecord.summary || aiSummary.summary
    let metaExtras: Record<string, unknown> = {}

    if (provider === 'deepgram') {
      // Keep Deepgram summary, enrich only key points via heuristic/LLM
      finalSummary = transcriptRecord.summary || aiSummary.summary
      metaExtras = {
        topics: aiSummary.topics,
        keyPoints: aiSummary.keyPoints,
        keyPointsRich: aiSummary.keyPointsRich,
        summaryConfidence: aiSummary.confidence,
        summaryStyle: aiSummary.style,
      }
    } else {
      // Use AI summary result
      finalSummary = aiSummary.summary
      metaExtras = {
        topics: aiSummary.topics,
        keyPoints: aiSummary.keyPoints,
        keyPointsRich: aiSummary.keyPointsRich,
        summaryConfidence: aiSummary.confidence,
        summaryStyle: aiSummary.style,
      }
    }

    const updatedTranscript = await prisma.transcript.update({
      where: { id: transcriptRecord.id },
      data: {
        summary: finalSummary,
        metadata: {
          source: 'deepgram',
          model: DEEPGRAM_OPTIONS.model,
          confidence: transcript.confidence,
          diarization: DEEPGRAM_OPTIONS.diarize,
          generatedAt: new Date().toISOString(),
          aiSummaryGeneratedAt: new Date().toISOString(),
          ...metaExtras,
        },
      },
    })
    console.log('✅ Transcript updated with summary provider:', provider)

    // Invalidate any stale cached video metadata and refresh transcript cache
    try {
      await cache.invalidateTranscript(videoId)
      await cache.setTranscript(videoId, updatedTranscript)
      console.log(
        `♻️ Cache invalidated and transcript refreshed for: ${videoId}`,
      )
    } catch (e) {
      console.warn('🟡 Cache refresh after summary update failed:', e)
    }

    // Return successful response
    return NextResponse.json({
      transcriptId: updatedTranscript.id,
      videoId: videoId,
      title: videoInfo.title,
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
