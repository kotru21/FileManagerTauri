import type { Result } from "@/shared/api/tauri"

/**
 * Helper to unwrap Result from tauri-specta
 * Throws if the result contains an error
 */
export function unwrapResult<T, E>(result: Result<T, E>): T {
  if (result.status === "ok") {
    return result.data
  }
  throw new Error(String(result.error))
}

/**
 * Safe unwrap — return null on error
 */
export function unwrapResultOrNull<T, E>(result: Result<T, E>): T | null {
  if (result.status === "ok") {
    return result.data
  }
  return null
}

/**
 * Unwrap Result with a default value
 */
export function unwrapResultOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (result.status === "ok") {
    return result.data
  }
  return defaultValue
}
