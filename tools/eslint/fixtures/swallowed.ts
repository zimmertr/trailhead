export async function swallowed(work: () => Promise<void>): Promise<string> {
  try {
    await work()
  } catch {
    return 'fine'
  }
  try {
    await work()
  } catch (_error) {
    return 'also fine'
  }
  await work().catch(() => undefined)
  return 'done'
}
