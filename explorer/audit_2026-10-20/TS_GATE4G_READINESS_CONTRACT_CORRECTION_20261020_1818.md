# Gate 4G — Minimal Refactoring Readiness Contract Correction Report

**Timestamp:** 2026-10-20T18:18:00+05:30  
**Repository:** `C:\Users\User\Downloads\dependency-analyzer`  
**Explorer Subdirectory:** `C:\Users\User\Downloads\dependency-analyzer\explorer`  
**Gate:** 4G (Minimal Refactoring Readiness Contract Correction)

---

## 1. Executive Summary

In Gate 4G, a single, evidence-backed correction was applied to `explorer/src/lib/architecture-layout.ts` to resolve the `TS2322` diagnostic at line 116. 

Before this change, the defensive node-sanitizer fallback mapped `refactoringReadiness` to `undefined` when `n.refactoringReadiness` was missing (`refactoringReadiness: n.refactoringReadiness ? { ...n.refactoringReadiness } : undefined`). However, the `ExplorerNode` interface declares `refactoringReadiness` as a required property. Furthermore, downstream consumers such as `graph-builder.ts` directly dereference `node.refactoringReadiness.hasCycles` and `node.refactoringReadiness.hasUnresolved`, meaning an `undefined` value would lead to runtime `TypeError` exceptions.

By inspecting production node builders and consumers across the codebase (`explorer/src/lib/diff-adapter.ts` lines 200 & 232, `explorer/src/lib/layout/features.ts` lines 127 & 154), we verified that the canonical neutral default for `refactoringReadiness` is:
```typescript
{
  isHighRisk: false,
  hasCycles: false,
  hasUnresolved: false,
  testCoverageStatus: 'UNTESTED',
}
```

Replacing `: undefined` with this canonical neutral fallback eliminated `TS2322` in `architecture-layout.ts` without touching any other files. Fresh type-checking confirmed that total TypeScript diagnostics dropped from 112 to 111, zero diagnostics remain in `architecture-layout.ts`, and exactly 5 production diagnostics remain in the repository.

---

## 2. Pre-Change Baseline State

### 2.1 Git Branch and Commit
- **Branch:** `main`
- **HEAD Commit:** `413dfcc58027b6c9ceb0d482584836109eabd924`

### 2.2 Git Status Prior to Gate 4G Edit
```
 M explorer/package-lock.json
 M explorer/package.json
 M explorer/src/lib/architecture-layout.ts
 M explorer/src/types/explorer.ts
?? explorer/audit_2026-10-20/
?? explorer/tsconfig.test.json
```

### 2.3 Baseline Diff in `architecture-layout.ts`
Prior to the Gate 4G edit, `architecture-layout.ts` had Gate 4A's `behavior` and `unresolved` adjustments:
```diff
@@ -117,7 +117,7 @@ export function computeArchitectureLayoutWithMetadata(
     ? nodes.map(n => ({
         ...n,
         metrics: n.metrics ? { ...n.metrics } : { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
-        behavior: n.behavior ? { ...n.behavior, asyncPatterns: Array.isArray(n.behavior.asyncPatterns) ? [...n.behavior.asyncPatterns] : [] } : undefined,
+        behavior: n.behavior ? { ...n.behavior, asyncPatterns: Array.isArray(n.behavior.asyncPatterns) ? [...n.behavior.asyncPatterns] : [] } : { isTest: false },
         refactoringReadiness: n.refactoringReadiness ? { ...n.refactoringReadiness } : undefined,
         riskReasons: Array.isArray(n.riskReasons) ? [...n.riskReasons] : [],
       }))
@@ -244,7 +244,7 @@ export function computeArchitectureLayoutWithMetadata(
     lowRiskCount: safeNodes.filter(n => n.risk === 'LOW').length,
     cycleCount: 0,
     cyclesCount: 0,
-    unresolvedCount: safeEdges.filter(e => Boolean(e.unresolved) || e.relationshipType === 'unresolved').length,
+    unresolvedCount: safeEdges.filter(e => Boolean(e.unresolved) || e.unresolved).length,
     inventory: {
       files: safeNodes.length,
       apexClasses: safeNodes.filter(n => n.type === 'ApexClass').length,
```

---

## 3. Investigation & Rationale for Correction

### 3.1 Type Contract (`explorer/src/types/explorer.ts`)
Lines 156–161 of `explorer/src/types/explorer.ts` require:
```typescript
export interface ExplorerNode {
  // ...
  refactoringReadiness: {
    isHighRisk: boolean;
    hasCycles: boolean;
    hasUnresolved: boolean;
    testCoverageStatus: "COVERED" | "NO_TESTS" | "UNTESTED" | "AMBIGUOUS" | "FULL_COVERAGE" | "PARTIAL_COVERAGE";
  };
}
```

