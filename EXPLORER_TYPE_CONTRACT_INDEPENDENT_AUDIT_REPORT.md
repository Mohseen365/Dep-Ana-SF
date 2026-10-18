# Independent Explorer Type-Contract Repair Audit Report

**Audit Executed:** October 2026
**Auditor:** Jules (Independent Software Engineer)
**Target Project:** `explorer/`
**Executive Verdict:** **ACCEPT WITH CAVEATS** — No material runtime or structural type contract defects found. Core layout, graph rendering, accessibility, and metric contracts are sound. Two minor type-annotation non-blocking caveats are identified for future maintenance.

---

## Safety & Governance Verification

- **Read-Only Audit:** All code changes evaluated in place; no production source files or existing test files modified.
- **Git State:** Clean working tree preserved (`git status` clean).
- **Protected Artifact Check:**
  - File: `last_commit_changes.txt`
  - Size: 50,024 bytes
  - SHA-256 Hash: `e834467bd4a5168f5b5dcc972c49d7456f0df78d7121a1a491648fb33ec8bedb`
  - **Verdict:** **VERIFIED INTACT**

---

## Detailed Audit Findings

### Target 1: `src/types/explorer.ts`

#### Finding 1.1: `ArchitectureLayer` Type Definition
- **File & Line:** `explorer/src/types/explorer.ts` (Line 147)
- **Claim Audited:** Claim that `ArchitectureLayer = string` was introduced in `explorer.ts`, weakening the architecture layer contract.
- **Evidence Inspected:**
  `explorer/src/types/explorer.ts` uses `ArchitectureLayer` as a type annotation (`layer?: ArchitectureLayer;`). The canonical `ArchitectureLayer` type is defined in `explorer/src/lib/layout/layers.ts` (Line 3) and `explorer/src/lib/layout/types.ts` (Line 4) as `'presentation' | 'application' | 'domain' | 'schema'`, and re-exported via `explorer/src/lib/layout/global-layout.ts` (Line 4). In `explorer.ts`, `ArchitectureLayer` is NOT defined as `string`.
- **Verdict:** **PASS**
- **Impact & Rationale:** Strict 4-layer union type (`'presentation' | 'application' | 'domain' | 'schema'`) is preserved across layout algorithms, ordering maps, and component drawers.
- **Recommended Correction:** None required.

#### Finding 1.2: Explorer Relationship Types Canonicality
- **File & Line:** `explorer/src/types/explorer.ts` (Lines 163–187)
- **Claim Audited:** Added relationship types are valid canonical values aligned with parser outputs.
- **Evidence Inspected:**
  `ExplorerRelationshipType` union includes 22 explicit relationship string literals:
  `"method-call" | "instantiation" | "type-reference" | "generic-type" | "extends" | "implements" | "SOQL" | "soql-object" | "soql-field" | "DML" | "aura-enabled" | "lwc-apex" | "lwc-import" | "lwc-template-child" | "field-reference" | "trigger-handler" | "trigger-object" | "trigger-on" | "visualforce-controller" | "test-reference" | "event-publisher" | "unknown"`.
  Traced usage across `graph-style.ts`, `graph-builder.ts`, `component-orbit-adapter.ts`, and filter controls. All 22 values are mapped cleanly without fall-through errors.
- **Verdict:** **PASS**
- **Impact & Rationale:** Covers all Salesforce dependency analyzer outputs including asynchronous event publishers and LWC child templates.
- **Recommended Correction:** None required.

#### Finding 1.3: `testCoverageStatus` Coverage State Enum
- **File & Line:** `explorer/src/types/explorer.ts` (Line 157)
- **Claim Audited:** `NOT_COVERED` is a valid coverage state, and all consumers handle it correctly.
- **Evidence Inspected:**
  `explorer/src/types/explorer.ts` defines `testCoverageStatus` as `"COVERED" | "NO_TESTS" | "UNTESTED" | "AMBIGUOUS" | "FULL_COVERAGE" | "PARTIAL_COVERAGE"`.
  In `explorer/src/lib/graph-builder.test.ts` (Lines 247, 258), test fixtures pass `'NOT_COVERED'`.
  In production consumers (`explorer/src/lib/readiness.ts` Lines 24–67, `explorer/src/components/InvestigationDrawer.tsx` Line 248), unknown status strings are handled defensively via fallbacks (e.g., rendering `'N/A'` or warning badge).
