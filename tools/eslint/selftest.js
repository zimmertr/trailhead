// Proof that each rule in plugin.js fires: every fixture must trip exactly
// the rules named here, and clean.ts none.
import { ESLint } from 'eslint'
import tseslint from 'typescript-eslint'
import { trailhead } from './plugin.js'

const EXPECTED = {
  'clean.ts': [],
  'swallowed.ts': ['trailhead/no-swallowed-catch', 'trailhead/no-swallowed-catch', 'trailhead/no-swallowed-catch'],
  'colour.ts': ['trailhead/no-colour-literal', 'trailhead/no-colour-literal', 'trailhead/no-colour-literal'],
  'address.ts': ['trailhead/no-socket-address', 'trailhead/no-socket-address', 'trailhead/no-socket-address'],
}

const eslint = new ESLint({
  cwd: import.meta.dirname,
  overrideConfigFile: true,
  overrideConfig: [
    {
      files: ['**/*.ts'],
      languageOptions: { parser: tseslint.parser },
      plugins: { trailhead },
      rules: { 'trailhead/no-swallowed-catch': 'error', 'trailhead/no-colour-literal': 'error', 'trailhead/no-socket-address': 'error' },
    },
  ],
})

const results = await eslint.lintFiles(['fixtures/*.ts'])
const failures = []
if (results.length !== Object.keys(EXPECTED).length) failures.push(`expected ${Object.keys(EXPECTED).length} fixtures, linted ${results.length}`)
for (const result of results) {
  const name = result.filePath.split('/').pop()
  const got = result.messages.map((m) => m.ruleId ?? `parse error: ${m.message}`).toSorted()
  const want = (EXPECTED[name] ?? ['<a fixture selftest.js does not list>']).toSorted()
  if (JSON.stringify(got) !== JSON.stringify(want)) failures.push(`${name}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`)
}
if (failures.length > 0) {
  console.error(`The lint rules' self-test failed:\n  ${failures.join('\n  ')}`)
  process.exit(1)
}
console.log(`lint self-test: ${results.length} fixtures tripped exactly their rules`)
