import { normalizePathForComparison } from "@/shared/lib"

export const fileKeys = {
  all: ["files"] as const,
  directory: (path: string | null) =>
    [...fileKeys.all, "directory", path ? normalizePathForComparison(path) : null] as const,
  drives: () => [...fileKeys.all, "drives"] as const,
} as const
