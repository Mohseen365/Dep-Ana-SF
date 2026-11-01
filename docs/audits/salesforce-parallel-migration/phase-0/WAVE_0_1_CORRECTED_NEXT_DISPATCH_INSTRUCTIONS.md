# Wave 0.1: Corrected Next Dispatch Instructions

**Status:** PENDING EXPLICIT USER AUTHORIZATION
**Coordinator:** Integration Coordinator

---

## 1. Explicit Warning & Boundary

$$\mathbf{DO\ NOT\ BEGIN\ FEATURE\ IMPLEMENTATION}$$

No feature implementation (Waves 5–9) has been authorized.
Do not launch parallel feature agents, do not install dependencies, do not create git branches, and do not modify Salesforce metadata until the user provides explicit authorization following review of this Wave 0.1 planning package.

---

## 2. Corrected Launch Order (Post-Authorization)

When user authorization is received, workstreams should be launched in this strict order:

### Phase 1: Unblocked Parallel Feature Lanes (12 Tasks Immediately Launchable)
- **Workstream A (Deep Graph):**
  - `W5-1`: Shell layout switcher in `daGraphViewer`
  - `W5-4`: Directional traversal focus
  - `W5-5`: Blast radius and impact calculation
  - `W5-6`: Hover cards and tooltip engine
- **Workstream B (Analytical Views):**
  - `W6-1`: `daRadarView` (9 canonical dimensions, native units)
  - `W6-2`: `daTreemapView` (native squarified treemap utility)
  - `W6-3`: `daSubwayView`
  - `W6-4`: `daHotspotsView`
- **Workstream C (Diagnostics & DNA):**
  - `W7-1`: `daDiagnosticsView`
  - `W7-2`: `daArchitectureDnaBarcode`
- **Workstream D (Investigation & Diff):**
  - `W8-1`: `daInvestigationDrawer`
  - `W8-2`: `daDiffEngine`

### Phase 2: Resolve Blockers & Execute Dependent Tasks
- Execute schema provisioning for `DA_Analysis_Run__c` (`Status__c`, `Analysis_Timestamp__c`, `Metrics_JSON__c`, `DNA_Barcode__c`).
- Launch `W7-P1` (`DAGraphController.getAnalysisRuns`), then unblock `W7-3` (History View) and `W8-3` (Compare View).
- Resolve `dagre` packaging decision for `W9-1`, then launch `W9-2` (Simulation View) and `W9-3` (Handoff Export Modal).

### Phase 3: Centralized Shell Integration (Stage C)
- Exclusive to Integration Coordinator: Mount approved analytical views into `daAppShell`.
