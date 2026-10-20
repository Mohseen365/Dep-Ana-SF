# Jules Lane D — TS2322 Assignment Errors, Batch 2 Report

**Repository:** `C:\Users\User\Downloads\dependency-analyzer`
**Working Directory:** `explorer`
**Lane:** Lane D
**Status:** PASS

---

## 1. Exact Diagnostic Locations

The following six TS2322 diagnostics were selected and remediated in this bounded batch:

1. `explorer/src/components/graph-internals/EdgeHoverCard.role.test.tsx(12,7)`
   `error TS2322: Type '"calls"' is not assignable to type 'ExplorerRelationshipType'.`
2. `explorer/src/components/graph-internals/EdgeHoverCard.vscodeUrl.test.tsx(12,7)`
   `error TS2322: Type '"calls"' is not assignable to type 'ExplorerRelationshipType'.`
3. `explorer/src/components/graph-internals/HoverCardCopyUnmount.test.tsx(45,72)`
   `error TS2322: Type '"calls"' is not assignable to type 'ExplorerRelationshipType'.`
4. `explorer/src/test/architecture-layout-remediation.test.ts(38,5)`
   `error TS2322: Type '"calls"' is not assignable to type 'ExplorerRelationshipType'.`
5. `explorer/src/lib/graph-builder.test.ts(255,94)`
   `error TS2322: Type '"NOT_COVERED"' is not assignable to type '"UNTESTED" | "COVERED" | "NO_TESTS" | "AMBIGUOUS" | "FULL_COVERAGE" | "PARTIAL_COVERAGE"'.`
6. `explorer/src/lib/graph-builder.test.ts(266,94)`
   `error TS2322: Type '"NOT_COVERED"' is not assignable to type '"UNTESTED" | "COVERED" | "NO_TESTS" | "AMBIGUOUS" | "FULL_COVERAGE" | "PARTIAL_COVERAGE"'.`

---

## 2. Source of Each Type Contract

Both type contracts originate from `explorer/src/types/explorer.ts`:

1. **`ExplorerRelationshipType`**
   ```ts
   export type ExplorerRelationshipType =
     | "method-call"
     | "instantiation"
     | "type-reference"
     | "generic-type"
     | "extends"
     | "implements"
     | "SOQL"
     | "soql-object"
     | "soql-field"
     | "DML"
     | "aura-enabled"
     | "lwc-apex"
     | "lwc-import"
     | "lwc-template-child"
     | "field-reference"
     | "trigger-handler"
     | "trigger-object"
     | "trigger-on"
     | "visualforce-controller"
     | "test-reference"
     | "event-publisher"
     | "unknown";
   ```
   *Note:* `'calls'` is an invalid string literal; `'method-call'` is the authoritative value representing method call relationships on `ExplorerEdge`.

2. **`ExplorerNode.refactoringReadiness.testCoverageStatus`**
   ```ts
   export interface ExplorerNode {
     ...
     refactoringReadiness: {
       ...
       testCoverageStatus: "COVERED" | "NO_TESTS" | "UNTESTED" | "AMBIGUOUS" | "FULL_COVERAGE" | "PARTIAL_COVERAGE";
     };
   }
   ```
   *Note:* `'NOT_COVERED'` is an obsolete literal value; `'UNTESTED'` is the authoritative union member.

---

## 3. Fixes Applied

- `explorer/src/components/graph-internals/EdgeHoverCard.role.test.tsx`: Updated `relationshipType: 'calls'` to `relationshipType: 'method-call'`.
- `explorer/src/components/graph-internals/EdgeHoverCard.vscodeUrl.test.tsx`: Updated `relationshipType: 'calls'` to `relationshipType: 'method-call'`.
- `explorer/src/components/graph-internals/HoverCardCopyUnmount.test.tsx`: Updated `relationshipType: 'calls'` to `relationshipType: 'method-call'`.
- `explorer/src/test/architecture-layout-remediation.test.ts`: Updated `relationshipType: 'calls'` to `relationshipType: 'method-call'`.
- `explorer/src/lib/graph-builder.test.ts`: Updated `testCoverageStatus: 'NOT_COVERED'` to `testCoverageStatus: 'UNTESTED'` on lines 255 and 266.

---

## 4. Exact Diff

