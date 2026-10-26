# Dependency-Aware Salesforce Migration Implementation Roadmap

This roadmap defines the sequential, wave-based implementation plan for completing the migration of the Dependency Analyzer application into Salesforce. Each wave is ordered by architectural dependencies to avoid creating disconnected UI shells before underlying data contracts and layout engines exist.

```
+-----------------------------------------------------------------------------------+
| WAVE 1: Core Client Geometry & Expanded Apex Data Services                        |
| - Port spatial layout algorithms (orbit, constellation, subway) to LWC JS          |
| - Implement DAHealthService.cls and DAFindingService.cls in Apex                  |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| WAVE 2: Primary LWC View Panels (Dashboard, Compare, History, Profile)           |
| - Implement daDashboardViewer, daComparePanel, daAnalysisHistoryPanel              |
| - Connect Apex health & finding services to LWC views                            |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| WAVE 3: Advanced LWC Visualizations & Interactive Tools                           |
| - Implement daSubwayPanel, daConstellationPanel, daRiverPanel, daTreemapPanel      |
| - Build Refactoring Simulation & 4-Direction expansion LWC modules                |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| WAVE 4: State Management, URL Isolation & Security Governance                      |
| - Integrate lightning/navigation deep-linking & DA_User_Preference__c hydration  |
| - Implement Permission Sets, FLS security, and tab routing                        |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| WAVE 5: External Analysis Service & Automated Ingestion Pipeline                  |
| - Harden Node.js Analysis Service REST API boundary                               |
| - Automate end-to-end JSON chunk ingestion & CI push workflows                    |
+-----------------------------------------------------------------------------------+
```

---

## Wave 1: Core Client Geometry & Expanded Apex Data Services
- **Goal:** Establish foundational client-side layout algorithms and Apex backend services for health/findings.
- **Source Paths:** `explorer/src/lib/layout/*`, `scripts/architecture-health.cjs`
- **Proposed Target Paths:**
  - `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js`
  - `scratch/salesforce-poc/force-app/main/default/classes/services/DAHealthService.cls`
  - `scratch/salesforce-poc/force-app/main/default/classes/services/DAFindingService.cls`
- **Dependencies:** None.
- **Exit Gate:** 100% geometric position parity for orbit, constellation, and hierarchical layout tests between Vitest and LWC JS module. 100% passing Apex unit tests for `DAHealthServiceTest` and `DAFindingServiceTest`.

---

## Wave 2: Primary LWC View Panels
- **Goal:** Deliver executive dashboard, snapshot comparison, and run history in LWC.
- **Source Paths:** `ProjectDashboard.tsx`, `ComparePanel.tsx`, `AnalysisHistoryPanel.tsx`, `FeatureProfilePanel.tsx`
- **Proposed Target Paths:**
  - `scratch/salesforce-poc/force-app/main/default/lwc/daDashboardViewer/`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daComparePanel/`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daAnalysisHistoryPanel/`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daProfilePanel/`
- **Dependencies:** Wave 1 Apex services (`DAHealthService`, `DAFindingService`).
- **Exit Gate:** Visual rendering parity and passing offline fixture tests for Dashboard KPI cards, Snapshot Compare delta highlights, and History timeline selections.

---

## Wave 3: Advanced LWC Visualizations & Interactive Tools
- **Goal:** Deliver subway map, constellation, dependency river, treemap, matrix, and refactoring simulation in LWC.
- **Source Paths:** `SubwayPanel.tsx`, `DependencyConstellationPanel.tsx`, `DependencyRiverPanel.tsx`, `ArchitectureTreemapPanel.tsx`, `FeatureMatrixPanel.tsx`, `refactoring-simulation.ts`
- **Proposed Target Paths:**
  - `scratch/salesforce-poc/force-app/main/default/lwc/daSubwayPanel/`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daConstellationPanel/`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRiverPanel/`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daTreemapPanel/`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daMatrixPanel/`
- **Dependencies:** Wave 1 client layout engine (`daLayoutEngine`).
- **Exit Gate:** Passing layout rendering and interaction tests across all 5 advanced visualization components.

---

## Wave 4: State Management, Deep-Linking & Security Governance
- **Goal:** Enable URL state synchronization, per-user preferences, custom tabs, and permission sets.
- **Source Paths:** `explorer/src/lib/projectState.ts`, security requirements
- **Proposed Target Paths:**
  - `scratch/salesforce-poc/force-app/main/default/permissionsets/Dependency_Analyzer_User.permissionset-meta.xml`
  - `scratch/salesforce-poc/force-app/main/default/permissionsets/Dependency_Analyzer_Admin.permissionset-meta.xml`
  - `scratch/salesforce-poc/force-app/main/default/tabs/Dependency_Analyzer.tab-meta.xml`
  - Updates to `daGraphViewer` JS for Lightning state synchronization.
- **Dependencies:** Waves 2 and 3.
- **Exit Gate:** Verified page reload state hydration from `DA_User_Preference__c` and passing FLS/CRUD security unit tests (`DAGraphSecurityTest.cls`).

---

## Wave 5: External Analysis Service & Automated Ingestion Pipeline
- **Goal:** Secure Node.js CLI analysis engine and automate API ingestion into Salesforce.
- **Source Paths:** `scripts/dependency-analyzer.cjs`, ingestion contracts
- **Proposed Target Paths:**
  - `scripts/salesforce-ingestion-cli.cjs`
  - Apex Callout / REST Service handlers in Salesforce
- **Dependencies:** Wave 4.
- **Exit Gate:** Automated REST API push of a 100,000+ node graph snapshot from Node CLI into Salesforce `DA_Graph_Chunk__c` objects with 100% integrity verification.
