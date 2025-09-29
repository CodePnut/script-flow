/**
 * Playwright Configuration
 *
 * Comprehensive configuration for Playwright E2E testing
 * with multiple browsers, devices, and testing strategies.
 */

import { defineConfig, devices } from '@playwright/test'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',

  /**
   * Maximum time one test can run for.
   */
  timeout: 30 * 1000, // 30 seconds

  /**
   * Maximum time expect() should wait for the condition to be met.
   * For example in `await expect(locator).toHaveText();`
   */
  expect: {
    timeout: 10000, // 10 seconds
  },

  /**
   * Fail the build on CI if you accidentally left test.only in the source code.
   */
  forbidOnly: !!process.env.CI,

  /**
   * Retry on CI only
   */
  retries: process.env.CI ? 2 : 0,

  /**
   * Opt out of parallel tests on CI.
   */
  workers: process.env.CI ? 1 : undefined,

  /**
   * Reporter to use. See https://playwright.dev/docs/test-reporters
   */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'playwright-results.json' }],
  ],

  /**
   * Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions.
   */
  use: {
    /**
     * Base URL to use in actions like `await page.goto('/')`.
     */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001',

    /**
     * Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer
     */
    trace: 'on-first-retry',

    /**
     * Capture screenshot after each test failure.
     */
    screenshot: 'only-on-failure',

    /**
     * Record video only when retrying a test for the first time.
     */
    video: 'retain-on-failure',

    /**
     * Default viewport size.
     */
    viewport: { width: 1280, height: 720 },

    /**
     * Whether to ignore HTTPS errors during navigation.
     */
    ignoreHTTPSErrors: true,

    /**
     * Additional HTTP headers to be sent with every request.
     */
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
  },

  /**
   * Configure projects for major browsers.
   * Each project can be configured separately.
   */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Additional Chrome-specific settings
        launchOptions: {
          args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-features=TranslateUI',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
          ],
        },
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        // Additional Firefox-specific settings
        launchOptions: {
          firefoxUserPrefs: {
            'dom.ipc.processCount': 8,
            'javascript.options.shared_memory': true,
          },
        },
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        // Additional Safari-specific settings
      },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        // Mobile Chrome settings
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        // Mobile Safari settings
      },
    },

    /* Test against branded browsers. */
    {
      name: 'Microsoft Edge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
      },
    },
    {
      name: 'Google Chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },

    /* Test tablet viewports. */
    {
      name: 'Tablet Chrome',
      use: {
        ...devices['iPad (gen 7)'],
        // Tablet-specific settings
      },
    },
    {
      name: 'Tablet Safari',
      use: {
        ...devices['iPad (gen 7)'],
        // Tablet Safari settings
      },
    },
  ],

  /**
   * Run your local dev server before starting the tests.
   */
  webServer: [
    {
      /**
       * Use the development server
       */
      command: 'npm run dev',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000, // 2 minutes

      /**
       * Wait for specific URL to be available
       */
      url: 'http://localhost:3001',

      /**
       * Custom health check
       */
      healthCheck: {
        url: 'http://localhost:3001/api/health',
        timeout: 30000,
        retries: 3,
      },
    },
  ],

  /**
   * Global setup and teardown
   */
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.ts'),

  /**
   * Test configuration
   */
  test: {
    /**
     * Maximum number of test failures to tolerate.
     */
    maxFailures: process.env.CI ? 10 : undefined,

    /**
     * Whether to exit after the first failure.
     */
    bail: process.env.CI ? 1 : 0,
  },

  /**
   * Metadata configuration
   */
  metadata: {
    /**
     * Test environment information
     */
    environment: process.env.NODE_ENV || 'development',

    /**
     * Test suite information
     */
    suite: 'Script Flow E2E Tests',

    /**
     * Test version information
     */
    version: process.env.npm_package_version || '1.0.0',
  },
})
