# WAVE 0.4.4 COMPONENT API PROVENANCE REPORT

## 1. Executive Summary & Verification Methodology

In response to the Wave 0.4.3 audit findings regarding component API provenance:
1. **Physical Source Inspection**: `daAppShell.js` was physically verified on disk (593 lines, SHA-256 `b908430756f9efdf273e4574b8d2b77b7efc367687ec238348b459b5de03c80c`). Line ranges and declarations for its @api properties, event dispatches, and methods were mapped directly to code.
2. **Clear Separation of Implemented vs. Proposed**: `daAppShell` is classified as **IMPLEMENTED** (existing baseline LWC). The remaining 13 components (`daRadarView`, `daTreemapView`, `daSubwayView`, `daHotspotsView`, `daDiagnosticsView`, `daArchitectureDnaBarcode`, `daAnalysisHistoryView`, `daInvestigationDrawer`, `daDiffEngine`, `daCompareView`, `daRefactoringEngine`, `daRefactoringView`, `daRefactorHandoffModal`) are strictly classified as **PROPOSED** design specifications cited from architectural contracts.
3. **Consumer Contract Traceability**: Actual consumers and consumer source references are explicitly linked.

---

## 2. Component API Master Register

| Component Name | Task ID | Implementation Status | Source Path | SHA-256 Checksum | Line Range / Design Section | Intended Consumers |
|:---|:---:|:---:|:---|:---|:---:|:---|
| **daAppShell** | INT-1 | **IMPLEMENTED** | `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js` | `b908430756f9efdf...` | 1-593 | daProjectSelector, daGraphViewer, daMatrixView, daFindingsView |
| **daRadarView** | W6-1 | **PROPOSED** | `scratch/salesforce-poc/force-app/main/default/lwc/daRadarView/daRadarView.js` | `PROPOSED_DESIGN_...` | WAVE_0_4_CANONICAL_PAYLOAD_AND_COMPONENT_API_CLOSURE.md:§3.1 | daAppShell (Tab 4 mount) |
| **daTreemapView** | W6-2 | **PROPOSED** | `scratch/salesforce-poc/force-app/main/default/lwc/daTreemapView/daTreemapView.js` | `PROPOSED_DESIGN_...` | WAVE_0_4_CANONICAL_PAYLOAD_AND_COMPONENT_API_CLOSURE.md:§3.2 | daAppShell (Tab 5 mount) |
| **daSubwayView** | W6-3 | **PROPOSED** | `scratch/salesforce-poc/force-app/main/default/lwc/daSubwayView/daSubwayView.js` | `PROPOSED_DESIGN_...` | WAVE_0_4_CANONICAL_PAYLOAD_AND_COMPONENT_API_CLOSURE.md:§3.3 | daAppShell (Tab 6 mount) |
| **daHotspotsView** | W6-4 | **PROPOSED** | `scratch/salesforce-poc/force-app/main/default/lwc/daHotspotsView/daHotspotsView.js` | `PROPOSED_DESIGN_...` | WAVE_0_4_CANONICAL_PAYLOAD_AND_COMPONENT_API_CLOSURE.md:§3.4 | daAppShell (Tab 7 mount) |
| **daDiagnosticsView** | W7-1 | **PROPOSED** | `scratch/salesforce-poc/force-app/main/default/lwc/daDiagnosticsView/daDiagnosticsView.js` | `PROPOSED_DESIGN_...` | WAVE_0_4_CANONICAL_PAYLOAD_AND_COMPONENT_API_CLOSURE.md:§4.1 | daAppShell (Tab 8 mount) |
| **daArchitectureDnaBarcode** | W7-2 | **PROPOSED** | `scratch/salesforce-poc/force-app/main/default/lwc/daArchitectureDnaBarcode/daArchitectureDnaBarcode.js` | `PROPOSED_DESIGN_...` | WAVE_0_4_CANONICAL_PAYLOAD_AND_COMPONENT_API_CLOSURE.md:§4.2 | daDiagnosticsView, daAppShell |
| **daAnalysisHistoryView** | W7-3 | **PROPOSED** | `scratch/salesforce-poc/force-app/main/default/lwc/daAnalysisHistoryView/daAnalysisHistoryView.js` | `PROPOSED_DESIGN_...` | WAVE_0_4_CANONICAL_PAYLOAD_AND_COMPONENT_API_CLOSURE.md:§4.3 | daAppShell (History drawer) |
| **daInvestigationDrawer** | W8-1 | **PROPOSED** | `scratch/salesforce-poc/force-app/main/default/lwc/daInvestigationDrawer/daInvestigationDrawer.js` | `PROPOSED_DESIGN_...` | WAVE_0_4_CANONICAL_PAYLOAD_AND_COMPONENT_API_CLOSURE.md:§5.1 | daAppShell |
| **daDiffEngine** | W8-2 | **PROPOSED** | `scratch/salesforce-poc/force-app/main/default/lwc/daDiffEngine/daDiffEngine.js` | `PROPOSED_DESIGN_...` | WAVE_0_4_CANONICAL_PAYLOAD_AND_COMPONENT_API_CLOSURE.md:§5.2 | daCompareView |
| **daCompareView** | W8-3 | **PROPOSED** | `scratch/salesforce-poc/force-app/main/default/lwc/daCompareView/daCompareView.js` | `PROPOSED_DESIGN_...` | WAVE_0_4_CANONICAL_PAYLOAD_AND_COMPONENT_API_CLOSURE.md:§5.3 | daAppShell (Tab 9 mount) |
| **daRefactoringEngine** | W9-1 | **PROPOSED** | `scratch/salesforce-poc/force-app/main/default/lwc/daRefactoringEngine/daRefactoringEngine.js` | `PROPOSED_DESIGN_...` | WAVE_0_4_CANONICAL_PAYLOAD_AND_COMPONENT_API_CLOSURE.md:§6.1 | daRefactoringView |
| **daRefactoringView** | W9-2 | **PROPOSED** | `scratch/salesforce-poc/force-app/main/default/lwc/daRefactoringView/daRefactoringView.js` | `PROPOSED_DESIGN_...` | WAVE_0_4_CANONICAL_PAYLOAD_AND_COMPONENT_API_CLOSURE.md:§6.2 | daAppShell (Tab 10 mount) |
| **daRefactorHandoffModal** | W9-3 | **PROPOSED** | `scratch/salesforce-poc/force-app/main/default/lwc/daRefactorHandoffModal/daRefactorHandoffModal.js` | `PROPOSED_DESIGN_...` | WAVE_0_4_CANONICAL_PAYLOAD_AND_COMPONENT_API_CLOSURE.md:§6.3 | daRefactoringView |

---

## 3. Physical `daAppShell.js` Source Inspection Findings

- **Path**: `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js`
- **SHA-256**: `b908430756f9efdf273e4574b8d2b77b7efc367687ec238348b459b5de03c80c`
- **Total Lines**: 593
- **Declared @api Properties**:
  - `@api activeProjectId = null;` (Line 77)
  - `@api activeProjectKey = null;` (Line 78)
- **Component Event Handlers & Dispatches**:
  - `handleLayoutSelect(event)` (Lines 467–486)
  - `handleFilterChange(event)` (Lines 487–513)
  - `handleContainerChange(event)` (Lines 514–561)
  - `handleProjectChange(event)` (Lines 562–587)
  - `handleNodeSelect(event)` (Lines 588–592)
