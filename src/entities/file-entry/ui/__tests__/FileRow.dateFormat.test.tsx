import { render } from "@testing-library/react"
import { expect, test } from "vitest"
import { formatDate, formatRelativeStrict } from "@/shared/lib"
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

test("dateFormat='absolute' renders absolute dates", () => {
  type FileEntry = {
    path: string
    name: string
    is_dir: boolean
    is_hidden: boolean
    extension: string | null
    size: number
    modified: number | null
    created: number | null
  }

  const file: FileEntry = {
    path: "/f",
    name: "f",
    is_dir: false,
    is_hidden: false,
    extension: null,
    size: 0,
    modified: nowSec,
    created: null,
  }

  const { container } = render(
    <FileRow
      file={file}
      isSelected={false}
      onSelect={() => {}}
      onOpen={() => {}}
      displaySettings={{
        showFileExtensions: true,
        showFileSizes: false,
        showFileDates: true,
        dateFormat: "absolute",
        thumbnailSize: "medium",
      }}
      appearance={defaultAppearance}
    />,
  )

  expect(container.textContent).toContain(formatDate(nowSec))
})

test("dateFormat='relative' renders strict relative even for older dates", () => {
  const twentyDaysAgo = nowSec - 20 * 24 * 60 * 60
  const file: TestFileEntry = {
    path: "/f",
    name: "f",
    is_dir: false,
    is_hidden: false,
    extension: null,
    size: 0,
    modified: twentyDaysAgo,
    created: null,
  }

  const { container } = render(
    <FileRow
      file={file}
      isSelected={false}
      onSelect={() => {}}
      onOpen={() => {}}
      displaySettings={{
        showFileExtensions: true,
        showFileSizes: false,
        showFileDates: true,
        dateFormat: "relative",
        thumbnailSize: "medium",
      }}
      appearance={defaultAppearance}
    />,
  )

  // strict relative should render in days
  expect(container.textContent).toContain(formatRelativeStrict(twentyDaysAgo))
})

test("dateFormat='auto' uses mixed behaviour (old -> absolute)", () => {
  const twentyDaysAgo = nowSec - 20 * 24 * 60 * 60
  const file: TestFileEntry = {
    path: "/f",
    name: "f",
    is_dir: false,
    is_hidden: false,
    extension: null,
    size: 0,
    modified: twentyDaysAgo,
    created: null,
  }

  const { container } = render(
    <FileRow
      file={file}
      isSelected={false}
      onSelect={() => {}}
      onOpen={() => {}}
      displaySettings={{
        showFileExtensions: true,
        showFileSizes: false,
        showFileDates: true,
        dateFormat: "auto",
        thumbnailSize: "medium",
      }}
      appearance={defaultAppearance}
    />,
  )

  // auto should fall back to absolute for > 1 week
  expect(container.textContent).toContain(formatDate(twentyDaysAgo))
})
