import "@testing-library/jest-dom/vitest"
import { act, render, screen } from "@testing-library/react"
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

async function flushPanelLayout() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

describe("Resizable", () => {
  it("renders panel group with handle", async () => {
    render(
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={50}>Left</ResizablePanel>
        <ResizableHandle id="handle" />
        <ResizablePanel defaultSize={50}>Right</ResizablePanel>
      </ResizablePanelGroup>,
    )
    expect(screen.getByText("Left")).toBeInTheDocument()
    expect(screen.getByTestId("handle")).toBeInTheDocument()
    await flushPanelLayout()
  })

  it("renders vertical group and handle with grip", async () => {
    render(
      <ResizablePanelGroup direction="vertical" className="h-64">
        <ResizablePanel defaultSize="40px">Top</ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize="12rem">Bottom</ResizablePanel>
      </ResizablePanelGroup>,
    )
    expect(screen.getByText("Top")).toBeInTheDocument()
    expect(screen.getByText("Bottom")).toBeInTheDocument()
    expect(document.querySelector("[data-separator]")).toBeInTheDocument()
    await flushPanelLayout()
  })

  it("accepts percent strings and collapsed size on panels", async () => {
    render(
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel
          defaultSize="30%"
          minSize="10%"
          maxSize="400px"
          collapsedSize="56px"
          collapsible
        >
          Panel
        </ResizablePanel>
      </ResizablePanelGroup>,
    )
    expect(screen.getByText("Panel")).toBeInTheDocument()
    await flushPanelLayout()
  })
})
