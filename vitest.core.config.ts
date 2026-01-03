import path from "node:path"
import { defineConfig } from "vitest/config"

const CORE_COVERAGE_BASELINE = {
  statements: 88,
  branches: 69,
  functions: 91,
  lines: 90,
} as const

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json", "html"],
      reportsDirectory: "coverage-core",
      include: [
        // shared/lib core utilities
        "src/shared/lib/**/*.ts",
        "src/shared/lib/**/*.tsx",

        // zustand stores (FSD-style)
        "src/**/model/store.ts",
        "src/**/model/store.tsx",

        // legacy/special-case store outside model/
        "src/shared/ui/virtualized-file-list/store.ts",
      ],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "src/test/**",
        "src/shared/api/tauri/bindings.ts",
      ],
      thresholds: CORE_COVERAGE_BASELINE,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
