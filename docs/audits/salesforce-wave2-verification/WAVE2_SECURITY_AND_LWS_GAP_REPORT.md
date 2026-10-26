# Wave 2 Security & Lightning Web Security (LWS) Gap Report

**Date:** October 2026
**Auditor:** Independent Security & LWC Auditor
**Scope:** Apex Authorization Model, Custom Object Sharing, LWC DOM & LWS Boundaries

---

## 1. Source-Level Security Audit

### 1.1 Object & Record Sharing Model
- `DA_Project__c`: `sharingModel = ReadWrite`
- `DA_Analysis_Run__c`: `sharingModel = ControlledByParent` (MasterDetail -> `DA_Project__c`)
- `DA_Graph_Chunk__c`: `sharingModel = ControlledByParent` (MasterDetail -> `DA_Analysis_Run__c`)
- `DA_Annotation__c`: `sharingModel = ControlledByParent` (MasterDetail -> `DA_Analysis_Run__c`)
- `DA_User_Preference__c`: `sharingModel = Private`
- `DA_Finding__c`: `sharingModel = ReadWrite`

### 1.2 User Mode Enforcements (`WITH USER_MODE` / `as user`)
- **Queries (`DAGraphController.cls`):**
  - `getProjects()` uses `WITH USER_MODE`. Enforces object and field level permissions on query execution.
  - `getLatestGraphForProject()` queries `DA_Analysis_Run__c` and `DA_Graph_Chunk__c` using `WITH USER_MODE`.
- **DML Operations (`DAGraphIngestionService.cls`):**
  - `insert as user proj;`
  - `insert as user run;`
  - `insert as user records;`
  - All DML operations enforce CRUD and FLS of the context user.

### 1.3 Tenant Isolation Boundary
- `DAGraphController.getLatestGraphForProject` filters analysis runs specifically by `DA_Project__c = :projectId OR DA_Project__r.Project_Key__c = :projectId`.
- Cross-project graph retrieval is strictly prevented at the query level.

---

## 2. Security Test Suite Analysis (`DAGraphSecurityTest.cls`)

- **Authored Tests:** `DAGraphSecurityTest.cls` includes project isolation assertions comparing retrieved DTO IDs across multi-project setups.
- **Coverage Gap:** `DAGraphSecurityTest` uses standard single-user execution without explicitly invoking `System.runAs(otherUser)` to test restricted-user profiles or non-system administrator access.
- **Org Dependent Validation Required:** Live org execution under `System.runAs(restrictedUser)` is required to verify that standard users without Read access to `DA_Project__c` cannot read graph chunks via `DAGraphController`.

---

## 3. LWC & Lightning Web Security (LWS) Compliance

### 3.1 DOM Modification Boundary
- Both `daGraphViewer` and `graphViewer` components use `lwc:dom="manual"` on the graph container element:
  ```html
  <div class="cy-container" lwc:dom="manual"></div>
  ```
- This satisfies Lightning Web Components DOM guidelines, allowing third-party libraries (Cytoscape.js) to append canvas/SVG elements within the manual DOM subtree.

### 3.2 Static Resource Isolation
- `daGraphViewer` uses `lightning/platformResourceLoader`:
  ```javascript
  import { loadScript } from 'lightning/platformResourceLoader';
  import cytoscapeUrl from '@salesforce/resourceUrl/cytoscape';
  ```
- Cytoscape static resource `cytoscape.js` is bundled without external script inclusions or unauthorized `eval()` calls.

### 3.3 Lifecycle & Memory Management
- `daGraphViewer.js` includes `disconnectedCallback()` to destroy the Cytoscape instance (`cyInstance.destroy()`), preventing detached DOM nodes and memory retention upon tab navigation or component unmounting.

---

## 4. Required Org-Dependent Validation Checklist for Wave 3

1. **System.runAs Security Execution:** Run `DAGraphSecurityTest` in a scratch org under Minimum Access and Standard User profiles.
2. **FLS Read Restriction Test:** Revoke read permission on `Payload_Data__c` and confirm `WITH USER_MODE` query throws an aura exception gracefully.
3. **LWS Cytoscape Sandbox Test:** Verify that Cytoscape graph rendering and pan/zoom interactions function smoothly inside a real Salesforce Lightning App Page with Lightning Web Security enabled.
