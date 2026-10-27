# Wave 1R.2 Layout Parity Status

## Algorithm Parity Matrix

| Algorithm | Status | Tested Invariants | Known Omissions & Scope Limitations |
| :--- | :--- | :--- | :--- |
| **Architecture / Hierarchical (P0)** | **Full Parity** | Layer-based vertical ordering (`presentation < domain < schema`), deterministic finite coordinates, real CST fixture coordinate generation (240/240 nodes placed). | Force-directed simulation or iterative edge crossing minimization (preset layout used). |
| **Orbit Radial (P1)** | **Partial Parity** | Deterministic radial coordinates (`radius`, `angle`), finite `x`/`y` positions. | Interactive orbit rotation / dynamic ring expansion. |
| **Constellation Polar (P1)** | **Partial Parity** | Focal node centered at origin, ring hop distances, curved SVG edge paths (`pathSvg`). | Dynamic starfield background / physics animations. |
| **Sankey River Flow (P2)** | **Partial Parity** | Columnar stage layout, flow path SVG generation (`pathString` with cubic bezier curves). | Inter-stage node drag reordering / flow gradient shading. |

## Invariant Check
- **SELECTION ≠ NAVIGATION:** Verified in `daGraphViewer.js` and `run-poc-tests.cjs`. Node click events fire `nodeselect` custom events and update `selectedNodeId` without modifying window location or triggering router navigation.
