export type PerfPayload = Record<string, unknown>

export function withPerf<T>(
  label: string,
  payload: PerfPayload | null,
  fn: () => Promise<T>,
): Promise<T> {
  const start = performance.now()
  return fn()
    .then((result) => {
      const duration = performance.now() - start
      try {
        console.debug(`[perf] ${label}`, { ...(payload ?? {}), duration })
      } catch {
        /* ignore */
      }
      return result
    })
    .catch((err) => {
      const duration = performance.now() - start
      try {
        console.debug(`[perf] ${label}`, { ...(payload ?? {}), duration, error: String(err) })
      } catch {
        /* ignore */
      }
      throw err
    })
}

export function withPerfSync<T>(label: string, payload: PerfPayload | null, fn: () => T): T {
  const start = performance.now()
  try {
    const result = fn()
    const duration = performance.now() - start
    try {
      console.debug(`[perf] ${label}`, { ...(payload ?? {}), duration })
    } catch {
      /* ignore */
    }
    return result
  } catch (err) {
    const duration = performance.now() - start
    try {
      console.debug(`[perf] ${label}`, { ...(payload ?? {}), duration, error: String(err) })
    } catch {
      /* ignore */
    }
    throw err
  }
}

export function markPerf(label: string, payload: PerfPayload | null) {
  try {
    console.debug(`[perf] ${label}`, payload ?? {})
  } catch {
    /* ignore */
  }
}
