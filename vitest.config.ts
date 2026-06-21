import path from "node:path"
import { defineConfig } from "vitest/config"

const COVERAGE_BASELINE = {
  statements: 80,
  branches: 70,
  functions: 80,
  lines: 80,
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
        "**/index.ts",
        "**/types.ts",
        "**/*.d.ts",
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
