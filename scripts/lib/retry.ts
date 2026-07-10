export async function withRetries<T>(
  operation: () => Promise<T>,
  options: {
    attempts: number
    delayMs: (attempt: number) => number
    shouldRetry: (error: unknown) => boolean
    onRetry?: (error: unknown, attempt: number) => Promise<void> | void
  }
): Promise<T> {
  const attempts = Math.max(1, Math.floor(options.attempts))
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      if (attempt >= attempts || !options.shouldRetry(error)) throw error
      await options.onRetry?.(error, attempt)
      await new Promise(resolve => setTimeout(resolve, Math.max(0, options.delayMs(attempt))))
    }
  }
  throw new Error('Retry loop exhausted unexpectedly.')
}

export function isTransientPrismaError(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
  if (['P1001', 'P1002', 'P1017', 'P2024'].includes(code)) return true
  const message = error instanceof Error ? error.message : String(error)
  return /server has closed the connection|timed out|connection.*closed|can.?t reach database/i.test(message)
}
