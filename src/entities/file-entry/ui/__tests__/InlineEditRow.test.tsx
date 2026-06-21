import "@testing-library/jest-dom/vitest"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { InlineEditRow } from "../InlineEditRow"

describe("InlineEditRow", () => {
  it("rename mode selects filename without extension", async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
      <InlineEditRow
        mode="rename"
        initialName="document.txt"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )
    const input = screen.getByRole("textbox")
    expect(input).toHaveValue("document.txt")
    await act(async () => {
      fireEvent.change(input, { target: { value: "renamed.txt" } })
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" })
    })
    expect(onConfirm).toHaveBeenCalledWith("renamed.txt")
  })

  it("shows validation error for empty name", async () => {
    render(<InlineEditRow mode="new-file" onConfirm={vi.fn()} onCancel={vi.fn()} />)
    const input = screen.getByRole("textbox")
    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" })
    })
    expect(screen.getByText(/не может быть пустым/i)).toBeInTheDocument()
  })
})
