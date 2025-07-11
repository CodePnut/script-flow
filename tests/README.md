# Tests

This directory contains all tests for the script-flow project.

## Structure

```
tests/
├── unit/           # Unit tests (Vitest)
├── e2e/            # End-to-end tests (Playwright)
├── setup.ts        # Test setup configuration
└── README.md       # This file
```

## Running Tests

- **Unit tests**: `npm run test`
- **E2E tests**: `npm run test:e2e`
- **All tests**: `npm run test:all`

## Adding New Tests

### Unit Tests

Place unit tests in `tests/unit/` with the `.test.ts` suffix.

### E2E Tests

Place end-to-end tests in `tests/e2e/` with the `.spec.ts` suffix.

## Test Setup

The `setup.ts` file configures the test environment for all unit tests, including:

- Jest DOM matchers
- Global test utilities
- Mock configurations
