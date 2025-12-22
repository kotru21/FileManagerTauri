import type { ComponentProps } from "react"
import { cn } from "@/shared/lib"
import {
  ResizableGroup,
  ResizablePanel as ResizablePrimitivePanel,
  ResizableSeparator,
} from "./Resizable"

function ResizablePanelGroup({
  className,
  direction = "horizontal",
  ...props
}: ComponentProps<typeof ResizableGroup>) {
  return (
    <ResizableGroup
      direction={direction}
      className={cn("flex h-full w-full data-[panel-group-direction=vertical]:flex-col", className)}
      {...props}
    />
  )
}

const ResizablePanel = ResizablePrimitivePanel

function ResizableHandle({
  className,
  withHandle = false,
  ...props
}: ComponentProps<typeof ResizableSeparator> & { withHandle?: boolean }) {
  return (
    <ResizableSeparator
      className={cn(
        "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
        "hover:bg-accent transition-colors",
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
          <GripVerticalIcon className="h-2.5 w-2.5" />
        </div>
      )}
    </ResizableSeparator>
  )
}

function GripVerticalIcon({ className }: { className?: string }) {
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
      role="img"
      aria-label="Grip vertical"
      className={className}
    >
      <title>Grip vertical</title>
      <circle cx="9" cy="12" r="1" />
      <circle cx="9" cy="5" r="1" />
      <circle cx="9" cy="19" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="15" cy="5" r="1" />
      <circle cx="15" cy="19" r="1" />
    </svg>
  )
}

export type { ImperativePanelHandle } from "./Resizable"
export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
