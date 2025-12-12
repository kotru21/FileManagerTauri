import type { Result } from "@/shared/api/tauri"

/**
 * Хелпер для распаковки Result из tauri-specta
 * Выбрасывает исключение если result содержит ошибку
 */
export function unwrapResult<T, E>(result: Result<T, E>): T {
  if (result.status === "ok") {
    return result.data
  }
  throw new Error(String(result.error))
}

/**
 * Безопасная распаковка Result - возвращает null при ошибке
 */
export function unwrapResultOrNull<T, E>(result: Result<T, E>): T | null {
  if (result.status === "ok") {
    return result.data
  }
  return null
}

/**
 * Распаковка Result с дефолтным значением
 */
export function unwrapResultOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (result.status === "ok") {
    return result.data
  }
  return defaultValue
}
