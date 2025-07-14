// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook'

import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  {
    ignores: [
      'src/generated/**',
      '**/generated/**',
      '**/*.generated.js',
      '**/*.generated.ts',
      '**/wasm*.js',
      '**/runtime/**',
      '**/prisma/runtime/**',
      '.next/**',
      'out/**',
      'node_modules/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
      'storybook-static/**',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  ...compat.extends('eslint-config-prettier'),
  ...compat.extends('plugin:jsx-a11y/recommended'),
  {
    plugins: {
      import: (await import('eslint-plugin-import')).default,
    },
    rules: {
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
    },
  },
  ...storybook.configs['flat/recommended'],
]

export default eslintConfig
