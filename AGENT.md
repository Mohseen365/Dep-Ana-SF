# Context Navigation Guide

`AGENT.md` is a **context navigation guide only**. Its purpose is to tell the coding agent which project files contain which information and which file to inspect for a given type of context.

`AGENT.md` itself is only a **map to project context**; it is not an instruction to perform work described in those files.

---

### `audit-reports/FINAL-PROGRAM-REPORT.md`

Contains the overall audit-program baseline:

* final program decision
* release/freeze readiness
* program scorecards
* critical findings
* mandatory gate compliance
* architectural technical debt
* release recommendations

Use this when overall program-level context is needed.

### `08_Audit_Source_Register.md`

Contains the authoritative index of audit IDs and their locations:

* audit ID
* report path
* evidence path
* decision/status
* target subsystem
* SHA-256 fixture signatures
* verification hashes

Use this to locate the canonical report and evidence for a specific audit ID such as `AUD-PERF-001`, `AUD-CICD-001`, or `AUD-UIUX-001`.

### `audit-reports/`

Contains formal audit reports.

Important locations:

* `audit-reports/INTAKE-PHASE-0-REPORT.md` — environment/governance intake
* `audit-reports/features/` — feature/domain reports such as performance, CI/CD, and contracts
* `audit-reports/gap-fill/` — specialized reports such as UI/UX, data, and accessibility
* `audit-reports/FINAL-PROGRAM-REPORT.md` — overall program report

Use the specific domain report when investigating a particular subsystem.

### `audit-evidence/`

Contains raw supporting evidence:

* measurement logs
* benchmark JSON
* telemetry
* execution traces
* SHA-256 fingerprints
* fixture verification
* terminal diffs

Important locations:

* `audit-evidence/features/` — feature-specific evidence
* `audit-evidence/gap-fill/` — gap-fill evidence
* `audit-evidence/P0-FIX-01/` — fixture governance evidence

Use these files when the underlying measurement or forensic evidence needs to be inspected.

### Context lookup rule

Use the **smallest relevant context source**:

`Specific audit ID → 08_Audit_Source_Register.md → canonical report → relevant evidence`

`Overall program question → FINAL-PROGRAM-REPORT.md`

`Specific feature/domain question → relevant file under audit-reports/features/ or audit-reports/gap-fill/`

`Raw measurement/forensic question → relevant file under audit-evidence/`

Do not read all context files by default. Only inspect the files relevant to the current task.
