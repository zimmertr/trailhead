import { describe, expect, it } from 'vitest'
import { NO_CLIENT, clientBucket } from '../src/client.ts'

describe('clientBucket', () => {
  it('counts an IPv4 client by its address', () => {
    expect(clientBucket('203.0.113.7')).toBe('203.0.113.7')
    expect(clientBucket(' 203.0.113.7 ')).toBe('203.0.113.7')
  })

  it('counts an IPv6 client by its /64, however it is written', () => {
    const bucket = '2001:db8:aa:bb::/64'
    expect(clientBucket('2001:db8:aa:bb::1')).toBe(bucket)
    expect(clientBucket('2001:0db8:00aa:00bb:1234:5678:9abc:def0')).toBe(bucket)
    expect(clientBucket('2001:DB8:AA:BB:FFFF::')).toBe(bucket)
    expect(clientBucket('::1')).toBe('0:0:0:0::/64')
    expect(clientBucket('fe80::1:2:3:4')).toBe('fe80:0:0:0::/64')
  })

  it('counts an IPv4-mapped IPv6 client as the IPv4 client it is', () => {
    expect(clientBucket('::ffff:203.0.113.7')).toBe('203.0.113.7')
    expect(clientBucket('::ffff:cb00:7107')).toBe('203.0.113.7')
  })

  it('reads the first value when the header arrives twice', () => {
    expect(clientBucket(['203.0.113.7', '198.51.100.1'])).toBe('203.0.113.7')
  })

  it('puts a missing or malformed header in the shared bucket', () => {
    for (const value of [undefined, '', 'not-an-address', '203.0.113.7, 198.51.100.1', '999.1.1.1']) {
      expect(clientBucket(value)).toBe(NO_CLIENT)
    }
  })
})
