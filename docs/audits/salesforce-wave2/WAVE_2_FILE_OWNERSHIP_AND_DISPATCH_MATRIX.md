# Wave 2 File Ownership & Dispatch Matrix

## 1. Workstream Isolation Principles

To prevent file collision and agent overlap during parallel Wave 2 execution:
1. Each file in the repository has a single assigned Workstream Owner.
2. Agents working in Workstream A may only modify files assigned to Workstream A.
3. Agents working in Workstream C may only modify files assigned to Workstream C.
4. Wave 1 implementation code, including Cytoscape canvas core (`daGraphViewer`) and layout engine (`daLayoutEngine.js`), remains frozen and immutable.
5. `DAGraphController.cls` and `DAGraphIngestionService.cls` are frozen. New Wave 2 Apex methods must be placed in dedicated Wave 2 controllers (`DAUserPreferenceController.cls`, `DAAnnotationController.cls`).

---

## 2. File Ownership Assignments

| Target Path | Permitted Workstream | File Status | Purpose | Conflict Controls |
|---|---|---|---|---|
| `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/*` | **Workstream A** | New LWC | Main tab navigation & shell wrapper | Isolated in new directory |
| `scratch/salesforce-poc/force-app/main/default/lwc/daProjectSelector/*` | **Workstream A** | New LWC | Project dropdown selector | Isolated in new directory |
| `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls` | **Workstream C** | New Class | ViewState & position Apex service | Isolated in new controller |
| `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAAnnotationController.cls` | **Workstream C** | New Class | Entity annotation CRUD service | Isolated in new controller |
| `scratch/salesforce-poc/force-app/main/default/objects/DA_User_Preference__c/fields/*` | **Workstream C** | New Fields | Custom fields for preferences | Isolated in new fields directory |
| `scratch/salesforce-poc/force-app/main/default/objects/DA_Annotation__c/fields/*` | **Workstream C** | New Fields | Custom fields for annotations | Isolated in new fields directory |
| `scratch/salesforce-poc/force-app/main/default/classes/tests/DAUserPreferenceControllerTest.cls` | **Workstream G** | New Test | Unit tests for preferences Apex | Isolated test class |
| `scratch/salesforce-poc/force-app/main/default/classes/tests/DAAnnotationControllerTest.cls` | **Workstream G** | New Test | Unit tests for annotations Apex | Isolated test class |

---

## 3. Prohibited Edits Across Workstreams

- **Workstream A is PROHIBITED from editing:**
  - `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/*`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daGraphPayloadLoader/*`
  - Any Apex `.cls` file or Custom Object metadata file.
- **Workstream C is PROHIBITED from editing:**
  - `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls`
  - `scratch/salesforce-poc/force-app/main/default/classes/services/DAGraphIngestionService.cls`
  - Any LWC component directory (`daAppShell`, `daProjectSelector`, `daGraphViewer`).

---

## 4. Sequential Dispatch Recommendations

Although Workstream A and Workstream C own completely non-overlapping file sets, sequential dispatch is recommended as follows:
1. **Dispatch Tranche 2A (Workstream A):** Implement `daProjectSelector` and `daAppShell` LWCs.
2. **Dispatch Tranche 2B (Workstream C):** Implement `DA_User_Preference__c` fields, `DA_Annotation__c` fields, `DAUserPreferenceController.cls`, and `DAAnnotationController.cls`.
3. **Dispatch Tranche 2C (Workstream G):** Implement Apex unit tests and verify offline suite.
