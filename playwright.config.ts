import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright Configuration for ScriptFlow E2E Tests
 *
 * Comprehensive testing setup with:
 * - Cross-browser testing (Chrome, Firefox, Safari)
 * - Mobile and desktop viewports
 * - Detailed reporting and tracing
 * - Automatic dev server management
 * - Optimized for both local and CI environments
 */
export default defineConfig({
  testDir: './tests/e2e',

  /* Global test settings */
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30000, // 30 seconds per test
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },

  /* Enhanced reporting */
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    process.env.CI ? ['github'] : ['list'],
  ],

  /* Global test configuration */
  use: {
    /* Base URL for all tests */
    baseURL: 'http://localhost:3003',

    /* Enhanced tracing and screenshots */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    /* Browser settings */
    actionTimeout: 10000,
    navigationTimeout: 30000,

    /* Ignore HTTPS errors for development */
    ignoreHTTPSErrors: true,

    /* Color scheme preference */
    colorScheme: 'dark',
  },

  /* Test projects for different browsers and devices */
  projects: [
    /* Desktop browsers */
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
      },
    },

    /* Mobile devices */
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 12'],
      },
    },

    /* Tablet */
    {
      name: 'tablet',
      use: {
        ...devices['iPad Pro'],
      },
    },
  ],

  /* Development server configuration */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3003',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes to start server
    stdout: 'ignore',
    stderr: 'pipe',
  },

  /* Output directories */
  outputDir: 'test-results/',
})
