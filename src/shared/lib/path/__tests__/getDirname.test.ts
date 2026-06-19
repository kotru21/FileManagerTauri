import { describe, expect, it } from "vitest"
import { getDirname } from "../getDirname"

describe("getDirname", () => {
  it("returns parent on windows path", () => {
    expect(getDirname("C:/Users/test/file.txt")).toBe("C:/Users/test")
  })

  it("returns / for unix root child", () => {
    expect(getDirname("/file.txt")).toBe("/")
  })

  it("returns empty for empty or slash-less paths", () => {
    expect(getDirname("")).toBe("")
    expect(getDirname("file.txt")).toBe("")
  })

  it("returns parent for nested unix paths", () => {
    expect(getDirname("/home/user/file.txt")).toBe("/home/user")
  })

  it("normalizes backslashes and trailing slashes", () => {
    expect(getDirname("C:\\Users\\test\\file.txt")).toBe("C:/Users/test")
    expect(getDirname("/home/user/")).toBe("/home")
  })
})
