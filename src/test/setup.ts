/// <reference types="vitest" />
import "@testing-library/jest-dom";

// Tauri event mock
vi.mock("@tauri-apps/api/event", () => {
  return {
    listen: vi.fn(async (_event: string, cb: any) => {
      // return an unlisten fn
      return vi.fn(() => {});
    }),
    once: vi.fn(async (_name: string, cb: any) => vi.fn(() => {})),
  };
});
