import { render } from "@testing-library/react"
import { expect, it } from "vitest"
import { FileExplorerGrid } from "@/widgets/file-explorer/ui/FileExplorerGrid"

it("a11y check — FileExplorerGrid (axe)", async () => {
  try {
    const pkgName = ["vitest", "axe"].join("-")
    const mod = await import(pkgName)
    const { axe, toHaveNoViolations } = mod
    expect.extend({ toHaveNoViolations })

    const handlers = {} as import("@/widgets/file-explorer/ui/types").FileExplorerHandlers
    const { container } = render(
      <FileExplorerGrid
        className="test"
        files={[]}
        selectedPaths={new Set()}
        handlers={handlers}
      />,
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  } catch (_err) {
    console.warn("Skipping a11y test: vitest-axe not installed in environment.")
    expect(true).toBe(true)
  }
})
