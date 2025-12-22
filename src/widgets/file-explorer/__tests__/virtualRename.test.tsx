/// <reference types="vitest" />
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useInlineEditStore } from "@/features/inline-edit"
import type { FileEntry } from "@/shared/api/tauri"
import { FileExplorerSimpleList } from "@/widgets/file-explorer/ui/FileExplorerSimpleList"
import { VirtualFileList } from "@/widgets/file-explorer/ui/VirtualFileList"

const files: FileEntry[] = [
  {
    path: "/file1.txt",
    name: "file1.txt",
    is_dir: false,
    size: 10,
    modified: Date.now(),
    created: null,
    is_hidden: false,
    extension: "txt",
  },
]

describe("VirtualFileList rename flow", () => {
  it("starts rename and calls onRename when confirmed", async () => {
    const onRename = vi.fn()
    const onSelect = vi.fn()
    const onOpen = vi.fn()

    // Render list
    render(
      <VirtualFileList
        files={files}
        selectedPaths={new Set()}
        onSelect={onSelect}
        onOpen={onOpen}
        onRename={onRename}
      />,
    )

    // Start rename via store
    act(() => {
      useInlineEditStore.getState().startRename("/file1.txt")
    })

    // Wait for input to appear (may be delayed due to virtualization)
    const input = await screen.findByDisplayValue("file1.txt", {}, { timeout: 2000 })
    expect(input).toBeTruthy()

    // Change value
    await act(async () => {
      fireEvent.change(input, { target: { value: "newname.txt" } })
    })

    // Press Enter
    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" })
    })

    // onRename should have been called with old path and new name
    expect(onRename).toHaveBeenCalledWith("/file1.txt", "newname.txt")

    // Inline edit should be reset
    await waitFor(() => {
      const s = useInlineEditStore.getState()
      expect(s.mode).toBeNull()
      expect(s.targetPath).toBeNull()
    })
  })

  it("works in SimpleList (no virtualization)", async () => {
    const onRename = vi.fn()
    render(
      <FileExplorerSimpleList
        files={files}
        selectedPaths={new Set()}
        handlers={{
          handleSelect: () => {},
          handleOpen: () => {},
          handleDrop: () => {},
          handleCreateFolder: () => {},
          handleCreateFile: () => {},
          handleRename: (oldPath: string, newName: string) => onRename(oldPath, newName),
          handleCopy: () => {},
          handleCut: () => {},
          handlePaste: () => {},
          handleDelete: () => {},
          handleStartNewFolder: () => {},
          handleStartNewFile: () => {},
          handleStartRenameAt: () => {},
        }}
        showColumnHeadersInSimpleList={false}
        columnWidths={{ size: 100, date: 180, padding: 8 }}
        setColumnWidth={() => {}}
        displaySettings={{
          showFileExtensions: true,
          showFileSizes: true,
          showFileDates: true,
          showHiddenFiles: false,
          dateFormat: "relative",
          thumbnailSize: "medium",
        }}
        appearanceLocal={{
          theme: "system",
          fontSize: "medium",
          accentColor: "#0ea5e9",
          enableAnimations: true,
          reducedMotion: true,
        }}
      />,
    )

    // Start rename via store
    act(() => {
      useInlineEditStore.getState().startRename("/file1.txt")
    })

    const input = await screen.findByDisplayValue("file1.txt")
    expect(input).toBeTruthy()

    await act(async () => {
      fireEvent.change(input, { target: { value: "newname.txt" } })
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" })
    })

    expect(onRename).toHaveBeenCalledWith("/file1.txt", "newname.txt")
  })
})
