/**
 * Service Worker Manager
 *
 * Handles service worker registration, communication, and lifecycle management
 * for the ScriptFlow application's offline functionality.
 *
 * Features:
 * - Service worker registration and updates
 * - Communication with service worker
 * - Offline status detection
 * - Background sync management
 * - Cache management utilities
 */

/**
 * Service worker registration status
 */
export type ServiceWorkerStatus =
  | 'unsupported'
  | 'registering'
  | 'registered'
  | 'updating'
  | 'updated'
  | 'error'

/**
 * Background sync queue types
 */
export type SyncQueueType = 'transcript-queue' | 'analytics-queue'

/**
 * Service worker message types
 */
export interface ServiceWorkerMessage {
  type: 'CACHE_TRANSCRIPT' | 'CLEAR_CACHE' | 'GET_CACHE_STATUS'
  data?: unknown
}

/**
 * Cache status information
 */
export interface CacheStatus {
  [cacheName: string]: number
}

/**
 * Service worker manager class
 */
class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null
  private status: ServiceWorkerStatus = 'unsupported'
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map()
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
  private syncQueues: Map<SyncQueueType, unknown[]> = new Map()

  constructor() {
    // Initialize sync queues
    this.syncQueues.set('transcript-queue', [])
    this.syncQueues.set('analytics-queue', [])

    // Only initialize browser APIs on client side
    if (typeof window !== 'undefined') {
      // Listen for online/offline events
      window.addEventListener('online', this.handleOnline.bind(this))
      window.addEventListener('offline', this.handleOffline.bind(this))

      // Listen for service worker messages
      navigator.serviceWorker?.addEventListener(
        'message',
        this.handleMessage.bind(this),
      )
    }
  }

  /**
   * Register the service worker
   */
  async register(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) {
      console.warn('🚫 Service Worker not supported')
      this.setStatus('unsupported')
      return null
    }

    try {
      this.setStatus('registering')
      console.log('🔧 Registering Service Worker...')

      // In development, register the disabler service worker to clear any existing ones
      const swFile =
        process.env.NODE_ENV === 'development' ? '/sw-disable.js' : '/sw.js'
      this.registration = await navigator.serviceWorker.register(swFile, {
        scope: '/',
      })

      this.setStatus('registered')
      console.log('✅ Service Worker registered successfully')

      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        this.handleUpdate()
      })

      // Check for existing service worker
      if (this.registration.active) {
        console.log('🔄 Service Worker already active')
      }

      return this.registration
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error)
      this.setStatus('error')
      return null
    }
  }

  /**
   * Unregister the service worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false
    }

    try {
      const result = await this.registration.unregister()
      console.log('🗑️ Service Worker unregistered:', result)
      this.registration = null
      this.setStatus('unsupported')
      return result
    } catch (error) {
      console.error('❌ Service Worker unregistration failed:', error)
      return false
    }
  }

  /**
   * Send message to service worker
   */
  async sendMessage(message: ServiceWorkerMessage): Promise<unknown> {
    if (!this.registration?.active) {
      throw new Error('Service Worker not active')
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel()

      messageChannel.port1.onmessage = (event) => {
        resolve(event.data)
      }

      messageChannel.port1.onmessageerror = (error) => {
        reject(error)
      }

      this.registration!.active!.postMessage(message, [messageChannel.port2])
    })
  }

  /**
   * Cache a transcript for offline viewing
   */
  async cacheTranscript(videoId: string, transcript: unknown): Promise<void> {
    try {
      await this.sendMessage({
        type: 'CACHE_TRANSCRIPT',
        data: { videoId, transcript },
      })
      console.log('📦 Transcript cached for offline viewing:', videoId)
    } catch (error) {
      console.error('❌ Failed to cache transcript:', error)
    }
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<boolean> {
    try {
      const result = await this.sendMessage({ type: 'CLEAR_CACHE' })
      console.log('🗑️ All caches cleared')
      return Boolean(result)
    } catch (error) {
      console.error('❌ Failed to clear cache:', error)
      return false
    }
  }

  /**
   * Get cache status
   */
  async getCacheStatus(): Promise<CacheStatus> {
    try {
      const status = await this.sendMessage({ type: 'GET_CACHE_STATUS' })
      return status as CacheStatus
    } catch (error) {
      console.error('❌ Failed to get cache status:', error)
      return {}
    }
  }

  /**
   * Queue an action for background sync
   */
  async queueForSync(queueType: SyncQueueType, data: unknown): Promise<void> {
    const queue = this.syncQueues.get(queueType) || []
    queue.push(data)
    this.syncQueues.set(queueType, queue)

    // Try to register background sync if online
    if (this.isOnline && this.registration) {
      try {
        await (
          this.registration as ServiceWorkerRegistration & {
            sync: { register: (tag: string) => Promise<void> }
          }
        ).sync.register(queueType)
        console.log('🔄 Background sync registered:', queueType)
      } catch (error) {
        console.error('❌ Failed to register background sync:', error)
      }
    }
  }

  /**
   * Check if service worker is supported
   */
  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serviceWorker' in navigator
  }

  /**
   * Get current registration status
   */
  getStatus(): ServiceWorkerStatus {
    return this.status
  }

  /**
   * Check if currently online
   */
  getOnlineStatus(): boolean {
    return this.isOnline
  }

  /**
   * Add event listener
   */
  addEventListener(
    event: string,
    listener: (...args: unknown[]) => void,
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)
  }

  /**
   * Remove event listener
   */
  removeEventListener(
    event: string,
    listener: (...args: unknown[]) => void,
  ): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.delete(listener)
    }
  }

  /**
   * Handle service worker updates
   */
  private handleUpdate(): void {
    this.setStatus('updating')
    console.log('🔄 Service Worker update found')

    const newWorker = this.registration!.installing
    if (newWorker) {
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          this.setStatus('updated')
          console.log('✅ Service Worker updated')
          this.emit('update-available')
        }
      })
    }
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    console.log('🌐 Connection restored')
    this.isOnline = true
    this.emit('online')

    // Process queued sync requests
    this.processQueuedSyncs()
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    console.log('📡 Connection lost')
    this.isOnline = false
    this.emit('offline')
  }

  /**
   * Handle messages from service worker
   */
  private handleMessage(event: MessageEvent): void {
    const { type, data } = event.data

    switch (type) {
      case 'SYNC_SUCCESS':
        this.emit('sync-success', data)
        break
      case 'CACHE_UPDATED':
        this.emit('cache-updated', data)
        break
      default:
        console.log('📨 Service Worker message:', type, data)
    }
  }

  /**
   * Process queued background syncs
   */
  private async processQueuedSyncs(): Promise<void> {
    if (!this.registration) return

    for (const [queueType] of this.syncQueues) {
      try {
        await (
          this.registration as ServiceWorkerRegistration & {
            sync: { register: (tag: string) => Promise<void> }
          }
        ).sync.register(queueType)
        console.log('🔄 Processing queued sync:', queueType)
      } catch (error) {
        console.error('❌ Failed to process queued sync:', error)
      }
    }
  }

  /**
   * Set status and emit event
   */
  private setStatus(status: ServiceWorkerStatus): void {
    this.status = status
    this.emit('status-change', status)
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data?: unknown): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.forEach((listener) => {
        try {
          listener(data)
        } catch (error) {
          console.error('❌ Event listener error:', error)
        }
      })
    }
  }
}

