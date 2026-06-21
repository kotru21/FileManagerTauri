import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import DocumentPreview from "../DocumentPreview"

describe("DocumentPreview", () => {
  it("renders heading and paragraph styles", () => {
    render(
      <DocumentPreview
        paragraphs={[
          { style: "heading1", text: "Title" },
          { style: "normal", text: "Body text" },
        ]}
        truncated={false}
      />,
    )
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Title")
    expect(screen.getByText("Body text")).toBeTruthy()
  })

  it("shows truncated notice", () => {
    render(<DocumentPreview paragraphs={[]} truncated={true} />)
    expect(screen.getByText(/обрезано/i)).toBeTruthy()
  })
})
