# File Manager Tauri

<!-- markdownlint-disable MD033 -->
<img width="1502" height="882" alt="File manager screenshot" src="https://github.com/user-attachments/assets/1fd59b76-9f9e-4535-bc36-b357526d13d6" />

<!-- markdownlint-enable MD033 -->

Десктопный файловый менеджер на **Tauri 2.x + React 19 + TypeScript 5.9**, построенный по архитектуре **Feature-Sliced Design (FSD)**.

![Tauri](https://img.shields.io/badge/Tauri-2.x-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6)

## Возможности

- 📁 Навигация по файловой системе с историей (назад/вперёд)
- 🔍 Поиск по имени и содержимому файлов с прогрессом (grep-like)
- 📋 Операции с файлами: копирование, вырезание, вставка, удаление, переименование
- 🖱️ Контекстное меню с горячими клавишами
- 💾 Отображение дисков Windows
- ⚡ Виртуализация списка для 10,000+ файлов
- 🎨 Тёмная тема (shadcn/ui стиль)
- 🔒 CSP защита и валидация путей
- 🛡️ ErrorBoundary для graceful error handling
- 📊 Изменяемые колонки (размер, дата, отступ)

## Технологии

### Frontend

- **React 19** + **TypeScript 5.9**
- **Zustand 5** — UI состояние (выделение, навигация, буфер обмена, layout)
- **TanStack Query 5** — серверное состояние (запросы к файловой системе)
- **TanStack Virtual 3** — виртуализация списков
- **Radix UI** — примитивы UI (context-menu, dialog, tooltip, scroll-area)
- **Tailwind CSS 4** — стилизация
- **Lucide React** — иконки
- **react-resizable-panels** — изменяемые панели

### Backend

- **Tauri 2.x** — десктопный фреймворк
- **tauri-specta** — автогенерация TypeScript типов из Rust
- **walkdir** — рекурсивный обход директорий
- **chrono** — работа с датами
- **notify** — file system watcher

## Архитектура FSD

```text
src/
├── app/                    # Точка входа, провайдеры, глобальные стили
├── pages/                  # Страницы приложения
│   └── file-browser/       # Главная страница файлового менеджера
├── widgets/                # Композитные UI блоки
│   ├── file-explorer/      # Виртуализированный список файлов
│   ├── breadcrumbs/        # Хлебные крошки (с a11y)
│   ├── toolbar/            # Панель инструментов
│   ├── sidebar/            # Боковая панель с дисками
│   ├── status-bar/         # Статус бар
│   └── progress-dialog/    # Диалог прогресса операций
├── features/               # Бизнес-фичи
│   ├── file-selection/     # Выделение файлов
│   ├── navigation/         # Навигация с историей
│   ├── clipboard/          # Copy/Cut буфер
│   ├── search-content/     # Поиск по имени и содержимому
│   ├── context-menu/       # Контекстное меню
│   ├── file-dialogs/       # Диалоги файловых операций
│   ├── layout/             # Управление layout (панели, колонки)
│   └── tabs/               # Вкладки (планируется)
├── entities/               # Бизнес-сущности
│   ├── file-entry/         # FileEntry: типы, queries, UI компоненты
│   └── drive/              # DriveInfo UI
└── shared/                 # Переиспользуемый код
    ├── api/tauri/          # tauri-specta bindings
    ├── ui/                 # UI компоненты (Button, Dialog, ErrorBoundary, etc.)
    ├── lib/                # Утилиты (cn, formatBytes, formatDate, unwrapResult)
    └── config/             # Константы (CACHE_TIME, VIRTUALIZATION, STORAGE_VERSIONS)
```

## Безопасность

- **CSP (Content Security Policy)** — ограничение источников контента
- **Path Traversal Protection** — валидация путей на бекенде
- **Iterative Directory Copy** — защита от stack overflow при глубокой вложенности
- **Persist Versioning** — версионирование хранилищ Zustand для миграций

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

# Проверка типов
npm run typecheck

# Линтинг
npm run lint
```

## IDE Setup

- [VS Code](https://code.visualstudio.com/)
- [Tauri Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)

## Горячие клавиши
<img width="609" alt="menu" src="https://github.com/user-attachments/assets/8d62c326-e675-4a6e-b6b8-2b27a58a6729" />

| Клавиша        | Действие      |
| -------------- | ------------- |
| `Ctrl+C`       | Копировать    |
| `Ctrl+X`       | Вырезать      |
| `Ctrl+V`       | Вставить      |
| `Delete`       | Удалить       |
| `F2`           | Переименовать |
| `Ctrl+F`       | Поиск         |
| `Escape`       | Закрыть поиск |
| `Backspace`    | Наверх        |
| `Alt+←`        | Назад         |
| `Alt+→`        | Вперёд        |
| `F5`           | Обновить      |
| `Ctrl+N`       | Новый файл    |
| `Ctrl+Shift+N` | Новая папка   |

## Лицензия

MIT
