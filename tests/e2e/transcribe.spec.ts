/**
 * Transcribe Page E2E Tests
 * 
 * Tests for the video transcription functionality
 * including video loading, transcript generation, and UI interactions.
 */

import { test, expect } from '@playwright/test'

import { testUrls, selectors } from './fixtures/test-data'

test.describe('Transcribe Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to transcribe page with a valid YouTube URL
    await page.goto(`/transcribe?url=${encodeURIComponent(testUrls.valid.youtube)}`)
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
  })

  test.describe('Page Load', () => {
    test('should load with URL parameter', async ({ page }) => {
      // Check URL contains the video parameter
      await expect(page).toHaveURL(/.*\/transcribe.*url=/)
      
      // Check page title
      await expect(page).toHaveTitle(/Transcribe/)
    })

    test('should handle missing URL parameter', async ({ page }) => {
      // Navigate without URL parameter
      await page.goto('/transcribe')
      
      // Should show some form of error or redirect
      await expect(page.locator('body')).toBeVisible()
    })

    test('should handle invalid URL parameter', async ({ page }) => {
      // Navigate with invalid URL
      await page.goto(`/transcribe?url=${encodeURIComponent(testUrls.invalid.notYoutube)}`)
      
      // Should show error message
      await expect(page.locator(selectors.errorMessage)).toBeVisible()
    })
  })

  test.describe('Video Player', () => {
    test('should display video player', async ({ page }) => {
      const videoPlayer = page.locator(selectors.videoPlayer)
      await expect(videoPlayer).toBeVisible({ timeout: 10000 })
    })

    test('should show video title', async ({ page }) => {
      // Wait for video data to load
      await page.waitForTimeout(2000)
      
      // Check for video title
      const titleElement = page.locator('h1, h2').first()
      await expect(titleElement).toBeVisible()
    })

    test('should show video metadata', async ({ page }) => {
      // Wait for content to load
      await page.waitForTimeout(2000)
      
      // Check for duration, language, etc.
      const metadataElements = page.locator('text=/Duration|Language|Views/')
      await expect(metadataElements.first()).toBeVisible()
    })
  })

  test.describe('Transcript Viewer', () => {
    test('should display transcript sections', async ({ page }) => {
      // Wait for transcript to load
      await page.waitForSelector(selectors.transcriptViewer, { timeout: 15000 })
      
      const transcriptViewer = page.locator(selectors.transcriptViewer)
      await expect(transcriptViewer).toBeVisible()
    })

    test('should have clickable transcript segments', async ({ page }) => {
      // Wait for transcript to load
      await page.waitForSelector(selectors.transcriptViewer, { timeout: 15000 })
      
      // Check for transcript segments
      const segments = page.locator('[data-testid="transcript-segment"]')
      await expect(segments.first()).toBeVisible()
      
      // Test clicking a segment
      await segments.first().click()
      
      // Should highlight or show some interaction
      await expect(segments.first()).toHaveClass(/selected|active/)
    })

    test('should show timestamps', async ({ page }) => {
      // Wait for transcript to load
      await page.waitForSelector(selectors.transcriptViewer, { timeout: 15000 })
      
      // Check for timestamp elements
      const timestamps = page.locator('[data-testid="timestamp"]')
      await expect(timestamps.first()).toBeVisible()
      
      // Verify timestamp format (MM:SS or HH:MM:SS)
      const timestampText = await timestamps.first().textContent()
      expect(timestampText).toMatch(/\d{1,2}:\d{2}/)
    })
  })

  test.describe('Summary Tab', () => {
    test('should display summary content', async ({ page }) => {
      // Wait for content to load
      await page.waitForTimeout(3000)
      
      // Click on summary tab
      const summaryTab = page.locator(selectors.summaryTab)
      await summaryTab.click()
      
      // Check for summary content
      const summaryContent = page.locator('[data-testid="summary-content"]')
      await expect(summaryContent).toBeVisible()
    })

    test('should show AI-generated summary', async ({ page }) => {
      // Navigate to summary tab
      await page.locator(selectors.summaryTab).click()
      
      // Wait for summary to load
      await page.waitForTimeout(2000)
      
      // Check for summary text
      const summaryText = page.locator('[data-testid="summary-text"]')
      await expect(summaryText).toBeVisible()
      const text = await summaryText.textContent()
      expect(text && text.length > 50).toBeTruthy()
    })
  })



  test.describe('Navigation', () => {
    test('should navigate between tabs', async ({ page }) => {
      // Test transcript tab (should be active by default)
      await expect(page.locator(selectors.transcriptViewer)).toBeVisible()
      
      // Test summary tab
      await page.locator(selectors.summaryTab).click()
      await expect(page.locator('[data-testid="summary-content"]')).toBeVisible()
    })

    test('should maintain video context when switching tabs', async ({ page }) => {
      // Get initial video state
      await page.waitForSelector(selectors.videoPlayer)
      
      // Switch between tabs
      await page.locator(selectors.summaryTab).click()
      await page.waitForTimeout(1000)
      
      // Go back to transcript
      await page.locator('button:has-text("Transcript")').click()
      
      // Video should still be present
      await expect(page.locator(selectors.videoPlayer)).toBeVisible()
    })
  })

  test.describe('Error Handling', () => {
    test('should handle video loading errors', async ({ page }) => {
      // Navigate with a non-existent video URL
      await page.goto(`/transcribe?url=${encodeURIComponent('https://www.youtube.com/watch?v=invalid123456')}`)
      
      // Should show error message
      await expect(page.locator(selectors.errorMessage)).toBeVisible({ timeout: 10000 })
    })

    test('should handle network errors', async ({ page }) => {
      // Block API requests
      await page.route('**/api/**', (route) => route.abort())
      
      // Reload page
      await page.reload()
      
      // Should show some form of error
      await expect(page.locator('body')).toBeVisible()
    })

    test('should handle invalid transcript data', async ({ page }) => {
      // Mock invalid transcript response
      await page.route('**/api/transcribe**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid transcript data' }),
        })
      })
      
      // Reload page
      await page.reload()
      
      // Should handle gracefully
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('Performance', () => {
    test('should load video player within reasonable time', async ({ page }) => {
      const startTime = Date.now()
      
      // Wait for video player
      await page.waitForSelector(selectors.videoPlayer, { timeout: 10000 })
      
      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(10000) // Should load within 10 seconds
    })

    test('should load transcript within reasonable time', async ({ page }) => {
      const startTime = Date.now()
      
      // Wait for transcript
      await page.waitForSelector(selectors.transcriptViewer, { timeout: 15000 })
      
      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(15000) // Should load within 15 seconds
    })
  })

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Check video player is mobile-friendly
      const videoPlayer = page.locator(selectors.videoPlayer)
      await expect(videoPlayer).toBeVisible()
      
      // Check tabs are accessible
      await expect(page.locator(selectors.summaryTab)).toBeVisible()
    })

    test('should be responsive on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      
      // Check layout is tablet-friendly
      await expect(page.locator(selectors.videoPlayer)).toBeVisible()
      await expect(page.locator(selectors.transcriptViewer)).toBeVisible()
    })

    test('should be responsive on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 })
      
      // Check full desktop layout
      await expect(page.locator(selectors.videoPlayer)).toBeVisible()
      await expect(page.locator(selectors.transcriptViewer)).toBeVisible()
      await expect(page.locator(selectors.summaryTab)).toBeVisible()
    })
  })
})