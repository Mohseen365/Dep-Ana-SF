# GRAPHVIEW — DEF-01 EMPTY-INPUT CONTRACT SCOPE CORRECTION REPORT

**Report File:** `GRAPHVIEW_DEF01_EMPTY_INPUT_CONTRACT_SCOPE_CORRECTION_REPORT.md`
**Execution Date:** October 9, 2026
**Auditor:** Jules (AI Software Engineer)
**Final Verdict:** `PASS — WORDING NARROWED`

---

### 1. EXECUTIVE VERDICT

**FINAL VERDICT: PASS — WORDING NARROWED**

A targeted contract-scope audit of the empty-input vs non-empty-input source code paths in `computeArchitectureLayoutWithMetadata` (`explorer/src/lib/architecture-layout.ts`) identified that the previous contract text in `context/CURRENT-CONTRACTS.md`, `context/CURRENT-DECISIONS.md`, and `context/CURRENT-ARCHITECTURE.md` was slightly overbroad because it implied the position-isolation invariant applied unconditionally to all inputs, including empty node inputs (`safeNodes.length === 0`).

The canonical context documents have been updated with minimal documentation-only edits that explicitly narrow the contract scope: **"For non-empty node inputs, Orbit and Constellation layout results returned by `computeArchitectureLayoutWithMetadata` must contain strictly projected node IDs (`result.projectedNodeIds`)."**

---

### 2. EXACT PRIOR CONTRACT WORDING

#### Prior Wording (`context/CURRENT-CONTRACTS.md`):
> `- **Lens B Position Isolation Invariant (DEF-01):** Orbit and Constellation layout results returned by computeArchitectureLayoutWithMetadata (explorer/src/lib/architecture-layout.ts) must contain strictly projected node IDs (result.projectedNodeIds). Unprojected node IDs must not be inherited or re-injected merely because they exist in existingPositions.`

#### Prior Wording (`context/CURRENT-DECISIONS.md`):
> `- **Decision:** The Orbit and Constellation layout calculation branches of computeArchitectureLayoutWithMetadata (explorer/src/lib/architecture-layout.ts) return position maps containing strictly projected node IDs (result.projectedNodeIds). Stale coordinates for unprojected nodes present in existingPositions are forbidden from being re-injected into layout calculation results.`

#### Prior Wording (`context/CURRENT-ARCHITECTURE.md`):
> `In Lens B (Orbit and Constellation modes), layout calculations in computeArchitectureLayoutWithMetadata (explorer/src/lib/architecture-layout.ts) strictly isolate returned position maps to projected node IDs (result.projectedNodeIds), preventing stale existingPositions re-injection for unprojected nodes...`

---

### 3. SOURCE EVIDENCE FOR BOTH INPUT PATHS

Inspection of `explorer/src/lib/architecture-layout.ts` (lines 105–202) reveals two distinct input handling paths:

#### A. Empty-Input Path (`safeNodes.length === 0`, Lines 110–120):
```typescript
  if (safeNodes.length === 0) {
    if (architectureMode === 'orbit') {
      const orbitOutput = computeOrbitLayout({
        nodes: [],
        options: {
          nodeWidth,
          nodeHeight,
        },
      });
      return {
        positions: { ...existingPositions },
        orbitGuides: orbitOutput.guides,
      };
    }
    return { positions: { ...existingPositions } };
  }
```
- **Behavior:** When `safeNodes.length === 0`, line 111 intercepts execution before any mode-specific projection adapters (`adaptComponentOrbit` / `adaptComponentConstellation`) are called.
- **Return Values:**
  - Orbit mode: `{ positions: { ...existingPositions }, orbitGuides: orbitOutput.guides }`.
  - Other modes: `{ positions: { ...existingPositions } }`.
- **Key Observation:** `result.projectedNodeIds` is `undefined` (omitted from the return object), while `result.positions` returns a copy of `{ ...existingPositions }`.

#### B. Non-Empty-Input Path (`safeNodes.length > 0`, Lines 123–202):
```typescript
  // Constellation Branch (L123-156)
  const projection = adaptComponentConstellation(schemaInput, options.componentConstellationOptions);
  const constellationOutput = computeComponentConstellationLayout(projection, { nodeWidth, nodeHeight });
  const constellationPositions: Record<string, { x: number; y: number }> = {};
  for (const [nodeId, pos] of Object.entries(constellationOutput.positions)) {
    constellationPositions[nodeId] = { x: pos.x, y: pos.y };
  }
  return {
    positions: constellationPositions,
    orbitGuides: constellationOutput.guides as any,
    projectedNodeIds: new Set(Object.keys(projection.nodes)),
  };

  // Orbit Branch (L164-202)
  const projection = adaptComponentOrbit(schemaInput, { focalLwcId: options.focalLwcId, ...options.componentOrbitOptions });
  const orbitOutput = computeComponentOrbitLayout(projection, { nodeWidth, nodeHeight });
  const orbitPositions: Record<string, { x: number; y: number }> = {};
  for (const [nodeId, pos] of Object.entries(orbitOutput.positions)) {
    orbitPositions[nodeId] = { x: pos.x, y: pos.y };
  }
  return {
    positions: orbitPositions,
    orbitGuides: orbitOutput.guides as any,
    projectedNodeIds: new Set(Object.keys(projection.nodes)),
  };
```
- **Behavior:** When `safeNodes.length > 0`, layout adapters process the nodes, `projection` is generated, and early returns at L152 and L198 pass back `positions` containing **strictly** the projected node IDs. No fallback loop populates unprojected `existingPositions`.
- **Key Invariant:** `Set(Object.keys(result.positions))` strictly equals `result.projectedNodeIds`.

