# Wave 0.1: Canonical Component Naming & Radar Parity Decisions

**Status:** APPROVED & AUTHORITATIVE
**Target Platform:** Salesforce Lightning Web Components (LWC)
**Scope:** Wave 6 (Radar View Parity), Wave 7 (Architecture DNA Barcode Naming)

---

## 1. Issue 3: Architecture DNA Component Naming Resolution

### 1.1 Source & Naming Convention Analysis
In historical Phase 3 audits and Wave 0 documents, two conflicting component names appeared:
- `daDnaBarcode`
- `daArchitectureDnaBarcode`

We inspected:
1. **React Source:** `explorer/src/components/ArchitectureDNABarcode.tsx` and adapter `explorer/src/lib/adapters/dna-adapter.ts`.
2. **Salesforce Component Conventions in `scratch/salesforce-poc/`:**
   - Existing components use the `da` prefix followed by descriptive PascalCase representing the full concept name:
     - `daAnnotationPanel`
     - `daFindingsView`
     - `daGraphPayloadLoader`
     - `daGraphViewer`
     - `daLayoutEngine`
     - `daMatrixView`
     - `daPresetManager`
     - `daProjectSelector`
3. **Phase 3 Authoritative Matrices:**
   - `docs/audits/salesforce-migration-phase-3/PHASE_3_AUTHORITATIVE_IMPLEMENTATION_ROADMAP.md` explicitly designated Task W7-T2 as `daArchitectureDnaBarcode`.
   - `docs/audits/salesforce-wave2/AUTHORITATIVE_MIGRATION_PARITY_MATRIX.csv` designated `daArchitectureDnaBarcode`.

### 1.2 Canonical Decision
**Canonical LWC Component Name:** `daArchitectureDnaBarcode`
**Target Directory:** `scratch/salesforce-poc/force-app/main/default/lwc/daArchitectureDnaBarcode/`

**Rationale:**
1. Directly preserves semantic fidelity with `ArchitectureDNABarcode.tsx`.
2. Avoids ambiguous acronym abbreviations (`DnaBarcode` vs `ArchitectureDnaBarcode`).
3. Reconciles Phase 3 roadmap specifications with Wave 7 dispatch.
4. No separate child or wrapper component is required; `daArchitectureDnaBarcode` will encapsulate both the SVG barcode rendering band and the trait inspection tooltips.

All references in Wave 0 deliverables, file ownership matrices, task registers, and dispatch instructions are standardized to `daArchitectureDnaBarcode`.

---

## 2. Issue 4: Radar Analytical Metric & Axis Parity Resolution

### 2.1 The Historical Discrepancy
- The Phase 3 roadmap loosely stated that Radar displayed "5 axes: Complexity, Coupling, Coverage, Cohesion, Risk".
- Wave 0 draft documents listed 4 metrics and described geometry over 3 axes in test suites.

### 2.2 Forensic Inspection of React Source Truth
Source inspection of `explorer/src/lib/adapters/radar-adapter.ts` and `explorer/src/components/RadarPanel.tsx` reveals the actual implementation:

1. **Total Dimensions in Radar Adapter:** Exactly **9 dimensions** are computed and returned:
   - `architecture_health` (Unit: `score` 0-100, authoritative score from `calculateArchitectureHealth().score`)
   - `risk_exposure` (Unit: `percent` 0-100%, authoritative percentage from `calculateArchitectureHealth().riskPercent`)
   - `circular_dependencies` (Unit: `count`, raw cycle count from `input.cycles.length`)
   - `unresolved_references` (Unit: `count`, raw count from `input.summary.unresolvedCount`)
   - `architectural_hotspots` (Unit: `count`, raw count from `getArchitecturalHotspots().topRanked.length`)
   - `high_risk_components` (Unit: `count`, raw count of HIGH risk nodes)
   - `medium_risk_components` (Unit: `count`, raw count of MEDIUM risk nodes)
   - `total_components` (Unit: `count`, raw count of nodes)
   - `total_dependencies` (Unit: `count`, raw count of edges)

2. **Explicitly Missing Primitives in React Source:**
   The React adapter explicitly refuses to fabricate scores for concepts lacking authoritative underlying models:
   - *Layer Purity Score:* Missing because no authoritative 0-100 layer purity model exists.
   - *Dependency Health Index:* Missing because no normalized fan-in/fan-out balance metric exists.
   - *Test Coverage Score:* Missing because node coverage is categorical (`COVERED`, `UNTESTED`, `AMBIGUOUS`, `UNKNOWN`), not a project-level aggregate percent.

3. **Visual Geometry Scaling vs Native Metrics:**
   - In `RadarPanel.tsx`, SVG polygon rendering uses `getVisualNormalizedValue(dim, summary)` to project heterogeneous units (`score`, `percent`, `count`) onto radial coordinates $[0, 1]$.
   - Native units and raw values are **strictly preserved** in tooltips and the side inspector table.
   - Radial geometry renders a nonagon (9-axis polygon) when all dimensions are present.

4. **Distinction from Orbit Layout:**
   - Architecture Radar is an **analytical summary panel** (`daRadarView`), rendering an SVG radar chart.
   - Orbit Layout is a **Cytoscape node placement algorithm** (`computeOrbitLayout` in `daLayoutEngine.js`), placing graph nodes along concentric circular tracks based on centrality or layers.
   - These are completely distinct subsystems with zero code or geometric coupling.

### 2.3 Authoritative Parity Decision for LWC (`daRadarView`)
1. `daRadarView` will port `radar-adapter.ts` faithfully, maintaining the **9 canonical dimensions** and the 3 explicit missing primitive disclosures.
2. SVG rendering in LWC will implement the 9-vertex radial projection using `getVisualNormalizedValue` presentation logic without altering raw data metrics.
3. The Wave 0 test plan is corrected to test all 9 axes, verifying bounds $[0, 1]$ and unit formatting for `score`, `percent`, and `count`.
4. No synthetic cohesion or test coverage score may be invented.

---

## 3. Parity Gaps & Implementation Constraints
- **GAP-RADAR-01:** Category coverage cannot be converted to a percentage without PO-approved aggregation rules. The radar must continue to display the categorical summary rather than inventing a percent.
- **GAP-RADAR-02:** SVG radial coordinates in LWC must use standard SVG template elements compatible with Lightning Web Security (LWS).
