import "@testing-library/jest-dom/vitest"
import { render, screen } from "@testing-library/react"
import { beforeAll, describe, expect, it } from "vitest"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../Resizable"

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver
})

describe("Resizable", () => {
  it("renders panel group with handle", () => {
    render(
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={50}>Left</ResizablePanel>
        <ResizableHandle id="handle" />
        <ResizablePanel defaultSize={50}>Right</ResizablePanel>
      </ResizablePanelGroup>,
    )
    expect(screen.getByText("Left")).toBeInTheDocument()
    expect(screen.getByTestId("handle")).toBeInTheDocument()
  })
})
