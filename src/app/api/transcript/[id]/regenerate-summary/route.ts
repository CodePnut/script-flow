/**
 * POST /api/transcript/[id]/regenerate-summary
 *
 * Regenerate summary and key points for an existing transcript using AI-powered analysis
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'

import type { Transcript as TranscriptModel } from '@/generated/prisma'
import { aiSummaryService } from '@/lib/ai-summary'
import { prisma } from '@/lib/prisma'

/**
 * Request body validation schema
 */
const regenerateSummarySchema = z.object({
  style: z
    .enum(['brief', 'detailed', 'executive', 'educational'])
    .optional()
    .default('detailed'),
  maxLength: z.number().min(50).max(1000).optional(),
  includeKeyPoints: z.boolean().optional().default(true),
  focusOnTopics: z.array(z.string()).optional(),
})

/**
 * POST /api/transcript/[id]/regenerate-summary
 *
 * Regenerate summary using AI-powered analysis of the entire transcript
 */
export async function POST(request: Request, context: unknown) {
  try {
    const params = (context as { params?: { id?: string } })?.params
    const transcriptId = params?.id

    if (!transcriptId || typeof transcriptId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid transcript ID' },
        { status: 400 },
      )
    }

    // Parse and validate request body
    let requestBody = {}
    try {
      requestBody = await request.json()
    } catch {
      // No body provided, use defaults
    }

    const { style, maxLength, includeKeyPoints, focusOnTopics } =
      regenerateSummarySchema.parse(requestBody)

    // Fetch the transcript to verify it exists
    const transcript = await prisma.transcript.findUnique({
      where: { id: transcriptId },
      select: { id: true, status: true },
    })

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript not found' },
        { status: 404 },
      )
    }

    if (transcript.status !== 'completed') {
      return NextResponse.json(
        {
          error: 'Transcript not ready',
          status: transcript.status,
          message: 'Transcript is still processing',
        },
        { status: 202 },
      )
    }

    console.log(
      `🔄 Regenerating ${style} summary for transcript:`,
      transcriptId,
    )

    // Handle provider selection
    const provider = (process.env.SUMMARY_PROVIDER || 'local').toLowerCase()

    if (provider === 'deepgram') {
      // For Deepgram, we can attempt to improve the summary by re-running AI generation
      // with enhanced parameters, while preserving Deepgram's structured data
      console.log(`🔄 Attempting Deepgram summary enhancement for transcript:`, transcriptId)
      
      // Fetch the full transcript to get existing metadata
      const fullTranscript = await prisma.transcript.findUnique({
        where: { id: transcriptId },
        select: { 
          id: true, 
          summary: true,
          metadata: true,
          status: true 
        },
      })

      if (!fullTranscript?.metadata) {
        return NextResponse.json(
          {
            error: 'Cannot enhance Deepgram summary without existing metadata',
            hint: 'Re-run transcription to refresh Deepgram summary',
          },
          { status: 400 },
        )
      }

      // Generate enhanced AI summary with specific parameters for Deepgram improvement
      const enhancedSummary = await aiSummaryService.generateSummary(transcriptId, {
        style: style || 'detailed',
        maxLength: maxLength || 300,
        includeKeyPoints: includeKeyPoints,
        focusOnTopics: focusOnTopics,
        enhanceForDeepgram: true, // Special flag for Deepgram enhancement
      })

      // Merge enhanced AI summary with existing Deepgram metadata
      const existingMetadata = fullTranscript.metadata as Record<string, unknown>
      const finalSummary = enhancedSummary.summary
      const finalMetadata = {
        ...existingMetadata,
        enhancedSummary: enhancedSummary.summary,
        enhancedKeyPoints: enhancedSummary.keyPoints,
        enhancedTopics: enhancedSummary.topics,
        enhancementGeneratedAt: new Date().toISOString(),
        enhancementParams: {
          style,
          maxLength,
          includeKeyPoints,
          focusOnTopics,
        },
        summarySource: 'deepgram-enhanced',
        summaryConfidence: enhancedSummary.confidence * 0.95, // Slightly reduce confidence for enhanced version
      }

      // Update transcript with enhanced summary
      await prisma.transcript.update({
        where: { id: transcriptId },
        data: {
          summary: finalSummary,
          metadata: finalMetadata,
        },
      })

      console.log(`✅ Deepgram summary enhanced successfully for transcript:`, transcriptId)

      return NextResponse.json({
        summary: finalSummary,
        keyPoints: enhancedSummary.keyPoints,
        keyPointsRich: enhancedSummary.keyPointsRich,
        confidence: enhancedSummary.confidence,
        style: enhancedSummary.style,
        wordCount: enhancedSummary.wordCount,
        enhanced: true,
        message: 'Deepgram summary enhanced successfully',
      })
    }

    // Generate new summary using AI service (local/openai/openrouter)
    const summaryResult = await aiSummaryService.generateSummary(transcriptId, {
      style,
      maxLength,
      includeKeyPoints,
      focusOnTopics,
    })

    // Update the transcript with new summary and metadata
    await prisma.transcript.update({
      where: { id: transcriptId },
      data: {
        summary: summaryResult.summary,
        metadata: {
          summaryStyle: summaryResult.style,
          summaryConfidence: summaryResult.confidence,
          summaryWordCount: summaryResult.wordCount,
          keyPoints: summaryResult.keyPoints,
          keyPointsRich: summaryResult.keyPointsRich,

          lastSummaryRegeneration: summaryResult.generatedAt.toISOString(),
          summaryGenerationParams: {
            style,
            maxLength,
            includeKeyPoints,
            focusOnTopics,
          },
        },
      },
    })

    // Invalidate any cached video metadata and refresh transcript cache
    try {
      // Find transcript to get videoId
      const t = await prisma.transcript.findUnique({
        where: { id: transcriptId },
        select: { videoId: true },
      })
      if (t?.videoId) {
        const { cache } = await import('@/lib/cache')
        await cache.invalidateTranscript(t.videoId)
        // Refresh transcript cache
        const latest = await prisma.transcript.findUnique({
          where: { id: transcriptId },
        })
        if (latest)
          await cache.setTranscript(t.videoId, latest as TranscriptModel)
      }
    } catch (e) {
      console.warn('🟡 Cache refresh after summary regeneration failed:', e)
    }

    console.log(
      `✅ ${style} summary regenerated successfully for transcript:`,
      transcriptId,
    )

    return NextResponse.json({
      summary: summaryResult.summary,
      keyPoints: summaryResult.keyPoints,
      keyPointsRich: summaryResult.keyPointsRich,

      confidence: summaryResult.confidence,
      style: summaryResult.style,
      wordCount: summaryResult.wordCount,
      message: `${style} summary regenerated successfully`,
    })
  } catch (error) {
    console.error('🔴 Error regenerating summary:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request parameters',
          details: error.issues,
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to regenerate summary',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
