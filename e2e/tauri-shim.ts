/**
 * Browser-side shim for `window.__TAURI_INTERNALS__`.
 *
 * Playwright runs in Chromium, not the Tauri webview. Without this shim the app
 * crashes on `getCurrentWindow()` and IPC calls never resolve.
 */
export const tauriShimScript = `
(() => {
  if (window.__TAURI_INTERNALS__?.metadata) return;

  const callbacks = new Map();
  const listeners = new Map();

  const mockEntries = [
    {
      name: "sample.txt",
      path: "C:\\\\Users\\\\Test\\\\sample.txt",
      is_dir: false,
      is_hidden: false,
      size: 12,
      modified: null,
      created: null,
      extension: "txt",
    },
    {
      name: "Projects",
      path: "C:\\\\Users\\\\Test\\\\Projects",
      is_dir: true,
      is_hidden: false,
      size: 0,
      modified: null,
      created: null,
      extension: null,
    },
    {
      name: "readme.md",
      path: "C:\\\\Users\\\\Test\\\\readme.md",
      is_dir: false,
      is_hidden: false,
      size: 24,
      modified: null,
      created: null,
      extension: "md",
    },
  ];

  function registerCallback(callback, once = false) {
    const id = window.crypto.getRandomValues(new Uint32Array(1))[0];
    callbacks.set(id, (data) => {
      if (once) callbacks.delete(id);
      return callback?.(data);
    });
    return id;
  }

  function unregisterCallback(id) {
    callbacks.delete(id);
  }

  function runCallback(id, data) {
    callbacks.get(id)?.(data);
  }

  function emitEvent(event, payload) {
    for (const handlerId of listeners.get(event) ?? []) {
      runCallback(handlerId, { event, id: -1, payload });
    }
  }

  function streamDirectory(path, requestId) {
    queueMicrotask(() => {
      emitEvent("directory-batch", {
        path,
        request_id: requestId,
        entries: mockEntries,
      });
      emitEvent("directory-complete", {
        path,
        request_id: requestId,
      });
    });
  }

  const responses = {
    get_drives: () => [{ path: "C:\\\\", name: "C:", label: "System (C:)" }],
    read_directory: () => mockEntries,
    read_directory_stream: (args) => {
      streamDirectory(String(args?.path ?? ""), String(args?.requestId ?? ""));
      return null;
    },
    path_exists: () => true,
    get_parent_path: (args) => {
      const value = String(args?.path ?? "");
      const idx = Math.max(value.lastIndexOf("\\\\"), value.lastIndexOf("/"));
      return idx > 0 ? value.slice(0, idx) : null;
    },
  };

  window.__TAURI_INTERNALS__ = {
    transformCallback: registerCallback,
    unregisterCallback,
    runCallback,
    callbacks,
    convertFileSrc: (filePath, protocol = "asset") =>
      \`http://\${protocol}.localhost/\${encodeURIComponent(filePath)}\`,
    metadata: {
      currentWindow: { label: "main" },
      currentWebview: { label: "main", windowLabel: "main" },
    },
    plugins: {},
    invoke: async (cmd, args) => {
      if (cmd === "plugin:event|listen") {
        const event = args?.event;
        const handler = args?.handler;
        if (!listeners.has(event)) listeners.set(event, []);
        listeners.get(event).push(handler);
        return handler;
      }
      if (cmd === "plugin:event|unlisten") {
        const event = args?.event;
        const handler = args?.id;
        const bucket = listeners.get(event) ?? [];
        const index = bucket.indexOf(handler);
        if (index >= 0) bucket.splice(index, 1);
        return null;
      }
      if (cmd === "plugin:event|emit") {
        emitEvent(args?.event, args?.payload);
        return null;
      }
      if (cmd.startsWith("plugin:")) return 0;
      if (cmd === "plugin:path|resolve_directory") {
        if (args?.directory === 21) return "C:\\\\Users\\\\Test";
        return "C:\\\\";
      }
      const handler = responses[cmd];
      if (handler) return handler(args);
      console.warn("[e2e shim] unhandled command:", cmd, args);
      return null;
    },
  };

  window.__TAURI_EVENT_PLUGIN_INTERNALS__ = {
    unregisterListener: () => undefined,
  };
})();
`
