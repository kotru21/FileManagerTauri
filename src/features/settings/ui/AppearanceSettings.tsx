import { Moon, Palette, RotateCcw, Sun, Type } from "lucide-react"
import { memo, useCallback } from "react"
import { cn } from "@/shared/lib"
import { Button, ScrollArea, Separator } from "@/shared/ui"
import { useAppearanceSettings, useSettingsStore } from "../model/store"
import type { FontSize, Theme } from "../model/types"

const themes: { id: Theme; label: string; icon: React.ReactNode }[] = [
  { id: "light", label: "Светлая", icon: <Sun size={18} /> },
  { id: "dark", label: "Тёмная", icon: <Moon size={18} /> },
  { id: "system", label: "Системная", icon: <Palette size={18} /> },
]

const fontSizes: { id: FontSize; label: string; preview: string }[] = [
  { id: "small", label: "Маленький", preview: "12px" },
  { id: "medium", label: "Средний", preview: "14px" },
  { id: "large", label: "Большой", preview: "16px" },
]

const accentColors = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
]

interface SettingItemProps {
  label: string
  description?: string
  children: React.ReactNode
}

const SettingItem = memo(function SettingItem({ label, description, children }: SettingItemProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div>
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
        "relative w-10 h-5 rounded-full transition-colors",
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

export const AppearanceSettings = memo(function AppearanceSettings() {
  const appearance = useAppearanceSettings()
  const { updateAppearance, resetSection } = useSettingsStore()

  const handleThemeChange = useCallback(
    (theme: Theme) => () => updateAppearance({ theme }),
    [updateAppearance],
  )

  const handleFontSizeChange = useCallback(
    (fontSize: FontSize) => () => updateAppearance({ fontSize }),
    [updateAppearance],
  )

  const handleColorChange = useCallback(
    (color: string) => () => updateAppearance({ accentColor: color }),
    [updateAppearance],
  )

  return (
    <ScrollArea className="h-125 pr-4">
      <div className="space-y-6">
        {/* Theme */}
        <section>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Palette size={16} />
            Тема
          </h3>
          <div className="flex gap-2">
            {themes.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={handleThemeChange(theme.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md border transition-all",
                  appearance.theme === theme.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-muted-foreground/50",
                )}
              >
                {theme.icon}
                <span className="text-sm">{theme.label}</span>
              </button>
            ))}
          </div>
        </section>

        <Separator />

        {/* Accent Color */}
        <section>
          <h3 className="text-sm font-medium mb-3">Акцентный цвет</h3>
          <div className="flex gap-2 flex-wrap">
            {accentColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={handleColorChange(color)}
                className={cn(
                  "w-8 h-8 rounded-full transition-transform hover:scale-110",
                  appearance.accentColor === color &&
                    "ring-2 ring-offset-2 ring-offset-background ring-current",
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </section>

        <Separator />

        {/* Font Size */}
        <section>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Type size={16} />
            Размер шрифта
          </h3>
          <div className="flex gap-2">
            {fontSizes.map((size) => (
              <button
                key={size.id}
                type="button"
                onClick={handleFontSizeChange(size.id)}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-md border transition-all min-w-20",
                  appearance.fontSize === size.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-muted-foreground/50",
                )}
              >
                <span className="text-sm">{size.label}</span>
                <span className="text-xs text-muted-foreground">{size.preview}</span>
              </button>
            ))}
          </div>
        </section>

        <Separator />

        {/* Animations */}
        <section>
          <h3 className="text-sm font-medium mb-3">Анимации</h3>
          <div className="space-y-3">
            <SettingItem label="Включить анимации" description="Плавные переходы и эффекты">
              <ToggleSwitch
                checked={appearance.enableAnimations}
                onChange={(v) => updateAppearance({ enableAnimations: v })}
              />
            </SettingItem>
            <SettingItem
              label="Уменьшенное движение"
              description="Минимизировать анимации для комфорта"
            >
              <ToggleSwitch
                checked={appearance.reducedMotion}
                onChange={(v) => updateAppearance({ reducedMotion: v })}
              />
            </SettingItem>
          </div>
        </section>

        <Separator />

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={() => resetSection("appearance")}>
            <RotateCcw size={14} className="mr-2" />
            Сбросить
          </Button>
        </div>
      </div>
    </ScrollArea>
  )
})
