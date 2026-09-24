# Layout Density Regression Investigation

## 1. Reproduction
The reported visual layout-density regression was investigated on the canonical Salesforce architecture dataset: `audit-fixtures/cloud-spend-tracker/explorer-data.json` (SHA-256: `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`, 240 nodes, 1,024 edges).

When loading the graph with the changes from `layout_shrink.txt` (commit `3cce383343b6e0ad76c61db4383e9430b438fa60`), the graph appears visually much denser. On-screen elements compete for whitespace because 13 large SVG outer feature region enclosure boxes, text labels (`Feature: feature_<Name>`), and backgrounds are rendered on top of the graph elements.

## 2. Baseline Measurements
Measurements were taken across the 240-node canonical graph for both default production mode (`enableFeatureLayout: false`) and hybrid mode (`enableFeatureLayout: true`):

- **Node Dimensions**: `120px × 60px` (fixed across all nodes)
- **Node Count**: 240
- **Edge Count**: 1,024

### Default Mode (`enableFeatureLayout: false`):
- **Node Coordinates**: Unchanged from historical baseline.
- **Minimum Primary Gap**: `0.00px` (due to 11 primary node overlaps present in default mode layout).
- **Minimum Same-Feature Gap**: `40.00px`
- **Minimum Cross-Feature Gap**: `0.00px`
- **Minimum Same-Layer Gap**: `0.00px`
- **Minimum Cross-Layer Gap**: `0.00px`
- **Minimum Satellite-Parent Gap**: `0.00px`
- **Minimum Component Gap**: `0.00px`
- **Total Overlap Count**: 15 (11 primary-primary overlaps, 4 satellite overlaps)
- **Near-Collision Count**: 0 (below 20px threshold)

### Hybrid Mode (`enableFeatureLayout: true`):
- **Node Coordinates**: Unchanged from Phase 6/7/18 Candidate E baseline.
- **Minimum Primary Gap**: `39.99906px` (evaluated as `40.00px` under `1e-3` epsilon normalization)
- **Minimum Same-Feature Gap**: `40.00px`
- **Minimum Cross-Feature Gap**: `40.00px`
- **Minimum Same-Layer Gap**: `39.99906px`
- **Minimum Cross-Layer Gap**: `39.99906px`
- **Minimum Satellite-Parent Gap**: `40.00px`
- **Minimum Component Gap**: `0.00px` (1 connected component)
- **Total Overlap Count**: 0 (0 primary overlaps, 0 satellite overlaps)
- **Near-Collision Count**: 0

## 3. Coordinate Change Analysis
Node coordinates were extracted and compared before and after the introduction of `layout_shrink.txt`:

- **Coordinate Delta**: Exactly `0.00000 px` across all 240 nodes.
- **Position Map Comparison**: `posBefore[nodeId]` is bit-for-bit identical to `posAfter[nodeId]` for every single node in both default mode and hybrid mode.
- **Conclusion**: Node coordinates did **NOT** change. No physical node-movement or spatial layout regression occurred.

## 4. Overlay vs Geometry Determination
This is **Category 2: A feature-overlay / visual-composition regression**.

The change in `layout_shrink.txt` added `featureRegions` prop transport into `FeatureOverlayCanvas.tsx` and introduced SVG `<rect>` enclosures with `<text>` labels for each feature region:
```tsx
<rect x={xMin} y={yMin} width={width} height={height} rx={16} fill="rgba(59, 130, 246, 0.02)" stroke="rgba(59, 130, 246, 0.35)" strokeWidth={2} />
<rect x={xMin + 12} y={yMin - 13} width={labelWidth} height={22} rx={6} fill="rgba(15, 23, 42, 0.92)" stroke="rgba(59, 130, 246, 0.6)" strokeWidth={1.2} />
<text x={xMin + 22} y={yMin + 2} ...>Feature: {featureId}</text>
```

When `featureRegions` metadata was exposed and rendered, 13 outer enclosure boxes and 13 opaque dark badge headers (`fill="rgba(15, 23, 42, 0.92)"`) were painted on the canvas background. These visual elements occupy canvas whitespace around and between nodes, creating the visual impression that the graph has "shrunk" or become "much denser", even though actual node coordinates and inter-node gaps are 100% identical.

## 5. runLayout / runLayoutWithMetadata Equivalence
- `runLayout(cy, options)` internally calls `runLayoutWithMetadata(cy, options)`.
- `runLayoutWithMetadata(cy, options)` computes `computeArchitectureLayoutWithMetadata()`, updates Cytoscape node positions using `posMap`, and returns `{ positions, featureRegions }`.
- Comparison of Cytoscape node positions resulting from `runLayout()` vs `runLayoutWithMetadata()` confirmed **100% mathematical equivalence** (`0.00000 px` drift across all nodes).

## 6. computeArchitectureLayout Equivalence
`computeArchitectureLayout()` is implemented as:
```ts
export function computeArchitectureLayout(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  options: ArchitectureLayoutOptions = {}
): Record<string, { x: number; y: number }> {
  return computeArchitectureLayoutWithMetadata(nodes, edges, options).positions;
}
```
Comparing `computeArchitectureLayout(nodes, edges, options)` with `computeArchitectureLayoutWithMetadata(nodes, edges, options).positions` confirms bit-for-bit identity (`0.00000 px` delta across all 240 nodes). Preserving the existing positions-only return contract was fully satisfied.

## 7. Duplicate Layout Execution Check
Execution trace analysis confirms:
- Metadata extraction is integrated directly into Stage 5 of the 13-stage layout pipeline (`globalDomainResult.featureRegions`).
- `computeArchitectureLayoutWithMetadata()` performs the 13-stage pipeline **exactly once**.
- `runLayoutWithMetadata()` invokes `computeArchitectureLayoutWithMetadata()` **exactly once**.
- No second layout pass or re-computation was introduced.

