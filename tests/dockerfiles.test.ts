import { describe, expect, it } from 'vitest'
import { SERVICES, files, read } from './repo.ts'

const dockerfile = (service: string) => read(`${service}/Dockerfile`)
const froms = (text: string) => [...text.matchAll(/^FROM (\S+)/gm)].map(([, image]) => image ?? '')

describe('the Dockerfiles', () => {
  it('are one per service, and no more', () => {
    expect(files(/(^|\/)Dockerfile$/)).toEqual(SERVICES.map((s) => `${s}/Dockerfile`).toSorted())
  })

  it.each(SERVICES)('%s pins every base image by tag and digest', (service) => {
    for (const image of froms(dockerfile(service))) expect(image).toMatch(/^[\w./-]+:[\w.-]+@sha256:[0-9a-f]{64}$/)
  })

  it('build on one Node image, whose major is .node-version', () => {
    const major = read('.node-version').trim()
    const nodes = new Set(SERVICES.flatMap((s) => froms(dockerfile(s))).filter((image) => image.startsWith('node:')))
    expect(nodes.size).toBe(1)
    expect([...nodes][0]).toMatch(new RegExp(`^node:${major}-alpine@`))
  })

  it.each(SERVICES)('%s upgrades its packages after the build arguments, and ends as a numbered unprivileged user', (service) => {
    const text = dockerfile(service)
    const final = text.slice(text.lastIndexOf('\nFROM '))
    expect(final.indexOf('ARG APP_COMMIT')).toBeGreaterThan(0)
    expect(final.indexOf('apk upgrade --no-cache')).toBeGreaterThan(final.indexOf('ARG APP_COMMIT'))
    const users = [...final.matchAll(/^USER (\S+)$/gm)].map(([, user]) => user)
    expect(users.at(-1)).toMatch(/^[1-9]\d*:[1-9]\d*$/)
    expect(final).toMatch(/^COPY .*LICENSE/m)
  })
})
