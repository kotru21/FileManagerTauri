import { describe, expect, it } from "vitest"

import * as lib from "../index"

describe("shared/lib/index", () => {
  it("re-exports core helpers", () => {
    expect(typeof lib.findLastIndex).toBe("function")
    expect(typeof lib.generateId).toBe("function")
    expect(typeof lib.cn).toBe("function")
    expect(typeof lib.formatBytes).toBe("function")
    expect(typeof lib.formatDate).toBe("function")
    expect(typeof lib.normalizePathForComparison).toBe("function")
    expect(typeof lib.toForwardSlashes).toBe("function")
  })
})
