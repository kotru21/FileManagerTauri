import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { FileEntry } from "@/shared/api/tauri"
import { TooltipProvider } from "@/shared/ui"
import { FileExplorerView } from "@/widgets/file-explorer/ui/FileExplorer.view"

function makeFiles(n: number): FileEntry[] {
  return Array.from({ length: n }).map((_, i) => ({
    path: `/file${i}`,
    name: `file${i}`,
    is_dir: false,
    is_hidden: false,
    size: 0,
    modified: 0,
    created: 0,
    extension: null,
  }))
}

import type { FileExplorerHandlers } from "@/widgets/file-explorer/ui/types"

const defaultHandlers: FileExplorerHandlers = {
  handleSelect: () => {},
  handleOpen: () => {},
  handleDrop: () => {},
  handleCreateFolder: () => {},
  handleCreateFile: () => {},
  handleRename: () => {},
  handleCopy: () => {},
  handleCut: () => {},
  handlePaste: () => {},
  handleDelete: () => {},
  handleStartNewFolder: () => {},
  handleStartNewFile: () => {},
  handleStartRenameAt: () => {},
}

describe("Performance: virtualListThreshold", () => {
  it("renders SimpleList when files.length < threshold", () => {
    const files = makeFiles(3)
    const { container } = render(
      <TooltipProvider>
        <FileExplorerView
          isLoading={false}
          files={files}
          processedFilesCount={files.length}
          selectedPaths={new Set()}
          handlers={defaultHandlers}
          viewMode="list"
          showColumnHeadersInSimpleList={false}
          columnWidths={{ size: 200, date: 140, padding: 16 }}
          setColumnWidth={() => {}}
          performanceThreshold={5}
          displaySettings={{
            showHiddenFiles: false,
            showFileSizes: false,
            showFileDates: false,
            showFileExtensions: true,
            dateFormat: "relative",
            thumbnailSize: "medium",
          }}
          appearance={{
            theme: "system",
            fontSize: "medium",
            accentColor: "#3b82f6",
            enableAnimations: true,
            reducedMotion: false,
          }}
          performanceSettings={{ lazyLoadImages: true, thumbnailCacheSize: 100 }}
        />
      </TooltipProvider>,
    )

    const rows = container.querySelectorAll('[data-testid^="file-row-"]')
    expect(rows.length).toBe(files.length)
  })

  it("renders VirtualList when files.length >= threshold", () => {
    const files = makeFiles(100)
    const { container } = render(
      <TooltipProvider>
        <FileExplorerView
          isLoading={false}
          files={files}
          processedFilesCount={files.length}
          selectedPaths={new Set()}
          handlers={defaultHandlers}
          viewMode="list"
          showColumnHeadersInSimpleList={false}
          columnWidths={{ size: 200, date: 140, padding: 16 }}
          setColumnWidth={() => {}}
          performanceThreshold={10}
          displaySettings={{
            showHiddenFiles: false,
            showFileSizes: false,
            showFileDates: false,
            showFileExtensions: true,
            dateFormat: "relative",
            thumbnailSize: "medium",
          }}
          appearance={{
            theme: "system",
            fontSize: "medium",
            accentColor: "#3b82f6",
            enableAnimations: true,
            reducedMotion: false,
          }}
          performanceSettings={{ lazyLoadImages: true, thumbnailCacheSize: 100 }}
        />
      </TooltipProvider>,
    )

    const rows = container.querySelectorAll('[data-testid^="file-row-"]')
    // Virtualizer should render fewer DOM nodes than total files
    expect(rows.length).toBeLessThan(files.length)
  })
})
