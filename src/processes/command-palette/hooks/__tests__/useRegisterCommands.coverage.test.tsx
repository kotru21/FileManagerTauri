import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useRegisterCommands } from "../useRegisterCommands"

vi.mock("@/features/command-palette", () => ({
  useCommandPaletteStore: () => ({
    registerCommands: vi.fn(),
    unregisterCommands: vi.fn(),
  }),
}))
vi.mock("@/features/navigation", () => ({
  useNavigationStore: () => ({
    currentPath: "C:/",
    goBack: vi.fn(),
    goForward: vi.fn(),
    goUp: vi.fn(),
  }),
}))
vi.mock("@/features/clipboard", () => ({ useClipboardStore: () => ({ copy: vi.fn(), cut: vi.fn() }) }))
vi.mock("@/features/file-selection", () => ({
  useSelectionStore: () => ({ getSelectedPaths: () => [], clearSelection: vi.fn() }),
}))
vi.mock("@/features/inline-edit", () => ({
  useInlineEditStore: () => ({ startNewFolder: vi.fn(), startNewFile: vi.fn() }),
}))
vi.mock("@/features/view-mode", () => ({ useViewModeStore: () => ({ setViewMode: vi.fn() }) }))
vi.mock("@/features/quick-filter", () => ({ useQuickFilterStore: () => ({ toggle: vi.fn() }) }))
vi.mock("@/features/bookmarks", () => ({
  useBookmarksStore: () => ({
    isBookmarked: () => false,
    addBookmark: vi.fn(),
    removeBookmark: vi.fn(),
    getBookmarkByPath: () => null,
  }),
}))
vi.mock("@/entities/app-settings", () => ({
  useFileDisplaySettings: () => ({ showHiddenFiles: false }),
  useSettingsStore: (sel: (s: { updateFileDisplay: () => void }) => unknown) =>
    sel({ updateFileDisplay: vi.fn() }),
}))

describe("useRegisterCommands coverage", () => {
  it("mounts without error", () => {
    expect(() =>
      renderHook(() =>
        useRegisterCommands({
          onRefresh: vi.fn(),
          onDelete: vi.fn(),
          onOpenSettings: vi.fn(),
        }),
      ),
    ).not.toThrow()
  })
})
