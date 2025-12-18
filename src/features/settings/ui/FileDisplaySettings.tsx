import { Calendar, FileText, Image, RotateCcw } from "lucide-react"
import { memo, useCallback } from "react"
import { cn } from "@/shared/lib"
import { Button, ScrollArea, Separator } from "@/shared/ui"
import { useFileDisplaySettings, useSettingsStore } from "../model/store"
import type { DateFormat } from "../model/types"

interface SettingItemProps {
  label: string
  description?: string
  children: React.ReactNode
}

const SettingItem = memo(function SettingItem({ label, description, children }: SettingItemProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="flex-1">
        <span className="text-sm font-medium">{label}</span>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
})

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

const ToggleSwitch = memo(function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative w-10 h-5 rounded-full transition-colors shrink-0",
        checked ? "bg-primary" : "bg-secondary",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  )
})

const dateFormats: { id: DateFormat; label: string; example: string }[] = [
  { id: "relative", label: "Относительная", example: "2 дня назад" },
  { id: "absolute", label: "Абсолютная", example: "15.01.2024" },
]

const thumbnailSizes = [
  { id: "small" as const, label: "Маленький", size: 48 },
  { id: "medium" as const, label: "Средний", size: 64 },
  { id: "large" as const, label: "Большой", size: 96 },
]

export const FileDisplaySettings = memo(function FileDisplaySettings() {
  const fileDisplay = useFileDisplaySettings()
  const { updateFileDisplay, resetSection } = useSettingsStore()

  const handleDateFormatChange = useCallback(
    (format: DateFormat) => () => updateFileDisplay({ dateFormat: format }),
    [updateFileDisplay],
  )

  const handleThumbnailSizeChange = useCallback(
    (size: "small" | "medium" | "large") => () => updateFileDisplay({ thumbnailSize: size }),
    [updateFileDisplay],
  )

  return (
    <ScrollArea className="h-125 pr-4">
      <div className="space-y-6">
        {/* Visibility */}
        <section>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <FileText size={16} />
            Отображение информации
          </h3>
          <div className="space-y-3">
            <SettingItem
              label="Расширения файлов"
              description="Показывать расширения в именах файлов"
            >
              <ToggleSwitch
                checked={fileDisplay.showFileExtensions}
                onChange={(v) => updateFileDisplay({ showFileExtensions: v })}
              />
            </SettingItem>
            <SettingItem label="Размеры файлов" description="Показывать размер файлов">
              <ToggleSwitch
                checked={fileDisplay.showFileSizes}
                onChange={(v) => updateFileDisplay({ showFileSizes: v })}
              />
            </SettingItem>
            <SettingItem label="Даты изменения" description="Показывать дату изменения файлов">
              <ToggleSwitch
                checked={fileDisplay.showFileDates}
                onChange={(v) => updateFileDisplay({ showFileDates: v })}
              />
            </SettingItem>
            <SettingItem label="Скрытые файлы" description="Показывать скрытые файлы и папки">
              <ToggleSwitch
                checked={fileDisplay.showHiddenFiles}
                onChange={(v) => updateFileDisplay({ showHiddenFiles: v })}
              />
            </SettingItem>
          </div>
        </section>

        <Separator />

        {/* Date Format */}
        <section>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Calendar size={16} />
            Формат даты
          </h3>
          <div className="flex gap-2">
            {dateFormats.map((format) => (
              <button
                key={format.id}
                type="button"
                onClick={handleDateFormatChange(format.id)}
                className={cn(
                  "flex flex-col items-start px-4 py-2 rounded-md border transition-all min-w-35",
                  fileDisplay.dateFormat === format.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-muted-foreground/50",
                )}
              >
                <span className="text-sm font-medium">{format.label}</span>
                <span className="text-xs text-muted-foreground">{format.example}</span>
              </button>
            ))}
          </div>
        </section>

        <Separator />

        {/* Thumbnail Size */}
        <section>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Image size={16} />
            Размер миниатюр
          </h3>
          <div className="flex gap-4 items-center">
            <div className="flex gap-2">
              {thumbnailSizes.map((size) => (
                <button
                  key={size.id}
                  type="button"
                  onClick={handleThumbnailSizeChange(size.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-md border transition-all",
                    fileDisplay.thumbnailSize === size.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-muted-foreground/50",
                  )}
                >
                  <div
                    className="bg-muted rounded"
                    style={{ width: size.size / 2, height: size.size / 2 }}
                  />
                  <span className="text-xs">{size.label}</span>
                </button>
              ))}
            </div>

            {/* Live preview box */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-muted-foreground">Preview</span>
              <div
                className="rounded-md border bg-background flex items-center justify-center"
                style={{
                  width: thumbnailSizes.find((s) => s.id === fileDisplay.thumbnailSize)?.size || 64,
                  height:
                    thumbnailSizes.find((s) => s.id === fileDisplay.thumbnailSize)?.size || 64,
                }}
              >
                <Image
                  size={Math.max(
                    12,
                    Math.floor(
                      (thumbnailSizes.find((s) => s.id === fileDisplay.thumbnailSize)?.size || 64) /
                        3,
                    ),
                  )}
                  className="text-muted-foreground"
                />
              </div>
            </div>
          </div>
        </section>

        <Separator />

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={() => resetSection("fileDisplay")}>
            <RotateCcw size={14} className="mr-2" />
            Сбросить
          </Button>
        </div>
      </div>
    </ScrollArea>
  )
})
