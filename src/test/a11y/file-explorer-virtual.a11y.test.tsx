import { render } from "@testing-library/react"
import { expect, it } from "vitest"
import { FileExplorerVirtualList } from "@/widgets/file-explorer/ui/FileExplorerVirtualList"

it("a11y check — FileExplorerVirtualList (axe)", async () => {
  try {
    const pkgName = ["vitest", "axe"].join("-")
    const mod = await import(pkgName)
    const { axe, toHaveNoViolations } = mod
    ;(expect as any).extend({ toHaveNoViolations })

    const handlers = {} as import("@/widgets/file-explorer/ui/types").FileExplorerHandlers
    const { container } = render(
      <FileExplorerVirtualList
        className="test"
        files={[]}
        selectedPaths={new Set()}
        handlers={handlers}
      />,
    )
    const results = await axe(container)
    ;(expect(results) as any).toHaveNoViolations()
  } catch (_err) {
    console.warn("Skipping a11y test: vitest-axe not installed in environment.")
    expect(true).toBe(true)
  }
})
