# TS_GATE5A_S_COMPILER_ENVIRONMENT_DISCREPANCY_20261020_2106

## 1. Absolute‑path environment verification

| Check | Result |
|-------|--------|
| **Current working directory** | `C:\Users\User\Downloads\dependency-analyzer` |
| **Explorer directory exists** (`C:\Users\User\Downloads\dependency-analyzer\explorer`) | **True** |
| **Git branch** | `main` |
| **Git HEAD** | `413dfcc58027b6c9ceb0d482584836109eabd924` |
| **`git status --short`** (from repository root) | ```
 M explorer/package-lock.json
 M explorer/package.json
 M explorer/src/components/GraphControls.test.tsx
 M explorer/src/components/GraphView.debugMemo.test.tsx
 M explorer/src/components/GraphView.enableOverlay.test.tsx
 M explorer/src/components/GraphView.fix12.test.tsx
 M explorer/src/components/GraphView.fix13.test.tsx
 M explorer/src/components/GraphView.fix14.test.tsx
 M explorer/src/components/GraphView.fix17.test.tsx
 M explorer/src/components/GraphView.hoverCardLiveEntity.test.tsx
 M explorer/src/components/InvestigationDrawer.tsx
 M explorer/src/components/graph-internals/EdgeHoverCard.role.test.tsx
 M explorer/src/components/graph-internals/EdgeHoverCard.vscodeUrl.test.tsx
 M explorer/src/components/graph-internals/FeatureOverlayCanvas.debouncedHighlight.test.tsx
 M explorer/src/components/graph-internals/FeatureOverlayCanvas.maxSeverity.test.tsx
 M explorer/src/components/graph-internals/FeatureOverlayCanvas.orbitGuides.test.tsx
 M explorer/src/components/graph-internals/FeatureOverlayCanvas.vectorBadge.test.tsx
 M explorer/src/components/graph-internals/GraphErrorBoundary.test.tsx
 M explorer/src/components/graph-internals/HoverCardCopyUnmount.test.tsx
 M explorer/src/components/graph-internals/NodeHoverCard.maxSeverity.test.tsx
 M explorer/src/components/graph-internals/NodeHoverCard.memo.test.tsx
 M explorer/src/components/graph-internals/NodeHoverCard.viewportResize.test.tsx
 M explorer/src/lib/architecture-layout.ts
 M explorer/src/lib/highlight-state.ts
 M explorer/src/lib/layout/layers.ts
 M explorer/src/test/UrlSyncAndOverlayRegression.test.ts
 M explorer/src/test/stage7-single-pass-x-center-ab.test.ts
 M explorer/src/types/explorer.ts
?? explorer/audit_2026-10-20/
?? explorer/tsconfig.prod.json
?? explorer/tsconfig.test.json
``` |
| **`explorer/node_modules` exists** | **True** |
| **`explorer/node_modules/.bin/tsc.cmd` exists** | **True** |
| **Root `node_modules` exists** (`C:\Users\User\Downloads\dependency-analyzer\node_modules`) | **True** |
| **Root `node_modules/.bin/tsc.cmd` exists** | **False** |
| **`explorer/node_modules/typescript/package.json` exists** | **False** |
| **Root `node_modules/typescript/package.json` exists** | **False** |

### Interpretation
* The explorer workspace contains a shim `tsc.cmd` but the actual `typescript` package is missing in both the explorer and root `node_modules`. The shim cannot run because there is no underlying executable, which is why attempts to invoke `npx tsc` return the generic “This is not the tsc command you are looking for”.

## 2. Dependency & lockfile evidence

* `explorer/package.json` lists `"typescript": "^5.5.3"` under **devDependencies**.
* The lockfile (`explorer/package-lock.json`) also records the same entry (see lines 29‑31), but a scan of the lockfile shows **no `node_modules/typescript` entry** – the type‑script package was never installed.
* Consequently the node_modules tree is incomplete: many binaries are present (e.g., `vite`, `playwright`), yet `typescript` is absent.

## 3. Comparison with earlier gates

| Earlier gate | Command reported | Reported outcome | Path used |
|--------------|------------------|------------------|-----------|
| Gate 4E | `./node_modules/.bin/tsc -p tsconfig.json --noEmit` | Ran successfully (diagnostics collected) | Root `node_modules/.bin` |
| Gate 4H | `./node_modules/.bin/tsc.cmd -p tsconfig.json --noEmit` | Ran successfully | Root `node_modules/.bin` |
| Gate 4K | `./node_modules/.bin/tsc.cmd -p tsconfig.prod.json --noEmit` | Exit code 0 | Root `node_modules/.bin` |

Those commands referenced the **root** `node_modules/.bin`. In the current environment the root `.bin/tsc.cmd` does **not** exist, and the explorer’s shim lacks the actual TypeScript installation. Therefore the earlier runs must have been performed in a different environment where `npm install` (or equivalent) had been executed.

## 4. GraphControls test diff

```diff
@@ -229,12 +229,10 @@
     const zoomIn = screen.getByLabelText('Zoom In');
     const zoomOut = screen.getByLabelText('Zoom Out');
     const fitView = screen.getByLabelText('Fit View');
-    const centerSelected = screen.getByLabelText('Center Selected');
 
     expect(zoomIn).toHaveAttribute('tabindex', '0');
     expect(zoomOut).toHaveAttribute('tabindex', '-1');
     expect(fitView).toHaveAttribute('tabindex', '-1');
-    expect(centerSelected).toHaveAttribute('tabindex', '-1');
   });
@@ -253,7 +251,6 @@
     const zoomIn = screen.getByLabelText('Zoom In');
     const zoomOut = screen.getByLabelText('Zoom Out');
     const fitView = screen.getByLabelText('Fit View');
-    const centerSelected = screen.getByLabelText('Center Selected');
 
     zoomIn.focus();
     expect(document.activeElement).toBe(zoomIn);
```
The `centerSelected` variable and its associated assertion have been removed. No other references remain. The test still verifies focus navigation for the other controls; the explicit check that “Center Selected” has `tabindex="-1"` is no longer present.

## 5. Diagnostic verification feasibility

Because the TypeScript compiler is not installed, we cannot run `tsc` to obtain current diagnostic counts (including remaining `TS6133`/`TS6196`). Attempting `npx tsc` yields the “This is not the tsc command you are looking for” message, confirming the compiler is unavailable.

## 6. Recommended next action (evidence‑based)

1. **Install the TypeScript devDependency** in the explorer workspace (outside of this verification gate):
   ```
   cd C:\Users\User\Downloads\dependency-analyzer\explorer
   npm install   # or pnpm/yarn as appropriate
   ```
   This will create `node_modules/typescript` and a functional `node_modules/.bin/tsc.cmd`.
2. **Re‑run the compiler checks**:
   ```
   .\node_modules\.bin\tsc.cmd -p tsconfig.json --noEmit
   .\node_modules\.bin\tsc.cmd -p tsconfig.prod.json --noEmit
   ```
   Capture exit codes and diagnostic counts.
3. **Compare the new counts** against the Gate 4J baseline (106 total diagnostics, 33 unused‑declaration diagnostics). Only after the compiler runs successfully can Gate 5A‑R be marked complete.

---

**File path:** `C:/Users/User/Downloads/dependency-analyzer/explorer/audit_2026-10-20/TS_GATE5A_S_COMPILER_ENVIRONMENT_DISCREPANCY_20261020_2106.md`