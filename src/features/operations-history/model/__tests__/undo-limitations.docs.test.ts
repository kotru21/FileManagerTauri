/// <reference types="vitest" />
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

describe("README undo limitations", () => {
  const readme = readFileSync(resolve(__dirname, "../../../../../README.md"), "utf-8")

  it("documents which operations support undo", () => {
    expect(readme).toContain("### Undo (текущие ограничения)")
    expect(readme).toContain("| rename   | ✅")
    expect(readme).toContain("| move     | ✅")
    expect(readme).toContain("| create   | ✅")
    expect(readme).toContain("| copy     | ❌")
    expect(readme).toContain("| delete   | ❌")
  })
})
