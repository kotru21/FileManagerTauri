import { describe, expect, it } from "vitest"
import { getDirname } from "../getDirname"

describe("getDirname", () => {
  it("returns parent on windows path", () => {
    expect(getDirname("C:/Users/test/file.txt")).toBe("C:/Users/test")
  })
  it("returns / for unix root child", () => {
    expect(getDirname("/file.txt")).toBe("/")
  })
})
