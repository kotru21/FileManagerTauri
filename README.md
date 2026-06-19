# File Manager на Tauri

![Tauri](https://img.shields.io/badge/Tauri-2.x-blue)
![React](https://img.shields.io/badge/React-19.2-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6)
[![CI](https://github.com/kotru21/FileManagerTauri/actions/workflows/ci.yml/badge.svg)](https://github.com/kotru21/FileManagerTauri/actions)
[![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/dwyl/esta/issues)

<img width="1280" height="640" alt="File manager UI" src="https://github.com/user-attachments/assets/0d8e2221-017d-48ea-a060-ceb78ba497e4" />

Десктопный файловый менеджер на **Tauri 2.x + React 19.2 + TypeScript**, построенный по архитектуре **Feature-Sliced Design (FSD)**.

## Возможности

- 📁 Навигация по файловой системе с историей (назад/вперёд)
- 🔍 Поиск по имени и содержимому файлов (grep-like)
- 📋 Операции с файлами: копирование, вырезание, вставка, удаление, переименование
- 🖱️ Контекстное меню с горячими клавишами
- 💾 Отображение дисков Windows
- ⚡ Виртуализация списка для 10,000+ файлов
- 🎨 Тёмная тема (shadcn/ui стиль)

### Frontend

- **React 19.2** + **TypeScript 5.9**
- **Zustand 5** — UI состояние (выделение, навигация, буфер обмена)
- **TanStack Query 5** — серверное состояние (запросы к файловой системе)
- **TanStack Virtual 3** — виртуализация списков
- **Radix UI** — примитивы UI (context-menu, dialog, tooltip)
- **Tailwind CSS 4** — стилизация
- **Lucide React** — иконки

### Backend

- **Tauri 2.x** — десктопный фреймворк
- **tauri-specta** — автогенерация TypeScript типов из Rust
- **walkdir** — рекурсивный обход директорий
- **chrono** — работа с датами

## IPC (Tauri): контракты и правила

- `src/shared/api/tauri/bindings.ts` — **автосгенерированные** типы/команды (руками не править).
- `src/shared/api/tauri/client.ts` — `tauriClient`: единая точка вызова команд (оборачивает Result → throw).
- `src/shared/api/tauri/events.ts` — `tauriEvents`: типизированные обёртки над событиями.

Для стабильности и единообразия код приложения не должен напрямую импортировать сгенерированные bindings/commands — это дополнительно защищено правилами линтера и архитектурным тестом.

## Безопасность и ограничения

- Приложению требуется **полный доступ к файловой системе** (без allowlist «разрешённых корней»). Безопасность обеспечивается hardening-логикой команд в backend.
- Удаление файлов/папок усилено проверками: запрещены опасные цели (например, root/корень диска), для symlink используется поведение «удалить ссылку как ссылку» (не следовать по ней).
- Генерация миниатюр ограничивает декодирование (лимиты/клампы), использует allowlist расширений; SVG намеренно исключён из backend-генерации миниатюр.
- CSP и настройки окна задаются в `src-tauri/tauri.conf.json`.

### Undo (текущие ограничения)

| Операция | Undo | Примечание |
|----------|------|------------|
| rename   | ✅   | Полный откат |
| move     | ✅   | Обратное перемещение |
| create   | ✅   | Удаление созданного |
| copy     | ❌   | Требует tracking скопированных путей |
| delete   | ❌   | Требует recycle bin / staging |

Phase 2 (отдельный план): Windows Recycle Bin через `SHFileOperation` / `trash` crate.

## Архитектура FSD

```text
src/
├── app/                    # Точка входа, провайдеры, глобальные стили
├── pages/                  # Страницы приложения
│   └── file-browser/       # Главная страница файлового менеджера
├── widgets/                # Композитные UI блоки
│   ├── file-explorer/      # Виртуализированный список файлов
│   ├── breadcrumbs/        # Хлебные крошки
│   ├── toolbar/            # Панель инструментов
│   ├── sidebar/            # Боковая панель с дисками
│   └── status-bar/         # Статус бар
├── features/               # Бизнес-фичи
│   ├── file-selection/     # Выделение файлов
│   ├── navigation/         # Навигация с историей
│   ├── clipboard/          # Copy/Cut буфер
│   ├── search-content/     # Поиск по имени и содержимому
│   └── context-menu/       # Контекстное меню
├── entities/               # Бизнес-сущности
│   ├── file-entry/         # FileEntry: типы, queries, UI компоненты
│   └── drive/              # DriveInfo UI
└── shared/                 # Переиспользуемый код
    ├── api/tauri/          # tauri-specta bindings
    ├── ui/                 # UI компоненты (Button, Dialog, etc.)
    ├── lib/                # Утилиты (cn, formatBytes, formatDate)
    └── config/             # Константы, горячие клавиши
```

## Установка

### Требования

- [Node.js 18+](https://nodejs.org/)
- [Rust](https://rustup.rs/)
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) с компонентом "Desktop development with C++"

### Запуск

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run tauri dev

# Сборка production
npm run tauri build
```

## IDE Setup

- [VS Code](https://code.visualstudio.com/)
- [Tauri Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)

## Горячие клавиши

| Клавиша     | Действие      |
| ----------- | ------------- |
| `Ctrl+C`    | Копировать    |
| `Ctrl+X`    | Вырезать      |
| `Ctrl+V`    | Вставить      |
| `Delete`    | Удалить       |
| `F2`        | Переименовать |
| `Ctrl+F`    | Поиск         |
| `Backspace` | Наверх        |
| `Alt+←`     | Назад         |
| `Alt+→`     | Вперёд        |
| `F5`        | Обновить      |

## Лицензия

MIT
