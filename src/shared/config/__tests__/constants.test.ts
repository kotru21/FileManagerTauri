import { DEFAULT_SORT, FILE_ICONS_BY_EXTENSION, HOTKEYS, VIEW_MODES } from "../constants"

describe("constants", () => {
  describe("HOTKEYS", () => {
    it("has all required hotkey entries", () => {
      const requiredKeys = [
        "copy",
        "cut",
        "paste",
        "delete",
        "rename",
        "newFolder",
        "newFile",
        "search",
        "searchContent",
        "selectAll",
        "refresh",
        "back",
        "forward",
        "up",
        "addressBar",
      ] as const

      for (const key of requiredKeys) {
        expect(HOTKEYS[key]).toBeDefined()
        expect(typeof HOTKEYS[key]).toBe("string")
      }
    })

    it("hotkeys use expected modifier patterns", () => {
      expect(HOTKEYS.copy).toBe("ctrl+c")
      expect(HOTKEYS.cut).toBe("ctrl+x")
      expect(HOTKEYS.paste).toBe("ctrl+v")
      expect(HOTKEYS.delete).toBe("delete")
      expect(HOTKEYS.rename).toBe("f2")
      expect(HOTKEYS.addressBar).toBe("ctrl+l")
    })
  })

  describe("FILE_ICONS_BY_EXTENSION", () => {
    it("maps image extensions to 'image'", () => {
      for (const ext of ["jpg", "jpeg", "png", "gif", "svg", "webp"]) {
        expect(FILE_ICONS_BY_EXTENSION[ext]).toBe("image")
      }
    })

    it("maps code extensions correctly", () => {
      expect(FILE_ICONS_BY_EXTENSION.ts).toBe("typescript")
      expect(FILE_ICONS_BY_EXTENSION.tsx).toBe("typescript")
      expect(FILE_ICONS_BY_EXTENSION.js).toBe("javascript")
      expect(FILE_ICONS_BY_EXTENSION.py).toBe("python")
      expect(FILE_ICONS_BY_EXTENSION.rs).toBe("rust")
    })

    it("maps archive extensions to 'archive'", () => {
      for (const ext of ["zip", "rar", "7z", "tar", "gz"]) {
        expect(FILE_ICONS_BY_EXTENSION[ext]).toBe("archive")
      }
    })

    it("maps document extensions correctly", () => {
      expect(FILE_ICONS_BY_EXTENSION.pdf).toBe("pdf")
      expect(FILE_ICONS_BY_EXTENSION.doc).toBe("word")
      expect(FILE_ICONS_BY_EXTENSION.xlsx).toBe("excel")
    })
  })

  describe("DEFAULT_SORT", () => {
    it("has name field and asc direction", () => {
      expect(DEFAULT_SORT.field).toBe("name")
      expect(DEFAULT_SORT.direction).toBe("asc")
    })
  })

  describe("VIEW_MODES", () => {
    it("has list, grid, and details modes", () => {
      expect(VIEW_MODES.list).toBe("list")
      expect(VIEW_MODES.grid).toBe("grid")
      expect(VIEW_MODES.details).toBe("details")
    })

    it("has exactly three modes", () => {
      expect(Object.keys(VIEW_MODES)).toHaveLength(3)
    })
  })
})
