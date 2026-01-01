/**
 * Finds the index of the last element in the array that satisfies the predicate.
 * Similar to Array.prototype.findIndex but searches from the end.
 *
 * @param arr - The array to search
 * @param predicate - Function to test each element
 * @returns The index of the last matching element, or -1 if not found
 *
 * @example
 * const files = [{ is_dir: true }, { is_dir: true }, { is_dir: false }]
 * findLastIndex(files, f => f.is_dir) // returns 1
 */
export function findLastIndex<T>(
  arr: T[],
  predicate: (item: T, index: number, array: T[]) => boolean,
): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i], i, arr)) return i
  }
  return -1
}

/**
 * Generates a unique ID using crypto.randomUUID if available,
 * falls back to random string generation.
 *
 * @returns A unique string identifier
 */
export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`
}
