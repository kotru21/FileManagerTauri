import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

export function useTauriEvent<T = any>(
  eventName: string,
  handler: (payload: T) => void,
  deps: any[] = [],
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    let unlistenFn: (() => void) | null = null;
    const setup = async () => {
      try {
        const localUnlisten = await listen<T>(eventName, (e) => {
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
  }, [eventName, handler, enabled, ...deps]);
}
