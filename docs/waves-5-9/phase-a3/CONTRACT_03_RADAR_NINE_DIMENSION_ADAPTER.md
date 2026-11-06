# Contract 03: Radar Nine-Dimension Architecture Adapter

## 1. Document Control & Identification
- **Contract ID**: `CONTRACT-03`
- **Contract Name**: Radar Nine-Dimension Architecture Adapter
- **Version**: `1.0.0`
- **Status**: `SOURCE_CONFIRMED`
- **Purpose**: Reconciles the analytical dimensions, formulas, visual scaling algorithms, and SVG presentation rules for the Radar View (`daRadarView`) based strictly on the authoritative implementation in `explorer/src/lib/adapters/radar-adapter.ts` and `explorer/src/components/RadarPanel.tsx`.
- **Affected Tasks**: `W6-1` (Architecture Radar Component)
- **Affected Workstreams**: Workstream B (Wave 6) and Integration Coordinator

---

## 2. Source-of-Truth References
1. `explorer/src/lib/adapters/radar-adapter.ts` (Authoritative analytical data transformation: `adaptRadarDimensions`, `RadarDimension`, `RadarSummary`, `MissingPrimitiveInfo`).
2. `explorer/src/components/RadarPanel.tsx` (Authoritative visual normalization algorithm: `getVisualNormalizedValue`, radial SVG geometry, polygon vertex calculation).
3. `explorer/src/lib/health.ts` (`calculateArchitectureHealth` heuristic: health score, riskPercent, level).
4. `explorer/src/lib/hotspots.ts` (`getArchitecturalHotspots` heuristic: fan-in, coupling, risk thresholds).

---

## 3. Discrepancy Resolution & Reconciliation

### 3.1 Historical 5-Metric Assumption vs Phase A2 vs Actual Adapter
- **Historical Assumption**: Radar was assumed to cover 5 metrics.
- **Phase A2 Candidate List**: Coupling, Instability, Abstraction, Distance from Main Sequence, Cycle Participation, Unassigned Ratio, Test Coverage Density, Complexity, Component Density.
- **Actual Implementation (`radar-adapter.ts`)**:
  Inspection of `explorer/src/lib/adapters/radar-adapter.ts` reveals that the 9 candidate dimensions proposed in Phase A2 are **NOT** what the existing code computes. In fact, `radar-adapter.ts` explicitly rejects inventing arbitrary scoring models and establishes:
  1. Exactly **9 active dimensions** backed by authoritative project metrics.
  2. Exactly **3 missing primitives** documented explicitly because no authoritative scoring exists for them.

**Decision**: The authoritative 9 dimensions for `W6-1` (`daRadarView`) MUST strictly mirror `radar-adapter.ts` and `RadarPanel.tsx`. Task W6-1 must not fabricate Martin package metrics (Instability, Abstraction, Distance from Main Sequence) that do not exist in the source codebase.

---

## 4. The 9 Canonical Radar Dimensions

| Index | Dimension Key (`id`) | Display Label | Source Metric / Calculation | Unit | Authoritative Score? | Better Direction |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- |
| 1 | `architecture_health` | Architecture Health | `calculateArchitectureHealth(input).score` | `score` | **Yes** | **Higher** (0–100) |
| 2 | `risk_exposure` | Risk Exposure | `calculateArchitectureHealth(input).riskPercent` | `percent` | **Yes** | **Lower** (0–100%) |
| 3 | `circular_dependencies`| Circular Dependencies| `input.cycles.length` (or `summary.cycleCount`)| `count` | No (Raw count) | **Lower** |
| 4 | `unresolved_references`| Unresolved References| `input.summary.unresolvedCount` | `count` | No (Raw count) | **Lower** |
| 5 | `architectural_hotspots`| Architectural Hotspots| `getArchitecturalHotspots(nodes, cycles).topRanked.length` | `count` | No (Raw count) | **Lower** |
| 6 | `high_risk_components` | High Risk Components | `summary.highRiskCount` (or nodes with `risk === 'HIGH'`) | `count` | No (Raw count) | **Lower** |
| 7 | `medium_risk_components`| Medium Risk Components| `summary.mediumRiskCount` (or nodes with `risk === 'MEDIUM'`) | `count` | No (Raw count) | **Lower** |
| 8 | `total_components` | Total Components | `input.nodes.length` | `count` | No (Volume) | Informational |
| 9 | `total_dependencies` | Total Dependencies | `input.edges.length` | `count` | No (Volume) | Informational |

