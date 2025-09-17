/**
 * Global Setup for Playwright Tests
 * 
 * Handles test environment preparation, authentication setup,
 * and any global configuration needed before running tests.
 */

import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Playwright global setup...')
  
  // Get the base URL from config
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3003'
  
  // Launch browser for setup tasks
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  try {
    console.log(`📡 Checking if server is ready at ${baseURL}`)
    
    // Wait for the server to be ready
    let retries = 0
    const maxRetries = 30
    
    while (retries < maxRetries) {
      try {
        await page.goto(baseURL, { timeout: 5000 })
        console.log('✅ Server is ready!')
        break
      } catch (error) {
        retries++
        console.log(`⏳ Waiting for server... (${retries}/${maxRetries})`)
        await page.waitForTimeout(2000)
        
        if (retries === maxRetries) {
          throw new Error(`Server not ready after ${maxRetries} attempts`)
        }
      }
    }
    
    // Perform any global setup tasks here
    console.log('🔧 Running global setup tasks...')
    
    // Example: Clear any existing data, set up test users, etc.
    // This is where you'd add any setup specific to your app
    
    console.log('✅ Global setup completed successfully')
    
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  } finally {
    await browser.close()
  }
}

export default globalSetup
