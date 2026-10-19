# Phase 4A — Commit Mapping

Phase 4A was delivered as a **single bundled commit** `cc46c3cb6e5a4888e6b710c23bc48bb7c2c9b706`. This deviates from the audit's one-commit-per-issue convention. History was **not** rewritten.

| Issue | Title | Sub‑hunk |
|---|---|---|
| 16 | try/catch shims documentation comment | `git show cc46c3c -- src/hooks/useViewState.ts` (hunk containing `useWorkspaceRouterSafe` comment) |
| 11 | Functional‑updater staleness in setFocusState/setImpactState/setConnectionState | `git show cc46c3c -- src/hooks/useViewState.ts` (hunks containing `investigationRef.current.state`) |
| 13 | getCorrelationToken peeks instead of consuming | `git show cc46c3c -- src/components/GraphView.tsx` (hunk containing `peekCorrelationToken`) |
| 20 | restoredHashNodeRef set only on successful restore | `git show cc46c3c -- src/components/GraphView.tsx` (hunk containing `restoredHashNodeRef.current = true`) |

## Known condition — tsc baseline

At Phase 4A closeout: `npx tsc --noEmit` = 89 errors, exit 2. Pre‑Phase‑4A baseline was **not lower**. `npm run build` does **not** run `tsc`. Phase 4B pre‑flight does **not** require tsc green; it requires **test‑suite green** and **tsc error count does not increase**.

Fixing the 89‑error tsc baseline is a **separate future ticket**. The category table from the prior Phase 4A closeout report summed to 55, not 89 — the mapping doc records this discrepancy as open.
