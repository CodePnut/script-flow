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

import fs from 'node:fs'

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
 * Validates the quality and substance of a summary
 * @param summary - The summary text to validate
 * @returns Object containing quality score and validation result
 */
function validateSummaryQuality(summary: string | null): {
  isValid: boolean
  qualityScore: number
  issues: string[]
} {
  if (!summary) {
    return { isValid: false, qualityScore: 0, issues: ['Summary is null or undefined'] }
  }

  const issues: string[] = []
  let qualityScore = 100

  // Check minimum length
  if (summary.length < 20) {
    issues.push('Summary too short (minimum 20 characters)')
    qualityScore -= 30
  }

  // Check for placeholder content
  if (summary === '.' || summary.match(/^[\s\.,!?]*$/)) {
    issues.push('Summary contains only punctuation or whitespace')
    qualityScore -= 50
  }

  // Check for repetitive content
  const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 0)
  if (sentences.length > 1) {
    const uniqueSentences = new Set(sentences.map(s => s.trim().toLowerCase()))
    const repetitionRatio = 1 - (uniqueSentences.size / sentences.length)
    if (repetitionRatio > 0.5) {
      issues.push('Summary contains repetitive content')
      qualityScore -= 20
    }
  }

  // Check for generic or template-like content
  const genericPhrases = ['this video discusses', 'this transcript', 'the speaker mentions']
  const hasGenericContent = genericPhrases.some(phrase => 
    summary.toLowerCase().includes(phrase)
  )
  if (hasGenericContent) {
    issues.push('Summary contains generic template phrases')
    qualityScore -= 15
  }

  // Check for substantial content (not just "video about X")
  const wordCount = summary.split(/\s+/).length
  if (wordCount < 10) {
    issues.push('Summary too brief (minimum 10 words)')
    qualityScore -= 25
  }

  return {
    isValid: qualityScore >= 70 && issues.length <= 2,
    qualityScore: Math.max(0, qualityScore),
    issues
  }
}

/**
 * Deepgram client configuration
 * Following official Deepgram documentation best practices
 */
const getDeepgramClient = () => createClient(process.env.DEEPGRAM_API_KEY!)

/**
 * Deepgram transcription options
 * Configured for optimal YouTube video processing with enhanced summarization
 */
const DEEPGRAM_OPTIONS = {
  model: 'nova-2',
  language: 'en',
  smart_format: true,
  diarize: true,
  summarize: 'v2',
  detect_topics: true,
  punctuate: true,
  utterances: true,
  paragraphs: true,
  // Enhanced summarization settings
  summarize_size: 'large', // Options: 'small', 'medium', 'large'
  summarize_language: 'en',
} as const

/**
 * Maximum video duration in seconds (60 minutes)
 * Can be overridden with special header for power users
 */
const MAX_VIDEO_DURATION = 60 * 60 // 60 minutes in seconds

/**
 * Initialize yt-dlp wrapper with fallback download
 */
