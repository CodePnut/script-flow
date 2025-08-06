import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('should display hero section and typewriter animation', async ({
    page,
  }) => {
    await page.goto('/')

    // Check if the hero section is visible
    await expect(page.locator('section').first()).toBeVisible()

    // Check if the typewriter text is visible
    await expect(page.locator('h1')).toContainText('YouTube Videos')

    // Check if the Get Started button is visible (use more specific selector)
    await expect(
      page.getByRole('link', { name: 'Get Started' }).first(),
    ).toBeVisible()
  })

  test('should display feature cards', async ({ page }) => {
    await page.goto('/')

    // Check if feature cards are visible
    await expect(page.locator('text=Instant Transcription')).toBeVisible()
    await expect(page.locator('text=Smart Search')).toBeVisible()
    await expect(page.locator('text=AI Summaries')).toBeVisible()
  })

  test('should show validation error for invalid YouTube URL', async ({
    page,
  }) => {
    await page.goto('/')

    // Find the URL input field
    const urlInput = page.locator('input[placeholder*="youtube.com"]')
    await expect(urlInput).toBeVisible()

    // Enter an invalid URL
    await urlInput.fill('https://invalid-url.com')

    // Click the transcribe button
    await page.locator('button[type="submit"]').click()

    // Check for validation error message
    await expect(
      page.getByText('Please enter a valid YouTube URL'),
    ).toBeVisible()
  })

  test('should show validation error for empty URL', async ({ page }) => {
    await page.goto('/')

    // Find the transcribe button and click it without entering URL
    await page.locator('button[type="submit"]').click()

    // Check for validation error message
    await expect(page.getByText('Please enter a YouTube URL')).toBeVisible()
  })

  test('should accept valid YouTube URLs', async ({ page }) => {
    await page.goto('/')

    // Find the URL input field
    const urlInput = page.locator('input[placeholder*="youtube.com"]')
    await expect(urlInput).toBeVisible()

    // Enter a valid YouTube URL
    await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ')

    // Click the transcribe button
    await page.locator('button[type="submit"]').click()

    // Should not show validation error
    await expect(
      page.getByText('Please enter a valid YouTube URL'),
    ).not.toBeVisible()

    // Should show processing state
    await expect(page.getByText('Processing...')).toBeVisible()
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // Check if the hero section adapts to mobile
    await expect(page.locator('h1')).toBeVisible()

    // Check if feature cards stack vertically on mobile
    const featureCards = page.locator('[data-testid="feature-card"]')
    if ((await featureCards.count()) > 0) {
      // If feature cards exist, they should be visible
      await expect(featureCards.first()).toBeVisible()
    }
  })
})
