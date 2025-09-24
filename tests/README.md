# Testing Guide for ScriptFlow

This directory contains comprehensive tests for the ScriptFlow project, organized for clarity and maintainability.

## 📁 Structure

```
tests/
├── unit/                    # Unit tests (Vitest)
│   ├── components/         # Component tests
│   ├── hooks/              # Custom hook tests
│   └── lib/                # Utility function tests
├── e2e/                    # End-to-end tests (Playwright)
│   ├── fixtures/           # Test data and utilities
│   ├── global-setup.ts     # Global test setup
│   ├── landing.spec.ts     # Landing page tests
│   ├── transcribe.spec.ts  # Transcribe page tests
│   ├── dashboard.spec.ts   # Dashboard tests
│   └── video-viewer.spec.ts # Video viewer tests
├── setup.ts                # Test environment setup
└── README.md              # This file
```

## 🚀 Quick Start

### Running Tests

```bash
# Run all unit tests
npm run test

# Run E2E tests (starts dev server automatically)
npm run test:e2e

# Run all tests
npm run test:all

# Run tests in watch mode (unit tests)
npm run test:watch

# Run E2E tests in UI mode
npx playwright test --ui

# Run specific test file
npm run test URLForm.test.tsx
npx playwright test landing.spec.ts
```

### Test Development

```bash
# Generate new test files
npx playwright codegen localhost:3003

# Debug E2E tests
npx playwright test --debug

# View test reports
npx playwright show-report
```

## 🎯 Test Categories

### Unit Tests

- **Component Tests**: Testing React components in isolation
- **Hook Tests**: Testing custom React hooks
- **Utility Tests**: Testing pure functions and utilities
- **Integration Tests**: Testing component interactions

### E2E Tests

- **User Flows**: Complete user journeys
- **Cross-browser**: Chrome, Firefox, Safari compatibility
- **Responsive**: Mobile, tablet, desktop layouts
- **Accessibility**: Keyboard navigation, screen readers
- **Performance**: Load times, interaction responsiveness

## 📝 Writing Tests

### Unit Test Example

```typescript
import { render, screen } from '@testing-library/react'
import { URLForm } from '@/components/URLForm'

test('should validate YouTube URLs', () => {
  render(<URLForm />)

  const input = screen.getByPlaceholderText(/youtube.com/)
  const button = screen.getByRole('button', { name: /transcribe/i })

  // Test validation logic
  expect(input).toBeInTheDocument()
  expect(button).toBeEnabled()
})
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test'

test('should transcribe YouTube video', async ({ page }) => {
  await page.goto('/transcribe')

  await page.fill(
    '[data-testid="url-input"]',
    'https://youtube.com/watch?v=test',
  )
  await page.click('[data-testid="submit-button"]')

  await expect(page.getByText('Processing...')).toBeVisible()
})
```

## 🔧 Configuration

### Playwright Configuration

The `playwright.config.ts` includes:

- **Cross-browser testing**: Chrome, Firefox, Safari
- **Mobile/tablet testing**: Various device viewports
- **Enhanced reporting**: HTML, JSON, JUnit formats
- **Automatic screenshots/videos** on failure
- **Trace collection** for debugging

### Vitest Configuration

The `vitest.config.ts` includes:

- **React Testing Library** setup
- **JSDOM environment** for browser APIs
- **Path aliases** matching the main project
- **Coverage reporting** with detailed metrics

## 🎨 Best Practices

### Test Organization

- **Descriptive test names**: What the test does, not how
- **Grouped tests**: Use `describe` blocks for logical grouping
- **Shared fixtures**: Reuse test data and utilities
- **Page objects**: Encapsulate page interactions

### Test Data Management

- **Centralized test data**: Use `fixtures/test-data.ts`
- **Realistic data**: Mirror production scenarios
- **Edge cases**: Test boundary conditions
- **Error scenarios**: Test failure paths

### Assertions

- **Specific selectors**: Use `data-testid` attributes
- **User-centric**: Test from user perspective
- **Async handling**: Proper wait strategies
- **Accessibility**: Include a11y checks

## 🚨 Troubleshooting

### Common Issues

**Tests timing out**

```bash
# Increase timeout in playwright.config.ts
timeout: 60000
```

**Flaky tests**

```bash
# Add proper waits
await page.waitForLoadState('networkidle')
await expect(element).toBeVisible()
```

**Server not starting**

```bash
# Check if port 3003 is available
lsof -i :3003
```

### Debugging

**View test execution**

```bash
npx playwright test --headed --debug
```

**Inspect test state**

```bash
npx playwright test --trace on
npx playwright show-trace trace.zip
```

## 📊 Coverage

Run tests with coverage reporting:

```bash
# Unit test coverage
npm run test:coverage

# View coverage report
open coverage/index.html
```

## 🔄 CI/CD Integration

Tests are configured for continuous integration:

- **GitHub Actions**: Automated test runs on PRs
- **Cross-browser matrix**: Tests across multiple browsers
- **Parallel execution**: Faster test completion
- **Artifact collection**: Screenshots, videos, reports

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
