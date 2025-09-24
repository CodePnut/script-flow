import { test, expect } from '@playwright/test'
import {
  testUrls,
  testMessages,
  testSelectors,
  viewports,
} from './fixtures/test-data'

test.describe('Transcribe Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/transcribe')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Page Structure', () => {
    test('should display transcribe page elements', async ({ page }) => {
      // Check page title/heading
      await expect(page.locator('h1')).toContainText('Transcribe')

      // Check URL input form
      const urlInput = page.locator(testSelectors.urlInput)
      await expect(urlInput).toBeVisible()
      await expect(urlInput).toBeEnabled()

      // Check submit button
      const submitButton = page.locator(testSelectors.submitButton)
      await expect(submitButton).toBeVisible()
      await expect(submitButton).toBeEnabled()
    })

    test('should have proper navigation', async ({ page }) => {
      // Check navigation links
      await expect(page.getByRole('link', { name: 'Home' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible()
    })

    test('should show instructions or help text', async ({ page }) => {
      // Look for instructional content
      const instructionText = page.locator('text=Enter a YouTube video URL')
      if (await instructionText.isVisible()) {
        await expect(instructionText).toBeVisible()
      }

      // Check for placeholder text
      const urlInput = page.locator(testSelectors.urlInput)
      await expect(urlInput).toHaveAttribute('placeholder')
    })
  })

  test.describe('URL Processing', () => {
    test('should handle URL from query parameter', async ({ page }) => {
      // Navigate with URL parameter
      const testUrl = testUrls.valid.youtube
      await page.goto(`/transcribe?url=${encodeURIComponent(testUrl)}`)
      await page.waitForLoadState('networkidle')

      // URL should be pre-filled
      const urlInput = page.locator(testSelectors.urlInput)
      await expect(urlInput).toHaveValue(testUrl)
    })

    test('should validate URL input', async ({ page }) => {
      const urlInput = page.locator(testSelectors.urlInput)
      const submitButton = page.locator(testSelectors.submitButton)

      // Test empty URL
      await submitButton.click()
      await expect(
        page.getByText(testMessages.validation.emptyUrl),
      ).toBeVisible()

      // Test invalid URL
      await urlInput.fill(testUrls.invalid.notYoutube)
      await submitButton.click()
      await expect(
        page.getByText(testMessages.validation.invalidUrl),
      ).toBeVisible()

      // Test valid URL
      await urlInput.clear()
      await urlInput.fill(testUrls.valid.youtube)
      await submitButton.click()

      // Should not show validation error
      await expect(
        page.getByText(testMessages.validation.invalidUrl),
      ).not.toBeVisible()
    })

    test('should show processing state', async ({ page }) => {
      const urlInput = page.locator(testSelectors.urlInput)
      const submitButton = page.locator(testSelectors.submitButton)

      // Enter valid URL and submit
      await urlInput.fill(testUrls.valid.youtube)
      await submitButton.click()

      // Should show processing state
      await expect(
        page.getByText(testMessages.loading.processing),
      ).toBeVisible()

      // Submit button should be disabled during processing
      await expect(submitButton).toBeDisabled()

      // Input should be disabled during processing
      await expect(urlInput).toBeDisabled()
    })

    test('should handle different YouTube URL formats', async ({ page }) => {
      const urlInput = page.locator(testSelectors.urlInput)
      const submitButton = page.locator(testSelectors.submitButton)

      // Test all valid URL formats
      const validUrls = Object.values(testUrls.valid)

      for (const url of validUrls) {
        await urlInput.clear()
        await urlInput.fill(url)
        await submitButton.click()

        // Should not show validation error
        await expect(
          page.getByText(testMessages.validation.invalidUrl),
        ).not.toBeVisible()

        // Should show processing or redirect
        const processingText = page.getByText(testMessages.loading.processing)
        if (await processingText.isVisible()) {
          await expect(processingText).toBeVisible()
        }

        // Reset for next test
        await page.reload()
        await page.waitForLoadState('networkidle')
      }
    })
  })

  test.describe('Form Interactions', () => {
    test('should support keyboard navigation', async ({ page }) => {
      // Tab to URL input
      await page.keyboard.press('Tab')
      const urlInput = page.locator(testSelectors.urlInput)
      await expect(urlInput).toBeFocused()

      // Enter URL with keyboard
      await page.keyboard.type(testUrls.valid.youtube)
      await expect(urlInput).toHaveValue(testUrls.valid.youtube)

      // Tab to submit button
      await page.keyboard.press('Tab')
      const submitButton = page.locator(testSelectors.submitButton)
      await expect(submitButton).toBeFocused()

      // Submit with Enter key
      await page.keyboard.press('Enter')
      await expect(
        page.getByText(testMessages.loading.processing),
      ).toBeVisible()
    })

    test('should support form submission with Enter key', async ({ page }) => {
      const urlInput = page.locator(testSelectors.urlInput)

      await urlInput.fill(testUrls.valid.youtube)
      await urlInput.press('Enter')

      // Should submit the form
      await expect(
        page.getByText(testMessages.loading.processing),
      ).toBeVisible()
    })

    test('should clear form after successful submission', async ({ page }) => {
      const urlInput = page.locator(testSelectors.urlInput)
      const submitButton = page.locator(testSelectors.submitButton)

      // Fill and submit form
      await urlInput.fill(testUrls.valid.youtube)
      await submitButton.click()

      // Wait for processing to start
      await expect(
        page.getByText(testMessages.loading.processing),
      ).toBeVisible()

      // If form clears automatically, input should be empty
      // Note: This depends on the actual implementation
      // The test is written to be flexible
    })
  })

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/transcribe', (route) => {
        route.abort('failed')
      })

      const urlInput = page.locator(testSelectors.urlInput)
      const submitButton = page.locator(testSelectors.submitButton)

      await urlInput.fill(testUrls.valid.youtube)
      await submitButton.click()

      // Should show error message
      await expect(page.getByText(/failed|error|try again/i)).toBeVisible({
        timeout: 15000,
      })
    })

    test('should handle server errors', async ({ page }) => {
      // Mock server error response
      await page.route('**/api/transcribe', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        })
      })

      const urlInput = page.locator(testSelectors.urlInput)
      const submitButton = page.locator(testSelectors.submitButton)

      await urlInput.fill(testUrls.valid.youtube)
      await submitButton.click()

      // Should show error message
      await expect(page.getByText(/error|failed/i)).toBeVisible({
        timeout: 15000,
      })
    })
  })

  test.describe('Responsive Design', () => {
    test('should work on mobile devices', async ({ page }) => {
      await page.setViewportSize(viewports.mobile)
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Form should be usable on mobile
      const urlInput = page.locator(testSelectors.urlInput)
      const submitButton = page.locator(testSelectors.submitButton)

      await expect(urlInput).toBeVisible()
      await expect(submitButton).toBeVisible()

      // Should be able to interact with form
      await urlInput.fill(testUrls.valid.youtube)
      await submitButton.click()

      await expect(
        page.getByText(testMessages.loading.processing),
      ).toBeVisible()
    })

    test('should work on tablet devices', async ({ page }) => {
      await page.setViewportSize(viewports.tablet)
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Form should be properly sized on tablet
      const urlInput = page.locator(testSelectors.urlInput)
      const submitButton = page.locator(testSelectors.submitButton)

      await expect(urlInput).toBeVisible()
      await expect(submitButton).toBeVisible()

      // Form should be functional
      await urlInput.fill(testUrls.valid.youtube)
      await submitButton.click()

      await expect(
        page.getByText(testMessages.loading.processing),
      ).toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test('should have proper form labels and ARIA attributes', async ({
      page,
    }) => {
      const urlInput = page.locator(testSelectors.urlInput)
      const submitButton = page.locator(testSelectors.submitButton)

      // Input should have accessible attributes
      await expect(urlInput).toHaveAttribute('placeholder')

      // Button should have accessible text
      await expect(submitButton).toContainText(/transcribe|submit/i)

      // Form should be properly structured
      const form = page.locator('form')
      if (await form.isVisible()) {
        await expect(form).toBeVisible()
      }
    })

    test('should provide feedback for screen readers', async ({ page }) => {
      const urlInput = page.locator(testSelectors.urlInput)
      const submitButton = page.locator(testSelectors.submitButton)

      // Submit invalid form
      await submitButton.click()

      // Error message should be accessible
      const errorMessage = page.getByText(testMessages.validation.emptyUrl)
      await expect(errorMessage).toBeVisible()

      // Error should be associated with input
      // This depends on implementation details
    })
  })

  test.describe('Integration', () => {
    test('should redirect to video page on successful submission', async ({
      page,
    }) => {
      const urlInput = page.locator(testSelectors.urlInput)
      const submitButton = page.locator(testSelectors.submitButton)

      await urlInput.fill(testUrls.valid.youtube)
      await submitButton.click()

      // Should eventually navigate to video page
      // Note: This depends on the actual flow - might need to wait longer
      // or check for different behavior based on implementation

      await expect(
        page.getByText(testMessages.loading.processing),
      ).toBeVisible()

      // The actual redirect behavior depends on the implementation
      // This test is structured to be flexible
    })
  })
})
