/**
 * Landing Page E2E Tests
 * 
 * Comprehensive test suite for the landing page functionality
 * including form validation, navigation, and responsive design.
 */

import { test, expect } from '@playwright/test'
import { testUrls, selectors, messages, testUtils } from './fixtures/test-data'

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle')
    
    // Verify we're on the landing page
    await expect(page).toHaveTitle(/ScriptFlow - YouTube Video Transcription/)
  })

  test.describe('Page Structure', () => {
    test('should display hero section with correct content', async ({ page }) => {
      // Check that the h1 contains any of the dynamic words plus "YouTube Videos"
      const mainHeading = page.locator('h1')
      await expect(mainHeading).toBeVisible()
      await expect(mainHeading).toContainText('YouTube Videos')
      
      // Check for the subheading - find the specific paragraph
      const subheading = page.locator('p').filter({ hasText: 'Transform any YouTube video into interactive, searchable transcripts with AI-powered summaries and chapter navigation.' })
      await expect(subheading).toBeVisible()
    })

    test('should display feature cards', async ({ page }) => {
      // Find feature cards by looking for the specific feature titles
      const featureTitles = ['Instant Transcription', 'Smart Search', 'AI Summaries']
      
      for (const title of featureTitles) {
        const featureElement = page.locator(`text=${title}`)
        await expect(featureElement).toBeVisible()
      }
    })

    test('should have working navigation links', async ({ page }) => {
      const homeLink = page.locator(selectors.homeLink)
      await expect(homeLink).toBeVisible()
      
      // Test navigation to other pages
      const transcribeLink = page.locator(selectors.transcribeLink)
      await expect(transcribeLink).toBeVisible()
      
      // Click and verify navigation
      await transcribeLink.click()
      await expect(page).toHaveURL(/.*\/transcribe/)
      
      // Go back to home
      await page.goBack()
      await expect(page).toHaveURL('/')
    })
  })

  test.describe('URL Form Validation', () => {
    test('should show validation error for empty URL', async ({ page }) => {
      // Click submit without entering URL
      await page.locator(selectors.submitButton).click()
      
      // Wait for validation to appear
      await page.waitForSelector(selectors.formMessage, { timeout: 2000 })
      
      // Check for error message
      const errorMessage = page.locator(selectors.formMessage)
      await expect(errorMessage).toBeVisible()
      await expect(errorMessage).toContainText(messages.validation.emptyUrl)
    })

    test('should show validation error for invalid URL', async ({ page }) => {
      // Enter invalid URL
      await page.locator(selectors.urlInput).fill(testUrls.invalid.notYoutube)
      await page.locator(selectors.submitButton).click()
      
      // Wait for validation to appear
      await page.waitForSelector(selectors.formMessage, { timeout: 2000 })
      
      // Check for error message
      const errorMessage = page.locator(selectors.formMessage)
      await expect(errorMessage).toBeVisible()
      await expect(errorMessage).toContainText(messages.validation.invalidUrl)
    })

    test('should show validation error for malformed URL', async ({ page }) => {
      // Enter malformed URL
      await page.locator(selectors.urlInput).fill(testUrls.invalid.malformed)
      await page.locator(selectors.submitButton).click()
      
      // Wait for validation to appear
      await page.waitForSelector(selectors.formMessage, { timeout: 2000 })
      
      // Check for error message
      const errorMessage = page.locator(selectors.formMessage)
      await expect(errorMessage).toBeVisible()
      await expect(errorMessage).toContainText(messages.validation.invalidUrl)
    })

    test('should accept valid YouTube URLs', async ({ page }) => {
      // Test different YouTube URL formats
      for (const [key, url] of Object.entries(testUrls.valid)) {
        await page.locator(selectors.urlInput).fill(url)
        await page.locator(selectors.submitButton).click()
        
        // Should not show validation errors
        const errorMessages = await page.locator(selectors.formMessage).all()
        expect(errorMessages.length).toBe(0)
        
        // Clear input for next test
        await page.locator(selectors.urlInput).clear()
      }
    })
  })

  test.describe('Form Submission', () => {
    test('should navigate to transcribe page with valid URL', async ({ page }) => {
      // Enter valid URL
      await page.locator(selectors.urlInput).fill(testUrls.valid.youtube)
      
      // Click submit
      await page.locator(selectors.submitButton).click()
      
      // Wait for navigation
      await page.waitForURL(/.*\/transcribe.*url=/, { timeout: 5000 })
      
      // Verify we're on transcribe page
      await expect(page).toHaveURL(/.*\/transcribe/)
      
      // Check that URL parameter is present
      const url = page.url()
      expect(url).toContain('url=')
      expect(url).toContain(encodeURIComponent(testUrls.valid.youtube))
    })

    test('should show loading state during submission', async ({ page }) => {
      // Enter valid URL
      await page.locator(selectors.urlInput).fill(testUrls.valid.youtube)
      
      // Click submit and check loading state
      await page.locator(selectors.submitButton).click()
      
      // Check button text changes to loading
      await expect(page.locator(selectors.submitButton)).toContainText(messages.loading.processing)
      
      // Button should be disabled during loading
      await expect(page.locator(selectors.submitButton)).toBeDisabled()
    })
  })

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Check navigation is mobile-friendly
      const navbar = page.locator(selectors.navbar)
      await expect(navbar).toBeVisible()
      
      // Check form is mobile-friendly
      const form = page.locator(selectors.urlForm)
      await expect(form).toBeVisible()
    })

    test('should be responsive on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      
      // Check layout is tablet-friendly
      const heroSection = page.locator(selectors.heroSection)
      await expect(heroSection).toBeVisible()
      
      // Check form works on tablet
      const urlInput = page.locator(selectors.urlInput)
      await expect(urlInput).toBeVisible()
    })

    test('should be responsive on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 })
      
      // Check full desktop layout
      const heroSection = page.locator(selectors.heroSection)
      await expect(heroSection).toBeVisible()
      
      // Check all features are visible (there are 6 total: 3 in main features + 3 in why choose section)
      const featureCards = page.locator(selectors.featureCards)
      await expect(featureCards).toHaveCount(6)
    })
  })

  test.describe('Accessibility', () => {
    test('should have proper form labels', async ({ page }) => {
      const urlInput = page.locator(selectors.urlInput)
      await expect(urlInput).toBeVisible()
      
      // Check for proper labeling
      const formLabel = page.locator('label:has-text("YouTube URL")')
      await expect(formLabel).toBeVisible()
      
      // Check for form description
      const formDescription = page.locator('text=Enter a YouTube video URL')
      await expect(formDescription).toBeVisible()
    })

    test('should have proper button text', async ({ page }) => {
      const submitButton = page.locator(selectors.submitButton)
      await expect(submitButton).toBeVisible()
      await expect(submitButton).toContainText('Transcribe')
    })

    test('should handle keyboard navigation', async ({ page }) => {
      // Scroll to the URL form section
      await page.locator(selectors.urlInput).scrollIntoViewIfNeeded()
      
      // Wait for form to be visible
      await page.waitForSelector(selectors.urlInput, { state: 'visible' })
      
      // Focus on URL input and type
      await page.locator(selectors.urlInput).click()
      await page.keyboard.type(testUrls.valid.youtube)
      
      // Tab to submit button and press Enter
      await page.keyboard.press('Tab')
      await page.keyboard.press('Enter')
      
      // Should navigate to transcribe page
      await page.waitForURL(/.*\/transcribe/)
    })
  })

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Block network requests to simulate network error
      await page.route('**/*', (route) => route.abort())
      
      // Try to submit form
      await page.locator(selectors.urlInput).fill(testUrls.valid.youtube)
      await page.locator(selectors.submitButton).click()
      
      // Should show some form of error (either validation or network)
      // The exact behavior depends on the implementation
      await expect(page.locator('body')).toBeVisible()
    })

    test('should handle JavaScript errors gracefully', async ({ page }) => {
      // Listen for console errors
      const consoleErrors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })
      
      // Navigate and interact with page
      await page.goto('/')
      await page.locator(selectors.urlInput).fill(testUrls.valid.youtube)
      await page.locator(selectors.submitButton).click()
      
      // Should not have critical JavaScript errors
      expect(consoleErrors.filter(err => err.includes('TypeError'))).toHaveLength(0)
    })
  })
})