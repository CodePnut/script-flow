import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AISummaryService } from '@/lib/ai-summary'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    transcript: {
      findUnique: vi.fn(),
    },
  },
}))

describe('AISummaryService', () => {
  let aiSummaryService: AISummaryService
  let mockPrisma: any

  beforeEach(async () => {
    vi.clearAllMocks()
    aiSummaryService = new AISummaryService()
    mockPrisma = (await import('@/lib/prisma')).prisma
  })

  describe('generateSummary', () => {
    it('should generate detailed summary by default', async () => {
      const mockTranscript = {
        utterances: [
          {
            text: 'Welcome to this video about artificial intelligence.',
            start: 0,
            end: 5,
          },
          {
            text: 'Today we will discuss machine learning algorithms.',
            start: 5,
            end: 10,
          },
          { text: 'Machine learning is a subset of AI.', start: 10, end: 15 },
          { text: 'Let me show you some examples.', start: 15, end: 20 },
          { text: 'This concludes our discussion on AI.', start: 20, end: 25 },
        ],
        title: 'AI Introduction',
        duration: 25,
        language: 'en',
      }

      mockPrisma.transcript.findUnique.mockResolvedValue(mockTranscript)

      const result = await aiSummaryService.generateSummary('test-id')

      expect(result).toBeDefined()
      expect(result.style).toBe('detailed')
      expect(result.summary).toContain('Welcome')
      expect(result.topics.length).toBeGreaterThan(0)
      expect(result.keyPoints.length).toBeGreaterThan(0)
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('should generate brief summary when requested', async () => {
      const mockTranscript = {
        utterances: [
          { text: 'Hello and welcome to this tutorial.', start: 0, end: 3 },
          { text: 'We will learn about React hooks today.', start: 3, end: 8 },
          {
            text: 'Hooks are functions that let you use state.',
            start: 8,
            end: 12,
          },
          {
            text: 'That concludes our React hooks tutorial.',
            start: 12,
            end: 15,
          },
        ],
        title: 'React Hooks Tutorial',
        duration: 15,
        language: 'en',
      }

      mockPrisma.transcript.findUnique.mockResolvedValue(mockTranscript)

      const result = await aiSummaryService.generateSummary('test-id', {
        style: 'brief',
      })

      expect(result.style).toBe('brief')
      expect(result.summary.split('.').length).toBeLessThanOrEqual(3)
    })

    it('should handle empty transcript gracefully', async () => {
      const mockTranscript = {
        utterances: [],
        title: 'Empty Video',
        duration: 0,
        language: 'en',
      }

      mockPrisma.transcript.findUnique.mockResolvedValue(mockTranscript)

      await expect(aiSummaryService.generateSummary('test-id')).rejects.toThrow(
        'No transcript content available',
      )
    })

    it('should extract topics from transcript content', async () => {
      const mockTranscript = {
        utterances: [
          { text: 'This is an introduction to the topic.', start: 0, end: 3 },
          {
            text: 'The main content focuses on important concepts.',
            start: 3,
            end: 8,
          },
          {
            text: 'Here is an example of what we discussed.',
            start: 8,
            end: 12,
          },
          {
            text: 'In conclusion, this was very informative.',
            start: 12,
            end: 15,
          },
        ],
        title: 'Topic Extraction Test',
        duration: 15,
        language: 'en',
      }

      mockPrisma.transcript.findUnique.mockResolvedValue(mockTranscript)

      const result = await aiSummaryService.generateSummary('test-id')

      expect(result.topics).toContain('introduction')
      expect(result.topics).toContain('main_content')
      expect(result.topics).toContain('examples')
      expect(result.topics).toContain('conclusion')
    })

    it('should generate different summary styles', async () => {
      const mockTranscript = {
        utterances: [
          { text: 'Welcome to this business presentation.', start: 0, end: 3 },
          { text: 'We will discuss quarterly results.', start: 3, end: 8 },
          { text: 'Our revenue increased by 15%.', start: 8, end: 12 },
          { text: 'Thank you for your attention.', start: 12, end: 15 },
        ],
        title: 'Business Presentation',
        duration: 15,
        language: 'en',
      }

      mockPrisma.transcript.findUnique.mockResolvedValue(mockTranscript)

      const styles = ['brief', 'detailed', 'executive', 'educational'] as const

      for (const style of styles) {
        const result = await aiSummaryService.generateSummary('test-id', {
          style,
        })
        expect(result.style).toBe(style)
        expect(result.summary).toBeDefined()
        expect(result.summary.length).toBeGreaterThan(0)
      }
    })
  })
})
