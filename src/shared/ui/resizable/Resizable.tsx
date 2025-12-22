import { type ComponentProps, type ForwardedRef, forwardRef, type Ref } from "react"
import type { GroupImperativeHandle, PanelImperativeHandle } from "react-resizable-panels"
import * as ResizablePrimitive from "react-resizable-panels"
import { cn } from "@/shared/lib"

// Primitive refs: use the real upstream imperative handle types for correct typing
export type PrimitivePanelRef = PanelImperativeHandle
export type PrimitiveGroupRef = GroupImperativeHandle

export type ImperativePanelHandle = PanelImperativeHandle

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

export const ResizablePanel = forwardRef<
  PrimitivePanelRef | null,
  ComponentProps<typeof ResizablePrimitive.Panel> & {
    defaultSize?: number | string
    minSize?: number | string
    maxSize?: number | string
    collapsedSize?: number | string
  }
>(function ResizablePanel({ defaultSize, minSize, maxSize, collapsedSize, ...props }, ref) {
  return (
    <ResizablePrimitive.Panel
      {...props}
      defaultSize={toPercentString(defaultSize) ?? undefined}
      minSize={toPercentString(minSize) ?? undefined}
      maxSize={toPercentString(maxSize) ?? undefined}
      collapsedSize={toPercentString(collapsedSize) ?? undefined}
      panelRef={ref as ForwardedRef<PrimitivePanelRef | null>}
    />
  )
})

export function ResizableSeparator({
  className,
  withHandle = false,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Separator> & { withHandle?: boolean }) {
  return (
    <ResizablePrimitive.Separator
      {...props}
      className={cn(
        "relative flex w-px items-center justify-center bg-border hover:bg-accent transition-colors",
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
