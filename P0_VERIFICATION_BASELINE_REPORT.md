# P0 Verification Baseline Report

## Repository Identity & Working Tree
- **Repository root**: `C:/Users/User/Downloads/dependency-analyzer`
- **Current branch**: `main`
- **HEAD commit hash**: `2cc3c25175596af139fcd7904f020c5436ff586b`
- **Git status**: clean (no modified, staged, or untracked files)

## Protected File Integrity
- **File**: `last_commit_changes.txt` (exists)
- **SHA‑256**: `E834467BD4A5168F5B5DCC972C49D7456F0DF78D7121A1A491648FB33EC8BEDB`
- **Expected hash**: `e834467bd4a5168f5b5dcc972c49d7456f0df78d7121a1a491648fb33ec8bedb`
- **Result**: **MATCH** – integrity verified.

## Environment
- **Operating System**: Windows (detected via PowerShell environment)
- **Node.js version**: `v22.17.0`
- **npm version**: `11.4.2`
- **`node_modules` directory**: present (indicates dependencies have been installed previously).

## Package Configuration
### Root `package.json`
```json
{
  "name": "salesforce-architecture-refactoring-explorer",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "node scripts/run-explorer.cjs --build",
    "preview": "vite preview",
    "explorer": "node scripts/run-explorer.cjs",
    "explorer:fresh": "node scripts/run-explorer.cjs --fresh",
    "explorer:preview": "node scripts/run-explorer.cjs --preview",
    "explorer:build": "node scripts/run-explorer.cjs --build",
    "adapter": "node scripts/export-explorer.cjs",
    "test:worker-geometry": "node scripts/test-worker-geometry-contract.cjs",
    "test:stage0": "node scripts/test-remediation-stage0.cjs",
    "test:overlap": "node scripts/test-overlap-checker.cjs",
    "adapter:test": "node scripts/test-export-explorer.cjs",
    "test:cli": "node scripts/test-cli-integration.cjs && node scripts/test-explorer-cli-forwarding.cjs && node scripts/test-semantic-investigation-adapter.cjs && node scripts/test-roles.cjs && node scripts/test-layers.cjs && node scripts/test-entry-points.cjs && node scripts/test-external-boundaries.cjs && node scripts/test-deterministic-contract.cjs && node scripts/test-bottlenecks.cjs && node scripts/test-security-boundaries.cjs && node scripts/test-test-gap-analysis.cjs && node scripts/test-dependency-paths.cjs && node scripts/test-data-impact.cjs && node scripts/test-architecture-profiles.cjs && node scripts/test-architecture-smells.cjs && node scripts/test-change-simulator.cjs && node scripts/test-architecture-health.cjs && node scripts/test-architecture-debt.cjs && node scripts/test-refactoring-sequencing.cjs && node scripts/test-safety-envelope.cjs && node scripts/test-duplicate-responsibility.cjs && node scripts/test-architecture-snapshot.cjs && node scripts/test-architecture-change-gate.cjs && node scripts/test-investigation-eligibility.cjs && node scripts/test-investigation-context-minimizer.cjs && node scripts/test-architecture-decision-context.cjs && node scripts/test-llm-usage-accounting.cjs && node scripts/test-worker-geometry-contract.cjs && node scripts/test-overlap-checker.cjs && node scripts/test-remediation-stage0.cjs"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^6.1.2",
    "cytoscape-fcose": "^2.2.0",
    "cytoscape-navigator": "^2.0.2",
    "react": "^19.3.0",
    "react-dom": "^19.3.0",
    "zod": "^4.6.5"
  },
  "devDependencies": {
    "playwright": "^1.64.1",
    "vite": "^8.3.0"
  }
}
```

### Explorer Sub‑project `explorer/package.json`
```json
{
  "name": "salesforce-architecture-explorer",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "cytoscape": "^3.30.2",
    "cytoscape-fcose": "^2.2.0",
    "cytoscape-navigator": "^2.0.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zod": "^4.6.4"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^7.0.1",
    "@testing-library/react": "^16.3.3",
    "@types/cytoscape": "^3.21.6",
    "@types/node": "^26.6.2",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^29.1.1",
    "typescript": "^5.5.3",
    "vite": "^5.4.1",
    "vitest": "^2.1.9"
  }
}
```

## Available Test Scripts (as defined in `package.json` scripts)
- `npm run test:cli`
- `npm run test:stage0`
- `npm run test:worker-geometry`
- `npm run test:overlap`
- `npm run explorer` (starts the Explorer UI)
- `npm run build` (root build script)
- In the `explorer` sub‑project: `npm run test` (Vitest), `npm run dev`, `npm run build`.

## Markdown Reports Present in Repository
(Partial list – full list captured from repository)
- `REMEDIATION_STAGE0_3_BASELINE_EVIDENCE.md`
- `REMEDIATION_STAGE0_3_FINAL_CLOSURE_REPORT.md`
- `REMEDIATION_TIER2_FINAL_INTEGRATION_REPORT.md`
- `GRAPH_STRUCTURE_KEY_INVALIDATION_CLOSURE_REPORT.md`
- *(and many others – see the full directory listing in the background task log)*

## Observations vs. Historical Claims
| Claim from prior reports | Evidence in current checkout |
|---|---|
| Stage 0‑3 remediation implemented and verified | Present baseline reports (`REMEDIATION_STAGE0_3_*`) exist, but we have not re‑executed the tests yet.
| `graphStructureKey` changed to structural fingerprint | The implementation will be inspected in Phase B; not yet verified.
| Ten graph‑invalidation regression scenarios passed | The regression script `scripts/test-graph-invalidation.cjs` exists; results pending.
| CLI, Stage 0, worker‑geometry, overlap, persistence, and GraphView tests passed | Scripts are present; execution pending (Phase C).
| Vitest, TypeScript compilation, Playwright browser E2E could not run because dependencies missing | `node_modules` **exists**, suggesting dependencies are installed, but we have not attempted to run those tools.
| Protected file hash matches expected | **MATCH** – verified above.

## Next Steps (as per task plan)
1. **Phase B** – inspect `explorer/src/components/GraphView.tsx` and related scripts to verify the current `graphStructureKey` implementation.
2. **Phase C** – run the available regression tests.
3. **Phase D** – determine whether Vitest/TS/Playwright can be executed without installing additional packages.
4. **Phase E** – baseline performance measurements.
5. Produce remaining reports and final go/no‑go decision.

---
*All information captured here reflects the state of the repository at the time of this baseline collection.*
