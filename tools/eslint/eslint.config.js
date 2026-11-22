import comments from '@eslint-community/eslint-plugin-eslint-comments/configs'
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { trailhead } from './plugin.js'

const root = new URL('../..', import.meta.url).pathname

// For the pixel world's block below: every rule the site adds, switched off, and Node's globals
// taken away again, because a browser module that reads `process` is a bug there.
const siteOnlyOff = Object.fromEntries([
  ...Object.keys(tseslint.plugin.rules).map(name => `@typescript-eslint/${name}`),
  ...Object.keys(comments.recommended.rules),
  '@eslint-community/eslint-comments/require-description',
  'trailhead/no-swallowed-catch',
].map(name => [name, 'off']))
const noNode = Object.fromEntries(Object.keys(globals.node).map(name => [name, 'off']))

export default tseslint.config(
  { ignores: ['tools/pixel/out/**', '**/node_modules/**', '**/dist/**', 'coverage/**', 'tools/eslint/fixtures/**', 'e2e/playwright-report/**', 'e2e/test-results/**'] },
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
      // Fastify handlers and hooks are async by contract, as are the fakes
      // that stand in for a database or GitHub, whether or not they await.
      '@typescript-eslint/require-await': 'off',
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
  // The pixel world is plain browser JS with no build step and no types (web/CLAUDE.md), so it
  // and its tools get ESLint's own recommended rules and none of the site's.
  {
    files: ['web/www/**/*.js', 'web/build.mjs', 'tools/pixel/**/*.mjs'],
    languageOptions: { globals: { ...noNode, ...globals.browser }, parserOptions: { projectService: false, project: false, program: null } },
    rules: { ...siteOnlyOff, ...js.configs.recommended.rules, 'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' }] },
  },
  // The tools run in Node and hand functions to the page, so they see both worlds; the build runs in Node.
  { files: ['web/build.mjs', 'tools/pixel/**/*.mjs'], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
)
