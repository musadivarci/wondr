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

      // A stale access token can produce a short burst of 401 responses after
      // the app has been idle. Refresh once before retrying the cloud reads.
      if (attempt === 0) {
        try {
          await client.auth.refreshSession()
        } catch {
          // Network may itself be transient; the timed retries below still run.
        }
      }

      await wait(retryDelays[attempt])
    }
  }

  throw lastError
}
