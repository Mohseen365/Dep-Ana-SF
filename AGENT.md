# Context Retrieval Protocol & Navigation Map

`AGENT.md` is the primary task router for coding agents working in this repository.

## 1. Task-Based Context Retrieval Protocol

When assigned a task, follow this exact sequence to retrieve context:

```text
1. Identify Task Type (Bug, Feature, Refactoring, Regression, Historical Investigation)
       ↓
2. Consult AGENT.md Task Lookup Table below
       ↓
3. Read Minimum Sufficient Context File in `context/`
       ↓
4. Resolve Authority Hierarchy:
     Executable Code (`explorer/src/`, `scripts/`)
     > Tests (`explorer/src/test/`, `scripts/test-*.cjs`)
     > Schema/Types (`explorer/src/types/explorer.ts`)
     > Data/Fixtures (`explorer/public/projects/`)
     > Context Documentation (`context/`)
     > Historical Reports (`PHASE_*.md`, `audit-reports/`)
       ↓
5. Inspect Implementation Source Files
       ↓
6. Inspect Relevant Tests & Run Test Verification
       ↓
7. STOP Context Retrieval as soon as stopping conditions are met!
```

### Retrieval Stopping Conditions

STOP retrieving context when:
- The target implementation source file is identified;
- The enforcing contract/interface is understood;
- The verifying test suite is identified;
- Required dependencies are understood;
- No unresolved authority conflict remains.

---

## 2. Task-Oriented Context Lookup Table

| Task Category | First File to Read | Next Source File to Inspect | Verifying Test Suite |
| :--- | :--- | :--- | :--- |
| **Project Overview & Orientation** | `context/PROJECT-OVERVIEW.md` | `README.md` | `npm run test:cli` |
| **Workspace Architecture & Navigation** | `context/CURRENT-ARCHITECTURE.md` | `explorer/src/context/WorkspaceRouterContext.tsx` | `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx` |
| **Selection & Investigation Behavior** | `context/CURRENT-ARCHITECTURE.md` | `explorer/src/context/InvestigationContext.tsx` | `explorer/src/App.investigationWorkflow.test.tsx` |
| **Layout Engine & Pipeline (Stages 1–11)**| `context/CURRENT-IMPLEMENTATION.md` | `explorer/src/lib/layout/global-layout.ts` | `npm run test:cli` |
| **Orbit Radial Polar Layout** | `context/CURRENT-CONTRACTS.md` | `explorer/src/lib/orbit-layout.ts` | `explorer/src/lib/orbit-layout.test.ts` |
| **Web Worker Layout Offloading** | `context/CURRENT-CONTRACTS.md` | `explorer/src/lib/workers/layout.worker.ts` | `explorer/src/test/Phase3D_WebWorkerLayout.test.ts` |
| **Visualization Lenses & Adapters** | `context/CURRENT-IMPLEMENTATION.md` | `explorer/src/lib/adapters/` | Lens-specific Vitest unit tests |
| **CLI Analysis & Exporter Tools** | `context/CURRENT-IMPLEMENTATION.md` | `scripts/export-explorer.cjs` | `scripts/test-cli-integration.cjs` |
| **Safety Envelope & Change Gates** | `context/CURRENT-DECISIONS.md` | `safety-envelope.cjs` | `scripts/test-safety-envelope.cjs` |
| **Datasets & Manifests** | `context/CURRENT-DATA-AND-FIXTURES.md`| `project-manifest.json` | `scripts/test-cli-integration.cjs` |
| **Historical Rationale & Supersession** | `context/HISTORICAL-DECISIONS.md` | `context/SUPERSESSION-MAP.md` | N/A |

---

## 3. Real-Project Validation Assets

When validating graph or layout behavior against real Salesforce project structures, use datasets in:

- `explorer/public/projects/pbim/explorer-data.json` (Primary 528-node dataset)
- `explorer/public/projects/cst/explorer-data.json` (240-node dataset)
- `explorer/public/projects/bqc/explorer-data.json` (274-node dataset)

Always distinguish between unit test mocks, canonical fixtures, and real-project validation datasets.
