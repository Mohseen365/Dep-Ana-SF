# 04 — Multi-Project, Persistence & Position State

## Current state model

Project state is partitioned by project identity. Persistent graph/UI state must never leak from one project into another.

### Persistence
The project state model stores layout and UI state under a project-specific namespace, historically represented as:
`explorer.projectState.<projectId>`

The isolated state dimensions documented by the project-state audits include:
1. Selection
2. Filters
3. Zoom
4. Sidebar
5. Inspector
6. Navigator
7. Analysis view
8. Comparison
9. Layout settings

Layout settings additionally carry:
- `architectureMode`
- `layoutProvenance`
- `nodePositions`

### Project switching
Switching projects:
- clears/flushes in-memory focus and selection state that belongs to the old project,
- loads the target project's graph/artifacts,
- restores the target project's persisted state,
- emits the project-change synchronization event,
- must not reuse stale coordinates or findings from another project.

### Position persistence
- User-authored coordinates are highest priority.
- Automatic hierarchical and automatic hybrid positions are provenance-tagged.
- Valid saved positions can be restored without recomputing layout.
- If saved automatic positions belong to a different requested architecture mode, they are not treated as authoritative for that mode.
- Filter/focus restoration uses session/persisted position state so nodes return to their prior coordinates.

### Reset Layout
Reset Layout is an explicit layout trigger. It clears session positions, computes the layout for the current visible graph, captures the new coordinates and persists them.

### Initial-load contract
The accepted runtime audits establish:
- exactly one intentional intelligent-layout execution on a cold load when authoritative positions do not exist,
- zero layout calls for normal static filter/focus/viewport state changes,
- no visual jump from rendering unpositioned elements before layout coordinates are available.

### Key correction from the latest runtime audit
A stale-position bug once caused automatic hierarchical coordinates to overwrite freshly computed Hybrid coordinates. The repaired position-policy/GraphView path passes the correct authority context, reducing the overwrite count from 240 nodes to 0 in the forensic reproduction.

## Key authoritative sources
- `HYBRID_LAYOUT_PHASE13_REAL_EXECUTION_FORENSIC_AUDIT.md` (2026-09-22 23:58:30)
- `HYBRID_LAYOUT_PHASE12_PRODUCTION_ACTIVATION_REPORT.md` (2026-09-22 23:07:38)
- `FINAL_PERSISTENCE_AUDIT.md` (2026-09-18 09:23:38)
- `FINAL_PROJECT_ISOLATION_COMPARE_AUDIT.md` (2026-09-15 12:33:12)
- `PROJECT_STATE_IMPLEMENTATION.md` (2026-09-15 09:47:46)
