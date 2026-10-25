# TS_GATE5A_T_DEPENDENCY_RECOVERY_ASSESSMENT_20261020_2120

## 1. Repository state (read‑only)

| Item | Value |
|------|-------|
| **Working directory** | `C:\Users\User\Downloads\dependency-analyzer\explorer` |
| **Git branch** | `main` |
| **HEAD** | `413dfcc58027b6c9ceb0d482584836109eabd924` |
| **`git status --short`** | ```
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
``` |
| **Diff of `package.json`** | Only the `build` script and the addition of `@types/jest` / `@types/mocha` were changed – no modification to the `typescript` entry. |
| **Diff of `package-lock.json`** | No diff affecting the `typescript` entry; the lockfile still contains a `node_modules/typescript` block (see below). |

## 2. TypeScript dependency declaration

* **`explorer/package.json`** (devDependencies)  
```json
"devDependencies": {
  …
  "typescript": "^5.5.3",
  …
}
```
→ Declares a caret range that resolves to any `5.5.x` version ≥ 5.5.3.

* **`explorer/package-lock.json`** – snippet around line 3211:
```json
"node_modules/typescript": {
  "version": "5.5.3",
  "resolved": "https://registry.npmjs.org/typescript/-/typescript-5.5.3.tgz",
  "integrity": "sha512-…",
  "dev": true,
  …
}
```
→ The lockfile records **typescript 5.5.3**, which satisfies the declared range and is marked as a devDependency.

* **Consistency** – No mismatch: the lockfile version (`5.5.3`) satisfies `^5.5.3` and the dev‑dependency flag aligns.

## 3. Local installation state (explorer workspace)

| Path | Exists? | Remarks |
|------|---------|---------|
| `explorer/node_modules/typescript` | **True** – contains `bin`, `lib`, `package.json`, etc. |
| `explorer/node_modules/.bin/tsc.cmd` | **True** (shim) – points to a script that expects the real binary but the underlying executable is missing. |
| `explorer/node_modules/.bin/tsc` | **True** (shim) – same issue as `tsc.cmd`. |
| Root `node_modules/typescript` | **False** – no TypeScript installation at the repository root. |

**Interpretation** – The TypeScript package is present, but its binary shims in `.bin` are broken (likely a partial install). The earlier gates that succeeded used the root `node_modules/.bin/tsc`, which is not present now.

## 4. Cause analysis

* **Incomplete `node_modules` installation** – The `typescript` source files are present, yet the executable scripts that should be linked into `.bin` are missing. This points to a broken or interrupted install.
* **Manifest / lockfile** – Both are consistent; no mismatched versions.
* **Workspace / environment** – All commands have been run from the `explorer` folder, confirming the issue is localized to that workspace.
* **Historical discrepancy** – Earlier gates referenced `./node_modules/.bin/tsc` at the repository root, indicating a separate, functional installation there. The current explorer workspace lacks that functional install.

## 5. Recommended recovery method (least disruptive)

Because the lockfile already specifies the exact version, the safest fix is to **re‑link the binary shims** without altering any other dependencies.

**Command to run (outside the read‑only gate):**
```powershell
# From the explorer directory
cd C:\Users\User\Downloads\dependency-analyzer\explorer

# Re‑install ONLY the TypeScript package, preserving the lockfile.
npm install typescript@5.5.3 --no-save
```
* `--no-save` ensures `package.json` and `package-lock.json` remain unchanged.
* npm will detect that `typescript@5.5.3` is already present and will re‑run its post‑install scripts, recreating the proper `.bin/tsc` and `tsc.cmd` shims.

If a full workspace reinstall is acceptable, an alternative is:
```powershell
npm ci   # wipes node_modules and reinstalls exactly as locked
```
> **Risk note:** `npm ci` would rewrite **all** dependencies, potentially updating transient sub‑dependencies and affecting unrelated packages. The targeted `npm install typescript@5.5.3 --no-save` has a far smaller footprint and thus the lowest risk.

## 6. Summary
* The repository’s manifests correctly declare TypeScript ^5.5.3 and lock to 5.5.3.
* The local `node_modules` contains the package but the executable shims are broken – an incomplete install.
* The discrepancy with earlier gates is explained by using a different workspace (root vs. explorer).
* **Recommended action:** run `npm install typescript@5.5.3 --no-save` from the explorer folder to restore functional `tsc` binaries without touching any other files.

---

*Report generated read‑only; no files were modified.*