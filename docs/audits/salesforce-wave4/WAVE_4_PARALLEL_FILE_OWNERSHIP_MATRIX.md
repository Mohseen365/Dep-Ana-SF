# Wave 4 (`FEAT-STATE-03`): Parallel File Ownership Matrix

| File Path / Artifact | Lane A | Lane B | Lane C | Lane D | Lane E | Lane F | Integration Coordinator | Notes / Lock Policy |
|---|---|---|---|---|---|---|---|---|
| `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daFilterSchema.js` | **SOLE OWNER** | Read Only | Read Only | Read Only | Read Only | Read Only | Read Only | Contract-First Lock (Lane A publishes first) |
| `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls` | Read Only | **SOLE OWNER** | Read Only | Read Only | Read Only | Read Only | Read Only | Apex Controller Persistence |
| `scratch/salesforce-poc/force-app/main/default/classes/tests/DAUserPreferenceControllerTest.cls` | Read Only | **SOLE OWNER** | Read Only | Read Only | Read Only | Read Only | Read Only | Apex Unit Test Suite |
| `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.html` | Read Only | Read Only | **SOLE OWNER** | Read Only | Read Only | Read Only | Read Only | Shell Template & Filter Bar |
| `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js` | Read Only | Read Only | **SOLE OWNER** | Read Only | Read Only | Read Only | Read Only | Shell Controller & Preset Logic |
| `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.css` | Read Only | Read Only | **SOLE OWNER** | Read Only | Read Only | Read Only | Read Only | Shell Styling |
| `scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/` (NEW) | Read Only | Read Only | **SOLE OWNER** | Read Only | Read Only | Read Only | Read Only | Preset Modal / Dropdown LWC |
| `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js` | Read Only | Read Only | Read Only | **SOLE OWNER** | Read Only | Read Only | Read Only | Graph Filter Adapter |
| `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html` | Read Only | Read Only | Read Only | **SOLE OWNER** | Read Only | Read Only | Read Only | Graph View Template |
| `scratch/salesforce-poc/force-app/main/default/lwc/daMatrixViewer/` (NEW) | Read Only | Read Only | Read Only | Read Only | **SOLE OWNER** | Read Only | Read Only | Matrix View LWC |
| `scratch/salesforce-poc/force-app/main/default/lwc/daFindingsViewer/` (NEW) | Read Only | Read Only | Read Only | Read Only | Read Only | **SOLE OWNER** | Read Only | Findings View LWC |
| `scratch/salesforce-poc/tests/contracts/canonical-filter-contract.test.cjs` (NEW) | **SOLE OWNER** | Read Only | Read Only | Read Only | Read Only | Read Only | Read Only | Schema Contract Verification |
| `scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` | Read Only | Read Only | Read Only | Read Only | Read Only | Read Only | **SOLE OWNER** | Final Integration Runner |
| `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` | Read Only | **SOLE OWNER** | Read Only | Read Only | Read Only | Read Only | Read Only | Workstream C Apex Runner |
| `scratch/salesforce-poc/tests/run-poc-tests.cjs` | Read Only | Read Only | Read Only | Read Only | Read Only | Read Only | **SOLE OWNER** | Master POC Test Runner |

---

## Strict Parallelization Rules

1. **Zero Simultaneous Editing:** No two lanes may edit the same file concurrently.
2. **Contract Freeze:** `daFilterSchema.js` is published by Lane A during Step 1 and frozen. Lanes B through F consume it as read-only.
3. **Component Isolation:** Matrix (`daMatrixViewer`) and Findings (`daFindingsViewer`) are isolated new directory LWCs owned by Lanes E and F respectively.
4. **Integration Ownership:** Integration runners (`run-workstream-a-tests.cjs` and `run-poc-tests.cjs`) are updated solely by the Integration Coordinator during the final assembly stage.
