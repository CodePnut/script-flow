/**
 * Search Indexing Service
 *
 * This module handles the creation and maintenance of search indexes
 * for transcript content to enable fast full-text search capabilities.
 *
 * Features:
 * - Automatic indexing of new transcripts
 * - Content tokenization for search optimization
 * - Batch indexing for existing transcripts
 * - Index maintenance and cleanup
 * - Search performance optimization
 */

import { dbOptimization } from './db-optimization'
import { prisma } from './prisma'

/**
 * Search tokenization options
 */
interface TokenizationOptions {
  minWordLength: number
  maxTokens: number
  removeStopWords: boolean
  stemming: boolean
}

/**
 * Default tokenization settings
 */
const DEFAULT_TOKENIZATION: TokenizationOptions = {
  minWordLength: 3,
  maxTokens: 1000,
  removeStopWords: true,
  stemming: false, // Simple implementation without stemming for now
}

/**
 * Common English stop words to filter out
 */
const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'has',
  'he',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'that',
  'the',
  'to',
  'was',
  'will',
  'with',
  'would',
  'you',
  'your',
  'this',
  'they',
  'we',
  'have',
  'had',
  'what',
  'said',
  'each',
  'which',
  'their',
  'time',
  'if',
  'up',
  'out',
  'many',
  'then',
  'them',
  'these',
  'so',
  'some',
  'her',
  'him',
  'his',
  'how',
  'man',
  'new',
  'now',
  'old',
  'see',
  'two',
  'way',
  'who',
  'boy',
  'did',
  'number',
  'no',
  'part',
  'like',
  'over',
  'such',
  'came',
  'come',
  'work',
  'life',
  'also',
  'back',
  'after',
  'first',
  'well',
  'year',
  'where',
  'much',
  'your',
  'may',
  'say',
  'she',
  'use',
  'her',
  'all',
  'there',
  'think',
  'were',
  'been',
  'have',
  'their',
  'said',
  'each',
  'which',
])

/**
 * Search indexing service class
 */
class SearchIndexingService {
  /**
   * Index a single transcript for search
   * @param transcriptId - ID of the transcript to index
   * @returns Success status
   */
  async indexTranscript(transcriptId: string): Promise<boolean> {
    try {
      return await dbOptimization.executeWithMonitoring(
        'transcript_search',
        async () => {
          // Fetch transcript data
          const transcript = await prisma.transcript.findUnique({
            where: { id: transcriptId },
            select: {
              id: true,
              title: true,
              description: true,
              utterances: true,
              language: true,
            },
          })

          if (!transcript) {
            console.warn(`Transcript ${transcriptId} not found for indexing`)
            return false
          }

          // Extract searchable content
          const content = this.extractSearchableContent(transcript)

          // Tokenize content
          const tokens = this.tokenizeContent(content)

          // Create or update search index
          await prisma.searchIndex.upsert({
            where: { transcriptId },
            create: {
              transcriptId,
              content,
              tokens,
              language: transcript.language,
            },
            update: {
              content,
              tokens,
              language: transcript.language,
              updatedAt: new Date(),
            },
          })

          console.log(
            `✅ Indexed transcript ${transcriptId} with ${tokens.length} tokens`,
          )
          return true
        },
        { transcriptId },
      )
    } catch (error) {
      console.error(`Failed to index transcript ${transcriptId}:`, error)
      return false
    }
  }

