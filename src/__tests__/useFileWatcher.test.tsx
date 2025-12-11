/// <reference types="vitest" />
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFileWatcher } from "@/entities/file-entry/api/useFileWatcher";
import { listen } from "@tauri-apps/api/event";
import { commands } from "@/shared/api/tauri";

vi.mock("@tauri-apps/api/event");
vi.mock("@/shared/api/tauri");

describe("useFileWatcher", () => {
  let queryClient: QueryClient;
  let wrapper: any;
  beforeEach(() => {
    queryClient = new QueryClient();
    wrapper = ({ children }: any) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    (listen as any).mockResolvedValue(vi.fn(() => {}));
    (commands.watchDirectory as any).mockResolvedValue(null);
    (commands.unwatchDirectory as any).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("registers listener and calls unlisten on unmount", async () => {
    const { unmount } = renderHook(() => useFileWatcher("/tmp"), {
      wrapper,
    });
    await waitFor(() => expect(listen).toHaveBeenCalled());
    unmount();
    // assert unwatchDirectory called
    expect(commands.unwatchDirectory).toHaveBeenCalled();
  });
});
