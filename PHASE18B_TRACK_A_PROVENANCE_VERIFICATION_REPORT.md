# PHASE 18B — TRACK A PROVENANCE AND PRODUCTION IDENTITY VERIFICATION REPORT

## 1. Verification Scope

This report documents the forensic provenance and production identity verification for Track A — Production Fixture Provisioning.
The primary question investigated is:

> Is the production Explorer now loading the canonical Salesforce-derived dataset from `audit-fixtures/cloud-spend-tracker/explorer-data.json`, through the implemented build/export pipeline, without depending on the Playwright/test-harness fixture-copy mechanism?

Verification was performed against clean production build execution (`npm run build`), file hashes, static distribution asset structure, and production preview server runtime requests (`http://localhost:4173/?project=cloud-spend-tracker`).

---

## 2. Canonical Salesforce-Derived Dataset Identity

* **Source File Path**: `audit-fixtures/cloud-spend-tracker/explorer-data.json`
* **File SHA-256 Digest**: `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`
* **Node Count**: 240
* **Edge Count**: 1,024
* **Project ID**: `cloud-spend-tracker`
* **Project Name**: `cloud-spend-tracker`
* **Schema Version**: `1.0.0`
* **Analyzer Version**: `13.0.0`
* **Source Directory**: `../Interview Project/Cloud-Spend-Tracker/force-app/main/default`
* **High Risk Count**: 40
* **Medium Risk Count**: 18
* **Low Risk Count**: 182

---

## 3. Export Input Verification

Code trace of `scripts/run-explorer.cjs` lines 325–338:
```javascript
function provisionProductionFixtures() {
  console.log("Provisioning production static project assets...");
  const cloudSpendFixture = path.join(ROOT_DIR, "audit-fixtures", "cloud-spend-tracker", "explorer-data.json");
  if (fs.existsSync(cloudSpendFixture)) {
    const targetOutput = path.join(ROOT_DIR, "analyze", "projects", "cloud-spend-tracker", "explorer-data.json");
    execSync(
      `node "${ADAPTER_SCRIPT}" --input "${cloudSpendFixture}" --output "${targetOutput}" --project "cloud-spend-tracker"`,
      {
        cwd: ROOT_DIR,
        stdio: "inherit",
      }
    );
  }
}
```

* **Verified Input File Path**: `/app/audit-fixtures/cloud-spend-tracker/explorer-data.json`
* **Verified Export Mechanism**: `scripts/run-explorer.cjs` passes `audit-fixtures/cloud-spend-tracker/explorer-data.json` as the explicit `--input` parameter to `scripts/export-explorer.cjs` when `--build` is executed.
* **Proven Result**: The production build path explicitly uses `audit-fixtures/cloud-spend-tracker/explorer-data.json` as its input file.

---

## 4. Export Transformation Analysis

Inspect `scripts/export-explorer.cjs` lines 454–498:
```javascript
const isAlreadyExplorerData = Boolean(
  reportData.schemaVersion &&
    reportData.summary &&
    Array.isArray(reportData.nodes) &&
    reportData.nodes.length > 0 &&
    reportData.nodes[0].metrics &&
    reportData.nodes[0].risk !== undefined
);

if (isAlreadyExplorerData) {
  const explorerData = JSON.parse(JSON.stringify(reportData));
  const projectMetadata = {
    ...explorerData.project,
    id: projectId,
    name: options.projectName || explorerData.project?.name || (projectId !== "default" ? projectId : "Default Salesforce Project"),
    description: options.projectDesc || explorerData.project?.description || "Salesforce DX Architecture Analysis",
    analysisPath: projectId !== "default" ? `/projects/${projectId}/explorer-data.json` : "/explorer-data.json",
  };
  explorerData.project = projectMetadata;

  // Ensure output parent directory exists...
  const resolvedOutputFile = path.resolve(effectiveOutputPath);
  // Write explorer-data.json, project-metadata.json, update manifests and publish to public/dist assets
  ...
}
```

