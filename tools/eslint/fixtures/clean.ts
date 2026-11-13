// Trips nothing: an error that is used, one rethrown, and words that only
// look like colours.
export async function clean(work: () => Promise<void>, log: (e: unknown) => void): Promise<void> {
  try {
    await work()
  } catch (error) {
    log(error)
  }
  try {
    await work()
  } catch {
    throw new Error('work failed twice')
  }
  await work().catch((error: unknown) => log(error))
  const issue = 'see issue #12'
  log(issue)
}
