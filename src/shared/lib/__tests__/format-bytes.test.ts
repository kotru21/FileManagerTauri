import { describe, expect, it } from "vitest"
import { formatBytes } from "../format-bytes"

describe("formatBytes", () => {
  it("should return '0 B' for 0 bytes", () => {
    expect(formatBytes(0)).toBe("0 B")
  })

  it("should format bytes correctly", () => {
    expect(formatBytes(500)).toBe("500 B")
    expect(formatBytes(1023)).toBe("1023 B")
  })

  it("should format kilobytes correctly", () => {
    expect(formatBytes(1024)).toBe("1.0 KB")
    expect(formatBytes(1536)).toBe("1.5 KB")
    expect(formatBytes(10240)).toBe("10.0 KB")
  })

  it("should format megabytes correctly", () => {
    expect(formatBytes(1048576)).toBe("1.0 MB")
    expect(formatBytes(1572864)).toBe("1.5 MB")
    expect(formatBytes(10485760)).toBe("10.0 MB")
  })

  it("should format gigabytes correctly", () => {
    expect(formatBytes(1073741824)).toBe("1.0 GB")
    expect(formatBytes(1610612736)).toBe("1.5 GB")
  })

  it("should format terabytes correctly", () => {
    expect(formatBytes(1099511627776)).toBe("1.0 TB")
  })

  it("should respect decimals parameter", () => {
    expect(formatBytes(1536, 0)).toBe("2 KB")
    expect(formatBytes(1536, 2)).toBe("1.50 KB")
    expect(formatBytes(1536, 3)).toBe("1.500 KB")
  })

  it("should handle negative bytes", () => {
    expect(formatBytes(-1024)).toBe("-1.0 KB")
  })

  it("should handle very large numbers", () => {
    expect(formatBytes(1125899906842624)).toBe("1.0 PB")
  })
})