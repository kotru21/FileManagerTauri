/**
 * Resizable Panels - wrapper around react-resizable-panels v4
 *
 * This module provides a thin wrapper with shadcn/ui styling.
 * Uses the v4 API directly: Group, Panel, Separator with orientation prop.
 */

import type { ComponentProps, RefObject } from "react"
import {
  Group,
  type GroupImperativeHandle,
  Panel,
  type PanelImperativeHandle,
  type PanelSize,
  Separator,
} from "react-resizable-panels"
import { cn } from "@/shared/lib"

// Re-export types for consumers
export type { PanelImperativeHandle, GroupImperativeHandle, PanelSize }
export type ImperativePanelHandle = PanelImperativeHandle

// ============================================================================
// ResizablePanelGroup - wrapper around Group
// ============================================================================

type GroupProps = ComponentProps<typeof Group>

interface ResizablePanelGroupProps extends Omit<GroupProps, "orientation"> {
  /** Layout direction - maps to orientation in v4 */
  direction?: "horizontal" | "vertical"
}

export function ResizablePanelGroup({
  direction = "horizontal",
  className,
  ...props
}: ResizablePanelGroupProps) {
  return (
    <Group
      orientation={direction}
      data-panel-group-direction={direction}
      className={cn("flex h-full w-full", direction === "vertical" && "flex-col", className)}
      {...props}
    />
  )
}

// ============================================================================
// ResizablePanel - wrapper around Panel
// ============================================================================

type PanelProps = ComponentProps<typeof Panel>

interface ResizablePanelProps extends PanelProps {
  /** Ref to imperatively control the panel (overrides library's panelRef type) */
  panelRef?: RefObject<PanelImperativeHandle | null>
}

export function ResizablePanel({ className, panelRef, ...props }: ResizablePanelProps) {
  return <Panel className={cn("overflow-hidden", className)} panelRef={panelRef} {...props} />
}

// ============================================================================
// ResizableHandle - wrapper around Separator with visual handle
// ============================================================================

type SeparatorProps = ComponentProps<typeof Separator>

interface ResizableHandleProps extends SeparatorProps {
  /** Show a visual grip handle in the center */
  withHandle?: boolean
}

export function ResizableHandle({ className, withHandle = false, ...props }: ResizableHandleProps) {
  return (
    <Separator
      className={cn(
        // Base styling
        "relative flex items-center justify-center",
        "bg-border transition-colors select-none",
        // Prevent text selection and touch scrolling during drag
        "touch-none",
        // Horizontal layout: vertical separator bar
        "w-1 cursor-col-resize",
        // Vertical layout: horizontal separator bar
        "data-[orientation=vertical]:h-1 data-[orientation=vertical]:w-full data-[orientation=vertical]:cursor-row-resize",
        // Hover state
        "hover:bg-accent",
        // Focus state
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div
          className={cn(
            "z-10 flex items-center justify-center rounded-sm border bg-border",
            "h-4 w-3",
            "data-[orientation=vertical]:h-3 data-[orientation=vertical]:w-4",
          )}
        >
          <GripIcon className="h-2.5 w-2.5 text-muted-foreground" />
        </div>
      )}
    </Separator>
  )
}

// ============================================================================
// GripIcon - visual indicator for the handle
// ============================================================================

function GripIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="9" cy="12" r="1" />
      <circle cx="9" cy="5" r="1" />
      <circle cx="9" cy="19" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="15" cy="5" r="1" />
      <circle cx="15" cy="19" r="1" />
    </svg>
  )
}
