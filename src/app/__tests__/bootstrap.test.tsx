import "@testing-library/jest-dom/vitest"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/pages", () => ({
  FileBrowserPage: () => <div data-testid="file-browser-page">FileBrowser</div>,
}))

vi.mock("@/features/settings", () => ({
  useApplyAppearance: () => {},
}))

import { QueryProvider } from "../providers/QueryProvider"

describe("app bootstrap", () => {
  it("QueryProvider renders children without crash", () => {
    render(
      <QueryProvider>
        <div data-testid="child">ok</div>
      </QueryProvider>,
    )
    expect(screen.getByTestId("child")).toBeInTheDocument()
  })
})
