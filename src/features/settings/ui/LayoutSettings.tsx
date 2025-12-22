import {
  Check,
  Columns,
  Eye,
  EyeOff,
  Layout,
  Monitor,
  PanelLeft,
  PanelRight,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react"
import { memo, useCallback, useState } from "react"
import { cn } from "@/shared/lib"
import { Button, Input, ScrollArea, Separator } from "@/shared/ui"
import { layoutPresets } from "../model/layoutPresets"
import { useLayoutSettings, useSettingsStore } from "../model/store"
import type { LayoutPresetId } from "../model/types"

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  disabled?: boolean
  onChange: (value: number) => void
}

const Slider = memo(function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  disabled = false,
  onChange,
}: SliderProps) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-muted-foreground w-28 shrink-0">{label}</span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className={cn(
          "flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary",
          disabled && "opacity-50 pointer-events-none",
        )}
      />
      <span className="text-sm text-muted-foreground w-16 text-right">
        {value}
        {unit}
      </span>
    </div>
  )
})

interface ToggleProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  icon?: React.ReactNode
}

const Toggle = memo(function Toggle({ label, description, checked, onChange, icon }: ToggleProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="flex items-center justify-center w-5 h-5 mt-0.5">{icon}</div>
      <div className="flex-1">
        <span className="text-sm font-medium group-hover:text-foreground transition-colors">
          {label}
        </span>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
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
    </label>
  )
})

interface PresetCardProps {
  preset: (typeof layoutPresets)[LayoutPresetId]
  isActive: boolean
  onSelect: () => void
}

const PresetCard = memo(function PresetCard({ preset, isActive, onSelect }: PresetCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex flex-col items-start p-3 rounded-lg border transition-all text-left",
        isActive
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border hover:border-muted-foreground/50",
      )}
    >
      {isActive && (
        <div className="absolute top-2 right-2">
          <Check size={16} className="text-primary" />
        </div>
      )}
      <div className="flex items-center gap-2 mb-1">
        <Layout size={16} className="text-muted-foreground" />
        <span className="font-medium text-sm">{preset.name}</span>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2">{preset.description}</p>
      <div className="flex gap-1 mt-2 w-full">
        {preset.layout.showSidebar && (
          <div
            className="h-4 bg-muted rounded"
            style={{ width: `${preset.layout.sidebarSize}%` }}
          />
        )}
        <div
          className="h-4 bg-primary/20 rounded flex-1"
          style={{
            minWidth: `${preset.layout.mainPanelSize}%`,
          }}
        />
        {preset.layout.showPreview && (
          <div
            className="h-4 bg-muted rounded"
            style={{ width: `${preset.layout.previewPanelSize}%` }}
          />
        )}
      </div>
    </button>
  )
})

