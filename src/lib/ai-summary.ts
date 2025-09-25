/**
 * AI-powered video summarization service
 *
 * This service intelligently processes entire video transcripts to generate
 * meaningful summaries that capture the actual content and key insights.
 */

import { summarizeTranscriptLLM, type TranscriptChunk } from './llm'
import { prisma } from './prisma'

/**
 * Summary style options for different use cases
 */
export type SummaryStyle = 'brief' | 'detailed' | 'executive' | 'educational'

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
  // Optional enriched key points with categories and timestamps
  keyPointsRich?: Array<{
    text: string
    category?:
      | 'Concept'
      | 'Example'
      | 'Action'
      | 'Result'
      | 'Tip'
      | 'Metric'
      | 'Best Practice'
      | 'Warning'
      | 'Process'
    start?: number
    end?: number
  }>
}

/**
 * Topic extraction result
 */
interface TopicExtraction {
  topic: string
  frequency: number
  importance: number
  relatedSentences: string[]
  context: string
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

      // Try using LLM for smarter summarization if configured
      let llmResult: SummaryResult | null = null
      try {
        llmResult = await this.tryLLMSummary(
          processedContent,
          params,
          transcript.title || undefined,
        )
      } catch {
        // Log but do not fail the request; we'll fall back to heuristics
        console.warn('🟡 LLM summarization unavailable, using heuristic')
      }

      // Use LLM if available, otherwise heuristic
      const summary =
        llmResult?.summary ||
        this.generateSummaryByStyle(processedContent, topics, params)

