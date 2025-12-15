export const fileKeys = {
  all: ["files"] as const,
  directory: (path: string | null) => [...fileKeys.all, "directory", path] as const,
  drives: () => [...fileKeys.all, "drives"] as const,
} as const
