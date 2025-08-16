/**
 * Clear Service Worker Script
 *
 * This script unregisters any existing service workers to prevent
 * interference with the application. Run this if you're experiencing
 * issues with cached content or service worker conflicts.
 */

console.log('🧹 Starting service worker cleanup...')

if ('serviceWorker' in navigator) {
  // First, unregister all service workers
  navigator.serviceWorker
    .getRegistrations()
    .then(function (registrations) {
      console.log('Found', registrations.length, 'service worker registrations')

      const unregisterPromises = registrations.map(function (registration) {
        console.log('Unregistering service worker:', registration.scope)
        return registration.unregister().then(function (success) {
          console.log('Service Worker unregistered:', success)
          return success
        })
      })

      return Promise.all(unregisterPromises)
    })
    .then(function () {
      console.log('✅ All service workers unregistered')

      // Clear all caches
      return caches.keys()
    })
    .then(function (cacheNames) {
      console.log('Found', cacheNames.length, 'caches to clear')

      return Promise.all(
        cacheNames.map(function (cacheName) {
          console.log('Deleting cache:', cacheName)
          return caches.delete(cacheName)
        }),
      )
    })
    .then(function () {
      console.log('✅ All caches cleared')

      // Force reload to ensure clean state
      alert(
        'Service worker and caches cleared successfully!\n\nThe page will now reload to ensure a clean state.',
      )
      window.location.reload(true)
    })
    .catch(function (error) {
      console.error('❌ Error during cleanup:', error)
      alert('Error during cleanup: ' + error.message)
    })
} else {
  alert('Service workers not supported in this browser')
}
