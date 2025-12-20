import type { DriveInfo, FileEntry, FilePreview, Result, SearchResult, SearchOptions } from "./bindings"
import { commands } from "./bindings"

export function unwrapResult<T, E>(result: Result<T, E>): T {
  if (result.status === "ok") return result.data
  throw new Error(String(result.error))
}

export const tauriClient = {
  async readDirectory(path: string): Promise<FileEntry[]> {
    return unwrapResult(await commands.readDirectory(path))
  },

  async readDirectoryStream(path: string): Promise<null> {
    return unwrapResult(await commands.readDirectoryStream(path))
  },

  async getDrives(): Promise<DriveInfo[]> {
    return unwrapResult(await commands.getDrives())
  },

  async createDirectory(path: string): Promise<null> {
    return unwrapResult(await commands.createDirectory(path))
  },

  async createFile(path: string): Promise<null> {
    return unwrapResult(await commands.createFile(path))
  },

  async deleteEntries(paths: string[], permanent: boolean): Promise<null> {
    return unwrapResult(await commands.deleteEntries(paths, permanent))
  },

  async renameEntry(oldPath: string, newName: string): Promise<string> {
    return unwrapResult(await commands.renameEntry(oldPath, newName))
  },

  async copyEntries(sources: string[], destination: string): Promise<null> {
    return unwrapResult(await commands.copyEntries(sources, destination))
  },

  async copyEntriesParallel(sources: string[], destination: string): Promise<null> {
    return unwrapResult(await commands.copyEntriesParallel(sources, destination))
  },

  async moveEntries(sources: string[], destination: string): Promise<null> {
    return unwrapResult(await commands.moveEntries(sources, destination))
  },

  async getFileContent(path: string): Promise<string> {
    return unwrapResult(await commands.getFileContent(path))
  },

  async getParentPath(path: string): Promise<string | null> {
    return unwrapResult(await commands.getParentPath(path))
  },

  async pathExists(path: string): Promise<boolean> {
    return unwrapResult(await commands.pathExists(path))
  },

  async searchFiles(options: SearchOptions): Promise<SearchResult[]> {
    return unwrapResult(await commands.searchFiles(options))
  },

  async searchFilesStream(options: SearchOptions): Promise<SearchResult[]> {
    return unwrapResult(await commands.searchFilesStream(options))
  },

  async searchByName(
    searchPath: string,
    query: string,
    maxResults: number | null,
  ): Promise<SearchResult[]> {
    return unwrapResult(await commands.searchByName(searchPath, query, maxResults))
  },

  async searchContent(
    searchPath: string,
    query: string,
    extensions: string[] | null,
    maxResults: number | null,
  ): Promise<SearchResult[]> {
    return unwrapResult(await commands.searchContent(searchPath, query, extensions, maxResults))
  },

  async getFilePreview(path: string): Promise<FilePreview> {
    return unwrapResult(await commands.getFilePreview(path))
  },

  async watchDirectory(path: string): Promise<null> {
    return unwrapResult(await commands.watchDirectory(path))
  },

  async unwatchDirectory(path: string): Promise<null> {
    return unwrapResult(await commands.unwatchDirectory(path))
  },

  async unwatchAll(): Promise<null> {
    return unwrapResult(await commands.unwatchAll())
  },
}

export type { FileEntry, DriveInfo, FilePreview, SearchResult, Result }
