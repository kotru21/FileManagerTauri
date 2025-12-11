/// <reference types="vitest" />
import { renderHook } from "@testing-library/react";
import { useTauriEvent } from "@/shared/lib/useTauriEvent";
import { listen } from "@tauri-apps/api/event";

vi.mock("@tauri-apps/api/event");

describe("useTauriEvent", () => {
  afterEach(() => vi.clearAllMocks());

  it("registers and unregisters event listener with enabled flag", async () => {
    const unlisten = vi.fn();
    (listen as any).mockResolvedValue(unlisten);

    const { unmount } = renderHook(() =>
      useTauriEvent("test", () => {}, [], true)
    );
    await Promise.resolve(); // wait for next tick
    expect(listen).toHaveBeenCalledWith("test", expect.any(Function));
    unmount();
    expect(unlisten).toHaveBeenCalled();
  });
});
