# Architecture Design: Analysis History Panel (`daAnalysisHistory`)

**Date:** 9 November 2026
**Feature:** Analysis Run History & Timeline (`AnalysisHistoryPanel.tsx`)
**Target Salesforce LWC:** `scratch/salesforce-poc/force-app/main/default/lwc/daAnalysisHistory`
**Target Apex Controller:** `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAAnalysisHistoryController.cls`
**Target Apex Service:** `scratch/salesforce-poc/force-app/main/default/classes/services/DAAnalysisHistoryService.cls`
**Target DTO:** `scratch/salesforce-poc/force-app/main/default/classes/dto/DAAnalysisRunDTO.cls`

---

## 1. React Architecture Analysis
In `explorer/src/components/AnalysisHistoryPanel.tsx` (360 lines), the component:
- Subscribes to `ProjectContext` to retrieve the current active project and manifest history list.
- Displays a chronological list of historical runs with commit SHAs, git commit messages, analysis timestamps, node/edge counts, and cyclic SCC counts.
- Highlights the currently active run vs historical runs.
- Computes delta metrics between consecutive runs (+/- nodes, +/- edges, +/- cycles).
- Allows user to click "Load Run" (swapping the active run) or select two runs for comparison dispatching to `ComparePanel`.

---

## 2. LWC Architecture
- **Component:** `daAnalysisHistory`
- **Component Hierarchy:**
  - `daAppShell` (Parent)
    - `daAnalysisHistory` (Child View)
      - `lightning-card` (Container)
      - `lightning-datatable` or custom SLDS timeline list (`slds-timeline`)
      - Delta badge indicators (`slds-badge`)
      - Actions bar: "Switch to Run", "Compare with Active"
- **Properties (`@api`):**
  - `@api projectId`: Active Project Salesforce record ID (read-only to child).
  - `@api activeRunId`: Currently visualized run ID.
- **State Properties:**
  - `runs`: Array of `DAAnalysisRunDTO` records.
  - `selectedRunIds`: Set of run IDs selected for comparison.
  - `isLoading`: Boolean spinner control.
  - `error`: Error envelope details if query fails.
- **Outbound Events:**
  - `runselect`: Fired when user selects a different historical run. Detail: `{ runId: string, commitHash: string }`.
  - `comparelaunch`: Fired when user requests comparison between two runs. Detail: `{ baseRunId: string, targetRunId: string }`.

---

## 3. Apex Architecture & Service Boundaries
- **Controller (`DAAnalysisHistoryController.cls`):**
  - Thin `@AuraEnabled` facade with `with sharing`.
  - Method: `getAnalysisRuns(Id projectId, Integer queryLimit, Integer queryOffset)`
  - Enforces `WITH USER_MODE`.
  - Delegates business logic to `DAAnalysisHistoryService`.
- **Service (`DAAnalysisHistoryService.cls`):**
  - Queries `DA_Analysis_Run__c` records:
    ```sql
    SELECT Id, Name, Project__c, Commit_Hash__c, Run_Timestamp__c, Status__c,
           Node_Count__c, Edge_Count__c, Cyclic_SCC_Count__c, Total_Chunks__c, Total_Payload_Size_Chars__c, CreatedDate
    FROM DA_Analysis_Run__c
    WHERE Project__c = :projectId
    WITH USER_MODE
    ORDER BY Run_Timestamp__c DESC, Id DESC
    LIMIT :boundedLimit OFFSET :boundedOffset
    ```
  - Maps records to `DAAnalysisRunDTO` list.
  - Computes deltas between consecutive runs (`nodeDelta`, `edgeDelta`, `cyclicSccDelta`).

---

## 4. Object Model Implications
- Utilizes `DA_Project__c` and child `DA_Analysis_Run__c`.
- Requires indexed compound sorting on `(Project__c, Run_Timestamp__c, Id)`.
- FLS validation on all metric fields.

---

## 5. Security Model
- Controller declared `with sharing`.
- SOQL uses `WITH USER_MODE` to ensure user permissions and FLS are respected.
- Throws AuraHandledException with safe client-facing message upon query failure.

---

## 6. Navigation Model
- Selection of a run does not alter current URL route unless explicitly confirmed.
- Firing `runselect` updates `activeRunId` in `daAppShell`, triggering chunk reloading.

---

## 7. Jest & Apex Testing Approach
- **Jest (`daAnalysisHistory.test.js` / runner):**
  - Verify rendering of run list and metric deltas.
  - Test `runselect` event dispatch on click.
  - Test pagination and loading states.
- **Apex (`DAAnalysisHistoryControllerTest.cls`):**
  - Bulk query testing with 50 runs.
  - Security testing with restricted user profile.

---

## 8. Deployment Approach
- Deployed under `scratch/salesforce-poc/force-app/main/default/`.
- Included in permissionset `DA_Architecture_Analyst`.
