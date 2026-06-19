import path from "node:path"
import { defineConfig } from "vitest/config"

// Coverage targets:
// 80/70/80/80 globally, >90 in core.
const COVERAGE_BASELINE = {
  statements: 45,
  branches: 40,
  functions: 39,
  lines: 46,
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
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "src/test/**",
        "src/shared/api/tauri/bindings.ts",
      ],
      thresholds: COVERAGE_BASELINE,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
