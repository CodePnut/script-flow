/**
 * Test Data and Fixtures for E2E Tests
 *
 * Centralized test data management for consistent testing
 * across all Playwright test files.
 */

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

export const testSelectors = {
  // Navigation
  navbar: '[data-testid="navbar"]',
  homeLink: '[data-testid="home-link"]',
  transcribeLink: '[data-testid="transcribe-link"]',
  dashboardLink: '[data-testid="dashboard-link"]',
  settingsLink: '[data-testid="settings-link"]',

  // Forms
  urlInput: 'input[placeholder*="youtube.com"]',
  submitButton: 'button[type="submit"]',
  transcribeButton: '[data-testid="transcribe-button"]',

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

export const testMessages = {
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

export const viewports = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 720 },
  largeDesktop: { width: 1920, height: 1080 },
} as const

/**
 * Helper function to create test data variations
 */
export function createTestVariations<T>(
  baseData: T,
  variations: Partial<T>[],
): T[] {
  return variations.map((variation) => ({ ...baseData, ...variation }))
}

/**
 * Common test utilities
 */
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
   * Common viewport sizes for responsive testing
   */
  viewports,

  /**
   * Delay utility for testing
   */
  delay: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
}
