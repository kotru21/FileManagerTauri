import { useBookmarksStore } from "@/features/bookmarks"

export function getBookmarkMenuState(path: string) {
  const { isBookmarked, getBookmarkByPath } = useBookmarksStore.getState()
  return { isBookmarked: isBookmarked(path), bookmark: getBookmarkByPath(path) }
}

export function useContextMenuBookmarks() {
  const { isBookmarked, addBookmark, removeBookmark, getBookmarkByPath } = useBookmarksStore()

  const isPathBookmarked = (path: string) => isBookmarked(path)

  const toggleBookmark = (path: string) => {
    if (isBookmarked(path)) {
      const bookmark = getBookmarkByPath(path)
      if (bookmark) removeBookmark(bookmark.id)
    } else {
      addBookmark(path)
    }
  }

  return { isPathBookmarked, toggleBookmark }
}
