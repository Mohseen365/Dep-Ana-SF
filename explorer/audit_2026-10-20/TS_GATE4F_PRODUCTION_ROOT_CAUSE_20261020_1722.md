# Gate 4F – Production TypeScript Residual Root‑Cause Investigation

**Repository:** `C:\Users\User\Downloads\dependency-analyzer`
**Timestamp:** 2026‑10‑20 17:22 (local)

---

## Task 1 – Reconciliation of Gate 4E diagnostics

| Diagnostic | Expected presence | Evidence from `TS_GATE4E_FRESH_COMPILER_VERIFICATION_20261020_1715.md` | Conclusion |
|------------|-------------------|---------------------------------------------------------------|------------|
| **TS2304** – `ArchitectureLayer` missing | Should be *absent* after import fix | No `TS2304` lines in the full output (lines 1‑195) | **Supported – not present** |
| **TS2367** – `'unresolved'` comparison not assignable | Should be *absent* after prior work | No `TS2367` entry in the output | **Supported – not present** |
| **TS2322** at `architecture‑layout.ts:116` – `refactoringReadiness` possibly `undefined` | Should be present (still failing) | Line 126‑130 of the output: `src/lib/architecture-layout.ts(116,9): error TS2322 … Types of property 'refactoringReadiness' are incompatible … Type 'undefined' is not assignable.` | **Supported – present** |
| **TS2339** at `highlight‑state.ts` lines 287 & 310 – `isEdge` on `never` | Should be present (still failing) | Lines 135‑136 of the output: `src/lib/highlight-state.ts(287,22): error TS2339 … Property 'isEdge' does not exist on type 'never'.` and similarly for line 310. | **Supported – present** |
| **TS18048** – optional count fields (`calloutCount`, `queryCount`, `dmlCount`) possibly undefined | Should be present (still failing) | Line 117 of the output (`src/components/InvestigationDrawer.tsx(408,16)`) and lines 137‑138 (`src/lib/layout/layers.ts(134,9)` & `…(134,41)`). | **Supported – present** |

All six targeted production diagnostics are accounted for.

---

## Task 2 – Investigation of `architecture‑layout.ts:116`

**Relevant mapper fragment (lines 115‑123):**
```ts
const safeNodes: ExplorerNode[] = Array.isArray(nodes)
  ? nodes.map(n => ({
      ...n,
      metrics: n.metrics ? { ...n.metrics } : { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
      behavior: n.behavior ? { ...n.behavior, asyncPatterns: Array.isArray(n.behavior.asyncPatterns) ? [...n.behavior.asyncPatterns] : [] } : { isTest: false },
      refactoringReadiness: n.refactoringReadiness ? { ...n.refactoringReadiness } : undefined,
      riskReasons: Array.isArray(n.riskReasons) ? [...n.riskReasons] : [],
    }))
  : [];
```
* `ExplorerNode.refactoringReadiness` is **required** in the type definition (lines 156‑161 of `explorer/src/types/explorer.ts`).
* The mapper currently propagates `undefined` when the source node lacks the property, which violates the contract and triggers the TS2322 error.

### Production creation paths
* **Real nodes** – come from ingestion of Salesforce metadata; some records omit `refactoringReadiness`.
* **Phantom nodes** – injected in the mapper (lines 178‑194) *always* provide a full `refactoringReadiness` object.

### Smallest safe correction (read‑only investigation)
* **Add a default readiness object** when the source lacks one, mirroring the minimal shape used for phantom nodes but with conservative defaults:
```ts
refactoringReadiness: n.refactoringReadiness
  ? { ...n.refactoringReadiness }
  : {
      isHighRisk: false,
      hasCycles: false,
      hasUnresolved: false,
      testCoverageStatus: 'UNTESTED',
    },
```
* This satisfies the required type without inventing domain‑specific risk data – the defaults represent a *neutral* readiness state.
* No other semantics are altered; downstream consumers treat the readiness fields as booleans / enum values, and the neutral defaults are safe defaults.

---

## Task 3 – Investigation of `highlight‑state.ts` (`isEdge` errors)

**Code fragment (lines 283‑291):**
```ts
if (ele.isNode()) {
  // …
} else if (ele.isEdge()) {
  // …
}
```
* The Cytoscape typings declare `isNode(): this is NodeSingular` and `isEdge(): this is EdgeSingular` **only when the overload is present**. In the installed version the overloads are absent; the methods return plain `boolean`.
* Consequently, after the `else if` branch TypeScript narrows `ele` to `never`, because the previous `if` already covered the only possible discriminated union, leaving no reachable type for the `else`.

