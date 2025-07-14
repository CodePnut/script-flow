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
}

/**
 * Zustand store for managing video transcription history
 *
 * Features:
 * - Persistent storage in localStorage
 * - Automatic timestamp generation
 * - Automatic ID generation using cuid2
 * - Recent videos retrieval with configurable limit
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
    }),
    {
      name: 'script-flow-history', // localStorage key
      // Only persist the history array, not the functions
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
