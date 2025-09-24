/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
// import { storybookTest } from '@storybook/addon-vitest/vitest-plugin' // Temporarily disabled
const dirname =
  typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url))

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
    // Temporarily disable browser mode and Storybook tests to fix commit issues
    // Can be re-enabled later with proper configuration
    // projects: [
    //   // Regular unit tests
    //   {
    //     extends: true,
    //     test: {
    //       name: 'unit',
    //       include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
    //       environment: 'jsdom',
    //       setupFiles: ['./tests/setup.ts'],
    //     },
    //   },
    //   // Storybook tests - disabled due to browser mode dependency issues
    //   // {
    //   //   extends: true,
    //   //   plugins: [
    //   //     storybookTest({
    //   //       configDir: path.join(dirname, '.storybook'),
    //   //     }),
    //   //   ],
    //   //   test: {
    //   //     name: 'storybook',
    //   //     browser: {
    //   //       enabled: true,
    //   //       headless: true,
    //   //       provider: 'playwright',
    //   //       instances: [
    //   //         {
    //   //           browser: 'chromium',
    //   //         },
    //   //       ],
    //   //     },
    //   //     setupFiles: ['.storybook/vitest.setup.ts'],
    //   //   },
    //   // },
    // ],
  },
})
