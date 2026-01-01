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

export type { PanelImperativeHandle, GroupImperativeHandle, PanelSize }
export type ImperativePanelHandle = PanelImperativeHandle

type GroupProps = ComponentProps<typeof Group>

interface ResizablePanelGroupProps extends Omit<GroupProps, "orientation"> {
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
  withHandle?: boolean
}

export function ResizableHandle({ className, withHandle = false, ...props }: ResizableHandleProps) {
  return (
    <Separator
      className={cn(
        "relative flex items-center justify-center",
        "bg-border transition-colors select-none",
        "touch-none",
        "w-1 cursor-col-resize",
        "data-[orientation=vertical]:h-1 data-[orientation=vertical]:w-full data-[orientation=vertical]:cursor-row-resize",
        "hover:bg-accent",
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