```diff
diff --git a/explorer/src/components/graph-internals/EdgeHoverCard.role.test.tsx b/explorer/src/components/graph-internals/EdgeHoverCard.role.test.tsx
index 287eedf..9d80bd9 100644
--- a/explorer/src/components/graph-internals/EdgeHoverCard.role.test.tsx
+++ b/explorer/src/components/graph-internals/EdgeHoverCard.role.test.tsx
@@ -9,7 +9,7 @@ describe('Fix #24 — Add role="tooltip" to EdgeHoverCard', () => {
       id: 'e1',
       source: 'n1',
       target: 'n2',
-      relationshipType: 'calls',
+      relationshipType: 'method-call',
     };

     const { container } = render(
diff --git a/explorer/src/components/graph-internals/EdgeHoverCard.vscodeUrl.test.tsx b/explorer/src/components/graph-internals/EdgeHoverCard.vscodeUrl.test.tsx
index e84c6ff..9ae2237 100644
--- a/explorer/src/components/graph-internals/EdgeHoverCard.vscodeUrl.test.tsx
+++ b/explorer/src/components/graph-internals/EdgeHoverCard.vscodeUrl.test.tsx
@@ -9,7 +9,7 @@ describe('EdgeHoverCard vscodeUrl encoding', () => {
       id: 'e1',
       source: 'n1',
       target: 'n2',
-      relationshipType: 'calls',
+      relationshipType: 'method-call',
       file: 'C:/Users/My Name/Project/src#1/app.ts',
       line: 42,
     };
diff --git a/explorer/src/components/graph-internals/HoverCardCopyUnmount.test.tsx b/explorer/src/components/graph-internals/HoverCardCopyUnmount.test.tsx
index f00a498..baa8d80 100644
--- a/explorer/src/components/graph-internals/HoverCardCopyUnmount.test.tsx
+++ b/explorer/src/components/graph-internals/HoverCardCopyUnmount.test.tsx
@@ -42,7 +42,7 @@ describe('Fix #21 — Clear copy timers on unmount in hover cards', () => {
   });

   it('clears copy timeout when EdgeHoverCard unmounts', async () => {
-    const edge: ExplorerEdge = { id: 'e1', source: 'n1', target: 'n2', relationshipType: 'calls', file: 'src/E1.cls', line: 12 };
+    const edge: ExplorerEdge = { id: 'e1', source: 'n1', target: 'n2', relationshipType: 'method-call', file: 'src/E1.cls', line: 12 };
     const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');

     const { getByTitle, unmount } = render(
diff --git a/explorer/src/lib/graph-builder.test.ts b/explorer/src/lib/graph-builder.test.ts
index d76376c..892c69a 100644
--- a/explorer/src/lib/graph-builder.test.ts
+++ b/explorer/src/lib/graph-builder.test.ts
@@ -252,7 +252,7 @@ describe('graph-builder', () => {
           risk: 'LOW',
           riskReasons: [],
           behavior: { isTest: false, sharing: null, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
-          refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'NOT_COVERED' }
+          refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' }
         },
         {
           id: 'CustomObject:Invoice__c',
@@ -263,7 +263,7 @@ describe('graph-builder', () => {
           risk: 'LOW',
           riskReasons: [],
           behavior: { isTest: false, sharing: null, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
-          refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'NOT_COVERED' }
+          refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' }
         }
       ];

diff --git a/explorer/src/test/architecture-layout-remediation.test.ts b/explorer/src/test/architecture-layout-remediation.test.ts
index 26bff1c..287acf7 100644
--- a/explorer/src/test/architecture-layout-remediation.test.ts
+++ b/explorer/src/test/architecture-layout-remediation.test.ts
@@ -35,7 +35,7 @@ function createMockEdge(id: string, source: string, target: string, overrides: P
     id,
     source,
     target,
-    relationshipType: 'calls',
+    relationshipType: 'method-call',
     ...overrides,
   };
 }
```

---

## 5. Files Changed

1. `explorer/src/components/graph-internals/EdgeHoverCard.role.test.tsx`
2. `explorer/src/components/graph-internals/EdgeHoverCard.vscodeUrl.test.tsx`
3. `explorer/src/components/graph-internals/HoverCardCopyUnmount.test.tsx`
4. `explorer/src/lib/graph-builder.test.ts`
5. `explorer/src/test/architecture-layout-remediation.test.ts`

---

## 6. Deferred Errors

Remaining TS2322 errors outside this 6-error batch:

- `explorer/src/lib/graph-layout.test.ts` (Lines 65 & 79: `'dependency'` vs `ExplorerRelationshipType`)
- `explorer/src/components/graph-internals/FeatureOverlayCanvas.debouncedHighlight.test.tsx` (Lines 37 & 52: `Map<string, FeatureCluster>` / `Map<string, FeatureAssignment>`)
- `explorer/src/components/graph-internals/FeatureOverlayCanvas.orbitGuides.test.tsx` (Lines 37 & 85: `OrbitGuideMetadata`)
- `explorer/src/components/GraphView.closurePolish.test.tsx` (Line 394: `ExplorerNode[]`)
- `explorer/src/components/GraphView.fix14.test.tsx` (Lines 75 & 89: `ExplorerNode[]` and `ExplorerEdge[]`)
- `explorer/src/components/GraphView.hoverCardLiveEntity.test.tsx` (Line 92: `'calls'` vs `ExplorerRelationshipType`)
- `explorer/src/hooks/useViewState.fix15.test.tsx` & `fix16.test.tsx` (Line 14: `Location` vs `string & Location`)

---

## 7. Confirmation of Safety Directives

Confirmed that no TypeScript check (`tsc`), test execution (`vitest`/`npm test`), build (`npm run build`), dependency installation (`npm install`/`npm ci`), or environment configuration modification was run.
