# Salesforce Migration — Coordinator Architecture Decision Register

**Status:** Wave 0 Baseline Draft
**Owner:** Jules (Coordinator Agent)
**Last Updated:** October 2026

---

## Decision Register Overview

This register tracks the 10 fundamental architectural, security, storage, and performance questions required to govern the parallel migration of the React/Node Dependency Analyzer into a Salesforce-native application.

---

### Question 1: What Salesforce org, edition, API version, and deployment target will be used?
* **Current Evidence:**
  - Salesforce CLI `@salesforce/cli/2.155.7` is installed locally.
  - No default DevHub or target org is currently authenticated (`sf org list` returned `No Orgs found`).
* **What Remains Unknown:**
  - Target org edition (Developer Edition, Enterprise, Unlimited, Scratch Org, or Sandbox).
  - Target Salesforce API version (e.g. v61.0 / v62.0 / v63.0).
* **Decision Owner:** Coordinator / Project Architect
* **Required Evidence:** Scratch org configuration (`config/project-scratch-def.json`) or authorized org alias from `sf org list`.
* **Downstream Work Blocked:** Automated deployment scripts, Apex compilation against specific API versions, packaging.

---

### Question 2: Is a sandbox, scratch org, or other authorized development org available?
* **Current Evidence:**
  - Local environment has no active SFDX authentication tokens or connected target orgs.
  - CLI operations requiring org communication (`sf project deploy`, `sf org display`) cannot execute in the current sandbox without auth.
* **What Remains Unknown:**
  - Whether a DevHub is available for scratch org creation or if a persistent Developer Sandbox will be provided.
* **Decision Owner:** Coordinator / User
* **Required Evidence:** `sf org login web` or `sf org login sfdx-url` execution result.
* **Downstream Work Blocked:** Real org deployment testing, live LWC / Apex integration proof of concept in Lane B.

---

### Question 3: Will source code be uploaded and analyzed from Salesforce metadata, analyzed locally, or both?
* **Current Evidence:**
  - Existing Node.js analysis engine (`analyze/`, `scripts/export-explorer.cjs`) operates on local Apex (`.cls`), LWC (`.js`/`.html`), Trigger (`.trigger`), and Custom Object (`.object-meta.xml`) files.
  - Generates deterministic JSON artifacts (`explorer-data.json`).
* **What Remains Unknown:**
  - Whether the target Salesforce application will pull metadata directly via Tooling API / Metadata API inside Apex, or consume uploaded/exported `explorer-data.json` analysis snapshots.
* **Decision Owner:** Coordinator & Lane B (Salesforce Feasibility)
* **Required Evidence:** Tooling API governor limit assessment and Apex metadata parsing feasibility report.
* **Downstream Work Blocked:** Apex service class design, custom object ingestion pipelines.

---

### Question 4: Which computations can run in browser-side JavaScript, which belong in Apex, and which require a separately approved alternative?
* **Current Evidence:**
  - Graph layout algorithms (Hierarchical Dagre/COSE, Hybrid Candidate E, Orbit radial polar, Constellation multi-cluster) are 100% JavaScript-based in `explorer/src/lib/layout/`.
  - Heavy layout computations offload to Web Workers (`layout.worker.ts`).
  - Analysis parsing runs in Node.js scripts (`scripts/export-explorer.cjs`).
* **What Remains Unknown:**
  - Apex governor limits (heap size 6MB/12MB, CPU limit 10,000ms) prevent running O(N^2) or O(N^3) graph layout algorithms for 500+ nodes in Apex.
  - Browser JS in LWC can handle graph layout, but Web Workers have specific LWS (Lightning Web Security) restrictions in Salesforce.
* **Decision Owner:** Coordinator & Lane B
* **Required Evidence:** LWS Web Worker compatibility tests and LWC Cytoscape layout performance benchmarks on 528-node PBIM dataset.
* **Downstream Work Blocked:** Architecture split between LWC client-side engine vs Apex backend query services.

---

### Question 5: Can Cytoscape.js and its required extensions (fcose, navigator) operate within the target Salesforce security model (LWS / CSP)?
* **Current Evidence:**
  - React application uses Cytoscape v3.30.2, `cytoscape-fcose` v2.2.0, and `cytoscape-navigator` v2.0.2.
  - Cytoscape relies on DOM canvas rendering and dynamic inline styles.
* **What Remains Unknown:**
  - Lightning Web Security (LWS) allows canvas manipulation, but strict Content Security Policy (CSP) or LWS secure document wrappers may affect Cytoscape layout worker threads or canvas event listeners.