async function getYtDlp(): Promise<YTDlpWrap> {
  const binaryPath = process.env.YTDLP_PATH || '/tmp/yt-dlp'
  try {
    if (!fs.existsSync(binaryPath)) {
      console.log('🟡 yt-dlp not found, attempting download...')
      await YTDlpWrap.downloadFromGithub(binaryPath)
      console.log('✅ yt-dlp downloaded to', binaryPath)
    }
    return new YTDlpWrap(binaryPath)
  } catch (e) {
    console.warn(
      '🟡 Failed to prepare yt-dlp at specific path, falling back to system binary',
      e,
    )
    // Fall back to system-installed yt-dlp if available on PATH
    return new YTDlpWrap()
  }
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
      const ytDlp = await getYtDlp()
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
        videoId: videoId,
        title: videoInfo.title,
        status: 'completed',
        duration: lengthSeconds,
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
        videoId: videoId,
        title: videoInfo.title,
        status: 'completed',
        duration: lengthSeconds,
        message: 'Using existing transcription',
      })
    }

    // Download audio stream from YouTube using yt-dlp
    console.log('🟡 Creating audio stream from YouTube...')
    let audioStream: NodeJS.ReadableStream
    try {
      // Use yt-dlp to create a readable stream of the audio
      const ytDlp = await getYtDlp()
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

      // Check for authentication errors
      let errorMessage = 'Transcription service error. Please try again.'
      let userMessage =
        "We're experiencing technical difficulties. Please try again later."

      if (error instanceof Error) {
        const errorStr = error.message.toLowerCase()
        if (
          errorStr.includes('unauthorized') ||
          errorStr.includes('invalid') ||
          errorStr.includes('forbidden')
        ) {
          errorMessage = 'Deepgram API authentication failed'
          userMessage =
            'Transcription service is not properly configured. Please contact support.'
        } else if (errorStr.includes('rate limit')) {
          errorMessage = 'Deepgram rate limit exceeded'
          userMessage = 'Too many requests. Please try again in a few minutes.'
        } else if (
          errorStr.includes('network') ||
          errorStr.includes('timeout')
        ) {
          errorMessage = 'Network error with transcription service'
          userMessage =
            'Network issue. Please check your connection and try again.'
        }
      }

      return NextResponse.json(
        {
          error: errorMessage,
          message: userMessage,
          details:
            process.env.NODE_ENV === 'development'
              ? error instanceof Error
                ? error.message
                : 'Unknown error'
              : undefined,
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

    // Debug: Log what Deepgram returned for summaries and topics
    console.log(
      '🔍 Deepgram summaries:',
      JSON.stringify(transcript.summaries, null, 2),
    )
    console.log(
      '🔍 Deepgram topics:',
      JSON.stringify(transcript.topics, null, 2),
    )

    // Chapters functionality has been removed from UI, so we skip chapter generation

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
        // chapters: chapters, // Removed - chapters functionality deprecated
        utterances: utterances,
        metadata: {
          source: 'deepgram',
          model: DEEPGRAM_OPTIONS.model,
          confidence: transcript.confidence,
          diarization: DEEPGRAM_OPTIONS.diarize,
          generatedAt: new Date().toISOString(),
          uploader: videoInfo.uploader,
          // Extract Deepgram's AI features (safely)
          topics: transcript.topics
            ? JSON.parse(JSON.stringify(transcript.topics))
            : [],
          summaries: transcript.summaries
            ? JSON.parse(JSON.stringify(transcript.summaries))
            : [],
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
      // Enhanced Deepgram summary validation and selection
      const deepgramSummary = transcriptRecord.summary
      const validation = validateSummaryQuality(deepgramSummary)
      
      console.log(`🔍 Deepgram summary validation:`, {
        isValid: validation.isValid,
        qualityScore: validation.qualityScore,
        issues: validation.issues
      })

      const isDeepgramSummaryGood = validation.isValid

      if (isDeepgramSummaryGood) {
        finalSummary = deepgramSummary!
        console.log(`✅ Using high-quality Deepgram summary (score: ${validation.qualityScore}/100)`)
      } else {
        finalSummary = aiSummary.summary
        console.log(`⚠️ Deepgram summary quality too low (score: ${validation.qualityScore}/100), using AI fallback`)
      }

      // Combine Deepgram's structured data with AI-generated insights
      const metadata = transcriptRecord.metadata as Record<string, unknown>
      metaExtras = {
        // Prefer Deepgram's structured data when available
        topics:
          Array.isArray(metadata?.topics) && metadata.topics.length > 0
            ? metadata.topics
            : aiSummary.topics,
        summaryConfidence: isDeepgramSummaryGood ? Math.min(validation.qualityScore / 100, 0.95) : aiSummary.confidence,
        summaryStyle: aiSummary.style,
        summarySource: isDeepgramSummaryGood ? 'deepgram' : 'ai-fallback',
        summaryQualityScore: validation.qualityScore,
        summaryValidationIssues: validation.issues,
      }

      console.log(
        `📊 Summary source: ${isDeepgramSummaryGood ? 'Deepgram' : 'AI fallback'}`,
      )
    } else {
      // Use AI summary result
      finalSummary = aiSummary.summary
      metaExtras = {
        topics: aiSummary.topics,
        summaryConfidence: aiSummary.confidence,
        summaryStyle: aiSummary.style,
        summarySource: 'ai-primary',
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
