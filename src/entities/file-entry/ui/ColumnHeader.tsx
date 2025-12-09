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

export function ColumnHeader({
  columnWidths,
  onColumnResize,
  className,
}: ColumnHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-0 px-3 py-1.5 border-b bg-muted/30 text-xs font-medium text-muted-foreground select-none",
        className
      )}>
      <span className="w-[18px] mr-3" /> {/* Icon placeholder */}
      <span className="flex-1">Имя</span>
      <ResizableColumn
        width={columnWidths.size}
        minWidth={50}
        maxWidth={150}
        onResize={(w) => onColumnResize("size", w)}
        showLeftBorder>
        Размер
      </ResizableColumn>
      <ResizableColumn
        width={columnWidths.date}
        minWidth={80}
        maxWidth={250}
        onResize={(w) => onColumnResize("date", w)}
        showLeftBorder>
        Изменён
      </ResizableColumn>
      <ResizableColumn
        width={columnWidths.padding}
        minWidth={8}
        maxWidth={100}
        onResize={(w) => onColumnResize("padding", w)}
        showLeftBorder
      />
    </div>
  );
}

interface ResizableColumnProps {
  width: number;
  minWidth: number;
  maxWidth: number;
  onResize: (width: number) => void;
  children?: React.ReactNode;
  showLeftBorder?: boolean;
}

function ResizableColumn({
  width,
  minWidth,
  maxWidth,
  onResize,
  children,
  showLeftBorder,
}: ResizableColumnProps) {
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      startXRef.current = e.clientX;
      startWidthRef.current = width;

      const handleMouseMove = (e: MouseEvent) => {
        // Negative delta because handle is on the left - dragging left increases width
        const delta = startXRef.current - e.clientX;
        const newWidth = Math.min(
          maxWidth,
          Math.max(minWidth, startWidthRef.current + delta)
        );
        onResize(newWidth);
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [width, minWidth, maxWidth, onResize]
  );

  return (
    <div
      className="relative text-right shrink-0 flex items-center"
      style={{ width }}>
      {/* Visible resize handle on the left edge */}
      {showLeftBorder && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px] cursor-col-resize bg-border hover:bg-primary/50 active:bg-primary transition-colors -ml-[1.5px] rounded-sm"
          onMouseDown={handleMouseDown}
          title="Перетащите для изменения ширины"
        />
      )}
      {children && <span className="flex-1 truncate px-2">{children}</span>}
    </div>
  );
}
