# Wave 4 (`FEAT-STATE-03`): Shared Acceptance and Regression Matrix

| Domain | Acceptance Requirement | Test Suite & Method | Success Threshold |
|---|---|---|---|
| **Storage & Persistence** | Multi-preset v2 JSON payload validation | `run-workstream-c-tests.cjs` / Apex Unit Test | Valid JSON <= 131,072 chars saved successfully |
| **Storage & Persistence** | Oversized payload rejection | `run-workstream-c-tests.cjs` | Payloads > 131,072 chars throw `AuraHandledException` |
| **Storage & Persistence** | Malformed JSON rejection | `run-workstream-c-tests.cjs` | Invalid JSON syntax throws `AuraHandledException` |
| **Storage & Persistence** | Legacy v1 auto-migration | `canonical-filter-contract.test.cjs` | Flat v1 JSON upgraded to v2 default preset |
| **Storage & Persistence** | Partial save preservation | `run-workstream-c-tests.cjs` | Null arguments preserve unrelated preference fields |
| **Storage & Persistence** | Project isolation | `run-workstream-c-tests.cjs` | User + Project composite key prevents cross-project leakage |
| **User Experience** | Filter bar search & filter evaluation | `run-workstream-a-tests.cjs` | Search term, risk level, node type, layer filters update LWC state |
| **User Experience** | Preset CRUD operations | `run-workstream-a-tests.cjs` | Create, activate, rename, delete presets updates active criteria |
| **User Experience** | Cross-view filter synchronization | `run-workstream-a-tests.cjs` | `filterchange` custom event dispatches payload to child views |
| **User Experience** | Graph filtering & node visibility | `run-poc-tests.cjs` | Invisible nodes hidden without breaking layout or positions |
| **User Experience** | Matrix grid functionality | `run-poc-tests.cjs` | Grid renders component interactions dynamically based on filters |
| **User Experience** | Findings table functionality | `run-poc-tests.cjs` | Datatable displays findings filtered by severity and status |
| **User Experience** | Missing coverage 4-state badges | `run-poc-tests.cjs` | `UNKNOWN` coverage renders distinct grey badge, NOTUntested |
| **Frozen Invariants** | Invariant 1: SELECTION ≠ NAVIGATION | `run-workstream-a-tests.cjs` & `run-poc-tests.cjs` | Node/cell selection updates panels without changing route |
| **Frozen Invariants** | Invariant 2: daGraphViewer @api recordId | `run-poc-tests.cjs` | RecordId setter observes project updates and triggers fetch |
| **Frozen Invariants** | Invariant 3: Positions_JSON__c preservation | `run-poc-tests.cjs` | Manual node drag coordinates preserved across filter toggle |
| **Frozen Invariants** | Invariant 4: Zoom_Pan_JSON__c preservation | `run-poc-tests.cjs` | Viewport zoom and pan state preserved |
| **Frozen Invariants** | Invariant 5: Stale request rejection | `run-workstream-a-tests.cjs` | Rapid project switching discards delayed async Apex responses |
| **Frozen Invariants** | Invariant 6: Cytoscape cleanup | `run-poc-tests.cjs` | Component unmount destroys Cytoscape instance and timers |
| **Quality & Regression** | Master offline regression suite pass rate | All 5 test runners | 224 / 224 tests pass (100% pass rate) |