* **Transformation Behavior**: `exportExplorerData` parses the canonical JSON contract and preserves all internal nodes, edges, metrics, risks, behavior, readiness, and summary structures intact.
* **Preserved Fields**:
  * Node IDs: Preserved (240 nodes)
  * Node Types: Preserved (79 ApexClass, 3 ApexTrigger, 26 LWC, 10 CustomObject, 63 CustomField, etc.)
  * Graph Edges: Preserved (1,024 edges)
  * Metrics: Preserved (coupling, fanIn, fanOut, unresolved, score)
  * Risk Classifications: Preserved (40 HIGH, 18 MEDIUM, 182 LOW)
  * Summary Counts: Preserved (240 nodes, 1,024 edges, 0 cycles, 263 unresolved)
* **Copy / Serialization Behavior**: The output file `explorer/dist/projects/cloud-spend-tracker/explorer-data.json` is generated via deterministic JSON stringification of `reportData`.

---

## 5. Production Artifact Identity

Forensic comparison between source fixture and generated production artifact:
* **Source Fixture Path**: `audit-fixtures/cloud-spend-tracker/explorer-data.json`
* **Source SHA-256 Digest**: `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`
* **Dist Artifact Path**: `explorer/dist/projects/cloud-spend-tracker/explorer-data.json`
* **Dist SHA-256 Digest**: `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`
* **Byte Identity Result**: **100% BYTE IDENTICAL** (`srcHash === distHash` evaluates to `true`).
* **Deep Content Equality**: **100% IDENTICAL** (`JSON.stringify(srcJson) === JSON.stringify(distJson)` evaluates to `true`).

---

## 6. End-to-End Production Provenance

The complete verified data chain is:

```text
audit-fixtures/cloud-spend-tracker/explorer-data.json (SHA-256: feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295)
                ↓
scripts/run-explorer.cjs (provisionProductionFixtures on --build)
                ↓
scripts/export-explorer.cjs (isAlreadyExplorerData contract pass-through)
                ↓
explorer/public/projects/cloud-spend-tracker/explorer-data.json
                ↓
Vite build (npx vite build)
                ↓
explorer/dist/projects/cloud-spend-tracker/explorer-data.json (SHA-256: feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295)
                ↓
ProjectContext.tsx (URL query param ?project=cloud-spend-tracker -> /projects/cloud-spend-tracker/explorer-data.json)
                ↓
Explorer runtime (HTTP 200, 240 nodes, 1,024 edges)
```

---

## 7. Clean Runtime Verification

Production preview server execution on `http://localhost:4173`:
* **URL Requested**: `http://localhost:4173/projects/cloud-spend-tracker/explorer-data.json`
* **HTTP Response Status**: **200 OK**
* **Manifest Status**: `project-manifest.json` returned status **200 OK**
* **Active Project ID**: `cloud-spend-tracker`
* **Loaded Node Count**: 240
* **Loaded Edge Count**: 1,024
* **Fallback Triggered**: **NONE** (no fallback to default 4-node fixture)

---

## 8. Test-Harness Independence

* **Playwright Dependency**: **NONE**. The dataset was provisioned during `npm run build` without launching Playwright or running test setup scripts.
* **Fixture-Copy Helper Script Dependency**: **NONE**. No helper scripts outside the standard build execution were invoked.
* **Manual Pre-population**: **NONE**. The `explorer/dist/` directory was generated completely clean via `npm run build`.

---

## 9. Canonical Fixture Integrity

* **Before SHA-256**: `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`
* **After SHA-256**: `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`
* **Immutability Status**: Bit-for-bit unchanged.

---

## 10. Regression Boundary Verification

* `dependency-analyzer.cjs`: Untouched
* `explorer/src/lib/architecture-layout.ts`: Untouched
* `explorer/src/lib/position-policy.ts`: Untouched
* `explorer/src/components/GraphView.tsx`: Untouched
* Historical audit reports: Untouched
* `AGENT.md`: Untouched
* Track B (40px contract): Untouched
* Track C (Locality metrics): Untouched

---

## 11. Evidence Gaps / Limitations

None. The source-to-artifact provenance chain, cryptographic byte identity, clean build execution, and production runtime HTTP loading were fully established without gaps or assumptions.

---

## 12. Final Provenance Classification

### PROVEN — CANONICAL DATASET PRODUCTIONALLY PROVISIONED
