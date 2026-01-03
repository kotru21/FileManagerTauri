/// <reference types="node" />

import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const PROJECT_ROOT = process.cwd()
const FEATURES_ROOT = path.join(PROJECT_ROOT, "src", "features")

/**
 * Temporary allowlist of feature->feature dependency edges.
 *
 * Goal: shrink this to an empty set by moving orchestration to `processes/` and
 * by promoting cross-cutting models to `entities/`.
 *
 * This test is intentionally edge-based (slice -> slice) rather than line-based
 * to be robust to refactors.
 */
const ALLOWED_EDGES = new Set<string>([
  // command-palette currently orchestrates multiple stores across features.
  "command-palette->bookmarks",
  "command-palette->clipboard",
  "command-palette->file-selection",
  "command-palette->inline-edit",
  "command-palette->navigation",
  "command-palette->quick-filter",
  "command-palette->settings",
  "command-palette->view-mode",

  // context-menu currently depends on selection + bookmarks.
  "context-menu->bookmarks",
  "context-menu->file-selection",

  // layout currently syncs with settings.
  "layout->settings",

  // quick-filter reads performance settings.
  "quick-filter->settings",

  // rubber-band depends on selection.
  "rubber-band->file-selection",

  // search-content depends on navigation + settings.
  "search-content->navigation",
  "search-content->settings",

  // settings depends on layout types/presets.
  "settings->layout",

  // view-mode toggles depend on settings.
  "view-mode->settings",
])

function walkFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const out: string[] = []

  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "target") {
        continue
      }
      out.push(...walkFiles(full))
    } else if (entry.isFile()) {
      if (full.endsWith(".ts") || full.endsWith(".tsx")) {
        out.push(full)
      }
    }
  }

  return out
}

function getSliceNameFromFile(file: string): string | null {
  // .../src/features/<slice>/...
  const parts = file.split(path.sep)
  const idx = parts.lastIndexOf("features")
  if (idx === -1) return null
  return parts[idx + 1] ?? null
}

function getSliceNameFromSource(source: string): string | null {
  // Supported forms:
  // - @/features/<slice>
  // - @/features/<slice>/...
  if (source === "@/features") return "__barrel__"
  if (!source.startsWith("@/features/")) return null
  const rest = source.slice("@/features/".length)
  const slice = rest.split("/")[0]
  return slice || null
}

describe("architecture: no feature -> feature dependencies", () => {
  it("does not introduce new feature-to-feature edges", () => {
    const offenders: Array<{ file: string; edge: string; source: string }> = []

    // Matches: import ... from '...'
    // Also matches: export ... from '...'
    const importExportRe = /^(?:\s*)(?:import|export)\s+[^\n]*?\sfrom\s*["']([^"']+)["']/gm

    for (const file of walkFiles(FEATURES_ROOT)) {
      const fromSlice = getSliceNameFromFile(file)
      if (!fromSlice) continue

      const content = fs.readFileSync(file, "utf8")
      for (const match of content.matchAll(importExportRe)) {
        const source = match[1] ?? ""
        const toSlice = getSliceNameFromSource(source)
        if (!toSlice) continue

        // Barrel imports from '@/features' are always forbidden.
        if (toSlice === "__barrel__") {
          offenders.push({
            file,
            edge: `${fromSlice}->${toSlice}`,
            source,
          })
          continue
        }

        // Allow self-imports (prefer relative imports, but they are not our main risk).
        if (toSlice === fromSlice) continue

        const edge = `${fromSlice}->${toSlice}`
        if (!ALLOWED_EDGES.has(edge)) {
          offenders.push({ file, edge, source })
        }
      }
    }

    if (offenders.length > 0) {
      // Make failures readable in CI.
      const printable = offenders
        .map((o) => `${o.edge}  (${path.relative(PROJECT_ROOT, o.file)})  <- ${o.source}`)
        .sort()

      expect(printable).toEqual([])
      return
    }

    expect(offenders).toEqual([])
  })
})
