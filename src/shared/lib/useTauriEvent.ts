import { useEffect, type DependencyList } from "react";
import { listen } from "@tauri-apps/api/event";

const EMPTY_DEPS: DependencyList = [];

export function useTauriEvent<TPayload = unknown>(
  eventName: string,
  handler: (payload: TPayload) => void,
  deps?: DependencyList,
  enabled = true
) {
  const depList = deps ?? EMPTY_DEPS;

  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    let unlistenFn: (() => void) | null = null;
    const setup = async () => {
      try {
        const localUnlisten = await listen<TPayload>(eventName, (e) => {
          if (!mounted) return;
          handler(e.payload);
        });
        if (!mounted) {
          localUnlisten();
          return;
        }
        unlistenFn = localUnlisten;
      } catch (e) {
        console.error("useTauriEvent setup failed for", eventName, e);
      }
    };
    setup();
    return () => {
      mounted = false;
      unlistenFn?.();
    };
    // Intentionally spread depList to preserve React Hook dependency semantics for callers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventName, handler, enabled, ...depList]);
}
