import type { ImperativePanelHandle } from "react-resizable-panels"
import type { PanelLayout } from "./model/layoutStore"

let sidebarRef: React.RefObject<ImperativePanelHandle | null> | null = null
let _previewRef: React.RefObject<ImperativePanelHandle | null> | null = null
// Keep reference variable intentionally — mark as used to avoid TS unused var error
void _previewRef

export function registerSidebar(ref: React.RefObject<ImperativePanelHandle | null> | null) {
  sidebarRef = ref
}

export function registerPreview(ref: React.RefObject<ImperativePanelHandle | null> | null) {
  _previewRef = ref
}

function defer(fn: () => void) {
  // Defer to next tick to allow panels to mount — use globalThis so it's safe in browser and Node
  globalThis.setTimeout(fn, 0)
}

export function applyLayoutToPanels(layout: PanelLayout) {
  // Sidebar collapsed state
  if (layout.sidebarCollapsed) {
    defer(() => sidebarRef?.current?.collapse?.())
  } else {
    defer(() => sidebarRef?.current?.expand?.())
  }

  // No imperative API for preview collapse/expand; keep placeholder for future
}

export function forceCollapseSidebar() {
  defer(() => sidebarRef?.current?.collapse?.())
}

export function forceExpandSidebar() {
  defer(() => sidebarRef?.current?.expand?.())
}
