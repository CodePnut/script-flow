/**
 * ScriptFlow Service Worker
 *
 * Provides offline functionality for the ScriptFlow application including:
 * - Caching of critical resources and API responses
 * - Offline transcript viewing capabilities
 * - Background sync for queued actions
 * - Network-first strategy with fallback to cache
 *
 * Cache Strategy:
 * - Static assets: Cache first with network fallback
 * - API responses: Network first with cache fallback
 * - Transcripts: Cache for offline viewing
 * - Images: Cache first for performance
 */

const CACHE_NAME = 'scriptflow-v1'
const STATIC_CACHE_NAME = 'scriptflow-static-v1'
const API_CACHE_NAME = 'scriptflow-api-v1'
const TRANSCRIPT_CACHE_NAME = 'scriptflow-transcripts-v1'

// Resources to cache immediately on install
const STATIC_RESOURCES = [
  '/',
  '/dashboard',
  '/transcribe',
  '/settings',
  '/_next/static/css/app/layout.css',
  '/_next/static/chunks/webpack.js',
  '/_next/static/chunks/main.js',
  '/manifest.json',
  '/script-flow-logo.png',
]

// API endpoints to cache for offline access (conservative list)
const CACHEABLE_API_ROUTES = ['/api/history']

// Maximum age for cached items (in milliseconds)
const CACHE_MAX_AGE = {
  STATIC: 7 * 24 * 60 * 60 * 1000, // 7 days
  API: 24 * 60 * 60 * 1000, // 24 hours
  TRANSCRIPTS: 30 * 24 * 60 * 60 * 1000, // 30 days
}

/**
 * Service Worker Installation
 * Pre-cache critical resources
 */
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...')

  // In development, immediately unregister to avoid interference
  if (isDevelopment()) {
    console.log('🚫 Development mode detected - unregistering service worker')
    event.waitUntil(
      self.registration.unregister().then(() => {
        console.log('✅ Service Worker unregistered in development')
      }),
    )
    return
  }

  event.waitUntil(
    Promise.all([
      // Cache static resources
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('📦 Caching static resources')
        return cache.addAll(
          STATIC_RESOURCES.map((url) => new Request(url, { cache: 'reload' })),
        )
      }),

      // Initialize other caches
      caches.open(API_CACHE_NAME),
      caches.open(TRANSCRIPT_CACHE_NAME),
    ])
      .then(() => {
        console.log('✅ Service Worker installed successfully')
        // Skip waiting to activate immediately
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('❌ Service Worker installation failed:', error)
      }),
  )
})

/**
 * Service Worker Activation
 * Clean up old caches and take control
 */
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...')

  // In development, clear all caches and unregister
  if (isDevelopment()) {
    console.log('🚫 Development mode - clearing caches and unregistering')
    event.waitUntil(
      clearAllCaches()
        .then(() => {
          console.log('✅ All caches cleared in development')
          return self.registration.unregister()
        })
        .then(() => {
          console.log('✅ Service Worker unregistered in development')
        }),
    )
    return
  }

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      cleanupOldCaches(),

      // Take control of all clients immediately
      self.clients.claim(),
    ]).then(() => {
      console.log('✅ Service Worker activated successfully')
    }),
  )
})

/**
 * Fetch Event Handler
 * Implement caching strategies based on request type
 */
self.addEventListener('fetch', (event) => {
  // In development mode, don't intercept ANY requests
  if (isDevelopment()) {
    return
  }

  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return
  }

  // Skip webpack chunks and hot reload requests - let them pass through
  if (isWebpackChunk(url) || isHotReload(url)) {
    return
  }

  // Skip external requests (YouTube, other domains) - let them pass through
  if (url.origin !== self.location.origin) {
    return
  }

  // Skip video-related requests that might interfere with playback
  if (isVideoRequest(url)) {
    return
  }

  // Route requests to appropriate handlers (production only)
  if (isStaticResource(url)) {
    event.respondWith(handleStaticResource(request))
  } else if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(request))
  } else if (isTranscriptRequest(url)) {
    event.respondWith(handleTranscriptRequest(request))
  } else if (isImageRequest(url)) {
    event.respondWith(handleImageRequest(request))
  }
  // Don't handle other requests - let them pass through naturally
})

/**
 * Background Sync Event Handler
 * Handle queued actions when connection is restored
 */
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag)

  if (event.tag === 'transcript-queue') {
    event.waitUntil(processTranscriptQueue())
  } else if (event.tag === 'analytics-queue') {
    event.waitUntil(processAnalyticsQueue())
  }
})

/**
 * Message Event Handler
 * Handle messages from the main thread
 */
self.addEventListener('message', (event) => {
  const { type, data } = event.data

  switch (type) {
    case 'CACHE_TRANSCRIPT':
      cacheTranscript(data.videoId, data.transcript)
      break
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true })
      })
      break
    case 'GET_CACHE_STATUS':
      getCacheStatus().then((status) => {
        event.ports[0].postMessage(status)
      })
      break
    default:
      console.warn('Unknown message type:', type)
  }
})

