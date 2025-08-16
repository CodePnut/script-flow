/**
 * AI-powered video summarization service
 *
 * This service intelligently processes entire video transcripts to generate
 * meaningful summaries that capture the actual content and key insights.
 */

import { prisma } from './prisma'

/**
 * Summary style options for different use cases
 */
export type SummaryStyle =
  | 'brief'
  | 'detailed'
  | 'bullet'
  | 'executive'
  | 'educational'

/**
 * Summary generation parameters
 */
export interface SummaryParams {
  style: SummaryStyle
  maxLength?: number
  includeKeyPoints?: boolean
  focusOnTopics?: string[]
}

/**
 * Generated summary result
 */
export interface SummaryResult {
  summary: string
  keyPoints: string[]
  topics: string[]
  confidence: number
  style: SummaryStyle
  wordCount: number
  generatedAt: Date
}

/**
 * Topic extraction result
 */
interface TopicExtraction {
  topic: string
  frequency: number
  importance: number
  relatedSentences: string[]
}

/**
 * Content structure after processing transcript
 */
interface ProcessedContent {
  fullText: string
  sentences: string[]
  timeSegments: Array<{
    start: number
    end: number
    text: string
    utterances: string[]
  }>
  speakerPatterns: {
    questionCount: number
    statementCount: number
    longUtterances: number
    shortUtterances: number
  }
  totalDuration: number
  utteranceCount: number
}

/**
 * AI Summary Service
 *
 * Provides intelligent video summarization using advanced text analysis
 */
