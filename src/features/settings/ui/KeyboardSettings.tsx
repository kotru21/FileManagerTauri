import { Keyboard, RotateCcw } from "lucide-react"
import { memo } from "react"
import { useKeyboardSettings, useSettingsStore } from "@/entities/app-settings"
import { cn } from "@/shared/lib"
import { Button, ScrollArea, Separator } from "@/shared/ui"

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

export const KeyboardSettings = memo(function KeyboardSettings() {
  const keyboard = useKeyboardSettings()
  const { updateKeyboard, resetSection } = useSettingsStore()

  const handleToggleShortcut = (id: string) => {
    const updated = keyboard.shortcuts.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    updateKeyboard({ shortcuts: updated })
  }

  return (
    <ScrollArea className="h-125 pr-4">
      <div className="space-y-6">
        <section>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Keyboard size={16} />
            Горячие клавиши
          </h3>
          <div className="space-y-1">
            {keyboard.shortcuts.map((shortcut) => (
              <div
                key={shortcut.id}
                className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent/50"
              >
                <div className="flex items-center gap-3">
                  <ToggleSwitch
                    checked={shortcut.enabled}
                    onChange={() => handleToggleShortcut(shortcut.id)}
                  />
                  <span className="text-sm">{shortcut.action}</span>
                </div>
                <kbd className="px-2 py-1 text-xs bg-muted rounded font-mono">{shortcut.keys}</kbd>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        <section>
          <h3 className="text-sm font-medium mb-3">Дополнительно</h3>
          <div className="flex items-center justify-between py-2">
            <div>
              <span className="text-sm font-medium">Vim режим</span>
              <p className="text-xs text-muted-foreground">Навигация в стиле Vim (h, j, k, l)</p>
            </div>
            <ToggleSwitch
              checked={keyboard.enableVimMode}
              onChange={(v) => updateKeyboard({ enableVimMode: v })}
            />
          </div>
        </section>

        <Separator />

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={() => resetSection("keyboard")}>
            <RotateCcw size={14} className="mr-2" />
            Сбросить
          </Button>
        </div>
      </div>
    </ScrollArea>
  )
})
