# Current Data & Fixture Assets

## 1. Canonical Production Datasets

The repository maintains canonical datasets representing real-world Salesforce enterprise applications:

### Primary Production Dataset: PBIM (`pub-infra-mang` / `pbim`)
- **Location on disk:** `explorer/public/pbim/explorer-data.json` and `analyze/projects/pbim/explorer-data.json`.
- **Dataset Size:** 528 components / nodes, 2,063 dependencies / edges.
- **Subsystem Breakdown:**
  - 30 LWC Presentation Controllers
  - 13 Apex Triggers
  - 99 Application Services & Controllers
  - 95 Domain Logic Classes
  - 304 Schema Data Objects & Custom Fields
  - 63 Discovered Feature Groups
  - 65 Discovered Polar Sectors
- **Manifest Mapping:** Mapped in `project-manifest.json` under project ID `"pbim"`.

### Supporting Validation Datasets
- **Cloud Spend Tracker (`cst`):** 240 components, 1,024 dependencies (`explorer/public/projects/cst/`).
- **Business Quality Center (`bqc`):** 274 components, 603 dependencies (`explorer/public/projects/bqc/`).
- **Food App (`food-app`):** 1 component baseline dataset (`explorer/public/projects/food-app/`).

## 2. Project Manifest Contract (`project-manifest.json`)

`project-manifest.json` serves as the central registry of available projects for the Explorer frontend:

```json
{
  "projects": [
    {
      "id": "pbim",
      "name": "Public Infrastructure Management",
      "description": "Enterprise Salesforce infrastructure & asset management application",
      "analysisPath": "/pbim/explorer-data.json"
    },
    {
      "id": "cst",
      "name": "Cloud Spend Tracker",
      "description": "Financial cloud optimization system",
      "dataPath": "/projects/cst/explorer-data.json"
    }
  ],
  "defaultProject": "pbim"
}
```

## 3. Required Generated Artifacts (`dependency-report.md`, etc.)

The analyzer export engine (`scripts/export-explorer.cjs`) generates and updates required report artifacts per project:

- `dependency-report.json` — Raw JSON dependency graph export.
- `dependency-report.md` — Human-readable dependency analysis report.
- `dependency-summary.md` — High-level metrics summary report.
- `unresolved-references.md` — Report of missing or unresolved metadata references.
- `analysis-manifest.json` — Manifest of generated analysis outputs.
- `analysis-snapshot.json` — Snapshot of structural metrics.
- `architecture-metrics.json` — Calculated architectural health and debt metrics.

These `.md` report files are explicitly referenced in CLI test suites (`scripts/test-cli-integration.cjs`) and analyzer engines (`dependency-analyzer.cjs`). They must remain present and up to date.
