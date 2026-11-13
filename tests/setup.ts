// Every suite runs in UTC, so a time printed in a test reads the same on any
// machine. Each test that needs a clock starts it at common/test/fixtures.ts's
// START.
process.env.TZ = 'UTC'