- **Verdict:** **CONCERN**
- **Impact & Rationale:** Non-blocking at runtime due to defensive nullish/OR fallbacks, but `'NOT_COVERED'` in test fixtures is absent from the `testCoverageStatus` union in `explorer.ts`.
- **Recommended Correction:** Add `"NOT_COVERED"` to the `testCoverageStatus` union type in `explorer/src/types/explorer.ts`.

---

### Target 2: `src/lib/architecture-layout.ts`

#### Finding 2.1: Defensive Behavior Fallback
- **File & Line:** `explorer/src/lib/architecture-layout.ts` (Line 120, 186, 213)
- **Claim Audited:** Fallback `behavior: node.behavior ?? { isTest: false }` preserves required semantics without stripping behavior attributes.
- **Evidence Inspected:**
  `architecture-layout.ts` line 120 performs defensive sanitization:
  `behavior: n.behavior ? { ...n.behavior, asyncPatterns: Array.isArray(n.behavior.asyncPatterns) ? [...n.behavior.asyncPatterns] : [] } : undefined`.
  For fabricated phantom nodes (Lines 186, 213), an explicit default `behavior` object with `isTest: false` and metric counters is supplied.
- **Verdict:** **PASS**
- **Impact & Rationale:** Input nodes retain their full `behavior` metadata (async patterns, query/DML counts, sharing clauses), while missing/phantom nodes are safely default-constructed.
- **Recommended Correction:** None required.

#### Finding 2.2: Authoritative Unresolved Edge Representation
- **File & Line:** `explorer/src/lib/architecture-layout.ts` (Line 247)
- **Claim Audited:** `edge.unresolved === true` is the authoritative unresolved-edge representation.
- **Evidence Inspected:**
  Line 247 calculates `unresolvedCount` as `safeEdges.filter(e => Boolean(e.unresolved) || e.relationshipType === 'unresolved').length`.
  Across `explorer/src/lib/schema.ts` (Zod schema Line 131), `explorer/src/lib/graph-builder.ts` (Line 173), `explorer/src/lib/graph-style.ts` (Line 344: `edge[unresolved = "true"]`), and `ExplorerEdge` (Line 213: `unresolved: boolean`), `edge.unresolved: boolean` is the canonical representation. Checking `relationshipType === 'unresolved'` is a safe backward-compatibility fallback.
- **Verdict:** **PASS**
- **Impact & Rationale:** Guarantees accurate diagnostic counts for both schema-compliant and legacy synthetic datasets.
- **Recommended Correction:** None required.

---

### Target 3: `src/components/GraphView.tsx`

#### Finding 3.1: Focus-State Reset Behavior
- **File & Line:** `explorer/src/components/GraphView.tsx` (Lines 1615–1618)
- **Claim Audited:** Default focus-state reset preserves existing disabled and enabled focus behavior.
- **Evidence Inspected:**
  In `GraphView.tsx`, the `Escape` key event listener executes:
  `if (onFocusChangeRef.current) { onFocusChangeRef.current({ enabled: false, focusNodeId: null }); }`.
  `FocusControls.tsx` handles `enabled: false` by resetting focus highlighting and showing disabled hint when no node is selected (`!hasSelectedNode && !focusState.focusNodeId`).
- **Verdict:** **PASS**
- **Impact & Rationale:** Dismissing focus state on `Escape` cleanly clears focus overlays without breaking `FocusControls` toggle logic or keyboard navigation.
- **Recommended Correction:** None required.

---

### Target 4: `src/components/InvestigationDrawer.tsx` & `src/lib/layout/layers.ts`

#### Finding 4.1: Absent Metrics Nullish Coalescing
- **File & Line:** `explorer/src/components/InvestigationDrawer.tsx` (Lines 195, 198, 228, 234, 238, 243, 254)
- **Claim Audited:** Converting absent metrics to zero preserves intended behavior without concealing incomplete data.
- **Evidence Inspected:**
  Metrics display uses nullish coalescing: `node.metrics?.score ?? 0`, `node.metrics?.coupling ?? 0`, `node.metrics?.fanIn ?? 0`, `node.metrics?.fanOut ?? 0`, `node.metrics?.unresolved ?? 0`.
  For test coverage, Line 248–249 renders `node.refactoringReadiness?.testCoverageStatus || 'N/A'`.
  Missing coverage is explicitly rendered as `'N/A'` rather than coercing to 0.
- **Verdict:** **PASS**
- **Impact & Rationale:** Nullish coalescing prevents React rendering crashes when inspecting partial mock nodes or external endpoints while accurately presenting missing coverage as `'N/A'`.
- **Recommended Correction:** None required.