      const result: SummaryResult = {
        summary,
        keyPoints: [], // Removed as requested
        topics: topics.map((t) => t.topic),
        confidence:
          llmResult?.confidence ??
          this.calculateConfidence(processedContent, topics),
        style: params.style,
        wordCount: summary.split(' ').length,
        generatedAt: new Date(),
        keyPointsRich: [], // Removed as requested
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
   * Attempt LLM-powered summary. Returns null if not configured/failed.
   */
  private async tryLLMSummary(
    content: ProcessedContent,
    params: SummaryParams,
    title?: string,
  ): Promise<SummaryResult | null> {
    // Build chunks from time segments; if none, fall back to full text chunk
    const chunks: TranscriptChunk[] =
      content.timeSegments?.length > 0
        ? content.timeSegments.map((seg) => ({
            start: seg.start,
            end: seg.end,
            text: seg.text.trim(),
          }))
        : [
            {
              start: 0,
              end: Math.max(1, content.totalDuration),
              text: content.fullText,
            },
          ]

    try {
      const llm = await summarizeTranscriptLLM(chunks, {
        style: params.style,
        maxLength: params.maxLength,
        focusOnTopics: params.focusOnTopics,
        videoTitle: title,
      })

      const summaryText = this.cleanupSummary(llm.summary)
      const keyPoints = (llm.keyPoints || []).map((p) =>
        this.cleanupSentence(p),
      )
      const topics = Array.isArray(llm.topics) ? llm.topics : []
      const wordCount = summaryText.split(' ').length

      return {
        summary: summaryText,
        keyPoints: keyPoints.slice(0, 5),
        topics,
        confidence: 0.9, // LLM-backed summaries get higher base confidence
        style: params.style,
        wordCount,
        generatedAt: new Date(),
        keyPointsRich: this.buildKeyPointsRich(keyPoints.slice(0, 5), content),
      }
    } catch {
      return null
    }
  }

  /**
   * Build enriched key points with categories and approximate timestamps
   */
  private buildKeyPointsRich(
    points: string[],
    content: ProcessedContent,
  ): Array<{
    text: string
    category?:
      | 'Concept'
      | 'Example'
      | 'Action'
      | 'Result'
      | 'Tip'
      | 'Metric'
      | 'Best Practice'
      | 'Warning'
      | 'Process'
    start?: number
    end?: number
  }> {
    const categorize = (text: string) => {
      const t = text.toLowerCase()
      if (/(for example|example|e\.g\.|case|demo|demonstrat)/.test(t))
        return 'Example'
      if (/(should|recommend|best practice|avoid|ensure|always|never)/.test(t))
        return 'Best Practice'
      if (/(warning|caution|risk|pitfall|anti-pattern|beware)/.test(t))
        return 'Warning'
      if (/(result|outcome|therefore|thus|leads to|implies)/.test(t))
        return 'Result'
      if (/(define|definition|concept|principle|theory|what is)/.test(t))
        return 'Concept'
      if (/(step|first|next|then|process|workflow)/.test(t)) return 'Process'
      if (/(click|use|do|set|create|run|call|enable|disable|configure)/.test(t))
        return 'Action'
      if (
        /(\d+%|\d+ms|\d+s|\d+min|performance|throughput|latency|metric)/.test(t)
      )
        return 'Metric'
      if (/(tip|hint|pro tip)/.test(t)) return 'Tip'
      return undefined
    }

    const scoreMatch = (a: string, b: string) => {
      const wa = a
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(Boolean)
      const wb = b
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(Boolean)
      if (wa.length === 0 || wb.length === 0) return 0
      const setB = new Set(wb)
      let hits = 0
      for (const w of wa) if (setB.has(w)) hits++
      return hits / Math.sqrt(wa.length * wb.length)
    }

    const segments = content.timeSegments || []

    return points.map((text) => {
      let bestIdx = -1
      let bestScore = 0
      for (let i = 0; i < segments.length; i++) {
        const s = segments[i]
        const score = scoreMatch(text, s.text)
        if (score > bestScore) {
          bestScore = score
          bestIdx = i
        }
      }
      const seg = bestIdx >= 0 ? segments[bestIdx] : undefined
      return {
        text: this.cleanupSentence(text),
        category: categorize(text),
        start: seg?.start,
        end: seg?.end,
      }
    })
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
   * Now provides meaningful, video-specific topics with context
   */
  private extractTopics(content: ProcessedContent): TopicExtraction[] {
    const topics = new Map<string, TopicExtraction>()

    // Enhanced topic keywords with better context detection
    const topicKeywords = {
      introduction: {
        weight: 0.9,
        keywords: [
          'introduction',
          'welcome',
          'hello',
          'today',
          'start',
          'begin',
          'overview',
          "what we'll cover",
        ],
        context: 'Opening and setup of the main topic',
      },
      main_content: {
        weight: 1.0,
        keywords: [
          'main',
          'important',
          'key',
          'primary',
          'focus',
          'core',
          'essential',
          'fundamental',
          'principle',
        ],
        context: 'Central concepts and primary information',
      },
      examples: {
        weight: 0.8,
        keywords: [
          'example',
          'instance',
          'case',
          'scenario',
          'demonstration',
          'show you',
          'let me show',
          "here's how",
        ],
        context: 'Practical demonstrations and real-world applications',
      },
      conclusion: {
        weight: 0.9,
        keywords: [
          'conclusion',
          'summary',
          'finally',
          'overall',
          'wrap up',
          'to summarize',
          'in summary',
          'key takeaway',
        ],
        context: 'Summary and final thoughts',
      },
      questions: {
        weight: 0.7,
        keywords: [
          'question',
          'ask',
          'wonder',
          'curious',
          'doubt',
          'what if',
          'how does',
          'why is',
        ],
        context: 'Questions and interactive elements',
      },
      technical: {
        weight: 0.8,
        keywords: [
          'technical',
          'technology',
          'system',
          'process',
          'method',
          'algorithm',
          'framework',
          'architecture',
        ],
        context: 'Technical details and implementation',
      },
      personal: {
        weight: 0.6,
        keywords: [
          'experience',
          'story',
          'happened',
          'felt',
          'thought',
          'learned',
          'discovered',
          'realized',
        ],
        context: 'Personal experiences and insights',
      },
      comparison: {
        weight: 0.7,
        keywords: [
          'compare',
          'versus',
          'difference',
          'similar',
          'unlike',
          'however',
          'on the other hand',
        ],
        context: 'Comparisons and contrasts',
      },
      step_by_step: {
        weight: 0.8,
        keywords: [
          'step',
          'first',
          'second',
          'third',
          'next',
          'then',
          'finally',
          'process',
          'procedure',
        ],
        context: 'Step-by-step instructions and procedures',
      },
      benefits: {
        weight: 0.7,
        keywords: [
          'benefit',
          'advantage',
          'pros',
          'why',
          'reason',
          'because',
          'advantageous',
          'helpful',
        ],
        context: 'Benefits and advantages of concepts',
      },
    }

    // Analyze each sentence for topic relevance with better scoring
    content.sentences.forEach((sentence: string, index: number) => {
      const lowerSentence = sentence.toLowerCase()

      Object.entries(topicKeywords).forEach(([topic, config]) => {
        const relevance = config.keywords.reduce((score, keyword) => {
          if (lowerSentence.includes(keyword)) {
            // Higher score for sentences that appear earlier (introduction) or later (conclusion)
            const positionBonus =
              index < 3 || index > content.sentences.length - 3 ? 0.4 : 0

            // Higher score for longer, more meaningful sentences
            const lengthBonus =
              sentence.length > 50 ? 0.3 : sentence.length > 30 ? 0.2 : 0.1

            // Higher score for sentences with specific content indicators
            const contentBonus =
              lowerSentence.includes('because') ||
              lowerSentence.includes('example')
                ? 0.2
                : 0

            return (
              score + config.weight + positionBonus + lengthBonus + contentBonus
            )
          }
          return score
        }, 0)

        if (relevance > 0.5) {
          // Higher threshold for better quality topics
          if (!topics.has(topic)) {
            topics.set(topic, {
              topic,
              frequency: 0,
              importance: 0,
              relatedSentences: [],
              context: config.context,
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
        return this.generateBriefSummary(content)
      case 'detailed':
        return this.generateDetailedSummary(content)
      case 'executive':
        return this.generateExecutiveSummary(content, topics)
      case 'educational':
        return this.generateEducationalSummary(content, topics)
      default:
        return this.generateDetailedSummary(content)
    }
  }

  /**
   * Generate brief summary (150+ words describing the video)
   */
  private generateBriefSummary(content: ProcessedContent): string {
    const targetWords = 150
    let summary = ''

    // Start with opening sentences
    const openingSentences = content.sentences.slice(0, 3)
    summary += openingSentences.join('. ') + '. '

    // Add middle content if we need more words
    if (
      summary.split(' ').length < targetWords &&
      content.sentences.length > 6
    ) {
      const middleStart = Math.floor(content.sentences.length * 0.4)
      const middleEnd = Math.floor(content.sentences.length * 0.6)
      const middleSentences = content.sentences.slice(middleStart, middleEnd)
      summary += middleSentences.slice(0, 2).join('. ') + '. '
    }

    // Add conclusion if we still need more words
    if (
      summary.split(' ').length < targetWords &&
      content.sentences.length > 1
    ) {
      const conclusion = content.sentences[content.sentences.length - 1]
      if (!summary.includes(conclusion)) {
        summary += conclusion
        if (!conclusion.endsWith('.')) summary += '.'
      }
    }

    return this.cleanupSummary(summary)
  }

  /**
   * Generate detailed summary (300+ words wrapping the video content)
   */
  private generateDetailedSummary(content: ProcessedContent): string {
    const allText = content.sentences.join(' ')
    const wordCount = allText.split(' ').length
    
    // For very short content
    if (content.sentences.length <= 2 || wordCount < 20) {
      return `This is a brief piece of content with ${content.sentences.length} main segments.`
    }

    // Identify content type and create appropriate summary
    const contentType = this.identifyContentType(allText)
    const duration = Math.ceil(wordCount / 150) // Rough estimate of minutes
    
    let summary = ''
    
    // Start with content type identification
    switch (contentType) {
      case 'music':
        summary = `This appears to be a music video or song`
        break
      case 'tutorial':
        summary = `This content provides instructional guidance`
        break
      case 'interview':
        summary = `This features a conversation or interview`
        break
      case 'presentation':
        summary = `This is a presentation or educational content`
        break
      case 'entertainment':
        summary = `This is entertainment-focused content`
        break
      default:
        summary = `This video content`
    }
    
    // Add duration context
    summary += ` lasting approximately ${duration} minute${duration !== 1 ? 's' : ''}.`
    
    // Add key content insights if we have enough material
    if (content.sentences.length > 3) {
      const keyInsights = this.extractSimpleInsights(content.sentences)
      if (keyInsights.length > 0) {
        summary += ` The content includes ${keyInsights.slice(0, 2).join(' and ')}.`
      }
    }
    
    return summary
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
   * Generate 5 truly smart key points from the full transcript
   */
  private extractKeyPoints(content: ProcessedContent): string[] {
    const keyPoints: string[] = []

    // Strategy 1: Extract the most important sentences (those with key indicators)
    const importantSentences = content.sentences.filter((sentence) => {
      const lower = sentence.toLowerCase()
      return (
        lower.includes('important') ||
        lower.includes('key') ||
        lower.includes('main') ||
        lower.includes('significant') ||
        lower.includes('crucial') ||
        lower.includes('essential') ||
        lower.includes('remember') ||
        lower.includes('takeaway') ||
        lower.includes('conclusion') ||
        lower.includes('result')
      )
    })

    // Add best important sentences
    importantSentences.slice(0, 2).forEach((sentence) => {
      const cleaned = this.cleanupSentence(sentence)
      if (cleaned && cleaned.length > 20 && cleaned.length < 150) {
        keyPoints.push(cleaned)
      }
    })

    // Strategy 2: Extract sentences with examples or demonstrations
    const exampleSentences = content.sentences.filter((sentence) => {
      const lower = sentence.toLowerCase()
      return (
        lower.includes('example') ||
        lower.includes('demonstrate') ||
        lower.includes('show you') ||
        lower.includes('instance') ||
        lower.includes('case')
      )
    })

    if (exampleSentences.length > 0 && keyPoints.length < 5) {
      const cleaned = this.cleanupSentence(exampleSentences[0])
      if (cleaned && cleaned.length > 20 && cleaned.length < 150) {
        keyPoints.push(cleaned)
      }
    }

    // Strategy 3: Extract opening and closing insights
    if (content.sentences.length > 0 && keyPoints.length < 5) {
      const opening = this.cleanupSentence(content.sentences[0])
      if (opening && opening.length > 20 && opening.length < 150) {
        keyPoints.push(`Opening insight: ${opening}`)
      }
    }

    if (content.sentences.length > 1 && keyPoints.length < 5) {
      const closing = this.cleanupSentence(
        content.sentences[content.sentences.length - 1],
      )
      if (closing && closing.length > 20 && closing.length < 150) {
        keyPoints.push(`Key conclusion: ${closing}`)
      }
    }

    // Strategy 4: Fill remaining slots with high-quality sentences
    if (keyPoints.length < 5) {
      const qualitySentences = content.sentences
        .filter(
          (sentence) =>
            sentence.length > 30 &&
            sentence.length < 120 &&
            !keyPoints.some((kp) => kp.includes(sentence.substring(0, 20))),
        )
        .sort((a, b) => this.scoreSentence(b) - this.scoreSentence(a))

      for (const sentence of qualitySentences) {
        if (keyPoints.length >= 5) break
        const cleaned = this.cleanupSentence(sentence)
        if (cleaned) {
          keyPoints.push(cleaned)
        }
      }
    }

    // Ensure we always have exactly 5 key points
    while (
      keyPoints.length < 5 &&
      content.sentences.length > keyPoints.length
    ) {
      const remaining = content.sentences.filter(
        (s) => !keyPoints.some((kp) => kp.includes(s.substring(0, 20))),
      )
      if (remaining.length > 0) {
        const cleaned = this.cleanupSentence(remaining[0])
        if (cleaned) {
          keyPoints.push(cleaned)
        } else {
          break
        }
      } else {
        break
      }
    }

    return keyPoints.slice(0, 5)
  }

  /**
   * Extract insights based on timing in the video
   */
  private extractTimeBasedInsights(content: ProcessedContent): string[] {
    const insights: string[] = []

    if (content.sentences.length >= 3) {
      // Beginning insight
      const introSentence = content.sentences[0]
      if (introSentence && introSentence.length > 30) {
        insights.push(`Opening: ${this.extractInsight(introSentence)}`)
      }

      // Middle insight (if video is long enough)
      if (content.sentences.length >= 5) {
        const middleIndex = Math.floor(content.sentences.length / 2)
        const middleSentence = content.sentences[middleIndex]
        if (middleSentence && middleSentence.length > 30) {
          insights.push(`Core content: ${this.extractInsight(middleSentence)}`)
        }
      }

      // Ending insight
      const endingSentence = content.sentences[content.sentences.length - 1]
      if (endingSentence && endingSentence.length > 30) {
        insights.push(`Conclusion: ${this.extractInsight(endingSentence)}`)
      }
    }

    return insights
  }

  /**
   * Extract insights about the content structure
   */
  private extractStructureInsights(content: ProcessedContent): string[] {
    const insights: string[] = []

    // Analyze content flow
    if (content.timeSegments.length > 3) {
      insights.push(
        `Content structured in ${content.timeSegments.length} main segments`,
      )
    }

    // Analyze content density
    const avgWordsPerMinute =
      content.fullText.split(' ').length / (content.totalDuration / 60)
    if (avgWordsPerMinute > 150) {
      insights.push('High information density with detailed explanations')
    } else if (avgWordsPerMinute < 100) {
      insights.push('Paced delivery with clear, digestible content')
    }

    return insights
  }

  /**
   * Extract insights about speaker engagement and interaction
   */
  private extractEngagementInsights(content: ProcessedContent): string[] {
    const insights: string[] = []

    if (content.speakerPatterns.questionCount > 0) {
      insights.push(
        `Interactive format with ${content.speakerPatterns.questionCount} engaging questions`,
      )
    }

    if (
      content.speakerPatterns.longUtterances >
      content.speakerPatterns.shortUtterances
    ) {
      insights.push('Detailed explanations with comprehensive coverage')
    } else {
      insights.push('Concise delivery with focused key messages')
    }

    return insights
  }

  /**
   * Extract insights about examples and demonstrations
   */
  private extractExampleInsights(content: ProcessedContent): string[] {
    const insights: string[] = []

    // Look for sentences that contain examples
    const exampleSentences = content.sentences.filter(
      (sentence) =>
        sentence.toLowerCase().includes('example') ||
        sentence.toLowerCase().includes('instance') ||
        sentence.toLowerCase().includes('demonstrate') ||
        sentence.toLowerCase().includes('show you') ||
        sentence.toLowerCase().includes('let me show'),
    )

    if (exampleSentences.length > 0) {
      const bestExample = this.selectBestSentence(exampleSentences)
      if (bestExample) {
        insights.push(`Practical example: ${this.extractInsight(bestExample)}`)
      }
    }

    return insights
  }

  /**
   * Prioritize key points by relevance and quality
   */
  private prioritizeKeyPoints(keyPoints: string[]): string[] {
    return keyPoints
      .filter((point) => point && point.length > 15 && point.length < 120) // Filter out too short or too long
      .sort((a, b) => {
        // Prioritize points that are more specific and informative
        const aScore = this.scoreKeyPoint(a)
        const bScore = this.scoreKeyPoint(b)
        return bScore - aScore
      })
  }

  /**
   * Score a key point for relevance and quality
   */
  private scoreKeyPoint(point: string): number {
    let score = 0

    // Higher score for points that are specific
    if (point.includes(':')) score += 2
    if (point.includes('"') || point.includes('"')) score += 1

    // Higher score for points that mention specific content
    if (point.toLowerCase().includes('example')) score += 2
    if (point.toLowerCase().includes('demonstrate')) score += 2
    if (point.toLowerCase().includes('show')) score += 1

    // Lower score for generic statements
    if (point.toLowerCase().includes('contains')) score -= 1
    if (point.toLowerCase().includes('includes')) score -= 1

    // Higher score for points with specific numbers or metrics
    if (/\d+/.test(point)) score += 1

    return score
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
   * Clean up and format a sentence
   */
  private cleanupSentence(sentence: string): string {
    return sentence
      .replace(/^(so|well|um|uh|you know|like|basically|actually)\s+/i, '')
      .replace(/\s+(so|well|um|uh|you know|like|basically|actually)\s+/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, (c) => c.toUpperCase())
  }

  /**
   * Extract insight from a sentence (legacy method)
   */
  private extractInsight(sentence: string): string {
    return this.cleanupSentence(sentence)
  }

  /**
   * Identify the type of content based on text analysis
   */
  private identifyContentType(text: string): string {
    const lowerText = text.toLowerCase()
    
    // Music-related patterns
    if (/\b(song|music|sing|melody|rhythm|beat|lyrics|album|artist|dance)\b/.test(lowerText)) {
      return 'music'
    }
    
    // Tutorial/instructional patterns
    if (/\b(how to|tutorial|step|guide|learn|teach|instruction|follow|setup)\b/.test(lowerText)) {
      return 'tutorial'
    }
    
    // Interview/conversation patterns
    if (/\b(interview|conversation|discuss|talk|question|answer|guest|host)\b/.test(lowerText)) {
      return 'interview'
    }
    
    // Presentation/educational patterns
    if (/\b(present|explain|demonstrate|show|introduce|overview|concept|theory)\b/.test(lowerText)) {
      return 'presentation'
    }
    
    // Entertainment patterns
    if (/\b(funny|comedy|entertainment|fun|joke|laugh|story|adventure)\b/.test(lowerText)) {
      return 'entertainment'
    }
    
    return 'general'
  }

  /**
   * Extract simple, meaningful insights from content
   */
  private extractSimpleInsights(sentences: string[]): string[] {
    const insights: string[] = []
    
    // Look for sentences with action words or descriptive content
    const meaningfulSentences = sentences.filter(sentence => {
      const words = sentence.toLowerCase().split(' ')
      return words.length >= 4 && words.length <= 20 && 
             /\b(about|discusses|features|shows|includes|contains|focuses|explores)\b/.test(sentence.toLowerCase())
    })
    
    if (meaningfulSentences.length > 0) {
      insights.push('meaningful dialogue and content')
    }
    
    // Check for emotional or descriptive language
    const hasEmotionalContent = sentences.some(sentence => 
      /\b(happy|sad|excited|amazing|beautiful|wonderful|incredible|fantastic)\b/i.test(sentence)
    )
    
    if (hasEmotionalContent) {
      insights.push('expressive and emotional elements')
    }
    
    // Check for action or movement
    const hasActionContent = sentences.some(sentence =>
      /\b(move|dance|jump|run|walk|go|come|play|perform)\b/i.test(sentence)
    )
    
    if (hasActionContent) {
      insights.push('dynamic action and movement')
    }
    
    return insights
  }

  /**
   * Generate a descriptive summary for short or simple content
   */
  private generateDescriptiveSummary(content: ProcessedContent): string {
    const allText = content.sentences.join(' ')
    const wordCount = allText.split(' ').length
    
    if (wordCount < 10) {
      return `This is a brief ${wordCount}-word content.`
    }
    
    // Try to identify content type
    const hasMusic = /music|song|sing|melody|rhythm|beat/i.test(allText)
    const hasDialog = /said|tell|ask|answer|speak/i.test(allText)
    const hasInstruction = /how|step|first|then|next|follow/i.test(allText)
    
    let summary = ''
    if (hasMusic) {
      summary = 'This appears to be music-related content'
    } else if (hasDialog) {
      summary = 'This content features dialogue or conversation'
    } else if (hasInstruction) {
      summary = 'This content provides instructions or guidance'
    } else {
      summary = 'This content covers various topics'
    }
    
    // Add a bit about the length and style
    summary += ` spanning approximately ${Math.ceil(wordCount / 150)} minutes of material.`
    
    return summary
  }

  /**
   * Extract main themes from content
   */
  private extractMainThemes(content: ProcessedContent): string[] {
    const allText = content.sentences.join(' ').toLowerCase()
    const themes: string[] = []
    
    // Common theme patterns
    const themePatterns = [
      { pattern: /music|song|sing|melody|artist|album/, theme: 'music and entertainment' },
      { pattern: /business|company|market|profit|revenue/, theme: 'business and finance' },
      { pattern: /technology|software|computer|digital|app/, theme: 'technology' },
      { pattern: /health|medical|doctor|treatment|wellness/, theme: 'health and wellness' },
      { pattern: /education|learn|teach|student|school/, theme: 'education' },
      { pattern: /travel|trip|journey|destination|visit/, theme: 'travel' },
      { pattern: /food|recipe|cook|eat|restaurant/, theme: 'food and cooking' },
      { pattern: /sport|game|play|team|competition/, theme: 'sports and games' },
    ]
    
    for (const { pattern, theme } of themePatterns) {
      if (pattern.test(allText)) {
        themes.push(theme)
      }
    }
    
    return themes
  }

  /**
   * Analyze content structure
   */
  private analyzeContentStructure(content: ProcessedContent): {
    hasIntroduction: boolean
    hasMiddleContent: boolean
    hasConclusion: boolean
  } {
    return {
      hasIntroduction: content.sentences.length > 2,
      hasMiddleContent: content.sentences.length > 5,
      hasConclusion: content.sentences.length > 3,
    }
  }

  /**
   * Summarize a section of sentences
   */
  private summarizeSection(sentences: string[]): string {
    if (sentences.length === 0) return ''
    
    // For very short sections, just pick the most meaningful sentence
    if (sentences.length <= 2) {
      return sentences.find(s => s.length > 20) || sentences[0] || ''
    }
    
    // For longer sections, create a brief summary
    const combinedText = sentences.join(' ')
    const words = combinedText.split(' ')
    
    if (words.length < 50) {
      return `The content covers ${this.extractKeyPhrase(combinedText)}.`
    }
    
    // Extract the most meaningful parts
    const keyPhrases = this.extractKeyPhrases(combinedText)
    if (keyPhrases.length > 0) {
      return `It discusses ${keyPhrases.slice(0, 2).join(' and ')}.`
    }
    
    return `It covers various related topics.`
  }

  /**
   * Extract a key phrase from text
   */
  private extractKeyPhrase(text: string): string {
    const words = text.toLowerCase().split(' ')
    const meaningfulWords = words.filter(word => 
      word.length > 3 && 
      !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'will', 'were', 'said'].includes(word)
    )
    
    return meaningfulWords.slice(0, 3).join(' ') || 'general topics'
  }

  /**
   * Extract key phrases from text
   */
  private extractKeyPhrases(text: string): string[] {
    const sentences = text.split(/[.!?]+/)
    const phrases: string[] = []
    
    for (const sentence of sentences) {
      const words = sentence.trim().toLowerCase().split(' ')
      if (words.length > 3 && words.length < 15) {
        const meaningfulWords = words.filter(word => 
          word.length > 3 && 
          !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'will', 'were'].includes(word)
        )
        
        if (meaningfulWords.length >= 2) {
          phrases.push(meaningfulWords.slice(0, 4).join(' '))
        }
      }
    }
    
    return phrases.slice(0, 3)
  }

  /**
   * Clean up and format summary text
   */
  private cleanupSummary(summary: string): string {
    return summary
      .replace(/\s+/g, ' ')
      .replace(/\.\s*\./g, '.')
      .trim()
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
