import { fireEvent, render, waitFor } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it } from "vitest"
import { FileRow } from "../FileRow"

const nowSec = Math.floor(Date.now() / 1000)
const defaultAppearance = { reducedMotion: false }

type TestFileEntry = {
  path: string
  name: string
  is_dir: boolean
  is_hidden: boolean
  extension: string | null
  size: number
  modified: number | null
  created: number | null
}

type TestFileDisplaySettings = {
  showFileExtensions: boolean
  showFileSizes: boolean
  showFileDates: boolean
  dateFormat: "relative" | "absolute" | "auto"
  thumbnailSize: "small" | "medium" | "large"
}

function Wrapper({ file }: { file: TestFileEntry }) {
  const [dateFormat, setDateFormat] = useState<"relative" | "absolute" | "auto">("relative")

  const displaySettings: TestFileDisplaySettings = {
    showFileExtensions: true,
    showFileSizes: false,
    showFileDates: true,
    dateFormat,
    thumbnailSize: "medium",
  }

  return (
    <div>
      <button
        type="button"
        data-testid="toggle-date-format"
        onClick={() => setDateFormat(dateFormat === "relative" ? "absolute" : "relative")}
      >
        toggle
      </button>
      <FileRow
        file={file}
        isSelected={false}
        onSelect={() => {}}
        onOpen={() => {}}
        displaySettings={displaySettings}
        appearance={defaultAppearance}
      />
    </div>
  )
}

describe("FileRow reacts to FileDisplaySettings changes", () => {
  it("updates date display immediately when dateFormat changes", async () => {
    const file: TestFileEntry = {
      path: "/f",
      name: "f.txt",
      is_dir: false,
      is_hidden: false,
      extension: "txt",
      size: 0,
      modified: nowSec,
      created: null,
    }

    const { container, getByTestId } = render(<Wrapper file={file} />)

    // initially should contain relative text
    await waitFor(() => {
      const text = container.textContent ?? ""
      expect(text).toMatch(/(только|мин\.)/)
    })

    // Switch to absolute via the wrapper control
    const btn = getByTestId("toggle-date-format")
    fireEvent.click(btn)

    // Expect DOM to update without navigation
    await waitFor(() => {
      const text = container.textContent ?? ""
      // absolute produces a numeric date string like 'dd.mm.yyyy' per formatDate
      expect(text).toMatch(/\d{2}\.\d{2}\.\d{4}/)
    })
  })
})
