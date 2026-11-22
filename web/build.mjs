// Writes dist/, what the web image serves: the game in www/ as it is, with the page given the
// document head a served page needs (the artifact and the tools add their own), the API named
// for live stars, and the fonts' licences as third-party-licenses.txt. The tools' own pages stay out.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const here = import.meta.dirname
const www = join(here, 'www')
const dist = join(here, 'dist')
// Pages and modules only the render tools load (tools/pixel/).
const TOOLS_ONLY = new Set(['bake.html', 'relief.html', 'relief.js'])

const { INTRO } = await import(join(www, 'content.js'))

rmSync(dist, { recursive: true, force: true })
mkdirSync(dist)
cpSync(www, dist, { recursive: true, filter: (src) => !TOOLS_ONLY.has(src.slice(www.length + 1)) })

const page = readFileSync(join(www, 'index.html'), 'utf8')
const body = page.indexOf('<canvas id="c"')
if (body < 0) throw new Error('www/index.html has no <canvas id="c"> to start the body at')
const head = [
  '<!doctype html>',
  '<html lang="en">',
  '<head>',
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
  `<meta name="description" content="TJ Zimmerman ${INTRO.replace(/"/g, '&quot;')}">`,
  '<meta name="trailhead:stars" content="/api/v1/projects">',
  '<link rel="icon" href="favicon.svg" type="image/svg+xml">',
].join('\n')
// The artifact's title names the round; the site's names TJ.
const top = page.slice(0, body).replace(/<title>[^<]*<\/title>/, '<title>TJ Zimmerman</title>')
writeFileSync(join(dist, 'index.html'), `${head}\n${top}</head>\n<body>\n${page.slice(body)}</body>\n</html>\n`)
writeFileSync(join(dist, 'third-party-licenses.txt'), readFileSync(join(www, 'fonts', 'LICENSE.txt')))