/**
 * Singleton service worker manager instance
 */
export const serviceWorkerManager = new ServiceWorkerManager()

/**
 * Initialize service worker
 */
export async function initializeServiceWorker(): Promise<void> {
  if (typeof window === 'undefined') {
    return // Skip on server side
  }

  // COMPLETELY DISABLE service worker for now to fix thumbnail issues
  console.log('🚫 Service Worker completely disabled to fix thumbnail loading')

  // Force unregister any existing service workers
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (const registration of registrations) {
        await registration.unregister()
        console.log('🗑️ Unregistered service worker:', registration.scope)
      }

      // Clear all caches
      const cacheNames = await caches.keys()
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName)
        console.log('🗑️ Deleted cache:', cacheName)
      }
    } catch (error) {
      console.error('Error clearing service workers:', error)
    }
  }

  return
}

/**
 * Convenience functions for common operations
 */
export const serviceWorker = {
  // Registration
  register: () => serviceWorkerManager.register(),
  unregister: () => serviceWorkerManager.unregister(),

  // Status
  isSupported: () => serviceWorkerManager.isSupported(),
  getStatus: () => serviceWorkerManager.getStatus(),
  isOnline: () => serviceWorkerManager.getOnlineStatus(),

  // Caching
  cacheTranscript: (videoId: string, transcript: unknown) =>
    serviceWorkerManager.cacheTranscript(videoId, transcript),
  clearCache: () => serviceWorkerManager.clearCache(),
  getCacheStatus: () => serviceWorkerManager.getCacheStatus(),

  // Background sync
  queueForSync: (queueType: SyncQueueType, data: unknown) =>
    serviceWorkerManager.queueForSync(queueType, data),

  // Events
  addEventListener: (event: string, listener: (...args: unknown[]) => void) =>
    serviceWorkerManager.addEventListener(event, listener),
  removeEventListener: (
    event: string,
    listener: (...args: unknown[]) => void,
  ) => serviceWorkerManager.removeEventListener(event, listener),
}

export default serviceWorkerManager
