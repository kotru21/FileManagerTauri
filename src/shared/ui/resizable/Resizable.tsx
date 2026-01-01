import { type ComponentProps, type ForwardedRef, forwardRef, type Ref } from "react"
import type {
  GroupImperativeHandle,
  PanelImperativeHandle,
  PanelSize,
} from "react-resizable-panels"
import * as ResizablePrimitive from "react-resizable-panels"
import { cn } from "@/shared/lib"

export type PrimitivePanelRef = PanelImperativeHandle
export type PrimitiveGroupRef = GroupImperativeHandle

export type ImperativePanelHandle = PanelImperativeHandle

export type { PanelSize }

function toPercentString(v?: number | string | null) {
  if (v === undefined || v === null) return undefined
  if (typeof v === "number") return `${v}%`
  if (typeof v === "string") {
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

type ResizablePanelProps = Omit<
  ComponentProps<typeof ResizablePrimitive.Panel>,
  "onResize" | "defaultSize" | "minSize" | "maxSize" | "collapsedSize" | "panelRef"
> & {
  defaultSize?: number | string
  minSize?: number | string
  maxSize?: number | string
  collapsedSize?: number | string
  onResize?: (panelSize: PanelSize) => void
  panelRef?: Ref<PanelImperativeHandle>
}
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
        "relative flex items-center justify-center bg-border touch-none",
        "w-1 cursor-col-resize",
        "data-[panel-group-direction=vertical]:h-1 data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:cursor-row-resize",
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
