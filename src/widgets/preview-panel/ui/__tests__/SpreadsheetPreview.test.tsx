import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import SpreadsheetPreview from "../SpreadsheetPreview"

const sheets = [
  {
    name: "Sheet1",
    headers: ["A", "B"],
    rows: [["1", "2"]],
    total_rows: 1,
    truncated: false,
  },
  {
    name: "Sheet2",
    headers: ["X"],
    rows: [["y"]],
    total_rows: 1,
    truncated: false,
  },
]

describe("SpreadsheetPreview", () => {
  it("renders empty state", () => {
    render(<SpreadsheetPreview sheets={[]} />)
    expect(screen.getByText(/Пустая таблица/i)).toBeTruthy()
  })

  it("switches sheet tabs", () => {
    render(<SpreadsheetPreview sheets={sheets} />)
    expect(screen.getByText("1")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Sheet2" }))
    expect(screen.getByText("y")).toBeTruthy()
  })
})
