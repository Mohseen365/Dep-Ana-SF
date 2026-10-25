Final Jules Dispatch Schedule — Dependency Analyzer
With isolated branches/worktrees enabled, T0-1 prioritized, and full regression testing required after integration, use the following launch order.
Strategy: Launch independent lanes concurrently, keep GraphView.tsx under one coordinated owner, and release S2 only after T0-1 is verified and explicitly approved.
Wave 0 — Coordinator preparation
Launch first: Wave 0 Coordinator prompt
Required before implementation
Use the prompt titled “Jules Wave 0 — Coordinator Baseline & Parallel Dispatch Readiness.”
Required output: WAVE_0_COORDINATOR_DISPATCH_READINESS.md
Wait for the report. Confirm repository baseline, file ownership, actual test commands, and branch/worktree isolation before starting implementation agents.
Wave 1 — Launch six lanes concurrently
Once Wave 0 confirms readiness, launch the following five independent lanes and the dedicated T0-1 task together. Each agent must use its own isolated branch/worktree based on the agreed repository baseline.
1. Lane A — Graph Style & Builder Correctness
Tasks: N1, N2, N3, N5, N6, N7.
Prompt: Prompt A — Lane A: Graph Style & Builder Correctness
Output: LANE_A_GRAPH_STYLE_IMPLEMENTATION_REPORT.md
2. Lane C — App Pipeline & Search Optimization
Tasks: N11–N14, T1-4, T1-7.
Prompt: Prompt B — Lane C: App Pipeline & Search Optimization
Output: LANE_C_APP_PIPELINE_IMPLEMENTATION_REPORT.md
3. Lane D — GraphControls Accessibility
Tasks: N18–N20, T1-8, T1-9.
Prompt: Prompt C — Lane D: GraphControls Accessibility & Roving Focus
Output: LANE_D_GRAPHCONTROLS_ACCESSIBILITY_REPORT.md
4. Lane E — WorkspaceHeader & Overlay Polish
Tasks: N15, N21–N26.
Prompt: Prompt D — Lane E: WorkspaceHeader, Error Boundary & Overlays
Output: LANE_E_WORKSPACE_OVERLAY_IMPLEMENTATION_REPORT.md
5. Lane F — Architecture Mode Contracts
Tasks: N27, N28, T0-9, T0-10.
Prompt: Prompt E — Lane F: Architecture Mode Contracts & Types
Output: LANE_F_ARCH_MODE_CONTRACTS_IMPLEMENTATION_REPORT.md
6. Lane B1 — T0-1 Position Authority Fix
Task: T0-1 only, with necessary regression tests.
Prompt: Prompt B1 — Lane B Phase 1: T0-1 Position Authority Fix
Output: LANE_B_T0_1_POSITION_AUTHORITY_REPORT.md
This is the highest-priority implementation task because the dispatch correction report identifies a failing position-authority test.
Important Lane B restriction
Do not launch the broad GraphView engine prompt as a second concurrent editor of GraphView.tsx while B1 is working. Once T0-1 is isolated and reviewed, launch the remaining GraphView work in controlled batches under one owner.
Wave 2 — Remaining Lane B engine tasks
Launch Prompt B1b — Lane B Phase 1: Remaining GraphView Engine Tasks after T0-1 has been isolated into a reviewable change and the same-file ownership arrangement is clear.
Tasks:
	• N4, N8–N10
	• T0-2 through T0-5
	• T0-7, T0-8
	• T1-2, T1-5, T1-6
Output: LANE_B_GRAPHVIEW_ENGINE_REPORT.md
Execute its recommended small batches in order. Run targeted tests after each batch and the full relevant GraphView regression suite after the combined changes.
Wave 3 — S2 gate, then Lane B2
Gate review — do not skip
The coordinator must review LANE_B_T0_1_POSITION_AUTHORITY_REPORT.md and confirm that the targeted position-authority tests pass. If they fail or the evidence is incomplete, stop and correct T0-1 first.
Then launch Prompt B2 — Lane B Phase 2: S2 Position-Policy Gate
Tasks: N16, N17, T0-6, T1-1.
Output: LANE_B_S2_POSITION_POLICY_REPORT.md
This agent must not begin until the coordinator explicitly releases S2.
The gate protects the position-authority contract:
	• N16 removes the obsolete mode parameter.
	• N17 requires callers to pass hasAuth explicitly.
	• T0-6 removes the default hasAuth = true.
	• T1-1 scopes session positions by architecture mode.
N17 and T0-6 must remain independently tracked acceptance requirements.
Wave 4 — Integration and full regression
After all implementation lanes have returned their reports:
	1. Launch Prompt Z — Integration Coordinator & Final Closure.
	2. Review every lane's diff and task-level evidence.
	3. Integrate the isolated branches without overwriting unrelated work.
	4. Resolve integration conflicts, especially shared imports, types, tests, and GraphView changes.
	5. Run the full relevant regression suite, TypeScript checks, and production build.
	6. Re-run failed checks after any integration fix.
	7. Produce GRAPH_DEEP_PASS_FINAL_INTEGRATION_REPORT.md.
T1-3 remains deferred unless you explicitly authorize a separate dispatch.
Launch checklist
Dispatch progress
0 of 7
Wave 0 readiness report accepted
Launch A, C, D, E, F and B1 on isolated branches
Launch B1b under coordinated GraphView ownership
Review T0-1 evidence and explicitly release S2
Launch B2 position-policy tasks
Integrate and run full regression suite
Review final closure report; keep T1-3 deferred
Copy checklist
Acceptance policy for every wave: targeted tests during implementation, then full relevant regression testing after integration. A report is evidence to review—not automatic approval to merge or declare completion.

From <https://chatgpt.com/g/g-p-6aafb0c3582081918ad860fa313c4c09-context-analyzer-graph/c/6ad20788-c1dc-83e8-b49e-4328ff3e16b4> 

