/// <reference types="vitest" />

import "@testing-library/jest-dom/vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { act } from "react"
import { ColumnHeader } from "../ColumnHeader"

describe("ColumnHeader coverage", () => {
  it("sorts by column headers and resizes columns", () => {
    const onSort = vi.fn()
    const onColumnResize = vi.fn()

    const { container } = render(
      <ColumnHeader
        columnWidths={{ size: 90, date: 140, padding: 16 }}
        onColumnResize={onColumnResize}
        sortConfig={{ field: "name", direction: "asc" }}
        onSort={onSort}
        displaySettings={{ showFileSizes: true, showFileDates: true, thumbnailSize: "medium" }}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: /Размер/i }))
    expect(onSort).toHaveBeenCalledWith("size")

    const handles = container.querySelectorAll("[class*='cursor-col-resize']")
    expect(handles.length).toBeGreaterThan(0)

    const handle = handles[0] as HTMLElement
    act(() => {
      fireEvent.mouseDown(handle, { clientX: 100 })
      fireEvent.mouseMove(document, { clientX: 130 })
      fireEvent.mouseUp(document)
    })
    expect(onColumnResize).toHaveBeenCalled()
  })

  it("hides size and date columns based on display settings", () => {
    render(
      <ColumnHeader
        columnWidths={{ size: 90, date: 140, padding: 16 }}
        onColumnResize={vi.fn()}
        sortConfig={{ field: "name", direction: "desc" }}
        onSort={vi.fn()}
        displaySettings={{ showFileSizes: false, showFileDates: false, thumbnailSize: "small" }}
      />,
    )

    expect(screen.queryByRole("button", { name: /Размер/i })).toBeNull()
    expect(screen.queryByRole("button", { name: /Изменён/i })).toBeNull()
    expect(screen.getByRole("button", { name: /Имя/i })).toBeInTheDocument()
  })

  it("resets width on resize handle double click", () => {
    const onColumnResize = vi.fn()
    const { container } = render(
      <ColumnHeader
        columnWidths={{ size: 120, date: 160, padding: 20 }}
        onColumnResize={onColumnResize}
        sortConfig={{ field: "modified", direction: "asc" }}
        onSort={vi.fn()}
        displaySettings={{ showFileSizes: true, showFileDates: false }}
      />,
    )

    const handle = container.querySelector("[class*='cursor-col-resize']") as HTMLElement
    fireEvent.doubleClick(handle)
    expect(onColumnResize).toHaveBeenCalledWith("size", 90)
  })
})
