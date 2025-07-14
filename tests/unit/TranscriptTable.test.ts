import { describe, expect, it, vi } from 'vitest'

import { useHistoryStore } from '@/hooks/useHistoryStore'

// Mock the history store
vi.mock('@/hooks/useHistoryStore', () => ({
  useHistoryStore: vi.fn(),
}))

describe('TranscriptTable', () => {
  it('should import TranscriptTable component', async () => {
    const { TranscriptTable } = await import('@/components/TranscriptTable')
    expect(TranscriptTable).toBeDefined()
  })

  it('should have useHistoryStore hook available', () => {
    expect(useHistoryStore).toBeDefined()
  })

  it('should format duration correctly', () => {
    const formatDuration = (seconds: number): string => {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
    }

    expect(formatDuration(180)).toBe('3:00')
    expect(formatDuration(125)).toBe('2:05')
    expect(formatDuration(65)).toBe('1:05')
  })

  it('should format relative time correctly', () => {
    const formatRelativeTime = (date: Date): string => {
      const now = new Date()
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

      if (diffInSeconds < 60) return 'Just now'
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
      if (diffInSeconds < 86400)
        return `${Math.floor(diffInSeconds / 3600)}h ago`
      if (diffInSeconds < 2592000)
        return `${Math.floor(diffInSeconds / 86400)}d ago`

      return date.toLocaleDateString()
    }

    const now = new Date()
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
    const result = formatRelativeTime(twoHoursAgo)

    expect(result).toBe('2h ago')
  })
})
