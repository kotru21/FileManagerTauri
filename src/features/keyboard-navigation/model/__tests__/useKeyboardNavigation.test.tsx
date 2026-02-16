import { act, fireEvent, render } from "@testing-library/react"
import type { FileEntry } from "@/shared/api/tauri"
import { useKeyboardNavigation } from "../useKeyboardNavigation"

function makeFile(name: string, isDir = false): FileEntry {
  return {
    name,
    path: `/${name}`,
    is_dir: isDir,
    size: 100,
    modified: 1704067200,
    created: 1704067200,
    is_hidden: false,
    extension: isDir ? null : "txt",
  }
}

interface TestProps {
  files: FileEntry[]
  selectedPaths?: Set<string>
  onSelect?: (path: string, e: { ctrlKey?: boolean; shiftKey?: boolean }) => void
  onOpen?: (path: string, isDir: boolean) => void
  enabled?: boolean
}

function TestComponent({
  files,
  selectedPaths = new Set(),
  onSelect = vi.fn(),
  onOpen = vi.fn(),
  enabled = true,
}: TestProps) {
  const { focusedIndex } = useKeyboardNavigation({
    files,
    selectedPaths,
    onSelect,
    onOpen,
    enabled,
  })
  return <div data-testid="focused">{focusedIndex}</div>
}

function getFocusedIndex(container: HTMLElement): number {
  return Number(container.querySelector('[data-testid="focused"]')!.textContent)
}

function pressKey(key: string) {
  act(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }))
  })
}

