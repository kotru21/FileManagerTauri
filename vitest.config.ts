import path from "node:path"
import { defineConfig } from "vitest/config"

// Interim milestone (Task 16): 63.7/54.1/62.2/65.2 actual → floors below.
const COVERAGE_BASELINE = {
  statements: 63,
  branches: 53,
  functions: 62,
  lines: 65,
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
