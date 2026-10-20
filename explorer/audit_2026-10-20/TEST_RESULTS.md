# Test Results

The test suite could not be executed because the TypeScript compilation step fails with production‑code errors. Consequently no Vitest test output is available.

**Build error summary** (see `FINDINGS.csv` for details):
- `src/types/explorer.ts:147` – missing `ArchitectureLayer`.
- `src/lib/layout/layers.ts:134` – possibly undefined `node.behavior` fields.
- `src/lib/highlight-state.ts:287,310` – `isEdge` on `never`.
- `src/lib/architecture‑layout.ts:116,247` – mismatched `ExplorerNode` shape.

**Next step**: Resolve the above type errors, then re‑run `npm test`. The resulting Vitest JSON report should be saved as `vitest-report.json` and referenced here.