  /**
   * Batch index multiple transcripts
   * @param transcriptIds - Array of transcript IDs to index
   * @param batchSize - Number of transcripts to process at once
   * @returns Number of successfully indexed transcripts
   */
  async batchIndexTranscripts(
    transcriptIds: string[],
    batchSize: number = 10,
  ): Promise<number> {
    let successCount = 0

    console.log(
      `🔄 Starting batch indexing of ${transcriptIds.length} transcripts`,
    )

    for (let i = 0; i < transcriptIds.length; i += batchSize) {
      const batch = transcriptIds.slice(i, i + batchSize)

      const batchPromises = batch.map((id) => this.indexTranscript(id))
      const results = await Promise.allSettled(batchPromises)

      const batchSuccessCount = results.filter(
        (result) => result.status === 'fulfilled' && result.value === true,
      ).length

      successCount += batchSuccessCount

      console.log(
        `📊 Batch ${Math.floor(i / batchSize) + 1}: ${batchSuccessCount}/${batch.length} successful`,
      )

      // Small delay between batches to avoid overwhelming the database
      if (i + batchSize < transcriptIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    console.log(
      `✅ Batch indexing complete: ${successCount}/${transcriptIds.length} transcripts indexed`,
    )
    return successCount
  }

  /**
   * Index all unindexed transcripts
   * @returns Number of newly indexed transcripts
   */
  async indexAllUnindexedTranscripts(): Promise<number> {
    try {
      // Find transcripts that don't have search indexes
      const unindexedTranscripts = await prisma.transcript.findMany({
        where: {
          status: 'completed',
          searchIndex: null,
        },
        select: {
          id: true,
        },
      })

      if (unindexedTranscripts.length === 0) {
        console.log('✅ All transcripts are already indexed')
        return 0
      }

      const transcriptIds = unindexedTranscripts.map((t) => t.id)
      return await this.batchIndexTranscripts(transcriptIds)
    } catch (error) {
      console.error('Failed to index unindexed transcripts:', error)
      return 0
    }
  }

  /**
   * Reindex all transcripts (useful after algorithm changes)
   * @param batchSize - Number of transcripts to process at once
   * @returns Number of reindexed transcripts
   */
  async reindexAllTranscripts(batchSize: number = 10): Promise<number> {
    try {
      const allTranscripts = await prisma.transcript.findMany({
        where: { status: 'completed' },
        select: { id: true },
      })

      if (allTranscripts.length === 0) {
        console.log('✅ No transcripts to reindex')
        return 0
      }

      console.log(
        `🔄 Starting full reindex of ${allTranscripts.length} transcripts`,
      )

      const transcriptIds = allTranscripts.map((t) => t.id)
      return await this.batchIndexTranscripts(transcriptIds, batchSize)
    } catch (error) {
      console.error('Failed to reindex all transcripts:', error)
      return 0
    }
  }

  /**
   * Remove search index for a transcript
   * @param transcriptId - ID of the transcript
   * @returns Success status
   */
  async removeIndex(transcriptId: string): Promise<boolean> {
    try {
      await prisma.searchIndex.delete({
        where: { transcriptId },
      })

      console.log(`🗑️ Removed search index for transcript ${transcriptId}`)
      return true
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Record to delete does not exist')
      ) {
        // Index doesn't exist, which is fine
        return true
      }

      console.error(
        `Failed to remove index for transcript ${transcriptId}:`,
        error,
      )
      return false
    }
  }

  /**
   * Get search index statistics
   * @returns Search index statistics
   */
  async getIndexStats(): Promise<{
    totalIndexes: number
    indexesByLanguage: Record<string, number>
    averageTokenCount: number
    lastIndexed: Date | null
    unindexedCount: number
  }> {
    try {
      const [
        totalIndexes,
        indexesByLanguage,
        avgTokens,
        lastIndexed,
        unindexedCount,
      ] = await Promise.all([
        // Total number of indexes
        prisma.searchIndex.count(),

        // Indexes by language
        prisma.searchIndex.groupBy({
          by: ['language'],
          _count: { id: true },
        }),

        // Average token count (approximate)
        prisma.$queryRaw<[{ avg: number }]>`
          SELECT AVG(array_length(tokens, 1)) as avg 
          FROM search_index 
          WHERE tokens IS NOT NULL
        `,

        // Last indexed timestamp
        prisma.searchIndex.findFirst({
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true },
        }),

        // Count of unindexed transcripts
        prisma.transcript.count({
          where: {
            status: 'completed',
            searchIndex: null,
          },
        }),
      ])

      const languageBreakdown: Record<string, number> = {}
      for (const item of indexesByLanguage) {
        languageBreakdown[item.language] = item._count.id
      }

      return {
        totalIndexes,
        indexesByLanguage: languageBreakdown,
        averageTokenCount: Math.round((avgTokens[0]?.avg || 0) * 100) / 100,
        lastIndexed: lastIndexed?.updatedAt || null,
        unindexedCount,
      }
    } catch (error) {
      console.error('Failed to get index stats:', error)
      return {
        totalIndexes: 0,
        indexesByLanguage: {},
        averageTokenCount: 0,
        lastIndexed: null,
        unindexedCount: 0,
      }
    }
  }

  /**
   * Extract searchable content from transcript data
   * @param transcript - Transcript data
   * @returns Searchable content string
   */
  private extractSearchableContent(transcript: {
    title: string
    description: string | null
    utterances: unknown
  }): string {
    const parts: string[] = []

    // Add title (with higher weight by including it multiple times)
    parts.push(transcript.title, transcript.title, transcript.title)

    // Add description if available
    if (transcript.description) {
      parts.push(transcript.description)
    }

    // Extract text from utterances
    if (transcript.utterances && Array.isArray(transcript.utterances)) {
      const utteranceTexts = transcript.utterances
        .map((utterance: { text?: string }) => utterance.text)
        .filter((text): text is string => Boolean(text))

      parts.push(...utteranceTexts)
    }

    return parts.join(' ')
  }

  /**
   * Tokenize content for search optimization
   * @param content - Raw content to tokenize
   * @param options - Tokenization options
   * @returns Array of search tokens
   */
  private tokenizeContent(
    content: string,
    options: TokenizationOptions = DEFAULT_TOKENIZATION,
  ): string[] {
    // Convert to lowercase and split into words
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .split(/\s+/)
      .filter((word) => word.length >= options.minWordLength)

    // Remove stop words if enabled
    const filteredWords = options.removeStopWords
      ? words.filter((word) => !STOP_WORDS.has(word))
      : words

    // Remove duplicates and limit token count
    const uniqueTokens = Array.from(new Set(filteredWords))

    return uniqueTokens.slice(0, options.maxTokens)
  }
}

/**
 * Singleton search indexing service instance
 */
export const searchIndexing = new SearchIndexingService()

/**
 * Convenience functions for search indexing operations
 */
export const indexing = {
  // Index single transcript
  indexTranscript: (transcriptId: string) =>
    searchIndexing.indexTranscript(transcriptId),

  // Batch operations
  batchIndex: (transcriptIds: string[], batchSize?: number) =>
    searchIndexing.batchIndexTranscripts(transcriptIds, batchSize),

  // Index all unindexed
  indexAllUnindexed: () => searchIndexing.indexAllUnindexedTranscripts(),

  // Full reindex
  reindexAll: (batchSize?: number) =>
    searchIndexing.reindexAllTranscripts(batchSize),

  // Remove index
  removeIndex: (transcriptId: string) =>
    searchIndexing.removeIndex(transcriptId),

  // Get statistics
  getStats: () => searchIndexing.getIndexStats(),
}

export default searchIndexing