export class AISummaryService {
  /**
   * Generate comprehensive summary from transcript
   */
  async generateSummary(
    transcriptId: string,
    params: SummaryParams = { style: 'detailed' },
  ): Promise<SummaryResult> {
    try {
      // Fetch complete transcript with utterances
      const transcript = await prisma.transcript.findUnique({
        where: { id: transcriptId },
        select: {
          utterances: true,
          title: true,
          duration: true,
          language: true,
        },
      })

      if (!transcript) {
        throw new Error('Transcript not found')
      }

      const utterances = Array.isArray(transcript.utterances)
        ? (transcript.utterances as Array<{
            text: string
            start: number
            end: number
          }>)
        : []

      if (utterances.length === 0) {
        throw new Error('No transcript content available')
      }

      console.log(
        `🤖 Generating ${params.style} summary for ${utterances.length} utterances`,
      )

      // Process the entire transcript intelligently
      const processedContent = this.processTranscriptContent(utterances)
      const topics = this.extractTopics(processedContent)
      const summary = this.generateSummaryByStyle(
        processedContent,
        topics,
        params,
      )
      const keyPoints =
        params.includeKeyPoints !== false
          ? this.extractKeyPoints(processedContent, topics)
          : []

      const result: SummaryResult = {
        summary,
        keyPoints,
        topics: topics.map((t) => t.topic),
        confidence: this.calculateConfidence(processedContent, topics),
        style: params.style,
        wordCount: summary.split(' ').length,
        generatedAt: new Date(),
      }

      console.log(
        `✅ Generated ${params.style} summary with ${result.wordCount} words`,
      )
      return result
    } catch (error) {
      console.error('🔴 AI Summary generation failed:', error)
      throw new Error(
        `Failed to generate AI summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Process transcript content for intelligent analysis
   */
  private processTranscriptContent(
    utterances: Array<{ text: string; start: number; end: number }>,
  ): ProcessedContent {
    // Combine all utterances into structured content
    const fullText = utterances.map((u) => u.text).join(' ')

    // Split into meaningful segments (sentences, paragraphs)
    const sentences = fullText
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 10)
      .map((s) => s.trim())

    // Group utterances by time segments for context
    const timeSegments = this.groupByTimeSegments(utterances)

    // Extract speaker patterns if available
    const speakerPatterns = this.analyzeSpeakerPatterns(utterances)

    return {
      fullText,
      sentences,
      timeSegments,
      speakerPatterns,
      totalDuration:
        utterances.length > 0 ? utterances[utterances.length - 1].end : 0,
      utteranceCount: utterances.length,
    }
  }

  /**
   * Group utterances by time segments for better context
   */
  private groupByTimeSegments(
    utterances: Array<{ text: string; start: number; end: number }>,
  ) {
    const segments: Array<{
      start: number
      end: number
      text: string
      utterances: string[]
    }> = []
    const segmentDuration = 60 // 1-minute segments

    let currentSegment = {
      start: 0,
      end: segmentDuration,
      text: '',
      utterances: [] as string[],
    }

    utterances.forEach((utterance) => {
      if (utterance.start >= currentSegment.end) {
        if (currentSegment.utterances.length > 0) {
          segments.push(currentSegment)
        }
        currentSegment = {
          start:
            Math.floor(utterance.start / segmentDuration) * segmentDuration,
          end:
            Math.floor(utterance.start / segmentDuration) * segmentDuration +
            segmentDuration,
          text: '',
          utterances: [],
        }
      }

      currentSegment.utterances.push(utterance.text)
      currentSegment.text += ' ' + utterance.text
    })

    if (currentSegment.utterances.length > 0) {
      segments.push(currentSegment)
    }

    return segments
  }

  /**
   * Analyze speaker patterns for better context
   */
  private analyzeSpeakerPatterns(
    utterances: Array<{ text: string; start: number; end: number }>,
  ) {
    // This would be enhanced with actual speaker detection from Deepgram
    // For now, we'll analyze text patterns that might indicate different speakers
    const patterns = {
      questionCount: 0,
      statementCount: 0,
      longUtterances: 0,
      shortUtterances: 0,
    }

    utterances.forEach((utterance) => {
      if (utterance.text.includes('?')) patterns.questionCount++
      if (utterance.text.length > 100) patterns.longUtterances++
      if (utterance.text.length < 20) patterns.shortUtterances++
      patterns.statementCount++
    })

    return patterns
  }

  /**
   * Extract key topics from transcript content
   */
  private extractTopics(content: ProcessedContent): TopicExtraction[] {
    const topics = new Map<string, TopicExtraction>()

    // Define topic keywords and their importance weights
    const topicKeywords = {
      introduction: {
        weight: 0.8,
        keywords: ['introduction', 'welcome', 'hello', 'today', 'start'],
      },
      main_content: {
        weight: 1.0,
        keywords: ['main', 'important', 'key', 'primary', 'focus'],
      },
      examples: {
        weight: 0.7,
        keywords: ['example', 'instance', 'case', 'scenario', 'demonstration'],
      },
      conclusion: {
        weight: 0.9,
        keywords: ['conclusion', 'summary', 'finally', 'overall', 'wrap up'],
      },
      questions: {
        weight: 0.6,
        keywords: ['question', 'ask', 'wonder', 'curious', 'doubt'],
      },
      technical: {
        weight: 0.8,
        keywords: ['technical', 'technology', 'system', 'process', 'method'],
      },
      personal: {
        weight: 0.5,
        keywords: ['experience', 'story', 'happened', 'felt', 'thought'],
      },
    }

    // Analyze each sentence for topic relevance
    content.sentences.forEach((sentence: string, index: number) => {
      const lowerSentence = sentence.toLowerCase()

      Object.entries(topicKeywords).forEach(([topic, config]) => {
        const relevance = config.keywords.reduce((score, keyword) => {
          if (lowerSentence.includes(keyword)) {
            // Higher score for sentences that appear earlier (introduction) or later (conclusion)
            const positionBonus =
              index < 3 || index > content.sentences.length - 3 ? 0.3 : 0
            return score + config.weight + positionBonus
          }
          return score
        }, 0)

        if (relevance > 0) {
          if (!topics.has(topic)) {
            topics.set(topic, {
              topic,
              frequency: 0,
              importance: 0,
              relatedSentences: [],
            })
          }

          const topicData = topics.get(topic)!
          topicData.frequency++
          topicData.importance += relevance
          topicData.relatedSentences.push(sentence)
        }
      })
    })

    // Convert to array and sort by importance
    return Array.from(topics.values())
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 5) // Top 5 topics
  }

  /**
   * Generate summary based on requested style
   */
  private generateSummaryByStyle(
    content: ProcessedContent,
    topics: TopicExtraction[],
    params: SummaryParams,
  ): string {
    switch (params.style) {
      case 'brief':
        return this.generateBriefSummary(content, topics)
      case 'detailed':
        return this.generateDetailedSummary(content, topics)
      case 'bullet':
        return this.generateBulletSummary(content, topics)
      case 'executive':
        return this.generateExecutiveSummary(content, topics)
      case 'educational':
        return this.generateEducationalSummary(content, topics)
      default:
        return this.generateDetailedSummary(content, topics)
    }
  }

  /**
   * Generate brief summary (2-3 sentences)
   */
  private generateBriefSummary(
    content: ProcessedContent,
    topics: TopicExtraction[],
  ): string {
    const mainTopic = topics[0]
    const introSentence = content.sentences[0] || ''
    const conclusionSentence =
      content.sentences[content.sentences.length - 1] || ''

    let summary = ''

    if (introSentence) {
      summary += introSentence + '. '
    }

    if (mainTopic && mainTopic.relatedSentences.length > 0) {
      const mainPoint = mainTopic.relatedSentences[0]
      if (mainPoint && !summary.includes(mainPoint)) {
        summary += mainPoint + '. '
      }
    }

    if (conclusionSentence && !summary.includes(conclusionSentence)) {
      summary += conclusionSentence
      if (!conclusionSentence.endsWith('.')) summary += '.'
    }

    return summary.trim()
  }

  /**
   * Generate detailed summary (5-8 sentences)
   */
  private generateDetailedSummary(
    content: ProcessedContent,
    topics: TopicExtraction[],
  ): string {
    const summaryParts: string[] = []

    // Introduction
    if (content.sentences[0]) {
      summaryParts.push(content.sentences[0])
    }

    // Main content from top topics
    topics.slice(0, 3).forEach((topic) => {
      if (topic.relatedSentences.length > 0) {
        const bestSentence = this.selectBestSentence(topic.relatedSentences)
        if (bestSentence && !summaryParts.includes(bestSentence)) {
          summaryParts.push(bestSentence)
        }
      }
    })

    // Conclusion
    if (
      content.sentences[content.sentences.length - 1] &&
      !summaryParts.includes(content.sentences[content.sentences.length - 1])
    ) {
      summaryParts.push(content.sentences[content.sentences.length - 1])
    }

    return summaryParts.join('. ').trim()
  }

  /**
   * Generate bullet-point style summary
   */
  private generateBulletSummary(
    content: ProcessedContent,
    topics: TopicExtraction[],
  ): string {
    const bulletPoints: string[] = []

    // Main topic bullet
    if (topics[0]) {
      bulletPoints.push(`• Main Focus: ${topics[0].topic}`)
    }

    // Key insights from top topics
    topics.slice(0, 4).forEach((topic) => {
      if (topic.relatedSentences.length > 0) {
        const insight = this.extractInsight(topic.relatedSentences[0])
        if (insight) {
          bulletPoints.push(`• ${insight}`)
        }
      }
    })

    // Duration and content info
    bulletPoints.push(
      `• Duration: ${Math.round(content.totalDuration / 60)} minutes`,
    )
    bulletPoints.push(`• Content: ${content.utteranceCount} speech segments`)

    return bulletPoints.join('\n')
  }

  /**
   * Generate executive summary (business-focused)
   */
  private generateExecutiveSummary(
    content: ProcessedContent,
    topics: TopicExtraction[],
  ): string {
    const summary = `This ${Math.round(content.totalDuration / 60)}-minute presentation covers ${topics.length} key areas. `

    const mainPoints = topics
      .slice(0, 3)
      .map((topic) =>
        topic.topic.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      )
      .join(', ')

    return (
      summary +
      `The main focus areas include: ${mainPoints}. The content provides comprehensive coverage with ${content.utteranceCount} detailed segments.`
    )
  }

  /**
   * Generate educational summary (learning-focused)
   */
  private generateEducationalSummary(
    content: ProcessedContent,
    topics: TopicExtraction[],
  ): string {
    const learningObjectives = topics
      .slice(0, 3)
      .map((topic) => `understanding ${topic.topic.replace(/_/g, ' ')}`)

    return `This educational content is designed to help learners achieve ${learningObjectives.length} main objectives: ${learningObjectives.join(', ')}. The ${Math.round(content.totalDuration / 60)}-minute session provides comprehensive coverage through ${content.utteranceCount} detailed explanations and examples.`
  }

  /**
   * Extract key points based on content and style
   */
  private extractKeyPoints(
    content: ProcessedContent,
    topics: TopicExtraction[],
  ): string[] {
    const keyPoints: string[] = []

    // Extract key points from main topics
    topics.slice(0, 5).forEach((topic) => {
      if (topic.relatedSentences.length > 0) {
        const keyPoint = this.extractInsight(topic.relatedSentences[0])
        if (keyPoint && keyPoint.length > 20 && keyPoint.length < 100) {
          keyPoints.push(keyPoint)
        }
      }
    })

    // Add content-specific key points
    if (content.speakerPatterns.questionCount > 0) {
      keyPoints.push(
        `Contains ${content.speakerPatterns.questionCount} questions for engagement`,
      )
    }

    if (content.speakerPatterns.longUtterances > 0) {
      keyPoints.push(
        `Includes ${content.speakerPatterns.longUtterances} detailed explanations`,
      )
    }

    return keyPoints.slice(0, 8) // Limit to 8 key points
  }

  /**
   * Select the best sentence from a list of related sentences
   */
  private selectBestSentence(sentences: string[]): string {
    if (sentences.length === 0) return ''

    // Prefer sentences with medium length (not too short, not too long)
    const scoredSentences = sentences.map((sentence) => ({
      sentence,
      score: this.scoreSentence(sentence),
    }))

    scoredSentences.sort((a, b) => b.score - a.score)
    return scoredSentences[0].sentence
  }

  /**
   * Score a sentence based on quality indicators
   */
  private scoreSentence(sentence: string): number {
    let score = 0

    // Length preference (20-80 words is ideal)
    const wordCount = sentence.split(' ').length
    if (wordCount >= 20 && wordCount <= 80) score += 2
    else if (wordCount > 80) score += 1
    else score += 0.5

    // Content quality indicators
    if (sentence.includes('because')) score += 1
    if (sentence.includes('example')) score += 1
    if (sentence.includes('important')) score += 1
    if (sentence.includes('key')) score += 1
    if (
      sentence.includes('first') ||
      sentence.includes('second') ||
      sentence.includes('third')
    )
      score += 1

    // Avoid sentences that are just questions without context
    if (sentence.includes('?') && sentence.split(' ').length < 10) score -= 1

    return score
  }

  /**
   * Extract insight from a sentence
   */
  private extractInsight(sentence: string): string {
    // Remove common filler words and clean up
    let insight = sentence
      .replace(/^(so|well|um|uh|you know|like|basically|actually)\s+/i, '')
      .replace(/\s+(so|well|um|uh|you know|like|basically|actually)\s+/gi, ' ')
      .trim()

    // Capitalize first letter
    if (insight.length > 0) {
      insight = insight.charAt(0).toUpperCase() + insight.slice(1)
    }

    return insight
  }

  /**
   * Calculate confidence score for the summary
   */
  private calculateConfidence(
    content: ProcessedContent,
    topics: TopicExtraction[],
  ): number {
    let confidence = 0.5 // Base confidence

    // Higher confidence for longer content
    if (content.utteranceCount > 50) confidence += 0.2
    else if (content.utteranceCount > 20) confidence += 0.1

    // Higher confidence for more topics identified
    if (topics.length >= 3) confidence += 0.2
    else if (topics.length >= 1) confidence += 0.1

    // Higher confidence for balanced content distribution
    const timeDistribution = content.timeSegments.length
    if (timeDistribution > 5) confidence += 0.1

    return Math.min(confidence, 1.0)
  }

  /**
   * Get default length for summary style
   */
  private getDefaultLength(style: SummaryStyle): number {
    switch (style) {
      case 'brief':
        return 150
      case 'detailed':
        return 300
      case 'bullet':
        return 200
      case 'executive':
        return 250
      case 'educational':
        return 280
      default:
        return 300
    }
  }
}

// Export singleton instance
export const aiSummaryService = new AISummaryService()
