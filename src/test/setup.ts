import "@testing-library/jest-dom"
import { afterEach, vi } from "vitest"

// Mock Tauri API
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}))

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
  emit: vi.fn(),
}))

vi.mock("@tauri-apps/plugin-opener", () => ({
  openPath: vi.fn(),
}))

// Reset all stores after each test
afterEach(() => {
  vi.clearAllMocks()
})