* **Decision Owner:** Lane B (Salesforce Feasibility)
* **Required Evidence:** LWC prototype component wrapping Cytoscape.js inside LWS sandbox with canvas rendering and event listeners.
* **Downstream Work Blocked:** Choice of UI rendering library (Cytoscape.js static resource vs SVG vs native LWC canvas).

---

### Question 6: What are the expected maximum node counts, edge counts, source directory sizes, and concurrent users?
* **Current Evidence:**
  - Canonical validation datasets in repository:
    - PBIM dataset: 528 nodes, ~1,200 edges (`explorer/public/pbim/explorer-data.json`).
    - BQC dataset: 274 nodes (`explorer/public/projects/bqc/explorer-data.json`).
    - CST dataset: 240 nodes (`explorer/public/projects/cst/explorer-data.json`).
* **What Remains Unknown:**
  - Upper bound requirements for enterprise orgs (e.g., 5,000+ nodes, 20,000+ edges).
* **Decision Owner:** Coordinator / Product Sponsor
* **Required Evidence:** Target dataset scale definition from product specification.
* **Downstream Work Blocked:** Apex query pagination, SOQL chunking, Custom Object record storage limits.

---

### Question 7: What persistent storage model best supports queryability, history, and graph performance in Salesforce?
* **Current Evidence:**
  - Current React application uses JSON schema (`ExplorerDataSchema`) and stores project UI state in `localStorage` (`ProjectUIState`).
  - Analysis output is a hierarchical JSON payload.
* **What Remains Unknown:**
  - Normalized Custom Objects (`Dependency_Node__c`, `Dependency_Edge__c`, `Analysis_Run__c`) enable standard SOQL queries, reporting, and FLS/CRUD security, but require thousands of records per snapshot.
  - Serialized JSON stored in Big Objects / ContentVersion / Text Area (Long) enables fast payload loading, but lacks native SOQL filtering across nodes.
* **Decision Owner:** Lane C (Data Model & Contracts) & Coordinator
* **Required Evidence:** `SALESFORCE_DATA_MODEL_AND_CONTRACTS.md` proposal evaluating normalized vs serialized record storage and storage limits.
* **Downstream Work Blocked:** Custom object creation, SOQL queries, data migration scripts.

---

### Question 8: Which records and saved views are private versus shared?
* **Current Evidence:**
  - Current state stores positions and filters per-user in browser `localStorage`.
  - Multi-project manifest supports project isolation.
* **What Remains Unknown:**
  - In Salesforce, whether analysis runs, saved layout positions, and custom node groupings are shared organization-wide (`Public Read Only`) or restricted per-user (`Private`).
* **Decision Owner:** Lane C & Coordinator
* **Required Evidence:** Sharing model requirement matrix (Org-Wide Defaults, Sharing Rules, FLS).
* **Downstream Work Blocked:** Custom Object sharing settings, Apex `with sharing` enforceability.

---

### Question 9: Which functional features are mandatory for the first release (MVP vs Post-MVP)?
* **Current Evidence:**
  - Inventory identifies 18 view modes across 5 workspace domains, 4 architecture layout modes, position persistence, refactoring simulation, deep links, and detached drawers.
* **What Remains Unknown:**
  - MVP scope for Wave 1/Wave 2 LWC migration (e.g. core topological graph + findings vs all 18 view modes).
* **Decision Owner:** Lane A (Feature Inventory) & Coordinator
* **Required Evidence:** `SALESFORCE_MIGRATION_FEATURE_PARITY_MATRIX.md` with priority classification (P0 Mandatory, P1 Core, P2 Advanced).
* **Downstream Work Blocked:** Wave 2 component implementation sequence.

---

### Question 10: What compatibility differences can be accepted in navigation, layout, browser behavior, and user interaction?
* **Current Evidence:**
  - Existing React app uses hash-based URL routing (`/#viewMode=...`), mouse wheel zoom/pan, keyboard shortcuts (`Escape`, `Cmd+K`), and detached popup windows via `window.open()`.
* **What Remains Unknown:**
  - LWC operates within Lightning Experience (LEX) navigation container (`lightning-navigation`). Hash routing and detached popups behave differently inside LEX tabs/utility bars.
* **Decision Owner:** Coordinator & Lane A
* **Required Evidence:** LEX container interaction design and navigation mapping.
* **Downstream Work Blocked:** UX navigation wiring in LWC.
