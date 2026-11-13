import { isIPv4, isIPv6 } from 'node:net'

// Requests that arrive without the proxy's header share one bucket: in the
// cluster those are probes and other pods, never a visitor.
export const NO_CLIENT = 'no-client-address'

// The rate limit's key. It reads only the header the edge proxy sets
// (docs/TRAFFIC.md); the socket address is the proxy's, and X-Forwarded-For
// is whatever the caller wrote. An IPv6 client counts by its /64, since one
// host can hold the whole /64 (service.md, Rate limits per client).
export function clientBucket(header: string | string[] | undefined): string {
  const value = (Array.isArray(header) ? header[0] : header)?.trim() ?? ''
  if (isIPv4(value)) return value
  if (isIPv6(value)) return ipv6Bucket(value)
  return NO_CLIENT
}

function ipv6Bucket(address: string): string {
  const [head = '', tail] = address.toLowerCase().split('::')
  const toGroups = (part: string): string[] =>
    part === ''
      ? []
      : part.split(':').flatMap((group) => {
          if (!group.includes('.')) return [group]
          // An IPv4 tail, as in ::ffff:192.0.2.1, is two groups.
          const [a = 0, b = 0, c = 0, d = 0] = group.split('.').map(Number)
          return [((a << 8) | b).toString(16), ((c << 8) | d).toString(16)]
        })
  const front = toGroups(head)
  const back = tail === undefined ? [] : toGroups(tail)
  const groups = [...front, ...Array<string>(8 - front.length - back.length).fill('0'), ...back].map((g) => g.replace(/^0+(?=.)/, ''))
  // An IPv4-mapped address is an IPv4 client, and counts as one.
  if (groups.slice(0, 5).every((g) => g === '0') && groups[5] === 'ffff') {
    const v4 = groups.slice(6).flatMap((g) => {
      const n = Number.parseInt(g, 16)
      return [n >> 8, n & 0xff]
    })
    return v4.join('.')
  }
  return `${groups.slice(0, 4).join(':')}::/64`
}
