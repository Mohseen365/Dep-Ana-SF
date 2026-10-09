# Current Test Suites & Verification Protocol

## 1. CLI Integration Test Suite (`scripts/test-cli-integration.cjs`)

Run command: `npm run test:cli`

Includes 31 sub-test execution scripts:

| Script Name | Purpose | Critical Verifications |
| :--- | :--- | :--- |
| `scripts/test-cli-integration.cjs` | Master CLI test suite | Verifies artifact exports (`dependency-report.json`, `dependency-report.md`, `dependency-summary.md`, `unresolved-references.md`) |
| `scripts/test-explorer-cli-forwarding.cjs` | Explorer CLI flag forwarding | Verifies `--project`, `--build`, and `--preview` flag passing |
| `scripts/test-semantic-investigation-adapter.cjs` | Semantic investigation adapter | Verifies query minimization and context bounds |
| `scripts/test-roles.cjs` | Component role classifier | Verifies 5 role assignments (`entry_point` to `data_access`) |
| `scripts/test-layers.cjs` | System layer classifier | Verifies 4 layer assignments (`presentation` to `schema`) |
| `scripts/test-entry-points.cjs` | Entry point detection | Verifies trigger and LWC entry point discovery |
| `scripts/test-external-boundaries.cjs` | External boundaries analyzer | Verifies external callouts and boundary edges |
| `scripts/test-deterministic-contract.cjs` | Deterministic change contract | Verifies 10x repeatable outputs and zero random drift |
| `scripts/test-bottlenecks.cjs` | Performance bottleneck detector | Verifies layout time threshold bounds |
| `scripts/test-security-boundaries.cjs` | Security boundary validator | Verifies data isolation and boundary checks |
| `scripts/test-test-gap-analysis.cjs` | Test coverage gap analyzer | Verifies uncovered Apex classes and triggers |
| `scripts/test-dependency-paths.cjs` | Dependency path analyzer | Verifies cycle detection and transitive chains |
| `scripts/test-business-criticality.cjs` | Business criticality scorer | Verifies component risk and criticality scoring |
| `scripts/test-data-impact.cjs` | Schema data impact analyzer | Verifies schema modification blast radius |
| `scripts/test-architecture-profiles.cjs` | System architecture profiler | Verifies profile metrics generation |
| `scripts/test-architecture-smells.cjs` | Architecture smell detector | Verifies detection of God classes, cycles, and feature drift |
| `scripts/test-change-simulator.cjs` | Refactoring change simulator | Verifies impact simulation calculations |
| `scripts/test-architecture-maps.cjs` | System architecture map | Verifies domain map generation |
| `scripts/test-architecture-health.cjs` | System health evaluator | Verifies health score calculation |
| `scripts/test-architecture-debt.cjs` | Technical debt calculator | Verifies debt hour estimation |
| `scripts/test-refactoring-sequencing.cjs` | Refactoring sequencer | Verifies refactoring order generation |
| `scripts/test-safety-envelope.cjs` | Safety envelope validator | Verifies structural and safety rules |
| `scripts/test-architecture-quality-gates.cjs` | Quality gate evaluator | Verifies release quality gates |
| `scripts/test-duplicate-responsibility.cjs` | Duplicate responsibility detector | Verifies ambiguous class responsibility detection |
| `scripts/test-architecture-snapshot.cjs` | System snapshot generator | Verifies architecture snapshot metrics |
| `scripts/test-architecture-change-gate.cjs` | Deterministic change gate | Verifies change gate decision evaluation |
| `scripts/test-investigation-eligibility.cjs` | Investigation eligibility | Verifies task eligibility filtering |
| `scripts/test-investigation-context-minimizer.cjs` | Context minimizer | Verifies context minimization |
| `scripts/test-architecture-decision-context.cjs` | Decision context evaluator | Verifies component and repo decision contexts |
| `scripts/test-llm-usage-accounting.cjs` | Usage accounting verifier | Verifies zero-LLM fallback invariants |

## 2. Frontend Vitest Test Suite (`explorer/src/test/`)

Run command: `cd explorer && npx vitest run`

Key Vitest test files:

- `explorer/src/test/def01-position-isolation.test.ts` — DEF-01 Lens B position-key isolation regression suite (Tests A–D: Orbit isolation, Constellation isolation, coordinate preservation, cross-focal isolation; run command: `cd explorer && npx vitest run src/test/def01-position-isolation.test.ts`).
- `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx` — Single-owner state authority, selection neutrality, 18-mode taxonomy mapping, URL history semantics, and project isolation.
- `explorer/src/test/Phase3D_WebWorkerLayout.test.ts` — Web Worker offloading, 0.00000px coordinate drift, stale result rejection, and synchronous fallback.
- `explorer/src/test/static-constellation-projection.test.ts` — Constellation static vs interactive mode node projection synchronization.
- `explorer/src/lib/orbit-layout.test.ts` — Orbit polar coordinate placement, water-filling sector allocation, and exact zero-collision AABB verification.
- `explorer/src/lib/drill.test.ts` — Progressive one-hop dependent ranking and deterministic impact sorting.
- `explorer/src/lib/detached-drawer.test.ts` — BroadcastChannel message-passing for detached drawer synchronization.
- `explorer/src/hooks/useCommandPalette.test.ts` & `explorer/src/components/CommandPalette.test.tsx` — Cmd+K keyboard shortcut, search debouncing, and surface mounting.
- `explorer/src/hooks/useViewState.test.ts` — Two-parameter URL state (`?node=X&investigate=true`) and opt-in feature query writing.
- `explorer/src/components/InvestigationDrawer.test.tsx` — Breadcrumb navigation, progressive drilldown, pinned drawer state, and refactor handoff action.
- `explorer/src/lib/adapters/*.test.ts` — Vitest unit tests for 12 canonical adapters (matrix, river, tree, radar, profile, dna, subway, constellation, etc.).
- `explorer/src/App.test.tsx`, `App.deepLink.test.tsx`, `App.investigationWorkflow.test.tsx` — End-to-end React UI component and workflow integration tests.

## 3. Real-Browser Playwright End-to-End Verification

Verification scripts in `scripts/`:

- `scripts/verify-phase-comp-fix-real-browser.cjs` — E2E browser test verifying project switching (`pbim`), deep links (`?project=pbim&view=graph`), page reloads, and lens switching.
- `scripts/verify-phase2e-performance.cjs` — Performance transition latency verification across scale tiers T1–T8.
