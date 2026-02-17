import { useState } from "react"
import type { SpreadsheetSheet } from "@/shared/api/tauri/bindings"
import { cn } from "@/shared/lib"

export default function SpreadsheetPreview({ sheets }: { sheets: SpreadsheetSheet[] }) {
  const [activeSheet, setActiveSheet] = useState(0)

  if (sheets.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p className="text-sm">Пустая таблица</p>
      </div>
    )
  }

  const sheet = sheets[activeSheet]

  return (
    <div className="flex h-full flex-col">
      {/* Sheet tabs */}
      {sheets.length > 1 && (
        <div className="flex items-center gap-0.5 border-b border-border px-2 py-1 overflow-x-auto shrink-0">
          {sheets.map((s, i) => (
            <button
              key={s.name}
              type="button"
              onClick={() => setActiveSheet(i)}
              className={cn(
                "px-3 py-1 text-xs rounded-t transition-colors whitespace-nowrap",
                i === activeSheet
                  ? "bg-background text-foreground border border-b-0 border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          {sheet.headers.length > 0 && (
            <thead className="sticky top-0 z-10">
              <tr className="bg-muted/70">
                {sheet.headers.map((h, i) => {
                  const key = `h-${h || "empty"}-${i}`
                  return (
                    <th
                      key={key}
                      className="px-2 py-1.5 text-left font-medium text-foreground border border-border whitespace-nowrap"
                    >
                      {h || "\u00A0"}
                    </th>
                  )
                })}
              </tr>
            </thead>
          )}
          <tbody>
            {sheet.rows.map((row, ri) => {
              const rowKey = `r-${row[0] || ""}-${ri}`
              return (
                <tr key={rowKey} className="hover:bg-muted/30">
                  {row.map((cell, ci) => {
                    const cellKey = `c-${ri}-${cell.slice(0, 16) || "empty"}-${ci}`
                    return (
                      <td
                        key={cellKey}
                        className="px-2 py-1 border border-border text-foreground whitespace-nowrap max-w-75 truncate"
                      >
                        {cell || "\u00A0"}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 border-t border-border px-3 py-1.5 text-xs text-muted-foreground shrink-0">
        <span>
          {sheet.total_rows} {sheet.total_rows === 1 ? "строка" : "строк"}
        </span>
        {sheet.truncated && (
          <span className="italic">(показаны первые {sheet.rows.length + 1})</span>
        )}
      </div>
    </div>
  )
}