export const LayoutSettings = memo(function LayoutSettings() {
  const layout = useLayoutSettings()
  const {
    setLayoutPreset,
    updatePanelLayout,
    updateLayout,
    updateColumnWidths,
    saveCustomLayout,
    deleteCustomLayout,
    applyCustomLayout,
    resetSection,
  } = useSettingsStore()

  const [newLayoutName, setNewLayoutName] = useState("")
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  const handlePresetSelect = useCallback(
    (presetId: LayoutPresetId) => () => setLayoutPreset(presetId),
    [setLayoutPreset],
  )

  const handleSaveLayout = useCallback(() => {
    if (newLayoutName.trim()) {
      saveCustomLayout(newLayoutName.trim())
      setNewLayoutName("")
      setShowSaveDialog(false)
    }
  }, [newLayoutName, saveCustomLayout])

  const handleDeleteCustom = useCallback(
    (id: string) => () => deleteCustomLayout(id),
    [deleteCustomLayout],
  )

  const handleApplyCustom = useCallback(
    (id: string) => () => applyCustomLayout(id),
    [applyCustomLayout],
  )

  return (
    <ScrollArea className="h-125 pr-4">
      <div className="space-y-6">
        {/* Presets */}
        <section>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Monitor size={16} />
            Пресеты лейаута
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(layoutPresets) as LayoutPresetId[]).map((id) => (
              <PresetCard
                key={id}
                preset={layoutPresets[id]}
                isActive={layout.currentPreset === id}
                onSelect={handlePresetSelect(id)}
              />
            ))}
          </div>
        </section>

        <Separator />

        {/* Panel Settings */}
        <section>
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Columns size={16} />
            Настройки панелей
          </h3>
          <div className="space-y-4">
            <Toggle
              label="Боковая панель"
              description="Показывать панель навигации"
              checked={layout.panelLayout.showSidebar}
              onChange={(v) => updatePanelLayout({ showSidebar: v })}
              icon={<PanelLeft size={16} className="text-muted-foreground" />}
            />

            {layout.panelLayout.showSidebar && (
              <>
                <Toggle
                  label="Свёрнутый режим"
                  description="Компактный вид боковой панели"
                  checked={layout.panelLayout.sidebarCollapsed ?? false}
                  onChange={(v) => updatePanelLayout({ sidebarCollapsed: v })}
                  icon={<PanelLeft size={16} className="text-muted-foreground" />}
                />

                <Toggle
                  label="Закрепить ширину"
                  description="Фиксировать ширину сайдбара и управлять ею через ползунок"
                  checked={layout.panelLayout.sidebarSizeLocked ?? false}
                  onChange={(v) => updatePanelLayout({ sidebarSizeLocked: v })}
                  icon={<PanelLeft size={16} className="text-muted-foreground" />}
                />

                <Slider
                  label="Ширина сайдбара"
                  value={layout.panelLayout.sidebarSize}
                  min={10}
                  max={40}
                  unit="%"
                  onChange={(v) => updatePanelLayout({ sidebarSize: v })}
                  disabled={!layout.panelLayout.sidebarSizeLocked}
                />
              </>
            )}

            <Toggle
              label="Панель превью"
              description="Показывать превью выбранного файла"
              checked={layout.panelLayout.showPreview}
              onChange={(v) => updatePanelLayout({ showPreview: v })}
              icon={<PanelRight size={16} className="text-muted-foreground" />}
            />

            {layout.panelLayout.showPreview && (
              <>
                <Toggle
                  label="Закрепить ширину"
                  description="Фиксировать ширину превью и управлять ею через ползунок"
                  checked={layout.panelLayout.previewSizeLocked ?? false}
                  onChange={(v) => updatePanelLayout({ previewSizeLocked: v })}
                  icon={<PanelRight size={16} className="text-muted-foreground" />}
                />

                <Slider
                  label="Ширина превью"
                  value={layout.panelLayout.previewPanelSize}
                  min={15}
                  max={50}
                  unit="%"
                  onChange={(v) => updatePanelLayout({ previewPanelSize: v })}
                  disabled={!layout.panelLayout.previewSizeLocked}
                />
              </>
            )}
          </div>
        </section>

        <Separator />

        {/* UI Elements */}
        <section>
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Layout size={16} />
            Элементы интерфейса
          </h3>
          <div className="space-y-4">
            <Toggle
              label="Панель инструментов"
              checked={layout.showToolbar}
              onChange={(v) => updateLayout({ showToolbar: v })}
              icon={<Eye size={16} className="text-muted-foreground" />}
            />
            <Toggle
              label="Хлебные крошки"
              checked={layout.showBreadcrumbs}
              onChange={(v) => updateLayout({ showBreadcrumbs: v })}
              icon={<Eye size={16} className="text-muted-foreground" />}
            />
            <Toggle
              label="Статус бар"
              checked={layout.showStatusBar}
              onChange={(v) => updateLayout({ showStatusBar: v })}
              icon={<Eye size={16} className="text-muted-foreground" />}
            />
            <Toggle
              label="Компактный режим"
              description="Уменьшенные отступы и элементы"
              checked={layout.compactMode}
              onChange={(v) => updateLayout({ compactMode: v })}
              icon={<EyeOff size={16} className="text-muted-foreground" />}
            />

            <Toggle
              label="Заголовки колонок в простом списке"
              description="Показывать названия колонок даже при использовании простого (не виртуального) списка"
              checked={layout.showColumnHeadersInSimpleList}
              onChange={(v) => updateLayout({ showColumnHeadersInSimpleList: v })}
              icon={<Columns size={16} className="text-muted-foreground" />}
            />
          </div>
        </section>

        <Separator />

        {/* Column Widths */}
        <section>
          <h3 className="text-sm font-medium mb-4">Ширина колонок</h3>
          <div className="space-y-3">
            <Slider
              label="Размер"
              value={layout.columnWidths.size}
              min={50}
              max={150}
              unit="px"
              onChange={(v) => updateColumnWidths({ size: v })}
            />
            <Slider
              label="Дата"
              value={layout.columnWidths.date}
              min={80}
              max={200}
              unit="px"
              onChange={(v) => updateColumnWidths({ date: v })}
            />
          </div>
        </section>

        <Separator />

        {/* Custom Layouts */}
        <section>
          <h3 className="text-sm font-medium mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Save size={16} />
              Сохранённые лейауты
            </span>
            <Button variant="ghost" size="sm" onClick={() => setShowSaveDialog(!showSaveDialog)}>
              <Plus size={14} className="mr-1" />
              Сохранить текущий
            </Button>
          </h3>

          {showSaveDialog && (
            <div className="flex gap-2 mb-3">
              <Input
                placeholder="Название лейаута"
                value={newLayoutName}
                onChange={(e) => setNewLayoutName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveLayout()}
                className="flex-1"
              />
              <Button size="sm" onClick={handleSaveLayout}>
                Сохранить
              </Button>
            </div>
          )}

          {layout.customLayouts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Нет сохранённых лейаутов
            </p>
          ) : (
            <div className="space-y-2">
              {layout.customLayouts.map((custom) => (
                <div
                  key={custom.id}
                  className="flex items-center justify-between p-2 rounded-md bg-secondary/50"
                >
                  <button
                    type="button"
                    onClick={handleApplyCustom(custom.id)}
                    className="text-sm hover:text-primary transition-colors"
                  >
                    {custom.name}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleDeleteCustom(custom.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        <Separator />

        {/* Reset */}
        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={() => resetSection("layout")}>
            <RotateCcw size={14} className="mr-2" />
            Сбросить настройки лейаута
          </Button>
        </div>
      </div>
    </ScrollArea>
  )
})
