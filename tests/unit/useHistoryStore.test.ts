import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useHistoryStore } from '@/hooks/useHistoryStore'
import type { VideoHistoryItem } from '@/hooks/useHistoryStore'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

// Mock cuid2
vi.mock('@paralleldrive/cuid2', () => ({
  createId: () => 'test-id-' + Math.random().toString(36).substr(2, 9),
}))

describe('useHistoryStore', () => {
  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks()

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    })

    // Reset store state
    useHistoryStore.setState({ history: [] })
  })

  it('initializes with empty history', () => {
    const store = useHistoryStore.getState()
    expect(store.history).toEqual([])
  })

  it('adds video to history', () => {
    const store = useHistoryStore.getState()
    const videoData = {
      videoId: 'dQw4w9WgXcQ',
      title: 'Test Video',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    }

    store.addToHistory(videoData)

    const updatedStore = useHistoryStore.getState()
    expect(updatedStore.history).toHaveLength(1)
    expect(updatedStore.history[0]).toMatchObject(videoData)
    expect(updatedStore.history[0]).toHaveProperty('id')
    expect(updatedStore.history[0]).toHaveProperty('createdAt')
  })

  it('adds multiple videos in correct order (newest first)', () => {
    const store = useHistoryStore.getState()

    const video1 = {
      videoId: 'video1',
      title: 'First Video',
      url: 'https://www.youtube.com/watch?v=video1',
    }

    const video2 = {
      videoId: 'video2',
      title: 'Second Video',
      url: 'https://www.youtube.com/watch?v=video2',
    }

    store.addToHistory(video1)
    store.addToHistory(video2)

    const updatedStore = useHistoryStore.getState()
    expect(updatedStore.history).toHaveLength(2)
    expect(updatedStore.history[0].videoId).toBe('video2') // Newest first
    expect(updatedStore.history[1].videoId).toBe('video1') // Oldest last
  })

  it('removes video from history by ID', () => {
    const store = useHistoryStore.getState()

    const videoData = {
      videoId: 'dQw4w9WgXcQ',
      title: 'Test Video',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    }

    store.addToHistory(videoData)

    const updatedStore = useHistoryStore.getState()
    const videoId = updatedStore.history[0].id

    store.removeFromHistory(videoId)

    const finalStore = useHistoryStore.getState()
    expect(finalStore.history).toHaveLength(0)
  })

  it('clears all history', () => {
    const store = useHistoryStore.getState()

    // Add multiple videos
    store.addToHistory({
      videoId: 'video1',
      title: 'First Video',
      url: 'https://www.youtube.com/watch?v=video1',
    })

    store.addToHistory({
      videoId: 'video2',
      title: 'Second Video',
      url: 'https://www.youtube.com/watch?v=video2',
    })

    expect(useHistoryStore.getState().history).toHaveLength(2)

    store.clearHistory()

    expect(useHistoryStore.getState().history).toHaveLength(0)
  })

  it('getRecentVideos returns correct number of videos', () => {
    const store = useHistoryStore.getState()

    // Add 7 videos
    for (let i = 1; i <= 7; i++) {
      store.addToHistory({
        videoId: `video${i}`,
        title: `Video ${i}`,
        url: `https://www.youtube.com/watch?v=video${i}`,
      })
    }

    // Default limit should be 5
    const recentVideos = store.getRecentVideos()
    expect(recentVideos).toHaveLength(5)

    // Custom limit
    const recentVideosCustom = store.getRecentVideos(3)
    expect(recentVideosCustom).toHaveLength(3)

    // Limit larger than available
    const recentVideosLarge = store.getRecentVideos(10)
    expect(recentVideosLarge).toHaveLength(7)
  })

  it('getRecentVideos returns videos in correct order (newest first)', () => {
    const store = useHistoryStore.getState()

    const videos = [
      {
        videoId: 'video1',
        title: 'First Video',
        url: 'https://www.youtube.com/watch?v=video1',
      },
      {
        videoId: 'video2',
        title: 'Second Video',
        url: 'https://www.youtube.com/watch?v=video2',
      },
      {
        videoId: 'video3',
        title: 'Third Video',
        url: 'https://www.youtube.com/watch?v=video3',
      },
    ]

    // Add videos in order
    videos.forEach((video) => store.addToHistory(video))

    const recentVideos = store.getRecentVideos()

    // Should be in reverse order (newest first)
    expect(recentVideos[0].videoId).toBe('video3')
    expect(recentVideos[1].videoId).toBe('video2')
    expect(recentVideos[2].videoId).toBe('video1')
  })

  it('generates unique IDs for each video', () => {
    const store = useHistoryStore.getState()

    const videoData = {
      videoId: 'dQw4w9WgXcQ',
      title: 'Test Video',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    }

    store.addToHistory(videoData)
    store.addToHistory(videoData) // Add same video again

    const updatedStore = useHistoryStore.getState()
    expect(updatedStore.history).toHaveLength(2)

    const [first, second] = updatedStore.history
    expect(first.id).not.toBe(second.id)
  })

  it('sets creation timestamps', () => {
    const store = useHistoryStore.getState()

    const videoData = {
      videoId: 'dQw4w9WgXcQ',
      title: 'Test Video',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    }

    const beforeAdd = new Date()
    store.addToHistory(videoData)
    const afterAdd = new Date()

    const updatedStore = useHistoryStore.getState()
    const createdAt = updatedStore.history[0].createdAt

    expect(createdAt).toBeInstanceOf(Date)
    expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeAdd.getTime())
    expect(createdAt.getTime()).toBeLessThanOrEqual(afterAdd.getTime())
  })

  it('handles empty history gracefully', () => {
    const store = useHistoryStore.getState()

    expect(store.getRecentVideos()).toEqual([])
    expect(store.getRecentVideos(10)).toEqual([])

    // Should not throw when removing from empty history
    expect(() => store.removeFromHistory('non-existent-id')).not.toThrow()

    // Should not throw when clearing empty history
    expect(() => store.clearHistory()).not.toThrow()
  })
})
