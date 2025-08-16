/**
 * POST /api/transcript/[id]/regenerate-summary
 *
 * Regenerate summary and key points for an existing transcript
 */

import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'

/**
 * Generate a new summary from transcript utterances
 */
function generateSummaryFromTranscript(
  utterances: Array<{ text: string }>,
): string {
  if (!utterances || utterances.length === 0) {
    return 'No transcript content available for summary generation.'
  }

  // Extract all text from utterances
  const fullText = utterances.map((u) => u.text).join(' ')

  // Simple extractive summarization - get key sentences
  const sentences = fullText.split(/[.!?]+/).filter((s) => s.trim().length > 20)

  // Take every 5th sentence or important-looking sentences
  const keySentences = sentences
    .filter((sentence, index) => {
      const lowerSentence = sentence.toLowerCase()
      // Include sentences with important keywords or every 5th sentence
      return (
        index % 5 === 0 ||
        lowerSentence.includes('important') ||
        lowerSentence.includes('key') ||
        lowerSentence.includes('main') ||
        lowerSentence.includes('conclusion') ||
        lowerSentence.includes('summary') ||
        lowerSentence.includes('first') ||
        lowerSentence.includes('finally') ||
        lowerSentence.includes('overall')
      )
    })
    .slice(0, 5) // Limit to 5 key sentences

  if (keySentences.length === 0) {
    // Fallback: take first few sentences
    return sentences.slice(0, 3).join('. ') + '.'
  }

  return keySentences.join('. ').trim() + '.'
}

/**
 * Generate key points from transcript
 */
function generateKeyPoints(utterances: Array<{ text: string }>): string[] {
  if (!utterances || utterances.length === 0) {
    return ['No transcript content available for key points generation.']
  }

  const fullText = utterances.map((u) => u.text).join(' ')
  const sentences = fullText.split(/[.!?]+/).filter((s) => s.trim().length > 15)

  // Look for sentences that seem like key points
  const keyPointSentences = sentences
    .filter((sentence) => {
      const lowerSentence = sentence.toLowerCase()
      return (
        lowerSentence.includes('step') ||
        lowerSentence.includes('point') ||
        lowerSentence.includes('important') ||
        lowerSentence.includes('remember') ||
        lowerSentence.includes('key') ||
        lowerSentence.includes('main') ||
        lowerSentence.includes('first') ||
        lowerSentence.includes('second') ||
        lowerSentence.includes('third') ||
        lowerSentence.includes('next') ||
        lowerSentence.includes('finally') ||
        sentence.trim().length > 30
      )
    })
    .slice(0, 8) // Limit to 8 key points

  if (keyPointSentences.length === 0) {
    // Fallback: extract sentences from different parts of the transcript
    const totalSentences = sentences.length
    const keyPoints = []

    for (let i = 0; i < Math.min(6, totalSentences); i++) {
      const index = Math.floor((i / 6) * totalSentences)
      if (sentences[index] && sentences[index].trim().length > 20) {
        keyPoints.push(sentences[index].trim())
      }
    }

    return keyPoints.length > 0
      ? keyPoints
      : ['Key points could not be extracted from this transcript.']
  }

  return keyPointSentences.map((s) => s.trim())
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: transcriptId } = await params

    // Fetch the transcript
    const transcript = await prisma.transcript.findUnique({
      where: { id: transcriptId },
    })

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript not found' },
        { status: 404 },
      )
    }

    console.log('🔄 Regenerating summary for transcript:', transcriptId)

    // Generate new summary from utterances
    const utterances = Array.isArray(transcript.utterances)
      ? (transcript.utterances as Array<{ text: string }>)
      : []
    const newSummary = generateSummaryFromTranscript(utterances)

    // Generate new key points
    const keyPoints = generateKeyPoints(utterances)

    // Update the transcript with new summary
    await prisma.transcript.update({
      where: { id: transcriptId },
      data: {
        summary: newSummary,
        metadata: {
          ...((transcript.metadata as Record<string, unknown>) || {}),
          keyPoints,
          lastSummaryRegeneration: new Date().toISOString(),
        },
      },
    })

    console.log(
      '✅ Summary regenerated successfully for transcript:',
      transcriptId,
    )

    return NextResponse.json({
      summary: newSummary,
      keyPoints,
      message: 'Summary regenerated successfully',
    })
  } catch (error) {
    console.error('🔴 Error regenerating summary:', error)
    return NextResponse.json(
      {
        error: 'Failed to regenerate summary',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
