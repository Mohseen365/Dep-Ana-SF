# Post-Wave-5A Dependency and Critical Path Map

**Project:** Dependency Analyzer
**Date:** 2026-11-10
**Governing Standard:** DEC-04 Alternative 4

---

## 1. Topological Dependency Structure

```text
[Current Baseline: Wave 5A Closed (e552b9e1 / b96fa5c1)]
                         │
                         ▼
        ┌───────────────────────────────────┐
        │ REL-01: Clean Scratch Org Deploy  │  <=== CRITICAL GATEWAY
        └─────────────────┬─────────────────┘
                          │
         ┌────────────────┼────────────────┬────────────────┐
         │                │                │                │
         ▼                ▼                ▼                ▼
   ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
   │  REL-02   │    │  REL-03   │    │  REL-04   │    │  REL-06   │
   │ Apex Live │    │ LWS Comp. │    │ Playwright│    │ User FLS  │
   │   Tests   │    │  Security │    │  Browser  │    │  Perms    │
   └─────┬─────┘    └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
         │                │                │                │
         └────────────────┼────────────────┘                │
                          │                                 │
                          ▼                                 │
                    ┌───────────┐                           │
                    │  REL-05   │                           │
                    │ Large PBIM│                           │
                    │ Benchmark │                           │
                    └─────┬─────┘                           │
                          │                                 │
                          ▼                                 ▼
        ┌───────────────────────────────────┐        ┌─────────────┐
        │ REL-07: 2GP Package Version Build │        │   REL-10    │
        └─────────────────┬─────────────────┘        │ CI Pipeline │
                          │                          └──────┬──────┘
                          ▼                                 │
        ┌───────────────────────────────────┐               │
        │ REL-11: Full Joint Release Audit  │ <─────────────┘
        └─────────────────┬─────────────────┘
                          │
                          ▼
        ┌───────────────────────────────────┐
        │ PO Executive Release Ratification │
        └───────────────────────────────────┘

[Parallel Independent Governance Lane (DEC-04 Alternative 4)]:
  - REL-08: Wave 9 Quarantined Scope Executive Disposition
  - REL-09: Post-Implementation Ratification of CONTRACT-03 & CONTRACT-05
```

---

## 2. Critical Path Analysis

The deterministic critical path determining the project's journey to production release readiness consists of:

1. **REL-01 (Scratch Org Deployment):** The fundamental dependency for all live runtime validation. Without a clean metadata push to an authentic scratch org, no downstream runtime assertions can occur.
2. **REL-02 (Live Apex Test Suite Execution):** Proves database triggers, DTO transformations, SOQL efficiency, and zero Apex governor violations.
3. **REL-03 (Lightning Web Security Verification):** Proves that the 21 LWC components operate within Salesforce LWS cross-namespace containment without runtime proxy errors.
4. **REL-05 (Large-Scale Payload Benchmark on Org):** Proves the PBIM dataset (528 nodes, 2063 edges, 33 chunks @ 128KB) reassembles and renders within browser and platform heap limits (< 10MB).
5. **REL-07 (2GP Packaging Version Creation):** Proves that production metadata packages successfully and installs cleanly into target subscriber orgs.
6. **PO Executive Release Ratification:** The final executive decision under DEC-04 Alternative 4 to grant `PRODUCTION_READY` / `RELEASE_ELIGIBLE` status.

**Critical Path Duration:** 5 sequential execution stages.

---

## 3. Parallel Execution Lanes

To maximize velocity without risking file collisions or coordination hazards, work is structured into four concurrent lanes:

### Lane 1: Live Platform Runtime (Sequential on Critical Path)
- **Tasks:** `REL-01` -> `REL-02` -> `REL-05`
- **Owner:** Master Integration Coordinator (D1) / Packaging Lead (R2)
- **Path Focus:** `force-app/main/default/classes/` and org metadata deployment.

### Lane 2: Client Security and Browser Verification (Parallel with Lane 1)
- **Tasks:** `REL-03` (LWS verification) and `REL-04` (Playwright E2E rendering)
- **Owner:** Security Lead (S1) / Workstream 1 Lead (C1)
- **Path Focus:** `force-app/main/default/lwc/` running inside live org browser sessions.

### Lane 3: Permissions, Packaging & Automation (Parallel with Lane 1 & 2)
- **Tasks:** `REL-06` (User FLS audit), `REL-07` (2GP version creation), `REL-10` (CI pipeline)
- **Owner:** Packaging Lead (R2) / Security Lead (S1)
- **Path Focus:** `permissionsets/`, `.forceignore`, `.github/workflows/`.

### Lane 4: Executive Governance Lane (Decoupled from Code)
- **Tasks:** `REL-08` (Wave 9 refactoring disposition), `REL-09` (Ratification of CONTRACT-03/05)
- **Owner:** Project Owner
- **Path Focus:** Governance registers and contract amendments.
