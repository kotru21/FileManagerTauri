import { fireEvent, render, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { FileRow } from "@/entities/file-entry/ui/FileRow"
import { useFileDisplaySettings, useSettingsStore } from "@/features/settings"
import { FileDisplaySettings } from "@/features/settings/ui/FileDisplaySettings"
import type { FileEntry } from "@/shared/api/tauri"

function Combined({ file }: { file: FileEntry }) {
  const displaySettings = useFileDisplaySettings()
  return (
    <div>
      <FileDisplaySettings />
      <FileRow
        file={file}
        isSelected={false}
        onSelect={() => {}}
        onOpen={() => {}}
        displaySettings={displaySettings}
        appearance={{ reducedMotion: false }}
      />
    </div>
  )
}

describe("FileDisplaySettings integration", () => {
  beforeEach(() => {
    // reset settings to ensure test isolation
    useSettingsStore.getState().resetSettings()
  })
  it("toggle 'Расширения файлов' updates store and FileRow re-renders accordingly", async () => {
    const file = {
      path: "/f",
      name: "file.txt",
      is_dir: false,
      is_hidden: false,
      extension: "txt",
      size: 0,
      modified: Math.floor(Date.now() / 1000),
      created: null,
    }

    const { getByRole, container } = render(<Combined file={file} />)

    // Ensure initial shows extension
    await waitFor(() => {
      expect(container.textContent).toContain("file.txt")
    })

    // Click toggle to hide extensions. Find the toggle by label text "Расширения файлов"
    const toggle = getByRole("switch", { name: /Расширения файлов/i })
    fireEvent.click(toggle)

    // Now FileRow should update to show name without extension
    await waitFor(() => {
      expect(container.textContent).toContain("file")
      expect(container.textContent).not.toContain("file.txt")
    })
  })

  it("changing date format update reflects in FileRow date display", async () => {
    const nowSec = Math.floor(Date.now() / 1000)
    const file = {
      path: "/f",
      name: "f.txt",
      is_dir: false,
      is_hidden: false,
      extension: "txt",
      size: 0,
      modified: nowSec,
      created: null,
    }

    const { getByText, container } = render(<Combined file={file} />)

    // Initially dateFormat default is 'auto' which may render relative
    await waitFor(() => {
      const t = container.textContent ?? ""
      expect(/(только|мин\.|\d{2}\.\d{2}\.\d{4})/.test(t)).toBeTruthy()
    })

    // Click the 'Абсолютная' button
    const absBtn = getByText("Абсолютная")
    fireEvent.click(absBtn)

    // Expect absolute date format
    await waitFor(() => {
      const t = container.textContent ?? ""
      expect(/\d{2}\.\d{2}\.\d{4}/.test(t)).toBeTruthy()
    })
  })
})
