/**
 * Service Worker Disabler
 *
 * This service worker immediately unregisters itself and clears all caches.
 * Use this to completely disable service worker functionality.
 */

console.log('🚫 Service Worker Disabler - Unregistering immediately')

// Immediately unregister this service worker
self.registration.unregister().then(() => {
  console.log('✅ Service Worker unregistered successfully')
})

// Clear all caches
caches
  .keys()
  .then((cacheNames) => {
    return Promise.all(
      cacheNames.map((cacheName) => {
        console.log('🗑️ Deleting cache:', cacheName)
        return caches.delete(cacheName)
      }),
    )
  })
  .then(() => {
    console.log('✅ All caches cleared')
  })

// Don't handle any fetch events
self.addEventListener('fetch', (event) => {
  // Let all requests pass through without any interference
  return
})

self.addEventListener('install', (event) => {
  console.log('🚫 Service Worker Disabler installed - skipping waiting')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log(
    '🚫 Service Worker Disabler activated - claiming clients and unregistering',
  )
  event.waitUntil(
    Promise.all([self.clients.claim(), self.registration.unregister()]),
  )
})
