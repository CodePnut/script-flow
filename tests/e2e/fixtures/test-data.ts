/**
 * Test Data and Fixtures for E2E Tests
 * 
 * Centralized test data management for consistent testing
 * across all Playwright test files.
 */

// Test URLs for different scenarios
export const testUrls = {
  valid: {
    youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    youtubeShort: 'https://youtu.be/dQw4w9WgXcQ',
    youtubeEmbed: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    youtubeShorts: 'https://www.youtube.com/shorts/dQw4w9WgXcQ',
  },
  invalid: {
    notYoutube: 'https://vimeo.com/123456789',
    malformed: 'not-a-url',
    empty: '',
    wrongDomain: 'https://notyoutube.com/watch?v=123',
  },
} as const

// Mock video data for testing
export const mockVideoData = {
  id: 'dQw4w9WgXcQ',
  title: 'Modern Web Development with React & Next.js',
  duration: 1800, // 30 minutes
  language: 'EN',
  provider: 'mock',
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
      {
        start: 12,
        end: 18,
        text: 'We will cover everything from basic concepts to advanced patterns.',
      },
    ],
  },
  summary:
    'This tutorial provides a complete introduction to modern web development using React and Next.js.',
  chapters: [
    { title: 'Introduction', start: 0, end: 300 },
    { title: 'Environment Setup', start: 300, end: 600 },
    { title: 'Creating the Project', start: 600, end: 1200 },
    { title: 'Advanced Features', start: 1200, end: 1800 },
  ],
} as const

// CSS selectors for key elements
export const selectors = {
  // Navigation
  navbar: 'header',
  homeLink: 'nav a[href="/"]',
  transcribeLink: 'nav a[href="/transcribe"]',
  dashboardLink: 'nav a[href="/dashboard"]',
  settingsLink: 'nav a[href="/settings"]',

  // URL Form
  urlForm: 'form',
  urlInput: 'input[placeholder*="youtube.com"]',
  submitButton: 'button[type="submit"]',
  transcribeButton: 'button:has-text("Transcribe")',
  formMessage: '[data-slot="form-message"]',

  // Content
  heroSection: '[data-testid="hero-section"]',
  featureCards: '[data-testid="feature-card"]',
  videoPlayer: '[data-testid="video-player"]',
  transcriptViewer: '[data-testid="transcript-viewer"]',

  // Tabs
  summaryTab: '[data-testid="summary-tab"]',
  chaptersTab: '[data-testid="chapters-tab"]',

  // States
  loadingSpinner: '[data-testid="loading-spinner"]',
  errorMessage: '[data-testid="error-message"]',
  emptyState: '[data-testid="empty-state"]',
} as const

// Test messages and validation text
export const messages = {
  validation: {
    emptyUrl: 'Please enter a YouTube URL',
    invalidUrl: 'Please enter a valid YouTube URL',
  },
  loading: {
    processing: 'Processing...',
    loadingVideo: 'Loading video...',
  },
  errors: {
    videoNotFound: 'Video Not Found',
    networkError: 'Network error occurred',
  },
  success: {
    transcriptionComplete: 'Transcription completed successfully',
  },
} as const

// Viewport configurations for responsive testing
export const viewports = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 720 },
  largeDesktop: { width: 1920, height: 1080 },
} as const

// Test utilities and helpers
export const testUtils = {
  /**
   * Wait for element to be visible with custom timeout
   */
  waitForVisible: (selector: string, timeout = 10000) => ({
    selector,
    options: { timeout },
  }),

  /**
   * Generate random test data
   */
  generateRandomId: () => Math.random().toString(36).substring(2, 15),

  /**
   * Delay utility for testing
   */
  delay: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),

  /**
   * Check if form has validation errors
   */
  hasValidationErrors: async (page: any) => {
    const errorMessages = await page.locator(selectors.formMessage).all()
    return errorMessages.length > 0
  },

  /**
   * Get validation error text
   */
  getValidationErrorText: async (page: any) => {
    const errorMessages = await page.locator(selectors.formMessage).all()
    if (errorMessages.length > 0) {
      return await errorMessages[0].textContent()
    }
    return null
  },

  /**
   * Fill form and submit with validation check
   */
  submitFormWithValidation: async (page: any, url: string) => {
    await page.locator(selectors.urlInput).fill(url)
    await page.locator(selectors.submitButton).click()
    
    // Wait a bit for validation to trigger
    await page.waitForTimeout(500)
    
    return {
      hasErrors: await testUtils.hasValidationErrors(page),
      errorText: await testUtils.getValidationErrorText(page),
    }
  },
} as const