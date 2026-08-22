import type { SupabaseClient } from '@supabase/supabase-js'

const retryDelays = [350, 900, 1800]

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export async function withCloudRetry<T>(client: SupabaseClient, operation: () => Promise<T>): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (attempt === retryDelays.length) break

      if (attempt === 0) {
        try {
          await client.auth.refreshSession()
        } catch {
          // The network itself may be transient; timed retries still continue.
        }
      }

      await wait(retryDelays[attempt])
    }
  }

  throw lastError
}
