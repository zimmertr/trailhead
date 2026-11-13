// `make openapi` writes the document; `make check-openapi` fails when the
// committed one differs, which means a route or model changed without it.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { openApiDocument, serialize } from '../src/openapi.ts'

const file = join(import.meta.dirname, '..', 'openapi.json')
const wanted = serialize(openApiDocument())

if (process.argv.includes('--check')) {
  if (readFileSync(file, 'utf8') !== wanted) {
    console.error('api/openapi.json is out of date. Run `make openapi` and commit the result.')
    process.exit(1)
  }
  console.log('api/openapi.json matches the routes.')
} else {
  writeFileSync(file, wanted)
  console.log('wrote api/openapi.json')
}