## 8. Position Authority Analysis
Position Authority priorities were verified:
1. Level 1: User Drag
2. Level 2: Persisted Position Map (`sessionPositionsRef` / `localStorage`)
3. Level 3: Existing Cytoscape Canvas Position
4. Level 4: Intelligent Architecture Layout
5. Level 5: Fallback Preset

Position Authority restoration in Stage 13 (`resultPositions[id] = existingPositions[id]`) functions correctly. Level 1–3 positions are preserved without degradation. Position Authority is not the cause of the reported density issue.

## 9. Stage-by-Stage Geometry Trace
Because node coordinates did **NOT** change, the stage-by-stage geometry trace for both pre-change and post-change is identical:

- **Stage 5 (Global Placement)**: Domain / Feature region bounds allocated.
- **Stage 7 (Primary Local Placement)**: Primary production node clearance $\ge 40.00\text{px}$.
- **Stage 8 (Bridge Placement)**: Inter-domain corridor placement.
- **Stage 9 (Satellite Placement)**: Secondary test/field placement around parent anchors.
- **Stage 10 (Component Packing)**: 2D FFDH shelf packing (1 component in Cloud Spend).
- **Stage 11 (Spacing & Collision Cleanup)**: Spatial hash grid pass maintaining $\ge 40.00\text{px}$ clearance.
- **Stage 12 (Final Coordinate Export)**: Stage 12 position map hash `af0ce2388c4539bc3389e55c5c34da0d0e0ea79d7963c8706f35ace28ffddb30`.

## 10. First Violating Stage
**None**. There is **no geometric stage violation** (`actualGap >= requiredGap` holds across all stages for the hybrid layout pipeline). The perceived regression is 100% visual/compositional rather than geometric.

## 11. Root-Cause Hypothesis
The perceived density regression is a **visual composition artifact** introduced by `FeatureOverlayCanvas.tsx` rendering 13 outer SVG feature region enclosure boxes and opaque feature header labels when `featureRegions` metadata is passed to `GraphView.tsx`.

Specifically:
1. `FeatureOverlayCanvas.tsx` renders feature region enclosure boxes whenever `featureRegions` is provided, without checking whether `enableFeatureLayout` is `true` or `false` or whether feature region overlays are explicitly enabled by the user visual overlay toggles.
2. The enclosure bounding box for a feature spans across all member nodes (`xMin` to `xMax`, `yMin` to `yMax`) plus label padding.
3. Rendering 13 prominent border boxes (`stroke="rgba(59, 130, 246, 0.35)"`) and 13 dark label badges (`fill="rgba(15, 23, 42, 0.92)"`) creates strong visual clutter and cuts through inter-node whitespace, giving the user the impression that nodes have moved closer together.

## 12. Evidence Supporting the Root Cause
1. **Coordinate Identity**: 240 / 240 node positions are identical before and after `layout_shrink.txt` (`0.00000 px` delta).
2. **Gap Identity**: Minimum node clearance remains `40.00px` (hybrid) and `0.00px` (default). Zero overlaps exist in hybrid mode.
3. **Function Equivalence**: `computeArchitectureLayout()` and `computeArchitectureLayoutWithMetadata().positions` produce identical coordinate maps.
4. **Code Inspection**: `layout_shrink.txt` modified `GraphView.tsx` to store `featureRegions` in state and pass it to `FeatureOverlayCanvas.tsx`. In `FeatureOverlayCanvas.tsx`, `featureRegionsList` only checks `if (!enableOverlay || !featureRegions || featureRegions.size === 0) return [];`, which causes feature region enclosures to draw as long as general overlays are enabled, regardless of mode or zoom level above 0.6.

## 13. Files That Would Need Modification
*(Note: These files are identified for informational/remediation-planning purposes; NO changes were made during this investigation)*

- `explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx` (to conditionally gate feature region enclosure box rendering behind an explicit feature-overlay visual toggle or when `enableFeatureLayout` is active).
- `explorer/src/components/GraphView.tsx` (to pass feature layout state or mode flags to control overlay visibility).

## 14. What MUST NOT Be Changed
In accordance with system governing contracts and project safeguards:
- **DO NOT** change any gap constants (`layerSpacing`, `domainSpacing`, `componentGap`, `nodeWidth`, `nodeHeight`).
- **DO NOT** modify layout algorithms in `architecture-layout.ts`, `global-layout.ts`, `local-layout.ts`, `satellites.ts`, or `spacing.ts`.
- **DO NOT** modify Position Authority or position restoration policies in `position-policy.ts`.
- **DO NOT** alter the 5-level Position Authority hierarchy or Level 1–3 position preservation.
- **DO NOT** alter node dimensions or shape calculations.
- **DO NOT** alter `computeArchitectureLayout()` or `computeArchitectureLayoutWithMetadata()` position calculation logic.

## 15. Recommended Minimal Fix
When implementation is authorized:
1. In `FeatureOverlayCanvas.tsx`, gate the rendering of `featureRegionsList` behind an explicit feature enclosure toggle (e.g., `showFeatureEnclosures` prop or checking `enableFeatureLayout`), or make enclosure borders/labels more subtle (`strokeWidth={1}`, translucent label badges) so they do not compete with node whitespace.
2. Ensure `featureRegions` is populated and rendered only when the hybrid feature layout mode is active (`enableFeatureLayout === true`) or when the user explicitly enables feature enclosure overlays in the visual controls panel.
