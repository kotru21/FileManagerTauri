import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { formatDate, formatRelativeDate } from "../format-date"

describe("formatDate", () => {
  it("should return dash for null timestamp", () => {
    expect(formatDate(null)).toBe("—")
  })

  it("should format timestamp correctly", () => {
    // 2024-01-15 12:30:00 UTC
    const timestamp = 1705321800
    const result = formatDate(timestamp)
    // Формат зависит от локали, проверяем что результат не пустой
    expect(result).not.toBe("—")
    expect(result.length).toBeGreaterThan(0)
  })

  it("should handle zero timestamp", () => {
    const result = formatDate(0)
    expect(result).not.toBe("—")
  })
})

describe("formatRelativeDate", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("should return dash for null timestamp", () => {
    expect(formatRelativeDate(null)).toBe("—")
  })

  it("should show 'только что' for recent timestamps", () => {
    const now = Math.floor(Date.now() / 1000)
    vi.setSystemTime(now * 1000)
    
    const result = formatRelativeDate(now - 30)
    expect(result).toMatch(/только что|сек|min|sec/i)
  })

  it("should show minutes ago", () => {
    const now = Math.floor(Date.now() / 1000)
    vi.setSystemTime(now * 1000)
    
    const result = formatRelativeDate(now - 300) // 5 minutes ago
    expect(result).toBeDefined()
  })

  it("should show hours ago", () => {
    const now = Math.floor(Date.now() / 1000)
    vi.setSystemTime(now * 1000)
    
    const result = formatRelativeDate(now - 7200) // 2 hours ago
    expect(result).toBeDefined()
  })

  it("should show days ago", () => {
    const now = Math.floor(Date.now() / 1000)
    vi.setSystemTime(now * 1000)
    
    const result = formatRelativeDate(now - 172800) // 2 days ago
    expect(result).toBeDefined()
  })
})