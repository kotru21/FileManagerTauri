import { create } from "zustand"

export interface Command {
  id: string
  title: string
  description?: string
  shortcut?: string
  icon?: string
  category: "navigation" | "file" | "edit" | "view" | "search" | "other"
  action: () => void
  keywords?: string[]
}

interface CommandPaletteState {
  isOpen: boolean
  search: string
  commands: Command[]
  selectedIndex: number
  open: () => void
  close: () => void
  toggle: () => void
  setSearch: (search: string) => void
  setSelectedIndex: (index: number) => void
  registerCommands: (commands: Command[]) => void
  unregisterCommands: (ids: string[]) => void
  executeCommand: (id: string) => void
  getFilteredCommands: () => Command[]
}

export const useCommandPaletteStore = create<CommandPaletteState>((set, get) => ({
  isOpen: false,
  search: "",
  commands: [],
  selectedIndex: 0,

  open: () => set({ isOpen: true, search: "", selectedIndex: 0 }),
  close: () => set({ isOpen: false, search: "", selectedIndex: 0 }),
  toggle: () => {
    const { isOpen } = get()
    if (isOpen) {
      get().close()
    } else {
      get().open()
    }
  },

  setSearch: (search) => set({ search, selectedIndex: 0 }),
  setSelectedIndex: (selectedIndex) => set({ selectedIndex }),

  registerCommands: (newCommands) =>
    set((state) => ({
      commands: [
        ...state.commands.filter((c) => !newCommands.some((nc) => nc.id === c.id)),
        ...newCommands,
      ],
    })),

  unregisterCommands: (ids) =>
    set((state) => ({
      commands: state.commands.filter((c) => !ids.includes(c.id)),
    })),

  executeCommand: (id) => {
    const command = get().commands.find((c) => c.id === id)
    if (command) {
      get().close()
      command.action()
    }
  },

  getFilteredCommands: () => {
    const { search, commands } = get()
    if (!search.trim()) return commands

    const lowerSearch = search.toLowerCase()
    return commands
      .filter((cmd) => {
        const searchableText = [cmd.title, cmd.description, cmd.category, ...(cmd.keywords || [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()

        return searchableText.includes(lowerSearch)
      })
      .sort((a, b) => {
        // Prioritize title matches
        const aTitle = a.title.toLowerCase().includes(lowerSearch)
        const bTitle = b.title.toLowerCase().includes(lowerSearch)
        if (aTitle && !bTitle) return -1
        if (!aTitle && bTitle) return 1
        return 0
      })
  },
}))
