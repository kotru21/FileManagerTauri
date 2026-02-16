import { fireEvent, render, screen } from "@testing-library/react"
import type { ContentMatch, SearchResult } from "@/shared/api/tauri"
import { SearchResultItem } from "../SearchResultItem"

vi.mock("@/entities/file-entry", () => ({
  FileIcon: () => <span data-testid="file-icon" />,
}))

const makeMatch = (
  line_number: number,
  line_content: string,
  match_start: number,
  match_end: number,
): ContentMatch => ({
  line_number,
  line_content,
  match_start,
  match_end,
})

const makeResult = (overrides: Partial<SearchResult> = {}): SearchResult => ({
  name: "example.ts",
  path: "/home/user/project/example.ts",
  is_dir: false,
  matches: [],
  ...overrides,
})

describe("SearchResultItem", () => {
  it("renders file name", () => {
    render(<SearchResultItem result={makeResult({ name: "app.tsx" })} onSelect={() => {}} />)

    expect(screen.getByText("app.tsx")).toBeTruthy()
  })

  it("clicking calls onSelect with path", () => {
    const onSelect = vi.fn()
    const result = makeResult({ path: "/some/path/file.ts" })

    render(<SearchResultItem result={result} onSelect={onSelect} />)

    fireEvent.click(screen.getByText(result.name))
    expect(onSelect).toHaveBeenCalledWith("/some/path/file.ts")
  })

  it("shows match previews with line number", () => {
    const matches = [makeMatch(10, "const foo = bar", 6, 9), makeMatch(25, "return baz", 7, 10)]
    const result = makeResult({ matches })

    render(<SearchResultItem result={result} onSelect={() => {}} />)

    expect(screen.getByText("10:")).toBeTruthy()
    expect(screen.getByText("25:")).toBeTruthy()
    expect(screen.getByText("foo")).toBeTruthy()
    expect(screen.getByText("baz")).toBeTruthy()
  })

  it("shows overflow count for more than 3 matches", () => {
    const matches = Array.from({ length: 7 }, (_, i) => makeMatch(i + 1, `line ${i} content`, 5, 6))
    const result = makeResult({ matches })

    render(<SearchResultItem result={result} onSelect={() => {}} />)

    // Only first 3 rendered
    expect(screen.getByText("1:")).toBeTruthy()
    expect(screen.getByText("2:")).toBeTruthy()
    expect(screen.getByText("3:")).toBeTruthy()

    // Overflow text
    expect(screen.getByText("+4 совпадений")).toBeTruthy()
  })

  it("works with no matches", () => {
    const result = makeResult({ matches: [] })

    render(<SearchResultItem result={result} onSelect={() => {}} />)

    expect(screen.getByText(result.name)).toBeTruthy()
    expect(screen.queryByText(/совпадений/)).toBeNull()
  })
})
