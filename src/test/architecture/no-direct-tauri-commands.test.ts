/// <reference types="node" />

import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const PROJECT_ROOT = process.cwd()
const SRC_ROOT = path.join(PROJECT_ROOT, "src")

const ALLOWED_FILES = new Set([
  // Единственное место, где допускаем прямое обращение к generated commands.
  path.join(SRC_ROOT, "shared", "api", "tauri", "client.ts"),

  // Тесты tauriClient могут мокать commands из bindings.
  path.join(SRC_ROOT, "test", "shared", "tauri", "client.test.ts"),
])

function walkFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const out: string[] = []

  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      // не сканируем зависимости/сборки
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

describe("architecture: tauriClient is the only commands gateway", () => {
  it("does not import/re-export `commands` outside tauri client", () => {
    const offenders: Array<{ file: string; line: string }> = []

    const importOrExportCommandsRe =
      /^(?:\s*)(?:import|export)\s*\{[^}]*\bcommands\b[^}]*\}\s*from\s*["']([^"']+)["']/gm

    const isForbiddenSource = (source: string) => {
      // Запрещаем импортировать commands из public index и из generated bindings
      // (кроме allowlist выше).
      return (
        source === "@/shared/api/tauri" ||
        source === "@/shared/api/tauri/bindings" ||
        source.endsWith("/shared/api/tauri") ||
        source.endsWith("/shared/api/tauri/bindings") ||
        source === "./bindings" ||
        source === "../bindings" ||
        source.endsWith("/bindings")
      )
    }

    for (const file of walkFiles(SRC_ROOT)) {
      if (ALLOWED_FILES.has(file)) continue

      const content = fs.readFileSync(file, "utf8")

      for (const match of content.matchAll(importOrExportCommandsRe)) {
        const source = match[1] ?? ""
        if (!isForbiddenSource(source)) continue

        // Найдём саму строку для отладки
        const idx = match.index ?? 0
        const lineStart = content.lastIndexOf("\n", idx) + 1
        const lineEnd = content.indexOf("\n", idx)
        const line = content.slice(lineStart, lineEnd === -1 ? content.length : lineEnd)

        offenders.push({ file, line: line.trim() })
      }
    }

    expect(offenders).toEqual([])
  })
})
