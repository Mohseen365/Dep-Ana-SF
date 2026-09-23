# 03 — UI/UX, Graph Interaction & Explainability

## Current UX model

The UI is organized around progressive disclosure: architecture overview first, then focused investigation, evidence, dependencies/dependents and actions.

### Main surfaces
- Fixed header with project context/status and layout mode controls.
- Searchable component inventory/sidebar with type, risk and hotspot filtering.
- Graph canvas with deterministic node-type shapes.
- Investigation drawer with Overview, Dependencies, Dependents, Evidence and Actions.
- Findings views present issue-oriented severity, explanation, location and evidence.
- Analysis History exposes snapshots, active snapshot state, deltas and comparison.

### Graph visual semantics
The latest visual audits preserve distinct shapes for major artifact types, including Apex classes, Apex tests, LWCs, objects and fields. Type visibility filtering is applied to the visible graph without mutating the source graph.

### Focus / depth / filtering
- Focus topology is calculated first.
- Depth (`1`, `2`, `3`, `ALL`) and direction (dependencies/dependents/both) constrain the focused graph.
- Artifact-type filtering then determines visible nodes.
- Hidden nodes do not leave stale feature/composition overlays.
- Static view changes do not invoke intelligent layout.

### Feature composition overlays
Wave 12/13 restored density controls:
- Near-duplicate groups are suppressed using overlap/containment thresholds.
- Duplicate labels are collapsed and sanitized.
- Composition boxes are hidden at far zoom (`zoom < 0.6`), shown progressively at closer zoom.
- Shared-infrastructure links are hidden by default and shown only through interaction.
- Overlay rendering is view-layer behavior and must not change node coordinates.

### Acceptance evidence
The latest visual acceptance audit reports:
- 0 coordinate drift during overlay/zoom/interaction verification.
- 0 layout invocations caused by composition overlay rendering.
- 0 default shared-link clutter.
- Deterministic node shapes and feature composition.
- Feature counts/membership unchanged during density restoration.

### Current design principle
The graph should expose architectural hierarchy at broad zoom and reveal semantic feature composition only as the user investigates. Visual explanation must never become a second layout engine.

## Key authoritative sources
- `WAVE13_VISUAL_ACCEPTANCE_REPORT.md` (2026-09-21 22:28:18)
- `FEATURE_VISUAL_DENSITY_REGRESSION_WAVE12_REPORT.md` (2026-09-21 07:59:12)
- `FINAL_UI_REGRESSION_REPORT.md` (2026-09-15 10:44:36)
- `ANALYSIS_VIEWS_UX.md` (2026-09-15 09:47:46)
- `COMPONENT_EXPLORER_UX.md` (2026-09-15 09:47:46)
