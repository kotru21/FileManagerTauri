import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ColumnHeader } from "@/entities/file-entry"
import { sortEntries } from "@/entities/file-entry/model/types"
import { useSortingStore } from "@/features/sorting/model/store"

function TestComp({ files }: { files: any[] }) {
  const { sortConfig, setSortField } = useSortingStore()

  const sorted = sortEntries(files, sortConfig)

  return (
    <div>
      <ColumnHeader
        columnWidths={{ size: 80, date: 120, padding: 20 }}
        onColumnResize={() => {}}
        sortConfig={sortConfig}
        onSort={setSortField}
        displaySettings={{ showFileSizes: true, showFileDates: true }}
      />
      <ul>
        {sorted.map((f) => (
          <li key={f.path}>{f.name}</li>
        ))}
      </ul>
    </div>
  )
}

describe("ColumnHeader sorting (simple list)", () => {
  it("toggles name sort direction when clicking Имя", async () => {
    act(() => {
      useSortingStore.setState({ sortConfig: { field: "name", direction: "asc" } })
    })

    const files = [
      {
        name: "alpha.txt",
        path: "/a",
        is_dir: false,
        is_hidden: false,
        size: 0,
        modified: 1000,
        extension: "txt",
      },
      {
        name: "beta.txt",
        path: "/b",
        is_dir: false,
        is_hidden: false,
        size: 0,
        modified: 2000,
        extension: "txt",
      },
    ]

    render(<TestComp files={files} />)

    // initial order: alpha, beta
    const lis = screen.getAllByRole("listitem")
    expect(lis[0].textContent).toBe("alpha.txt")

    // click Имя to toggle direction -> desc
    fireEvent.click(screen.getByText("Имя"))

    const lis2 = screen.getAllByRole("listitem")
    expect(lis2[0].textContent).toBe("beta.txt")
  })

  it("sorts by modified date when clicking Изменён", async () => {
    act(() => {
      useSortingStore.setState({ sortConfig: { field: "name", direction: "asc" } })
    })

    const files = [
      {
        name: "a.txt",
        path: "/a",
        is_dir: false,
        is_hidden: false,
        size: 0,
        modified: 2000,
        extension: "txt",
      },
      {
        name: "b.txt",
        path: "/b",
        is_dir: false,
        is_hidden: false,
        size: 0,
        modified: 1000,
        extension: "txt",
      },
    ]

    render(<TestComp files={files} />)

    // initial by name asc -> a, b
    const initial = screen.getAllByRole("listitem")
    expect(initial[0].textContent).toBe("a.txt")

    // click Изменён to sort by modified asc
    fireEvent.click(screen.getByText("Изменён"))

    const after = screen.getAllByRole("listitem")
    expect(after[0].textContent).toBe("b.txt")
  })
})
