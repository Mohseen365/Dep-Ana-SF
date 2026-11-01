# Report 7: Salesforce Architectural and Integration Gap Report

**Audit Date:** November 2026
**Auditor:** Jules (Principal Migration & System Auditor)
**Execution Mode:** Read-Only Audit

---

## 1. Architectural Boundary Enforcement

The approved three-tier architecture partitions responsibilities as follows:

```
[Node.js Analysis Engine (CLI / scripts/)]
      │
      │ 1. Scans filesystem, parses AST, extracts dependencies
      │ 2. Generates canonical JSON graph schema
      ▼
[Salesforce / Apex (force-app/.../classes/ & objects/)]
      │
      │ 3. Ingestion Service chunks payload into DA_Graph_Chunk__c records
      │ 4. DAUserPreferenceController enforces 131,072 char limit & project scoping
      │ 5. DAAnnotationController stores user notes on DA_Annotation__c
      ▼
[Salesforce LWC (force-app/.../lwc/)]
      │
      │ 6. daAppShell coordinates state, project switching, view tabs
      │ 7. daPresetManager manages canonical V2 filter presets
      │ 8. Child views render visualizations (GraphViewer, MatrixView, FindingsView)
```

### Boundary Compliance Verification
- **AST Parsing & Filesystem Scanning:** Correctly kept external within `scripts/`. No attempt has been made to port Node.js `fs` or Babel/TypeScript parsers into Apex.
- **Apex Persistence:** Strictly limits responsibilities to chunk reassembly, query selectors, user preferences, and annotations with user-mode security (`WITH USER_MODE`).
- **LWC View Models:** Rendering and filtering are kept client-side.

---

## 2. Integration Gaps Across System Boundaries

### Gap 1: Disconnected Layout Engine Algorithms
- `daLayoutEngine.js` exports `computeOrbitLayout`, `computeConstellationLayout`, and `computeSankeyLayout`.
- `daAppShell.js` has a layout change handler (`handleLayoutSelect`), but its template (`daAppShell.html`) contains no layout dropdown or radio controls.
- `daGraphViewer.js` hardcodes a call to `computeArchitectureLayout` only.
- **Result:** Users cannot switch graph layouts; 3 ported algorithms remain completely inaccessible.

### Gap 2: Headless Findings Derivation vs. AST Rule Engine
- The original application uses an extensible AST rule engine (`src/lib/intelligence/rules/`) that inspects class modifiers, triggers, callouts, and CRUD checks.
- The Salesforce implementation (`daFindingsView.js`) derives findings directly in the browser from the raw JSON payload (`cycles[]`, `coupling > 15`, `coverageStatus`).
- While this is lightweight, it lacks fine-grained rule explanations, severity configuration, and suggested refactorings.

### Gap 3: Missing Ingestion Automation Pipeline
- Node.js scripts can generate canonical JSON (`scripts/export-explorer.cjs`), and Apex has `DAGraphIngestionService.cls` to ingest chunks into Salesforce records.
- However, there is no integrated CLI plugin or automated bridge connecting the Node.js script output directly into Apex REST endpoints. Ingestion currently requires manual Apex test execution or custom script invocation.

### Gap 4: Shell View Registration Bottleneck
- `daAppShell.js` defines `const APPROVED_VIEWS = ['graph', 'matrix', 'findings'];`.
- All tab-switching logic, template `if:true` directives, and CSS classes are hardcoded for these 3 views.
- Introducing any of the remaining 15 views requires expanding `APPROVED_VIEWS`, updating the shell tab bar, and wiring the view's data inputs.