---

## 5. Visual Normalization vs Architectural Scoring

In `RadarPanel.tsx`, the presentation layer distinguishes between **authoritative raw metrics** and **visual polygon scaling**:

```typescript
/**
 * Visual normalization function strictly for radial SVG geometry positioning.
 * Maps heterogeneous metrics (scores, percentages, counts) into bounded [0, 1] radial display coordinates.
 *
 * CRITICAL RULE: This is a presentation scaling mapping only and does NOT alter raw values
 * or represent a new architectural scoring algorithm. Raw source values remain authoritative.
 */
export function getVisualNormalizedValue(dim: RadarDimension, summary: RadarSummary): number {
  if (dim.unit === 'score' || dim.unit === 'percent') {
    return Math.min(1, Math.max(0, dim.rawValue / 100));
  }
  if (dim.id === 'total_components') {
    return summary.totalComponents > 0 ? 1.0 : 0;
  }
  if (dim.id === 'total_dependencies') {
    return summary.totalDependencies > 0 ? 1.0 : 0;
  }
  if (dim.id === 'high_risk_components' || dim.id === 'medium_risk_components') {
    return summary.totalComponents > 0 ? Math.min(1, dim.rawValue / summary.totalComponents) : 0;
  }
  if (dim.id === 'circular_dependencies') {
    const refMax = Math.max(10, summary.totalComponents * 0.1);
    return Math.min(1, dim.rawValue / refMax);
  }
  if (dim.id === 'unresolved_references') {
    const refMax = Math.max(20, summary.totalComponents * 0.2);
    return Math.min(1, dim.rawValue / refMax);
  }
  if (dim.id === 'architectural_hotspots') {
    const refMax = Math.max(20, summary.totalComponents * 0.2);
    return Math.min(1, dim.rawValue / refMax);
  }
  return Math.min(1, Math.max(0, dim.rawValue / 100));
}
```

---

## 6. The 3 Missing Primitives Contract

In accordance with `radar-adapter.ts` (lines 173–193), the adapter explicitly catalogs the following missing primitives:

1. **Layer Purity Score**:
   - *Reason*: No authoritative 0–100 layer purity or illegal layer dependency scoring model exists in the project.
   - *Required Primitive*: `computeLayerPurityIndex(nodes, edges)`
2. **Dependency Health Index**:
   - *Reason*: No authoritative normalized dependency health or fan-in/fan-out balance metric exists in the project.
   - *Required Primitive*: `computeDependencyHealthIndex(nodes, edges)`
3. **Test Coverage Score**:
   - *Reason*: Node `testCoverageStatus` is categorical (`COVERED`, `UNTESTED`, `AMBIGUOUS`, `UNKNOWN`), not a percentage or project-level aggregate score.
   - *Required Primitive*: `computeProjectTestCoverageScore(nodes)`

**LWC Compliance Rule**: The LWC port `daRadarView` must render an information badge or disclosure list presenting these three missing primitives when queried, preserving architectural transparency.

---

## 7. LWC SVG Rendering Specifications

The LWC component `daRadarView` will render standard native SVG (no D3 or external canvas libraries):
- **ViewBox**: `0 0 560 440` (Width: 560, Height: 440, Center: `(280, 220)`, Radius: 125).
- **Radial Spacing**: 9 equidistant axes spaced by $\Delta\theta = \frac{2\pi}{9}$ starting at $-\frac{\pi}{2}$ (top vertical).
- **Concentric Grid**: 4 reference rings (25%, 50%, 75%, 100%).
- **Interactive Points**: Hovering over or clicking an axis vertex displays the raw value, unit, and authoritative metric source in a tooltip or inspector panel.
- **Semantic Independence**: Radar is an analytical view; Orbit is a graph layout. They are completely independent and must not be conflated.
