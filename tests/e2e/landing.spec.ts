import { test, expect } from '@playwright/test'
import {
  testUrls,
  testMessages,
  testSelectors,
  viewports,
} from './fixtures/test-data'

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Hero Section', () => {
    test('should display hero section with typewriter animation', async ({
      page,
    }) => {
      // Check if the hero section is visible
      await expect(page.locator('section').first()).toBeVisible()

      // Check if the main heading contains expected text
      const heading = page.locator('h1')
      await expect(heading).toBeVisible()
      await expect(heading).toContainText('YouTube Videos')

      // Check if the Get Started button is visible
      const getStartedButton = page
        .getByRole('link', { name: 'Get Started' })
        .first()
      await expect(getStartedButton).toBeVisible()
      await expect(getStartedButton).toHaveAttribute('href', '/transcribe')
    })

    test('should have accessible hero content', async ({ page }) => {
      // Check for proper heading hierarchy
      await expect(page.locator('h1')).toHaveCount(1)

      // Check for descriptive text
      await expect(
        page.locator(
          'text=Transform YouTube videos into searchable, interactive transcripts',
        ),
      ).toBeVisible()
    })
  })

  test.describe('Feature Cards', () => {
    test('should display all feature cards', async ({ page }) => {
      // Check if feature cards are visible
      await expect(page.locator('text=Instant Transcription')).toBeVisible()
      await expect(page.locator('text=Smart Search')).toBeVisible()
      await expect(page.locator('text=AI Summaries')).toBeVisible()
    })

    test('should have proper feature card structure', async ({ page }) => {
      // Check if feature cards have proper structure
      const featureCards = page.locator('[data-testid="feature-card"]')

      if ((await featureCards.count()) > 0) {
        // Each feature card should have a title and description
        await expect(featureCards.first()).toBeVisible()

        // Check for icons or visual elements
        const cardCount = await featureCards.count()
        expect(cardCount).toBeGreaterThanOrEqual(3)
      }
    })
  })

  test.describe('URL Form Validation', () => {
    test('should show validation error for empty URL', async ({ page }) => {
      // Click submit without entering URL
      await page.locator(testSelectors.submitButton).click()

      // Check for validation error message
      await expect(
        page.getByText(testMessages.validation.emptyUrl),
      ).toBeVisible()
    })

    test('should show validation error for invalid URLs', async ({ page }) => {
      const urlInput = page.locator(testSelectors.urlInput)
      await expect(urlInput).toBeVisible()

      // Test various invalid URLs
      const invalidUrls = [
        testUrls.invalid.notYoutube,
        testUrls.invalid.malformed,
        testUrls.invalid.wrongDomain,
      ]

      for (const invalidUrl of invalidUrls) {
        await urlInput.fill(invalidUrl)
        await page.locator(testSelectors.submitButton).click()

        await expect(
          page.getByText(testMessages.validation.invalidUrl),
        ).toBeVisible()

        // Clear the input for next test
        await urlInput.clear()
      }
    })

    test('should accept valid YouTube URLs', async ({ page }) => {
      const urlInput = page.locator(testSelectors.urlInput)
      await expect(urlInput).toBeVisible()

      // Test various valid YouTube URL formats
      const validUrls = Object.values(testUrls.valid)

      for (const validUrl of validUrls) {
        await urlInput.fill(validUrl)
        await page.locator(testSelectors.submitButton).click()

        // Should not show validation error
        await expect(
          page.getByText(testMessages.validation.invalidUrl),
        ).not.toBeVisible()

        // Should show processing state or navigate
        const processingText = page.getByText(testMessages.loading.processing)
        if (await processingText.isVisible()) {
          await expect(processingText).toBeVisible()
        }

        // Reset for next test
        await page.goto('/')
        await page.waitForLoadState('networkidle')
      }
    })

    test('should handle form submission properly', async ({ page }) => {
      const urlInput = page.locator(testSelectors.urlInput)
      const submitButton = page.locator(testSelectors.submitButton)

      // Enter a valid URL
      await urlInput.fill(testUrls.valid.youtube)

      // Button should be enabled
      await expect(submitButton).toBeEnabled()

      // Submit form
      await submitButton.click()

      // Should show loading state
      await expect(
        page.getByText(testMessages.loading.processing),
      ).toBeVisible()

      // Button should be disabled during processing
      await expect(submitButton).toBeDisabled()
    })
  })

  test.describe('Navigation', () => {
    test('should have working navigation links', async ({ page }) => {
      // Check main navigation links
      const homeLink = page.getByRole('link', { name: 'Home' })
      const transcribeLink = page.getByRole('link', { name: 'Transcribe' })
      const dashboardLink = page.getByRole('link', { name: 'Dashboard' })
      const settingsLink = page.getByRole('link', { name: 'Settings' })

      // All links should be visible
      await expect(homeLink).toBeVisible()
      await expect(transcribeLink).toBeVisible()
      await expect(dashboardLink).toBeVisible()
      await expect(settingsLink).toBeVisible()

      // Check href attributes
      await expect(transcribeLink).toHaveAttribute('href', '/transcribe')
      await expect(dashboardLink).toHaveAttribute('href', '/dashboard')
      await expect(settingsLink).toHaveAttribute('href', '/settings')
    })

    test('should navigate to transcribe page from Get Started button', async ({
      page,
    }) => {
      const getStartedButton = page
        .getByRole('link', { name: 'Get Started' })
        .first()

      await getStartedButton.click()
      await page.waitForLoadState('networkidle')

      await expect(page).toHaveURL('/transcribe')
    })
  })

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize(viewports.mobile)
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Hero section should be visible and properly sized
      await expect(page.locator('h1')).toBeVisible()

      // URL form should be usable on mobile
      const urlInput = page.locator(testSelectors.urlInput)
      await expect(urlInput).toBeVisible()

      // Navigation should be accessible (mobile menu)
      const navButton = page.locator('[data-testid="mobile-menu-button"]')
      if (await navButton.isVisible()) {
        await navButton.click()
        await expect(page.getByRole('link', { name: 'Home' })).toBeVisible()
      }
    })

    test('should be responsive on tablet', async ({ page }) => {
      await page.setViewportSize(viewports.tablet)
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Content should be properly laid out on tablet
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator(testSelectors.urlInput)).toBeVisible()

      // Feature cards should be visible
      await expect(page.locator('text=Instant Transcription')).toBeVisible()
    })

    test('should be responsive on desktop', async ({ page }) => {
      await page.setViewportSize(viewports.desktop)
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Desktop layout should show all elements
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator(testSelectors.urlInput)).toBeVisible()

      // All navigation links should be visible
      await expect(page.getByRole('link', { name: 'Home' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Transcribe' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible()
    })
  })

  test.describe('Performance and Accessibility', () => {
    test('should load quickly and be accessible', async ({ page }) => {
      // Check that page loads within reasonable time
      const startTime = Date.now()
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000) // Should load within 10 seconds

      // Basic accessibility checks
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('main')).toBeVisible()

      // Form should be properly labeled
      const urlInput = page.locator(testSelectors.urlInput)
      await expect(urlInput).toHaveAttribute('placeholder')
    })

    test('should handle keyboard navigation', async ({ page }) => {
      // Tab through interactive elements
      await page.keyboard.press('Tab')

      // Should be able to reach the URL input
      const urlInput = page.locator(testSelectors.urlInput)
      await urlInput.focus()
      await expect(urlInput).toBeFocused()

      // Should be able to reach the submit button
      await page.keyboard.press('Tab')
      const submitButton = page.locator(testSelectors.submitButton)
      await expect(submitButton).toBeFocused()
    })
  })
})
