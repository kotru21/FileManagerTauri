# Phase 2: Recycle Bin Undo

> Outline only — implementation deferred to a separate plan after Phase 1 honest undo MVP.

## Problem

`delete` and `copy` operations currently set `canUndo: false` because permanent deletion cannot be reversed without staging deleted files. Users expect Ctrl+Z / undo toast to work like Windows Explorer.

## Goals

1. Make **delete** undoable via a staging area before permanent removal.
2. Optionally integrate with the **Windows Recycle Bin** for native UX.
3. Enable `canUndo: true` on the frontend when a `trashId` is returned from the backend.

## Non-goals (Phase 2)

- Full undo for **copy** (requires tracking destination paths per copy batch; separate design).
- Cross-session trash persistence (trash cleared on app exit is acceptable for MVP).
- macOS / Linux native trash integration (future).

---

## Step 1: Soft-delete staging directory

Replace immediate hard delete in `delete_entries` with a two-phase flow:

```
delete_entries(paths) → move to %TEMP%/FileManagerTrash/{uuid}/
```

- `{uuid}` — unique batch id per delete operation (v4 UUID).
- Preserve relative structure under the trash folder for safe restore.
- Write `metadata.json` alongside moved items:

```json
{
  "trashId": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2026-06-19T12:00:00Z",
  "entries": [
    { "originalPath": "C:\\Users\\me\\docs\\file.txt", "trashPath": "..." }
  ]
}
```

- Schedule background cleanup: purge trash folders older than N days (configurable, default 7).

**Rust files (planned):**

- `src-tauri/src/commands/delete.rs` — staging logic
- `src-tauri/src/trash/mod.rs` — trash store helpers

---

## Step 2: Restore API

Add Tauri command:

```rust
restore_entries(trash_id: String) -> Result<(), String>
```

- Read `metadata.json` for `trash_id`.
- Move each entry from `trashPath` back to `originalPath`.
- Handle conflicts (target exists) — return error, do not partial-restore without explicit flag.
- Remove trash folder on successful restore.
- Expose via `tauriClient.restoreEntries(trashId)` in `src/shared/api/tauri/client.ts`.

---

## Step 3: Frontend integration

### Operations history

Extend `Operation.data`:

```typescript
data: {
  // ...
  trashId?: string
}
```

On delete success:

```typescript
addOperation({
  type: "delete",
  description: createOperationDescription("delete", { deletedPaths: selected }),
  data: { deletedPaths: selected, trashId },
  canUndo: true,
})
```

### Undo handler

In `store.ts` `undoOperation`, add `delete` case:

```typescript
case "delete": {
  const { trashId } = data
  if (!trashId) throw new Error("...")
  await tauriClient.restoreEntries(trashId)
  return
}
```

### Undo toast

No change required — Phase 1 already shows toast only when `canUndo: true`.

---

## Step 4: Windows native Recycle Bin (optional feature flag)

Behind `behavior.useNativeRecycleBin` (default `false`):

- Use `SHFileOperation` with `FOF_ALLOWUNDO` flag, or the `trash` crate.
- When enabled, `delete_entries` sends files to the OS recycle bin instead of app staging.
- Undo for native recycle bin: call `SHFileOperation` restore or shell API — research required.
- Fallback to app staging when native API fails or on non-Windows platforms.

**Feature flag location:** `src/entities/app-settings/model/types.ts` → `BehaviorSettings`.

---

## Step 5: Testing plan

| Layer | Tests |
|-------|-------|
| Rust unit | trash metadata read/write, restore path mapping |
| Rust integration | delete → restore round-trip in temp dir |
| Vitest | `store.undo.test.ts` — delete undo calls `restoreEntries` |
| E2E | delete file → Ctrl+Z → file reappears |

---

## Rollout

1. Ship app staging trash (Steps 1–3) — works on all platforms.
2. Add native recycle bin flag (Step 4) — Windows-only enhancement.
3. Revisit **copy** undo in a follow-up plan.

## References

- Phase 1 limitations: `README.md` → Undo section
- Parent plan: `docs/superpowers/plans/2026-06-19-pain-points-remediation.md` Task 23