---

### 4. WORDING ASSESSMENT AND CORRECTION

#### Assessment
The prior wording was overbroad because it stated without qualification that layout results in Orbit and Constellation modes "contain strictly projected node IDs (`result.projectedNodeIds`)." While this is 100% true for all non-empty inputs (`safeNodes.length > 0`), it did not account for the empty-input early return path at L110 where `safeNodes.length === 0` returns `{ positions: { ...existingPositions } }` without defining `projectedNodeIds`.

#### Correction Applied
To align the canonical context text with absolute source code truth, a minimal documentation qualification was added: **"For non-empty node inputs..."**

---

### 5. EXACT FILES AND LINES CHANGED

The documentation edits were applied strictly to the context files in `context/`:

#### 1. `context/CURRENT-CONTRACTS.md` (Line 59)
```diff
- - **Lens B Position Isolation Invariant (DEF-01):** Orbit and Constellation layout results returned by `computeArchitectureLayoutWithMetadata` (`explorer/src/lib/architecture-layout.ts`) must contain strictly projected node IDs (`result.projectedNodeIds`). Unprojected node IDs must not be inherited or re-injected merely because they exist in `existingPositions`.
+ - **Lens B Position Isolation Invariant (DEF-01):** For non-empty node inputs, Orbit and Constellation layout results returned by `computeArchitectureLayoutWithMetadata` (`explorer/src/lib/architecture-layout.ts`) must contain strictly projected node IDs (`result.projectedNodeIds`). Unprojected node IDs must not be inherited or re-injected merely because they exist in `existingPositions`.
```

#### 2. `context/CURRENT-DECISIONS.md` (Line 48)
```diff
- - **Decision:** The Orbit and Constellation layout calculation branches of `computeArchitectureLayoutWithMetadata` (`explorer/src/lib/architecture-layout.ts`) return position maps containing strictly projected node IDs (`result.projectedNodeIds`). Stale coordinates for unprojected nodes present in `existingPositions` are forbidden from being re-injected into layout calculation results.
+ - **Decision:** For non-empty node inputs, the Orbit and Constellation layout calculation branches of `computeArchitectureLayoutWithMetadata` (`explorer/src/lib/architecture-layout.ts`) return position maps containing strictly projected node IDs (`result.projectedNodeIds`). Stale coordinates for unprojected nodes present in `existingPositions` are forbidden from being re-injected into layout calculation results.
```

#### 3. `context/CURRENT-ARCHITECTURE.md` (Line 84)
```diff
- In Lens B (Orbit and Constellation modes), layout calculations in `computeArchitectureLayoutWithMetadata` (`explorer/src/lib/architecture-layout.ts`) strictly isolate returned position maps to projected node IDs (`result.projectedNodeIds`), preventing stale `existingPositions` re-injection for unprojected nodes (DEF-01 closure, referenced in `GRAPHVIEW_DEF01_FINAL_EXECUTION_EVIDENCE_GATE_REPORT.md`).
+ In Lens B (Orbit and Constellation modes) for non-empty node inputs, layout calculations in `computeArchitectureLayoutWithMetadata` (`explorer/src/lib/architecture-layout.ts`) strictly isolate returned position maps to projected node IDs (`result.projectedNodeIds`), preventing stale `existingPositions` re-injection for unprojected nodes (DEF-01 closure, referenced in `GRAPHVIEW_DEF01_FINAL_EXECUTION_EVIDENCE_GATE_REPORT.md`).
```

---

### 6. EVIDENCE OF BASELINE PRESERVATION

Git diff analysis (`git diff HEAD -- explorer/src/lib/architecture-layout.ts explorer/src/test/def01-position-isolation.test.ts package.json explorer/package.json`) confirms:

- **Production Source Code:** `0 lines changed` (100% clean).
- **Regression Test Suites:** `0 lines changed` (100% clean).
- **Package Manifests:** `0 lines changed` (100% clean).
- **Product Gates A–D:** Explicitly preserved as unresolved across all updated documentation files.

---

### 7. REMAINING LIMITATIONS & FINAL VERDICT

1. **Empty-Input Fallback Behavior:** When `safeNodes.length === 0`, `computeArchitectureLayoutWithMetadata` returns `{ positions: { ...existingPositions } }`. This baseline fallback allows callers providing empty node sets to retain existing canvas positions if desired.
2. **Global Canvas Persistence:** Cytoscape retains all loaded nodes in memory (`cy.nodes()`) across mode switches. Switching back from Lens B to Hierarchical mode passes `nodePositions` as `existingPositions` for incremental layout.
3. **Product Gates A–D:** Visual and semantic policies for Gates A–D remain open design choices for future product tracks.

**FINAL VERDICT: PASS — WORDING NARROWED**
