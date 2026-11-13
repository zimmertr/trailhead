import { resolve } from 'node:path'
import { content } from '@trailhead/content'
import { type Plugin, defineConfig } from 'vite'
import { licenseFile, packageDirs } from '../tools/licenses.ts'
import { describe, renderHome, renderPage } from './src/render.ts'

// Writes the words into both pages at build time, from the one content file.
export function contentPages(): Plugin {
  return {
    name: 'trailhead-content',
    transformIndexHtml: (html) =>
      html
        .replace('<!-- trailhead:description -->', describe(content))
        .replace('<!-- trailhead:home -->', renderHome(content))
        .replace('<!-- trailhead:page -->', renderPage(content)),
  }
}

// Collects every module the bundle was built from and writes the license file
// the image serves at /third-party-licenses.txt (tools/licenses.ts).
export function thirdPartyLicenses(): Plugin {
  const ids = new Set<string>()
  return {
    name: 'trailhead-licenses',
    apply: 'build',
    buildStart: () => ids.clear(),
    transform: (_code, id) => {
      ids.add(id)
      return null
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'third-party-licenses.txt', source: licenseFile(packageDirs([...ids])) })
    },
  }
}

export default defineConfig({
  root: import.meta.dirname,
  plugins: [contentPages(), thirdPartyLicenses()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Fonts and images stay files, so the content security policy needs no
    // data: source.
    assetsInlineLimit: 0,
    // Every browser that runs module scripts preloads them natively; the
    // polyfill would be the only script the policy has to think about.
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: { home: resolve(import.meta.dirname, 'index.html'), page: resolve(import.meta.dirname, 'page/index.html') },
    },
  },
})
