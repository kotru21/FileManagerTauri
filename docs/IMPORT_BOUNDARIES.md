# Import Boundaries (Biome rule)

Цель: запретить *импорты "сверху вниз"* (higher → lower) между слоями по FSD, чтобы предотвратить зависимость низкоуровневых `entities` от более высоких слоёв (`features`, `widgets`, `pages`).

## Что добавлено
- В `biome.json` добавлено правило `import/no-restricted-paths` с зонами:
  - запрещены импорты из `./src/features` в `./src/entities`
  - запрещены импорты из `./src/widgets` в `./src/entities`
  - запрещены импорты из `./src/pages` в `./src/entities`
  - запрещены импорты из `./src/widgets` в `./src/features`

> CI уже запускает `biome lint` (см. `.github/workflows/ci.yml`) — PR с нарушениями будет падать на этапе lint.

## Примеры нарушений и способы исправления

Плохой пример (нарушение):

```ts
// src/entities/file-entry/ui/FileRow.tsx
import { useFileDisplaySettings } from "@/features/settings"; // ❌

export function FileRow() {
  const display = useFileDisplaySettings();
  // ...
}
```

Исправление 1 — передать значение через `props` от более высокого слоя (widgets/pages):

```ts
// src/widgets/file-explorer/ui/FileExplorer.tsx
import { FileRow } from "@/entities/file-entry";
import { useFileDisplaySettings } from "@/features/settings";

export function FileExplorer() {
  const display = useFileDisplaySettings();
  return <FileRow displayMode={display.mode} />; // ✅
}

// src/entities/file-entry/ui/FileRow.tsx
export function FileRow({ displayMode }: { displayMode: "compact" | "detail" }) {
  // use displayMode prop
}
```

Исправление 2 — создать thin adapter/facade в `shared` (например `shared/lib/featureAdapters`) и использовать нейтральный API из `entities`:

```ts
// src/shared/lib/featureAdapters.ts
export function getDisplayMode() {
  // wrapper that reads settings from features; used by higher layers to inject into entities
}
```

## Как отлавливать и исправлять
1. Запустить локально: `npm run lint` или `npx biome lint .` — нарушенные места покажут файлы и строки.  
2. Для каждого нарушения — выполнить либо передачу значения через props, либо вынести логику из `entity` в `feature`/`shared` адаптер.  
3. Добавить unit-тесты для проверяемого поведения и, при необходимости, интеграционные тесты в `widgets/pages`.

## Контакты
Если есть сомнения по границам (возможно сознательное отклонение), пожалуйста, откройте issue с ссылкой на файл и коротким описанием trade-off'а: `refactor: review import boundary for <path>`.