/**
 * Handle static resources (HTML, CSS, JS)
 * Strategy: Network first with cache fallback (safer for dynamic content)
 */
async function handleStaticResource(request) {
  try {
    // Always try network first to avoid stale content issues
    try {
      const networkResponse = await fetch(request)
      if (networkResponse.ok) {
        // Only cache successful responses
        const cache = await caches.open(STATIC_CACHE_NAME)
        cache.put(request, networkResponse.clone())
        return networkResponse
      }
    } catch (networkError) {
      console.log('📡 Network failed, trying cache for:', request.url)
    }

    // Fallback to cache only if network fails
    const cache = await caches.open(STATIC_CACHE_NAME)
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      return cachedResponse
    }

    // If no cache and no network, return offline response
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
    })
  } catch (error) {
    console.error('❌ Static resource handler error:', error)
    return new Response('Error', { status: 500 })
  }
}

/**
 * Handle API requests
 * Strategy: Network first with cache fallback
 */
async function handleAPIRequest(request) {
  try {
    // Try network first
    try {
      const networkResponse = await fetch(request)

      if (networkResponse.ok) {
        // Cache successful responses
        const cache = await caches.open(API_CACHE_NAME)
        cache.put(request, networkResponse.clone())
        return networkResponse
      }
    } catch (networkError) {
      console.log('📡 Network failed for API request:', request.url)
    }

    // Fallback to cache
    const cache = await caches.open(API_CACHE_NAME)
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      // Add offline header to indicate cached response
      const response = cachedResponse.clone()
      response.headers.set('X-Served-By', 'ServiceWorker-Cache')
      return response
    }

    // Return offline response
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'This content is not available offline',
        offline: true,
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('❌ API request handler error:', error)
    return new Response('Error', { status: 500 })
  }
}

/**
 * Handle transcript requests
 * Strategy: Cache first for offline viewing
 */
async function handleTranscriptRequest(request) {
  try {
    const cache = await caches.open(TRANSCRIPT_CACHE_NAME)
    const cachedResponse = await cache.match(request)

    // Return cached transcript if available
    if (
      cachedResponse &&
      !isExpired(cachedResponse, CACHE_MAX_AGE.TRANSCRIPTS)
    ) {
      return cachedResponse
    }

    // Try network for fresh content
    try {
      const networkResponse = await fetch(request)
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone())
        return networkResponse
      }
    } catch (networkError) {
      console.log('📡 Network failed for transcript:', request.url)
    }

    // Fallback to cached transcript even if expired
    return (
      cachedResponse ||
      new Response(
        JSON.stringify({
          error: 'Transcript not available offline',
          offline: true,
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    )
  } catch (error) {
    console.error('❌ Transcript request handler error:', error)
    return new Response('Error', { status: 500 })
  }
}

/**
 * Handle image requests
 * Strategy: Cache first for performance
 */
async function handleImageRequest(request) {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME)
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      return cachedResponse
    }

    try {
      const networkResponse = await fetch(request)
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone())
        return networkResponse
      }
    } catch (networkError) {
      console.log('📡 Network failed for image:', request.url)
    }

    // Return placeholder for missing images
    return new Response('', { status: 404 })
  } catch (error) {
    console.error('❌ Image request handler error:', error)
    return new Response('Error', { status: 500 })
  }
}

/**
 * Handle default requests
 * Strategy: Network only (don't interfere with unknown requests)
 */
async function handleDefaultRequest(request) {
  try {
    // For unknown requests, just pass through to network
    // Don't cache or interfere with dynamic content
    return await fetch(request)
  } catch (error) {
    console.log('📡 Network failed for:', request.url)

    // Only try cache for GET requests that might be cacheable
    if (request.method === 'GET') {
      const cacheNames = await caches.keys()
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName)
        const cachedResponse = await cache.match(request)
        if (cachedResponse) {
          return cachedResponse
        }
      }
    }

    // Re-throw the error to let the browser handle it naturally
    throw error
  }
}

/**
 * Cache a transcript for offline viewing
 */
async function cacheTranscript(videoId, transcript) {
  try {
    const cache = await caches.open(TRANSCRIPT_CACHE_NAME)
    const request = new Request(`/api/video/${videoId}`)
    const response = new Response(JSON.stringify(transcript), {
      headers: { 'Content-Type': 'application/json' },
    })

    await cache.put(request, response)
    console.log('📦 Cached transcript for offline viewing:', videoId)
  } catch (error) {
    console.error('❌ Failed to cache transcript:', error)
  }
}

/**
 * Process queued transcript requests
 */
async function processTranscriptQueue() {
  try {
    // Get queued requests from IndexedDB
    const queuedRequests = await getQueuedRequests('transcript-queue')

    for (const queuedRequest of queuedRequests) {
      try {
        const response = await fetch(queuedRequest.url, queuedRequest.options)
        if (response.ok) {
          // Remove from queue on success
          await removeFromQueue('transcript-queue', queuedRequest.id)

          // Notify main thread of success
          const clients = await self.clients.matchAll()
          clients.forEach((client) => {
            client.postMessage({
              type: 'SYNC_SUCCESS',
              data: { id: queuedRequest.id, response: response.clone() },
            })
          })
        }
      } catch (error) {
        console.error('❌ Failed to process queued request:', error)
      }
    }
  } catch (error) {
    console.error('❌ Failed to process transcript queue:', error)
  }
}