---

### Target 5: `src/lib/highlight-state.ts`

#### Finding 5.1: Cytoscape Node and Edge Type Guards
- **File & Line:** `explorer/src/lib/highlight-state.ts` (Lines 60, 75, 114, 126, 151, 168, 185, 206, 228)
- **Claim Audited:** The Cytoscape type guard correctly distinguishes nodes and edges; both branches are reachable and correctly typed.
- **Evidence Inspected:**
  `deriveVisualClasses` uses Cytoscape element methods `ele.isNode()` and `ele.isEdge()` throughout selection, focus, path, cycle, impact, finding, simulation, and diff branches.
- **Verdict:** **PASS**
- **Impact & Rationale:** Native Cytoscape type guards ensure node-specific classes (`focus-center`, `focus-neighbor`, `impact-origin`) and edge-specific classes (`impact-affected`) are applied strictly to matching element types.
- **Recommended Correction:** None required.

#### Finding 5.2: Use of `any` in Class Operations
- **File & Line:** `explorer/src/lib/highlight-state.ts` (Lines 262–263)
- **Claim Audited:** `any` is completely avoided in `highlight-state.ts`.
- **Evidence Inspected:**
  In `applyHighlightState` (Line 263):
  `const rawClasses = typeof ele.classes === 'function' ? ele.classes() : (Array.isArray((ele as any)?.classes) ? (ele as any).classes : ...)`
  Uses `(ele as any)` cast as a fallback when handling non-standard test stubs where `ele.classes` is an array or string rather than a function.
- **Verdict:** **CONCERN**
- **Impact & Rationale:** Safe at runtime, but violates the strict "avoid `any`" directive for type-cleanliness.
- **Recommended Correction:** Type non-standard element stubs with unknown or custom interface stubs rather than casting to `any`.

---

### Target 6: `src/components/Phase1C_Accessibility.test.tsx`

#### Finding 6.1: `GraphErrorBoundary` Behavior Verification
- **File & Line:** `explorer/src/components/Phase1C_Accessibility.test.tsx` (Lines 257–299)
- **Claim Audited:** `GraphErrorBoundary` preserves expected error-boundary behavior.
- **Evidence Inspected:**
  `Phase1C_Accessibility.test.tsx` imports and tests `GraphErrorBoundary` (defined in `explorer/src/components/graph-internals/GraphErrorBoundary.tsx`).
  Tests verify:
  1. Catching overlay render errors and displaying alert banner `graph-overlay-error`.
  2. Debouncing retry state (200ms recovery timer).
  3. Resetting error state automatically when `resetKey` prop changes.
- **Verdict:** **PASS**
- **Impact & Rationale:** Overlay crashes are isolated and recoverable without crashing the main Cytoscape graph viewport.
- **Recommended Correction:** None required.

---

### Target 7: Test Fixtures (`GraphView.closurePolish.test.tsx` & `GraphControls.test.tsx`)

#### Finding 7.1: Fixture Integrity and Production Contract Broadening
- **File & Line:**
  - `explorer/src/components/GraphView.closurePolish.test.tsx` (Lines 66–160)
  - `explorer/src/components/GraphControls.test.tsx` (Lines 1–320)
- **Claim Audited:** Determine whether outdated fixtures were corrected or production contracts were broadened to accommodate them.
- **Evidence Inspected:**
  - `GraphView.closurePolish.test.tsx` mock fixtures (`mockNodes`, `mockEdges`) supply full schema-compliant properties including canonical edge location/resolution, behavior metrics, and refactoring readiness.
  - `GraphControls.test.tsx` tests accessibility features including roving tabIndex (`tabindex="0"` / `"-1"`), arrow key navigation (`ArrowRight`, `ArrowLeft`, `Home`, `End`), and focus containment guards (`N20`).
  - No production interfaces or type contracts were loosened or broadened to accommodate partial fixtures.
- **Verdict:** **PASS**
- **Impact & Rationale:** Test suites assert against complete production type definitions, ensuring high test fidelity and preventing type degradation.
- **Recommended Correction:** None required.

---

## Conclusion

**Final Disposition:** **ACCEPT WITH CAVEATS**

All audited Explorer type contracts, layout algorithms, focus/highlight state derivations, error boundary handlers, and accessibility enhancements operate as intended and comply with production requirements. The two identified caveats (addition of `"NOT_COVERED"` to `testCoverageStatus` union in `explorer.ts` and elimination of `(ele as any)` cast in `highlight-state.ts`) are non-blocking maintenance recommendations.
