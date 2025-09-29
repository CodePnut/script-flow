/**
 * Test Utilities and Helpers
 * 
 * Common utilities and helper functions for both E2E and unit tests.
 * Provides consistent testing patterns and reduces code duplication.
 */

import { Page, expect } from '@playwright/test'
import { testUrls, selectors, messages } from './fixtures/test-data'

/**
 * Test Utilities Class
 * Provides reusable methods for common testing operations
 */
export class TestUtils {
  private page: Page

  constructor(page: Page) {
    this.page = page
  }

  /**
   * Navigate to a page and wait for it to load
   */
  async navigateTo(path: string) {
    await this.page.goto(path)
    await this.page.waitForLoadState('networkidle')
    
    // Additional wait for React hydration
    await this.page.waitForTimeout(500)
  }

  /**
   * Fill and submit the URL form
   */
  async submitUrlForm(url: string, expectNavigation = true) {
    await this.page.locator(selectors.urlInput).fill(url)
    await this.page.locator(selectors.submitButton).click()

    if (expectNavigation) {
      await this.page.waitForURL(/.*\/transcribe/)
    } else {
      // Wait for validation or error
      await this.page.waitForTimeout(1000)
    }
  }

  /**
   * Check if form has validation errors
   */
  async hasValidationErrors() {
    const errorMessages = await this.page.locator(selectors.formMessage).all()
    return errorMessages.length > 0
  }

  /**
   * Get validation error text
   */
  async getValidationErrorText() {
    const errorMessages = await this.page.locator(selectors.formMessage).all()
    if (errorMessages.length > 0) {
      return await errorMessages[0].textContent()
    }
    return null
  }

  /**
   * Wait for element to be visible with custom timeout
   */
  async waitForVisible(selector: string, timeout = 10000) {
    const element = this.page.locator(selector)
    await expect(element).toBeVisible({ timeout })
    return element
  }

  /**
   * Wait for element to contain text
   */
  async waitForText(selector: string, text: string, timeout = 10000) {
    const element = this.page.locator(selector)
    await expect(element).toContainText(text, { timeout })
    return element
  }

  /**
   * Take screenshot with custom name
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    })
  }

  /**
   * Mock API responses
   */
  async mockApiResponse(url: string, response: any, status = 200) {
    await this.page.route(url, (route) => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response),
      })
    })
  }

  /**
   * Block API requests
   */
  async blockApiRequests(pattern: string) {
    await this.page.route(pattern, (route) => route.abort())
  }

  /**
   * Wait for all images to load
   */
  async waitForImages() {
    await this.page.waitForLoadState('networkidle')
    await this.page.evaluate(() => {
      return Promise.all(
        Array.from(document.images)
          .filter(img => !img.complete)
          .map(img => new Promise(resolve => { img.onload = img.onerror = resolve }))
      )
    })
  }

  /**
   * Check if element exists
   */
  async elementExists(selector: string) {
    const elements = await this.page.locator(selector).all()
    return elements.length > 0
  }

  /**
   * Get text content of element
   */
  async getText(selector: string) {
    const element = this.page.locator(selector)
    return await element.textContent()
  }

  /**
   * Clear local storage
   */
  async clearLocalStorage() {
    await this.page.evaluate(() => {
      localStorage.clear()
    })
  }

  /**
   * Set viewport size
   */
  async setViewport(size: 'mobile' | 'tablet' | 'desktop') {
    const sizes = {
      mobile: { width: 375, height: 667 },
      tablet: { width: 768, height: 1024 },
      desktop: { width: 1280, height: 720 },
    }

    await this.page.setViewportSize(sizes[size])
  }

  /**
   * Handle console messages
   */
  setupConsoleLogging() {
    const consoleLogs: string[] = []
    const errors: string[] = []

    this.page.on('console', (msg) => {
      const log = `[${msg.type()}] ${msg.text()}`
      consoleLogs.push(log)
      
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    return { consoleLogs, errors }
  }

  /**
   * Handle dialog/popup events
   */
  setupDialogHandler() {
    this.page.on('dialog', async (dialog) => {
      console.log(`Dialog message: ${dialog.message()}`)
      await dialog.accept()
    })
  }

  /**
   * Wait for specific network request
   */
  async waitForRequest(urlPattern: string, timeout = 10000) {
    return await this.page.waitForRequest(urlPattern, { timeout })
  }

  /**
   * Wait for specific network response
   */
  async waitForResponse(urlPattern: string, timeout = 10000) {
    return await this.page.waitForResponse(urlPattern, { timeout })
  }

  /**
   * Get all network requests
   */
  async getNetworkRequests() {
    return await this.page.evaluate(() => {
      return performance.getEntriesByType('resource').map((entry: any) => ({
        name: entry.name,
        type: entry.initiatorType,
        duration: entry.duration,
        size: entry.transferSize,
      }))
    })
  }

  /**
   * Check page performance metrics
   */
  async getPerformanceMetrics() {
    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
      }
    })
  }
}

