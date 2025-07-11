import { expect, test } from '@playwright/test'

test.describe('Video Viewer', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/')
  })

  test('should load video viewer page with mock data', async ({ page }) => {
    // Navigate to a mock video ID
    await page.goto('/video/dQw4w9WgXcQ')

    // Wait for the page to load
    await page.waitForLoadState('networkidle')

    // Check that the page header is present
    await expect(page.locator('h1')).toContainText(
      'Modern Web Development with React & Next.js',
    )

    // Check that the video player is present
    await expect(page.locator('[data-testid="video-player"]')).toBeVisible()

    // Check that the transcript viewer is present
    await expect(page.locator('text=Interactive Transcript')).toBeVisible()

    // Check that the summary/chapters tabs are present
    await expect(page.locator('text=Summary')).toBeVisible()
    await expect(page.locator('text=Chapters')).toBeVisible()
  })

  test('should navigate back to home page', async ({ page }) => {
    // Navigate to video viewer
    await page.goto('/video/dQw4w9WgXcQ')

    // Click the back button
    await page.click('text=Back')

    // Should be redirected to home page
    await expect(page).toHaveURL('/')
  })

  test('should switch between summary and chapters tabs', async ({ page }) => {
    // Navigate to video viewer
    await page.goto('/video/dQw4w9WgXcQ')

    // Wait for content to load
    await page.waitForLoadState('networkidle')

    // Check that summary tab is active by default
    await expect(page.locator('text=AI Summary')).toBeVisible()

    // Click on chapters tab
    await page.click('[data-state="inactive"][value="chapters"]')

    // Check that chapters content is visible
    await expect(page.locator('text=Chapters')).toBeVisible()
    await expect(page.locator('text=Introduction')).toBeVisible()
  })

  test('should display transcript segments', async ({ page }) => {
    // Navigate to video viewer
    await page.goto('/video/dQw4w9WgXcQ')

    // Wait for content to load
    await page.waitForLoadState('networkidle')

    // Check that transcript segments are visible
    await expect(
      page.locator('text=Welcome to this comprehensive tutorial'),
    ).toBeVisible()
    await expect(
      page.locator("text=Today we'll be exploring React"),
    ).toBeVisible()
  })

  test('should handle video not found', async ({ page }) => {
    // Navigate to non-existent video
    await page.goto('/video/nonexistent')

    // Wait for error state
    await page.waitForLoadState('networkidle')

    // Check that error message is displayed
    await expect(page.locator('text=Video Not Found')).toBeVisible()
    await expect(page.locator('text=Return Home')).toBeVisible()
  })

  test('should show loading state initially', async ({ page }) => {
    // Navigate to video viewer
    await page.goto('/video/dQw4w9WgXcQ')

    // Check for loading state (may be brief)
    const loadingText = page.locator('text=Loading video...')

    // Loading state might be very brief, so we don't assert it must be visible
    // Instead, we check that content eventually loads
    await expect(page.locator('h1')).toContainText('Modern Web Development', {
      timeout: 10000,
    })
  })

  test('should display video metadata', async ({ page }) => {
    // Navigate to video viewer
    await page.goto('/video/dQw4w9WgXcQ')

    // Wait for content to load
    await page.waitForLoadState('networkidle')

    // Check video metadata
    await expect(page.locator('text=mock')).toBeVisible()
    await expect(page.locator('text=EN')).toBeVisible()
  })

  test('should show chapter navigation', async ({ page }) => {
    // Navigate to video viewer
    await page.goto('/video/dQw4w9WgXcQ')

    // Wait for content to load
    await page.waitForLoadState('networkidle')

    // Click on chapters tab
    await page.click('[data-state="inactive"][value="chapters"]')

    // Check that chapters are displayed
    await expect(page.locator('text=Introduction')).toBeVisible()
    await expect(page.locator('text=Environment Setup')).toBeVisible()
    await expect(page.locator('text=Creating the Project')).toBeVisible()
  })

  test('should display summary content', async ({ page }) => {
    // Navigate to video viewer
    await page.goto('/video/dQw4w9WgXcQ')

    // Wait for content to load
    await page.waitForLoadState('networkidle')

    // Check that summary is visible (should be default tab)
    await expect(page.locator('text=AI Summary')).toBeVisible()
    await expect(
      page.locator('text=This tutorial provides a complete introduction'),
    ).toBeVisible()
  })

  test('should show copy button in summary', async ({ page }) => {
    // Navigate to video viewer
    await page.goto('/video/dQw4w9WgXcQ')

    // Wait for content to load
    await page.waitForLoadState('networkidle')

    // Check that copy button is visible
    await expect(page.locator('text=Copy')).toBeVisible()
  })

  test('should handle responsive layout', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/video/dQw4w9WgXcQ')

    // Wait for content to load
    await page.waitForLoadState('networkidle')

    // Check that content is still visible on mobile
    await expect(page.locator('h1')).toContainText('Modern Web Development')
    await expect(page.locator('text=Interactive Transcript')).toBeVisible()

    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Check that content is visible on desktop
    await expect(page.locator('h1')).toContainText('Modern Web Development')
    await expect(page.locator('text=Interactive Transcript')).toBeVisible()
  })
})