describe("useKeyboardNavigation", () => {
  const files = [makeFile("a.txt"), makeFile("b.txt"), makeFile("dir1", true), makeFile("c.txt")]

  describe("ArrowDown", () => {
    it("advances focusedIndex from -1 to 0", () => {
      const onSelect = vi.fn()
      const { container } = render(<TestComponent files={files} onSelect={onSelect} />)

      pressKey("ArrowDown")

      expect(getFocusedIndex(container)).toBe(0)
      expect(onSelect).toHaveBeenCalledWith("/a.txt", expect.objectContaining({}))
    })

    it("does not go past the last file", () => {
      const onSelect = vi.fn()
      const { container } = render(
        <TestComponent files={files} selectedPaths={new Set(["/c.txt"])} onSelect={onSelect} />,
      )

      pressKey("ArrowDown")

      expect(getFocusedIndex(container)).toBe(3)
    })
  })

  describe("ArrowUp", () => {
    it("decrements focusedIndex", () => {
      const onSelect = vi.fn()
      const { container } = render(
        <TestComponent files={files} selectedPaths={new Set(["/b.txt"])} onSelect={onSelect} />,
      )

      pressKey("ArrowUp")

      expect(getFocusedIndex(container)).toBe(0)
      expect(onSelect).toHaveBeenCalledWith("/a.txt", expect.objectContaining({}))
    })

    it("does not go below 0", () => {
      const onSelect = vi.fn()
      const { container } = render(
        <TestComponent files={files} selectedPaths={new Set(["/a.txt"])} onSelect={onSelect} />,
      )

      pressKey("ArrowUp")

      expect(getFocusedIndex(container)).toBe(0)
    })
  })

  describe("Home", () => {
    it("jumps to the first file", () => {
      const onSelect = vi.fn()
      const { container } = render(
        <TestComponent files={files} selectedPaths={new Set(["/c.txt"])} onSelect={onSelect} />,
      )

      pressKey("Home")

      expect(getFocusedIndex(container)).toBe(0)
      expect(onSelect).toHaveBeenCalledWith("/a.txt", expect.objectContaining({}))
    })
  })

  describe("End", () => {
    it("jumps to the last file", () => {
      const onSelect = vi.fn()
      const { container } = render(
        <TestComponent files={files} selectedPaths={new Set(["/a.txt"])} onSelect={onSelect} />,
      )

      pressKey("End")

      expect(getFocusedIndex(container)).toBe(3)
      expect(onSelect).toHaveBeenCalledWith("/c.txt", expect.objectContaining({}))
    })
  })

  describe("Enter", () => {
    it("calls onOpen for the focused file", () => {
      const onOpen = vi.fn()
      render(<TestComponent files={files} selectedPaths={new Set(["/dir1"])} onOpen={onOpen} />)

      pressKey("Enter")

      expect(onOpen).toHaveBeenCalledWith("/dir1", true)
    })

    it("does nothing when focusedIndex is -1", () => {
      const onOpen = vi.fn()
      render(<TestComponent files={files} onOpen={onOpen} />)

      pressKey("Enter")

      expect(onOpen).not.toHaveBeenCalled()
    })
  })

  describe("PageDown", () => {
    it("advances by 10 items", () => {
      const manyFiles = Array.from({ length: 20 }, (_, i) => makeFile(`file${i}.txt`))
      const onSelect = vi.fn()
      const { container } = render(
        <TestComponent
          files={manyFiles}
          selectedPaths={new Set(["/file0.txt"])}
          onSelect={onSelect}
        />,
      )

      pressKey("PageDown")

      expect(getFocusedIndex(container)).toBe(10)
    })

    it("clamps to last file if less than 10 remain", () => {
      const onSelect = vi.fn()
      const { container } = render(
        <TestComponent files={files} selectedPaths={new Set(["/b.txt"])} onSelect={onSelect} />,
      )

      pressKey("PageDown")

      expect(getFocusedIndex(container)).toBe(3)
    })
  })

  describe("PageUp", () => {
    it("goes back by 10 items", () => {
      const manyFiles = Array.from({ length: 20 }, (_, i) => makeFile(`file${i}.txt`))
      const onSelect = vi.fn()
      const { container } = render(
        <TestComponent
          files={manyFiles}
          selectedPaths={new Set(["/file15.txt"])}
          onSelect={onSelect}
        />,
      )

      pressKey("PageUp")

      expect(getFocusedIndex(container)).toBe(5)
    })

    it("clamps to 0 if less than 10 items before", () => {
      const onSelect = vi.fn()
      const { container } = render(
        <TestComponent files={files} selectedPaths={new Set(["/b.txt"])} onSelect={onSelect} />,
      )

      pressKey("PageUp")

      expect(getFocusedIndex(container)).toBe(0)
    })
  })

  describe("enabled flag", () => {
    it("ignores keydown events when enabled is false", () => {
      const onSelect = vi.fn()
      render(<TestComponent files={files} enabled={false} onSelect={onSelect} />)

      pressKey("ArrowDown")

      expect(onSelect).not.toHaveBeenCalled()
    })
  })

  describe("input element filtering", () => {
    it("ignores keydown events originating from INPUT elements", () => {
      const onSelect = vi.fn()
      const { container } = render(
        <>
          <input data-testid="input" />
          <TestComponent files={files} onSelect={onSelect} />
        </>,
      )
      const input = container.querySelector("input")!

      act(() => {
        fireEvent.keyDown(input, { key: "ArrowDown" })
      })

      expect(onSelect).not.toHaveBeenCalled()
    })
  })

  describe("empty files", () => {
    it("resets focusedIndex to -1 when files become empty", () => {
      const { container, rerender } = render(
        <TestComponent files={files} selectedPaths={new Set(["/a.txt"])} />,
      )

      expect(getFocusedIndex(container)).toBe(0)

      rerender(<TestComponent files={[]} />)

      expect(getFocusedIndex(container)).toBe(-1)
    })
  })

  describe("selectedPaths sync", () => {
    it("syncs focusedIndex to the last selected path", () => {
      const { container } = render(
        <TestComponent files={files} selectedPaths={new Set(["/dir1"])} />,
      )

      expect(getFocusedIndex(container)).toBe(2)
    })
  })
})
