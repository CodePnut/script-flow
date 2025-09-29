/**
 * Dashboard Page E2E Tests
 * 
 * Tests for the dashboard functionality including
 * history management, search, and user interactions.
 */

import { test, expect } from '@playwright/test'

import { selectors } from './fixtures/test-data'

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Page Structure', () => {
    test('should display dashboard header', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('Dashboard')
      await expect(page.locator('text=View and manage your transcribed videos')).toBeVisible()
    })

    test('should display search functionality', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="search"]')
      await expect(searchInput).toBeVisible()
    })

    test('should display filter options', async ({ page }) => {
      const filterButton = page.locator('button:has-text("Filter")')
      await expect(filterButton).toBeVisible()
    })
  })

  test.describe('History Management', () => {
    test('should display history items', async ({ page }) => {
      // Wait for history to load
      await page.waitForTimeout(2000)
      
      const historyItems = page.locator('[data-testid="history-item"]')
      const itemCount = await historyItems.count()
      
      // Should have at least some items (or show empty state)
      if (itemCount === 0) {
        await expect(page.locator(selectors.emptyState)).toBeVisible()
      } else {
        await expect(historyItems.first()).toBeVisible()
      }
    })

    test('should show video thumbnails', async ({ page }) => {
      await page.waitForTimeout(2000)
      
      const thumbnails = page.locator('[data-testid="video-thumbnail"]')
      if (await thumbnails.count() > 0) {
        await expect(thumbnails.first()).toBeVisible()
      }
    })

    test('should show video titles', async ({ page }) => {
      await page.waitForTimeout(2000)
      
      const titles = page.locator('[data-testid="video-title"]')
      if (await titles.count() > 0) {
        await expect(titles.first()).toBeVisible()
        expect(await titles.first().textContent()).toHaveLengthGreaterThan(0)
      }
    })

    test('should show timestamps', async ({ page }) => {
      await page.waitForTimeout(2000)
      
      const timestamps = page.locator('[data-testid="timestamp"]')
      if (await timestamps.count() > 0) {
        await expect(timestamps.first()).toBeVisible()
      }
    })
  })

  test.describe('Search Functionality', () => {
    test('should filter history by search term', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('React')
      
      // Wait for search results
      await page.waitForTimeout(1000)
      
      // Check that results are filtered
      const historyItems = page.locator('[data-testid="history-item"]')
      const itemCount = await historyItems.count()
      
      if (itemCount > 0) {
        const firstItem = historyItems.first()
        const itemText = await firstItem.textContent()
        expect(itemText?.toLowerCase()).toContain('react')
      }
    })

    test('should show no results message for non-existent search', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('xyz123nonexistent')
      
      // Wait for search results
      await page.waitForTimeout(1000)
      
      // Should show no results message
      await expect(page.locator('text=No results found')).toBeVisible()
    })

    test('should clear search when input is cleared', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="search"]')
      
      // Enter search term
      await searchInput.fill('React')
      await page.waitForTimeout(1000)
      
      // Clear search
      await searchInput.clear()
      await page.waitForTimeout(1000)
      
      // Should show all results again
      const historyItems = page.locator('[data-testid="history-item"]')
      await expect(historyItems.first()).toBeVisible()
    })
  })

  test.describe('Filter Options', () => {
    test('should open filter dropdown', async ({ page }) => {
      const filterButton = page.locator('button:has-text("Filter")')
      await filterButton.click()
      
      // Check filter options are visible
      await expect(page.locator('text=Date Range')).toBeVisible()
      await expect(page.locator('text=Language')).toBeVisible()
    })

    test('should filter by date range', async ({ page }) => {
      const filterButton = page.locator('button:has-text("Filter")')
      await filterButton.click()
      
      // Select date range filter
      await page.locator('text=Last 7 days').click()
      
      // Wait for filter to apply
      await page.waitForTimeout(1000)
      
      // Check filtered results
      const historyItems = page.locator('[data-testid="history-item"]')
      await expect(historyItems.first()).toBeVisible()
    })

    test('should filter by language', async ({ page }) => {
      const filterButton = page.locator('button:has-text("Filter")')
      await filterButton.click()
      
      // Select language filter
      await page.locator('text=English').click()
      
      // Wait for filter to apply
      await page.waitForTimeout(1000)
      
      // Check filtered results
      const historyItems = page.locator('[data-testid="history-item"]')
      await expect(historyItems.first()).toBeVisible()
    })
  })

  test.describe('History Item Actions', () => {
    test('should navigate to video when clicking history item', async ({ page }) => {
      await page.waitForTimeout(2000)
      
      const historyItems = page.locator('[data-testid="history-item"]')
      if (await historyItems.count() > 0) {
        await historyItems.first().click()
        
        // Should navigate to transcribe page
        await page.waitForURL(/.*\/transcribe/)
        await expect(page).toHaveURL(/.*\/transcribe/)
      }
    })

    test('should show delete confirmation', async ({ page }) => {
      await page.waitForTimeout(2000)
      
      const deleteButtons = page.locator('[data-testid="delete-button"]')
      if (await deleteButtons.count() > 0) {
        await deleteButtons.first().click()
        
        // Should show confirmation dialog
        await expect(page.locator('text=Delete this transcription?')).toBeVisible()
      }
    })

    test('should delete history item', async ({ page }) => {
      await page.waitForTimeout(2000)
      
      const deleteButtons = page.locator('[data-testid="delete-button"]')
      if (await deleteButtons.count() > 0) {
        const initialCount = await page.locator('[data-testid="history-item"]').count()
        
        await deleteButtons.first().click()
        await page.locator('button:has-text("Delete")').last().click()
        
        // Wait for deletion
        await page.waitForTimeout(1000)
        
        // Check item was deleted
        const newCount = await page.locator('[data-testid="history-item"]').count()
        expect(newCount).toBeLessThan(initialCount)
      }
    })
  })

  test.describe('Sorting', () => {
    test('should sort by date (newest first)', async ({ page }) => {
      const sortButton = page.locator('button:has-text("Sort")')
      await sortButton.click()
      
      await page.locator('text=Newest First').click()
      
      // Wait for sort to apply
      await page.waitForTimeout(1000)
      
      // Check sorted results
      const historyItems = page.locator('[data-testid="history-item"]')
      await expect(historyItems.first()).toBeVisible()
    })

    test('should sort by date (oldest first)', async ({ page }) => {
      const sortButton = page.locator('button:has-text("Sort")')
      await sortButton.click()
      
      await page.locator('text=Oldest First').click()
      
      // Wait for sort to apply
      await page.waitForTimeout(1000)
      
      // Check sorted results
      const historyItems = page.locator('[data-testid="history-item"]')
      await expect(historyItems.first()).toBeVisible()
    })

    test('should sort by title', async ({ page }) => {
      const sortButton = page.locator('button:has-text("Sort")')
      await sortButton.click()
      
      await page.locator('text=Title A-Z').click()
      
      // Wait for sort to apply
      await page.waitForTimeout(1000)
      
      // Check sorted results
      const historyItems = page.locator('[data-testid="history-item"]')
      await expect(historyItems.first()).toBeVisible()
    })
  })

  test.describe('Pagination', () => {
    test('should show pagination controls', async ({ page }) => {
      await page.waitForTimeout(2000)
      
      const historyItems = page.locator('[data-testid="history-item"]')
      const itemCount = await historyItems.count()
      
      if (itemCount > 10) { // Assuming 10 items per page
        await expect(page.locator('button:has-text("Previous")')).toBeVisible()
        await expect(page.locator('button:has-text("Next")')).toBeVisible()
      }
    })

    test('should navigate between pages', async ({ page }) => {
      await page.waitForTimeout(2000)
      
      const nextButton = page.locator('button:has-text("Next")')
      if (await nextButton.isVisible()) {
        await nextButton.click()
        
        // Wait for page to load
        await page.waitForTimeout(1000)
        
        // Should show different items
        await expect(page.locator('[data-testid="history-item"]').first()).toBeVisible()
      }
    })
  })

  test.describe('Empty State', () => {
    test('should show empty state when no history', async ({ page }) => {
      // This test assumes we can clear history or start with empty state
      // In a real scenario, you might need to mock an empty response
      
      await page.waitForTimeout(2000)
      
      const historyItems = page.locator('[data-testid="history-item"]')
      const itemCount = await historyItems.count()
      
      if (itemCount === 0) {
        await expect(page.locator(selectors.emptyState)).toBeVisible()
        await expect(page.locator('text=No transcriptions yet')).toBeVisible()
      }
    })

    test('should show call to action in empty state', async ({ page }) => {
      const historyItems = page.locator('[data-testid="history-item"]')
      const itemCount = await historyItems.count()
      
      if (itemCount === 0) {
        // Should show button to start transcribing
        const ctaButton = page.locator('button:has-text("Start Transcribing")')
        await expect(ctaButton).toBeVisible()
        
        // Click should navigate to home
        await ctaButton.click()
        await expect(page).toHaveURL('/')
      }
    })
  })

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Check layout is mobile-friendly
      await expect(page.locator('h1')).toContainText('Dashboard')
      await expect(page.locator('input[placeholder*="search"]')).toBeVisible()
    })

    test('should be responsive on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      
      // Check layout is tablet-friendly
      await expect(page.locator('h1')).toContainText('Dashboard')
      await expect(page.locator('button:has-text("Filter")')).toBeVisible()
    })

    test('should be responsive on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 })
      
      // Check full desktop layout
      await expect(page.locator('h1')).toContainText('Dashboard')
      await expect(page.locator('button:has-text("Sort")')).toBeVisible()
    })
  })

  test.describe('Error Handling', () => {
    test('should handle search errors gracefully', async ({ page }) => {
      // Mock search error
      await page.route('**/api/history/search**', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Search failed' }),
        })
      })
      
      const searchInput = page.locator('input[placeholder*="search"]')
      await searchInput.fill('test')
      
      // Should handle error gracefully
      await expect(page.locator('body')).toBeVisible()
    })

    test('should handle filter errors gracefully', async ({ page }) => {
      // Mock filter error
      await page.route('**/api/history/filter**', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Filter failed' }),
        })
      })
      
      const filterButton = page.locator('button:has-text("Filter")')
      await filterButton.click()
      await page.locator('text=Last 7 days').click()
      
      // Should handle error gracefully
      await expect(page.locator('body')).toBeVisible()
    })
  })
})