import { useEffect } from "react"
import { useBookmarksStore } from "@/features/bookmarks"
import { useClipboardStore } from "@/features/clipboard"
import { useSelectionStore } from "@/features/file-selection"
import { useInlineEditStore } from "@/features/inline-edit"
import { useNavigationStore } from "@/features/navigation"
import { useQuickFilterStore } from "@/features/quick-filter"
import { useViewModeStore } from "@/features/view-mode"
import { type Command, useCommandPaletteStore } from "../model/store"

interface UseRegisterCommandsOptions {
  onRefresh: () => void
  onDelete: () => void
  onOpenSettings: () => void
}

export function useRegisterCommands({
  onRefresh,
  onDelete,
  onOpenSettings,
}: UseRegisterCommandsOptions) {
  const { registerCommands, unregisterCommands } = useCommandPaletteStore()
  const { currentPath, goBack, goForward, goUp } = useNavigationStore()
  const { copy, cut } = useClipboardStore()
  const { getSelectedPaths, clearSelection } = useSelectionStore()
  const { startNewFolder, startNewFile } = useInlineEditStore()
  const { settings, setViewMode, toggleHidden } = useViewModeStore()
  const { toggle: toggleQuickFilter } = useQuickFilterStore()
  const { isBookmarked, addBookmark, removeBookmark, getBookmarkByPath } = useBookmarksStore()

  useEffect(() => {
    const commands: Command[] = [
      // Navigation
      {
        id: "nav-back",
        title: "Назад",
        description: "Перейти к предыдущей папке",
        shortcut: "Alt+←",
        icon: "arrow-left",
        category: "navigation",
        action: goBack,
        keywords: ["back", "previous", "история"],
      },
      {
        id: "nav-forward",
        title: "Вперёд",
        description: "Перейти к следующей папке",
        shortcut: "Alt+→",
        icon: "arrow-right",
        category: "navigation",
        action: goForward,
        keywords: ["forward", "next"],
      },
      {
        id: "nav-up",
        title: "Вверх",
        description: "Перейти в родительскую папку",
        shortcut: "Alt+↑",
        icon: "arrow-up",
        category: "navigation",
        action: goUp,
        keywords: ["up", "parent", "родитель"],
      },
      {
        id: "nav-refresh",
        title: "Обновить",
        description: "Обновить содержимое папки",
        shortcut: "F5",
        icon: "refresh",
        category: "navigation",
        action: onRefresh,
        keywords: ["refresh", "reload", "обновление"],
      },

      // File operations
      {
        id: "file-new-folder",
        title: "Новая папка",
        description: "Создать новую папку",
        shortcut: "Ctrl+Shift+N",
        icon: "folder-plus",
        category: "file",
        action: () => currentPath && startNewFolder(currentPath),
        keywords: ["create", "folder", "directory", "создать"],
      },
      {
        id: "file-new-file",
        title: "Новый файл",
        description: "Создать новый файл",
        icon: "file-plus",
        category: "file",
        action: () => currentPath && startNewFile(currentPath),
        keywords: ["create", "file", "создать"],
      },
      {
        id: "file-delete",
        title: "Удалить",
        description: "Удалить выбранные файлы",
        shortcut: "Delete",
        icon: "trash",
        category: "file",
        action: onDelete,
        keywords: ["remove", "delete", "удалить"],
      },

      // Edit operations
      {
        id: "edit-copy",
        title: "Копировать",
        description: "Копировать выбранные файлы",
        shortcut: "Ctrl+C",
        icon: "copy",
        category: "edit",
        action: () => copy(getSelectedPaths()),
        keywords: ["copy", "duplicate"],
      },
      {
        id: "edit-cut",
        title: "Вырезать",
        description: "Вырезать выбранные файлы",
        shortcut: "Ctrl+X",
        icon: "scissors",
        category: "edit",
        action: () => cut(getSelectedPaths()),
        keywords: ["cut", "move"],
      },
      {
        id: "edit-select-all",
        title: "Выделить всё",
        description: "Выделить все файлы в папке",
        shortcut: "Ctrl+A",
        icon: "file",
        category: "edit",
        action: () => {
          // This needs access to current files - not registered here
        },
        keywords: ["select", "all", "выделить"],
      },
      {
        id: "edit-clear-selection",
        title: "Снять выделение",
        description: "Снять выделение со всех файлов",
        shortcut: "Escape",
        icon: "file",
        category: "edit",
        action: clearSelection,
        keywords: ["deselect", "clear"],
      },

      // View
      {
        id: "view-list",
        title: "Список",
        description: "Отображать файлы списком",
        icon: "list",
        category: "view",
        action: () => setViewMode("list"),
        keywords: ["list", "view"],
      },
      {
        id: "view-grid",
        title: "Сетка",
        description: "Отображать файлы сеткой",
        icon: "grid",
        category: "view",
        action: () => setViewMode("grid"),
        keywords: ["grid", "icons", "view"],
      },
      {
        id: "view-toggle-hidden",
        title: settings.showHidden ? "Скрыть скрытые файлы" : "Показать скрытые файлы",
        description: "Переключить отображение скрытых файлов",
        icon: settings.showHidden ? "eye-off" : "eye",
        category: "view",
        action: toggleHidden,
        keywords: ["hidden", "show", "скрытые"],
      },

      // Search
      {
        id: "search-filter",
        title: "Быстрый фильтр",
        description: "Фильтровать файлы по имени",
        shortcut: "Ctrl+Shift+F",
        icon: "search",
        category: "search",
        action: toggleQuickFilter,
        keywords: ["filter", "find", "search", "фильтр"],
      },

      // Other
      {
        id: "bookmark-toggle",
        title:
          currentPath && isBookmarked(currentPath)
            ? "Удалить из закладок"
            : "Добавить в закладк" + "и",
        description: "Добавить или удалить текущую папку из закладок",
        icon: "star",
        category: "other",
        action: () => {
          if (!currentPath) return
          if (isBookmarked(currentPath)) {
            const bookmark = getBookmarkByPath(currentPath)
            if (bookmark) removeBookmark(bookmark.id)
          } else {
            addBookmark(currentPath)
          }
        },
        keywords: ["bookmark", "favorite", "закладка"],
      },
      {
        id: "settings-open",
        title: "Настройки",
        description: "Открыть настройки приложения",
        shortcut: "Ctrl+,",
        icon: "settings",
        category: "other",
        action: onOpenSettings,
        keywords: ["settings", "preferences", "options", "настройки"],
      },
    ]

    registerCommands(commands)

    return () => {
      unregisterCommands(commands.map((c) => c.id))
    }
  }, [
    registerCommands,
    unregisterCommands,
    currentPath,
    goBack,
    goForward,
    goUp,
    onRefresh,
    onDelete,
    onOpenSettings,
    copy,
    cut,
    getSelectedPaths,
    clearSelection,
    startNewFolder,
    startNewFile,
    setViewMode,
    toggleHidden,
    toggleQuickFilter,
    settings.showHidden,
    isBookmarked,
    addBookmark,
    removeBookmark,
    getBookmarkByPath,
  ])
}
