import { expect, test } from '@playwright/test'

test.describe('Dashboard Page', () => {
  test('should load dashboard page', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('Dashboard')).toBeVisible()
    await expect(
      page.getByText('View and manage your transcribed videos'),
    ).toBeVisible()
  })

  test('should show empty state initially', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('No transcripts yet')).toBeVisible()
    await expect(
      page.getByText('Start by transcribing your first video'),
    ).toBeVisible()
  })

  test('should have navigation links', async ({ page }) => {
    await page.goto('/dashboard')

    // Check navbar links
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Transcribe' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible()
  })

  test('should navigate to transcribe page from empty state', async ({
    page,
  }) => {
    await page.goto('/dashboard')
    await page.getByRole('link', { name: 'Get Started' }).click()
    await expect(page).toHaveURL('/transcribe')
  })

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/dashboard')

    await expect(page.getByText('Dashboard')).toBeVisible()
    await expect(page.getByText('No transcripts yet')).toBeVisible()

    // Test desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/dashboard')

    await expect(page.getByText('Dashboard')).toBeVisible()
    await expect(page.getByText('No transcripts yet')).toBeVisible()
  })
})
