/**
 * POST /api/transcript/[id]/regenerate-summary
 *
 * Regenerate summary and key points for an existing transcript using AI-powered analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { aiSummaryService } from '@/lib/ai-summary'
import { prisma } from '@/lib/prisma'

/**
 * Request body validation schema
 */
const regenerateSummarySchema = z.object({
  style: z
    .enum(['brief', 'detailed', 'bullet', 'executive', 'educational'])
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
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: transcriptId } = await params

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

    // Generate new summary using AI service
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
          topics: summaryResult.topics,
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

    console.log(
      `✅ ${style} summary regenerated successfully for transcript:`,
      transcriptId,
    )

    return NextResponse.json({
      summary: summaryResult.summary,
      keyPoints: summaryResult.keyPoints,
      topics: summaryResult.topics,
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
