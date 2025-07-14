'use client'

import { createId } from '@paralleldrive/cuid2'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Video history item interface
 * Stores essential information about transcribed videos
 */
export interface VideoHistoryItem {
  id: string // Unique identifier (cuid2)
  videoId: string // YouTube video ID
  title: string // Video title
  url: string // Original YouTube URL
  createdAt: Date // Timestamp when transcription was initiated
}

/**
 * History store state interface
 */
interface HistoryState {
  history: VideoHistoryItem[]
  addToHistory: (item: Omit<VideoHistoryItem, 'id' | 'createdAt'>) => void
  removeFromHistory: (id: string) => void
  clearHistory: () => void
  getRecentVideos: (limit?: number) => VideoHistoryItem[]
  clearAllHistory: () => void
  exportHistory: () => string
  getHistoryStats: () => {
    totalVideos: number
    totalDuration: number
    averageDuration: number
    oldestVideo: Date | null
    newestVideo: Date | null
  }
}

/**
 * Zustand store for managing video transcription history
 *
 * Features:
 * - Persistent storage in localStorage
 * - Automatic timestamp generation
 * - Automatic ID generation using cuid2
 * - Recent videos retrieval with configurable limit
 * - Bulk operations and data export
 * - Usage statistics
 * - Type-safe operations
 */
export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      history: [],

      /**
       * Add a new video to history
       * Automatically generates ID and timestamp
       */
      addToHistory: (item) => {
        const newItem: VideoHistoryItem = {
          ...item,
          id: createId(),
          createdAt: new Date(),
        }

        set((state) => ({
          history: [newItem, ...state.history], // Add to beginning for newest-first order
        }))
      },

      /**
       * Remove a video from history by ID
       */
      removeFromHistory: (id) => {
        set((state) => ({
          history: state.history.filter((item) => item.id !== id),
        }))
      },

      /**
       * Clear all history
       */
      clearHistory: () => {
        set({ history: [] })
      },

      /**
       * Get recent videos with optional limit
       * @param limit - Maximum number of videos to return (default: 5)
       */
      getRecentVideos: (limit = 5) => {
        const { history } = get()
        return history.slice(0, limit)
      },

      /**
       * Clear all history (alias for clearHistory for consistency)
       */
      clearAllHistory: () => {
        set({ history: [] })
      },

      /**
       * Export history as JSON string
       * @returns JSON string of all history items
       */
      exportHistory: () => {
        const { history } = get()
        return JSON.stringify(history, null, 2)
      },

      /**
       * Get usage statistics about the history
       * @returns Object with various stats about the history
       */
      getHistoryStats: () => {
        const { history } = get()

        if (history.length === 0) {
          return {
            totalVideos: 0,
            totalDuration: 0,
            averageDuration: 0,
            oldestVideo: null,
            newestVideo: null,
          }
        }

        // Calculate total and average duration (estimate 3 minutes per video average)
        const totalDuration = history.length * 3 * 60 // 3 minutes in seconds
        const averageDuration = totalDuration / history.length

        // Find oldest and newest videos
        const sortedByDate = [...history].sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
        )
        const oldestVideo = sortedByDate[0]?.createdAt || null
        const newestVideo =
          sortedByDate[sortedByDate.length - 1]?.createdAt || null

        return {
          totalVideos: history.length,
          totalDuration,
          averageDuration,
          oldestVideo,
          newestVideo,
        }
      },
    }),
    {
      name: 'script-flow-history', // localStorage key
      partialize: (state) => ({ history: state.history }),
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      onRehydrateStorage: (_state) => {
        return (rehydratedState, error) => {
          if (!error && rehydratedState?.history) {
            rehydratedState.history = rehydratedState.history.map((item) => ({
              ...item,
              createdAt: new Date(item.createdAt),
            }))
          }
        }
      },
    },
  ),
)