/**
 * Validation helpers
 */
export const validationHelpers = {
  /**
   * Test URL validation for different formats
   */
  testUrlValidation: async (page: Page, url: string, shouldBeValid: boolean) => {
    await page.locator(selectors.urlInput).fill(url)
    await page.locator(selectors.submitButton).click()
    await page.waitForTimeout(1000)

    const hasErrors = await page.locator(selectors.formMessage).count() > 0
    
    if (shouldBeValid) {
      expect(hasErrors).toBe(false)
    } else {
      expect(hasErrors).toBe(true)
    }
  },

  /**
   * Test form validation error messages
   */
  testValidationMessage: async (page: Page, expectedMessage: string) => {
    const errorMessages = await page.locator(selectors.formMessage).all()
    expect(errorMessages.length).toBeGreaterThan(0)
    
    const messageText = await errorMessages[0].textContent()
    expect(messageText).toContain(expectedMessage)
  },
}

/**
 * Mock data generators
 */
export const mockDataGenerators = {
  /**
   * Generate mock YouTube video data
   */
  generateVideoData: (overrides = {}) => ({
    id: 'dQw4w9WgXcQ',
    title: 'Modern Web Development with React & Next.js',
    duration: 1800,
    language: 'EN',
    provider: 'youtube',
    transcript: {
      segments: [
        {
          start: 0,
          end: 5,
          text: 'Welcome to this comprehensive tutorial on modern web development.',
        },
        {
          start: 5,
          end: 12,
          text: "Today we'll be exploring React and Next.js to build amazing applications.",
        },
      ],
    },
    summary: 'This tutorial provides a complete introduction to modern web development.',
    chapters: [
      { title: 'Introduction', start: 0, end: 300 },
      { title: 'Environment Setup', start: 300, end: 600 },
    ],
    ...overrides,
  }),

  /**
   * Generate mock transcript data
   */
  generateTranscriptData: (segmentCount = 5) => ({
    segments: Array.from({ length: segmentCount }, (_, i) => ({
      start: i * 10,
      end: (i + 1) * 10,
      text: `This is transcript segment ${i + 1} with some sample content.`,
    })),
  }),

  /**
   * Generate mock summary data
   */
  generateSummaryData: () => ({
    summary: 'This video provides a comprehensive overview of modern web development techniques and best practices.',
    keyPoints: [
      'Introduction to React and Next.js',
      'Setting up development environment',
      'Building responsive user interfaces',
      'Deploying applications to production',
    ],
  }),
}

/**
 * Test setup helpers
 */
export const testSetupHelpers = {
  /**
   * Setup test environment
   */
  setupTestEnvironment: async (page: Page) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 720 })
    
    // Setup console logging
    const utils = new TestUtils(page)
    const { consoleLogs, errors } = utils.setupConsoleLogging()
    
    // Setup dialog handler
    utils.setupDialogHandler()
    
    return { consoleLogs, errors }
  },

  /**
   * Navigate to page with retry logic
   */
  navigateWithRetry: async (page: Page, url: string, maxRetries = 3) => {
    let lastError: Error | null = null
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
        return
      } catch (error) {
        lastError = error as Error
        console.log(`Navigation attempt ${i + 1} failed, retrying...`)
        await page.waitForTimeout(1000)
      }
    }
    
    throw lastError
  },
}

export default TestUtils