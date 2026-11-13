import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ROOT, files, read } from './repo.ts'

const markdown = files(/\.md$/)

describe('the docs', () => {
  it('link only to files that exist', () => {
    const broken: string[] = []
    for (const path of markdown) {
      for (const [, target] of read(path).matchAll(/\]\(([^)\s]+)\)/g)) {
        if (!target || /^(https?:|mailto:|#)/.test(target)) continue
        const file = target.split('#')[0] ?? ''
        if (!existsSync(join(ROOT, dirname(path), file))) broken.push(`${path}: ${target}`)
      }
    }
    expect(broken).toEqual([])
  })

  it('list every CLAUDE.md in the root one', () => {
    const root = read('CLAUDE.md')
    for (const path of markdown.filter((p) => p.endsWith('CLAUDE.md') && p !== 'CLAUDE.md')) expect(root, path).toContain(`(${path})`)
  })

  it('index every decision record', () => {
    const index = read('docs/architectural-decision-records/README.md')
    for (const path of files(/^docs\/architectural-decision-records\/\d{4}-.*\.md$/)) {
      const name = path.split('/').pop() ?? ''
      if (name.startsWith('0000-')) continue
      expect(index, name).toContain(`(${name})`)
    }
  })
})

describe('every text file', () => {
  // TJ's writing rule: no em or en dash, anywhere.
  it('holds no em or en dash', () => {
    const text = files(/\.(md|ts|js|json|ya?ml|css|html|conf|sql|sh)$|(^|\/)(Dockerfile|Makefile|\.dockerignore|\.gitignore|\.npmrc)$/)
    const dashed = text.filter((path) => /[\u2013\u2014]/.test(read(path)))
    expect(dashed).toEqual([])
  })

  it('holds no email address', () => {
    const text = files(/\.(md|ts|json|ya?ml|html)$/).filter((path) => !path.endsWith('package-lock.json'))
    const found = text.filter((path) => /\b[\w.+-]+@[a-z0-9-]+\.(?:com|org|net|io|dev|me)\b/i.test(read(path)))
    expect(found).toEqual([])
  })
})
