/**
 * Offline Queue Manager
 *
 * Manages queued actions when the application is offline, including
 * transcription requests, analytics events, and other user actions.
 *
 * Features:
 * - Queue management with IndexedDB persistence
 * - Automatic retry when connection is restored
 * - Queue status monitoring and reporting
 * - Priority-based queue processing
 * - Error handling and retry logic
 */

import { serviceWorker, type SyncQueueType } from './service-worker'

/**
 * Queue item interface
 */
export interface QueueItem {
  id: string
  type: 'transcription' | 'analytics' | 'user-action'
  priority: 'high' | 'medium' | 'low'
  data: unknown
  url?: string
  method?: string
  headers?: Record<string, string>
  timestamp: number
  retryCount: number
  maxRetries: number
}

/**
 * Queue status information
 */
export interface QueueStatus {
  totalItems: number
  pendingItems: number
  failedItems: number
  lastProcessed: Date | null
  isProcessing: boolean
}

/**
 * Offline queue manager class
 */
class OfflineQueueManager {
  private dbName = 'scriptflow-offline-queue'
  private dbVersion = 1
  private db: IDBDatabase | null = null
  private isProcessing = false
  private processingPromise: Promise<void> | null = null

  constructor() {
    // Only initialize on client side
    if (typeof window !== 'undefined') {
      // Initialize DB asynchronously
      this.initializeDB().catch((error) => {
        console.error('❌ Failed to initialize IndexedDB:', error)
      })

      // Listen for online events to process queue
      serviceWorker.addEventListener('online', this.processQueue.bind(this))
    }
  }

  /**
   * Initialize IndexedDB for queue persistence
   */
  private async initializeDB(): Promise<void> {
    if (typeof indexedDB === 'undefined') {
      throw new Error('IndexedDB not available')
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        console.error('❌ Failed to open IndexedDB:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('✅ IndexedDB initialized for offline queue')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create queue store
        if (!db.objectStoreNames.contains('queue')) {
          const queueStore = db.createObjectStore('queue', { keyPath: 'id' })
          queueStore.createIndex('type', 'type', { unique: false })
          queueStore.createIndex('priority', 'priority', { unique: false })
          queueStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        console.log('🔧 IndexedDB schema updated for offline queue')
      }
    })
  }

