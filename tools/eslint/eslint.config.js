import comments from '@eslint-community/eslint-plugin-eslint-comments/configs'
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { trailhead } from './plugin.js'

const root = new URL('../..', import.meta.url).pathname

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', 'coverage/**', 'tools/eslint/fixtures/**', 'e2e/playwright-report/**', 'e2e/test-results/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  comments.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: { projectService: true, tsconfigRootDir: root },
    },
    plugins: { trailhead },
    rules: {
      'trailhead/no-swallowed-catch': 'error',
      // A suppression says why, beside it.
      '@eslint-community/eslint-comments/require-description': ['error', { ignore: [] }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' }],
    },
  },
  {
    files: ['web/src/**/*.ts'],
    languageOptions: { globals: { ...globals.browser } },
    rules: { 'trailhead/no-colour-literal': 'error' },
  },
  // The canvas's colours live here and nowhere else.
  { files: ['web/src/world/palette.ts'], rules: { 'trailhead/no-colour-literal': 'off' } },
  { files: ['api/src/**/*.ts', 'admin/src/**/*.ts', 'common/src/**/*.ts'], rules: { 'trailhead/no-socket-address': 'error' } },
  // Tests build fakes with any shape they need.
  {
    files: ['**/test/**/*.ts', 'tests/**/*.ts', 'e2e/**/*.ts'],
    rules: { '@typescript-eslint/no-unsafe-assignment': 'off', '@typescript-eslint/no-unsafe-member-access': 'off', '@typescript-eslint/no-unsafe-argument': 'off' },
  },
  { files: ['**/*.js'], ...tseslint.configs.disableTypeChecked },
)
