/**
 * Returns a promise that resolves after a set duration, in milliseconds.
 */
export async function sleep(timeoutMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, timeoutMs));
}
