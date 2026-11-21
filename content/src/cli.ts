// The build step every image and CI job runs first: read the game's words,
// check them, and write the data file the API and the fetcher read.
// `--words` also rewrites the game's own copy, web/www/words.js.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildContent, buildWords, readGameFiles, wordsModule } from './build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const words = buildWords(readGameFiles(root))
const content = buildContent(words)
const out = join(root, 'dist', 'content.json')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, `${JSON.stringify(content, null, 2)}\n`)
console.log(`content: ${Object.keys(words.CARDS).length} cards, ${content.projects.length} projects -> dist/content.json`)
if (process.argv.includes('--words')) {
  writeFileSync(join(root, '..', 'web', 'www', 'words.js'), wordsModule(words))
  console.log('content: the game words -> web/www/words.js')
}
