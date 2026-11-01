# WAVE 0.4.4 EXECUTION BASELINE AND INPUT INVENTORY

## 1. Execution Environment Baseline

| Dimension | Observed Fact |
|:---|:---|
| **Repository Path** | `/app` |
| **Git Branch** | `jules-9823868886087075423-6bd4fa33` |
| **Starting HEAD SHA** | `ef603857b6aff2e05e79af62a3f49a7d3aab3bea` |
| **Git Working-Tree Status** | Clean at start (evidence generation strictly isolated to `docs/wave-0/4.4/`) |
| **Node.js Version** | `v22.22.1` |
| **npm Version** | `11.11.0` |
| **Python Version** | `Python 3.12.13` |
| **Operating System / Kernel** | `Linux devbox 6.8.0 #1 SMP PREEMPT_DYNAMIC Fri Feb 20 20:38:43 UTC 2026 x86_64` |
| **Platform / Architecture** | `linux / x64` |
| **Shell** | `/bin/bash` |
| **Git Binary & Version** | `git version 2.53.0` |
| **Production Files Modified** | **0** (strictly read-only boundary enforced) |
| **Frozen Test Runners Modified** | **0** (strictly immutable) |

---

## 2. Nine Frozen Baseline Test Runners Inventory

| Runner ID | Runner File Path | SHA-256 Checksum | Invariant Status |
|:---:|:---|:---|:---:|
| **RUN-01** | `scratch/salesforce-poc/tests/run-poc-tests.cjs` | `81d8acade55e8896e654bb8a80b97b395ff365ea3522869ab18e9c65606577b2` | FROZEN_READ_ONLY |
| **RUN-02** | `scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` | `61a8eadcd3009fef01d4f1216d5afa24f4292fb789d292fac90d78d2ca874bf1` | FROZEN_READ_ONLY |
| **RUN-03** | `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` | `b3787bec64052fde20cb350ede3e758ca83d2355e30be824b6711bf19416131d` | FROZEN_READ_ONLY |
| **RUN-04** | `scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs` | `4f36245fbb0931286b38a1ea487a17cddfdfef79c4f680df53ef1299b3f784b7` | FROZEN_READ_ONLY |
| **RUN-05** | `scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs` | `9a40e097b23e9791b6cb6f27249356c4cfb3ed1e58bdc5b5f423a13a6ef5bdd0` | FROZEN_READ_ONLY |
| **RUN-06** | `scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs` | `fb429356c54a2457d29b3f9f5e7a67efeeb0e785001c394d89706d392f526066` | FROZEN_READ_ONLY |
| **RUN-07** | `scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs` | `3c6b3c08b14731137cfc4afa581bf32c7d569a9ad51c7ec3d9814ce49fda537f` | FROZEN_READ_ONLY |
| **RUN-08** | `scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs` | `2189651874e717b02f6edb7035a2a7c8831d57ed4a70930d95486b423f2b6304` | FROZEN_READ_ONLY |
| **RUN-09** | `scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs` | `2ee0c460316557210c9bc5fc8c13d20488c619e2875c2375234236ebedc79ee9` | FROZEN_READ_ONLY |
