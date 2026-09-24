# Context Navigation Guide

`AGENT.md` is a **context navigation guide only**. Its purpose is to tell the coding agent which project files contain which information and which file to inspect for a given type of context.

`AGENT.md` itself is only a **map to project context**; it is not an instruction to perform work described in those files.

---

### Context Retrieval Protocol

For all non-trivial engineering tasks, follow:

`CONTEXT-RETRIEVAL-PROTOCOL.md`

This document defines the repository's authoritative rules for:

- task-driven context routing,
- minimum-sufficient-context retrieval,
- authority and supersession resolution,
- current-state orientation,
- domain context selection,
- implementation verification,
- broad-search escalation,
- retrieval stopping conditions,
- and context synchronization.

Do not create a parallel retrieval protocol. `AGENT.md` remains the primary task router; `CONTEXT-RETRIEVAL-PROTOCOL.md` defines how routed context must be retrieved.

---

### Retrieval Flows & Source Relationships

```text
Audit ID → 08_Audit_Source_Register.md → Canonical audit report → Relevant evidence
Overall project/audit status → audit-reports/FINAL-PROGRAM-REPORT.md
Specific domain question → audit-reports/features/ or audit-reports/gap-fill/ → Relevant evidence
Raw measurement / forensic question → audit-evidence/
```

---

### Task-Oriented Context Lookup

| If you need to know...                          | Start here                                            | Then inspect...                                        |
| :---------------------------------------------- | :---------------------------------------------------- | :----------------------------------------------------- |
| Current-State Orientation & Project Handoff     | `CURRENT-STATE-BASELINE.md`                           | `08_Audit_Source_Register.md`                          |
| Salesforce Metadata & Contract Schema Alignment | `audit-reports/features/FEAT-CONTRACT-report-v2.md`   | `01_Foundations_Contracts.md` → `explorer-contract.ts` |
| Overall audit status & program decision         | `audit-reports/FINAL-PROGRAM-REPORT.md`               | Relevant feature or gap-fill report                    |
| Specific audit ID location or hash              | `08_Audit_Source_Register.md`                         | Canonical report → relevant evidence                   |
| Performance context & SLA                       | `audit-reports/features/FEAT-PERF-report.md`          | `audit-evidence/features/FEAT-PERF/`                   |
| CI/CD & Change Gate safety                      | `audit-reports/features/FEAT-CICD-report.md`          | `audit-evidence/features/FEAT-CICD/`                   |
| UI/UX, A11y & Gap-Fill context                  | `audit-reports/gap-fill/`                             | `audit-evidence/gap-fill/`                             |
| Contracts & Schema validation                   | `audit-reports/features/FEAT-CONTRACT-report-v2.md`   | `audit-evidence/features/FEAT-CONTRACT-v2/`            |
| Position Authority & Static Mode                | `audit-reports/features/FEAT-POSAUTH-report-v2.md`    | `audit-evidence/features/FEAT-POSAUTH-v2/`             |
| Multi-Project State Persistence                 | `audit-reports/features/FEAT-STATE-report-v2.md`      | `audit-evidence/features/FEAT-STATE-v2/`               |
| Refactoring Simulation Workflow                 | `audit-reports/features/FEAT-REFACTOR-report-v2.md`   | `audit-evidence/features/FEAT-REFACTOR-v2/`            |
| Feature Discovery & 2D Geometry                 | `audit-reports/features/FEAT-FEATURE-report-v2.md`    | `audit-evidence/features/FEAT-FEATURE-v2/`             |
| Visual Overlays & Explainability                | `audit-reports/features/FEAT-OVERLAY-report.md`       | `audit-evidence/features/FEAT-OVERLAY/`                |
| Backend CLI Analyzer Subsystem                  | `audit-reports/features/FEAT-ANALYZER-report.md`      | `audit-evidence/features/FEAT-ANALYZER/`               |
| Raw benchmark / telemetry data                  | `audit-evidence/`                                     | Relevant benchmark file in `features/` or `gap-fill/`  |
| Fixture SHA-256 verification                    | `08_Audit_Source_Register.md` or `P0-FIX-01` report   | `audit-evidence/P0-FIX-01/`                            |
| Environment & Governance Intake                 | `audit-reports/INTAKE-PHASE-0-REPORT.md`              | Relevant evidence                                      |
| Production Fixture Routing (Track A)            | `PHASE18B_TRACK_A_PROVENANCE_VERIFICATION_REPORT.md`  | `08_Audit_Source_Register.md` → Track A entry          |
| 40px Clearance Contract (Track B)               | `PHASE18E_CORRECTIVE_40PX_CONTRACT_IMPLEMENTATION.md` | `08_Audit_Source_Register.md` → Track B entry          |
| Locality Diagnostics (Track C)                  | `PHASE18F_LAYER_AWARE_LOCALITY_IMPLEMENTATION.md`     | `08_Audit_Source_Register.md` → Track C entry          |
| Phase 18 Final Integration Status               | `PHASE18G_FINAL_INTEGRATION_AND_REGRESSION_REPORT.md` | `08_Audit_Source_Register.md` → Phase 18G entry        |

