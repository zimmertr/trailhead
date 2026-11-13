// `node tools/bundle.ts <service> <entry>...` bundles a service into
// dist/<service>/, one file per entry, plus the license file of every package
// the bundle holds. The runtime image then needs no node_modules at all.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { build } from 'esbuild'
import { licenseFile, packageDirs } from './licenses.ts'

const [service, ...entries] = process.argv.slice(2)
if (!service || entries.length === 0) throw new Error('usage: node tools/bundle.ts <service> <entry>...')
const outdir = join('dist', service)

const result = await build({
  entryPoints: entries,
  outdir,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node26',
  metafile: true,
  sourcemap: false,
  legalComments: 'none',
  // pg tries this optional native binding and falls back to plain JS.
  external: ['pg-native'],
  // Fastify and pg are CommonJS and call require() for Node's own modules,
  // which an ES module bundle has no binding for.
  banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" },
})

mkdirSync(outdir, { recursive: true })
writeFileSync(join(outdir, 'third-party-licenses.txt'), licenseFile(packageDirs(Object.keys(result.metafile.inputs))))
console.log(`bundled ${service}: ${Object.keys(result.metafile.outputs).join(', ')}`)