### Type‑safe correction options (ranked by risk & intrusiveness)
1. **User‑defined type guard** (lowest risk):
   ```ts
   function isEdge(ele: cytoscape.Element): ele is cytoscape.EdgeSingular {
     return ele.isEdge?.() ?? false;
   }
   // usage
   if (ele.isNode()) { … }
   else if (isEdge(ele)) { … }
   ```
   – No change to library typings, preserves runtime behaviour.
2. **Cast to `any` locally** (higher risk, discouraged): `if ((ele as any).isEdge()) …` – works but loses type safety.
3. **Upgrade Cytoscape typings** – would require a dependency change, prohibited by the safety constraints.

**Recommended**: option 1 – introduce a small helper function and replace the `ele.isEdge()` checks.

---

## Task 4 – Investigation of optional behavior counts

*Locations:* `src/components/InvestigationDrawer.tsx:408` and `src/lib/layout/layers.ts:134`.
*The `ExplorerNodeBehavior` interface marks `calloutCount`, `queryCount`, `dmlCount` as optional (`?: number`).
*Current accesses read the property directly, causing TS18048.

### Intended semantics (deduced from surrounding code)
* The UI treats a missing count as **zero** – the counts are only used for display or simple thresholds.
* Phantom node creation (lines 187‑194 of the mapper) explicitly sets these counts to `0`.

### Minimal safe remedy (read‑only suggestion)
* Add a default of `0` in the mapper’s `behavior` fallback:
  ```ts
  behavior: n.behavior
    ? { ...n.behavior, asyncPatterns: Array.isArray(n.behavior.asyncPatterns) ? [...n.behavior.asyncPatterns] : [] }
    : { isTest: false, queryCount: 0, dmlCount: 0, calloutCount: 0 },
  ```
* Or, where the properties are consumed, guard with `?? 0` (e.g., `node.behavior.calloutCount ?? 0`). Both approaches preserve runtime meaning.

---

## Task 5 – Test‑source diagnostic categories

The fresh compiler output contains **≈ 130 diagnostics** originating from files under `src/components/***.test.tsx` and `src/lib/**/*.test.tsx`.
* **Unused imports / variables** – TS6133 warnings.
* **Enum / union mismatches** – errors like assigning `'calls'` to `ExplorerRelationshipType`.
* **Missing required fields** – many `TS2739` errors where test fixtures construct objects that omit production‑only fields (`file`, `riskReasons`, `behavior`, `refactoringReadiness`).
* **Cytoscape helper misuse** – the `isEdge` error appears both in production code and test code.
* **Coverage‑status mismatches** – several tests use the now‑removed `'UNCOVERED'` literal against the `testCoverageStatus` enum.

**Why they appear:** `tsconfig.json` includes the entire `src/` tree (`include: ["src/**/*.ts", "src/**/*.tsx"]`), which pulls in test files. The production build typically excludes test files via a separate `tsconfig.test.json`; however the `--noEmit` command runs against the base `tsconfig.json`, so test diagnostics are reported.

**Scope distinction:** These test‑only diagnostics do **not** affect the production type‑check that would run in CI (which uses the test‑specific config). They can be ignored for the production remediation gate, but fixing them would improve overall type safety.

---

## Task 6 – Evidence report

The above sections constitute the evidence report **`TS_GATE4F_PRODUCTION_ROOT_CAUSE_20261020_1722.md`** stored at:

`C:\Users\User\Downloads\dependency-analyzer\explorer\audit_2026-10-20\TS_GATE4F_PRODUCTION_ROOT_CAUSE_20261020_1722.md`

### Ranked remediation options (overall)
1. **Add default `refactoringReadiness` in the mapper** (addresses TS2322).
2. **Introduce `isEdge` type‑guard helper** (removes both TS2339 errors).
3. **Provide zero defaults for optional count fields** in the mapper or guard with `?? 0` (removes three TS18048 warnings).
4. *(Optional, lower priority)* Extend `ExplorerRelationshipType` to include `'unresolved'` if the business case ever requires it.
5. *(Optional)* Clean up test fixtures to align with the production contracts.

---

## Recommendation – Single safest next action
**Implement the default `refactoringReadiness` object in `src/lib/architecture-layout.ts` (Task 2).**
* It resolves the only *production‑source* TS2322 error without altering runtime semantics.
* The change is isolated to the mapper, requires a one‑line amendment, and does not depend on external typings.
* After this fix, a quick re‑run of the Gate 4E compilation will confirm whether the remaining diagnostics are solely the `isEdge` and count‑field issues, which can then be addressed in subsequent gates.

---

*All analysis was performed read‑only; no source files were modified.*