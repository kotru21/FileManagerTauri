import { describe, expect, it, vi } from "vitest"
import { invalidateAffectedDirectories } from "../invalidateDirectory"

describe("invalidateAffectedDirectories", () => {
  it("invalidates source and destination directory keys", () => {
    const queryClient = {
      invalidateQueries: vi.fn(),
    }
    invalidateAffectedDirectories(queryClient as never, {
      paths: ["C:/src/a.txt", "C:/src/b.txt"],
      destination: "C:/dest",
    })
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(2)
  })
})
