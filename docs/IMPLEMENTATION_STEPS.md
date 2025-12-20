# Implementation Steps — progress log

Ниже — таблица шагов для High-приоритетных задач, текущий статус и примечания.

| Task | Steps (выполнено / оставшиеся) | Files touched | Notes |
|---|---|---|---|
| Refactor Zustand selectors | 1) Найдены и заменены `.getState()` в `Toolbar`, `VirtualFileList`, `FileExplorer`, `TabBar` — **выполнено**. 2) Заменены вызовы стора на селекторы (`useStore(s => s.prop)`), добавлены unit-тесты для `Toolbar` — **выполнено**. 3) Добавить профилирование/проверку рендеров и аудит остальных мест (lib/hooks) — **оставшееся**. 4) Выполнен начальный split `FileExplorer` на `container/view` ( `FileExplorer.view.tsx` ) — **выполнено (partial)**. | `src/widgets/toolbar/ui/Toolbar.tsx`, `src/widgets/file-explorer/ui/VirtualFileList.tsx`, `src/widgets/file-explorer/ui/FileExplorer.tsx`, `src/features/tabs/ui/TabBar.tsx`, `src/widgets/file-explorer/ui/FileExplorer.view.tsx` | Tests passed locally. |
| CI workflow | 1) Создан `.github/workflows/ci.yml` с шагами lint, typecheck, tests, upload coverage — **выполнено**. 2) Добавлен placeholder badge в `README.md` — **выполнено**. 3) Интегрирован базовый a11y test (skips when `vitest-axe` отсутствует); рекомендую добавить `vitest-axe` и `axe-core` в devDependencies and enable strict a11y check in CI — **оставшееся (install deps)**. 4) Добавлено правило Biome `import/no-restricted-paths` для предотвращения импортов сверху-вниз (features/widgets/pages → entities); CI запускает `biome lint` и будет выявлять нарушения — **выполнено**. | `.github/workflows/ci.yml`, `README.md`, `src/test/a11y/file-browser.a11y.test.tsx` | CI runs tests; a11y test is present and will run (skipped if deps missing). |

---

Если хотите, могу продолжить и: 
- Добавить автоматические a11y тесты (axe) и интегрировать в CI;
- Выполнить рефакторинг других компонентов для замены `useStore()` деструктуризаций на селекторы;
- Подготовить PR-патчи (если это потребуется).

**Примечание:** попытка установить `vitest-axe`/`axe-core` в этом окружении завершилась неудачей (ограничение среды). Пожалуйста, выполните `npm install --save-dev vitest-axe axe-core` локально или в CI runner, чтобы включить строгую проверку a11y.
