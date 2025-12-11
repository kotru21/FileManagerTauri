import { useCallback, useRef } from "react";
import { cn } from "@/shared/lib";

interface ColumnHeaderProps {
  columnWidths: {
    size: number;
    date: number;
    padding: number;
  };
  onColumnResize: (column: "size" | "date" | "padding", width: number) => void;
  className?: string;
}

const handleWidth = 8;

export function ColumnHeader({
  columnWidths,
  onColumnResize,
  className,
}: ColumnHeaderProps) {
  const resizeSize = useResizeHandler({
    width: columnWidths.size,
    min: 50,
    max: 150,
    onWidth: (w) => onColumnResize("size", w),
  });

  const resizeDate = useResizeHandler({
    width: columnWidths.date,
    min: 80,
    max: 250,
    onWidth: (w) => onColumnResize("date", w),
  });

  const resizePadding = useResizeHandler({
    width: columnWidths.padding,
    min: 8,
    max: 100,
    onWidth: (w) => onColumnResize("padding", w),
  });

  return (
    <div
      className={cn(
        "flex items-center gap-0 px-3 py-1.5 border-b bg-muted/30 text-xs font-medium text-muted-foreground select-none",
        className
      )}>
      <span className="w-[18px] mr-3" /> {/* Icon placeholder */}
      <div className="flex-1 text-center">Имя</div>
      {/* Handle between Имя and Размер */}
      <ResizeHandle onResize={resizeSize} />
      <Column width={columnWidths.size} title="Размер" />
      {/* Handle between Размер и Изменён */}
      <ResizeHandle onResize={resizeDate} />
      <Column width={columnWidths.date} title="Изменён" />
      {/* Right padding handle to adjust trailing spacing */}
      <ResizeHandle onResize={resizePadding} />
      <div className="shrink-0" style={{ width: columnWidths.padding }} />
    </div>
  );
}

interface ColumnProps {
  width: number;
  title: string;
}

function Column({ width, title }: ColumnProps) {
  return (
    <div
      className="shrink-0 text-center text-xs font-medium text-muted-foreground"
      style={{ width }}>
      {title}
    </div>
  );
}

interface ResizeHandleProps {
  onResize: (delta: number) => void;
}

function ResizeHandle({ onResize }: ResizeHandleProps) {
  const startXRef = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      startXRef.current = e.clientX;

      const handleMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startXRef.current;
        onResize(delta);
      };

      const handleUp = () => {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
      };

      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
    },
    [onResize]
  );

  return (
    <div
      className="shrink-0 h-5 w-2 cursor-col-resize bg-border hover:bg-primary/60 active:bg-primary rounded-sm transition-colors"
      onMouseDown={onMouseDown}
      title="Перетащите для изменения ширины"
      style={{ marginInline: -(handleWidth / 2) }}
    />
  );
}

interface ResizeHandlerConfig {
  width: number;
  min: number;
  max: number;
  onWidth: (width: number) => void;
}

function useResizeHandler({ width, min, max, onWidth }: ResizeHandlerConfig) {
  return useCallback(
    (delta: number) => {
      const next = clamp(width - delta, min, max);
      onWidth(next);
    },
    [width, min, max, onWidth]
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
