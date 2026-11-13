// The build step every image and CI job runs first: read the words, check
// them, and write the one data file everything else reads.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildContent, readContentFiles } from './build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const content = buildContent(readContentFiles(root))
const out = join(root, 'dist', 'content.json')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, `${JSON.stringify(content, null, 2)}\n`)
console.log(
  `content: ${content.places.length} places, ${content.milestones.length} milestones, ${content.projects.length} projects -> dist/content.json`,
)
