import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { formatDate, formatRelativeDate } from "../format-date"

describe("formatDate", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // 2024-01-15 12:30:00 UTC
    vi.setSystemTime(new Date("2024-01-15T12:30:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("should return dash for null timestamp", () => {
    expect(formatDate(null)).toBe("—")
  })

  it("should format timestamp correctly", () => {
    const timestamp = new Date("2024-01-15T10:00:00Z").getTime() / 1000
    const result = formatDate(timestamp)
    // Format depends on locale, just check it's not empty
    expect(result).not.toBe("")
    expect(result).not.toBe("—")
  })

  it("should handle zero timestamp as invalid", () => {
    // In file systems, 0 often means "unknown date"
    const result = formatDate(0)
    expect(result).toBe("—")
  })
})

describe("formatRelativeDate", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-01-15T12:30:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("should return dash for null timestamp", () => {
    expect(formatRelativeDate(null)).toBe("—")
  })

  it("should show 'только что' for recent timestamps", () => {
    const now = Math.floor(Date.now() / 1000)
    expect(formatRelativeDate(now)).toBe("только что")
    expect(formatRelativeDate(now - 30)).toBe("только что")
  })

  it("should show minutes ago", () => {
    const now = Math.floor(Date.now() / 1000)
    const result = formatRelativeDate(now - 300) // 5 minutes ago
    expect(result).toContain("мин")
  })

  it("should show hours ago", () => {
    const now = Math.floor(Date.now() / 1000)
    const result = formatRelativeDate(now - 7200) // 2 hours ago
    // Uses abbreviated format "ч." instead of full "час"
    expect(result).toContain("ч")
  })

  it("should show days ago", () => {
    const now = Math.floor(Date.now() / 1000)
    const result = formatRelativeDate(now - 172800) // 2 days ago
    expect(result).toContain("дн")
  })
})