  /**
   * Add item to the offline queue
   */
  async addToQueue(
    item: Omit<QueueItem, 'id' | 'timestamp' | 'retryCount'>,
  ): Promise<string> {
    if (!this.db) {
      await this.initializeDB()
    }

    const queueItem: QueueItem = {
      ...item,
      id: this.generateId(),
      timestamp: Date.now(),
      retryCount: 0,
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction(['queue'], 'readwrite')
      const store = transaction.objectStore('queue')
      const request = store.add(queueItem)

      request.onsuccess = () => {
        console.log('📝 Added item to offline queue:', queueItem.id)
        resolve(queueItem.id)

        // Register for background sync if supported
        this.registerBackgroundSync(queueItem.type).catch((error) => {
          console.error('❌ Failed to register background sync:', error)
        })
      }

      request.onerror = () => {
        console.error('❌ Failed to add item to queue:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Remove item from the queue
   */
  async removeFromQueue(id: string): Promise<boolean> {
    if (!this.db) return false

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['queue'], 'readwrite')
      const store = transaction.objectStore('queue')
      const request = store.delete(id)

      request.onsuccess = () => {
        console.log('🗑️ Removed item from queue:', id)
        resolve(true)
      }

      request.onerror = () => {
        console.error('❌ Failed to remove item from queue:', request.error)
        resolve(false)
      }
    })
  }

  /**
   * Get all items from the queue
   */
  async getQueueItems(): Promise<QueueItem[]> {
    if (!this.db) {
      await this.initializeDB()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction(['queue'], 'readonly')
      const store = transaction.objectStore('queue')
      const request = store.getAll()

      request.onsuccess = () => {
        resolve(request.result || [])
      }

      request.onerror = () => {
        console.error('❌ Failed to get queue items:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get queue status information
   */
  async getQueueStatus(): Promise<QueueStatus> {
    try {
      const items = await this.getQueueItems()
      const failedItems = items.filter(
        (item) => item.retryCount >= item.maxRetries,
      )

      return {
        totalItems: items.length,
        pendingItems: items.length - failedItems.length,
        failedItems: failedItems.length,
        lastProcessed:
          items.length > 0
            ? new Date(Math.max(...items.map((item) => item.timestamp)))
            : null,
        isProcessing: this.isProcessing,
      }
    } catch (error) {
      console.error('❌ Failed to get queue status:', error)
      return {
        totalItems: 0,
        pendingItems: 0,
        failedItems: 0,
        lastProcessed: null,
        isProcessing: false,
      }
    }
  }

  /**
   * Process the offline queue
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return this.processingPromise || Promise.resolve()
    }

    this.isProcessing = true
    console.log('🔄 Processing offline queue...')

    this.processingPromise = this.doProcessQueue()

    try {
      await this.processingPromise
    } finally {
      this.isProcessing = false
      this.processingPromise = null
    }
  }

  /**
   * Clear all items from the queue
   */
  async clearQueue(): Promise<boolean> {
    if (!this.db) {
      try {
        await this.initializeDB()
      } catch (error) {
        console.error('❌ Failed to initialize DB for clearing:', error)
        return false
      }
    }

    return new Promise((resolve) => {
      if (!this.db) {
        resolve(false)
        return
      }

      const transaction = this.db.transaction(['queue'], 'readwrite')
      const store = transaction.objectStore('queue')
      const request = store.clear()

      request.onsuccess = () => {
        console.log('🗑️ Cleared offline queue')
        resolve(true)
      }

      request.onerror = () => {
        console.error('❌ Failed to clear queue:', request.error)
        resolve(false)
      }
    })
  }

  /**
   * Queue a transcription request for offline processing
   */
  async queueTranscription(youtubeUrl: string): Promise<string> {
    return this.addToQueue({
      type: 'transcription',
      priority: 'high',
      data: { youtubeUrl },
      url: '/api/transcribe',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      maxRetries: 3,
    })
  }

  /**
   * Queue an analytics event for offline processing
   */
  async queueAnalytics(eventData: unknown): Promise<string> {
    return this.addToQueue({
      type: 'analytics',
      priority: 'low',
      data: eventData,
      url: '/api/analytics',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      maxRetries: 5,
    })
  }

  /**
   * Queue a user action for offline processing
   */
  async queueUserAction(
    actionData: unknown,
    url: string,
    method = 'POST',
  ): Promise<string> {
    return this.addToQueue({
      type: 'user-action',
      priority: 'medium',
      data: actionData,
      url,
      method,
      headers: { 'Content-Type': 'application/json' },
      maxRetries: 3,
    })
  }

  /**
   * Actually process the queue items
   */
  private async doProcessQueue(): Promise<void> {
    try {
      const items = await this.getQueueItems()

      if (items.length === 0) {
        console.log('✅ Queue is empty')
        return
      }

      // Sort by priority and timestamp
      const sortedItems = items.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        const priorityDiff =
          priorityOrder[b.priority] - priorityOrder[a.priority]
        return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp
      })

      console.log(`🔄 Processing ${sortedItems.length} queued items`)

      for (const item of sortedItems) {
        await this.processQueueItem(item)
      }

      console.log('✅ Queue processing completed')
    } catch (error) {
      console.error('❌ Queue processing failed:', error)
    }
  }

  /**
   * Process a single queue item
   */
  private async processQueueItem(item: QueueItem): Promise<void> {
    try {
      if (item.retryCount >= item.maxRetries) {
        console.warn('⚠️ Max retries reached for item:', item.id)
        return
      }

      console.log(`🔄 Processing queue item: ${item.id} (${item.type})`)

      // Make the network request
      const response = await fetch(item.url!, {
        method: item.method || 'POST',
        headers: item.headers || {},
        body: JSON.stringify(item.data),
      })

      if (response.ok) {
        // Success - remove from queue
        await this.removeFromQueue(item.id)
        console.log(`✅ Successfully processed queue item: ${item.id}`)
      } else {
        // HTTP error - increment retry count
        await this.incrementRetryCount(item.id)
        console.warn(
          `⚠️ HTTP error for queue item ${item.id}:`,
          response.status,
        )
      }
    } catch (error) {
      // Network error - increment retry count
      await this.incrementRetryCount(item.id)
      console.error(`❌ Network error for queue item ${item.id}:`, error)
    }
  }

  /**
   * Increment retry count for a queue item
   */
  private async incrementRetryCount(id: string): Promise<void> {
    if (!this.db) return

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['queue'], 'readwrite')
      const store = transaction.objectStore('queue')
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const item = getRequest.result
        if (item) {
          item.retryCount++
          const putRequest = store.put(item)

          putRequest.onsuccess = () => {
            console.log(
              `🔄 Incremented retry count for item ${id}: ${item.retryCount}`,
            )
            resolve()
          }

          putRequest.onerror = () => {
            console.error('❌ Failed to update retry count:', putRequest.error)
            resolve()
          }
        } else {
          resolve()
        }
      }

      getRequest.onerror = () => {
        console.error(
          '❌ Failed to get item for retry update:',
          getRequest.error,
        )
        resolve()
      }
    })
  }

  /**
   * Register background sync for queue type
   */
  private async registerBackgroundSync(type: QueueItem['type']): Promise<void> {
    const syncQueueType: SyncQueueType =
      type === 'transcription' ? 'transcript-queue' : 'analytics-queue'

    try {
      await serviceWorker.queueForSync(syncQueueType, { type })
    } catch (error) {
      console.error('❌ Failed to register background sync:', error)
    }
  }

  /**
   * Generate unique ID for queue items
   */
  private generateId(): string {
    return `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Singleton offline queue manager instance
 */
export const offlineQueue = new OfflineQueueManager()

/**
 * Convenience functions for common queue operations
 */
export const queue = {
  // Queue management
  add: (item: Omit<QueueItem, 'id' | 'timestamp' | 'retryCount'>) =>
    offlineQueue.addToQueue(item),
  remove: (id: string) => offlineQueue.removeFromQueue(id),
  clear: () => offlineQueue.clearQueue(),
  process: () => offlineQueue.processQueue(),

  // Status
  getStatus: () => offlineQueue.getQueueStatus(),
  getItems: () => offlineQueue.getQueueItems(),

  // Specific actions
  queueTranscription: (youtubeUrl: string) =>
    offlineQueue.queueTranscription(youtubeUrl),
  queueAnalytics: (eventData: unknown) =>
    offlineQueue.queueAnalytics(eventData),
  queueUserAction: (actionData: unknown, url: string, method?: string) =>
    offlineQueue.queueUserAction(actionData, url, method),
}

export default offlineQueue