### 3.2 Downstream Production Consumers
- In `explorer/src/lib/graph-builder.ts`:
  ```typescript
  hasCycles: node.refactoringReadiness.hasCycles,
  hasUnresolved: node.refactoringReadiness.hasUnresolved,
  ```
  `graph-builder.ts` assumes `node.refactoringReadiness` is always defined. Providing `undefined` creates a critical runtime hazard.
- In `explorer/src/lib/readiness.ts`:
  ```typescript
  const isHighRisk = node.risk === 'HIGH' || node.refactoringReadiness?.isHighRisk;
  const hasCycles = Boolean(node.refactoringReadiness?.hasCycles);
  const hasUnresolved = Boolean(node.refactoringReadiness?.hasUnresolved) || (node.metrics?.unresolved || 0) > 0;
  const testCoverage = node.refactoringReadiness?.testCoverageStatus;
  ```
  `readiness.ts` treats missing readiness as neutral and evaluates other metrics directly.

### 3.3 Established Default in Production Code
Inspection of existing node synthesis and adapters confirmed a standardized fallback:
- `explorer/src/lib/diff-adapter.ts:200` & `232`:
  ```typescript
  refactoringReadiness: rawNode.refactoringReadiness || {
    isHighRisk: false,
    hasCycles: false,
    hasUnresolved: false,
    testCoverageStatus: 'UNTESTED',
  },
  ```
- `explorer/src/lib/layout/features.ts:127` & `154`:
  ```typescript
  refactoringReadiness: {
    isHighRisk: false,
    hasCycles: false,
    hasUnresolved: false,
    testCoverageStatus: 'UNTESTED',
  },
  ```

Thus, providing `{ isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' }` as the fallback when `n.refactoringReadiness` is falsy conforms directly to established domain conventions across production adapters.

---

## 4. Applied Change

File modified: `explorer/src/lib/architecture-layout.ts`

```diff
@@ -118,7 +118,14 @@ export function computeArchitectureLayoutWithMetadata(
         metrics: n.metrics ? { ...n.metrics } : { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
         behavior: n.behavior ? { ...n.behavior, asyncPatterns: Array.isArray(n.behavior.asyncPatterns) ? [...n.behavior.asyncPatterns] : [] } : { isTest: false },
-        refactoringReadiness: n.refactoringReadiness ? { ...n.refactoringReadiness } : undefined,
+        refactoringReadiness: n.refactoringReadiness
+          ? { ...n.refactoringReadiness }
+          : {
+              isHighRisk: false,
+              hasCycles: false,
+              hasUnresolved: false,
+              testCoverageStatus: 'UNTESTED',
+            },
         riskReasons: Array.isArray(n.riskReasons) ? [...n.riskReasons] : [],
       }))
     : [];
```

No other files or lines were modified.

---

## 5. Post-Change Compiler Verification

### 5.1 Verification Command Execution
- **Working Directory:** `C:\Users\User\Downloads\dependency-analyzer\explorer`
- **Command:** `.\node_modules\.bin\tsc.cmd -p tsconfig.json --noEmit`
- **Exit Code:** `1` (due to remaining non-production and known residual diagnostics)

### 5.2 Diagnostic Verification Results
- **TS2322 at `architecture-layout.ts:116`:** **RESOLVED** (0 diagnostics in `architecture-layout.ts`)
- **Total Diagnostic Count:** 111 (decreased from 112 in Gate 4E)
- **Production Source Diagnostic Count:** Exactly 5

### 5.3 Complete Inventory of Remaining Production Diagnostics (5 total)
1. `src/components/InvestigationDrawer.tsx(408,16): error TS18048: 'node.behavior.calloutCount' is possibly 'undefined'.`
2. `src/lib/highlight-state.ts(287,22): error TS2339: Property 'isEdge' does not exist on type 'never'.`
3. `src/lib/highlight-state.ts(310,22): error TS2339: Property 'isEdge' does not exist on type 'never'.`
4. `src/lib/layout/layers.ts(134,9): error TS18048: 'node.behavior.queryCount' is possibly 'undefined'.`
5. `src/lib/layout/layers.ts(134,41): error TS18048: 'node.behavior.dmlCount' is possibly 'undefined'.`

---

## 6. Post-Change Repository Status

```
 M explorer/package-lock.json
 M explorer/package.json
 M explorer/src/lib/architecture-layout.ts
 M explorer/src/types/explorer.ts
?? explorer/audit_2026-10-20/
?? explorer/tsconfig.test.json
```
Only the authorized target `explorer/src/lib/architecture-layout.ts` was modified during Gate 4G.
