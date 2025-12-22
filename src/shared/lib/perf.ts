export type PerfPayload = Record<string, unknown>

function parseBoolLike(value: unknown): boolean | undefined {
  if (value === undefined || value === null) return undefined
  const s = String(value).toLowerCase()
  if (s === "false" || s === "0" || s === "off" || s === "no") return false
  if (s === "true" || s === "1" || s === "on" || s === "yes") return true
  return undefined
}

export function isPerfEnabled(): boolean {
  try {
    // global override (runtime toggle)
    const globalPerf = (globalThis as unknown as { __fm_perfEnabled?: boolean }).__fm_perfEnabled
    if (globalPerf !== undefined) return Boolean(globalPerf)

    // Vite env on the client: import.meta.env.VITE_USE_PERF_LOGS
    const metaEnv =
      typeof import.meta !== "undefined"
        ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env
        : undefined
    const v = metaEnv?.VITE_USE_PERF_LOGS
    const parsedMeta = parseBoolLike(v)
    if (parsedMeta !== undefined) return parsedMeta

    // Node env used in tests/CI
    const proc = (
      globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }
    ).process
    const p = proc?.env?.USE_PERF_LOGS
    const parsedProc = parseBoolLike(p)
    if (parsedProc !== undefined) return parsedProc
  } catch {
    // fallthrough
  }
  return true
}

export function withPerf<T>(
  label: string,
  payload: PerfPayload | null,
  fn: () => Promise<T>,
): Promise<T> {
  if (!isPerfEnabled()) return fn()
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
  if (!isPerfEnabled()) return fn()
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
  if (!isPerfEnabled()) return
  try {
    console.debug(`[perf] ${label}`, payload ?? {})
  } catch {
    /* ignore */
  }
}
