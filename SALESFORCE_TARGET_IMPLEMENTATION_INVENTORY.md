# Salesforce Target Implementation Inventory

This inventory documents all current Salesforce artifacts in `scratch/salesforce-poc/` alongside missing, scaffolded, and proposed Apex classes, Lightning Web Components (LWCs), Custom Objects, fields, permission sets, and static resources required for full feature parity.

## 1. Apex Classes (`force-app/main/default/classes/`)

| File / Entity Name | Status | Location | Responsibility / Function | missing / Proposed Additions |
|---|---|---|---|---|
| `DAGraphController.cls` | **MIGRATED AND VERIFIED** | `classes/controllers/` | Entry point `@AuraEnabled` methods for chunk loading and project metadata | Add methods for user preferences, findings retrieval, and snapshot comparisons |
| `DAGraphChunkService.cls` | **MIGRATED AND VERIFIED** | `classes/services/` | Paginated SOQL chunk retrieval and string reassembly | Add compressed chunk payload support |
| `DAGraphIngestionService.cls` | **MIGRATED AND VERIFIED** | `classes/services/` | Processing raw JSON payloads into custom object records | Add batch ingestion and versioned snapshot upserts |
| `GraphDataController.cls` | **MIGRATED AND VERIFIED** | `classes/` | Legacy controller wrapper | Deprecate or unify with `DAGraphController` |
| `DAGraphDTO.cls` | **MIGRATED AND VERIFIED** | `classes/dto/` | Data Transfer Objects for graph payloads and responses | Expand DTO fields for findings, metrics, and annotations |
| `DAErrorResponse.cls` | **MIGRATED AND VERIFIED** | `classes/dto/` | Structured Apex error response contract | Standardized exception response structure |
| `DAGraphControllerTest.cls` | **MIGRATED AND VERIFIED** | `classes/tests/` | Unit test suite for Apex controllers and services | Expand assertions for edge cases and limits |
| `DAGraphSecurityTest.cls` | **MIGRATED AND VERIFIED** | `classes/tests/` | Security unit test suite validating FLS/CRUD enforcement | Add test cases for sharing rules and custom permissions |
| `DAHealthService.cls` | `PROPOSED — NOT PRESENT` | `classes/services/` | Calculating architectural health scores and modularity | Proposed Apex service for health metrics |
| `DAFindingService.cls` | `PROPOSED — NOT PRESENT` | `classes/services/` | Managing architecture smells, findings, and risk scores | Proposed Apex service for findings CRUD |
| `DASnapshotDiffService.cls` | `PROPOSED — NOT PRESENT` | `classes/services/` | Delta calculation between two snapshot runs | Proposed Apex service for compare view |

## 2. Lightning Web Components (`force-app/main/default/lwc/`)

| Component Name | Status | Responsibility | Missing / Proposed Additions |
|---|---|---|---|
| `daGraphViewer` | **PARTIALLY MIGRATED** | Main LWC visualizer wrapping Cytoscape.js | Add toolbar controls, layout selector, deep link handler |
| `daGraphPayloadLoader` | **MIGRATED AND VERIFIED** | LWC JS helper fetching chunked graph data | Add caching and client-side chunk decompressor |
| `graphViewer` | **SCAFFOLDED ONLY** | Legacy prototype component | Retire in favor of `daGraphViewer` |
| `daDashboardViewer` | `PROPOSED — NOT PRESENT` | Project Dashboard LWC | Executive summary, KPI cards, health radar gauge |
| `daComparePanel` | `PROPOSED — NOT PRESENT` | Compare View LWC | Snapshot selector, node/edge diff grid, visual delta toggles |
| `daAnalysisHistoryPanel` | `PROPOSED — NOT PRESENT` | History Timeline LWC | Chronological run list, trend line charts, activate run action |
| `daSubwayPanel` | `PROPOSED — NOT PRESENT` | Subway Map View LWC | Layer station tracks, line route renderer, filter sidebar |
| `daConstellationPanel` | `PROPOSED — NOT PRESENT` | Constellation View LWC | Star cluster visualizer, cluster expansion toggle |
| `daTreemapPanel` | `PROPOSED — NOT PRESENT` | Treemap View LWC | Proportional squarified layout renderer |
| `daMatrixPanel` | `PROPOSED — NOT PRESENT` | Coupling Matrix LWC | Grid matrix rendering direct node coupling counts |
| `daRiverPanel` | `PROPOSED — NOT PRESENT` | Dependency River LWC | Sankey flow diagram representing layer dependencies |
| `daProfilePanel` | `PROPOSED — NOT PRESENT` | Component Profile LWC | Side inspector detailing fan-in/fan-out, metrics, tests |
| `daFindingsPanel` | `PROPOSED — NOT PRESENT` | Findings Grid LWC | Data table listing findings, smells, and risk severity |
| `daHotspotPanel` | `PROPOSED — NOT PRESENT` | Hotspots Panel LWC | Top 10% highest-risk component ranking list |
| `daDiagnosticsPanel` | `PROPOSED — NOT PRESENT` | Diagnostics Panel LWC | Circular dependency cycles and unresolved references table |

## 3. Custom Objects & Data Model (`force-app/main/default/objects/`)

| Custom Object Name | API Name | Status | Fields Installed / Proposed |
|---|---|---|---|
| Dependency Project | `DA_Project__c` | **MIGRATED AND VERIFIED** | `Project_Key__c`, `Name`, `Description__c`, `Repository_Url__c` |
| Analysis Run | `DA_Analysis_Run__c` | **MIGRATED AND VERIFIED** | `DA_Project__c`, `Run_Timestamp__c`, `Health_Score__c`, `Total_Nodes__c`, `Total_Edges__c` |
| Graph Chunk | `DA_Graph_Chunk__c` | **MIGRATED AND VERIFIED** | `DA_Analysis_Run__c`, `Chunk_Index__c`, `Payload_Data__c` |
| Architecture Finding | `DA_Finding__c` | **MIGRATED AND VERIFIED** | `DA_Analysis_Run__c`, `Severity__c`, `Category__c`, `Description__c`, `Node_Id__c` |
| User Preference | `DA_User_Preference__c` | **MIGRATED AND VERIFIED** | `User__c`, `DA_Project__c`, `Active_View__c`, `Selected_Node_Ids__c`, `Layout_Positions_JSON__c` |
| Annotation | `DA_Annotation__c` | **MIGRATED AND VERIFIED** | `DA_Project__c`, `Node_Id__c`, `Note__c`, `Author__c` |

## 4. Static Resources & Security Metadata

| Resource / Metadata | Location / API Name | Status | Rationale / Target |
|---|---|---|---|
| Cytoscape.js | `staticresources/cytoscape.js` | **MIGRATED AND VERIFIED** | Client-side graph library bundle (v3.23.0) |
| Dependency Analyzer Perm Set | `permissionsets/Dependency_Analyzer_User` | `PROPOSED — NOT PRESENT` | Read access to DA objects and Apex class access |
| Dependency Admin Perm Set | `permissionsets/Dependency_Analyzer_Admin` | `PROPOSED — NOT PRESENT` | Full CRUD/FLS access and ingestion API rights |
| Dependency Analyzer Tab | `tabs/Dependency_Analyzer.tab` | `PROPOSED — NOT PRESENT` | Custom Lightning App Tab hosting the LWC visualizer |
