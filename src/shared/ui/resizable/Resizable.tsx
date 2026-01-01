import { type ComponentProps, type ForwardedRef, forwardRef, type Ref } from "react"
import type {
  GroupImperativeHandle,
  PanelImperativeHandle,
  PanelSize,
} from "react-resizable-panels"
import * as ResizablePrimitive from "react-resizable-panels"
import { cn } from "@/shared/lib"

// Primitive refs: use the real upstream imperative handle types for correct typing
export type PrimitivePanelRef = PanelImperativeHandle
export type PrimitiveGroupRef = GroupImperativeHandle

export type ImperativePanelHandle = PanelImperativeHandle

// Re-export PanelSize for consumers
export type { PanelSize }

function toPercentString(v?: number | string | null) {
  if (v === undefined || v === null) return undefined
  if (typeof v === "number") return `${v}%`
  if (typeof v === "string") {
    // If already contains unit (px/%/rem/etc) return as-is, otherwise assume percent
    return /\d+(?:\.\d+)?%$/.test(v) || /px$/.test(v) || /rem$/.test(v) ? v : `${v}%`
  }
  return String(v)
}

export const ResizableGroup = forwardRef<
  HTMLDivElement,
  ComponentProps<typeof ResizablePrimitive.Group> & {
    direction?: "horizontal" | "vertical"
    groupRef?: Ref<PrimitiveGroupRef | null>
  }
>(function ResizableGroup({ direction = "horizontal", className, groupRef, ...props }, ref) {
  const orientation = direction
  return (
    <ResizablePrimitive.Group
      {...props}
      orientation={orientation}
      data-panel-group-direction={direction}
      className={cn("flex h-full w-full", className)}
      groupRef={groupRef as Ref<PrimitiveGroupRef | null>}
      elementRef={ref as ForwardedRef<HTMLDivElement>}
    />
  )
})

// Panel props - properly typed for v4 API
// In v4, Panel does not use forwardRef - panelRef is a direct prop
type ResizablePanelProps = Omit<
  ComponentProps<typeof ResizablePrimitive.Panel>,
  "onResize" | "defaultSize" | "minSize" | "maxSize" | "collapsedSize" | "panelRef"
> & {
  defaultSize?: number | string
  minSize?: number | string
  maxSize?: number | string
  collapsedSize?: number | string
  // v4 onResize signature: (panelSize: PanelSize, id: string | number | undefined) => void
  onResize?: (panelSize: PanelSize) => void
  // panelRef is a direct prop in v4, not via forwardRef
  panelRef?: Ref<PanelImperativeHandle>
}

// NOTE: In v4, Panel uses panelRef prop directly, not forwardRef
export function ResizablePanel({
  defaultSize,
  minSize,
  maxSize,
  collapsedSize,
  onResize,
  panelRef,
  ...props
}: ResizablePanelProps) {
  return (
    <ResizablePrimitive.Panel
      {...props}
      defaultSize={toPercentString(defaultSize) ?? undefined}
      minSize={toPercentString(minSize) ?? undefined}
      maxSize={toPercentString(maxSize) ?? undefined}
      collapsedSize={toPercentString(collapsedSize) ?? undefined}
      onResize={onResize}
      panelRef={panelRef}
    />
  )
}

export function ResizableSeparator({
  className,
  withHandle = false,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Separator> & { withHandle?: boolean }) {
  return (
    <ResizablePrimitive.Separator
      {...props}
      className={cn(
        // Base styles: visible width for drag, touch-none to prevent scroll
        "relative flex items-center justify-center bg-border touch-none",
        // Horizontal separator: vertical line 4px wide
        "w-1 cursor-col-resize",
        // Vertical separator: horizontal line
        "data-[panel-group-direction=vertical]:h-1 data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:cursor-row-resize",
        // Hover effect
        "hover:bg-accent transition-colors",
        className,
      )}
      data-separator
    >
      {withHandle && (
        <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border" />
      )}
    </ResizablePrimitive.Separator>
  )
}

export { ResizableGroup as ResizablePanelGroup }
export { ResizableSeparator as ResizableHandle }
export type {
  PrimitivePanelRef as ResizablePrimitivePanelRef,
  PrimitiveGroupRef as ResizablePrimitiveGroupRef,
}