---

### Context Map

#### `audit-reports/FINAL-PROGRAM-REPORT.md`

Contains the overall audit-program baseline:

- final program decision
- release/freeze readiness
- program scorecards
- critical findings
- mandatory gate compliance
- architectural technical debt
- release recommendations

Use this when overall program-level context is needed.

#### `08_Audit_Source_Register.md`

Contains the authoritative index of audit IDs and their locations:

- audit ID
- report path
- evidence path
- decision/status
- target subsystem
- SHA-256 fixture signatures
- verification hashes

Use this to locate the canonical report and evidence for a specific audit ID such as `AUD-PERF-001`, `AUD-CICD-001`, or `AUD-UIUX-001`.

#### `audit-reports/`

Contains formal audit reports.

Important locations:

- `audit-reports/INTAKE-PHASE-0-REPORT.md` — environment/governance intake
- `audit-reports/P0-FIX-01-fixture-governance.md` — fixture governance and cryptographic integrity
- `audit-reports/features/` — feature/domain reports such as performance, CI/CD, contracts, position authority, layout, state, refactoring, feature discovery, overlays, and analyzer
- `audit-reports/gap-fill/` — specialized reports such as UI/UX (`AUD-UIUX-001-report.md`), accessibility (`AUD-A11Y-001-report.md`), data (`AUD-DATA-001-report.md`), and dependencies (`AUD-DEPS-001-report.md`)
- `audit-reports/FINAL-PROGRAM-REPORT.md` — overall program report

Use the specific domain report when investigating a particular subsystem.

#### `audit-evidence/`

Contains raw supporting evidence:

- measurement logs
- benchmark JSON
- telemetry
- execution traces
- SHA-256 fingerprints
- fixture verification
- terminal diffs

Important locations:

- `audit-evidence/features/` — feature-specific raw evidence
- `audit-evidence/gap-fill/` — gap-fill raw evidence (`AUD-UIUX-001/`, `AUD-A11Y-001/`, `AUD-DATA-001/`, `AUD-DEPS-001/`)
- `audit-evidence/P0-FIX-01/` — fixture governance evidence (`C-01.txt` through `C-06.txt`)

Use these files when the underlying measurement or forensic evidence needs to be inspected.

---

### Practical Retrieval Rules

- **Smallest relevant context:** Use the smallest relevant context source rather than reading all files by default.
- **Audit ID lookup:** Use `08_Audit_Source_Register.md` to resolve audit IDs to canonical reports and evidence.
- **Hierarchical navigation:** Follow the `Report → Evidence` reference chain only when deeper forensic verification is required.
- **Specific vs. General:** Prefer specific domain reports under `audit-reports/features/` or `audit-reports/gap-fill/` over broad program-level reports when investigating a particular subsystem.
- **Raw Evidence Scope:** Inspect raw evidence in `audit-evidence/` strictly when underlying telemetry, benchmarks, or measurement logs are needed.
- **Content Verification:** Verify actual file structure and content rather than assuming filenames alone describe their contents.
- **Domain Isolation:** Avoid loading unrelated audit domains or reading files outside the scope of your active task.

## Real Salesforce Project Validation

When a task requires validating graph/layout behavior against real Salesforce project structures, use the project datasets under:

- `explorer/public/projects/`
- `analyze/projects/`

These are the repository's real-project validation inputs.

The canonical audit fixture remains authoritative for deterministic regression and acceptance testing, but it must not be treated as sufficient evidence for claims about behavior on real Salesforce projects.

When real-project validation is relevant:

1. Inspect the available projects in both locations.
2. Determine which datasets actually exercise the relevant graph/layout path.
3. Select representative projects based on their actual structure.
4. Validate the behavior against those projects without modifying the project datasets.
5. Clearly distinguish:
   - canonical-fixture behavior,
   - real-project behavior,
   - project-specific behavior,
   - and behavior that generalizes across projects.
6. Do not invent or assume project characteristics from filenames alone.

Any audit involving visual graph behavior, satellite placement, feature geometry, dense nodes, rendering, or project-specific graph structure should use these real-project datasets when the relevant code path can be exercised.