/**
 * Process queued analytics events
 */
async function processAnalyticsQueue() {
  try {
    const queuedEvents = await getQueuedRequests('analytics-queue')

    for (const event of queuedEvents) {
      try {
        const response = await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event.data),
        })

        if (response.ok) {
          await removeFromQueue('analytics-queue', event.id)
        }
      } catch (error) {
        console.error('❌ Failed to process analytics event:', error)
      }
    }
  } catch (error) {
    console.error('❌ Failed to process analytics queue:', error)
  }
}

/**
 * Clean up old caches
 */
async function cleanupOldCaches() {
  const cacheNames = await caches.keys()
  const currentCaches = [
    STATIC_CACHE_NAME,
    API_CACHE_NAME,
    TRANSCRIPT_CACHE_NAME,
  ]

  return Promise.all(
    cacheNames.map((cacheName) => {
      if (!currentCaches.includes(cacheName)) {
        console.log('🗑️ Deleting old cache:', cacheName)
        return caches.delete(cacheName)
      }
    }),
  )
}

/**
 * Clear all caches
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys()
  return Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
}

/**
 * Get cache status information
 */
async function getCacheStatus() {
  try {
    const cacheNames = await caches.keys()
    const status = {}

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName)
      const keys = await cache.keys()
      status[cacheName] = keys.length
    }

    return status
  } catch (error) {
    console.error('❌ Failed to get cache status:', error)
    return {}
  }
}

/**
 * Check if response is expired
 */
function isExpired(response, maxAge) {
  const dateHeader = response.headers.get('date')
  if (!dateHeader) return false

  const responseDate = new Date(dateHeader)
  const now = new Date()

  return now.getTime() - responseDate.getTime() > maxAge
}

/**
 * Check if we're in development mode
 */
function isDevelopment() {
  return (
    self.location.hostname === 'localhost' ||
    self.location.hostname === '127.0.0.1'
  )
}

/**
 * Check if URL is a webpack chunk (should not be cached by SW)
 */
function isWebpackChunk(url) {
  return (
    url.pathname.includes('/_next/static/chunks/') ||
    url.pathname.includes('webpack') ||
    url.searchParams.has('v') || // Versioned requests
    url.pathname.includes('.hot-update.') ||
    (isDevelopment() && url.pathname.startsWith('/_next/static/'))
  )
}

/**
 * Check if URL is a hot reload request (development)
 */
function isHotReload(url) {
  return (
    url.pathname.includes('/_next/webpack-hmr') ||
    url.pathname.includes('__webpack_hmr') ||
    url.pathname.includes('/_next/static/webpack/') ||
    url.searchParams.has('ts') || // Timestamp queries for hot reload
    url.searchParams.has('v') // Version queries
  )
}

/**
 * Check if URL is a video-related request that should not be cached
 */
function isVideoRequest(url) {
  return (
    /\.(mp4|webm|ogg|avi|mov|wmv|flv|m4v)$/i.test(url.pathname) ||
    url.pathname.includes('/video/') ||
    url.searchParams.has('videoId') ||
    url.hostname.includes('youtube') ||
    url.hostname.includes('googlevideo') ||
    url.hostname.includes('ytimg')
  )
}

/**
 * Check if URL is a static resource
 */
function isStaticResource(url) {
  return (
    (url.pathname.startsWith('/_next/') && !isWebpackChunk(url)) ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname === '/' ||
    url.pathname.startsWith('/dashboard') ||
    url.pathname.startsWith('/transcribe') ||
    url.pathname.startsWith('/settings')
  )
}

/**
 * Check if URL is an API request that should be cached
 */
function isAPIRequest(url) {
  // Only cache specific safe API routes, not all API requests
  return (
    url.origin === self.location.origin &&
    url.pathname.startsWith('/api/') &&
    CACHEABLE_API_ROUTES.some((route) => url.pathname.startsWith(route)) &&
    !url.pathname.includes('/transcribe') // Don't cache transcribe requests
  )
}

/**
 * Check if URL is a transcript request
 */
function isTranscriptRequest(url) {
  return (
    url.pathname.startsWith('/api/video/') ||
    url.pathname.startsWith('/api/transcript/')
  )
}

/**
 * Check if URL is an image request
 */
function isImageRequest(url) {
  // Only cache our own images, not external ones like YouTube thumbnails
  return (
    url.origin === self.location.origin &&
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url.pathname)
  )
}

/**
 * IndexedDB helpers for background sync queue
 */
async function getQueuedRequests(queueName) {
  // Simplified implementation - in a real app, you'd use IndexedDB
  return []
}

async function removeFromQueue(queueName, id) {
  // Simplified implementation - in a real app, you'd use IndexedDB
  return true
}
