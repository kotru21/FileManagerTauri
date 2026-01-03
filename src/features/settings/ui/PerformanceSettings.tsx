import { Gauge, RotateCcw } from "lucide-react"
import { memo } from "react"
import { usePerformanceSettings, useSettingsStore } from "@/entities/app-settings"
import { cn } from "@/shared/lib"
import { Button, ScrollArea, Separator } from "@/shared/ui"

interface SliderProps {
  label: string
  description?: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (value: number) => void
}

const Slider = memo(function Slider({
  label,
  description,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: SliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium">{label}</span>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <span className="text-sm text-muted-foreground">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
      />
    </div>
  )
})

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  ariaLabel?: string
}

const ToggleSwitch = memo(function ToggleSwitch({
  checked,
  onChange,
  ariaLabel,
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={ariaLabel}
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

export const PerformanceSettings = memo(function PerformanceSettings() {
  const performance = usePerformanceSettings()
  const { updatePerformance, resetSection } = useSettingsStore()

  return (
    <ScrollArea className="h-125 pr-4">
      <div className="space-y-6">
        <section>
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Gauge size={16} />
            Виртуализация
          </h3>
          <div className="space-y-4">
            <Slider
              label="Порог виртуализации"
              description="Минимальное количество файлов для включения виртуализации"
              value={performance.virtualListThreshold}
              min={50}
              max={500}
              step={50}
              onChange={(v) => updatePerformance({ virtualListThreshold: v })}
            />
          </div>
        </section>

        <Separator />

        <section>
          <h3 className="text-sm font-medium mb-4">Кэширование</h3>
          <div className="space-y-4">
            <Slider
              label="Размер кэша миниатюр"
              description="Количество кэшируемых изображений"
              value={performance.thumbnailCacheSize}
              min={50}
              max={500}
              step={50}
              onChange={(v) => updatePerformance({ thumbnailCacheSize: v })}
            />
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm font-medium">Ленивая загрузка изображений</span>
                <p className="text-xs text-muted-foreground">
                  Загружать изображения только при прокрутке
                </p>
              </div>
              <ToggleSwitch
                checked={performance.lazyLoadImages}
                ariaLabel="Ленивая загрузка изображений"
                onChange={(v) => updatePerformance({ lazyLoadImages: v })}
              />
            </div>
          </div>
        </section>

        <Separator />

        <section>
          <h3 className="text-sm font-medium mb-4">Поиск</h3>
          <div className="space-y-4">
            <Slider
              label="Максимум результатов"
              description="Ограничение результатов поиска"
              value={performance.maxSearchResults}
              min={100}
              max={5000}
              step={100}
              onChange={(v) => updatePerformance({ maxSearchResults: v })}
            />
          </div>
        </section>

        <Separator />

        <section>
          <h3 className="text-sm font-medium mb-4">Задержки</h3>
          <div className="space-y-4">
            <Slider
              label="Debounce задержка"
              description="Задержка перед применением фильтров"
              value={performance.debounceDelay}
              min={50}
              max={500}
              step={50}
              unit="мс"
              onChange={(v) => updatePerformance({ debounceDelay: v })}
            />
          </div>
        </section>

        <Separator />

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={() => resetSection("performance")}>
            <RotateCcw size={14} className="mr-2" />
            Сбросить
          </Button>
        </div>
      </div>
    </ScrollArea>
  )
})
