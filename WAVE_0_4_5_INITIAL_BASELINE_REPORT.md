# WAVE 0.4.5 INITIAL BASELINE REPORT

## 1. Environment & Working Tree State
- **Branch**: `jules-7216318721318028545-ff3972b7`
- **HEAD SHA**: `e8c52b8d989e11981135e8ab09986e96124acb51`
- **Node.js Version**: `v22.22.1`
- **npm Version**: `11.11.0`
- **Python Version**: `Python 3.12.13`

## 2. Distinction of Facts
- **Facts Directly Observed in Current Environment**: Branch, HEAD SHA, Node/npm/Python versions, working tree state, physical presence and initial SHA-256 hashes of all artifacts and frozen baseline test runners.
- **Historical Facts from Wave 0.4.4**: Prior reports claimed 187 checks based on marker counts; previous patch gate permitted caller-supplied allowlists; previous rollback had edge cases on null-buffer restore and did not complete full preflight before mutation.
- **Unverified Facts**: Live Salesforce Org execution, Live Apex governor limits, Live Cytoscape canvas DOM interactions (which require live deployment).

## 3. Authoritative Registers and Frozen Test Runners

| File Path | SHA-256 | Size (Bytes) |
| :--- | :--- | :--- |
| `WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv` | `4d6f83d88390170624ec5bcebbc1afc0b781a12ca171f09f98665d33c66b773b` | 24244 |
| `WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv` | `cd249035959be3c2cb1023454e2dbf4da1020ecf3d81a6415bae756ab3c68641` | 32135 |
| `WAVE_0_4_1_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv` | `60158208eb649429c9d265a851804dcae1522bf23bab7898d3287da6455db429` | 5974 |
| `docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv` | `9aa5141c01df6a6f5104c61cce6584af4ac68578f6107c2febf96cfad8a6c187` | 6472 |
| `docs/wave-0/4.4/WAVE_0_4_4_COMPONENT_API_SOURCE_PROVENANCE.csv` | `d0426767b8e04edf98109154e519321cb9f90f1cf06bc6deb29d46488fe81806` | 6047 |
| `docs/wave-0/4.4/patch-gate.cjs` | `6f1d6d1468bcbd2ad883a9996fd783ad9ae6523d26ecbcc67cc01520c9fc5520` | 14974 |
| `scratch/salesforce-poc/tests/run-poc-tests.cjs` | `81d8acade55e8896e654bb8a80b97b395ff365ea3522869ab18e9c65606577b2` | 52080 |
| `scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs` | `4f36245fbb0931286b38a1ea487a17cddfdfef79c4f680df53ef1299b3f784b7` | 32902 |
| `scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs` | `9a40e097b23e9791b6cb6f27249356c4cfb3ed1e58bdc5b5f423a13a6ef5bdd0` | 10540 |
| `scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs` | `fb429356c54a2457d29b3f9f5e7a67efeeb0e785001c394d89706d392f526066` | 19848 |
| `scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs` | `3c6b3c08b14731137cfc4afa581bf32c7d569a9ad51c7ec3d9814ce49fda537f` | 15739 |
| `scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs` | `2189651874e717b02f6edb7035a2a7c8831d57ed4a70930d95486b423f2b6304` | 12474 |
| `scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs` | `2ee0c460316557210c9bc5fc8c13d20488c619e2875c2375234236ebedc79ee9` | 16173 |
| `scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` | `61a8eadcd3009fef01d4f1216d5afa24f4292fb789d292fac90d78d2ca874bf1` | 33216 |
| `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` | `b3787bec64052fde20cb350ede3e758ca83d2355e30be824b6711bf19416131d` | 35299 |
| `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js` | `b908430756f9efdf273e4574b8d2b77b7efc367687ec238348b459b5de03c80c` | 23226 |
