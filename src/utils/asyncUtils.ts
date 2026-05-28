export function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMsg?: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMsg || `Timed out after ${ms}ms`)), ms)
    )
  ]);
}
