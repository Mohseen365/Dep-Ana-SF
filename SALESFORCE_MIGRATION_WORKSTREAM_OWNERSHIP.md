# Salesforce Migration — Workstream Ownership & Conflict Prevention Matrix

**Wave:** Wave 0 / Wave 1 Preparation
**Author:** Jules (Coordinator Agent)
**Scope:** Repository-wide workstream boundaries and conflict prevention

---

## 1. Governance Principles

1. **Isolation First:** No workstream may modify files assigned to another workstream or touch shared contract definitions without explicit coordinator review.
2. **React Implementation Preservation:** The existing React application (`explorer/src/`, `explorer/public/`) and Node.js analysis scripts (`scripts/`, `analyze/`) must remain 100% operational and untouched by Salesforce feature work.
3. **Proposal First for Schema & Architecture:** Lane B and Lane C produce analysis and formal proposals (`.md` reports and isolated `.sfdx` scaffolds); they must NOT finalize production Salesforce metadata or schema in the main source tree without coordinator authorization.
4. **Single Primary Artifact Ownership:** Each lane owns exactly ONE primary report artifact in the root directory. No lane may modify another lane's primary report.

---

## 2. Lane Ownership Matrix

| Workstream Lane | Primary Deliverable Artifact | Read-Only Inspection Scope | Writable / Modification Scope | Prohibited Actions | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Lane A: Feature Parity & Baseline** | `SALESFORCE_MIGRATION_FEATURE_PARITY_MATRIX.md` & `SALESFORCE_MIGRATION_BASELINE_REPORT.md` | `explorer/src/`, `explorer/public/`, `scripts/`, `analyze/`, `docs/`, `package.json`, `explorer/package.json` | `SALESFORCE_MIGRATION_FEATURE_PARITY_MATRIX.md`, `SALESFORCE_MIGRATION_BASELINE_REPORT.md` | **NO** edits to application source code (`explorer/src/**`, `scripts/**`). **NO** dependency changes. | 100% functional parity matrix across 18 view modes and 4 layout modes with test references. |
| **Lane B: Salesforce Feasibility** | `SALESFORCE_NATIVE_FEASIBILITY_REPORT.md` | `explorer/src/lib/layout/`, `explorer/package.json`, `force-app/` (if scaffolded), Salesforce CLI configs | `SALESFORCE_NATIVE_FEASIBILITY_REPORT.md`, isolated test directory `scratch/salesforce-poc/` | **NO** edits to React code or core layout algorithms. **NO** production Salesforce deployment without org auth. | Feasibility analysis of Cytoscape in LWS, Apex governor limits, CSP restrictions, and LWC scaffold proof of concept. |
| **Lane C: Data Model & Contracts** | `SALESFORCE_DATA_MODEL_AND_CONTRACTS.md` | `explorer/src/types/explorer.ts`, `explorer/src/lib/projectState.ts`, `explorer/public/pbim/explorer-data.json`, `project-manifest.json` | `SALESFORCE_DATA_MODEL_AND_CONTRACTS.md` | **NO** creation of production Custom Objects or schema files in `force-app/` until approved. | Complete object relationship proposal, field mapping, storage analysis (normalized vs serialized), and CRUD/FLS matrix. |
| **Coordinator (Jules)** | `SALESFORCE_MIGRATION_WAVE0_COORDINATOR_REPORT.md`, `SALESFORCE_MIGRATION_WAVE1_DISPATCH_PACK.md`, `SALESFORCE_MIGRATION_DECISION_REGISTER.md`, `SALESFORCE_MIGRATION_WORKSTREAM_OWNERSHIP.md`, `SALESFORCE_MIGRATION_BASELINE_EVIDENCE.md` | Entire repository | Root migration governance documents, `package.json` (for SF CLI/Playwright tool installation if required) | **NO** premature launch of Wave 2 implementation before Wave 1 reports are reviewed together. | All 5 Wave 0 deliverables complete, verified, and evidence-backed. |

---

## 3. Safe Workspace Isolation Strategy

To prevent merge conflicts and concurrent file collisions during Wave 1 execution:

### Strategy Option A: Sequential Dispatch (Recommended for Single-Agent Sandboxes)
If execution takes place in a single linear sandbox session:
1. Dispatch **Lane A** to build feature parity and baseline reports.
2. Dispatch **Lane B** in an isolated subfolder (`scratch/salesforce-poc/`) to evaluate LWC/Apex feasibility.
3. Dispatch **Lane C** to evaluate contract and schema models against actual fixture payloads.
4. Coordinator synthesizes all 3 reports at the Wave 1 Integration Gate.

### Strategy Option B: Git Worktree / Dedicated Branch Isolation
If parallel agents are dispatched simultaneously in multi-agent environments:
- **Lane A Branch:** `feature/wave1-lane-a-baseline`
- **Lane B Branch:** `feature/wave1-lane-b-feasibility`
- **Lane C Branch:** `feature/wave1-lane-c-datamodel`

Each branch modifies ONLY its designated primary deliverable file. Merging into `main` occurs strictly through coordinator integration review.

---

## 4. Conflict Prevention & Shared Contract Rules

1. `explorer/src/types/explorer.ts` is the **Canonical React Data Contract**. It must NOT be modified during Wave 1.
2. If Lane C proposes changes or extensions to node/edge attributes for Salesforce representation, these must be documented as proposed DTO mappings in `SALESFORCE_DATA_MODEL_AND_CONTRACTS.md` rather than editing `explorer/src/types/explorer.ts`.
3. If Lane B requires testing LWC components, all experimental code MUST reside inside `scratch/salesforce-poc/` or a separate `force-app/` directory without overwriting existing Vite / React build configurations.
