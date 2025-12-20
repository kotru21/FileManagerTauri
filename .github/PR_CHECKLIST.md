# PR Checklist — Component Refactor

Use this checklist when splitting or refactoring UI components.

- [ ] Describe the refactor and why it was needed in the PR description
- [ ] Keep public API the same (props / events) or document breaking changes
- [ ] Add unit tests covering new components and hooks
- [ ] Update and run TypeScript checks (no `@ts-ignore` / `any` leaks)
- [ ] Add/adjust accessibility tests (axe) if UI semantics changed
- [ ] Run existing snapshot tests and update only when intentional
- [ ] Ensure no circular imports were introduced (run `madge` or similar)
- [ ] Update changelog/notes if behavior changed
- [ ] Request at least one review from another frontend dev
