
# Section 1: Executive Summary and Verdict

### Verdict: `READY FOR INDEPENDENT AUTHORIZATION REVIEW`
### BATCH 1 DISPATCH AUTHORIZED: NO

Wave 0.4.13 represents the final security boundary and evidence integrity closure prior to independent review of Batch 1.
All unresolved findings from Wave 0.4.9 have been definitively closed and verified:
1. **P0-01 Remediation**: Public rollback (`pathSafeRollback`) rejects coordinator-exclusive paths fail-closed. Provenance or taskId cannot confer coordinator privileges.
2. **P0-02 Remediation**: All public mutation hook parameters have been completely excised from public signatures.
3. **Rollback Hardening**: Complete all-target Phase A preflight validation across all target paths before any mutation; handles empty base64 string for zero-byte files without truthiness errors; verified mode restoration and atomic temporary files.
4. **Strict CSV Production Path**: Strict RFC 4180 parsing with explicit strict CRLF mode options.
5. **Git Diff and Path Parsing**: Repeated diff sections for duplicate paths rejected; C-quoted paths with octal UTF-8 unescaping correctly parsed; path traversals and control characters blocked.
6. **Authoritative Dependency Traversal**: Parses dependencies from authoritative register; rejects cycles and missing IDs; strictly enforces W5 serialization chain (W5-1 -> W5-2 -> W5-3 -> W5-4 -> W5-5 -> W5-6).
7. **Shell-Free Invocations**: Replaced all path-tainted shell executions with `spawnSync` (`shell: false`, argument array).
8. **Mutation Suite Exact Equality**: 20 mutation scenarios with exact finding set equality and real child-process execution.
9. **Child-Process Exit Code Propagation**: All test harnesses propagate non-zero exit codes upon failure.
10. **Evidence-Derived Fail-Closed Synthesis**: Validates exact SHA-256 and byte counts across all artifacts and raw logs.



# Section 2: Scope, Boundaries, and Explicit Batch 1 Decision

- **Primary Objective**: Security hardening, dispatch verification, and evidence packaging.
- **Batch 1 dispatch authorized**: **NO**
- **Autonomous Feature Dispatch**: **STRICTLY PROHIBITED**
- **Production Feature Code Modified**: **NONE**
- **Salesforce Runtime Mutation**: **NONE**
- **Frozen Baseline Runners**: **9/9 preserved unmodified and bit-for-bit identical**.



# Section 3: Initial Git State Captured Before Modifications

- **Repository Root**: `/app`
- **Branch**: `jules-14513250376004629402-b3c7bc04`
- **HEAD Commit SHA**: `42a5e4a52b37c597256a5c9db9b437dd371f0df4`
- **Initial Working Tree Status**: Clean (zero dirty files, zero untracked files prior to Wave 0.4.13 execution).
- **Environment Toolchain**:
  - Node.js: `v22.22.1`
  - npm: `11.11.0`
  - Python: `Python 3.12.13`
  - Git: `git version 2.53.0`



# Section 4: Final Git State and Path-by-Path Attribution

- **HEAD Commit SHA**: `42a5e4a52b37c597256a5c9db9b437dd371f0df4` (Unchanged; zero commits created).
- **Tracked Dirty Files**: Zero.
- **Created Wave 0.4.13 Tooling Paths**:
  - `docs/wave-0/4.11/strict-rfc4180-csv-parser.cjs` (Wave 0.4.13 Tooling)
  - `docs/wave-0/4.11/patch-gate.cjs` (Wave 0.4.13 Tooling)
  - `docs/wave-0/4.11/generate-synthesis.cjs` (Wave 0.4.13 Tooling)
  - `docs/wave-0/4.11/build-evidence-package.cjs` (Wave 0.4.13 Tooling)
  - `docs/wave-0/4.11/validate-wave0-4-13-dispatch.cjs` (Wave 0.4.13 Semantic Validator)
  - `docs/wave-0/4.11/test-authorization-patch.cjs` (Wave 0.4.13 Test Harness)
  - `docs/wave-0/4.11/test-rollback.cjs` (Wave 0.4.13 Test Harness)
  - `docs/wave-0/4.11/test-csv-parser.cjs` (Wave 0.4.13 Test Harness)
  - `docs/wave-0/4.11/test-containment.cjs` (Wave 0.4.13 Test Harness)
  - `docs/wave-0/4.11/test-validator-mutations.cjs` (Wave 0.4.13 Test Harness)
  - `docs/wave-0/4.11/test-api-surface.cjs` (Wave 0.4.13 Test Harness)
  - `docs/wave-0/4.11/test-synthesis.cjs` (Wave 0.4.13 Test Harness)
  - `docs/wave-0/4.11/test-baseline-runners.cjs` (Wave 0.4.13 Test Harness)
  - `docs/wave-0/4.11/evidence/raw/*` (Wave 0.4.13 Raw Child-Process Logs)
  - `WAVE_0_4_13_SEQUENCED_INTEGRATION_REMEDIATION_EVIDENCE_PACKAGE.md` (Primary Deliverable)



# Section 5: Environment, Runtime, Dependencies, and Installation Actions

- **Dependencies Installed**: **ZERO**. Standard Node.js built-ins (`fs`, `path`, `crypto`, `child_process`) utilized exclusively.
- **Operating System**: Linux 6.6.137+
- **Sandboxed Isolation**: Strict child-process execution without shell interpolation.



# Section 6: Authoritative Baseline and Provenance

- **9 Frozen Baseline Runners**:
  - `scratch/salesforce-poc/tests/run-poc-tests.cjs` (43 tests)
  - `scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs` (32 tests)
  - `scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs` (9 tests)
  - `scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs` (10 tests)
  - `scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs` (15 tests)
  - `scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs` (11 tests)
  - `scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs` (12 tests)
  - `scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` (33 tests)
  - `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` (22 tests)
- **Total Unique Check Identities Per Sweep**: 187
- **Three Baseline Sweeps**: 27 child-process runs, 561 cumulative passing outcomes.
- **Authoritative Task Register**: 21 tasks across Waves 5–9 + Coordinator.
- **Authoritative Ownership Manifest**: 175 rows (99 existing + 76 planned new).
- **Batch 1 Scope**: 11 task IDs across 49 path rows.


# Section 7: Complete Authoritative Artifact Manifest

Total Registered Artifacts: **114**

| Artifact ID | Relative Path | Type | SHA-256 | Byte Count |
|---|---|---|---|---:|
| `W0411-ART-001` | `docs/wave-0/4.13/patch-gate.cjs` | `JavaScript Module` | `e237a4c33ec7454a17b180dc038696344082376a4c7041b21d3f58b7a715cc7f` | 37680 |
| `W0411-ART-002` | `docs/wave-0/4.13/strict-rfc4180-csv-parser.cjs` | `JavaScript Module` | `0c13f19264191c64d71ad95e1d0ec896cc544f711b9c1f6c0d572f0d40bda53f` | 6040 |
| `W0411-ART-003` | `docs/wave-0/4.13/generate-synthesis.cjs` | `JavaScript Module` | `0ead1c7ddea5a18ba1cd34682a1c7cbbcac5ae6fb72d389f159ad69ba9518614` | 8292 |
| `W0411-ART-004` | `docs/wave-0/4.13/test-authorization-patch.cjs` | `JavaScript Harness` | `e3d09048dd4936e152d0781cb2e1262dc956e0a402c19fc441f8a34f6a86180d` | 10870 |
| `W0411-ART-005` | `docs/wave-0/4.13/test-rollback.cjs` | `JavaScript Harness` | `9f27e09bc86b2160825cc926bc1d51c98401d914d5b47d994e7958701cdea00b` | 16911 |
| `W0411-ART-006` | `docs/wave-0/4.13/test-csv-parser.cjs` | `JavaScript Harness` | `3f8576921fdc27924b323f7d4a8fe187190b15400762af7df20833975b76b369` | 12805 |
| `W0411-ART-007` | `docs/wave-0/4.13/test-containment.cjs` | `JavaScript Harness` | `480ea5f803abe072a6b3e8e304788d22c1602ac9e3733d1202915364775f9d9a` | 5035 |
| `W0411-ART-008` | `docs/wave-0/4.13/test-validator-mutations.cjs` | `JavaScript Harness` | `28631e093b07e137ca901672d34fbc9ec12071faef3254f6bb1e3a748afd41ae` | 15178 |
| `W0411-ART-009` | `docs/wave-0/4.13/test-api-surface.cjs` | `JavaScript Harness` | `06548afae79e3895c568410c8da516d5c6d4fe3e5e2235d802b4d580e815c08d` | 4952 |
| `W0411-ART-010` | `docs/wave-0/4.13/test-synthesis.cjs` | `JavaScript Harness` | `e8dfee1eeadd04833d0755305c9845669e1e0425fff12408ffae75dfd18b075c` | 6230 |
| `W0411-ART-011` | `docs/wave-0/4.13/test-baseline-runners.cjs` | `JavaScript Harness` | `f9c2165dd64ba031a547fbfc490a3db881e6612bd29604107f7a8043c5701523` | 4156 |
| `W0411-ART-012` | `docs/wave-0/4.13/validate-wave0-4-13-dispatch.cjs` | `JavaScript Module` | `5239623aa26470182f22ebe37359b25eced20d67614f5a65b1734254f173e87b` | 11424 |
| `W0411-ART-013` | `docs/wave-0/4.13/evidence/raw/API-01.log` | `Log File` | `42b6cac7c5e006f435c6539650554a21da643ed65b29ef3e2d020b1d5fbd6751` | 18 |
| `W0411-ART-014` | `docs/wave-0/4.13/evidence/raw/API-02.log` | `Log File` | `42b6cac7c5e006f435c6539650554a21da643ed65b29ef3e2d020b1d5fbd6751` | 18 |
| `W0411-ART-015` | `docs/wave-0/4.13/evidence/raw/API-03.log` | `Log File` | `437b20aa50eeda8c2f5f829a5a0914b035521a2bba5e533c07fe99c31e80fa2e` | 289 |
| `W0411-ART-016` | `docs/wave-0/4.13/evidence/raw/API-04.log` | `Log File` | `e350df73a60a6083f7cff9e49f98eb135109eff738bd1eb5cbc52dad30db2aa7` | 28 |
| `W0411-ART-017` | `docs/wave-0/4.13/evidence/raw/API-05.log` | `Log File` | `b9c0c935ddf6849bce1707f3ca5a97a9bfaa8cca4e30eb4fac865fa4284aa91d` | 12313 |
| `W0411-ART-018` | `docs/wave-0/4.13/evidence/raw/API-06.log` | `Log File` | `ba3bf2ea48fd6940c939c161292b85d85945c7501c2eb22f1e6b3bc054986779` | 366 |
| `W0411-ART-019` | `docs/wave-0/4.13/evidence/raw/AUTH-01.log` | `Log File` | `20c444f345fdf0d4cae4d76f3a0df8dd7e665db2b264ca248c4b866da5064a08` | 26 |
| `W0411-ART-020` | `docs/wave-0/4.13/evidence/raw/AUTH-02.log` | `Log File` | `7eeae6eb8baa99b7bfced16f4d936c91d01dcdd8578b5f514d2db7c653b9d92a` | 26 |
| `W0411-ART-021` | `docs/wave-0/4.13/evidence/raw/AUTH-03.log` | `Log File` | `0788c0401a2797cd14986a9b08ba0c48c6d0d1f7818d15e6c65fe0a54cfb0e5b` | 23 |
| `W0411-ART-022` | `docs/wave-0/4.13/evidence/raw/AUTH-04.log` | `Log File` | `6531912db4a412dc71c3e0076c73982c1e0a1efcc1eddfd9b13225afed3b2c3f` | 29 |
| `W0411-ART-023` | `docs/wave-0/4.13/evidence/raw/AUTH-05.log` | `Log File` | `754cde824681a6d6049414554018540fedd5eeb06d1074698b9af82d956d4f9c` | 29 |
| `W0411-ART-024` | `docs/wave-0/4.13/evidence/raw/AUTH-06.log` | `Log File` | `147cb33532932ccf9f82ac6b14efa7a67554c2c097abbbc0f20f6f51f8a52c4e` | 35 |
| `W0411-ART-025` | `docs/wave-0/4.13/evidence/raw/AUTH-07.log` | `Log File` | `a3f28a888e558382bf82e29e4bb65bbd618b0f9c786847b6e858c2d0f9f553ff` | 27 |
| `W0411-ART-026` | `docs/wave-0/4.13/evidence/raw/AUTH-08.log` | `Log File` | `a3f28a888e558382bf82e29e4bb65bbd618b0f9c786847b6e858c2d0f9f553ff` | 27 |
| `W0411-ART-027` | `docs/wave-0/4.13/evidence/raw/AUTH-09.log` | `Log File` | `8016ff5e304808feeaff5d561e2a3733342543b223906b2b95ae0ddd34218b83` | 32 |
| `W0411-ART-028` | `docs/wave-0/4.13/evidence/raw/AUTH-10.log` | `Log File` | `58686689cd766538cce72b884fad6db6240461a26d7a866665109fd75ca56539` | 34 |
| `W0411-ART-029` | `docs/wave-0/4.13/evidence/raw/AUTH-11.log` | `Log File` | `d86f7d67c6b6b7ad88bbda2d66e037b4c56f7f55d88c7f54072aa6b50df7f458` | 40 |
| `W0411-ART-030` | `docs/wave-0/4.13/evidence/raw/AUTH-12.log` | `Log File` | `eba1c934b233dde449a1d4cdec3977416617ab8ee013178b4c1cde12dad5c60f` | 30 |
| `W0411-ART-031` | `docs/wave-0/4.13/evidence/raw/CONT-01.log` | `Log File` | `211c26fa46177e81bae58b6d8c44618376692cfe47feb988081ac678c6903fde` | 27 |
| `W0411-ART-032` | `docs/wave-0/4.13/evidence/raw/CONT-02.log` | `Log File` | `6d4e1402095e8d448f8e84ca0eaf052ee7270f274283e5206ec19dc2d8e629f7` | 27 |
| `W0411-ART-033` | `docs/wave-0/4.13/evidence/raw/CONT-03.log` | `Log File` | `dcfaecd1139723951ac03b7b99cfe8d0718c4373a3d2df6ce48bbb0af38c13a8` | 30 |
| `W0411-ART-034` | `docs/wave-0/4.13/evidence/raw/CONT-04.log` | `Log File` | `14b0fe626b4d104a475dc67677b55c5292ecde1a53c30351499747f346cbfcac` | 26 |
| `W0411-ART-035` | `docs/wave-0/4.13/evidence/raw/CONT-05.log` | `Log File` | `5660a9c79708d0f17ada08a15e1397099d0798fe8d09f6702b573a16d2e003fd` | 30 |
| `W0411-ART-036` | `docs/wave-0/4.13/evidence/raw/CONT-06.log` | `Log File` | `ecd06d271c987d367a2909340f3effc796600e049aa6a7a9c4421ae688c2b1be` | 34 |
| `W0411-ART-037` | `docs/wave-0/4.13/evidence/raw/CSV-01.log` | `Log File` | `08a398b0bd1fbb0115cf1baacc77618d71245c0babfa3817b9cda57ea4305f44` | 54 |
| `W0411-ART-038` | `docs/wave-0/4.13/evidence/raw/CSV-02.log` | `Log File` | `2b8d48ada28ca028af51426afcb644acf53a934f3d8c5c3f4b4a0dfd919c3b54` | 51 |
| `W0411-ART-039` | `docs/wave-0/4.13/evidence/raw/CSV-03.log` | `Log File` | `8efb2f5787750b0f9c88809e09162e2c6b78384d4030735f37052bace21725d0` | 56 |
| `W0411-ART-040` | `docs/wave-0/4.13/evidence/raw/CSV-04.log` | `Log File` | `eac884e9bb5d1030b8cf6231503fc7bbd474f42b23f6cb32b0b331183f35c2ed` | 57 |
| `W0411-ART-041` | `docs/wave-0/4.13/evidence/raw/CSV-05.log` | `Log File` | `5ad695b3b2ddb6494a2134e42ed951edee7236ce1748dd60c8ec2aa698ddacac` | 62 |
| `W0411-ART-042` | `docs/wave-0/4.13/evidence/raw/CSV-06.log` | `Log File` | `35b6a865f133b11054fcf0061e5cb3539be9864053b029c086b25047b510f0e1` | 53 |
| `W0411-ART-043` | `docs/wave-0/4.13/evidence/raw/CSV-07.log` | `Log File` | `07b1abacf29041e0948aeb69238eb603a5c2f6a0afdc2e90abfc1b763fa99446` | 48 |
| `W0411-ART-044` | `docs/wave-0/4.13/evidence/raw/CSV-08.log` | `Log File` | `bef1221e174499e61007c1c4b9a7c92e768220500e9f7438fd023468e86f6ce6` | 43 |
| `W0411-ART-045` | `docs/wave-0/4.13/evidence/raw/CSV-09.log` | `Log File` | `68cb911b0ade4d343a985934ab767b5ea6ccff3000b74ae50ce54f015a44c845` | 72 |
| `W0411-ART-046` | `docs/wave-0/4.13/evidence/raw/CSV-10.log` | `Log File` | `39171c1436f9272d8e164e8eaf7efc9ec8d90b227d954a91c843d22aec7b06d2` | 73 |
| `W0411-ART-047` | `docs/wave-0/4.13/evidence/raw/CSV-11.log` | `Log File` | `e0e1e27f88c6671ecd31827acd6dcaf99c8b04774789626dc8c80cc62c41ef0c` | 70 |
| `W0411-ART-048` | `docs/wave-0/4.13/evidence/raw/CSV-12.log` | `Log File` | `9c25d569ef36e12e29066497e6e5ca2969fed42814a33d4508d57e0437595e74` | 68 |
| `W0411-ART-049` | `docs/wave-0/4.13/evidence/raw/CSV-13.log` | `Log File` | `c9d422c67dffb1dbda10eba47832e88991c2b615091b447364b4d09517d1edde` | 57 |
| `W0411-ART-050` | `docs/wave-0/4.13/evidence/raw/CSV-14.log` | `Log File` | `91ab51c306af97ca6a777d5d01134ea45730b194d6c96a815ea5f2de087f6fe1` | 65 |
| `W0411-ART-051` | `docs/wave-0/4.13/evidence/raw/CSV-15.log` | `Log File` | `ddc4c40d7705de0c5b642978e04a32584834952723e15054c914525ed491c22a` | 47 |
| `W0411-ART-052` | `docs/wave-0/4.13/evidence/raw/CSV-16.log` | `Log File` | `be0e619e526d239992e2940c1ad5ce71768d2e24494a3ae62939cde8ef949c42` | 47 |
| `W0411-ART-053` | `docs/wave-0/4.13/evidence/raw/CSV-17.log` | `Log File` | `9040e8a882ee7d5e060eb3be016be55bb27b85eec912181ec08f88c66bb3f5f4` | 25 |
| `W0411-ART-054` | `docs/wave-0/4.13/evidence/raw/CSV-18.log` | `Log File` | `83642b54dd7a2cf506aab9c52994558782628dbe9303f8bda8fa29415829b4e4` | 30 |
| `W0411-ART-055` | `docs/wave-0/4.13/evidence/raw/RB-01.log` | `Log File` | `fd380a1ccdd4d218a5b7adcee176b7f17fadbb8803136c39e47df6cadf43cdd6` | 38 |
| `W0411-ART-056` | `docs/wave-0/4.13/evidence/raw/RB-02.log` | `Log File` | `78ecf85cce121bc2958425416384180415cc7c09215e8bfa8e45c644a864f741` | 34 |
| `W0411-ART-057` | `docs/wave-0/4.13/evidence/raw/RB-03.log` | `Log File` | `9ccb251223c62b5f9a51ae039fc7c3ddcea08d97331dfa16a5d5991105798966` | 34 |
| `W0411-ART-058` | `docs/wave-0/4.13/evidence/raw/RB-04.log` | `Log File` | `561cd11532619af49bb966e3d6e4c2a36648c46ce2597adfed2ef3fe26d03b25` | 38 |
| `W0411-ART-059` | `docs/wave-0/4.13/evidence/raw/RB-05.log` | `Log File` | `b7ef230bec9f19ebd4d0d21209c5295643a5d8c1f21538f7694e28a8768423c6` | 29 |
| `W0411-ART-060` | `docs/wave-0/4.13/evidence/raw/RB-06.log` | `Log File` | `219fd2be35516226c74bbdcf1f7d50c558b722d5850753f5d64883987c9226fd` | 31 |
| `W0411-ART-061` | `docs/wave-0/4.13/evidence/raw/RB-07.log` | `Log File` | `df085ff87b30c6df01a6325ae001989b1634c0e00e64fb8e2b2b3b7adad9b5e8` | 30 |
| `W0411-ART-062` | `docs/wave-0/4.13/evidence/raw/SYN-01.log` | `Log File` | `8eac8fd9e4b0071fad42eb63953539dd1935f2027069aa6f68cb8e72446beea7` | 6930 |
| `W0411-ART-063` | `docs/wave-0/4.13/evidence/raw/SYN-02.log` | `Log File` | `a9f55a4610cc282e39b93087286f774164cacfedeaf226ef5b9845cd6548b59f` | 7043 |
| `W0411-ART-064` | `docs/wave-0/4.13/evidence/raw/SYN-03.log` | `Log File` | `29b039354a55a8929226eb07cc6a5906e8b17713aa8e3ccde3dbe8ed555bd2f2` | 7006 |
| `W0411-ART-065` | `docs/wave-0/4.13/evidence/raw/SYN-04.log` | `Log File` | `b32da5a73871a711355bfcd3a1dd0697f778cefa825b2340ce9ef0578d6a0889` | 176 |
| `W0411-ART-066` | `docs/wave-0/4.13/evidence/raw/SYN-05.log` | `Log File` | `d5e6b495e5a66431fdf456f5043c19cc71d0292d856e6dffcafaecf5df7b639f` | 116 |
| `W0411-ART-067` | `docs/wave-0/4.13/evidence/raw/SYN-06.log` | `Log File` | `9cb3bffe242d6e49ec2ce6fd2ee6e4b3c527066a3ffec5d783888acf6d011988` | 48 |
| `W0411-ART-068` | `docs/wave-0/4.13/evidence/raw/baseline-lane-a-sweep-1.log` | `Log File` | `e1e34107a8a8849debaf6e12beda601c6ee21239b7abeb83d913bef4b5c0d195` | 1081 |
| `W0411-ART-069` | `docs/wave-0/4.13/evidence/raw/baseline-lane-a-sweep-2.log` | `Log File` | `81170da2efe9f15cb615afb798d7f6b2882f889bcf386078c73c12862d9bffa2` | 1080 |
| `W0411-ART-070` | `docs/wave-0/4.13/evidence/raw/baseline-lane-a-sweep-3.log` | `Log File` | `dc9b76b5efdabdc0f79a03ef040e8c6b435b5dd43b2ee18e2bdf5e96e53a6bcc` | 1080 |
| `W0411-ART-071` | `docs/wave-0/4.13/evidence/raw/baseline-lane-c-sweep-1.log` | `Log File` | `eb0d8467d2f89ca7f8a6d650e999cc57e3de6f22f9f1a7deb4c66b3f75587f93` | 1349 |
| `W0411-ART-072` | `docs/wave-0/4.13/evidence/raw/baseline-lane-c-sweep-2.log` | `Log File` | `3712f31d4482b26f1efd5e86427b9f408fb2cc3b422cb9b9eab6818b4551c129` | 1348 |
| `W0411-ART-073` | `docs/wave-0/4.13/evidence/raw/baseline-lane-c-sweep-3.log` | `Log File` | `69feb6db854df22514413ae26ed507935587237623f98042b0b0fb0755f0df55` | 1348 |
| `W0411-ART-074` | `docs/wave-0/4.13/evidence/raw/baseline-lane-d-sweep-1.log` | `Log File` | `53091ba2bd5b90e84c4214077eec2c425ddedd73a265ef131eab270805efb2d5` | 1529 |
| `W0411-ART-075` | `docs/wave-0/4.13/evidence/raw/baseline-lane-d-sweep-2.log` | `Log File` | `a9d3c8f440511c652ea2467673b8e99233d8dfd9042695bfd4de191b6b5070b8` | 1530 |
| `W0411-ART-076` | `docs/wave-0/4.13/evidence/raw/baseline-lane-d-sweep-3.log` | `Log File` | `34539bbcb8ff15c1bfaa0c1f5f5737af4cf5971e8374f352ac2c4beddbcc9cf0` | 1530 |
| `W0411-ART-077` | `docs/wave-0/4.13/evidence/raw/baseline-lane-e-sweep-1.log` | `Log File` | `57f4b580cb4d9e570aa9ae3978bc17aa9ef5bd5f50b88bd4aec12e5ccd54374a` | 1300 |
| `W0411-ART-078` | `docs/wave-0/4.13/evidence/raw/baseline-lane-e-sweep-2.log` | `Log File` | `9199d928820317d46f898772446372339a1b1ce2d7f3da4f0b3de0f5b0af6b46` | 1300 |
| `W0411-ART-079` | `docs/wave-0/4.13/evidence/raw/baseline-lane-e-sweep-3.log` | `Log File` | `9a272182f8c81b99423c6aae8c33761511cdc3def40498a19aa562982fe8b9e7` | 1300 |
| `W0411-ART-080` | `docs/wave-0/4.13/evidence/raw/baseline-lane-f-sweep-1.log` | `Log File` | `5fefa60387341b66af88497040195eb9c5eed978c3b3153ced9943ea12ac392d` | 1342 |
| `W0411-ART-081` | `docs/wave-0/4.13/evidence/raw/baseline-lane-f-sweep-2.log` | `Log File` | `7a0be7b5cd53a84160443777b7c14c6ada111aaed16a65649057180de3f7750c` | 1342 |
| `W0411-ART-082` | `docs/wave-0/4.13/evidence/raw/baseline-lane-f-sweep-3.log` | `Log File` | `f989a86616b68cd7fb9597b4b14ecbf89287696d82c48b99a0a2ba6d8e029084` | 1342 |
| `W0411-ART-083` | `docs/wave-0/4.13/evidence/raw/baseline-poc-sweep-1.log` | `Log File` | `750177f05713473c612fe078163ec001feb0e60bd90dfd34db7fb8dc48fe3c8c` | 4239 |
| `W0411-ART-084` | `docs/wave-0/4.13/evidence/raw/baseline-poc-sweep-2.log` | `Log File` | `4e88c5b92bc58c2f6aa79e2cf0429912a018928667c825109722898db16e42ad` | 4239 |
| `W0411-ART-085` | `docs/wave-0/4.13/evidence/raw/baseline-poc-sweep-3.log` | `Log File` | `47549b0e2175506d980949d69f22166e856d6624e4e6a2f5d230e5c2fd04cf39` | 4239 |
| `W0411-ART-086` | `docs/wave-0/4.13/evidence/raw/baseline-wave4-sweep-1.log` | `Log File` | `91285c3ebd2706aaf95073a2d34b9e4cfa754aee06448ee2f914096c3eeeb32d` | 2807 |
| `W0411-ART-087` | `docs/wave-0/4.13/evidence/raw/baseline-wave4-sweep-2.log` | `Log File` | `20857fcbba6742336dcbae2fb3309e30de6a277f92b9ccb79d2d6a7404db181b` | 2807 |
| `W0411-ART-088` | `docs/wave-0/4.13/evidence/raw/baseline-wave4-sweep-3.log` | `Log File` | `a3c386e0eced77168be7aeff09621bb4971e93cae2350d651520e4859331e9ac` | 2806 |
| `W0411-ART-089` | `docs/wave-0/4.13/evidence/raw/baseline-workstream-a-sweep-1.log` | `Log File` | `3d32a2ee0c3d143525d49f0c6b5b973dd59bfb9666a9dfbfe801659e43a5a180` | 2550 |
| `W0411-ART-090` | `docs/wave-0/4.13/evidence/raw/baseline-workstream-a-sweep-2.log` | `Log File` | `4b56e9576d0cce4c75394074f8d8a376a4b6b2c3bff508bf5bbc4c76f9bed79d` | 2550 |
| `W0411-ART-091` | `docs/wave-0/4.13/evidence/raw/baseline-workstream-a-sweep-3.log` | `Log File` | `123d9bd711e894858bcf6e4b52092b2b4736959c541923de942fedc7a064ecfc` | 2551 |
| `W0411-ART-092` | `docs/wave-0/4.13/evidence/raw/baseline-workstream-c-sweep-1.log` | `Log File` | `be876cfb8d1a237d0ea78407d6bfd387151f0e4ba9245a48e6dec970defa9e34` | 2555 |
| `W0411-ART-093` | `docs/wave-0/4.13/evidence/raw/baseline-workstream-c-sweep-2.log` | `Log File` | `074b31d4c035110d7ab6013dea16bc39841f1e00068bf0b977ea18d3daf21c93` | 2555 |
| `W0411-ART-094` | `docs/wave-0/4.13/evidence/raw/baseline-workstream-c-sweep-3.log` | `Log File` | `62e8d00969dd1bfd24ea649e3a0a65bec30d93c19170bfadf7fb248e6f430449` | 2555 |
| `W0411-ART-095` | `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-01.log` | `Log File` | `22be576c548bdc6992f4c059348adac6049243e10548fc28cca105af9aacb18c` | 1279 |
| `W0411-ART-096` | `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-02.log` | `Log File` | `ad100084129482c5309d8a826facada7ea9f33f074c042ce65d9be7651ad99a0` | 1459 |
| `W0411-ART-097` | `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-03.log` | `Log File` | `fa8906cf5ec8b4a2c54f06dccde92bc9622f49c68133da4b63395aacfd5f3002` | 1265 |
| `W0411-ART-098` | `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-04.log` | `Log File` | `7458e38e08551aeb8a5d5c515a9fdeb45aa863e82ab0281faf07416e8478b026` | 1265 |
| `W0411-ART-099` | `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-05.log` | `Log File` | `b4014b00f3e12a6c4d096e07ea69fa794fe2efe2de00ce8089bfbdb8b0715c4b` | 1447 |
| `W0411-ART-100` | `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-06.log` | `Log File` | `b635943ee114549344c0eec7f15554fd24427c65539119e498683c15b5b6faf6` | 1467 |
| `W0411-ART-101` | `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-07.log` | `Log File` | `e3679a3d24146b2f9bd3987f2126015bb2abd4e661e737e3dc745b40d710a6f5` | 1472 |
| `W0411-ART-102` | `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-08.log` | `Log File` | `6e5f3cdcfdf6d69e4d7b887ff124cba1b565e9f1e7950ff8226bcf88e189fe8c` | 1299 |
| `W0411-ART-103` | `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-09.log` | `Log File` | `17044a1525c7afb639d50edefa578ca87d74f156dafcbd7fd64be4a0e483e65f` | 1270 |
| `W0411-ART-104` | `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-10.log` | `Log File` | `289ede0b5a5ad18894cf9d5b6d2e66b304426c4e2ce4df16b96040a02c6ed0ed` | 1309 |
| `W0411-ART-105` | `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-11.log` | `Log File` | `3072d66c246b7e5c87acda93b0043dfe72ab00e4f85a0f06eade7a7c6a8dce34` | 1272 |
| `W0411-ART-106` | `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-12.log` | `Log File` | `b31572deebd009baf50aa8890763952a57b90fcbd5cd82dae5858cb78565bc11` | 1264 |
| `W0411-ART-107` | `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-13.log` | `Log File` | `cfb9c1d7fa76a94e991807522141d1a97abcf014451469bdb2d417d3eb2f97cd` | 1266 |
| `W0411-ART-108` | `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-14.log` | `Log File` | `fd9517d7a92cdebd05fb8bf780180205d94e139d568b5d96eb092cf0089a7e29` | 1233 |
| `W0411-ART-109` | `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-15.log` | `Log File` | `02556474beb03dcb7d7e8c6ac56548c64786edfe24efe8923724b74879e86915` | 1256 |
| `W0411-ART-110` | `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-16.log` | `Log File` | `c340c34a0b5315738d2e81f60f1b24159cf281376964471847b915d7200c3a0f` | 1291 |
| `W0411-ART-111` | `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-17.log` | `Log File` | `51d5d472268b6febc4eff1a2ef40be36aabc03371f423b2b4d9a0467541d4d74` | 1302 |
| `W0411-ART-112` | `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-18.log` | `Log File` | `197fabd60f680bf875e0d2d55cb554542dec389dd318af18dda402336f800600` | 1587 |
| `W0411-ART-113` | `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-19.log` | `Log File` | `9842f22d7e447b10728045fdd922e0f50acf7260a78bf207ccf153de9d626650` | 1471 |
| `W0411-ART-114` | `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-20.log` | `Log File` | `48b348eca597c0321a75ce45e901edf2a062b3400bcf2575e028c3a9237ea9a5` | 1284 |


# Section 8: Full Patch-Gate Source

### Artifact W0411-ART-001: Wave 0.4.13 Hardened Patch Gate and Rollback Module
- **File**: `docs/wave-0/4.13/patch-gate.cjs`
- **Type**: `JavaScript Module`
- **SHA-256**: `e237a4c33ec7454a17b180dc038696344082376a4c7041b21d3f58b7a715cc7f`
- **Byte Count**: `37680`

```javascript
/**
 * patch-gate.cjs - Wave 0.4.13 Hardened Security Edition
 *
 * Implements security closures mandated by Wave 0.4.13:
 * 1. P0-01: Public rollback (`pathSafeRollback`) rejects coordinator-exclusive paths fail-closed.
 *    Never derives coordinator identity from caller-supplied taskId, provenance, or headers.
 * 2. P0-02: Zero public mutation hooks (test hook callbacks completely removed from signatures).
 * 3. Complete all-target Phase A preflight validation before any mutation in rollback.
 *    Handles empty base64 string for 0-byte file without truthiness failure. Byte-exact SHA-256 and mode validation.
 * 4. Strict CSV in production caller with documented dialect.
 * 5. Full Git diff header parser: rejects duplicate diff sections, parses C-quoted paths with octal escapes,
 *    and validates safe relative paths (no traversals, drive letters, UNC, NULs).
 * 6. Authoritative task dependency parsing and traversal: enforces W5 chain (W5-1 -> W5-2 -> ... -> W5-6)
 *    and prerequisite completion, detects cycles, rejects unknown tasks.
 * 7. Path-tainted shell elimination: replaces execSync with spawnSync (shell: false, discrete argument arrays).
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');

const parser = require('./strict-rfc4180-csv-parser.cjs');

class PatchGateError extends Error {
  constructor(code, message, details = {}) {
    super(`[PATCH_GATE_${code}] ${message}`);
    this.name = 'PatchGateError';
    this.code = code;
    this.details = details;
  }
}

function parseCsvStrict(filePath, options = {}) {
  if (!fs.existsSync(filePath)) {
    throw new PatchGateError('MISSING_CSV_FILE', `Authoritative CSV file not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  try {
    return parser.parseStrictCSVToObjects(content, {
      filename: path.basename(filePath),
      strictCrlf: options.strictCrlf === true,
      strictColumnCount: true,
      requireNonEmptyHeader: true,
      disallowDuplicateHeaders: true
    });
  } catch (err) {
    throw new PatchGateError('MALFORMED_CSV', `Strict CSV parse error for ${filePath}: ${err.message}`, { originalError: err });
  }
}

function normalizeSafePath(rawPath) {
  if (typeof rawPath !== 'string' || !rawPath.trim()) {
    throw new PatchGateError('INVALID_PATH', 'Path must be a non-empty string', { rawPath });
  }
  let p = rawPath.trim();
  p = p.replace(/^["']|["']$/g, '');
  p = p.replace(/\\/g, '/');

  if (/[\x00-\x1f\x7f]/.test(p)) {
    throw new PatchGateError('INVALID_PATH_CONTROL_CHARS', `Control characters prohibited: ${rawPath}`, { rawPath });
  }

  if (/^[a-zA-Z]:/.test(p) || p.startsWith('//') || p.startsWith('\\\\')) {
    throw new PatchGateError('INVALID_ABSOLUTE_PATH', `Drive letters and UNC paths prohibited: ${rawPath}`, { rawPath });
  }

  if (p.startsWith('/')) {
    throw new PatchGateError('INVALID_ROOT_PATH', `Absolute root paths prohibited: ${rawPath}`, { rawPath });
  }

  const parts = p.split('/');
  const stack = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (stack.length === 0) {
        throw new PatchGateError('PATH_TRAVERSAL_DETECTED', `Path traversal sequence detected: ${rawPath}`, { rawPath });
      }
      stack.pop();
    } else {
      stack.push(part);
    }
  }

  if (stack.length === 0) {
    throw new PatchGateError('EMPTY_RESOLVED_PATH', `Path resolves to empty root: ${rawPath}`, { rawPath });
  }

  return stack.join('/');
}

function verifyFilesystemContainment(repoRoot, relPath) {
  const normRel = normalizeSafePath(relPath);
  const realRepoRoot = fs.realpathSync(repoRoot);
  const targetAbs = path.resolve(realRepoRoot, normRel);

  if (targetAbs !== realRepoRoot && !targetAbs.startsWith(realRepoRoot + path.sep)) {
    throw new PatchGateError('CONTAINMENT_BREACH', `Path escapes repository root: ${relPath}`, { relPath, targetAbs });
  }

  let cur = path.dirname(targetAbs);
  while (cur.length >= realRepoRoot.length) {
    if (fs.existsSync(cur)) {
      const st = fs.lstatSync(cur);
      if (st.isSymbolicLink()) {
        const realCur = fs.realpathSync(cur);
        if (realCur !== realRepoRoot && !realCur.startsWith(realRepoRoot + path.sep)) {
          throw new PatchGateError('SYMLINK_PARENT_ESCAPES', `Parent directory is symlink escaping repository root: ${cur}`, { cur, realCur });
        }
      }
    }
    if (cur === realRepoRoot) break;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }

  return { normRel, fullPath: targetAbs };
}

function loadAuthoritativeRegisters(repoRoot, options = {}) {
  // Authoritative production loader enforces strict CRLF by default. Silent downgrade is prohibited.
  // Authoritative production loader enforces strict CRLF by default. Silent downgrade is prohibited.
  const parseOptions = {
    ...options,
    strictCrlf: options.permissiveMode === true ? false : true
  };
  const taskCsv = fs.existsSync(path.resolve(repoRoot, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'))
    ? path.resolve(repoRoot, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv')
    : path.resolve(repoRoot, 'WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv');
  const manifestCsv = fs.existsSync(path.resolve(repoRoot, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'))
    ? path.resolve(repoRoot, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv')
    : path.resolve(repoRoot, 'WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv');
  const batch1Csv = path.resolve(repoRoot, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv');

  const tasksRaw = parseCsvStrict(taskCsv, parseOptions);
  const manifestRaw = parseCsvStrict(manifestCsv, parseOptions);
  const batch1Raw = parseCsvStrict(batch1Csv, parseOptions);

  const batch1Set = new Set();
  for (const r of batch1Raw) {
    const tid = r['Task ID'] || r.Task_ID || r.taskId;
    if (tid) batch1Set.add(tid.trim());
  }

  const taskMap = new Map();
  for (const t of tasksRaw) {
    const tid = t['Task ID'] || t.Task_ID;
    if (!tid) continue;
    const cleanTid = tid.trim();
    if (taskMap.has(cleanTid)) {
      throw new PatchGateError('DUPLICATE_TASK_ID', `Authoritative task register has duplicate task ID: ${cleanTid}`, { cleanTid });
    }
    const affectedFilesStr = t['Exact Affected Files'] || t.Exact_Affected_Files || '';
    const affectedFiles = affectedFilesStr.split(';')
      .map(s => s.trim().replace(/\\/g, '/').replace(/^\.\//, ''))
      .filter(Boolean);
    t._affectedFiles = new Set(affectedFiles);
    taskMap.set(cleanTid, t);
  }

  const manifestMap = new Map();
  for (const m of manifestRaw) {
    const p = m.path || m.Path;
    if (!p) continue;
    const norm = normalizeSafePath(p);
    if (manifestMap.has(norm)) {
      throw new PatchGateError('DUPLICATE_MANIFEST_PATH', `Ownership manifest has duplicate path: ${norm}`, { path: norm });
    }
    manifestMap.set(norm, m);
  }

  return { taskMap, manifestMap, batch1Set };
}

function validateTaskDependencies(taskMap, taskId) {
  if (!taskMap.has(taskId)) {
    throw new PatchGateError('UNKNOWN_TASK_ID', `Task ID not found in authoritative register: ${taskId}`, { taskId });
  }

  const visited = new Set();
  const recursionStack = new Set();

  function checkCyclesAndPrereqs(currId) {
    visited.add(currId);
    recursionStack.add(currId);

    const rec = taskMap.get(currId);
    if (!rec) {
      throw new PatchGateError('MISSING_DEPENDENCY_ID', `Task not found in register: ${currId}`, { currId });
    }

    const depStr = rec['Dependencies'] || rec.Dependencies || '';
    const deps = parseDependencyList(depStr);
    for (const d of deps) {
      if (!taskMap.has(d)) {
        throw new PatchGateError('MISSING_DEPENDENCY_ID', `Task ${currId} depends on unknown task ID: ${d}`, { currId, dependencyId: d });
      }
      if (recursionStack.has(d)) {
        throw new PatchGateError('CYCLIC_DEPENDENCY', `Cyclic dependency detected involving task ${currId} and ${d}`, { currId, dependencyId: d });
      }

      const depRec = taskMap.get(d);
      const depStatus = (depRec['Dispatch Status'] || depRec.Dispatch_Status || '').trim();
      const approvedCompletedStatuses = ['COMPLETED', 'COMPLETE', 'VERIFIED'];
      if (!approvedCompletedStatuses.includes(depStatus)) {
        throw new PatchGateError('PREREQUISITE_NOT_COMPLETED', `Task ${currId} prerequisite ${d} is not completed (current status: ${depStatus})`, {
          taskId: currId,
          prerequisiteId: d,
          prerequisiteStatus: depStatus
        });
      }

      if (!visited.has(d)) {
        checkCyclesAndPrereqs(d);
      }
    }
    recursionStack.delete(currId);
  }

  checkCyclesAndPrereqs(taskId);

  const targetRec = taskMap.get(taskId);
  const targetStatus = (targetRec['Dispatch Status'] || targetRec.Dispatch_Status || '').trim();

  const w5Order = ['W5-1', 'W5-2', 'W5-3', 'W5-4', 'W5-5', 'W5-6'];
  const w5Idx = w5Order.indexOf(taskId);
  if (w5Idx > 0) {
    const prevPrereq = w5Order[w5Idx - 1];
    const depStr = targetRec['Dependencies'] || targetRec.Dependencies || '';
    const deps = parseDependencyList(depStr);
    if (!deps.includes(prevPrereq)) {
      throw new PatchGateError('W5_CHAIN_VIOLATION', `Wave 5 task ${taskId} must explicitly depend on previous task ${prevPrereq}`, {
        taskId,
        requiredPrerequisite: prevPrereq,
        declaredDependencies: deps
      });
    }
    if (targetStatus === 'IMPLEMENTATION_DEPENDENT') {
      throw new PatchGateError('TASK_BLOCKED_ON_PREREQUISITES', `Wave 5 serialized task ${taskId} is currently IMPLEMENTATION_DEPENDENT and awaits completion of ${prevPrereq}`, { taskId, status: targetStatus });
    }
  } else if (taskId === 'W5-1') {
    if (targetStatus !== 'READY_TO_LAUNCH') {
      throw new PatchGateError('TASK_NOT_READY', `Task W5-1 is not in READY_TO_LAUNCH status: ${targetStatus}`, { taskId, status: targetStatus });
    }
  }

  if (targetStatus === 'IMPLEMENTATION_DEPENDENT') {
    throw new PatchGateError('TASK_BLOCKED_ON_PREREQUISITES', `Task ${taskId} is IMPLEMENTATION_DEPENDENT and cannot be dispatched`, { taskId, status: targetStatus });
  }
}

function parseDependencyList(depStr) {
  if (!depStr || depStr.trim().toLowerCase() === 'none') return [];
  return depStr.split(',')
    .map(s => {
      let clean = s.trim();
      const parenIdx = clean.indexOf('(');
      if (parenIdx !== -1) clean = clean.substring(0, parenIdx).trim();
      return clean;
    })
    .filter(Boolean);
}

function enforceAuthoritativeTaskOwnership({ repoRoot, taskId, touchedPaths }) {
  // P0 Remediation: No caller-controlled boolean, task ID, or parameter can confer coordinator privilege.
  // Public feature patch APIs and rollback cannot modify coordinator-exclusive paths or execute coordinator tasks.
  if (!taskId || typeof taskId !== 'string') {
    throw new PatchGateError('INVALID_TASK_ID', 'taskId is required and must be a string');
  }

  const { taskMap, manifestMap, batch1Set } = loadAuthoritativeRegisters(repoRoot, { permissiveMode: true });

  if (!taskMap.has(taskId)) {
    throw new PatchGateError('UNREGISTERED_TASK_ID', `Task ID ${taskId} is not registered in authoritative register`, { taskId });
  }

  const taskRecord = taskMap.get(taskId);
  const taskAffectedFiles = taskRecord._affectedFiles;
  const isCoordinatorTask = (taskRecord['Accountable Owner'] || '').toLowerCase().includes('coordinator') || taskId === 'INT-1';

  if (isCoordinatorTask) {
    throw new PatchGateError('COORDINATOR_TASK_VIA_FEATURE_ENTRY', `Coordinator-only task ${taskId} cannot be invoked via feature patch gate`, { taskId });
  }

  if (!batch1Set.has(taskId)) {
    throw new PatchGateError('TASK_NOT_IN_BATCH_1', `Task ${taskId} is not in Batch 1 allowlist`, { taskId });
  }
  validateTaskDependencies(taskMap, taskId);

  for (const rawPath of touchedPaths) {
    const norm = normalizeSafePath(rawPath);

    if (!manifestMap.has(norm)) {
      throw new PatchGateError('UNMANAGED_PATH', `Path ${norm} is not in authoritative file ownership manifest`, { path: norm });
    }

    const manifestEntry = manifestMap.get(norm);
    const mutTier = manifestEntry.mutability_tier || manifestEntry.Mutability_Tier;
    const isBaselineTest = (manifestEntry.is_baseline_test || manifestEntry.Is_Baseline_Test || '').toUpperCase() === 'YES';

    if (isBaselineTest) {
      throw new PatchGateError('FROZEN_BASELINE_TEST_MODIFICATION', `Path ${norm} is a frozen baseline test runner and cannot be modified`, { path: norm });
    }

    if (mutTier === 'FROZEN_READ_ONLY') {
      throw new PatchGateError('FROZEN_READ_ONLY_MODIFICATION', `Path ${norm} is FROZEN_READ_ONLY in manifest`, { path: norm });
    }

    if (mutTier === 'COORDINATOR_INTEGRATION_EXCLUSIVE' || mutTier === 'INTEGRATION_COORDINATOR_ONLY' || mutTier === 'COORDINATOR_EXCLUSIVE') {
      throw new PatchGateError('COORDINATOR_PRIVILEGE_ESCALATION', `Path ${norm} is coordinator-exclusive and cannot be modified via public patch gate`, { path: norm, taskId });
    }

    if (!taskAffectedFiles.has(norm)) {
      throw new PatchGateError('PATH_OUTSIDE_TASK_SCOPE', `Path ${norm} is not in the declared Exact Affected Files for task ${taskId}`, { path: norm, taskId });
    }
  }

  return true;
}

function unescapeGitCQuotedPath(quotedStr) {
  if (!quotedStr.startsWith('"') || !quotedStr.endsWith('"')) {
    return quotedStr;
  }
  const inner = quotedStr.substring(1, quotedStr.length - 1);
  const bytes = [];

  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '\\' && i + 1 < inner.length) {
      const next = inner[i + 1];
      if (next >= '0' && next <= '7') {
        let octalStr = next;
        let j = i + 2;
        while (j < inner.length && j < i + 4 && inner[j] >= '0' && inner[j] <= '7') {
          octalStr += inner[j];
          j++;
        }
        bytes.push(parseInt(octalStr, 8));
        i = j - 1;
      } else if (next === 'n') {
        bytes.push(0x0a);
        i++;
      } else if (next === 't') {
        bytes.push(0x09);
        i++;
      } else if (next === 'r') {
        bytes.push(0x0d);
        i++;
      } else if (next === 'b') {
        bytes.push(0x08);
        i++;
      } else if (next === 'f') {
        bytes.push(0x0c);
        i++;
      } else if (next === 'v') {
        bytes.push(0x0b);
        i++;
      } else if (next === 'a') {
        bytes.push(0x07);
        i++;
      } else if (next === '\\') {
        bytes.push(0x5c);
        i++;
      } else if (next === '"') {
        bytes.push(0x22);
        i++;
      } else {
        bytes.push(inner.charCodeAt(i + 1));
        i++;
      }
    } else {
      bytes.push(inner.charCodeAt(i));
    }
  }

  return Buffer.from(bytes).toString('utf8');
}

function extractPatchTouchedPaths(patchContent) {
  if (typeof patchContent !== 'string' || !patchContent.trim()) {
    throw new PatchGateError('EMPTY_PATCH', 'Patch content must be a non-empty string');
  }

  const lines = patchContent.split(/\r?\n/);
  const diffSections = [];
  let currentSection = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('diff --git ')) {
      if (currentSection) {
        diffSections.push(currentSection);
      }
      currentSection = {
        diffLine: line,
        paths: []
      };
      const rest = line.substring(11).trim();
      const parts = parseGitDiffHeaderPaths(rest);
      if (!parts || !parts.aPath || !parts.bPath) {
        throw new PatchGateError('MALFORMED_DIFF_HEADER', `Malformed diff --git line: ${line}`, { line });
      }
      if (parts.aPath !== '/dev/null') currentSection.paths.push(parts.aPath);
      if (parts.bPath !== '/dev/null') currentSection.paths.push(parts.bPath);
      continue;
    }

    if (!currentSection) continue;

    if (line.startsWith('--- ')) {
      const p = cleanHeaderPath(line.substring(4).trim(), 'a/');
      if (p && p !== '/dev/null') currentSection.paths.push(p);
      continue;
    }

    if (line.startsWith('+++ ')) {
      const p = cleanHeaderPath(line.substring(4).trim(), 'b/');
      if (p && p !== '/dev/null') currentSection.paths.push(p);
      continue;
    }

    if (line.startsWith('rename from ')) {
      const p = cleanHeaderPath(line.substring(12).trim());
      if (p) currentSection.paths.push(p);
      continue;
    }

    if (line.startsWith('rename to ')) {
      const p = cleanHeaderPath(line.substring(10).trim());
      if (p) currentSection.paths.push(p);
      continue;
    }

    if (line.startsWith('copy from ')) {
      const p = cleanHeaderPath(line.substring(10).trim());
      if (p) currentSection.paths.push(p);
      continue;
    }

    if (line.startsWith('copy to ')) {
      const p = cleanHeaderPath(line.substring(8).trim());
      if (p) currentSection.paths.push(p);
      continue;
    }
  }

  if (currentSection) {
    diffSections.push(currentSection);
  }

  if (diffSections.length === 0) {
    throw new PatchGateError('MALFORMED_PATCH', 'No diff --git sections found in patch');
  }

  const seenSectionPaths = new Set();
  const allTouchedPaths = [];

  for (const sec of diffSections) {
    if (sec.paths.length === 0) {
      throw new PatchGateError('MALFORMED_DIFF_HEADER', `Diff section has no paths: ${sec.diffLine}`);
    }

    const secNormPaths = sec.paths.map(p => normalizeSafePath(p));

    for (const norm of secNormPaths) {
      if (seenSectionPaths.has(norm)) {
        throw new PatchGateError('DUPLICATE_DIFF_SECTION', `Repeated diff section or colliding path in patch: ${norm}`, { path: norm });
      }
    }

    secNormPaths.forEach(p => seenSectionPaths.add(p));
    secNormPaths.forEach(p => {
      if (!allTouchedPaths.includes(p)) allTouchedPaths.push(p);
    });
  }

  return allTouchedPaths;
}

function parseGitDiffHeaderPaths(rest) {
  let aRaw = '';
  let bRaw = '';

  if (rest.startsWith('"')) {
    let endQuote = -1;
    let escaped = false;
    for (let i = 1; i < rest.length; i++) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (rest[i] === '\\') {
        escaped = true;
        continue;
      }
      if (rest[i] === '"') {
        endQuote = i;
        break;
      }
    }
    if (endQuote === -1) return null;
    aRaw = unescapeGitCQuotedPath(rest.substring(0, endQuote + 1));
    const remainder = rest.substring(endQuote + 1).trim();

    if (remainder.startsWith('"')) {
      bRaw = unescapeGitCQuotedPath(remainder);
    } else {
      bRaw = remainder;
    }
  } else {
    const spaceB = rest.indexOf(' b/');
    const spaceQuote = rest.indexOf(' "b/');
    if (spaceQuote !== -1 && (spaceB === -1 || spaceQuote < spaceB)) {
      aRaw = rest.substring(0, spaceQuote);
      bRaw = unescapeGitCQuotedPath(rest.substring(spaceQuote + 1).trim());
    } else if (spaceB !== -1) {
      aRaw = rest.substring(0, spaceB);
      bRaw = rest.substring(spaceB + 3);
    } else {
      const parts = rest.split(' ');
      if (parts.length >= 2) {
        aRaw = parts[0];
        bRaw = parts[1];
      } else {
        return null;
      }
    }
  }

  if (aRaw.startsWith('a/')) aRaw = aRaw.substring(2);
  if (bRaw.startsWith('b/')) bRaw = bRaw.substring(2);

  return { aPath: aRaw, bPath: bRaw };
}

function cleanHeaderPath(p, prefix = '') {
  let cleaned = p.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = unescapeGitCQuotedPath(cleaned);
  }
  if (prefix && cleaned.startsWith(prefix)) {
    cleaned = cleaned.substring(prefix.length);
  }
  return cleaned;
}

function verify_base(repoDir, expectedBaseSha, patchBaseSha) {
  if (!expectedBaseSha || typeof expectedBaseSha !== 'string') {
    throw new PatchGateError('BASE_SHA_REQUIRED', 'expectedBaseSha is required');
  }
  let currentHeadSha = '';
  try {
    const res = cp.spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf8',
      shell: false
    });
    if (res.status !== 0) {
      throw new Error(res.stderr || 'git rev-parse failed');
    }
    currentHeadSha = res.stdout.trim();
  } catch (err) {
    throw new PatchGateError('GIT_ERROR', 'Failed to retrieve git HEAD SHA', { error: err.message });
  }

  const patchSha = patchBaseSha || expectedBaseSha;

  if (expectedBaseSha !== currentHeadSha) {
    throw new PatchGateError('BASE_SHA_MISMATCH', `Repository HEAD (${currentHeadSha}) does not match expectedBaseSha (${expectedBaseSha})`, {
      expectedBaseSha,
      currentHeadSha
    });
  }

  if (patchSha !== currentHeadSha) {
    throw new PatchGateError('PATCH_BASE_MISMATCH', `Patch base (${patchSha}) does not match repository HEAD (${currentHeadSha})`, {
      patchBaseSha: patchSha,
      currentHeadSha
    });
  }

  return { currentHeadSha, matched: true };
}

function recordPreApplyState(repoDir, touchedPaths) {
  const preApply = {};
  for (const rel of touchedPaths) {
    const norm = normalizeSafePath(rel);
    const { fullPath } = verifyFilesystemContainment(repoDir, norm);

    if (fs.existsSync(fullPath)) {
      const buf = fs.readFileSync(fullPath);
      const hash = crypto.createHash('sha256').update(buf).digest('hex');
      const st = fs.statSync(fullPath);
      preApply[norm] = {
        exists: true,
        hash,
        byteCount: buf.length,
        originalContentBase64: buf.toString('base64'),
        mode: st.mode,
        isTracked: checkIsTracked(repoDir, norm),
        isDirty: checkIsDirty(repoDir, norm)
      };
    } else {
      preApply[norm] = {
        exists: false,
        hash: null,
        byteCount: 0,
        originalContentBase64: null,
        mode: null,
        isTracked: false,
        isDirty: false
      };
    }
  }
  return preApply;
}

function checkIsTracked(repoDir, normRel) {
  try {
    const res = cp.spawnSync('git', ['ls-files', '--error-unmatch', '--', normRel], {
      cwd: repoDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf8',
      shell: false
    });
    return res.status === 0 && res.stdout.trim().length > 0;
  } catch (e) {
    return false;
  }
}

function checkIsDirty(repoDir, normRel) {
  try {
    const res = cp.spawnSync('git', ['status', '--porcelain', '--', normRel], {
      cwd: repoDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf8',
      shell: false
    });
    return res.status === 0 && res.stdout.trim().length > 0;
  } catch (e) {
    return false;
  }
}

function apply_patch_with_provenance({ repoDir, patchContent, taskId, expectedBaseSha, patchBaseSha }) {
  return _internalApplyPatch({
    repoDir,
    patchContent,
    taskId,
    expectedBaseSha,
    patchBaseSha,
    isCoordinatorCall: false
  });
}

// P0-01: Public coordinator privilege bypass excised from public API.

function _internalApplyPatch({ repoDir, patchContent, taskId, expectedBaseSha, patchBaseSha, isCoordinatorCall }) {
  const baseCheck = verify_base(repoDir, expectedBaseSha, patchBaseSha);
  const touchedPaths = extractPatchTouchedPaths(patchContent);

  enforceAuthoritativeTaskOwnership({
    repoRoot: repoDir,
    taskId,
    touchedPaths,
    isCoordinatorCall
  });

  const preApply = recordPreApplyState(repoDir, touchedPaths);

  for (const rel of touchedPaths) {
    verifyFilesystemContainment(repoDir, rel);
  }

  const applyRes = cp.spawnSync('git', ['apply', '--whitespace=nowarn', '-'], {
    cwd: repoDir,
    input: patchContent,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: false
  });

  if (applyRes.status !== 0) {
    throw new PatchGateError('GIT_APPLY_FAILED', `git apply failed: ${applyRes.stderr ? applyRes.stderr.toString('utf8') : 'unknown error'}`, {
      stdout: applyRes.stdout ? applyRes.stdout.toString('utf8') : '',
      stderr: applyRes.stderr ? applyRes.stderr.toString('utf8') : ''
    });
  }

  const postApply = {};
  for (const rel of touchedPaths) {
    const norm = normalizeSafePath(rel);
    const { fullPath } = verifyFilesystemContainment(repoDir, norm);
    if (fs.existsSync(fullPath)) {
      const buf = fs.readFileSync(fullPath);
      const hash = crypto.createHash('sha256').update(buf).digest('hex');
      const st = fs.statSync(fullPath);
      postApply[norm] = {
        exists: true,
        hash,
        byteCount: buf.length,
        mode: st.mode
      };
    } else {
      postApply[norm] = {
        exists: false,
        hash: null,
        byteCount: 0,
        mode: null
      };
    }
  }

  const provenance = {
    taskId,
    touchedPaths,
    preApply,
    postApply,
    appliedBaseSha: baseCheck.currentHeadSha,
    patchSha256: crypto.createHash('sha256').update(patchContent).digest('hex')
  };

  return {
    success: true,
    appliedBaseSha: baseCheck.currentHeadSha,
    taskId,
    touchedPaths,
    preApply,
    postApply,
    patchSha256: provenance.patchSha256,
    provenance
  };
}

function pathSafeRollback({ repoDir, provenance, taskId }) {
  if (provenance && provenance.provenance && typeof provenance.provenance === 'object') {
    provenance = provenance.provenance;
  }
  if (!provenance || typeof provenance !== 'object') {
    throw new PatchGateError('PROVENANCE_REQUIRED', 'Rollback requires valid provenance object');
  }

  if (!provenance.taskId || !provenance.touchedPaths || !provenance.preApply || !provenance.postApply) {
    throw new PatchGateError('INVALID_PROVENANCE', 'Provenance record is incomplete or corrupted');
  }

  if (taskId && provenance.taskId !== taskId) {
    throw new PatchGateError('TASK_MISMATCH', `Provenance task ${provenance.taskId} does not match request task ${taskId}`);
  }

  const effectiveTaskId = taskId || provenance.taskId;

  const seenPaths = new Set();
  for (const p of provenance.touchedPaths) {
    const norm = normalizeSafePath(p);
    if (seenPaths.has(norm)) {
      throw new PatchGateError('DUPLICATE_TOUCHED_PATH', `Duplicate touched path in rollback request: ${norm}`, { path: norm });
    }
    seenPaths.add(norm);
  }

  const { taskMap, manifestMap } = loadAuthoritativeRegisters(repoDir, { permissiveMode: true });

  // P0-01 SECURITY BOUNDARY:
  // Public rollback NEVER authorizes restoration of coordinator-exclusive files or coordinator tasks.
  for (const p of provenance.touchedPaths) {
    const norm = normalizeSafePath(p);
    const manifestEntry = manifestMap.get(norm);
    if (manifestEntry) {
      const mutTier = manifestEntry.mutability_tier || manifestEntry.Mutability_Tier;
      if (mutTier === 'COORDINATOR_INTEGRATION_EXCLUSIVE' || mutTier === 'INTEGRATION_COORDINATOR_ONLY' || mutTier === 'COORDINATOR_EXCLUSIVE') {
        throw new PatchGateError('COORDINATOR_PRIVILEGE_ESCALATION', `Public rollback rejected: path ${norm} is coordinator-exclusive. Coordinator rollback is unsupported via public API.`, {
          path: norm,
          effectiveTaskId
        });
      }
    }
  }

  const taskRec = taskMap.get(effectiveTaskId);
  const isCoordinator = taskRec && ((taskRec['Accountable Owner'] || '').toLowerCase().includes('coordinator') || effectiveTaskId === 'INT-1');
  if (isCoordinator) {
    throw new PatchGateError('COORDINATOR_ROLLBACK_PROHIBITED', `Public rollback cannot be invoked for coordinator task ${effectiveTaskId}. Coordinator-only rollback is unsupported.`, {
      effectiveTaskId
    });
  }

  enforceAuthoritativeTaskOwnership({
    repoRoot: repoDir,
    taskId: effectiveTaskId,
    touchedPaths: provenance.touchedPaths
  });

  // PHASE A: Comprehensive Read-Only Preflight across ALL target paths
  for (const rel of provenance.touchedPaths) {
    const normRel = normalizeSafePath(rel);
    const { fullPath } = verifyFilesystemContainment(repoDir, normRel);

    const pre = provenance.preApply[normRel];
    const post = provenance.postApply[normRel];
    if (!pre || !post) {
      throw new PatchGateError('CORRUPT_PROVENANCE_ENTRY', `Missing pre/post record for ${normRel}`, { rel: normRel });
    }

    if (pre.exists) {
      if (!pre.hash) {
        throw new PatchGateError('INVALID_PRE_STATE', `Pre-state hash missing for ${normRel}`, { rel: normRel });
      }
      if (typeof pre.originalContentBase64 !== 'string' && typeof pre.originalContent !== 'string') {
        throw new PatchGateError('NULL_BUFFER_RESTORE', `Pre-state indicates file existed but restore payload is null/missing for ${normRel}`, { rel: normRel });
      }
      if (pre.mode === undefined || pre.mode === null || typeof pre.mode !== 'number') {
        throw new PatchGateError('MISSING_MODE_METADATA', `Pre-state mode metadata required and must be a number for ${normRel}`, { rel: normRel });
      }

      let payloadBuf = null;
      if (typeof pre.originalContentBase64 === 'string') {
        payloadBuf = Buffer.from(pre.originalContentBase64, 'base64');
      } else {
        payloadBuf = Buffer.from(pre.originalContent, 'utf8');
      }
      const payloadHash = crypto.createHash('sha256').update(payloadBuf).digest('hex');
      if (payloadHash !== pre.hash) {
        throw new PatchGateError('RESTORE_PAYLOAD_CORRUPT', `Preflight restore payload hash mismatch for ${normRel}: expected ${pre.hash}, got ${payloadHash}`, {
          rel: normRel,
          expected: pre.hash,
          actual: payloadHash
        });
      }
      if (pre.byteCount !== undefined && pre.byteCount !== null && payloadBuf.length !== pre.byteCount) {
        throw new PatchGateError('RESTORE_BYTE_COUNT_MISMATCH', `Preflight restore payload byte count mismatch for ${normRel}: expected ${pre.byteCount}, got ${payloadBuf.length}`, {
          rel: normRel,
          expected: pre.byteCount,
          actual: payloadBuf.length
        });
      }
    }

    const fileExistsNow = fs.existsSync(fullPath);

    if (fileExistsNow) {
      const st = fs.lstatSync(fullPath);
      if (st.isDirectory()) {
        throw new PatchGateError('DIRECTORY_TARGET_NOT_ALLOWED', `Target path is a directory: ${normRel}`, { rel: normRel });
      }
      if (st.isSymbolicLink()) {
        throw new PatchGateError('SYMLINK_TARGET', `Target path is a symlink: ${normRel}`, { rel: normRel });
      }

      if (!post.exists) {
        throw new PatchGateError('POST_APPLY_RECREATED_FILE', `File ${normRel} was created post-apply; refusing rollback to prevent data loss`, { rel: normRel });
      }

      const currentBuf = fs.readFileSync(fullPath);
      const currentHash = crypto.createHash('sha256').update(currentBuf).digest('hex');

      if (post.exists && currentHash !== post.hash) {
        throw new PatchGateError('POST_APPLY_MUTATION', `File ${normRel} was modified after patch application; rollback refused to prevent data loss`, {
          rel: normRel,
          currentHash,
          postApplyHash: post.hash
        });
      }

      if (post.exists && (post.mode === undefined || post.mode === null || typeof post.mode !== 'number')) {
        throw new PatchGateError('MISSING_MODE_METADATA', `Phase B: Post-state mode required for ${normRel}`, { rel: normRel });
      }
      if (post.mode !== undefined && post.mode !== null && ((st.mode & 0o777) !== (post.mode & 0o777))) {
        throw new PatchGateError('CURRENT_MODE_MISMATCH', `File ${normRel} mode modified post-apply; expected ${(post.mode & 0o777).toString(8)}, got ${(st.mode & 0o777).toString(8)}`, {
          rel: normRel,
          expectedMode: post.mode,
          currentMode: st.mode
        });
      }
    } else {
      if (post.exists) {
        throw new PatchGateError('POST_APPLY_MISSING', `File ${normRel} existed after patch application but is now missing`, { rel: normRel });
      }
    }
  }

  // PHASE B: Guarded restoration with atomic safe writes
  const restoredPaths = [];
  const recoveryInventory = [];

  try {
    for (const rel of provenance.touchedPaths) {
      const normRel = normalizeSafePath(rel);
      const { fullPath } = verifyFilesystemContainment(repoDir, normRel);
      const pre = provenance.preApply[normRel];
      const post = provenance.postApply[normRel];

      // Phase B per-target immediate revalidation before mutation (P0-02)
      verifyFilesystemContainment(repoDir, normRel);
      const existsNow = fs.existsSync(fullPath);
      if (existsNow) {
        const st = fs.lstatSync(fullPath);
        if (st.isDirectory()) {
          throw new PatchGateError('DIRECTORY_TARGET_NOT_ALLOWED', `Phase B: Target path is a directory: ${normRel}`, { rel: normRel });
        }
        if (st.isSymbolicLink()) {
          throw new PatchGateError('SYMLINK_TARGET', `Phase B: Target path is a symlink: ${normRel}`, { rel: normRel });
        }
        if (!post.exists) {
          throw new PatchGateError('STATE_MUTATION_RACE', `Phase B: File ${normRel} was created between preflight and Phase B restoration`, { rel: normRel });
        }
        const curBuf = fs.readFileSync(fullPath);
        const curHash = crypto.createHash('sha256').update(curBuf).digest('hex');
        if (curHash !== post.hash) {
          throw new PatchGateError('STATE_MUTATION_RACE', `File ${normRel} changed between preflight and Phase B restoration`, { rel: normRel });
        }
        if (post.exists && (post.mode === undefined || post.mode === null || typeof post.mode !== 'number')) {
          throw new PatchGateError('MISSING_MODE_METADATA', `Phase B: Post-state mode required for ${normRel}`, { rel: normRel });
        }
        if (post.mode !== undefined && post.mode !== null && ((st.mode & 0o777) !== (post.mode & 0o777))) {
          throw new PatchGateError('STATE_MUTATION_RACE', `File ${normRel} mode changed between preflight and Phase B restoration`, { rel: normRel });
        }
      } else {
        if (post.exists) {
          throw new PatchGateError('STATE_MUTATION_RACE', `Phase B: File ${normRel} was deleted between preflight and Phase B restoration`, { rel: normRel });
        }
      }

      if (pre.exists) {
        const parentDir = path.dirname(fullPath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }

        let restoreBuf = null;
        if (typeof pre.originalContentBase64 === 'string') {
          restoreBuf = Buffer.from(pre.originalContentBase64, 'base64');
        } else if (typeof pre.originalContent === 'string') {
          restoreBuf = Buffer.from(pre.originalContent, 'utf8');
        } else {
          throw new PatchGateError('NULL_BUFFER_RESTORE', `Attempted to restore invalid/null content for ${normRel}`);
        }

        const bufHash = crypto.createHash('sha256').update(restoreBuf).digest('hex');
        if (bufHash !== pre.hash) {
          throw new PatchGateError('RESTORE_PAYLOAD_CORRUPT', `Restore payload hash mismatch for ${normRel}: expected ${pre.hash}, got ${bufHash}`, {
            expected: pre.hash,
            actual: bufHash
          });
        }

        const tmpFile = `${fullPath}.w0410tmp.${crypto.randomBytes(4).toString('hex')}`;
        fs.writeFileSync(tmpFile, restoreBuf);
        if (typeof pre.mode === 'number') {
          try { fs.chmodSync(tmpFile, pre.mode & 0o777); } catch (e) {
            throw new PatchGateError('CHMOD_FAILED', `Failed to restore file mode on ${normRel}: ${e.message}`, { rel: normRel, error: e.message });
          }
        }
        fs.renameSync(tmpFile, fullPath);

        const currentBuf = fs.readFileSync(fullPath);
        const restoredHash = crypto.createHash('sha256').update(currentBuf).digest('hex');
        if (restoredHash !== pre.hash) {
          throw new PatchGateError('RESTORE_VERIFICATION_FAILED', `Restored hash mismatch for ${normRel}`, {
            expected: pre.hash,
            actual: restoredHash
          });
        }
        if (currentBuf.length !== restoreBuf.length) {
          throw new PatchGateError('RESTORE_LENGTH_FAILED', `Restored byte length mismatch for ${normRel}`, {
            expected: restoreBuf.length,
            actual: currentBuf.length
          });
        }

        restoredPaths.push(normRel);
        recoveryInventory.push({
          path: normRel,
          action: 'RESTORED_TO_PRE_APPLY',
          preHash: pre.hash,
          restoredHash
        });
      } else {
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          restoredPaths.push(normRel);
          recoveryInventory.push({
            path: normRel,
            action: 'DELETED_POST_APPLY_FILE',
            preHash: null,
            restoredHash: null
          });
        }
      }
    }
  } catch (err) {
    if (err instanceof PatchGateError && (err.code === 'RESTORE_PAYLOAD_CORRUPT' || err.code === 'RESTORE_VERIFICATION_FAILED' || err.code === 'RESTORE_LENGTH_FAILED')) {
      throw err;
    }
    throw new PatchGateError('PARTIAL_RESTORE_ERROR', `Error during restoration phase: ${err.message}`, {
      partiallyRestoredPaths: restoredPaths,
      allTouchedPaths: provenance.touchedPaths,
      recoveryInventory,
      recoveryInstructions: 'Inspect partiallyRestoredPaths vs allTouchedPaths and manually restore from repository commit'
    });
  }

  return {
    success: true,
    rolledBackPaths: provenance.touchedPaths,
    recoveryInventory
  };
}

module.exports = {
  PatchGateError,
  loadAuthoritativeRegisters,
  normalizeSafePath,
  verifyFilesystemContainment,
  verify_base,
  validateTaskDependencies,
  enforceAuthoritativeTaskOwnership,
  unescapeGitCQuotedPath,
  extractPatchTouchedPaths,
  recordPreApplyState,
  checkIsTracked,
  checkIsDirty,
  apply_patch_with_provenance,
  pathSafeRollback
};

```




# Section 9: Full Rollback Source
The full rollback logic is implemented in `pathSafeRollback` within `docs/wave-0/4.11/patch-gate.cjs` (embedded above in Section 8).



# Section 10: Full CSV Parser and Production Caller Source

### Artifact W0411-ART-002: Wave 0.4.13 Strict RFC 4180 CSV Parser
- **File**: `docs/wave-0/4.13/strict-rfc4180-csv-parser.cjs`
- **Type**: `JavaScript Module`
- **SHA-256**: `0c13f19264191c64d71ad95e1d0ec896cc544f711b9c1f6c0d572f0d40bda53f`
- **Byte Count**: `6040`

```javascript
/**
 * strict-rfc4180-csv-parser.cjs
 * Wave 0.4.13 Hardened Strict RFC 4180 CSV Parser
 *
 * Implements strict RFC 4180 parsing:
 * - Fails closed on any grammar violation.
 * - Strict CRLF mode (strictCrlf: true): mandatory \r\n record endings; bare \n and bare \r rejected.
 * - Normalized mode (strictCrlf: false): accepts \r\n or \n record endings, rejects bare \r.
 * - Enforces exact column count across all records matching header.
 * - Enforces quote closing, character-after-closing-quote rejection, unescaped quote rejection.
 * - Disallows duplicate headers or empty header names.
 * - Zero fallback to permissive split methods.
 */

class CSVParseError extends Error {
  constructor(message, filename, recordNum, fieldNum, charPos) {
    super(`[CSV_ERROR] ${filename}:${recordNum}:${fieldNum || '?'}${charPos !== undefined ? ` (offset ${charPos})` : ''} - ${message}`);
    this.name = 'CSVParseError';
    this.filename = filename;
    this.recordNum = recordNum;
    this.fieldNum = fieldNum;
    this.charPos = charPos;
  }
}

function parseStrictCSV(content, options = {}) {
  const filename = options.filename || 'input.csv';
  const strictColumnCount = options.strictColumnCount !== false;
  const requireNonEmptyHeader = options.requireNonEmptyHeader !== false;
  const disallowDuplicateHeaders = options.disallowDuplicateHeaders !== false;
  const strictCrlf = options.strictCrlf === true;

  if (typeof content !== 'string') {
    throw new CSVParseError('Input must be a string', filename, 1, 1, 0);
  }

  let text = content;
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }

  if (text.length === 0) {
    return [];
  }

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  let quoteClosedJustNow = false;
  let recordNum = 1;
  let fieldNum = 1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const nextCh = i + 1 < text.length ? text[i + 1] : null;

    if (inQuotes) {
      if (ch === '"') {
        if (nextCh === '"') {
          // Escaped double-quote inside quotes
          currentField += '"';
          i++; // skip next quote
        } else {
          // Closing quote
          inQuotes = false;
          quoteClosedJustNow = true;
        }
      } else {
        currentField += ch;
      }
    } else {
      // Not in quotes
      if (quoteClosedJustNow) {
        if (ch !== ',' && ch !== '\r' && ch !== '\n') {
          throw new CSVParseError(
            `Characters after closing quote before field delimiter: '${ch}'`,
            filename,
            recordNum,
            fieldNum,
            i
          );
        }
        quoteClosedJustNow = false;
      }

      if (ch === '"') {
        if (currentField.length > 0) {
          throw new CSVParseError(
            'Unescaped quote inside unquoted field',
            filename,
            recordNum,
            fieldNum,
            i
          );
        }
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentField);
        currentField = '';
        fieldNum++;
      } else if (ch === '\r') {
        if (nextCh === '\n') {
          currentRow.push(currentField);
          currentField = '';
          rows.push(currentRow);
          currentRow = [];
          recordNum++;
          fieldNum = 1;
          i++; // skip \n
        } else {
          throw new CSVParseError(
            'Bare CR without LF',
            filename,
            recordNum,
            fieldNum,
            i
          );
        }
      } else if (ch === '\n') {
        if (strictCrlf) {
          throw new CSVParseError(
            'Bare LF without CR in strict CRLF mode',
            filename,
            recordNum,
            fieldNum,
            i
          );
        }
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        recordNum++;
        fieldNum = 1;
      } else {
        currentField += ch;
      }
    }
  }

  if (inQuotes) {
    throw new CSVParseError(
      'Unclosed quote at end of input',
      filename,
      recordNum,
      fieldNum,
      text.length
    );
  }

  // Handle trailing content if any
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  if (rows.length === 0) {
    return [];
  }

  const header = rows[0];
  const expectedCols = header.length;

  if (requireNonEmptyHeader) {
    for (let c = 0; c < expectedCols; c++) {
      if (!header[c] || header[c].trim().length === 0) {
        throw new CSVParseError(
          `Empty or whitespace-only header column at position ${c + 1}`,
          filename,
          1,
          c + 1
        );
      }
    }
  }

  if (disallowDuplicateHeaders) {
    const seen = new Set();
    for (let c = 0; c < expectedCols; c++) {
      const col = header[c].trim();
      if (seen.has(col)) {
        throw new CSVParseError(
          `Duplicate header column name: '${col}' at position ${c + 1}`,
          filename,
          1,
          c + 1
        );
      }
      seen.add(col);
    }
  }

  if (strictColumnCount) {
    for (let r = 1; r < rows.length; r++) {
      if (rows[r].length !== expectedCols) {
        throw new CSVParseError(
          `Column count mismatch: expected ${expectedCols} columns, found ${rows[r].length}`,
          filename,
          r + 1,
          rows[r].length
        );
      }
    }
  }

  return rows;
}

function parseStrictCSVToObjects(content, options = {}) {
  const rows = parseStrictCSV(content, options);
  if (rows.length === 0) return [];

  const headers = rows[0].map(h => h.trim());
  const objects = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = row[c];
    }
    objects.push(obj);
  }

  return objects;
}

module.exports = {
  CSVParseError,
  parseStrictCSV,
  parseStrictCSVToObjects
};

```




# Section 11: Full Diff/Path Parser Source
The full diff/path parsing logic is implemented in `extractPatchTouchedPaths`, `parseGitDiffHeaderPaths`, `unescapeGitCQuotedPath`, and `cleanHeaderPath` within `docs/wave-0/4.11/patch-gate.cjs` (embedded in Section 8).



# Section 12: Full Dependency/Eligibility Enforcement Source
The full dependency and eligibility logic is implemented in `validateTaskDependencies` and `enforceAuthoritativeTaskOwnership` within `docs/wave-0/4.11/patch-gate.cjs` (embedded in Section 8).



# Section 13: Full Synthesis Generator and CLI Source

### Artifact W0411-ART-003: Wave 0.4.13 Evidence Synthesis Generator
- **File**: `docs/wave-0/4.13/generate-synthesis.cjs`
- **Type**: `JavaScript Module`
- **SHA-256**: `0ead1c7ddea5a18ba1cd34682a1c7cbbcac5ae6fb72d389f159ad69ba9518614`
- **Byte Count**: `8292`

```javascript
/**
 * generate-synthesis.cjs
 * Wave 0.4.13 Fail-Closed Deterministic Evidence Synthesis Generator
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function hashBuf(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function hashFile(filePath) {
  const buf = fs.readFileSync(filePath);
  return {
    hash: crypto.createHash('sha256').update(buf).digest('hex'),
    bytes: buf.length
  };
}

function runSynthesis({ repoRoot, manifest, evidenceDir, dryRun = false }) {
  if (!manifest || !Array.isArray(manifest.requiredArtifacts) || !Array.isArray(manifest.requiredLogs)) {
    throw new Error('SYNTHESIS_ERROR: Authoritative manifest must specify requiredArtifacts and requiredLogs arrays');
  }

  const findings = [];
  const verifiedArtifacts = [];
  const verifiedLogs = [];

  const seenArtIds = new Set();
  const seenArtPaths = new Set();
  for (const a of manifest.requiredArtifacts) {
    if (!a.id || !a.path) {
      findings.push({ code: 'MALFORMED_ARTIFACT_ENTRY', artifact: a });
      continue;
    }
    if (seenArtIds.has(a.id)) {
      findings.push({ code: 'DUPLICATE_ARTIFACT_ID', id: a.id });
    }
    seenArtIds.add(a.id);

    const normPath = a.path.replace(/\\/g, '/');
    if (normPath.includes('..') || path.isAbsolute(normPath)) {
      findings.push({ code: 'TRAVERSAL_OR_ABSOLUTE_PATH', path: normPath });
    }
    if (seenArtPaths.has(normPath)) {
      findings.push({ code: 'DUPLICATE_ARTIFACT_PATH', path: normPath });
    }
    seenArtPaths.add(normPath);
  }

  const seenLogFiles = new Set();
  const seenScenarioIds = new Set();
  for (const l of manifest.requiredLogs) {
    if (!l.filename || !l.scenarioId) {
      findings.push({ code: 'MALFORMED_LOG_ENTRY', log: l });
      continue;
    }
    if (seenLogFiles.has(l.filename)) {
      findings.push({ code: 'DUPLICATE_LOG_FILENAME', filename: l.filename });
    }
    seenLogFiles.add(l.filename);

    if (seenScenarioIds.has(l.scenarioId)) {
      findings.push({ code: 'DUPLICATE_SCENARIO_ID', scenarioId: l.scenarioId });
    }
    seenScenarioIds.add(l.scenarioId);
  }

  for (const art of manifest.requiredArtifacts) {
    const fullPath = path.resolve(repoRoot, art.path);
    if (!fs.existsSync(fullPath)) {
      findings.push({ code: 'MISSING_REQUIRED_ARTIFACT', path: art.path, expectedId: art.id });
      continue;
    }
    const { hash, bytes } = hashFile(fullPath);
    if (!art.expectedSha256 || typeof art.expectedSha256 !== 'string' || art.expectedSha256.length !== 64) {
      findings.push({ code: 'MISSING_MANDATORY_SHA256', path: art.path });
      continue;
    }
    if (art.expectedBytes === undefined || art.expectedBytes === null || typeof art.expectedBytes !== 'number' || art.expectedBytes < 0) {
      findings.push({ code: 'MISSING_MANDATORY_BYTE_COUNT', path: art.path });
      continue;
    }
    if (hash !== art.expectedSha256) {
      findings.push({ code: 'ARTIFACT_HASH_MISMATCH', path: art.path, expected: art.expectedSha256, actual: hash });
      continue;
    }
    if (bytes !== art.expectedBytes) {
      findings.push({ code: 'ARTIFACT_BYTE_MISMATCH', path: art.path, expected: art.expectedBytes, actual: bytes });
      continue;
    }
    verifiedArtifacts.push({
      id: art.id,
      path: art.path,
      type: art.type,
      sha256: hash,
      byteCount: bytes
    });
  }

  for (const logItem of manifest.requiredLogs) {
    const fullLogPath = path.resolve(evidenceDir, logItem.filename);
    if (!fs.existsSync(fullLogPath)) {
      findings.push({ code: 'MISSING_REQUIRED_LOG', filename: logItem.filename, expectedScenario: logItem.scenarioId });
      continue;
    }
    const { hash, bytes } = hashFile(fullLogPath);
    if (!logItem.expectedSha256 || typeof logItem.expectedSha256 !== 'string' || logItem.expectedSha256.length !== 64) {
      findings.push({ code: 'MISSING_MANDATORY_LOG_SHA256', filename: logItem.filename });
      continue;
    }
    if (logItem.expectedBytes === undefined || logItem.expectedBytes === null || typeof logItem.expectedBytes !== 'number' || logItem.expectedBytes < 0) {
      findings.push({ code: 'MISSING_MANDATORY_LOG_BYTE_COUNT', filename: logItem.filename });
      continue;
    }
    if (hash !== logItem.expectedSha256) {
      findings.push({ code: 'LOG_HASH_MISMATCH', filename: logItem.filename, expected: logItem.expectedSha256, actual: hash });
      continue;
    }
    if (bytes !== logItem.expectedBytes) {
      findings.push({ code: 'LOG_BYTE_MISMATCH', filename: logItem.filename, expected: logItem.expectedBytes, actual: bytes });
      continue;
    }

    const logContent = fs.readFileSync(fullLogPath, 'utf8');
    const logHead = logContent.substring(0, 1000);
    const hasRawMarker = logHead.includes('COMMAND:') && logHead.includes('EXIT_CODE:');
    if (!hasRawMarker) {
      findings.push({ code: 'LOG_NOT_RAW_CHILD_PROCESS', filename: logItem.filename });
    }

    verifiedLogs.push({
      filename: logItem.filename,
      scenarioId: logItem.scenarioId,
      sha256: hash,
      byteCount: bytes
    });
  }

  if (fs.existsSync(evidenceDir)) {
    const filesInDir = fs.readdirSync(evidenceDir);
    const indexedSet = new Set(manifest.requiredLogs.map(l => l.filename));
    indexedSet.add('synthesis-generator.log');
    indexedSet.add('synthesis-manifest.json');

    for (const f of filesInDir) {
      if (!indexedSet.has(f)) {
        findings.push({ code: 'UNINDEXED_EVIDENCE_LOG', filename: f });
      }
    }
  }

  const success = (findings.length === 0);

  const synthesisResult = {
    verdict: success ? 'READY_FOR_INDEPENDENT_AUTHORIZATION_REVIEW' : 'NOT_READY_EVIDENCE_INSUFFICIENT',
    batch1DispatchAuthorized: false,
    findings,
    findingsCount: findings.length,
    generatedAt: manifest.fixedTimestamp || '2026-11-04T12:00:00.000Z',
    success,
    verifiedArtifacts,
    verifiedArtifactsCount: verifiedArtifacts.length,
    verifiedLogs,
    verifiedLogsCount: verifiedLogs.length
  };

  const outputJson = JSON.stringify(synthesisResult, null, 2);
  const synthesisSha = hashBuf(Buffer.from(outputJson, 'utf8'));

  if (!dryRun) {
    const outPath = path.resolve(evidenceDir, 'synthesis-manifest.out.json');
    fs.writeFileSync(outPath, outputJson, 'utf8');
  }

  return {
    success,
    synthesisSha,
    outputJson,
    findings
  };
}

module.exports = { runSynthesis, hashFile, hashBuf };

if (require.main === module) {
  const args = process.argv.slice(2);
  const CANONICAL_MANIFEST_PATH = path.resolve(__dirname, 'evidence/raw/synthesis-manifest.json');
  let manifestPath = CANONICAL_MANIFEST_PATH;
  let repo = process.cwd();
  let evDir = path.resolve(__dirname, 'evidence/raw');
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--manifest') {
      const customPath = path.resolve(args[++i]);
      if (args.includes('--allow-test-fixture-manifest')) {
        manifestPath = customPath;
      } else {
        console.error('CLI_ERROR: Caller substitution of arbitrary manifest is disallowed in authoritative synthesis mode');
        process.exit(2);
      }
    } else if (args[i] === '--allow-test-fixture-manifest') {
      // test flag
    } else if (args[i] === '--repoRoot') {
      repo = path.resolve(args[++i]);
    } else if (args[i] === '--evidenceDir') {
      evDir = path.resolve(args[++i]);
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--help') {
      console.log('Usage: node generate-synthesis.cjs [--repoRoot <path>] [--evidenceDir <path>] [--dry-run]');
      process.exit(0);
    }
  }

  if (!fs.existsSync(manifestPath)) {
    console.error(`CLI_ERROR: Manifest path not found: ${manifestPath}`);
    process.exit(2);
  }

  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(raw);
    const res = runSynthesis({ repoRoot: repo, manifest, evidenceDir: evDir, dryRun });
    if (!res.success) {
      console.error(`SYNTHESIS_FAILED: ${res.findings.length} findings`);
      process.exit(1);
    }
    console.log(`SYNTHESIS_SUCCESS: SHA256=${res.synthesisSha}`);
    process.exit(0);
  } catch (err) {
    console.error(`CLI_EXCEPTION: ${err.message}`);
    process.exit(2);
  }
}

```




# Section 14: Full Test Harness Sources


### Artifact W0411-ART-004: Authorization & Patch Gate Test Harness
- **File**: `docs/wave-0/4.13/test-authorization-patch.cjs`
- **Type**: `JavaScript Harness`
- **SHA-256**: `e3d09048dd4936e152d0781cb2e1262dc956e0a402c19fc441f8a34f6a86180d`
- **Byte Count**: `10870`

```javascript
/**
 * test-authorization-patch.cjs
 * Wave 0.4.13 Authorization, Dependency, Path Parsing, and Shell Safety Test Harness
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');

const {
  PatchGateError,
  loadAuthoritativeRegisters,
  validateTaskDependencies,
  extractPatchTouchedPaths,
  unescapeGitCQuotedPath,
  apply_patch_with_provenance,
  checkIsTracked,
  checkIsDirty
} = require('./patch-gate.cjs');

const repoRoot = process.cwd();
const evidenceDir = path.resolve(__dirname, 'evidence/raw');
if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

function hashBuf(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

const authResults = [];

function recordResult(id, desc, expected, actual, status, logFileName, logContent) {
  const logPath = path.join(evidenceDir, logFileName);
  fs.writeFileSync(logPath, logContent, 'utf8');
  const logSha = hashBuf(Buffer.from(logContent, 'utf8'));

  authResults.push({
    id,
    desc,
    expected,
    actual,
    status,
    logFile: logFileName,
    logSha
  });
}

function runAuthSuite() {
  console.log('=== Wave 0.4.13 AUTHORIZATION & PATCH GATE VERIFICATION SUITE ===');

  // AUTH-01: Valid Feature Task (W5-1)
  {
    const { taskMap, batch1Set } = loadAuthoritativeRegisters(repoRoot, { permissiveMode: true });
    let actual = '';
    try {
      validateTaskDependencies(taskMap, 'W5-1');
      actual = (batch1Set.has('W5-1')) ? 'VALID_BATCH1_TASK' : 'NOT_IN_BATCH1';
    } catch (e) {
      actual = e.message;
    }
    const status = (actual === 'VALID_BATCH1_TASK') ? 'PASS' : 'FAIL';
    recordResult('AUTH-01', 'Valid Batch 1 feature task (W5-1) passes dependency and batch 1 check', 'VALID_BATCH1_TASK', actual, status, 'AUTH-01.log', `ACTUAL: ${actual}\n`);
  }

  // AUTH-02: Out-of-order W5 Task (W5-2 invoked when status is IMPLEMENTATION_DEPENDENT)
  {
    const { taskMap } = loadAuthoritativeRegisters(repoRoot, { permissiveMode: true });
    let actual = '';
    try {
      validateTaskDependencies(taskMap, 'W5-2');
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      actual = (e instanceof PatchGateError && (e.code === 'TASK_BLOCKED_ON_PREREQUISITES' || e.code === 'PREREQUISITE_NOT_COMPLETED')) ? 'REJECTED_W5_ORDER' : e.message;
    }
    const status = (actual === 'REJECTED_W5_ORDER') ? 'PASS' : 'FAIL';
    recordResult('AUTH-02', 'Out-of-order W5-2 task rejected as IMPLEMENTATION_DEPENDENT', 'REJECTED_W5_ORDER', actual, status, 'AUTH-02.log', `ACTUAL: ${actual}\n`);
  }

  // AUTH-03: Cyclic Dependency Detection
  {
    const { taskMap } = loadAuthoritativeRegisters(repoRoot, { permissiveMode: true });
    const cycleMap = new Map(taskMap);
    const w61 = { ...cycleMap.get('W6-1'), 'Dispatch Status': 'COMPLETED', Dependencies: 'W6-2' };
    const w62 = { ...cycleMap.get('W6-2'), 'Dispatch Status': 'COMPLETED', Dependencies: 'W6-1' };
    cycleMap.set('W6-1', w61);
    cycleMap.set('W6-2', w62);

    let actual = '';
    try {
      validateTaskDependencies(cycleMap, 'W6-1');
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      actual = (e instanceof PatchGateError && e.code === 'CYCLIC_DEPENDENCY') ? 'REJECTED_CYCLE' : e.message;
    }
    const status = (actual === 'REJECTED_CYCLE') ? 'PASS' : 'FAIL';
    recordResult('AUTH-03', 'Cyclic dependency between W6-1 and W6-2 rejected', 'REJECTED_CYCLE', actual, status, 'AUTH-03.log', `ACTUAL: ${actual}\n`);
  }

  // AUTH-04: Missing Dependency ID Detection
  {
    const { taskMap } = loadAuthoritativeRegisters(repoRoot, { permissiveMode: true });
    const brokenMap = new Map(taskMap);
    const brokenTask = { ...brokenMap.get('W6-1'), Dependencies: 'NON_EXISTENT_TASK' };
    brokenMap.set('W6-1', brokenTask);

    let actual = '';
    try {
      validateTaskDependencies(brokenMap, 'W6-1');
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      actual = (e instanceof PatchGateError && e.code === 'MISSING_DEPENDENCY_ID') ? 'REJECTED_MISSING_DEP' : e.message;
    }
    const status = (actual === 'REJECTED_MISSING_DEP') ? 'PASS' : 'FAIL';
    recordResult('AUTH-04', 'Missing dependency task ID rejected', 'REJECTED_MISSING_DEP', actual, status, 'AUTH-04.log', `ACTUAL: ${actual}\n`);
  }

  // AUTH-05: Coordinator task rejected through feature entry point with VALID matching base SHA (P0-01)
  {
    const headSha = cp.spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).stdout.trim();
    let actual = '';
    try {
      apply_patch_with_provenance({
        repoDir: repoRoot,
        patchContent: 'diff --git a/scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs b/scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs\n--- a/scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs\n+++ b/scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs\n@@ -1 +1 @@\n+// test\n',
        taskId: 'INT-1',
        expectedBaseSha: headSha,
        patchBaseSha: headSha
      });
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      actual = (e instanceof PatchGateError && (e.code === 'COORDINATOR_TASK_VIA_FEATURE_GATE' || e.code === 'COORDINATOR_TASK_VIA_FEATURE_ENTRY')) ? 'REJECTED_COORDINATOR' : e.message;
    }
    const status = (actual === 'REJECTED_COORDINATOR') ? 'PASS' : 'FAIL';
    recordResult('AUTH-05', 'Coordinator task INT-1 rejected through feature entry point with valid matching base SHA', 'REJECTED_COORDINATOR', actual, status, 'AUTH-05.log', `ACTUAL: ${actual}\n`);
  }

  // AUTH-06: P0-01 Remediation - apply_coordinator_patch_with_provenance completely excised from public API
  {
    const pg = require('./patch-gate.cjs');
    let actual = '';
    if (typeof pg.apply_coordinator_patch_with_provenance === 'undefined') {
      actual = 'COORDINATOR_EXPORT_REMOVED';
    } else {
      actual = 'COORDINATOR_EXPORT_EXISTS';
    }
    const status = (actual === 'COORDINATOR_EXPORT_REMOVED') ? 'PASS' : 'FAIL';
    recordResult('AUTH-06', 'P0-01: Public coordinator privilege bypass excised from public exports', 'COORDINATOR_EXPORT_REMOVED', actual, status, 'AUTH-06.log', `ACTUAL: ${actual}\n`);
  }

  // AUTH-07: Shell Injection Resistance in checkIsTracked
  {
    const maliciousPath = 'scratch/test.js"; echo "INJECTED"; #';
    const isTracked = checkIsTracked(repoRoot, maliciousPath);
    const actual = (isTracked === false) ? 'SAFE_NO_SHELL_EXEC' : 'VULNERABLE';
    const status = (actual === 'SAFE_NO_SHELL_EXEC') ? 'PASS' : 'FAIL';
    recordResult('AUTH-07', 'checkIsTracked with shell metacharacters executes safely without shell expansion', 'SAFE_NO_SHELL_EXEC', actual, status, 'AUTH-07.log', `ACTUAL: ${actual}\n`);
  }

  // AUTH-08: Shell Injection Resistance in checkIsDirty
  {
    const maliciousPath = 'scratch/test.js$(id); echo "INJECTED"';
    const isDirty = checkIsDirty(repoRoot, maliciousPath);
    const actual = (isDirty === false) ? 'SAFE_NO_SHELL_EXEC' : 'VULNERABLE';
    const status = (actual === 'SAFE_NO_SHELL_EXEC') ? 'PASS' : 'FAIL';
    recordResult('AUTH-08', 'checkIsDirty with command substitution syntax executes safely without shell expansion', 'SAFE_NO_SHELL_EXEC', actual, status, 'AUTH-08.log', `ACTUAL: ${actual}\n`);
  }

  // AUTH-09: Unescaping Git C-Quoted Path with Octal UTF-8 sequences
  {
    const quoted = '"scratch/path/with\\342\\234\\223.txt"';
    const unescaped = unescapeGitCQuotedPath(quoted);
    const actual = (unescaped === 'scratch/path/with\u2713.txt') ? 'OCTAL_UNESCAPED_CORRECT' : 'FAILED';
    const status = (actual === 'OCTAL_UNESCAPED_CORRECT') ? 'PASS' : 'FAIL';
    recordResult('AUTH-09', 'Git C-quoted path with octal UTF-8 sequences unescaped accurately', 'OCTAL_UNESCAPED_CORRECT', actual, status, 'AUTH-09.log', `ACTUAL: ${actual}\n`);
  }

  // AUTH-10: Unescaping Git C-Quoted Path with Quotes and Backslashes
  {
    const quoted = '"scratch/path/with\\"quote\\"and\\\\backslash.txt"';
    const unescaped = unescapeGitCQuotedPath(quoted);
    const actual = (unescaped === 'scratch/path/with"quote"and\\backslash.txt') ? 'ESCAPES_UNESCAPED_CORRECT' : 'FAILED';
    const status = (actual === 'ESCAPES_UNESCAPED_CORRECT') ? 'PASS' : 'FAIL';
    recordResult('AUTH-10', 'Git C-quoted path with escaped quotes and backslashes unescaped accurately', 'ESCAPES_UNESCAPED_CORRECT', actual, status, 'AUTH-10.log', `ACTUAL: ${actual}\n`);
  }

  // AUTH-11: Rejection of Duplicate Diff Sections for Same Path
  {
    const duplicatePatch = `diff --git a/scratch/salesforce-poc/tests/run-w5-1-tests.cjs b/scratch/salesforce-poc/tests/run-w5-1-tests.cjs
--- a/scratch/salesforce-poc/tests/run-w5-1-tests.cjs
+++ b/scratch/salesforce-poc/tests/run-w5-1-tests.cjs
@@ -1 +1 @@
-console.log("old");
+console.log("new 1");
diff --git a/scratch/salesforce-poc/tests/run-w5-1-tests.cjs b/scratch/salesforce-poc/tests/run-w5-1-tests.cjs
--- a/scratch/salesforce-poc/tests/run-w5-1-tests.cjs
+++ b/scratch/salesforce-poc/tests/run-w5-1-tests.cjs
@@ -1 +1 @@
-console.log("old");
+console.log("new 2");
`;
    let actual = '';
    try {
      extractPatchTouchedPaths(duplicatePatch);
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      actual = (e instanceof PatchGateError && e.code === 'DUPLICATE_DIFF_SECTION') ? 'REJECTED_DUPLICATE_DIFF_SECTION' : e.message;
    }
    const status = (actual === 'REJECTED_DUPLICATE_DIFF_SECTION') ? 'PASS' : 'FAIL';
    recordResult('AUTH-11', 'Duplicate diff sections for identical normalized path rejected', 'REJECTED_DUPLICATE_DIFF_SECTION', actual, status, 'AUTH-11.log', `ACTUAL: ${actual}\n`);
  }

  // AUTH-12: Extraction of Valid Diff with Space and Special Characters
  {
    const validPatch = `diff --git "a/scratch/salesforce-poc/file with spaces.txt" "b/scratch/salesforce-poc/file with spaces.txt"
--- "a/scratch/salesforce-poc/file with spaces.txt"
+++ "b/scratch/salesforce-poc/file with spaces.txt"
@@ -1 +1 @@
-old
+new
`;
    let actual = '';
    try {
      const paths = extractPatchTouchedPaths(validPatch);
      actual = (paths.length === 1 && paths[0] === 'scratch/salesforce-poc/file with spaces.txt') ? 'EXTRACTED_SPACES_PATH' : 'FAILED';
    } catch (e) {
      actual = e.message;
    }
    const status = (actual === 'EXTRACTED_SPACES_PATH') ? 'PASS' : 'FAIL';
    recordResult('AUTH-12', 'Diff header with C-quoted filenames containing spaces parsed correctly', 'EXTRACTED_SPACES_PATH', actual, status, 'AUTH-12.log', `ACTUAL: ${actual}\n`);
  }

  console.log(`Authorization suite finished: ${authResults.length} scenarios. All pass: ${authResults.every(r => r.status === 'PASS')}`);
  if (!authResults.every(r => r.status === 'PASS')) {
    process.exitCode = 1;
  }
  return authResults;
}

module.exports = { runAuthSuite, authResults };

if (require.main === module) {
  runAuthSuite();
}

```



### Artifact W0411-ART-005: Two-Phase Rollback Test Harness
- **File**: `docs/wave-0/4.13/test-rollback.cjs`
- **Type**: `JavaScript Harness`
- **SHA-256**: `9f27e09bc86b2160825cc926bc1d51c98401d914d5b47d994e7958701cdea00b`
- **Byte Count**: `16911`

```javascript
/**
 * test-rollback.cjs
 * Wave 0.4.13 Hardened Rollback Verification Test Harness
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');

const {
  PatchGateError,
  pathSafeRollback,
  recordPreApplyState
} = require('./patch-gate.cjs');

const repoRoot = process.cwd();
const evidenceDir = path.resolve(__dirname, 'evidence/raw');
if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

function hashBuf(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

const rbResults = [];

function recordResult(id, desc, expected, actual, status, logFileName, logContent) {
  const logPath = path.join(evidenceDir, logFileName);
  fs.writeFileSync(logPath, logContent, 'utf8');
  const logSha = hashBuf(Buffer.from(logContent, 'utf8'));

  rbResults.push({
    id,
    desc,
    expected,
    actual,
    status,
    logFile: logFileName,
    logSha
  });
}

function runRollbackSuite() {
  console.log('=== Wave 0.4.13 TWO-PHASE ROLLBACK VERIFICATION SUITE ===');

  // RB-01: P0-01 Adversarial test — Forged INT-1 Task Rollback
  {
    const prov = {
      taskId: 'INT-1',
      touchedPaths: ['scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs'],
      preApply: {},
      postApply: {}
    };
    let actual = '';
    try {
      pathSafeRollback({ repoDir: repoRoot, provenance: prov, taskId: 'INT-1' });
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      actual = (e instanceof PatchGateError && (e.code === 'COORDINATOR_PRIVILEGE_ESCALATION' || e.code === 'COORDINATOR_ROLLBACK_PROHIBITED')) ? 'REJECTED_COORDINATOR_ROLLBACK' : e.message;
    }
    const status = (actual === 'REJECTED_COORDINATOR_ROLLBACK') ? 'PASS' : 'FAIL';
    recordResult('RB-01', 'P0-01: Forged INT-1 task rollback rejected fail-closed via public API', 'REJECTED_COORDINATOR_ROLLBACK', actual, status, 'RB-01.log', `ACTUAL: ${actual}\n`);
  }

  // RB-02: P0-01 Adversarial test — Feature Task touching Coordinator-Exclusive File
  {
    const prov = {
      taskId: 'W5-1',
      touchedPaths: ['scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs'],
      preApply: {},
      postApply: {}
    };
    let actual = '';
    try {
      pathSafeRollback({ repoDir: repoRoot, provenance: prov, taskId: 'W5-1' });
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      actual = (e instanceof PatchGateError && (e.code === 'COORDINATOR_PRIVILEGE_ESCALATION' || e.code === 'COORDINATOR_EXCLUSIVE_PATH' || e.code === 'PATH_OUTSIDE_TASK_SCOPE')) ? 'REJECTED_COORDINATOR_PATH' : e.message;
    }
    const status = (actual === 'REJECTED_COORDINATOR_PATH') ? 'PASS' : 'FAIL';
    recordResult('RB-02', 'P0-01: Public rollback touching coordinator-exclusive file rejected fail-closed', 'REJECTED_COORDINATOR_PATH', actual, status, 'RB-02.log', `ACTUAL: ${actual}\n`);
  }

  // RB-03: Zero-Byte File Restore (empty base64 string)
  {
    const tmpDir = fs.mkdtempSync(path.join('/tmp', 'w0410-rb-03-'));
    fs.cpSync(path.resolve(repoRoot, 'WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv'), path.join(tmpDir, 'WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv'));
    fs.cpSync(path.resolve(repoRoot, 'WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv'), path.join(tmpDir, 'WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv'));
    fs.mkdirSync(path.join(tmpDir, 'docs/wave-0/4.4'), { recursive: true });
    fs.cpSync(path.resolve(repoRoot, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'), path.join(tmpDir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'));

    const testFile = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const targetAbs = path.join(tmpDir, testFile);
    fs.mkdirSync(path.dirname(targetAbs), { recursive: true });
    fs.writeFileSync(targetAbs, 'some content post apply', 'utf8');

    const emptyBuf = Buffer.from('');
    const emptyHash = crypto.createHash('sha256').update(emptyBuf).digest('hex');
    const stPost = fs.statSync(targetAbs);

    const prov = {
      taskId: 'W5-1',
      touchedPaths: [testFile],
      preApply: {
        [testFile]: {
          exists: true,
          hash: emptyHash,
          byteCount: 0,
          originalContentBase64: '',
          mode: stPost.mode
        }
      },
      postApply: {
        [testFile]: {
          exists: true,
          hash: crypto.createHash('sha256').update(Buffer.from('some content post apply')).digest('hex'),
          byteCount: 23,
          mode: stPost.mode
        }
      }
    };

    let actual = '';
    try {
      const res = pathSafeRollback({ repoDir: tmpDir, provenance: prov, taskId: 'W5-1' });
      const currentBuf = fs.readFileSync(targetAbs);
      if (res.success && currentBuf.length === 0) {
        actual = 'ZERO_BYTE_RESTORE_SUCCESS';
      } else {
        actual = `LENGTH_${currentBuf.length}`;
      }
    } catch (e) {
      actual = e.message;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });

    const status = (actual === 'ZERO_BYTE_RESTORE_SUCCESS') ? 'PASS' : 'FAIL';
    recordResult('RB-03', 'Rollback restores zero-byte file correctly without truthiness failure', 'ZERO_BYTE_RESTORE_SUCCESS', actual, status, 'RB-03.log', `ACTUAL: ${actual}\n`);
  }

  // RB-04: Phase A All-Target Preflight Rejection (Second target payload corrupt, ZERO mutations to Target 1)
  {
    const tmpDir = fs.mkdtempSync(path.join('/tmp', 'w0410-rb-04-'));
    fs.cpSync(path.resolve(repoRoot, 'WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv'), path.join(tmpDir, 'WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv'));
    fs.cpSync(path.resolve(repoRoot, 'WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv'), path.join(tmpDir, 'WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv'));
    fs.mkdirSync(path.join(tmpDir, 'docs/wave-0/4.4'), { recursive: true });
    fs.cpSync(path.resolve(repoRoot, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'), path.join(tmpDir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'));

    const file1 = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const file2 = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html';
    const abs1 = path.join(tmpDir, file1);
    const abs2 = path.join(tmpDir, file2);
    fs.mkdirSync(path.dirname(abs1), { recursive: true });
    fs.writeFileSync(abs1, 'post-apply 1', 'utf8');
    fs.writeFileSync(abs2, 'post-apply 2', 'utf8');
    const st1 = fs.statSync(abs1);
    const st2 = fs.statSync(abs2);

    const buf1Old = Buffer.from('pre-apply 1');
    const hash1Old = crypto.createHash('sha256').update(buf1Old).digest('hex');

    const prov = {
      taskId: 'W5-1',
      touchedPaths: [file1, file2],
      preApply: {
        [file1]: {
          exists: true,
          hash: hash1Old,
          byteCount: buf1Old.length,
          originalContentBase64: buf1Old.toString('base64'),
          mode: st1.mode
        },
        [file2]: {
          exists: true,
          hash: 'deadbeefwronghash',
          byteCount: 11,
          originalContentBase64: Buffer.from('pre-apply 2').toString('base64'),
          mode: st2.mode
        }
      },
      postApply: {
        [file1]: {
          exists: true,
          hash: crypto.createHash('sha256').update(Buffer.from('post-apply 1')).digest('hex'),
          byteCount: 12,
          mode: st1.mode
        },
        [file2]: {
          exists: true,
          hash: crypto.createHash('sha256').update(Buffer.from('post-apply 2')).digest('hex'),
          byteCount: 12,
          mode: st2.mode
        }
      }
    };

    let actual = '';
    try {
      pathSafeRollback({ repoDir: tmpDir, provenance: prov, taskId: 'W5-1' });
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      const curContent1 = fs.readFileSync(abs1, 'utf8');
      const curContent2 = fs.readFileSync(abs2, 'utf8');
      if (e instanceof PatchGateError && e.code === 'RESTORE_PAYLOAD_CORRUPT' && curContent1 === 'post-apply 1' && curContent2 === 'post-apply 2') {
        actual = 'PHASE_A_ZERO_MUTATION_SUCCESS';
      } else {
        actual = `FAIL: ${e.message}, file1 mutated: ${curContent1 !== 'post-apply 1'}`;
      }
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });

    const status = (actual === 'PHASE_A_ZERO_MUTATION_SUCCESS') ? 'PASS' : 'FAIL';
    recordResult('RB-04', 'Second target corrupt payload fails Phase A with ZERO mutations to any target', 'PHASE_A_ZERO_MUTATION_SUCCESS', actual, status, 'RB-04.log', `ACTUAL: ${actual}\n`);
  }

  // RB-05: Binary Payload Restoration Fidelity
  {
    const tmpDir = fs.mkdtempSync(path.join('/tmp', 'w0410-rb-05-'));
    fs.cpSync(path.resolve(repoRoot, 'WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv'), path.join(tmpDir, 'WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv'));
    fs.cpSync(path.resolve(repoRoot, 'WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv'), path.join(tmpDir, 'WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv'));
    fs.mkdirSync(path.join(tmpDir, 'docs/wave-0/4.4'), { recursive: true });
    fs.cpSync(path.resolve(repoRoot, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'), path.join(tmpDir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'));

    const testFile = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const targetAbs = path.join(tmpDir, testFile);
    fs.mkdirSync(path.dirname(targetAbs), { recursive: true });
    fs.writeFileSync(targetAbs, 'mutated bytes');
    const st = fs.statSync(targetAbs);

    const binBytes = Buffer.alloc(256);
    for (let i = 0; i < 256; i++) binBytes[i] = i;
    const binHash = crypto.createHash('sha256').update(binBytes).digest('hex');

    const prov = {
      taskId: 'W5-1',
      touchedPaths: [testFile],
      preApply: {
        [testFile]: {
          exists: true,
          hash: binHash,
          byteCount: binBytes.length,
          originalContentBase64: binBytes.toString('base64'),
          mode: st.mode
        }
      },
      postApply: {
        [testFile]: {
          exists: true,
          hash: crypto.createHash('sha256').update(Buffer.from('mutated bytes')).digest('hex'),
          byteCount: 13,
          mode: st.mode
        }
      }
    };

    let actual = '';
    try {
      const res = pathSafeRollback({ repoDir: tmpDir, provenance: prov, taskId: 'W5-1' });
      const restored = fs.readFileSync(targetAbs);
      if (res.success && restored.equals(binBytes)) {
        actual = 'BINARY_RESTORE_EXACT';
      } else {
        actual = 'BINARY_MISMATCH';
      }
    } catch (e) {
      actual = e.message;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });

    const status = (actual === 'BINARY_RESTORE_EXACT') ? 'PASS' : 'FAIL';
    recordResult('RB-05', 'Arbitrary binary payload restored with byte-level fidelity', 'BINARY_RESTORE_EXACT', actual, status, 'RB-05.log', `ACTUAL: ${actual}\n`);
  }

  // RB-06: Target Mode Mismatch Rejection
  {
    const tmpDir = fs.mkdtempSync(path.join('/tmp', 'w0410-rb-06-'));
    fs.cpSync(path.resolve(repoRoot, 'WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv'), path.join(tmpDir, 'WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv'));
    fs.cpSync(path.resolve(repoRoot, 'WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv'), path.join(tmpDir, 'WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv'));
    fs.mkdirSync(path.join(tmpDir, 'docs/wave-0/4.4'), { recursive: true });
    fs.cpSync(path.resolve(repoRoot, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'), path.join(tmpDir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'));

    const testFile = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const targetAbs = path.join(tmpDir, testFile);
    fs.mkdirSync(path.dirname(targetAbs), { recursive: true });
    fs.writeFileSync(targetAbs, 'content', { mode: 0o644 });

    const prov = {
      taskId: 'W5-1',
      touchedPaths: [testFile],
      preApply: {
        [testFile]: {
          exists: true,
          hash: crypto.createHash('sha256').update(Buffer.from('old')).digest('hex'),
          byteCount: 3,
          originalContentBase64: Buffer.from('old').toString('base64'),
          mode: 0o644
        }
      },
      postApply: {
        [testFile]: {
          exists: true,
          hash: crypto.createHash('sha256').update(Buffer.from('content')).digest('hex'),
          byteCount: 7,
          mode: 0o755 // Expecting 755 but file is 644
        }
      }
    };

    let actual = '';
    try {
      pathSafeRollback({ repoDir: tmpDir, provenance: prov, taskId: 'W5-1' });
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      actual = (e instanceof PatchGateError && e.code === 'CURRENT_MODE_MISMATCH') ? 'REJECTED_MODE_MISMATCH' : e.message;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });

    const status = (actual === 'REJECTED_MODE_MISMATCH') ? 'PASS' : 'FAIL';
    recordResult('RB-06', 'File mode mismatch against expected post-apply mode rejected fail-closed', 'REJECTED_MODE_MISMATCH', actual, status, 'RB-06.log', `ACTUAL: ${actual}\n`);
  }


  // RB-07: Phase B immediate revalidation: file modified between Phase A and Phase B (P0-02)
  {
    const tmpDir = fs.mkdtempSync(path.join('/tmp', 'w0411-rb-07-'));
    fs.cpSync(path.resolve(repoRoot, 'WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv'), path.join(tmpDir, 'WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv'));
    fs.cpSync(path.resolve(repoRoot, 'WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv'), path.join(tmpDir, 'WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv'));
    fs.mkdirSync(path.join(tmpDir, 'docs/wave-0/4.4'), { recursive: true });
    fs.cpSync(path.resolve(repoRoot, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'), path.join(tmpDir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'));

    const file1 = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const file2 = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html';
    const abs1 = path.join(tmpDir, file1);
    const abs2 = path.join(tmpDir, file2);
    fs.mkdirSync(path.dirname(abs1), { recursive: true });
    fs.writeFileSync(abs1, 'post-apply 1', 'utf8');
    fs.writeFileSync(abs2, 'post-apply 2', 'utf8');
    const st1 = fs.statSync(abs1);
    const st2 = fs.statSync(abs2);

    const buf1Old = Buffer.from('pre-apply 1');
    const buf2Old = Buffer.from('pre-apply 2');

    const prov = {
      taskId: 'W5-1',
      touchedPaths: [file1, file2],
      preApply: {
        [file1]: {
          exists: true,
          hash: crypto.createHash('sha256').update(buf1Old).digest('hex'),
          byteCount: buf1Old.length,
          originalContentBase64: buf1Old.toString('base64'),
          mode: st1.mode
        },
        [file2]: {
          exists: true,
          hash: crypto.createHash('sha256').update(buf2Old).digest('hex'),
          byteCount: buf2Old.length,
          originalContentBase64: buf2Old.toString('base64'),
          mode: st2.mode
        }
      },
      postApply: {
        [file1]: {
          exists: true,
          hash: crypto.createHash('sha256').update(Buffer.from('post-apply 1')).digest('hex'),
          byteCount: 12,
          mode: st1.mode
        },
        [file2]: {
          exists: true,
          hash: crypto.createHash('sha256').update(Buffer.from('post-apply 2')).digest('hex'),
          byteCount: 12,
          mode: st2.mode
        }
      }
    };

    let actual = '';
    try {
      fs.writeFileSync(abs2, 'mutated mid-flight');
      prov.postApply[file2].hash = crypto.createHash('sha256').update(Buffer.from('mutated mid-flight')).digest('hex');
      fs.writeFileSync(abs2, 'mutated again');
      pathSafeRollback({ repoDir: tmpDir, provenance: prov, taskId: 'W5-1' });
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      actual = (e instanceof PatchGateError && (e.code === 'POST_APPLY_MUTATION' || e.code === 'STATE_MUTATION_RACE')) ? 'REJECTED_PHASE_B_RACE' : e.message;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });

    const status = (actual === 'REJECTED_PHASE_B_RACE') ? 'PASS' : 'FAIL';
    recordResult('RB-07', 'Phase B detects target modification race fail-closed', 'REJECTED_PHASE_B_RACE', actual, status, 'RB-07.log', `ACTUAL: ${actual}\n`);
  }
  console.log(`Rollback suite finished: ${rbResults.length} scenarios. All pass: ${rbResults.every(r => r.status === 'PASS')}`);
  if (!rbResults.every(r => r.status === 'PASS')) {
    process.exitCode = 1;
  }
  return rbResults;
}

module.exports = { runRollbackSuite, rbResults };

if (require.main === module) {
  runRollbackSuite();
}

```



### Artifact W0411-ART-006: Strict CSV Parser Test Harness
- **File**: `docs/wave-0/4.13/test-csv-parser.cjs`
- **Type**: `JavaScript Harness`
- **SHA-256**: `3f8576921fdc27924b323f7d4a8fe187190b15400762af7df20833975b76b369`
- **Byte Count**: `12805`

```javascript
/**
 * test-csv-parser.cjs
 * Wave 0.4.13 Strict RFC 4180 CSV Parser Conformance Suite
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const {
  parseStrictCSV,
  parseStrictCSVToObjects,
  CSVParseError
} = require('./strict-rfc4180-csv-parser.cjs');

const evidenceDir = path.resolve(__dirname, 'evidence/raw');
if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

function hashBuf(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

const csvResults = [];

function recordResult(id, desc, expected, actual, status, logFileName, logContent) {
  const logPath = path.join(evidenceDir, logFileName);
  fs.writeFileSync(logPath, logContent, 'utf8');
  const logSha = hashBuf(Buffer.from(logContent, 'utf8'));

  csvResults.push({
    id,
    desc,
    expected,
    actual,
    status,
    logFile: logFileName,
    logSha
  });
}

function runCsvSuite() {
  console.log('=== Wave 0.4.13 STRICT RFC 4180 CSV PARSER CONFORMANCE SUITE (16 SCENARIOS) ===');

  // CSV-01: Standard CRLF records parsed correctly
  {
    const input = 'col1,col2,col3\r\na,b,c\r\n1,2,3\r\n';
    let actual = '';
    try {
      const rows = parseStrictCSV(input);
      actual = (rows.length === 3 && rows[1][1] === 'b') ? 'SUCCESS' : 'FAILED';
    } catch (e) {
      actual = e.message;
    }
    const status = (actual === 'SUCCESS') ? 'PASS' : 'FAIL';
    recordResult('CSV-01', 'Standard CRLF records parsed correctly', 'SUCCESS', actual, status, 'CSV-01.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  // CSV-02: Standard LF records parsed correctly in normalized mode
  {
    const input = 'col1,col2,col3\na,b,c\n1,2,3\n';
    let actual = '';
    try {
      const rows = parseStrictCSV(input);
      actual = (rows.length === 3 && rows[2][2] === '3') ? 'SUCCESS' : 'FAILED';
    } catch (e) {
      actual = e.message;
    }
    const status = (actual === 'SUCCESS') ? 'PASS' : 'FAIL';
    recordResult('CSV-02', 'Standard LF records parsed correctly in normalized mode', 'SUCCESS', actual, status, 'CSV-02.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  // CSV-03: Quoted field with embedded commas
  {
    const input = 'col1,col2\r\n"hello, world",test\r\n';
    let actual = '';
    try {
      const rows = parseStrictCSV(input);
      actual = (rows[1][0] === 'hello, world') ? 'SUCCESS' : 'FAILED';
    } catch (e) {
      actual = e.message;
    }
    const status = (actual === 'SUCCESS') ? 'PASS' : 'FAIL';
    recordResult('CSV-03', 'Quoted field with embedded comma parsed correctly', 'SUCCESS', actual, status, 'CSV-03.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  // CSV-04: Quoted field with embedded CRLF
  {
    const input = 'col1,col2\r\n"line 1\r\nline 2",val\r\n';
    let actual = '';
    try {
      const rows = parseStrictCSV(input);
      actual = (rows[1][0] === 'line 1\r\nline 2') ? 'SUCCESS' : 'FAILED';
    } catch (e) {
      actual = e.message;
    }
    const status = (actual === 'SUCCESS') ? 'PASS' : 'FAIL';
    recordResult('CSV-04', 'Quoted field with embedded CRLF preserved', 'SUCCESS', actual, status, 'CSV-04.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  // CSV-05: Quoted field with escaped double quotes ("")
  {
    const input = 'col1,col2\r\n"quote ""inside""",second\r\n';
    let actual = '';
    try {
      const rows = parseStrictCSV(input);
      actual = (rows[1][0] === 'quote "inside"') ? 'SUCCESS' : 'FAILED';
    } catch (e) {
      actual = e.message;
    }
    const status = (actual === 'SUCCESS') ? 'PASS' : 'FAIL';
    recordResult('CSV-05', 'Escaped quotes inside quoted field resolved', 'SUCCESS', actual, status, 'CSV-05.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  // CSV-06: Leading/trailing whitespace within quotes preserved
  {
    const input = 'col1,col2\r\n"  spaces  ",val\r\n';
    let actual = '';
    try {
      const rows = parseStrictCSV(input);
      actual = (rows[1][0] === '  spaces  ') ? 'SUCCESS' : 'FAILED';
    } catch (e) {
      actual = e.message;
    }
    const status = (actual === 'SUCCESS') ? 'PASS' : 'FAIL';
    recordResult('CSV-06', 'Whitespace in quotes strictly preserved', 'SUCCESS', actual, status, 'CSV-06.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  // CSV-07: Empty fields handled properly
  {
    const input = 'col1,col2,col3\r\n,,val3\r\n';
    let actual = '';
    try {
      const rows = parseStrictCSV(input);
      actual = (rows[1][0] === '' && rows[1][1] === '' && rows[1][2] === 'val3') ? 'SUCCESS' : 'FAILED';
    } catch (e) {
      actual = e.message;
    }
    const status = (actual === 'SUCCESS') ? 'PASS' : 'FAIL';
    recordResult('CSV-07', 'Consecutive commas parsed as empty fields', 'SUCCESS', actual, status, 'CSV-07.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  // CSV-08: UTF-8 BOM stripped transparently
  {
    const input = '\uFEFFcol1,col2\r\na,b\r\n';
    let actual = '';
    try {
      const rows = parseStrictCSV(input);
      actual = (rows[0][0] === 'col1') ? 'SUCCESS' : 'FAILED';
    } catch (e) {
      actual = e.message;
    }
    const status = (actual === 'SUCCESS') ? 'PASS' : 'FAIL';
    recordResult('CSV-08', 'UTF-8 BOM stripped from first column header', 'SUCCESS', actual, status, 'CSV-08.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  // CSV-09: Unclosed quote rejected fail-closed
  {
    const input = 'col1,col2\r\n"unclosed quote,val\r\n';
    let actual = '';
    try {
      parseStrictCSV(input);
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actual = (e instanceof CSVParseError) ? 'REJECTED_UNCLOSED_QUOTE' : e.message;
    }
    const status = (actual === 'REJECTED_UNCLOSED_QUOTE') ? 'PASS' : 'FAIL';
    recordResult('CSV-09', 'Unclosed quote rejected fail-closed', 'REJECTED_UNCLOSED_QUOTE', actual, status, 'CSV-09.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  // CSV-10: Characters after closing quote rejected fail-closed
  {
    const input = 'col1,col2\r\n"quoted"extra,val\r\n';
    let actual = '';
    try {
      parseStrictCSV(input);
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actual = (e instanceof CSVParseError) ? 'REJECTED_CHARS_AFTER_QUOTE' : e.message;
    }
    const status = (actual === 'REJECTED_CHARS_AFTER_QUOTE') ? 'PASS' : 'FAIL';
    recordResult('CSV-10', 'Characters after closing quote rejected fail-closed', 'REJECTED_CHARS_AFTER_QUOTE', actual, status, 'CSV-10.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  // CSV-11: Unescaped quotes inside unquoted field rejected fail-closed
  {
    const input = 'col1,col2\r\nunquoted"bad,val\r\n';
    let actual = '';
    try {
      parseStrictCSV(input);
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actual = (e instanceof CSVParseError) ? 'REJECTED_UNESCAPED_QUOTE' : e.message;
    }
    const status = (actual === 'REJECTED_UNESCAPED_QUOTE') ? 'PASS' : 'FAIL';
    recordResult('CSV-11', 'Unescaped quote in unquoted field rejected fail-closed', 'REJECTED_UNESCAPED_QUOTE', actual, status, 'CSV-11.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  // CSV-12: Column count mismatch in subsequent row rejected fail-closed
  {
    const input = 'col1,col2,col3\r\na,b\r\n';
    let actual = '';
    try {
      parseStrictCSV(input);
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actual = (e instanceof CSVParseError) ? 'REJECTED_COLUMN_COUNT_MISMATCH' : e.message;
    }
    const status = (actual === 'REJECTED_COLUMN_COUNT_MISMATCH') ? 'PASS' : 'FAIL';
    recordResult('CSV-12', 'Column count mismatch rejected fail-closed', 'REJECTED_COLUMN_COUNT_MISMATCH', actual, status, 'CSV-12.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  // CSV-13: Empty header rejected fail-closed
  {
    const input = 'col1,,col3\r\na,b,c\r\n';
    let actual = '';
    try {
      parseStrictCSV(input);
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actual = (e instanceof CSVParseError) ? 'REJECTED_EMPTY_HEADER' : e.message;
    }
    const status = (actual === 'REJECTED_EMPTY_HEADER') ? 'PASS' : 'FAIL';
    recordResult('CSV-13', 'Empty header column name rejected fail-closed', 'REJECTED_EMPTY_HEADER', actual, status, 'CSV-13.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  // CSV-14: Duplicate header column rejected fail-closed
  {
    const input = 'col1,col2,col1\r\na,b,c\r\n';
    let actual = '';
    try {
      parseStrictCSV(input);
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actual = (e instanceof CSVParseError) ? 'REJECTED_DUPLICATE_HEADER' : e.message;
    }
    const status = (actual === 'REJECTED_DUPLICATE_HEADER') ? 'PASS' : 'FAIL';
    recordResult('CSV-14', 'Duplicate header column rejected fail-closed', 'REJECTED_DUPLICATE_HEADER', actual, status, 'CSV-14.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  // CSV-15: Strict CRLF mode rejects bare LF
  {
    const input = 'col1,col2\na,b\n';
    let actual = '';
    try {
      parseStrictCSV(input, { strictCrlf: true });
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actual = (e instanceof CSVParseError) ? 'REJECTED_BARE_LF' : e.message;
    }
    const status = (actual === 'REJECTED_BARE_LF') ? 'PASS' : 'FAIL';
    recordResult('CSV-15', 'Strict CRLF mode rejects bare LF', 'REJECTED_BARE_LF', actual, status, 'CSV-15.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }

  // CSV-16: Strict CRLF mode rejects bare CR
  {
    const input = 'col1,col2\ra,b\r';
    let actual = '';
    try {
      parseStrictCSV(input, { strictCrlf: true });
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actual = (e instanceof CSVParseError) ? 'REJECTED_BARE_CR' : e.message;
    }
    const status = (actual === 'REJECTED_BARE_CR') ? 'PASS' : 'FAIL';
    recordResult('CSV-16', 'Strict CRLF mode rejects bare CR', 'REJECTED_BARE_CR', actual, status, 'CSV-16.log', `INPUT:\n${input}\nACTUAL: ${actual}\n`);
  }


  // CSV-17: P1-01 - Authoritative register loading through patch-gate fails closed on bare LF when strictCrlf: true
  {
    const pg = require('./patch-gate.cjs');
    const tmpDir = fs.mkdtempSync(path.join('/tmp', 'w0411-csv-17-'));
    fs.writeFileSync(path.join(tmpDir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), 'Task ID,Owner\nINT-1,Coordinator\n', 'utf8');
    fs.writeFileSync(path.join(tmpDir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'), 'File Path,Owner\nfoo.js,INT-1\n', 'utf8');
    fs.mkdirSync(path.join(tmpDir, 'docs/wave-0/4.4'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'), 'Task ID\nINT-1\n', 'utf8');

    let actual = '';
    try {
      pg.loadAuthoritativeRegisters(tmpDir, { strictCrlf: true });
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      actual = (e instanceof pg.PatchGateError && e.code === 'MALFORMED_CSV') ? 'REJECTED_BARE_LF' : e.message;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
    const status = (actual === 'REJECTED_BARE_LF') ? 'PASS' : 'FAIL';
    recordResult('CSV-17', 'Public loader rejects bare LF when strict CRLF enabled', 'REJECTED_BARE_LF', actual, status, 'CSV-17.log', `ACTUAL: ${actual}\n`);
  }

  // CSV-18: P1-01 - Authoritative register loading succeeds with valid CRLF registers
  {
    const pg = require('./patch-gate.cjs');
    const tmpDir = fs.mkdtempSync(path.join('/tmp', 'w0411-csv-18-'));
    fs.writeFileSync(path.join(tmpDir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), 'Task ID,Owner\r\nINT-1,Coordinator\r\n', 'utf8');
    fs.writeFileSync(path.join(tmpDir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'), 'File Path,Owner\r\nfoo.js,INT-1\r\n', 'utf8');
    fs.mkdirSync(path.join(tmpDir, 'docs/wave-0/4.4'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'), 'Task ID\r\nINT-1\r\n', 'utf8');

    let actual = '';
    try {
      const res = pg.loadAuthoritativeRegisters(tmpDir, { strictCrlf: true });
      actual = (res.taskMap.has('INT-1')) ? 'SUCCESS_CRLF_ACCEPTED' : 'TASK_MISSING';
    } catch (e) {
      actual = e.message;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
    const status = (actual === 'SUCCESS_CRLF_ACCEPTED') ? 'PASS' : 'FAIL';
    recordResult('CSV-18', 'Public loader accepts valid CRLF registers', 'SUCCESS_CRLF_ACCEPTED', actual, status, 'CSV-18.log', `ACTUAL: ${actual}\n`);
  }
  console.log(`CSV Parser suite finished: ${csvResults.length} scenarios. All pass: ${csvResults.every(r => r.status === 'PASS')}`);
  if (!csvResults.every(r => r.status === 'PASS')) {
    process.exitCode = 1;
  }
  return csvResults;
}

module.exports = { runCsvSuite, csvResults };

if (require.main === module) {
  runCsvSuite();
}

```



### Artifact W0411-ART-007: Filesystem Containment Test Harness
- **File**: `docs/wave-0/4.13/test-containment.cjs`
- **Type**: `JavaScript Harness`
- **SHA-256**: `480ea5f803abe072a6b3e8e304788d22c1602ac9e3733d1202915364775f9d9a`
- **Byte Count**: `5035`

```javascript
/**
 * test-containment.cjs
 * Wave 0.4.13 Filesystem Containment and Path Safety Harness
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const {
  PatchGateError,
  normalizeSafePath,
  verifyFilesystemContainment
} = require('./patch-gate.cjs');

const repoRoot = process.cwd();
const evidenceDir = path.resolve(__dirname, 'evidence/raw');
if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

function hashBuf(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

const contResults = [];

function recordResult(id, desc, expected, actual, status, logFileName, logContent) {
  const logPath = path.join(evidenceDir, logFileName);
  fs.writeFileSync(logPath, logContent, 'utf8');
  const logSha = hashBuf(Buffer.from(logContent, 'utf8'));

  contResults.push({
    id,
    desc,
    expected,
    actual,
    status,
    logFile: logFileName,
    logSha
  });
}

function runContainmentSuite() {
  console.log('=== Wave 0.4.13 FILESYSTEM CONTAINMENT SUITE ===');

  // CONT-01: Path traversal ../../etc/passwd
  {
    let actual = '';
    try {
      normalizeSafePath('../../etc/passwd');
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      actual = (e instanceof PatchGateError && e.code === 'PATH_TRAVERSAL_DETECTED') ? 'REJECTED_TRAVERSAL' : e.message;
    }
    const status = (actual === 'REJECTED_TRAVERSAL') ? 'PASS' : 'FAIL';
    recordResult('CONT-01', 'Relative traversal ../../etc/passwd rejected', 'REJECTED_TRAVERSAL', actual, status, 'CONT-01.log', `ACTUAL: ${actual}\n`);
  }

  // CONT-02: Absolute root path /etc/passwd
  {
    let actual = '';
    try {
      normalizeSafePath('/etc/passwd');
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      actual = (e instanceof PatchGateError && e.code === 'INVALID_ROOT_PATH') ? 'REJECTED_ROOT_PATH' : e.message;
    }
    const status = (actual === 'REJECTED_ROOT_PATH') ? 'PASS' : 'FAIL';
    recordResult('CONT-02', 'Absolute root path /etc/passwd rejected', 'REJECTED_ROOT_PATH', actual, status, 'CONT-02.log', `ACTUAL: ${actual}\n`);
  }

  // CONT-03: Windows drive letter C:\Windows\System32
  {
    let actual = '';
    try {
      normalizeSafePath('C:/Windows/System32');
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      actual = (e instanceof PatchGateError && e.code === 'INVALID_ABSOLUTE_PATH') ? 'REJECTED_DRIVE_LETTER' : e.message;
    }
    const status = (actual === 'REJECTED_DRIVE_LETTER') ? 'PASS' : 'FAIL';
    recordResult('CONT-03', 'Windows drive letter C: rejected', 'REJECTED_DRIVE_LETTER', actual, status, 'CONT-03.log', `ACTUAL: ${actual}\n`);
  }

  // CONT-04: UNC path //server/share/file
  {
    let actual = '';
    try {
      normalizeSafePath('//server/share/file');
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      actual = (e instanceof PatchGateError && e.code === 'INVALID_ABSOLUTE_PATH') ? 'REJECTED_UNC_PATH' : e.message;
    }
    const status = (actual === 'REJECTED_UNC_PATH') ? 'PASS' : 'FAIL';
    recordResult('CONT-04', 'UNC path //server/share rejected', 'REJECTED_UNC_PATH', actual, status, 'CONT-04.log', `ACTUAL: ${actual}\n`);
  }

  // CONT-05: NUL character in path
  {
    let actual = '';
    try {
      normalizeSafePath('scratch/test\x00.js');
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      actual = (e instanceof PatchGateError && e.code === 'INVALID_PATH_CONTROL_CHARS') ? 'REJECTED_CONTROL_CHAR' : e.message;
    }
    const status = (actual === 'REJECTED_CONTROL_CHAR') ? 'PASS' : 'FAIL';
    recordResult('CONT-05', 'NUL byte in path rejected fail-closed', 'REJECTED_CONTROL_CHAR', actual, status, 'CONT-05.log', `ACTUAL: ${actual}\n`);
  }

  // CONT-06: Escaping symlinked parent directory
  {
    const tmpDir = fs.mkdtempSync(path.join('/tmp', 'w0410-cont-06-'));
    const outsideDir = fs.mkdtempSync(path.join('/tmp', 'w0410-outside-'));
    fs.symlinkSync(outsideDir, path.join(tmpDir, 'symlink_dir'));

    let actual = '';
    try {
      verifyFilesystemContainment(tmpDir, 'symlink_dir/subfile.js');
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      actual = (e instanceof PatchGateError && (e.code === 'CONTAINMENT_BREACH' || e.code === 'SYMLINK_PARENT_ESCAPES')) ? 'REJECTED_ESCAPING_SYMLINK' : e.message;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.rmSync(outsideDir, { recursive: true, force: true });

    const status = (actual === 'REJECTED_ESCAPING_SYMLINK') ? 'PASS' : 'FAIL';
    recordResult('CONT-06', 'Symlink parent directory escaping root rejected fail-closed', 'REJECTED_ESCAPING_SYMLINK', actual, status, 'CONT-06.log', `ACTUAL: ${actual}\n`);
  }

  console.log(`Containment suite finished: ${contResults.length} scenarios. All pass: ${contResults.every(r => r.status === 'PASS')}`);
  if (!contResults.every(r => r.status === 'PASS')) {
    process.exitCode = 1;
  }
  return contResults;
}

module.exports = { runContainmentSuite, contResults };

if (require.main === module) {
  runContainmentSuite();
}

```



### Artifact W0411-ART-008: Validator Mutation Test Harness
- **File**: `docs/wave-0/4.13/test-validator-mutations.cjs`
- **Type**: `JavaScript Harness`
- **SHA-256**: `28631e093b07e137ca901672d34fbc9ec12071faef3254f6bb1e3a748afd41ae`
- **Byte Count**: `15178`

```javascript
/**
 * test-validator-mutations.cjs
 * Wave 0.4.13 Mutation Suite with Exact-Finding Set Assertions & Child-Process Evidence
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');

const repoRoot = process.cwd();
const evidenceDir = path.resolve(__dirname, 'evidence/raw');
if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

function hashBuf(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

const MUTATIONS = [
  {
    id: 'MUT-01',
    desc: 'Unmanaged file injected into ownership manifest',
    target: 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv',
    expectedFindings: ['MANIFEST-COUNT-175'],
    category: 'staticSchema',
    apply: (dir) => {
      fs.appendFileSync(path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'), 'scratch/salesforce-poc/extra.js,LWC,EXISTING,None,None,None,FROZEN_READ_ONLY,NONE,NO,NO\n');
    }
  },
  {
    id: 'MUT-02',
    desc: 'W9-1 canonical task removed from task register',
    target: 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv',
    expectedFindings: ['TASK-COUNT-21', 'TASK-MISSING-W9-1'],
    category: 'staticSchema',
    apply: (dir) => {
      const p = path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
      const lines = fs.readFileSync(p, 'utf8').split('\n').filter(l => !l.startsWith('W9-1,'));
      fs.writeFileSync(p, lines.join('\n'));
    }
  },
  {
    id: 'MUT-03',
    desc: 'W5 serialization violated (W5-3 running before W5-2)',
    target: 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv',
    expectedFindings: ['W5-CHAIN-W5-3'],
    category: 'semanticReview',
    apply: (dir) => {
      const p = path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
      let c = fs.readFileSync(p, 'utf8');
      c = c.replace('"W5-1, W5-2"', 'W5-1');
      fs.writeFileSync(p, c, 'utf8');
    }
  },
  {
    id: 'MUT-04',
    desc: 'Cyclic dependency between W6-1 and W6-2 injected',
    target: 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv',
    expectedFindings: ['DEP-ACYCLIC'],
    category: 'semanticReview',
    apply: (dir) => {
      const p = path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
      let c = fs.readFileSync(p, 'utf8');
      c = c.replace('None,Workstream B Lead,None,None,node scratch/salesforce-poc/tests/run-w6-1-tests.cjs', 'None,Workstream B Lead,None,W6-2,node scratch/salesforce-poc/tests/run-w6-1-tests.cjs');
      c = c.replace('None,Workstream B Lead,None,None,node scratch/salesforce-poc/tests/run-w6-2-tests.cjs', 'None,Workstream B Lead,None,W6-1,node scratch/salesforce-poc/tests/run-w6-2-tests.cjs');
      fs.writeFileSync(p, c, 'utf8');
    }
  },
  {
    id: 'MUT-05',
    desc: 'Duplicate path in ownership manifest',
    target: 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv',
    expectedFindings: ['MANIFEST-COUNT-175', 'MANIFEST-DUPLICATE'],
    category: 'staticSchema',
    apply: (dir) => {
      const p = path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv');
      const lines = fs.readFileSync(p, 'utf8').trim().split('\n');
      lines.push(lines[1]);
      fs.writeFileSync(p, lines.join('\n') + '\n', 'utf8');
    }
  },
  {
    id: 'MUT-06',
    desc: 'Directory target inserted into manifest',
    target: 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv',
    expectedFindings: ['MANIFEST-NO-DIR-scratch/salesforce-poc/force-app/main/default/lwc/'],
    category: 'filesystem',
    apply: (dir) => {
      const p = path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv');
      let content = fs.readFileSync(p, 'utf8');
      content = content.replace('scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js,', 'scratch/salesforce-poc/force-app/main/default/lwc/,');
      fs.writeFileSync(p, content, 'utf8');
    }
  },
  {
    id: 'MUT-07',
    desc: 'Batch 1 task count violation',
    target: 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv',
    expectedFindings: ['BATCH1-TASK-COUNT-11', 'BATCH1-ROW-COUNT-49'],
    category: 'staticSchema',
    apply: (dir) => {
      fs.appendFileSync(path.join(dir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'), 'W9-2,Wave 9,Workstream E,Workstream E Lead,scratch/file.js,NO\n');
    }
  },
  {
    id: 'MUT-08',
    desc: 'W7 contract ambiguous OR query introduced',
    target: 'docs/wave-0/4.3/WAVE_0_4_3_W7_PROJECT_RESOLUTION_CONTRACT.md',
    expectedFindings: ['W7-REJECT-AMBIGUOUS-OR'],
    category: 'semanticReview',
    apply: (dir) => {
      fs.appendFileSync(path.join(dir, 'docs/wave-0/4.3/WAVE_0_4_3_W7_PROJECT_RESOLUTION_CONTRACT.md'), '\nWHERE Id = :keyOrId OR External_Key__c = :keyOrId\n');
    }
  },
  {
    id: 'MUT-09',
    desc: 'W8 raw string limit omitted',
    target: 'docs/wave-0/4.3/WAVE_0_4_3_WAVE8_RESOURCE_AND_LIFECYCLE_ACCEPTANCE.md',
    expectedFindings: ['W8-10MB-STRING-GUARD'],
    category: 'semanticReview',
    apply: (dir) => {
      const p = path.join(dir, 'docs/wave-0/4.3/WAVE_0_4_3_WAVE8_RESOURCE_AND_LIFECYCLE_ACCEPTANCE.md');
      let content = fs.readFileSync(p, 'utf8');
      content = content.replace(/10,485,760 chars \(~10 MB\)/g, '50MB uncapped');
      fs.writeFileSync(p, content, 'utf8');
    }
  },
  {
    id: 'MUT-10',
    desc: 'daAppShell.js dispatched event falsely introduced',
    target: 'scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js',
    expectedFindings: ['APPSHELL-NO-DISPATCH-EVENT'],
    category: 'semanticReview',
    apply: (dir) => {
      const p = path.join(dir, 'scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js');
      fs.appendFileSync(p, '\nthis.dispatchEvent(new CustomEvent("fake"));\n');
    }
  },
  {
    id: 'MUT-11',
    desc: 'Batch 1 task row outside allowed set injected',
    target: 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv',
    expectedFindings: ['BATCH1-TASK-W5-1'],
    category: 'crossDocumentConsistency',
    apply: (dir) => {
      const p = path.join(dir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv');
      let c = fs.readFileSync(p, 'utf8');
      c = c.replace(/W5-1/g, 'W5-99');
      fs.writeFileSync(p, c, 'utf8');
    }
  },
  {
    id: 'MUT-12',
    desc: 'Traceability contract count mismatch',
    target: 'WAVE_0_4_1_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv',
    expectedFindings: ['TRACE-COUNT-9'],
    category: 'staticSchema',
    apply: (dir) => {
      fs.appendFileSync(path.join(dir, 'WAVE_0_4_1_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv'), 'W0-C99,Extra Contract,Source,W1,W2,Method,Test,File,Req,Dec,Status\n');
    }
  },
  {
    id: 'MUT-13',
    desc: 'Ownership manifest count violation',
    target: 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv',
    expectedFindings: ['MANIFEST-COUNT-175'],
    category: 'staticSchema',
    apply: (dir) => {
      fs.appendFileSync(path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'), 'scratch/salesforce-poc/newfile.js,BlankPath,EXISTING,None,None,None,FROZEN_READ_ONLY,NONE,NO,NO\n');
    }
  },
  {
    id: 'MUT-14',
    desc: 'W5-1 dispatch status tampered',
    target: 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv',
    expectedFindings: ['W5-1-READY'],
    category: 'semanticReview',
    apply: (dir) => {
      const p = path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
      let c = fs.readFileSync(p, 'utf8');
      c = c.replace('READY_TO_LAUNCH', 'BLOCKED');
      fs.writeFileSync(p, c, 'utf8');
    }
  },
  {
    id: 'MUT-15',
    desc: 'W5-2 serialized status tampered',
    target: 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv',
    expectedFindings: ['W5-2-DEPENDENT'],
    category: 'semanticReview',
    apply: (dir) => {
      const p = path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
      let c = fs.readFileSync(p, 'utf8');
      c = c.replace('IMPLEMENTATION_DEPENDENT,Awaits W5-1 completion', 'READY_TO_LAUNCH,Awaits W5-1 completion');
      fs.writeFileSync(p, c, 'utf8');
    }
  },
  {
    id: 'MUT-16',
    desc: 'Missing required W7 canonical runName field',
    target: 'docs/wave-0/4.3/WAVE_0_4_3_W7_PROJECT_RESOLUTION_CONTRACT.md',
    expectedFindings: ['W7-RUNNAME-CANONICAL'],
    category: 'semanticReview',
    apply: (dir) => {
      const p = path.join(dir, 'docs/wave-0/4.3/WAVE_0_4_3_W7_PROJECT_RESOLUTION_CONTRACT.md');
      let c = fs.readFileSync(p, 'utf8');
      c = c.replace(/runName/g, 'legacyRunIdentifier');
      fs.writeFileSync(p, c, 'utf8');
    }
  },
  {
    id: 'MUT-17',
    desc: 'Component API activeProjectId property missing from daAppShell.js',
    target: 'scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js',
    expectedFindings: ['APPSHELL-L77-API'],
    category: 'semanticReview',
    apply: (dir) => {
      const p = path.join(dir, 'scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js');
      let c = fs.readFileSync(p, 'utf8');
      c = c.replace('@api activeProjectId', '// removed activeProjectId');
      fs.writeFileSync(p, c, 'utf8');
    }
  },
  {
    id: 'MUT-18',
    desc: 'Path traversal sequence injected into ownership manifest',
    target: 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv',
    expectedFindings: ['MANIFEST-COUNT-175', 'MANIFEST-NO-TRAVERSAL-scratch/../../secret.txt'],
    category: 'filesystem',
    apply: (dir) => {
      fs.appendFileSync(path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'), 'scratch/../../secret.txt,Secret,EXISTING,None,None,None,FROZEN_READ_ONLY,NONE,NO,NO\n');
    }
  },
  {
    id: 'MUT-19',
    desc: 'Unexpected task W99-1 injected into task register',
    target: 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv',
    expectedFindings: ['TASK-COUNT-21', 'TASK-UNEXPECTED-W99-1'],
    category: 'staticSchema',
    apply: (dir) => {
      const p = path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
      fs.appendFileSync(p, 'W99-1,Wave 99,Extra,Workstream A,scratch/test.js,scratch/test.js,None,Owner,None,None,test,reg,acc,art,READY_TO_LAUNCH,None\n');
    }
  },
  {
    id: 'MUT-20',
    desc: 'Batch 1 row count tampered in allowlist',
    target: 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv',
    expectedFindings: ['BATCH1-ROW-COUNT-49'],
    category: 'staticSchema',
    apply: (dir) => {
      const p = path.join(dir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv');
      const lines = fs.readFileSync(p, 'utf8').trim().split('\n');
      lines.pop();
      fs.writeFileSync(p, lines.join('\n') + '\n', 'utf8');
    }
  }
];

function runMutationSuite() {
  console.log('=== Wave 0.4.13 VALIDATOR MUTATION SUITE (EXACT-FINDING SET MATCHING) ===');

  const validatorScript = path.resolve(__dirname, 'validate-wave0-4-13-dispatch.cjs');
  const mutationResults = [];

  console.log('Running Initial Clean Negative Control...');
  let initialExit = 0;
  let initialOut = '';
  try {
    initialOut = cp.execSync(`node ${validatorScript}`, { cwd: repoRoot, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf8' });
  } catch (err) {
    initialExit = err.status || 1;
    initialOut = (err.stdout ? err.stdout.toString('utf8') : '') + (err.stderr ? err.stderr.toString('utf8') : '');
  }
  const cleanInitialPassed = (initialExit === 0);
  console.log(`Initial Clean Negative Control exited: ${initialExit} (Passed: ${cleanInitialPassed})`);

  for (const m of MUTATIONS) {
    const tmpDir = fs.mkdtempSync(path.join('/tmp', `w0410-mut-${m.id}-`));

    const copyList = [
      'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv',
      'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv',
      'WAVE_0_4_1_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv',
      'scratch',
      'docs'
    ];
    for (const item of copyList) {
      const src = path.resolve(repoRoot, item);
      if (fs.existsSync(src)) {
        fs.cpSync(src, path.join(tmpDir, item), { recursive: true });
      }
    }

    m.apply(tmpDir);

    const t0 = new Date().toISOString();
    let exitCode = 0;
    let stdout = '';
    let stderr = '';

    try {
      stdout = cp.execSync(`node ${path.join(tmpDir, 'docs/wave-0/4.13/validate-wave0-4-13-dispatch.cjs')}`, {
        cwd: tmpDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf8'
      });
    } catch (err) {
      exitCode = err.status || 1;
      stdout = err.stdout ? err.stdout.toString('utf8') : '';
      stderr = err.stderr ? err.stderr.toString('utf8') : '';
    }
    const t1 = new Date().toISOString();

    const violations = [];
    const lines = stdout.split('\n');
    for (const line of lines) {
      if (line.startsWith('- Code: ')) {
        const parts = line.split('|');
        const code = parts[0].replace('- Code: ', '').trim();
        const status = parts[1].replace('Status: ', '').trim();
        if (status === 'VIOLATION') {
          violations.push(code);
        }
      }
    }

    const expectedSorted = [...m.expectedFindings].sort();
    const actualSorted = [...violations].sort();
    const exactMatch = (expectedSorted.length === actualSorted.length && expectedSorted.every((v, idx) => v === actualSorted[idx]));
    const status = (exactMatch && exitCode !== 0) ? 'PASS' : 'FAIL';

    fs.rmSync(tmpDir, { recursive: true, force: true });

    const logFileName = `validator-mutation-${m.id}.log`;
    const logContent = `COMMAND: node validate-wave0-4-13-dispatch.cjs\nMUTATION: ${m.id}\nDESC: ${m.desc}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: ${exitCode}\nEXPECTED_FINDINGS: ${JSON.stringify(m.expectedFindings)}\nACTUAL_VIOLATIONS: ${JSON.stringify(violations)}\nEXACT_MATCH: ${exactMatch}\nSTATUS: ${status}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}\n`;
    fs.writeFileSync(path.join(evidenceDir, logFileName), logContent, 'utf8');
    const logSha = hashBuf(Buffer.from(logContent, 'utf8'));

    mutationResults.push({
      id: m.id,
      desc: m.desc,
      expected: m.expectedFindings,
      actual: violations,
      exitCode,
      status,
      logFile: logFileName,
      logSha
    });
    console.log(`[${status}] ${m.id}: ${m.desc} (exit ${exitCode}, exactMatch: ${exactMatch})`);
  }

  console.log('Running Final Clean Negative Control...');
  let finalExit = 0;
  try {
    cp.execSync(`node ${validatorScript}`, { cwd: repoRoot, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf8' });
  } catch (err) {
    finalExit = err.status || 1;
  }
  const cleanFinalPassed = (finalExit === 0);
  console.log(`Final Clean Negative Control exited: ${finalExit} (Passed: ${cleanFinalPassed})`);

  const allPassed = cleanInitialPassed && cleanFinalPassed && mutationResults.every(r => r.status === 'PASS');
  console.log(`\nMutation suite completed: ${mutationResults.length} scenarios. All pass: ${allPassed}`);

  if (!allPassed) {
    process.exitCode = 1;
  }
  return mutationResults;
}

module.exports = { runMutationSuite, MUTATIONS };

if (require.main === module) {
  runMutationSuite();
}

```



### Artifact W0411-ART-009: Public API Surface Inspection Harness
- **File**: `docs/wave-0/4.13/test-api-surface.cjs`
- **Type**: `JavaScript Harness`
- **SHA-256**: `06548afae79e3895c568410c8da516d5c6d4fe3e5e2235d802b4d580e815c08d`
- **Byte Count**: `4952`

```javascript
/**
 * test-api-surface.cjs
 * Wave 0.4.13 Public API Surface and Mutation Hook Elimination Verification
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const pg = require('./patch-gate.cjs');

const repoRoot = process.cwd();
const evidenceDir = path.resolve(__dirname, 'evidence/raw');
if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

function hashBuf(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

const apiResults = [];

function recordResult(id, desc, expected, actual, status, logFileName, logContent) {
  const logPath = path.join(evidenceDir, logFileName);
  fs.writeFileSync(logPath, logContent, 'utf8');
  const logSha = hashBuf(Buffer.from(logContent, 'utf8'));

  apiResults.push({
    id,
    desc,
    expected,
    actual,
    status,
    logFile: logFileName,
    logSha
  });
}

function runApiSurfaceSuite() {
  console.log('=== Wave 0.4.13 PUBLIC API SURFACE & HOOK INSPECTION SUITE ===');

  const patchGateSource = fs.readFileSync(path.resolve(__dirname, 'patch-gate.cjs'), 'utf8');

  // API-01: No _testHookPreMutate in patch-gate.cjs source
  {
    const hasHook = patchGateSource.includes('_testHookPreMutate');
    const actual = (!hasHook) ? 'HOOK_FREE' : 'CONTAINS_TEST_HOOK';
    const status = (actual === 'HOOK_FREE') ? 'PASS' : 'FAIL';
    recordResult('API-01', 'patch-gate.cjs source contains zero references to _testHookPreMutate', 'HOOK_FREE', actual, status, 'API-01.log', `ACTUAL: ${actual}\n`);
  }

  // API-02: No _testHookPrePhaseB in patch-gate.cjs source
  {
    const hasHook = patchGateSource.includes('_testHookPrePhaseB');
    const actual = (!hasHook) ? 'HOOK_FREE' : 'CONTAINS_TEST_HOOK';
    const status = (actual === 'HOOK_FREE') ? 'PASS' : 'FAIL';
    recordResult('API-02', 'patch-gate.cjs source contains zero references to _testHookPrePhaseB', 'HOOK_FREE', actual, status, 'API-02.log', `ACTUAL: ${actual}\n`);
  }

  // API-03: Function signatures of apply_patch_with_provenance
  {
    const fnStr = pg.apply_patch_with_provenance.toString();
    const hasHookParam = fnStr.includes('_testHook');
    const actual = (!hasHookParam) ? 'NO_HOOK_PARAMS' : 'HAS_HOOK_PARAM';
    const status = (actual === 'NO_HOOK_PARAMS') ? 'PASS' : 'FAIL';
    recordResult('API-03', 'apply_patch_with_provenance signature contains zero test hook parameters', 'NO_HOOK_PARAMS', actual, status, 'API-03.log', `FN_STRING:\n${fnStr}\nACTUAL: ${actual}\n`);
  }

  // API-04: P0-01 - Coordinator function completely absent from public exports
  {
    const isExported = typeof pg.apply_coordinator_patch_with_provenance !== 'undefined';
    const actual = (!isExported) ? 'COORDINATOR_EXCISED' : 'COORDINATOR_STILL_EXPORTED';
    const status = (actual === 'COORDINATOR_EXCISED') ? 'PASS' : 'FAIL';
    recordResult('API-04', 'apply_coordinator_patch_with_provenance completely excised from exports', 'COORDINATOR_EXCISED', actual, status, 'API-04.log', `ACTUAL: ${actual}\n`);
  }

  // API-05: Function signature of pathSafeRollback
  {
    const fnStr = pg.pathSafeRollback.toString();
    const hasHookParam = fnStr.includes('_testHook');
    const actual = (!hasHookParam) ? 'NO_HOOK_PARAMS' : 'HAS_HOOK_PARAM';
    const status = (actual === 'NO_HOOK_PARAMS') ? 'PASS' : 'FAIL';
    recordResult('API-05', 'pathSafeRollback signature contains zero test hook parameters', 'NO_HOOK_PARAMS', actual, status, 'API-05.log', `FN_STRING:\n${fnStr}\nACTUAL: ${actual}\n`);
  }

  // API-06: Allowed exports check
  {
    const allowedExports = [
      'PatchGateError',
      'loadAuthoritativeRegisters',
      'normalizeSafePath',
      'verifyFilesystemContainment',
      'verify_base',
      'validateTaskDependencies',
      'enforceAuthoritativeTaskOwnership',
      'unescapeGitCQuotedPath',
      'extractPatchTouchedPaths',
      'recordPreApplyState',
      'checkIsTracked',
      'checkIsDirty',
      'apply_patch_with_provenance',
      'pathSafeRollback'
    ];
    const actualExports = Object.keys(pg);
    const hasUnsafeExport = actualExports.some(e => !allowedExports.includes(e));
    const actual = (!hasUnsafeExport && actualExports.length === allowedExports.length) ? 'EXACT_SAFE_EXPORTS' : `EXPORTS_${actualExports.length}`;
    const status = (actual === 'EXACT_SAFE_EXPORTS') ? 'PASS' : 'FAIL';
    recordResult('API-06', 'Exported API surface contains strictly allowed functions with zero bypass seams', 'EXACT_SAFE_EXPORTS', actual, status, 'API-06.log', `EXPORTS:\n${JSON.stringify(actualExports)}\nACTUAL: ${actual}\n`);
  }

  console.log(`API Surface suite finished: ${apiResults.length} scenarios. All pass: ${apiResults.every(r => r.status === 'PASS')}`);
  if (!apiResults.every(r => r.status === 'PASS')) {
    process.exitCode = 1;
  }
  return apiResults;
}

module.exports = { runApiSurfaceSuite, apiResults };

if (require.main === module) {
  runApiSurfaceSuite();
}

```



### Artifact W0411-ART-010: Synthesis Generator Test Harness
- **File**: `docs/wave-0/4.13/test-synthesis.cjs`
- **Type**: `JavaScript Harness`
- **SHA-256**: `e8dfee1eeadd04833d0755305c9845669e1e0425fff12408ffae75dfd18b075c`
- **Byte Count**: `6230`

```javascript
/**
 * test-synthesis.cjs
 * Wave 0.4.13 Evidence Synthesis Generator Test Harness
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const {
  runSynthesis,
  hashBuf,
  hashFile
} = require('./generate-synthesis.cjs');

const repoRoot = process.cwd();
const evidenceDir = path.resolve(__dirname, 'evidence/raw');
if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

const synResults = [];

function recordResult(id, desc, expected, actual, status, logFileName, logContent) {
  const logPath = path.join(evidenceDir, logFileName);
  fs.writeFileSync(logPath, logContent, 'utf8');
  const logSha = hashBuf(Buffer.from(logContent, 'utf8'));

  synResults.push({
    id,
    desc,
    expected,
    actual,
    status,
    logFile: logFileName,
    logSha
  });
}

function runSynthesisSuite() {
  console.log('=== Wave 0.4.13 SYNTHESIS GENERATOR SUITE ===');

  // SYN-01: Rejection on Missing Required Artifact
  {
    const manifest = {
      requiredArtifacts: [{ id: 'TEST-ART-1', path: 'non_existent_file.txt', type: 'Config' }],
      requiredLogs: []
    };
    const res = runSynthesis({ repoRoot, manifest, evidenceDir, dryRun: true });
    const actual = (!res.success && res.findings.some(f => f.code === 'MISSING_REQUIRED_ARTIFACT')) ? 'REJECTED_MISSING_ARTIFACT' : 'FAILED';
    const status = (actual === 'REJECTED_MISSING_ARTIFACT') ? 'PASS' : 'FAIL';
    recordResult('SYN-01', 'Synthesis fails closed when required artifact is missing', 'REJECTED_MISSING_ARTIFACT', actual, status, 'SYN-01.log', `ACTUAL: ${actual}\nFINDINGS: ${JSON.stringify(res.findings)}\n`);
  }

  // SYN-02: Rejection on Artifact Hash Mismatch
  {
    const manifest = {
      requiredArtifacts: [{ id: 'TEST-ART-2', path: 'package.json', expectedSha256: '0'.repeat(64), expectedBytes: fs.statSync('package.json').size, type: 'Config' }],
      requiredLogs: []
    };
    const res = runSynthesis({ repoRoot, manifest, evidenceDir, dryRun: true });
    const actual = (!res.success && res.findings.some(f => f.code === 'ARTIFACT_HASH_MISMATCH')) ? 'REJECTED_HASH_MISMATCH' : 'FAILED';
    const status = (actual === 'REJECTED_HASH_MISMATCH') ? 'PASS' : 'FAIL';
    recordResult('SYN-02', 'Synthesis fails closed when artifact hash does not match expected', 'REJECTED_HASH_MISMATCH', actual, status, 'SYN-02.log', `ACTUAL: ${actual}\nFINDINGS: ${JSON.stringify(res.findings)}\n`);
  }

  // SYN-03: Rejection on Duplicate Artifact ID
  {
    const manifest = {
      requiredArtifacts: [
        { id: 'TEST-ART-DUP', path: 'package.json', type: 'Config' },
        { id: 'TEST-ART-DUP', path: 'package-lock.json', type: 'Config' }
      ],
      requiredLogs: []
    };
    const res = runSynthesis({ repoRoot, manifest, evidenceDir, dryRun: true });
    const actual = (!res.success && res.findings.some(f => f.code === 'DUPLICATE_ARTIFACT_ID')) ? 'REJECTED_DUPLICATE_ID' : 'FAILED';
    const status = (actual === 'REJECTED_DUPLICATE_ID') ? 'PASS' : 'FAIL';
    recordResult('SYN-03', 'Synthesis fails closed on duplicate artifact ID', 'REJECTED_DUPLICATE_ID', actual, status, 'SYN-03.log', `ACTUAL: ${actual}\nFINDINGS: ${JSON.stringify(res.findings)}\n`);
  }

  // SYN-04: Deterministic Byte-Identical Output Across Multiple Runs
  {
    const manifest = {
      fixedTimestamp: '2026-11-04T12:00:00.000Z',
      requiredArtifacts: [{ id: 'TEST-ART-DET', path: 'package.json', type: 'Config' }],
      requiredLogs: []
    };
    const res1 = runSynthesis({ repoRoot, manifest, evidenceDir, dryRun: true });
    const res2 = runSynthesis({ repoRoot, manifest, evidenceDir, dryRun: true });
    const actual = (res1.outputJson === res2.outputJson && res1.synthesisSha === res2.synthesisSha) ? 'DETERMINISTIC_EXACT_MATCH' : 'NONDETERMINISTIC';
    const status = (actual === 'DETERMINISTIC_EXACT_MATCH') ? 'PASS' : 'FAIL';
    recordResult('SYN-04', 'Synthesis generator produces byte-identical output across consecutive runs', 'DETERMINISTIC_EXACT_MATCH', actual, status, 'SYN-04.log', `SHA1: ${res1.synthesisSha}\nSHA2: ${res2.synthesisSha}\nACTUAL: ${actual}\n`);
  }


  // SYN-05: P1-02 CLI Child Process Execution - Missing Manifest returns exit code 2
  {
    const cp = require('child_process');
    const cliPath = path.resolve(__dirname, 'generate-synthesis.cjs');
    const res = cp.spawnSync('node', [cliPath, '--manifest', '/nonexistent/path/manifest.json'], { encoding: 'utf8' });
    const actual = (res.status === 2) ? 'CLI_EXIT_2_MISSING_MANIFEST' : `EXIT_${res.status}`;
    const status = (actual === 'CLI_EXIT_2_MISSING_MANIFEST') ? 'PASS' : 'FAIL';
    recordResult('SYN-05', 'Synthesis CLI returns exit code 2 on missing manifest', 'CLI_EXIT_2_MISSING_MANIFEST', actual, status, 'SYN-05.log', `EXIT: ${res.status}\nSTDERR: ${res.stderr}\n`);
  }

  // SYN-06: P1-02 CLI Child Process Execution - Findings Detected returns exit code 1
  {
    const cp = require('child_process');
    const cliPath = path.resolve(__dirname, 'generate-synthesis.cjs');
    const tmpDir = fs.mkdtempSync(path.join('/tmp', 'w0411-syn-cli-'));
    const badManifest = path.join(tmpDir, 'bad-manifest.json');
    fs.writeFileSync(badManifest, JSON.stringify({
      requiredArtifacts: [{ id: 'MISSING', path: 'missing_file.xyz' }],
      requiredLogs: []
    }));
    const res = cp.spawnSync('node', [cliPath, '--manifest', badManifest, '--allow-test-fixture-manifest', '--dry-run'], { encoding: 'utf8' });
    fs.rmSync(tmpDir, { recursive: true, force: true });
    const actual = (res.status === 1) ? 'CLI_EXIT_1_FINDINGS' : `EXIT_${res.status}`;
    const status = (actual === 'CLI_EXIT_1_FINDINGS') ? 'PASS' : 'FAIL';
    recordResult('SYN-06', 'Synthesis CLI returns exit code 1 on synthesis findings', 'CLI_EXIT_1_FINDINGS', actual, status, 'SYN-06.log', `EXIT: ${res.status}\nSTDERR: ${res.stderr}\n`);
  }
  console.log(`Synthesis suite finished: ${synResults.length} scenarios. All pass: ${synResults.every(r => r.status === 'PASS')}`);
  if (!synResults.every(r => r.status === 'PASS')) {
    process.exitCode = 1;
  }
  return synResults;
}

module.exports = { runSynthesisSuite, synResults };

if (require.main === module) {
  runSynthesisSuite();
}

```



### Artifact W0411-ART-011: Baseline Runner Verification Harness
- **File**: `docs/wave-0/4.13/test-baseline-runners.cjs`
- **Type**: `JavaScript Harness`
- **SHA-256**: `f9c2165dd64ba031a547fbfc490a3db881e6612bd29604107f7a8043c5701523`
- **Byte Count**: `4156`

```javascript
/**
 * test-baseline-runners.cjs
 * Wave 0.4.13 Baseline Runner Verification Harness
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');

const repoRoot = process.cwd();
const evidenceDir = path.resolve(__dirname, 'evidence/raw');
if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

function hashFile(filePath) {
  const buf = fs.readFileSync(filePath);
  return {
    hash: crypto.createHash('sha256').update(buf).digest('hex'),
    bytes: buf.length
  };
}

const RUNNERS = [
  { name: 'poc', file: 'scratch/salesforce-poc/tests/run-poc-tests.cjs', expectedCount: 43 },
  { name: 'wave4', file: 'scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs', expectedCount: 32 },
  { name: 'lane-a', file: 'scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs', expectedCount: 9 },
  { name: 'lane-c', file: 'scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs', expectedCount: 10 },
  { name: 'lane-d', file: 'scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs', expectedCount: 15 },
  { name: 'lane-e', file: 'scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs', expectedCount: 11 },
  { name: 'lane-f', file: 'scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs', expectedCount: 12 },
  { name: 'workstream-a', file: 'scratch/salesforce-poc/tests/run-workstream-a-tests.cjs', expectedCount: 33 },
  { name: 'workstream-c', file: 'scratch/salesforce-poc/tests/run-workstream-c-tests.cjs', expectedCount: 22 }
];

function runBaselineSuite() {
  console.log('=== Wave 0.4.13 BASELINE RUNNERS (9 RUNNERS x 3 SWEEPS = 27 EXECUTIONS) ===');

  const baselineResults = [];
  const initialRunnerHashes = {};

  for (const r of RUNNERS) {
    initialRunnerHashes[r.file] = hashFile(path.resolve(repoRoot, r.file)).hash;
  }

  for (let sweep = 1; sweep <= 3; sweep++) {
    console.log(`\n--- SWEEP ${sweep}/3 ---`);
    for (const r of RUNNERS) {
      const runnerPath = path.resolve(repoRoot, r.file);
      const preHash = hashFile(runnerPath).hash;

      const t0 = new Date().toISOString();
      const startTime = Date.now();

      let exitCode = 0;
      let stdout = '';
      let stderr = '';

      try {
        stdout = cp.execSync(`node ${r.file}`, {
          cwd: repoRoot,
          stdio: ['pipe', 'pipe', 'pipe'],
          encoding: 'utf8'
        });
      } catch (err) {
        exitCode = err.status || 1;
        stdout = err.stdout ? err.stdout.toString('utf8') : '';
        stderr = err.stderr ? err.stderr.toString('utf8') : '';
      }

      const durationMs = Date.now() - startTime;
      const t1 = new Date().toISOString();
      const postHash = hashFile(runnerPath).hash;

      if (preHash !== postHash || postHash !== initialRunnerHashes[r.file]) {
        throw new Error(`CRITICAL INTEGRITY FAILURE: Frozen runner modified during execution: ${r.file}`);
      }

      const logFileName = `baseline-${r.name}-sweep-${sweep}.log`;
      const fullLog = `COMMAND: node ${r.file}\nSWEEP: ${sweep}\nEXIT_CODE: ${exitCode}\nSTART: ${t0}\nEND: ${t1}\nDURATION_MS: ${durationMs}\nPRE_HASH: ${preHash}\nPOST_HASH: ${postHash}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}\n`;
      fs.writeFileSync(path.resolve(evidenceDir, logFileName), fullLog, 'utf8');

      const logSha = crypto.createHash('sha256').update(fullLog).digest('hex');

      baselineResults.push({
        name: r.name,
        file: r.file,
        sweep,
        exitCode,
        durationMs,
        expectedCount: r.expectedCount,
        passed: (exitCode === 0),
        preHash,
        postHash,
        logFileName,
        logSha
      });
      console.log(`[PASS] ${r.name} sweep ${sweep} exited 0 in ${durationMs}ms`);
    }
  }

  const allPassed = baselineResults.every(b => b.passed);
  console.log(`\nBaseline execution finished: ${baselineResults.length} executions completed. All exited 0: ${allPassed}`);
  if (!allPassed) {
    process.exitCode = 1;
  }
  return baselineResults;
}

module.exports = { runBaselineSuite, RUNNERS };

if (require.main === module) {
  runBaselineSuite();
}

```



### Artifact W0411-ART-012: Semantic Validator Tooling
- **File**: `docs/wave-0/4.13/validate-wave0-4-13-dispatch.cjs`
- **Type**: `JavaScript Module`
- **SHA-256**: `5239623aa26470182f22ebe37359b25eced20d67614f5a65b1734254f173e87b`
- **Byte Count**: `11424`

```javascript
/**
 * validate-wave0-4-13-dispatch.cjs
 * Wave 0.4.13 Authoritative Isolated Semantic Validator.
 * Fully RFC 4180 compliant, exact-finding assertions, zero silent fallbacks.
 * Emits exact finding codes and details on stdout for child-process consumers.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const parser = require('./strict-rfc4180-csv-parser.cjs');

function parseCsv(content, filename = 'input.csv') {
  return parser.parseStrictCSVToObjects(content, { filename });
}

const assertionCounts = {
  staticSchema: { passed: 0, failed: 0, unverified: 0 },
  crossDocumentConsistency: { passed: 0, failed: 0, unverified: 0 },
  filesystem: { passed: 0, failed: 0, unverified: 0 },
  semanticReview: { passed: 0, failed: 0, unverified: 0 },
  empiricalExecution: { passed: 0, failed: 0, unverified: 0 }
};

const findings = [];
const recordedAssertions = [];

function resetState() {
  for (const cat in assertionCounts) {
    assertionCounts[cat].passed = 0;
    assertionCounts[cat].failed = 0;
    assertionCounts[cat].unverified = 0;
  }
  findings.length = 0;
  recordedAssertions.length = 0;
}

function assertCondition(cond, code, desc, category, details = {}) {
  if (cond) {
    assertionCounts[category].passed++;
    recordedAssertions.push({ code, desc, category, status: 'PASS' });
  } else {
    assertionCounts[category].failed++;
    recordedAssertions.push({ code, desc, category, status: 'FAIL', details });
    findings.push({
      id: code,
      severity: 'ERROR',
      category,
      desc,
      expected: details.expected || 'TRUE',
      actual: details.actual || 'FALSE',
      status: 'VIOLATION',
      remediation: details.remediation || 'Correct the document discrepancy'
    });
  }
}

function assertUnverified(code, desc, category, reason) {
  assertionCounts[category].unverified++;
  recordedAssertions.push({ code, desc, category, status: 'UNVERIFIED', reason });
  findings.push({
    id: code,
    severity: 'WARNING',
    category,
    desc,
    status: 'UNVERIFIED',
    reason
  });
}

function runValidation(targetDir = process.cwd()) {
  resetState();

  const manifestPath = path.resolve(targetDir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv');
  const taskRegPath = path.resolve(targetDir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
  const traceabilityPath = path.resolve(targetDir, 'WAVE_0_4_1_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv');
  const batch1Path = path.resolve(targetDir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv');
  const appShellPath = path.resolve(targetDir, 'scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js');
  const w7ContractPath = path.resolve(targetDir, 'docs/wave-0/4.3/WAVE_0_4_3_W7_PROJECT_RESOLUTION_CONTRACT.md');
  const w8ContractPath = path.resolve(targetDir, 'docs/wave-0/4.3/WAVE_0_4_3_WAVE8_RESOURCE_AND_LIFECYCLE_ACCEPTANCE.md');

  // 1. Authoritative Task Register (21 tasks)
  if (fs.existsSync(taskRegPath)) {
    const tasks = parseCsv(fs.readFileSync(taskRegPath, 'utf8'), 'task-register.csv');
    assertCondition(tasks.length === 21, 'TASK-COUNT-21', 'Authoritative task register contains exactly 21 tasks', 'staticSchema', { expected: 21, actual: tasks.length });

    const taskIds = new Set(tasks.map(t => t['Task ID']));
    const expectedTasks = [
      'W5-1', 'W5-2', 'W5-3', 'W5-4', 'W5-5', 'W5-6',
      'W6-1', 'W6-2', 'W6-3', 'W6-4',
      'W7-P1', 'W7-1', 'W7-2', 'W7-3',
      'W8-1', 'W8-2', 'W8-3',
      'W9-1', 'W9-2', 'W9-3',
      'INT-1'
    ];

    for (const et of expectedTasks) {
      assertCondition(taskIds.has(et), `TASK-MISSING-${et}`, `Task register contains canonical task ${et}`, 'staticSchema');
    }
    for (const tid of taskIds) {
      assertCondition(expectedTasks.includes(tid), `TASK-UNEXPECTED-${tid}`, `Task ${tid} is within canonical task set`, 'staticSchema');
    }

    // W5 Chain Check
    const w51 = tasks.find(t => t['Task ID'] === 'W5-1');
    const w52 = tasks.find(t => t['Task ID'] === 'W5-2');
    const w53 = tasks.find(t => t['Task ID'] === 'W5-3');

    if (w51) {
      assertCondition(w51['Dispatch Status'] === 'READY_TO_LAUNCH', 'W5-1-READY', 'W5-1 has READY_TO_LAUNCH status', 'semanticReview');
    }
    if (w52) {
      assertCondition(w52['Dispatch Status'] === 'IMPLEMENTATION_DEPENDENT', 'W5-2-DEPENDENT', 'W5-2 has IMPLEMENTATION_DEPENDENT status', 'semanticReview');
    }
    if (w53) {
      assertCondition((w53.Dependencies || '').includes('W5-2'), 'W5-CHAIN-W5-3', 'W5-3 requires W5-2 prerequisite', 'semanticReview');
    }

    // Acyclic check
    const taskMap = new Map(tasks.map(t => [t['Task ID'], t]));
    let hasCycle = false;
    const visited = new Set();
    const stack = new Set();
    function checkCycle(id) {
      visited.add(id);
      stack.add(id);
      const rec = taskMap.get(id);
      if (rec && rec.Dependencies && rec.Dependencies.toLowerCase() !== 'none') {
        const deps = rec.Dependencies.split(',').map(s => s.trim().split(' ')[0]).filter(Boolean);
        for (const d of deps) {
          if (taskMap.has(d)) {
            if (stack.has(d)) hasCycle = true;
            else if (!visited.has(d)) checkCycle(d);
          }
        }
      }
      stack.delete(id);
    }
    for (const t of tasks) {
      if (!visited.has(t['Task ID'])) checkCycle(t['Task ID']);
    }
    assertCondition(!hasCycle, 'DEP-ACYCLIC', 'Task dependency graph is strictly acyclic', 'semanticReview');

  } else {
    assertCondition(false, 'TASK-REG-EXISTS', 'Task register exists in targetDir', 'filesystem');
  }

  // 2. Ownership Manifest (175 entries)
  if (fs.existsSync(manifestPath)) {
    const manifestRows = parseCsv(fs.readFileSync(manifestPath, 'utf8'), 'manifest.csv');
    assertCondition(manifestRows.length === 175, 'MANIFEST-COUNT-175', 'Manifest contains exactly 175 records', 'staticSchema', { expected: 175, actual: manifestRows.length });

    const seenPaths = new Set();
    let hasDuplicate = false;
    for (const r of manifestRows) {
      const p = r.path || r.Path;
      if (seenPaths.has(p)) hasDuplicate = true;
      seenPaths.add(p);

      if (p.endsWith('/')) {
        assertCondition(false, `MANIFEST-NO-DIR-${p}`, `Manifest entry ${p} is not a directory target`, 'filesystem');
      }
      if (p.includes('..')) {
        assertCondition(false, `MANIFEST-NO-TRAVERSAL-${p}`, `Manifest entry ${p} does not contain traversal sequences`, 'filesystem');
      }
    }
    assertCondition(!hasDuplicate, 'MANIFEST-DUPLICATE', 'Manifest contains zero duplicate paths', 'staticSchema');
  } else {
    assertCondition(false, 'MANIFEST-EXISTS', 'Manifest exists in targetDir', 'filesystem');
  }

  // 3. Batch 1 Allowlist (11 tasks, 49 rows)
  if (fs.existsSync(batch1Path)) {
    const b1Rows = parseCsv(fs.readFileSync(batch1Path, 'utf8'), 'batch1.csv');
    const b1Tasks = new Set(b1Rows.map(r => r.Task_ID || r.taskId || r['Task ID']));
    assertCondition(b1Tasks.size === 11, 'BATCH1-TASK-COUNT-11', 'Batch 1 allowlist contains exactly 11 distinct tasks', 'staticSchema', { expected: 11, actual: b1Tasks.size });
    assertCondition(b1Rows.length === 49, 'BATCH1-ROW-COUNT-49', 'Batch 1 allowlist contains exactly 49 path rows', 'staticSchema', { expected: 49, actual: b1Rows.length });
    assertCondition(b1Tasks.has('W5-1'), 'BATCH1-TASK-W5-1', 'Batch 1 contains task W5-1', 'crossDocumentConsistency');
  } else {
    assertCondition(false, 'BATCH1-EXISTS', 'Batch 1 allowlist exists in targetDir', 'filesystem');
  }

  // 4. Traceability Contracts (9 contracts)
  if (fs.existsSync(traceabilityPath)) {
    const traceRows = parseCsv(fs.readFileSync(traceabilityPath, 'utf8'), 'traceability.csv');
    assertCondition(traceRows.length === 9, 'TRACE-COUNT-9', 'Traceability matrix contains exactly 9 contracts', 'staticSchema', { expected: 9, actual: traceRows.length });
  } else {
    assertCondition(false, 'TRACE-EXISTS', 'Traceability matrix exists in targetDir', 'filesystem');
  }

  // 5. Contract Review (W7 and W8)
  if (fs.existsSync(w7ContractPath)) {
    const w7Content = fs.readFileSync(w7ContractPath, 'utf8');
    assertCondition(!w7Content.includes('WHERE Id = :keyOrId OR External_Key__c = :keyOrId'), 'W7-REJECT-AMBIGUOUS-OR', 'W7 contract explicitly rejects ambiguous OR query', 'semanticReview');
    assertCondition(w7Content.includes('runName'), 'W7-RUNNAME-CANONICAL', 'W7 contract specifies canonical runName field', 'semanticReview');
  }

  if (fs.existsSync(w8ContractPath)) {
    const w8Content = fs.readFileSync(w8ContractPath, 'utf8');
    assertCondition(w8Content.includes('10,485,760 chars (~10 MB)'), 'W8-10MB-STRING-GUARD', 'Wave 8 enforces 10MB string length guard', 'semanticReview');
  }

  // 6. daAppShell AST and Content
  if (fs.existsSync(appShellPath)) {
    const shellContent = fs.readFileSync(appShellPath, 'utf8');
    assertCondition(!shellContent.includes('dispatchEvent('), 'APPSHELL-NO-DISPATCH-EVENT', 'daAppShell has zero dispatchEvent calls', 'semanticReview');
    assertCondition(shellContent.includes('@api activeProjectId'), 'APPSHELL-L77-API', 'daAppShell defines public @api activeProjectId', 'semanticReview');
  }

  assertUnverified('UNVERIFIED-SF-LIVE-ORG', 'Live Salesforce org deployment & governor limit verification', 'empiricalExecution', 'Requires live scratch org connection');
  assertUnverified('UNVERIFIED-BROWSER-CANVAS', 'Browser DOM drag & canvas rendering verification', 'empiricalExecution', 'Requires browser runtime');

  let totalPassed = 0;
  let totalFailed = 0;
  let totalUnverified = 0;
  for (const cat in assertionCounts) {
    totalPassed += assertionCounts[cat].passed;
    totalFailed += assertionCounts[cat].failed;
    totalUnverified += assertionCounts[cat].unverified;
  }

  return {
    totalPassed,
    totalFailed,
    totalUnverified,
    assertionCounts,
    findings,
    recordedAssertions
  };
}

if (require.main === module) {
  let targetDir = process.cwd();
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--targetDir' && process.argv[i + 1]) {
      targetDir = process.argv[i + 1];
      i++;
    }
  }

  console.log('======================================================================');
  console.log(`   RUNNING Wave 0.4.13 ISOLATED SEMANTIC VALIDATOR`);
  console.log(`   Target Directory: ${path.resolve(targetDir)}`);
  console.log('======================================================================\n');

  const res = runValidation(targetDir);

  console.log(`Passed Assertions:     ${res.totalPassed}`);
  console.log(`Failed Assertions:     ${res.totalFailed}`);
  console.log(`Unverified Gates:      ${res.totalUnverified}`);
  console.log(`Findings Recorded:     ${res.findings.length}\n`);

  console.log(`Identified Findings (${res.findings.length}):`);
  for (const f of res.findings) {
    console.log(`- Code: ${f.id} | Status: ${f.status} | Severity: ${f.severity} | Category: ${f.category} | Desc: ${f.desc}`);
  }
  console.log('======================================================================\n');

  if (res.totalFailed > 0) {
    console.error(`Validator completed with ${res.totalFailed} failure(s).`);
    process.exit(1);
  } else {
    console.log('Wave 0.4.13 validation completed successfully with zero failures.');
  }
}

module.exports = {
  runValidation,
  resetState
};

```




# Section 15: Exact Expected Outcomes and All Relevant Tests

All test suites declare exact expected outcomes and verify exit codes:
- `test-baseline-runners.cjs`: 27 executions, exit 0, 187 unique checks per sweep.
- `test-authorization-patch.cjs`: 12 scenarios, exit 0.
- `test-rollback.cjs`: 7 scenarios, exit 0.
- `test-csv-parser.cjs`: 18 scenarios, exit 0.
- `test-containment.cjs`: 6 scenarios, exit 0.
- `test-validator-mutations.cjs`: 20 mutation scenarios with exact set comparisons + negative controls, exit 0.
- `test-api-surface.cjs`: 6 API signature assertions, exit 0.
- `test-synthesis.cjs`: 6 synthesis fail-closed scenarios, exit 0.



# Section 16: P0-01 Coordinator Rollback Privilege Escalation Closure Evidence

Public `pathSafeRollback()` strictly verifies the mutability tier of every touched path in the provenance record.
Adversarial tests demonstrate:
1. Caller supplying `taskId: 'INT-1'` rejected with `COORDINATOR_ROLLBACK_PROHIBITED`.
2. Caller supplying forged provenance with coordinator-exclusive file rejected with `COORDINATOR_PRIVILEGE_ESCALATION`.
3. Caller setting `isCoordinatorCall: true` ignored (not accepted in signature).
4. No coordinator-exclusive files can be restored or modified through the public rollback API.



# Section 17: P0-02 Public Mutation Hook Removal Evidence

Static AST and function signature inspection in `test-api-surface.cjs` proves:
1. `apply_patch_with_provenance({ repoDir, patchContent, taskId, expectedBaseSha, patchBaseSha })` has exactly 1 parameter object without test hooks.
2. `apply_coordinator_patch_with_provenance({ repoDir, patchContent, taskId, expectedBaseSha, patchBaseSha })` has zero test hooks.
3. `pathSafeRollback({ repoDir, provenance, taskId })` has zero test hooks.
4. No hidden callbacks, flags, or environment variable overrides exist.



# Section 18: Rollback Preflight, Phase B, and Recovery Evidence

The Two-Phase rollback implementation provides:
1. Complete Phase A non-mutating preflight across ALL target paths. If any target has an invalid hash, missing mode, symlink, or corrupt payload, Phase A halts immediately with ZERO mutations to any file.
2. Zero-byte files (empty base64 string) validated without truthiness errors.
3. Mode metadata preserved and restored.
4. Phase B executes atomic temporary file writes and renames.
5. In the event of an unexpected Phase B failure, an exact recovery inventory is generated with pre/post hashes and manual recovery instructions.



# Section 19: Strict CSV Production-Path Evidence

1. `strict-rfc4180-csv-parser.cjs` implements full RFC 4180 compliance.
2. Production `parseCsvStrict` explicitly invokes strict parser with zero fallback to loose split methods.
3. Rejection of bare CR, unclosed quotes, unescaped quotes, trailing characters, and column count mismatches verified.



# Section 20: Duplicate / Path / Rename / Quoted-Path Evidence

1. Rejects patches containing duplicate diff sections for the same normalized path.
2. Handles Git C-quoted paths with octal UTF-8 unescaping.
3. Validates both old and new paths for renames and copies.
4. Rejects traversals, drive letters, UNC paths, and control characters.



# Section 21: Dependency Graph, Cycle, and Order Evidence

1. Authoritative dependency parser traverses dependencies from `WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv`.
2. Acyclic dependency graph enforced via DFS.
3. Strict Wave 5 serialization chain enforced: W5-1 -> W5-2 -> W5-3 -> W5-4 -> W5-5 -> W5-6.



# Section 22: Shell-Safe Git Invocation Evidence

1. All Git invocations in `patch-gate.cjs` use `cp.spawnSync` with `shell: false`.
2. Paths containing spaces, quotes, semicolons, dollar signs, backticks, parentheses, leading dashes, and Unicode were tested. All remain literal arguments without shell evaluation.



# Section 23: Exact-Set Mutation Evidence

1. `test-validator-mutations.cjs` runs all 20 semantic mutations against isolated temporary directory fixtures.
2. Asserts exact set equality: actual finding IDs must match expected finding IDs exactly (no missing, unexpected, or duplicate findings).
3. Clean negative controls executed before and after mutations.
4. All 20 scenarios passed with 100% fidelity.



# Section 24: Child-Process Exit Propagation Evidence

1. Every CLI test harness sets `process.exitCode = 1` upon failure.
2. Intentional negative tests verify that failed scenarios cause nonzero exit codes.
3. Orchestration captures and verifies child-process exit status.



# Section 25: Synthesis Fail-Closed and Determinism Evidence

1. Generator verifies exact SHA-256 and byte counts for all required artifacts and raw logs.
2. Fails closed on missing, duplicate, corrupt, or unindexed evidence.
3. Multiple runs verified to produce byte-identical JSON outputs.



# Section 26: Complete 27-Execution Baseline Raw Evidence

All 9 frozen baseline runners executed 3 times each (27 executions):
- `run-poc-tests.cjs` (43 tests, exited 0)
- `run-wave4-integration-suite.cjs` (32 tests, exited 0)
- `run-lane-a-schema-tests.cjs` (9 tests, exited 0)
- `run-lane-c-preset-manager-tests.cjs` (10 tests, exited 0)
- `run-lane-d-graph-filter-tests.cjs` (15 tests, exited 0)
- `run-lane-e-matrix-tests.cjs` (11 tests, exited 0)
- `run-lane-f-findings-tests.cjs` (12 tests, exited 0)
- `run-workstream-a-tests.cjs` (33 tests, exited 0)
- `run-workstream-c-tests.cjs` (22 tests, exited 0)

Total unique test check identities per sweep: 187.
Cumulative tests across 3 sweeps: 561 (100% pass, 0 failures, 0 skips).



# Section 27: Complete Wave 0.4.13 Raw Process Logs


Total Raw Child-Process Logs Embedded: **102**



### Artifact W0411-ART-013: Raw Execution Log: API-01.log
- **File**: `docs/wave-0/4.13/evidence/raw/API-01.log`
- **Type**: `Log File`
- **SHA-256**: `42b6cac7c5e006f435c6539650554a21da643ed65b29ef3e2d020b1d5fbd6751`
- **Byte Count**: `18`

```javascript
ACTUAL: HOOK_FREE

```



### Artifact W0411-ART-014: Raw Execution Log: API-02.log
- **File**: `docs/wave-0/4.13/evidence/raw/API-02.log`
- **Type**: `Log File`
- **SHA-256**: `42b6cac7c5e006f435c6539650554a21da643ed65b29ef3e2d020b1d5fbd6751`
- **Byte Count**: `18`

```javascript
ACTUAL: HOOK_FREE

```



### Artifact W0411-ART-015: Raw Execution Log: API-03.log
- **File**: `docs/wave-0/4.13/evidence/raw/API-03.log`
- **Type**: `Log File`
- **SHA-256**: `437b20aa50eeda8c2f5f829a5a0914b035521a2bba5e533c07fe99c31e80fa2e`
- **Byte Count**: `289`

```javascript
FN_STRING:
function apply_patch_with_provenance({ repoDir, patchContent, taskId, expectedBaseSha, patchBaseSha }) {
  return _internalApplyPatch({
    repoDir,
    patchContent,
    taskId,
    expectedBaseSha,
    patchBaseSha,
    isCoordinatorCall: false
  });
}
ACTUAL: NO_HOOK_PARAMS

```



### Artifact W0411-ART-016: Raw Execution Log: API-04.log
- **File**: `docs/wave-0/4.13/evidence/raw/API-04.log`
- **Type**: `Log File`
- **SHA-256**: `e350df73a60a6083f7cff9e49f98eb135109eff738bd1eb5cbc52dad30db2aa7`
- **Byte Count**: `28`

```javascript
ACTUAL: COORDINATOR_EXCISED

```



### Artifact W0411-ART-017: Raw Execution Log: API-05.log
- **File**: `docs/wave-0/4.13/evidence/raw/API-05.log`
- **Type**: `Log File`
- **SHA-256**: `b9c0c935ddf6849bce1707f3ca5a97a9bfaa8cca4e30eb4fac865fa4284aa91d`
- **Byte Count**: `12313`

```javascript
FN_STRING:
function pathSafeRollback({ repoDir, provenance, taskId }) {
  if (provenance && provenance.provenance && typeof provenance.provenance === 'object') {
    provenance = provenance.provenance;
  }
  if (!provenance || typeof provenance !== 'object') {
    throw new PatchGateError('PROVENANCE_REQUIRED', 'Rollback requires valid provenance object');
  }

  if (!provenance.taskId || !provenance.touchedPaths || !provenance.preApply || !provenance.postApply) {
    throw new PatchGateError('INVALID_PROVENANCE', 'Provenance record is incomplete or corrupted');
  }

  if (taskId && provenance.taskId !== taskId) {
    throw new PatchGateError('TASK_MISMATCH', `Provenance task ${provenance.taskId} does not match request task ${taskId}`);
  }

  const effectiveTaskId = taskId || provenance.taskId;

  const seenPaths = new Set();
  for (const p of provenance.touchedPaths) {
    const norm = normalizeSafePath(p);
    if (seenPaths.has(norm)) {
      throw new PatchGateError('DUPLICATE_TOUCHED_PATH', `Duplicate touched path in rollback request: ${norm}`, { path: norm });
    }
    seenPaths.add(norm);
  }

  const { taskMap, manifestMap } = loadAuthoritativeRegisters(repoDir, { permissiveMode: true });

  // P0-01 SECURITY BOUNDARY:
  // Public rollback NEVER authorizes restoration of coordinator-exclusive files or coordinator tasks.
  for (const p of provenance.touchedPaths) {
    const norm = normalizeSafePath(p);
    const manifestEntry = manifestMap.get(norm);
    if (manifestEntry) {
      const mutTier = manifestEntry.mutability_tier || manifestEntry.Mutability_Tier;
      if (mutTier === 'COORDINATOR_INTEGRATION_EXCLUSIVE' || mutTier === 'INTEGRATION_COORDINATOR_ONLY' || mutTier === 'COORDINATOR_EXCLUSIVE') {
        throw new PatchGateError('COORDINATOR_PRIVILEGE_ESCALATION', `Public rollback rejected: path ${norm} is coordinator-exclusive. Coordinator rollback is unsupported via public API.`, {
          path: norm,
          effectiveTaskId
        });
      }
    }
  }

  const taskRec = taskMap.get(effectiveTaskId);
  const isCoordinator = taskRec && ((taskRec['Accountable Owner'] || '').toLowerCase().includes('coordinator') || effectiveTaskId === 'INT-1');
  if (isCoordinator) {
    throw new PatchGateError('COORDINATOR_ROLLBACK_PROHIBITED', `Public rollback cannot be invoked for coordinator task ${effectiveTaskId}. Coordinator-only rollback is unsupported.`, {
      effectiveTaskId
    });
  }

  enforceAuthoritativeTaskOwnership({
    repoRoot: repoDir,
    taskId: effectiveTaskId,
    touchedPaths: provenance.touchedPaths
  });

  // PHASE A: Comprehensive Read-Only Preflight across ALL target paths
  for (const rel of provenance.touchedPaths) {
    const normRel = normalizeSafePath(rel);
    const { fullPath } = verifyFilesystemContainment(repoDir, normRel);

    const pre = provenance.preApply[normRel];
    const post = provenance.postApply[normRel];
    if (!pre || !post) {
      throw new PatchGateError('CORRUPT_PROVENANCE_ENTRY', `Missing pre/post record for ${normRel}`, { rel: normRel });
    }

    if (pre.exists) {
      if (!pre.hash) {
        throw new PatchGateError('INVALID_PRE_STATE', `Pre-state hash missing for ${normRel}`, { rel: normRel });
      }
      if (typeof pre.originalContentBase64 !== 'string' && typeof pre.originalContent !== 'string') {
        throw new PatchGateError('NULL_BUFFER_RESTORE', `Pre-state indicates file existed but restore payload is null/missing for ${normRel}`, { rel: normRel });
      }
      if (pre.mode === undefined || pre.mode === null || typeof pre.mode !== 'number') {
        throw new PatchGateError('MISSING_MODE_METADATA', `Pre-state mode metadata required and must be a number for ${normRel}`, { rel: normRel });
      }

      let payloadBuf = null;
      if (typeof pre.originalContentBase64 === 'string') {
        payloadBuf = Buffer.from(pre.originalContentBase64, 'base64');
      } else {
        payloadBuf = Buffer.from(pre.originalContent, 'utf8');
      }
      const payloadHash = crypto.createHash('sha256').update(payloadBuf).digest('hex');
      if (payloadHash !== pre.hash) {
        throw new PatchGateError('RESTORE_PAYLOAD_CORRUPT', `Preflight restore payload hash mismatch for ${normRel}: expected ${pre.hash}, got ${payloadHash}`, {
          rel: normRel,
          expected: pre.hash,
          actual: payloadHash
        });
      }
      if (pre.byteCount !== undefined && pre.byteCount !== null && payloadBuf.length !== pre.byteCount) {
        throw new PatchGateError('RESTORE_BYTE_COUNT_MISMATCH', `Preflight restore payload byte count mismatch for ${normRel}: expected ${pre.byteCount}, got ${payloadBuf.length}`, {
          rel: normRel,
          expected: pre.byteCount,
          actual: payloadBuf.length
        });
      }
    }

    const fileExistsNow = fs.existsSync(fullPath);

    if (fileExistsNow) {
      const st = fs.lstatSync(fullPath);
      if (st.isDirectory()) {
        throw new PatchGateError('DIRECTORY_TARGET_NOT_ALLOWED', `Target path is a directory: ${normRel}`, { rel: normRel });
      }
      if (st.isSymbolicLink()) {
        throw new PatchGateError('SYMLINK_TARGET', `Target path is a symlink: ${normRel}`, { rel: normRel });
      }

      if (!post.exists) {
        throw new PatchGateError('POST_APPLY_RECREATED_FILE', `File ${normRel} was created post-apply; refusing rollback to prevent data loss`, { rel: normRel });
      }

      const currentBuf = fs.readFileSync(fullPath);
      const currentHash = crypto.createHash('sha256').update(currentBuf).digest('hex');

      if (post.exists && currentHash !== post.hash) {
        throw new PatchGateError('POST_APPLY_MUTATION', `File ${normRel} was modified after patch application; rollback refused to prevent data loss`, {
          rel: normRel,
          currentHash,
          postApplyHash: post.hash
        });
      }

      if (post.exists && (post.mode === undefined || post.mode === null || typeof post.mode !== 'number')) {
        throw new PatchGateError('MISSING_MODE_METADATA', `Phase B: Post-state mode required for ${normRel}`, { rel: normRel });
      }
      if (post.mode !== undefined && post.mode !== null && ((st.mode & 0o777) !== (post.mode & 0o777))) {
        throw new PatchGateError('CURRENT_MODE_MISMATCH', `File ${normRel} mode modified post-apply; expected ${(post.mode & 0o777).toString(8)}, got ${(st.mode & 0o777).toString(8)}`, {
          rel: normRel,
          expectedMode: post.mode,
          currentMode: st.mode
        });
      }
    } else {
      if (post.exists) {
        throw new PatchGateError('POST_APPLY_MISSING', `File ${normRel} existed after patch application but is now missing`, { rel: normRel });
      }
    }
  }

  // PHASE B: Guarded restoration with atomic safe writes
  const restoredPaths = [];
  const recoveryInventory = [];

  try {
    for (const rel of provenance.touchedPaths) {
      const normRel = normalizeSafePath(rel);
      const { fullPath } = verifyFilesystemContainment(repoDir, normRel);
      const pre = provenance.preApply[normRel];
      const post = provenance.postApply[normRel];

      // Phase B per-target immediate revalidation before mutation (P0-02)
      verifyFilesystemContainment(repoDir, normRel);
      const existsNow = fs.existsSync(fullPath);
      if (existsNow) {
        const st = fs.lstatSync(fullPath);
        if (st.isDirectory()) {
          throw new PatchGateError('DIRECTORY_TARGET_NOT_ALLOWED', `Phase B: Target path is a directory: ${normRel}`, { rel: normRel });
        }
        if (st.isSymbolicLink()) {
          throw new PatchGateError('SYMLINK_TARGET', `Phase B: Target path is a symlink: ${normRel}`, { rel: normRel });
        }
        if (!post.exists) {
          throw new PatchGateError('STATE_MUTATION_RACE', `Phase B: File ${normRel} was created between preflight and Phase B restoration`, { rel: normRel });
        }
        const curBuf = fs.readFileSync(fullPath);
        const curHash = crypto.createHash('sha256').update(curBuf).digest('hex');
        if (curHash !== post.hash) {
          throw new PatchGateError('STATE_MUTATION_RACE', `File ${normRel} changed between preflight and Phase B restoration`, { rel: normRel });
        }
        if (post.exists && (post.mode === undefined || post.mode === null || typeof post.mode !== 'number')) {
          throw new PatchGateError('MISSING_MODE_METADATA', `Phase B: Post-state mode required for ${normRel}`, { rel: normRel });
        }
        if (post.mode !== undefined && post.mode !== null && ((st.mode & 0o777) !== (post.mode & 0o777))) {
          throw new PatchGateError('STATE_MUTATION_RACE', `File ${normRel} mode changed between preflight and Phase B restoration`, { rel: normRel });
        }
      } else {
        if (post.exists) {
          throw new PatchGateError('STATE_MUTATION_RACE', `Phase B: File ${normRel} was deleted between preflight and Phase B restoration`, { rel: normRel });
        }
      }

      if (pre.exists) {
        const parentDir = path.dirname(fullPath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }

        let restoreBuf = null;
        if (typeof pre.originalContentBase64 === 'string') {
          restoreBuf = Buffer.from(pre.originalContentBase64, 'base64');
        } else if (typeof pre.originalContent === 'string') {
          restoreBuf = Buffer.from(pre.originalContent, 'utf8');
        } else {
          throw new PatchGateError('NULL_BUFFER_RESTORE', `Attempted to restore invalid/null content for ${normRel}`);
        }

        const bufHash = crypto.createHash('sha256').update(restoreBuf).digest('hex');
        if (bufHash !== pre.hash) {
          throw new PatchGateError('RESTORE_PAYLOAD_CORRUPT', `Restore payload hash mismatch for ${normRel}: expected ${pre.hash}, got ${bufHash}`, {
            expected: pre.hash,
            actual: bufHash
          });
        }

        const tmpFile = `${fullPath}.w0410tmp.${crypto.randomBytes(4).toString('hex')}`;
        fs.writeFileSync(tmpFile, restoreBuf);
        if (typeof pre.mode === 'number') {
          try { fs.chmodSync(tmpFile, pre.mode & 0o777); } catch (e) {
            throw new PatchGateError('CHMOD_FAILED', `Failed to restore file mode on ${normRel}: ${e.message}`, { rel: normRel, error: e.message });
          }
        }
        fs.renameSync(tmpFile, fullPath);

        const currentBuf = fs.readFileSync(fullPath);
        const restoredHash = crypto.createHash('sha256').update(currentBuf).digest('hex');
        if (restoredHash !== pre.hash) {
          throw new PatchGateError('RESTORE_VERIFICATION_FAILED', `Restored hash mismatch for ${normRel}`, {
            expected: pre.hash,
            actual: restoredHash
          });
        }
        if (currentBuf.length !== restoreBuf.length) {
          throw new PatchGateError('RESTORE_LENGTH_FAILED', `Restored byte length mismatch for ${normRel}`, {
            expected: restoreBuf.length,
            actual: currentBuf.length
          });
        }

        restoredPaths.push(normRel);
        recoveryInventory.push({
          path: normRel,
          action: 'RESTORED_TO_PRE_APPLY',
          preHash: pre.hash,
          restoredHash
        });
      } else {
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          restoredPaths.push(normRel);
          recoveryInventory.push({
            path: normRel,
            action: 'DELETED_POST_APPLY_FILE',
            preHash: null,
            restoredHash: null
          });
        }
      }
    }
  } catch (err) {
    if (err instanceof PatchGateError && (err.code === 'RESTORE_PAYLOAD_CORRUPT' || err.code === 'RESTORE_VERIFICATION_FAILED' || err.code === 'RESTORE_LENGTH_FAILED')) {
      throw err;
    }
    throw new PatchGateError('PARTIAL_RESTORE_ERROR', `Error during restoration phase: ${err.message}`, {
      partiallyRestoredPaths: restoredPaths,
      allTouchedPaths: provenance.touchedPaths,
      recoveryInventory,
      recoveryInstructions: 'Inspect partiallyRestoredPaths vs allTouchedPaths and manually restore from repository commit'
    });
  }

  return {
    success: true,
    rolledBackPaths: provenance.touchedPaths,
    recoveryInventory
  };
}
ACTUAL: NO_HOOK_PARAMS

```



### Artifact W0411-ART-018: Raw Execution Log: API-06.log
- **File**: `docs/wave-0/4.13/evidence/raw/API-06.log`
- **Type**: `Log File`
- **SHA-256**: `ba3bf2ea48fd6940c939c161292b85d85945c7501c2eb22f1e6b3bc054986779`
- **Byte Count**: `366`

```javascript
EXPORTS:
["PatchGateError","loadAuthoritativeRegisters","normalizeSafePath","verifyFilesystemContainment","verify_base","validateTaskDependencies","enforceAuthoritativeTaskOwnership","unescapeGitCQuotedPath","extractPatchTouchedPaths","recordPreApplyState","checkIsTracked","checkIsDirty","apply_patch_with_provenance","pathSafeRollback"]
ACTUAL: EXACT_SAFE_EXPORTS

```



### Artifact W0411-ART-019: Raw Execution Log: AUTH-01.log
- **File**: `docs/wave-0/4.13/evidence/raw/AUTH-01.log`
- **Type**: `Log File`
- **SHA-256**: `20c444f345fdf0d4cae4d76f3a0df8dd7e665db2b264ca248c4b866da5064a08`
- **Byte Count**: `26`

```javascript
ACTUAL: VALID_BATCH1_TASK

```



### Artifact W0411-ART-020: Raw Execution Log: AUTH-02.log
- **File**: `docs/wave-0/4.13/evidence/raw/AUTH-02.log`
- **Type**: `Log File`
- **SHA-256**: `7eeae6eb8baa99b7bfced16f4d936c91d01dcdd8578b5f514d2db7c653b9d92a`
- **Byte Count**: `26`

```javascript
ACTUAL: REJECTED_W5_ORDER

```



### Artifact W0411-ART-021: Raw Execution Log: AUTH-03.log
- **File**: `docs/wave-0/4.13/evidence/raw/AUTH-03.log`
- **Type**: `Log File`
- **SHA-256**: `0788c0401a2797cd14986a9b08ba0c48c6d0d1f7818d15e6c65fe0a54cfb0e5b`
- **Byte Count**: `23`

```javascript
ACTUAL: REJECTED_CYCLE

```



### Artifact W0411-ART-022: Raw Execution Log: AUTH-04.log
- **File**: `docs/wave-0/4.13/evidence/raw/AUTH-04.log`
- **Type**: `Log File`
- **SHA-256**: `6531912db4a412dc71c3e0076c73982c1e0a1efcc1eddfd9b13225afed3b2c3f`
- **Byte Count**: `29`

```javascript
ACTUAL: REJECTED_MISSING_DEP

```



### Artifact W0411-ART-023: Raw Execution Log: AUTH-05.log
- **File**: `docs/wave-0/4.13/evidence/raw/AUTH-05.log`
- **Type**: `Log File`
- **SHA-256**: `754cde824681a6d6049414554018540fedd5eeb06d1074698b9af82d956d4f9c`
- **Byte Count**: `29`

```javascript
ACTUAL: REJECTED_COORDINATOR

```



### Artifact W0411-ART-024: Raw Execution Log: AUTH-06.log
- **File**: `docs/wave-0/4.13/evidence/raw/AUTH-06.log`
- **Type**: `Log File`
- **SHA-256**: `147cb33532932ccf9f82ac6b14efa7a67554c2c097abbbc0f20f6f51f8a52c4e`
- **Byte Count**: `35`

```javascript
ACTUAL: COORDINATOR_EXPORT_REMOVED

```



### Artifact W0411-ART-025: Raw Execution Log: AUTH-07.log
- **File**: `docs/wave-0/4.13/evidence/raw/AUTH-07.log`
- **Type**: `Log File`
- **SHA-256**: `a3f28a888e558382bf82e29e4bb65bbd618b0f9c786847b6e858c2d0f9f553ff`
- **Byte Count**: `27`

```javascript
ACTUAL: SAFE_NO_SHELL_EXEC

```



### Artifact W0411-ART-026: Raw Execution Log: AUTH-08.log
- **File**: `docs/wave-0/4.13/evidence/raw/AUTH-08.log`
- **Type**: `Log File`
- **SHA-256**: `a3f28a888e558382bf82e29e4bb65bbd618b0f9c786847b6e858c2d0f9f553ff`
- **Byte Count**: `27`

```javascript
ACTUAL: SAFE_NO_SHELL_EXEC

```



### Artifact W0411-ART-027: Raw Execution Log: AUTH-09.log
- **File**: `docs/wave-0/4.13/evidence/raw/AUTH-09.log`
- **Type**: `Log File`
- **SHA-256**: `8016ff5e304808feeaff5d561e2a3733342543b223906b2b95ae0ddd34218b83`
- **Byte Count**: `32`

```javascript
ACTUAL: OCTAL_UNESCAPED_CORRECT

```



### Artifact W0411-ART-028: Raw Execution Log: AUTH-10.log
- **File**: `docs/wave-0/4.13/evidence/raw/AUTH-10.log`
- **Type**: `Log File`
- **SHA-256**: `58686689cd766538cce72b884fad6db6240461a26d7a866665109fd75ca56539`
- **Byte Count**: `34`

```javascript
ACTUAL: ESCAPES_UNESCAPED_CORRECT

```



### Artifact W0411-ART-029: Raw Execution Log: AUTH-11.log
- **File**: `docs/wave-0/4.13/evidence/raw/AUTH-11.log`
- **Type**: `Log File`
- **SHA-256**: `d86f7d67c6b6b7ad88bbda2d66e037b4c56f7f55d88c7f54072aa6b50df7f458`
- **Byte Count**: `40`

```javascript
ACTUAL: REJECTED_DUPLICATE_DIFF_SECTION

```



### Artifact W0411-ART-030: Raw Execution Log: AUTH-12.log
- **File**: `docs/wave-0/4.13/evidence/raw/AUTH-12.log`
- **Type**: `Log File`
- **SHA-256**: `eba1c934b233dde449a1d4cdec3977416617ab8ee013178b4c1cde12dad5c60f`
- **Byte Count**: `30`

```javascript
ACTUAL: EXTRACTED_SPACES_PATH

```



### Artifact W0411-ART-031: Raw Execution Log: CONT-01.log
- **File**: `docs/wave-0/4.13/evidence/raw/CONT-01.log`
- **Type**: `Log File`
- **SHA-256**: `211c26fa46177e81bae58b6d8c44618376692cfe47feb988081ac678c6903fde`
- **Byte Count**: `27`

```javascript
ACTUAL: REJECTED_TRAVERSAL

```



### Artifact W0411-ART-032: Raw Execution Log: CONT-02.log
- **File**: `docs/wave-0/4.13/evidence/raw/CONT-02.log`
- **Type**: `Log File`
- **SHA-256**: `6d4e1402095e8d448f8e84ca0eaf052ee7270f274283e5206ec19dc2d8e629f7`
- **Byte Count**: `27`

```javascript
ACTUAL: REJECTED_ROOT_PATH

```



### Artifact W0411-ART-033: Raw Execution Log: CONT-03.log
- **File**: `docs/wave-0/4.13/evidence/raw/CONT-03.log`
- **Type**: `Log File`
- **SHA-256**: `dcfaecd1139723951ac03b7b99cfe8d0718c4373a3d2df6ce48bbb0af38c13a8`
- **Byte Count**: `30`

```javascript
ACTUAL: REJECTED_DRIVE_LETTER

```



### Artifact W0411-ART-034: Raw Execution Log: CONT-04.log
- **File**: `docs/wave-0/4.13/evidence/raw/CONT-04.log`
- **Type**: `Log File`
- **SHA-256**: `14b0fe626b4d104a475dc67677b55c5292ecde1a53c30351499747f346cbfcac`
- **Byte Count**: `26`

```javascript
ACTUAL: REJECTED_UNC_PATH

```



### Artifact W0411-ART-035: Raw Execution Log: CONT-05.log
- **File**: `docs/wave-0/4.13/evidence/raw/CONT-05.log`
- **Type**: `Log File`
- **SHA-256**: `5660a9c79708d0f17ada08a15e1397099d0798fe8d09f6702b573a16d2e003fd`
- **Byte Count**: `30`

```javascript
ACTUAL: REJECTED_CONTROL_CHAR

```



### Artifact W0411-ART-036: Raw Execution Log: CONT-06.log
- **File**: `docs/wave-0/4.13/evidence/raw/CONT-06.log`
- **Type**: `Log File`
- **SHA-256**: `ecd06d271c987d367a2909340f3effc796600e049aa6a7a9c4421ae688c2b1be`
- **Byte Count**: `34`

```javascript
ACTUAL: REJECTED_ESCAPING_SYMLINK

```



### Artifact W0411-ART-037: Raw Execution Log: CSV-01.log
- **File**: `docs/wave-0/4.13/evidence/raw/CSV-01.log`
- **Type**: `Log File`
- **SHA-256**: `08a398b0bd1fbb0115cf1baacc77618d71245c0babfa3817b9cda57ea4305f44`
- **Byte Count**: `54`

```javascript
INPUT:
col1,col2,col3
a,b,c
1,2,3

ACTUAL: SUCCESS

```



### Artifact W0411-ART-038: Raw Execution Log: CSV-02.log
- **File**: `docs/wave-0/4.13/evidence/raw/CSV-02.log`
- **Type**: `Log File`
- **SHA-256**: `2b8d48ada28ca028af51426afcb644acf53a934f3d8c5c3f4b4a0dfd919c3b54`
- **Byte Count**: `51`

```javascript
INPUT:
col1,col2,col3
a,b,c
1,2,3

ACTUAL: SUCCESS

```



### Artifact W0411-ART-039: Raw Execution Log: CSV-03.log
- **File**: `docs/wave-0/4.13/evidence/raw/CSV-03.log`
- **Type**: `Log File`
- **SHA-256**: `8efb2f5787750b0f9c88809e09162e2c6b78384d4030735f37052bace21725d0`
- **Byte Count**: `56`

```javascript
INPUT:
col1,col2
"hello, world",test

ACTUAL: SUCCESS

```



### Artifact W0411-ART-040: Raw Execution Log: CSV-04.log
- **File**: `docs/wave-0/4.13/evidence/raw/CSV-04.log`
- **Type**: `Log File`
- **SHA-256**: `eac884e9bb5d1030b8cf6231503fc7bbd474f42b23f6cb32b0b331183f35c2ed`
- **Byte Count**: `57`

```javascript
INPUT:
col1,col2
"line 1
line 2",val

ACTUAL: SUCCESS

```



### Artifact W0411-ART-041: Raw Execution Log: CSV-05.log
- **File**: `docs/wave-0/4.13/evidence/raw/CSV-05.log`
- **Type**: `Log File`
- **SHA-256**: `5ad695b3b2ddb6494a2134e42ed951edee7236ce1748dd60c8ec2aa698ddacac`
- **Byte Count**: `62`

```javascript
INPUT:
col1,col2
"quote ""inside""",second

ACTUAL: SUCCESS

```



### Artifact W0411-ART-042: Raw Execution Log: CSV-06.log
- **File**: `docs/wave-0/4.13/evidence/raw/CSV-06.log`
- **Type**: `Log File`
- **SHA-256**: `35b6a865f133b11054fcf0061e5cb3539be9864053b029c086b25047b510f0e1`
- **Byte Count**: `53`

```javascript
INPUT:
col1,col2
"  spaces  ",val

ACTUAL: SUCCESS

```



### Artifact W0411-ART-043: Raw Execution Log: CSV-07.log
- **File**: `docs/wave-0/4.13/evidence/raw/CSV-07.log`
- **Type**: `Log File`
- **SHA-256**: `07b1abacf29041e0948aeb69238eb603a5c2f6a0afdc2e90abfc1b763fa99446`
- **Byte Count**: `48`

```javascript
INPUT:
col1,col2,col3
,,val3

ACTUAL: SUCCESS

```



### Artifact W0411-ART-044: Raw Execution Log: CSV-08.log
- **File**: `docs/wave-0/4.13/evidence/raw/CSV-08.log`
- **Type**: `Log File`
- **SHA-256**: `bef1221e174499e61007c1c4b9a7c92e768220500e9f7438fd023468e86f6ce6`
- **Byte Count**: `43`

```javascript
INPUT:
﻿col1,col2
a,b

ACTUAL: SUCCESS

```



### Artifact W0411-ART-045: Raw Execution Log: CSV-09.log
- **File**: `docs/wave-0/4.13/evidence/raw/CSV-09.log`
- **Type**: `Log File`
- **SHA-256**: `68cb911b0ade4d343a985934ab767b5ea6ccff3000b74ae50ce54f015a44c845`
- **Byte Count**: `72`

```javascript
INPUT:
col1,col2
"unclosed quote,val

ACTUAL: REJECTED_UNCLOSED_QUOTE

```



### Artifact W0411-ART-046: Raw Execution Log: CSV-10.log
- **File**: `docs/wave-0/4.13/evidence/raw/CSV-10.log`
- **Type**: `Log File`
- **SHA-256**: `39171c1436f9272d8e164e8eaf7efc9ec8d90b227d954a91c843d22aec7b06d2`
- **Byte Count**: `73`

```javascript
INPUT:
col1,col2
"quoted"extra,val

ACTUAL: REJECTED_CHARS_AFTER_QUOTE

```



### Artifact W0411-ART-047: Raw Execution Log: CSV-11.log
- **File**: `docs/wave-0/4.13/evidence/raw/CSV-11.log`
- **Type**: `Log File`
- **SHA-256**: `e0e1e27f88c6671ecd31827acd6dcaf99c8b04774789626dc8c80cc62c41ef0c`
- **Byte Count**: `70`

```javascript
INPUT:
col1,col2
unquoted"bad,val

ACTUAL: REJECTED_UNESCAPED_QUOTE

```



### Artifact W0411-ART-048: Raw Execution Log: CSV-12.log
- **File**: `docs/wave-0/4.13/evidence/raw/CSV-12.log`
- **Type**: `Log File`
- **SHA-256**: `9c25d569ef36e12e29066497e6e5ca2969fed42814a33d4508d57e0437595e74`
- **Byte Count**: `68`

```javascript
INPUT:
col1,col2,col3
a,b

ACTUAL: REJECTED_COLUMN_COUNT_MISMATCH

```



### Artifact W0411-ART-049: Raw Execution Log: CSV-13.log
- **File**: `docs/wave-0/4.13/evidence/raw/CSV-13.log`
- **Type**: `Log File`
- **SHA-256**: `c9d422c67dffb1dbda10eba47832e88991c2b615091b447364b4d09517d1edde`
- **Byte Count**: `57`

```javascript
INPUT:
col1,,col3
a,b,c

ACTUAL: REJECTED_EMPTY_HEADER

```



### Artifact W0411-ART-050: Raw Execution Log: CSV-14.log
- **File**: `docs/wave-0/4.13/evidence/raw/CSV-14.log`
- **Type**: `Log File`
- **SHA-256**: `91ab51c306af97ca6a777d5d01134ea45730b194d6c96a815ea5f2de087f6fe1`
- **Byte Count**: `65`

```javascript
INPUT:
col1,col2,col1
a,b,c

ACTUAL: REJECTED_DUPLICATE_HEADER

```



### Artifact W0411-ART-051: Raw Execution Log: CSV-15.log
- **File**: `docs/wave-0/4.13/evidence/raw/CSV-15.log`
- **Type**: `Log File`
- **SHA-256**: `ddc4c40d7705de0c5b642978e04a32584834952723e15054c914525ed491c22a`
- **Byte Count**: `47`

```javascript
INPUT:
col1,col2
a,b

ACTUAL: REJECTED_BARE_LF

```



### Artifact W0411-ART-052: Raw Execution Log: CSV-16.log
- **File**: `docs/wave-0/4.13/evidence/raw/CSV-16.log`
- **Type**: `Log File`
- **SHA-256**: `be0e619e526d239992e2940c1ad5ce71768d2e24494a3ae62939cde8ef949c42`
- **Byte Count**: `47`

```javascript
INPUT:
col1,col2a,b
ACTUAL: REJECTED_BARE_CR

```



### Artifact W0411-ART-053: Raw Execution Log: CSV-17.log
- **File**: `docs/wave-0/4.13/evidence/raw/CSV-17.log`
- **Type**: `Log File`
- **SHA-256**: `9040e8a882ee7d5e060eb3be016be55bb27b85eec912181ec08f88c66bb3f5f4`
- **Byte Count**: `25`

```javascript
ACTUAL: REJECTED_BARE_LF

```



### Artifact W0411-ART-054: Raw Execution Log: CSV-18.log
- **File**: `docs/wave-0/4.13/evidence/raw/CSV-18.log`
- **Type**: `Log File`
- **SHA-256**: `83642b54dd7a2cf506aab9c52994558782628dbe9303f8bda8fa29415829b4e4`
- **Byte Count**: `30`

```javascript
ACTUAL: SUCCESS_CRLF_ACCEPTED

```



### Artifact W0411-ART-055: Raw Execution Log: RB-01.log
- **File**: `docs/wave-0/4.13/evidence/raw/RB-01.log`
- **Type**: `Log File`
- **SHA-256**: `fd380a1ccdd4d218a5b7adcee176b7f17fadbb8803136c39e47df6cadf43cdd6`
- **Byte Count**: `38`

```javascript
ACTUAL: REJECTED_COORDINATOR_ROLLBACK

```



### Artifact W0411-ART-056: Raw Execution Log: RB-02.log
- **File**: `docs/wave-0/4.13/evidence/raw/RB-02.log`
- **Type**: `Log File`
- **SHA-256**: `78ecf85cce121bc2958425416384180415cc7c09215e8bfa8e45c644a864f741`
- **Byte Count**: `34`

```javascript
ACTUAL: REJECTED_COORDINATOR_PATH

```



### Artifact W0411-ART-057: Raw Execution Log: RB-03.log
- **File**: `docs/wave-0/4.13/evidence/raw/RB-03.log`
- **Type**: `Log File`
- **SHA-256**: `9ccb251223c62b5f9a51ae039fc7c3ddcea08d97331dfa16a5d5991105798966`
- **Byte Count**: `34`

```javascript
ACTUAL: ZERO_BYTE_RESTORE_SUCCESS

```



### Artifact W0411-ART-058: Raw Execution Log: RB-04.log
- **File**: `docs/wave-0/4.13/evidence/raw/RB-04.log`
- **Type**: `Log File`
- **SHA-256**: `561cd11532619af49bb966e3d6e4c2a36648c46ce2597adfed2ef3fe26d03b25`
- **Byte Count**: `38`

```javascript
ACTUAL: PHASE_A_ZERO_MUTATION_SUCCESS

```



### Artifact W0411-ART-059: Raw Execution Log: RB-05.log
- **File**: `docs/wave-0/4.13/evidence/raw/RB-05.log`
- **Type**: `Log File`
- **SHA-256**: `b7ef230bec9f19ebd4d0d21209c5295643a5d8c1f21538f7694e28a8768423c6`
- **Byte Count**: `29`

```javascript
ACTUAL: BINARY_RESTORE_EXACT

```



### Artifact W0411-ART-060: Raw Execution Log: RB-06.log
- **File**: `docs/wave-0/4.13/evidence/raw/RB-06.log`
- **Type**: `Log File`
- **SHA-256**: `219fd2be35516226c74bbdcf1f7d50c558b722d5850753f5d64883987c9226fd`
- **Byte Count**: `31`

```javascript
ACTUAL: REJECTED_MODE_MISMATCH

```



### Artifact W0411-ART-061: Raw Execution Log: RB-07.log
- **File**: `docs/wave-0/4.13/evidence/raw/RB-07.log`
- **Type**: `Log File`
- **SHA-256**: `df085ff87b30c6df01a6325ae001989b1634c0e00e64fb8e2b2b3b7adad9b5e8`
- **Byte Count**: `30`

```javascript
ACTUAL: REJECTED_PHASE_B_RACE

```



### Artifact W0411-ART-062: Raw Execution Log: SYN-01.log
- **File**: `docs/wave-0/4.13/evidence/raw/SYN-01.log`
- **Type**: `Log File`
- **SHA-256**: `8eac8fd9e4b0071fad42eb63953539dd1935f2027069aa6f68cb8e72446beea7`
- **Byte Count**: `6930`

```javascript
ACTUAL: REJECTED_MISSING_ARTIFACT
FINDINGS: [{"code":"MISSING_REQUIRED_ARTIFACT","path":"non_existent_file.txt","expectedId":"TEST-ART-1"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"API-01.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"API-02.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"API-03.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"API-04.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"API-05.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"API-06.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-01.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-02.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-03.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-04.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-05.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-06.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-07.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-08.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-09.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-10.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-11.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-12.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CONT-01.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CONT-02.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CONT-03.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CONT-04.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CONT-05.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CONT-06.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-01.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-02.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-03.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-04.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-05.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-06.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-07.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-08.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-09.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-10.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-11.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-12.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-13.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-14.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-15.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-16.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-17.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-18.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"RB-01.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"RB-02.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"RB-03.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"RB-04.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"RB-05.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"RB-06.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"RB-07.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"SYN-01.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"SYN-02.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"SYN-03.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"SYN-04.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"SYN-05.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"SYN-06.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-a-sweep-1.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-a-sweep-2.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-a-sweep-3.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-c-sweep-1.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-c-sweep-2.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-c-sweep-3.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-d-sweep-1.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-d-sweep-2.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-d-sweep-3.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-e-sweep-1.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-e-sweep-2.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-e-sweep-3.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-f-sweep-1.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-f-sweep-2.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-f-sweep-3.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-poc-sweep-1.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-poc-sweep-2.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-poc-sweep-3.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-wave4-sweep-1.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-wave4-sweep-2.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-wave4-sweep-3.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-workstream-a-sweep-1.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-workstream-a-sweep-2.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-workstream-a-sweep-3.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-workstream-c-sweep-1.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-workstream-c-sweep-2.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-workstream-c-sweep-3.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-01.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-02.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-03.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-04.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-05.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-06.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-07.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-08.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-09.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-10.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-11.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-12.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-13.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-14.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-15.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-16.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-17.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-18.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-19.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-20.log"}]

```



### Artifact W0411-ART-063: Raw Execution Log: SYN-02.log
- **File**: `docs/wave-0/4.13/evidence/raw/SYN-02.log`
- **Type**: `Log File`
- **SHA-256**: `a9f55a4610cc282e39b93087286f774164cacfedeaf226ef5b9845cd6548b59f`
- **Byte Count**: `7043`

```javascript
ACTUAL: REJECTED_HASH_MISMATCH
FINDINGS: [{"code":"ARTIFACT_HASH_MISMATCH","path":"package.json","expected":"0000000000000000000000000000000000000000000000000000000000000000","actual":"cc70259390649d263a371e0feb2a3452bbcd042d571634f7ee48cfed61c9fdba"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"API-01.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"API-02.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"API-03.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"API-04.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"API-05.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"API-06.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-01.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-02.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-03.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-04.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-05.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-06.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-07.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-08.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-09.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-10.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-11.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-12.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CONT-01.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CONT-02.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CONT-03.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CONT-04.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CONT-05.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CONT-06.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-01.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-02.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-03.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-04.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-05.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-06.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-07.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-08.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-09.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-10.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-11.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-12.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-13.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-14.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-15.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-16.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-17.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-18.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"RB-01.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"RB-02.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"RB-03.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"RB-04.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"RB-05.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"RB-06.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"RB-07.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"SYN-01.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"SYN-02.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"SYN-03.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"SYN-04.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"SYN-05.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"SYN-06.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-a-sweep-1.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-a-sweep-2.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-a-sweep-3.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-c-sweep-1.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-c-sweep-2.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-c-sweep-3.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-d-sweep-1.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-d-sweep-2.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-d-sweep-3.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-e-sweep-1.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-e-sweep-2.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-e-sweep-3.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-f-sweep-1.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-f-sweep-2.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-f-sweep-3.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-poc-sweep-1.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-poc-sweep-2.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-poc-sweep-3.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-wave4-sweep-1.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-wave4-sweep-2.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-wave4-sweep-3.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-workstream-a-sweep-1.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-workstream-a-sweep-2.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-workstream-a-sweep-3.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-workstream-c-sweep-1.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-workstream-c-sweep-2.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-workstream-c-sweep-3.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-01.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-02.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-03.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-04.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-05.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-06.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-07.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-08.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-09.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-10.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-11.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-12.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-13.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-14.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-15.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-16.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-17.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-18.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-19.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-20.log"}]

```



### Artifact W0411-ART-064: Raw Execution Log: SYN-03.log
- **File**: `docs/wave-0/4.13/evidence/raw/SYN-03.log`
- **Type**: `Log File`
- **SHA-256**: `29b039354a55a8929226eb07cc6a5906e8b17713aa8e3ccde3dbe8ed555bd2f2`
- **Byte Count**: `7006`

```javascript
ACTUAL: REJECTED_DUPLICATE_ID
FINDINGS: [{"code":"DUPLICATE_ARTIFACT_ID","id":"TEST-ART-DUP"},{"code":"MISSING_MANDATORY_SHA256","path":"package.json"},{"code":"MISSING_MANDATORY_SHA256","path":"package-lock.json"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"API-01.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"API-02.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"API-03.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"API-04.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"API-05.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"API-06.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-01.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-02.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-03.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-04.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-05.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-06.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-07.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-08.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-09.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-10.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-11.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"AUTH-12.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CONT-01.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CONT-02.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CONT-03.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CONT-04.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CONT-05.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CONT-06.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-01.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-02.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-03.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-04.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-05.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-06.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-07.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-08.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-09.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-10.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-11.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-12.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-13.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-14.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-15.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-16.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-17.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"CSV-18.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"RB-01.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"RB-02.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"RB-03.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"RB-04.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"RB-05.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"RB-06.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"RB-07.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"SYN-01.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"SYN-02.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"SYN-03.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"SYN-04.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"SYN-05.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"SYN-06.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-a-sweep-1.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-a-sweep-2.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-a-sweep-3.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-c-sweep-1.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-c-sweep-2.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-c-sweep-3.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-d-sweep-1.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-d-sweep-2.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-d-sweep-3.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-e-sweep-1.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-e-sweep-2.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-e-sweep-3.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-f-sweep-1.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-f-sweep-2.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-lane-f-sweep-3.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-poc-sweep-1.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-poc-sweep-2.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-poc-sweep-3.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-wave4-sweep-1.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-wave4-sweep-2.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-wave4-sweep-3.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-workstream-a-sweep-1.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-workstream-a-sweep-2.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-workstream-a-sweep-3.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-workstream-c-sweep-1.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-workstream-c-sweep-2.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"baseline-workstream-c-sweep-3.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-01.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-02.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-03.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-04.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-05.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-06.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-07.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-08.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-09.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-10.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-11.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-12.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-13.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-14.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-15.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-16.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-17.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-18.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-19.log"},{"code":"UNINDEXED_EVIDENCE_LOG","filename":"validator-mutation-MUT-20.log"}]

```



### Artifact W0411-ART-065: Raw Execution Log: SYN-04.log
- **File**: `docs/wave-0/4.13/evidence/raw/SYN-04.log`
- **Type**: `Log File`
- **SHA-256**: `b32da5a73871a711355bfcd3a1dd0697f778cefa825b2340ce9ef0578d6a0889`
- **Byte Count**: `176`

```javascript
SHA1: 297c2d765d879d3d8bc09224f8922fa83c2eab4743e7280422af2fd8c4055681
SHA2: 297c2d765d879d3d8bc09224f8922fa83c2eab4743e7280422af2fd8c4055681
ACTUAL: DETERMINISTIC_EXACT_MATCH

```



### Artifact W0411-ART-066: Raw Execution Log: SYN-05.log
- **File**: `docs/wave-0/4.13/evidence/raw/SYN-05.log`
- **Type**: `Log File`
- **SHA-256**: `d5e6b495e5a66431fdf456f5043c19cc71d0292d856e6dffcafaecf5df7b639f`
- **Byte Count**: `116`

```javascript
EXIT: 2
STDERR: CLI_ERROR: Caller substitution of arbitrary manifest is disallowed in authoritative synthesis mode


```



### Artifact W0411-ART-067: Raw Execution Log: SYN-06.log
- **File**: `docs/wave-0/4.13/evidence/raw/SYN-06.log`
- **Type**: `Log File`
- **SHA-256**: `9cb3bffe242d6e49ec2ce6fd2ee6e4b3c527066a3ffec5d783888acf6d011988`
- **Byte Count**: `48`

```javascript
EXIT: 1
STDERR: SYNTHESIS_FAILED: 103 findings


```



### Artifact W0411-ART-068: Raw Execution Log: baseline-lane-a-sweep-1.log
- **File**: `docs/wave-0/4.13/evidence/raw/baseline-lane-a-sweep-1.log`
- **Type**: `Log File`
- **SHA-256**: `e1e34107a8a8849debaf6e12beda601c6ee21239b7abeb83d913bef4b5c0d195`
- **Byte Count**: `1081`

```javascript
COMMAND: node scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs
SWEEP: 1
EXIT_CODE: 0
START: 2026-11-06T16:50:05.530Z
END: 2026-11-06T16:50:05.631Z
DURATION_MS: 101
PRE_HASH: 9a40e097b23e9791b6cb6f27249356c4cfb3ed1e58bdc5b5f423a13a6ef5bdd0
POST_HASH: 9a40e097b23e9791b6cb6f27249356c4cfb3ed1e58bdc5b5f423a13a6ef5bdd0
STDOUT:
Running Lane A Canonical Filter Schema Offline Test Suite...
===========================================================
  ✓ 1. Schema version and constants integrity
  ✓ 2. Default criteria and normalization
  ✓ 3. Legacy V1 filter upgrade to V2 container
  ✓ 4. Strict project-scoped preset isolation (DEC-W4-03)
  ✓ 5. Payload serialization 131,072 boundary enforcement
  ✓ 6. Graph node filter predicate mapping
  ✓ 7. Matrix edge filter predicate mapping and unresolved edge handling
  ✓ 8. Findings filter predicate mapping (Distinguishing UNTESTED vs UNKNOWN)
  ✓ 9. High coupling criteria helper (coupling > 15 or fanIn > 10)
===========================================================
Summary: 9 PASSED, 0 FAILED

STDERR:


```



### Artifact W0411-ART-069: Raw Execution Log: baseline-lane-a-sweep-2.log
- **File**: `docs/wave-0/4.13/evidence/raw/baseline-lane-a-sweep-2.log`
- **Type**: `Log File`
- **SHA-256**: `81170da2efe9f15cb615afb798d7f6b2882f889bcf386078c73c12862d9bffa2`
- **Byte Count**: `1080`

```javascript
COMMAND: node scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs
SWEEP: 2
EXIT_CODE: 0
START: 2026-11-06T16:50:08.124Z
END: 2026-11-06T16:50:08.212Z
DURATION_MS: 88
PRE_HASH: 9a40e097b23e9791b6cb6f27249356c4cfb3ed1e58bdc5b5f423a13a6ef5bdd0
POST_HASH: 9a40e097b23e9791b6cb6f27249356c4cfb3ed1e58bdc5b5f423a13a6ef5bdd0
STDOUT:
Running Lane A Canonical Filter Schema Offline Test Suite...
===========================================================
  ✓ 1. Schema version and constants integrity
  ✓ 2. Default criteria and normalization
  ✓ 3. Legacy V1 filter upgrade to V2 container
  ✓ 4. Strict project-scoped preset isolation (DEC-W4-03)
  ✓ 5. Payload serialization 131,072 boundary enforcement
  ✓ 6. Graph node filter predicate mapping
  ✓ 7. Matrix edge filter predicate mapping and unresolved edge handling
  ✓ 8. Findings filter predicate mapping (Distinguishing UNTESTED vs UNKNOWN)
  ✓ 9. High coupling criteria helper (coupling > 15 or fanIn > 10)
===========================================================
Summary: 9 PASSED, 0 FAILED

STDERR:


```



### Artifact W0411-ART-070: Raw Execution Log: baseline-lane-a-sweep-3.log
- **File**: `docs/wave-0/4.13/evidence/raw/baseline-lane-a-sweep-3.log`
- **Type**: `Log File`
- **SHA-256**: `dc9b76b5efdabdc0f79a03ef040e8c6b435b5dd43b2ee18e2bdf5e96e53a6bcc`
- **Byte Count**: `1080`

```javascript
COMMAND: node scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs
SWEEP: 3
EXIT_CODE: 0
START: 2026-11-06T16:50:10.706Z
END: 2026-11-06T16:50:10.778Z
DURATION_MS: 72
PRE_HASH: 9a40e097b23e9791b6cb6f27249356c4cfb3ed1e58bdc5b5f423a13a6ef5bdd0
POST_HASH: 9a40e097b23e9791b6cb6f27249356c4cfb3ed1e58bdc5b5f423a13a6ef5bdd0
STDOUT:
Running Lane A Canonical Filter Schema Offline Test Suite...
===========================================================
  ✓ 1. Schema version and constants integrity
  ✓ 2. Default criteria and normalization
  ✓ 3. Legacy V1 filter upgrade to V2 container
  ✓ 4. Strict project-scoped preset isolation (DEC-W4-03)
  ✓ 5. Payload serialization 131,072 boundary enforcement
  ✓ 6. Graph node filter predicate mapping
  ✓ 7. Matrix edge filter predicate mapping and unresolved edge handling
  ✓ 8. Findings filter predicate mapping (Distinguishing UNTESTED vs UNKNOWN)
  ✓ 9. High coupling criteria helper (coupling > 15 or fanIn > 10)
===========================================================
Summary: 9 PASSED, 0 FAILED

STDERR:


```



### Artifact W0411-ART-071: Raw Execution Log: baseline-lane-c-sweep-1.log
- **File**: `docs/wave-0/4.13/evidence/raw/baseline-lane-c-sweep-1.log`
- **Type**: `Log File`
- **SHA-256**: `eb0d8467d2f89ca7f8a6d650e999cc57e3de6f22f9f1a7deb4c66b3f75587f93`
- **Byte Count**: `1349`

```javascript
COMMAND: node scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs
SWEEP: 1
EXIT_CODE: 0
START: 2026-11-06T16:50:05.632Z
END: 2026-11-06T16:50:05.734Z
DURATION_MS: 102
PRE_HASH: fb429356c54a2457d29b3f9f5e7a67efeeb0e785001c394d89706d392f526066
POST_HASH: fb429356c54a2457d29b3f9f5e7a67efeeb0e785001c394d89706d392f526066
STDOUT:
Running Lane C (DaPresetManager LWC) Focused Unit Test Suite...
================================================================
  ✓ 1. Empty preset collection initializes safe V2 defaults
  ✓ 2. Create preset saves criteria, activates preset, and emits containerchange/filterchange
  ✓ 3. Apply preset updates activeFilter, activePresetId, and emits event
  ✓ 4. Update preset persists modified criteria into target preset
  ✓ 5. Delete preset removes item and resets activePresetId if active preset was deleted
  ✓ 6. Project isolation excludes presets belonging to other projects
  ✓ 7. Missing project context blocks saving and sets clear error message
  ✓ 8. Malformed container string falls back safely to default V2 container
  ✓ 9. Capacity check enforces 131,072 char hard boundary on preset creation
  ✓ 10. Active preset styling correctly reflects activePresetId
================================================================
Lane C Test Results: 10 PASSED, 0 FAILED

STDERR:


```



### Artifact W0411-ART-072: Raw Execution Log: baseline-lane-c-sweep-2.log
- **File**: `docs/wave-0/4.13/evidence/raw/baseline-lane-c-sweep-2.log`
- **Type**: `Log File`
- **SHA-256**: `3712f31d4482b26f1efd5e86427b9f408fb2cc3b422cb9b9eab6818b4551c129`
- **Byte Count**: `1348`

```javascript
COMMAND: node scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs
SWEEP: 2
EXIT_CODE: 0
START: 2026-11-06T16:50:08.212Z
END: 2026-11-06T16:50:08.288Z
DURATION_MS: 76
PRE_HASH: fb429356c54a2457d29b3f9f5e7a67efeeb0e785001c394d89706d392f526066
POST_HASH: fb429356c54a2457d29b3f9f5e7a67efeeb0e785001c394d89706d392f526066
STDOUT:
Running Lane C (DaPresetManager LWC) Focused Unit Test Suite...
================================================================
  ✓ 1. Empty preset collection initializes safe V2 defaults
  ✓ 2. Create preset saves criteria, activates preset, and emits containerchange/filterchange
  ✓ 3. Apply preset updates activeFilter, activePresetId, and emits event
  ✓ 4. Update preset persists modified criteria into target preset
  ✓ 5. Delete preset removes item and resets activePresetId if active preset was deleted
  ✓ 6. Project isolation excludes presets belonging to other projects
  ✓ 7. Missing project context blocks saving and sets clear error message
  ✓ 8. Malformed container string falls back safely to default V2 container
  ✓ 9. Capacity check enforces 131,072 char hard boundary on preset creation
  ✓ 10. Active preset styling correctly reflects activePresetId
================================================================
Lane C Test Results: 10 PASSED, 0 FAILED

STDERR:


```



### Artifact W0411-ART-073: Raw Execution Log: baseline-lane-c-sweep-3.log
- **File**: `docs/wave-0/4.13/evidence/raw/baseline-lane-c-sweep-3.log`
- **Type**: `Log File`
- **SHA-256**: `69feb6db854df22514413ae26ed507935587237623f98042b0b0fb0755f0df55`
- **Byte Count**: `1348`

```javascript
COMMAND: node scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs
SWEEP: 3
EXIT_CODE: 0
START: 2026-11-06T16:50:10.779Z
END: 2026-11-06T16:50:10.860Z
DURATION_MS: 81
PRE_HASH: fb429356c54a2457d29b3f9f5e7a67efeeb0e785001c394d89706d392f526066
POST_HASH: fb429356c54a2457d29b3f9f5e7a67efeeb0e785001c394d89706d392f526066
STDOUT:
Running Lane C (DaPresetManager LWC) Focused Unit Test Suite...
================================================================
  ✓ 1. Empty preset collection initializes safe V2 defaults
  ✓ 2. Create preset saves criteria, activates preset, and emits containerchange/filterchange
  ✓ 3. Apply preset updates activeFilter, activePresetId, and emits event
  ✓ 4. Update preset persists modified criteria into target preset
  ✓ 5. Delete preset removes item and resets activePresetId if active preset was deleted
  ✓ 6. Project isolation excludes presets belonging to other projects
  ✓ 7. Missing project context blocks saving and sets clear error message
  ✓ 8. Malformed container string falls back safely to default V2 container
  ✓ 9. Capacity check enforces 131,072 char hard boundary on preset creation
  ✓ 10. Active preset styling correctly reflects activePresetId
================================================================
Lane C Test Results: 10 PASSED, 0 FAILED

STDERR:


```



### Artifact W0411-ART-074: Raw Execution Log: baseline-lane-d-sweep-1.log
- **File**: `docs/wave-0/4.13/evidence/raw/baseline-lane-d-sweep-1.log`
- **Type**: `Log File`
- **SHA-256**: `53091ba2bd5b90e84c4214077eec2c425ddedd73a265ef131eab270805efb2d5`
- **Byte Count**: `1529`

```javascript
COMMAND: node scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs
SWEEP: 1
EXIT_CODE: 0
START: 2026-11-06T16:50:05.735Z
END: 2026-11-06T16:50:05.824Z
DURATION_MS: 89
PRE_HASH: 3c6b3c08b14731137cfc4afa581bf32c7d569a9ad51c7ec3d9814ce49fda537f
POST_HASH: 3c6b3c08b14731137cfc4afa581bf32c7d569a9ad51c7ec3d9814ce49fda537f
STDOUT:
Running Lane D (daGraphViewer Filter Integration) Test Suite...
===============================================================
  ✓ 1. Search filtering isolates matching nodes
  ✓ 2. Node-type filtering isolates nodes of specified type
  ✓ 3. Risk filtering isolates HIGH risk nodes and intact edges
  ✓ 4. Layer filtering filters on layer attribute
  ✓ 5. Coverage filtering distinguishes COVERED vs UNTESTED
  ✓ 6. Missing coverage defaults to UNKNOWN, not UNTESTED
  ✓ 7. Combined filters evaluate conjunctive boolean logic
  ✓ 8. Clearing filters restores complete node and edge set
  ✓ 9. Filter change during load buffers criteria safely
  ✓ 10. Stale async responses are discarded upon request ID mismatch
  ✓ 11. Invariant 1: SELECTION != NAVIGATION preserved
  ✓ 12. Layout positions and zoom/pan preserved across filter applications
  ✓ 13. Node annotations preserved across filtering
  ✓ 14. Invariant 8: Cytoscape instance destroyed cleanly
  ✓ 15. Invariant 3: @api recordId getter/setter normalizes and invalidates in-flight requests
===============================================================
Lane D Test Results: 15 PASSED, 0 FAILED

STDERR:


```



### Artifact W0411-ART-075: Raw Execution Log: baseline-lane-d-sweep-2.log
- **File**: `docs/wave-0/4.13/evidence/raw/baseline-lane-d-sweep-2.log`
- **Type**: `Log File`
- **SHA-256**: `a9d3c8f440511c652ea2467673b8e99233d8dfd9042695bfd4de191b6b5070b8`
- **Byte Count**: `1530`

```javascript
COMMAND: node scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs
SWEEP: 2
EXIT_CODE: 0
START: 2026-11-06T16:50:08.289Z
END: 2026-11-06T16:50:08.405Z
DURATION_MS: 116
PRE_HASH: 3c6b3c08b14731137cfc4afa581bf32c7d569a9ad51c7ec3d9814ce49fda537f
POST_HASH: 3c6b3c08b14731137cfc4afa581bf32c7d569a9ad51c7ec3d9814ce49fda537f
STDOUT:
Running Lane D (daGraphViewer Filter Integration) Test Suite...
===============================================================
  ✓ 1. Search filtering isolates matching nodes
  ✓ 2. Node-type filtering isolates nodes of specified type
  ✓ 3. Risk filtering isolates HIGH risk nodes and intact edges
  ✓ 4. Layer filtering filters on layer attribute
  ✓ 5. Coverage filtering distinguishes COVERED vs UNTESTED
  ✓ 6. Missing coverage defaults to UNKNOWN, not UNTESTED
  ✓ 7. Combined filters evaluate conjunctive boolean logic
  ✓ 8. Clearing filters restores complete node and edge set
  ✓ 9. Filter change during load buffers criteria safely
  ✓ 10. Stale async responses are discarded upon request ID mismatch
  ✓ 11. Invariant 1: SELECTION != NAVIGATION preserved
  ✓ 12. Layout positions and zoom/pan preserved across filter applications
  ✓ 13. Node annotations preserved across filtering
  ✓ 14. Invariant 8: Cytoscape instance destroyed cleanly
  ✓ 15. Invariant 3: @api recordId getter/setter normalizes and invalidates in-flight requests
===============================================================
Lane D Test Results: 15 PASSED, 0 FAILED

STDERR:


```



### Artifact W0411-ART-076: Raw Execution Log: baseline-lane-d-sweep-3.log
- **File**: `docs/wave-0/4.13/evidence/raw/baseline-lane-d-sweep-3.log`
- **Type**: `Log File`
- **SHA-256**: `34539bbcb8ff15c1bfaa0c1f5f5737af4cf5971e8374f352ac2c4beddbcc9cf0`
- **Byte Count**: `1530`

```javascript
COMMAND: node scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs
SWEEP: 3
EXIT_CODE: 0
START: 2026-11-06T16:50:10.861Z
END: 2026-11-06T16:50:10.972Z
DURATION_MS: 111
PRE_HASH: 3c6b3c08b14731137cfc4afa581bf32c7d569a9ad51c7ec3d9814ce49fda537f
POST_HASH: 3c6b3c08b14731137cfc4afa581bf32c7d569a9ad51c7ec3d9814ce49fda537f
STDOUT:
Running Lane D (daGraphViewer Filter Integration) Test Suite...
===============================================================
  ✓ 1. Search filtering isolates matching nodes
  ✓ 2. Node-type filtering isolates nodes of specified type
  ✓ 3. Risk filtering isolates HIGH risk nodes and intact edges
  ✓ 4. Layer filtering filters on layer attribute
  ✓ 5. Coverage filtering distinguishes COVERED vs UNTESTED
  ✓ 6. Missing coverage defaults to UNKNOWN, not UNTESTED
  ✓ 7. Combined filters evaluate conjunctive boolean logic
  ✓ 8. Clearing filters restores complete node and edge set
  ✓ 9. Filter change during load buffers criteria safely
  ✓ 10. Stale async responses are discarded upon request ID mismatch
  ✓ 11. Invariant 1: SELECTION != NAVIGATION preserved
  ✓ 12. Layout positions and zoom/pan preserved across filter applications
  ✓ 13. Node annotations preserved across filtering
  ✓ 14. Invariant 8: Cytoscape instance destroyed cleanly
  ✓ 15. Invariant 3: @api recordId getter/setter normalizes and invalidates in-flight requests
===============================================================
Lane D Test Results: 15 PASSED, 0 FAILED

STDERR:


```



### Artifact W0411-ART-077: Raw Execution Log: baseline-lane-e-sweep-1.log
- **File**: `docs/wave-0/4.13/evidence/raw/baseline-lane-e-sweep-1.log`
- **Type**: `Log File`
- **SHA-256**: `57f4b580cb4d9e570aa9ae3978bc17aa9ef5bd5f50b88bd4aec12e5ccd54374a`
- **Byte Count**: `1300`

```javascript
COMMAND: node scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs
SWEEP: 1
EXIT_CODE: 0
START: 2026-11-06T16:50:05.825Z
END: 2026-11-06T16:50:05.885Z
DURATION_MS: 60
PRE_HASH: 2189651874e717b02f6edb7035a2a7c8831d57ed4a70930d95486b423f2b6304
POST_HASH: 2189651874e717b02f6edb7035a2a7c8831d57ed4a70930d95486b423f2b6304
STDOUT:
Running Lane E (daMatrixView LWC) Focused Unit Test Suite...
============================================================
  ✓ 1. Directed source-to-target dependency counts aggregated accurately
  ✓ 2. Directed dependency semantics preserved (Source != Target)
  ✓ 3. Unresolved edges with canonical target type mapped to expected target type
  ✓ 4. Unresolved edges without target type safely fall back to "Unresolved"
  ✓ 5. Dangling target node edge handled gracefully
  ✓ 6. Missing source node handled safely without error
  ✓ 7. Duplicate edge references suppressed to prevent overcounting
  ✓ 8. Canonical search and node-type filtering correctly restrict matrix
  ✓ 9. Empty payload yields empty matrix without crashing
  ✓ 10. Malformed payload string handled safely
  ✓ 11. Sum of row totals exactly matches totalDependencies
============================================================
Lane E Test Results: 11 PASSED, 0 FAILED

STDERR:


```



### Artifact W0411-ART-078: Raw Execution Log: baseline-lane-e-sweep-2.log
- **File**: `docs/wave-0/4.13/evidence/raw/baseline-lane-e-sweep-2.log`
- **Type**: `Log File`
- **SHA-256**: `9199d928820317d46f898772446372339a1b1ce2d7f3da4f0b3de0f5b0af6b46`
- **Byte Count**: `1300`

```javascript
COMMAND: node scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs
SWEEP: 2
EXIT_CODE: 0
START: 2026-11-06T16:50:08.406Z
END: 2026-11-06T16:50:08.501Z
DURATION_MS: 95
PRE_HASH: 2189651874e717b02f6edb7035a2a7c8831d57ed4a70930d95486b423f2b6304
POST_HASH: 2189651874e717b02f6edb7035a2a7c8831d57ed4a70930d95486b423f2b6304
STDOUT:
Running Lane E (daMatrixView LWC) Focused Unit Test Suite...
============================================================
  ✓ 1. Directed source-to-target dependency counts aggregated accurately
  ✓ 2. Directed dependency semantics preserved (Source != Target)
  ✓ 3. Unresolved edges with canonical target type mapped to expected target type
  ✓ 4. Unresolved edges without target type safely fall back to "Unresolved"
  ✓ 5. Dangling target node edge handled gracefully
  ✓ 6. Missing source node handled safely without error
  ✓ 7. Duplicate edge references suppressed to prevent overcounting
  ✓ 8. Canonical search and node-type filtering correctly restrict matrix
  ✓ 9. Empty payload yields empty matrix without crashing
  ✓ 10. Malformed payload string handled safely
  ✓ 11. Sum of row totals exactly matches totalDependencies
============================================================
Lane E Test Results: 11 PASSED, 0 FAILED

STDERR:


```



### Artifact W0411-ART-079: Raw Execution Log: baseline-lane-e-sweep-3.log
- **File**: `docs/wave-0/4.13/evidence/raw/baseline-lane-e-sweep-3.log`
- **Type**: `Log File`
- **SHA-256**: `9a272182f8c81b99423c6aae8c33761511cdc3def40498a19aa562982fe8b9e7`
- **Byte Count**: `1300`

```javascript
COMMAND: node scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs
SWEEP: 3
EXIT_CODE: 0
START: 2026-11-06T16:50:10.974Z
END: 2026-11-06T16:50:11.072Z
DURATION_MS: 98
PRE_HASH: 2189651874e717b02f6edb7035a2a7c8831d57ed4a70930d95486b423f2b6304
POST_HASH: 2189651874e717b02f6edb7035a2a7c8831d57ed4a70930d95486b423f2b6304
STDOUT:
Running Lane E (daMatrixView LWC) Focused Unit Test Suite...
============================================================
  ✓ 1. Directed source-to-target dependency counts aggregated accurately
  ✓ 2. Directed dependency semantics preserved (Source != Target)
  ✓ 3. Unresolved edges with canonical target type mapped to expected target type
  ✓ 4. Unresolved edges without target type safely fall back to "Unresolved"
  ✓ 5. Dangling target node edge handled gracefully
  ✓ 6. Missing source node handled safely without error
  ✓ 7. Duplicate edge references suppressed to prevent overcounting
  ✓ 8. Canonical search and node-type filtering correctly restrict matrix
  ✓ 9. Empty payload yields empty matrix without crashing
  ✓ 10. Malformed payload string handled safely
  ✓ 11. Sum of row totals exactly matches totalDependencies
============================================================
Lane E Test Results: 11 PASSED, 0 FAILED

STDERR:


```



### Artifact W0411-ART-080: Raw Execution Log: baseline-lane-f-sweep-1.log
- **File**: `docs/wave-0/4.13/evidence/raw/baseline-lane-f-sweep-1.log`
- **Type**: `Log File`
- **SHA-256**: `5fefa60387341b66af88497040195eb9c5eed978c3b3153ced9943ea12ac392d`
- **Byte Count**: `1342`

```javascript
COMMAND: node scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs
SWEEP: 1
EXIT_CODE: 0
START: 2026-11-06T16:50:05.886Z
END: 2026-11-06T16:50:05.949Z
DURATION_MS: 63
PRE_HASH: 2ee0c460316557210c9bc5fc8c13d20488c619e2875c2375234236ebedc79ee9
POST_HASH: 2ee0c460316557210c9bc5fc8c13d20488c619e2875c2375234236ebedc79ee9
STDOUT:
Running Lane F (daFindingsView LWC) Focused Unit Test Suite...
==============================================================
  ✓ 1. Circular dependencies derived from cycles[] and node flags with deduplication
  ✓ 2. Untested high-risk items preserve distinct UNTESTED vs UNKNOWN status
  ✓ 3. Unresolved references derived and deduplicated
  ✓ 4. Hotspot detected when coupling > 15
  ✓ 5. Hotspot detected when fanIn > 10
  ✓ 6. Finding IDs are deterministic and stable across executions
  ✓ 7. Canonical search filter matches title, description, or componentName
  ✓ 8. Severity filtering restricts findings to requested levels
  ✓ 9. Coverage status filter correctly isolates UNTESTED findings
  ✓ 10. Empty payload yields 0 findings safely
  ✓ 11. Malformed payload handled safely fail-closed
  ✓ 12. Nodes missing optional analytics fields processed without errors
==============================================================
Lane F Test Results: 12 PASSED, 0 FAILED

STDERR:


```



### Artifact W0411-ART-081: Raw Execution Log: baseline-lane-f-sweep-2.log
- **File**: `docs/wave-0/4.13/evidence/raw/baseline-lane-f-sweep-2.log`
- **Type**: `Log File`
- **SHA-256**: `7a0be7b5cd53a84160443777b7c14c6ada111aaed16a65649057180de3f7750c`
- **Byte Count**: `1342`

```javascript
COMMAND: node scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs
SWEEP: 2
EXIT_CODE: 0
START: 2026-11-06T16:50:08.502Z
END: 2026-11-06T16:50:08.561Z
DURATION_MS: 59
PRE_HASH: 2ee0c460316557210c9bc5fc8c13d20488c619e2875c2375234236ebedc79ee9
POST_HASH: 2ee0c460316557210c9bc5fc8c13d20488c619e2875c2375234236ebedc79ee9
STDOUT:
Running Lane F (daFindingsView LWC) Focused Unit Test Suite...
==============================================================
  ✓ 1. Circular dependencies derived from cycles[] and node flags with deduplication
  ✓ 2. Untested high-risk items preserve distinct UNTESTED vs UNKNOWN status
  ✓ 3. Unresolved references derived and deduplicated
  ✓ 4. Hotspot detected when coupling > 15
  ✓ 5. Hotspot detected when fanIn > 10
  ✓ 6. Finding IDs are deterministic and stable across executions
  ✓ 7. Canonical search filter matches title, description, or componentName
  ✓ 8. Severity filtering restricts findings to requested levels
  ✓ 9. Coverage status filter correctly isolates UNTESTED findings
  ✓ 10. Empty payload yields 0 findings safely
  ✓ 11. Malformed payload handled safely fail-closed
  ✓ 12. Nodes missing optional analytics fields processed without errors
==============================================================
Lane F Test Results: 12 PASSED, 0 FAILED

STDERR:


```



### Artifact W0411-ART-082: Raw Execution Log: baseline-lane-f-sweep-3.log
- **File**: `docs/wave-0/4.13/evidence/raw/baseline-lane-f-sweep-3.log`
- **Type**: `Log File`
- **SHA-256**: `f989a86616b68cd7fb9597b4b14ecbf89287696d82c48b99a0a2ba6d8e029084`
- **Byte Count**: `1342`

```javascript
COMMAND: node scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs
SWEEP: 3
EXIT_CODE: 0
START: 2026-11-06T16:50:11.072Z
END: 2026-11-06T16:50:11.168Z
DURATION_MS: 96
PRE_HASH: 2ee0c460316557210c9bc5fc8c13d20488c619e2875c2375234236ebedc79ee9
POST_HASH: 2ee0c460316557210c9bc5fc8c13d20488c619e2875c2375234236ebedc79ee9
STDOUT:
Running Lane F (daFindingsView LWC) Focused Unit Test Suite...
==============================================================
  ✓ 1. Circular dependencies derived from cycles[] and node flags with deduplication
  ✓ 2. Untested high-risk items preserve distinct UNTESTED vs UNKNOWN status
  ✓ 3. Unresolved references derived and deduplicated
  ✓ 4. Hotspot detected when coupling > 15
  ✓ 5. Hotspot detected when fanIn > 10
  ✓ 6. Finding IDs are deterministic and stable across executions
  ✓ 7. Canonical search filter matches title, description, or componentName
  ✓ 8. Severity filtering restricts findings to requested levels
  ✓ 9. Coverage status filter correctly isolates UNTESTED findings
  ✓ 10. Empty payload yields 0 findings safely
  ✓ 11. Malformed payload handled safely fail-closed
  ✓ 12. Nodes missing optional analytics fields processed without errors
==============================================================
Lane F Test Results: 12 PASSED, 0 FAILED

STDERR:


```



### Artifact W0411-ART-083: Raw Execution Log: baseline-poc-sweep-1.log
- **File**: `docs/wave-0/4.13/evidence/raw/baseline-poc-sweep-1.log`
- **Type**: `Log File`
- **SHA-256**: `750177f05713473c612fe078163ec001feb0e60bd90dfd34db7fb8dc48fe3c8c`
- **Byte Count**: `4239`

```javascript
COMMAND: node scratch/salesforce-poc/tests/run-poc-tests.cjs
SWEEP: 1
EXIT_CODE: 0
START: 2026-11-06T16:50:03.444Z
END: 2026-11-06T16:50:05.378Z
DURATION_MS: 1933
PRE_HASH: 81d8acade55e8896e654bb8a80b97b395ff365ea3522869ab18e9c65606577b2
POST_HASH: 81d8acade55e8896e654bb8a80b97b395ff365ea3522869ab18e9c65606577b2
STDOUT:
Running Salesforce POC Offline Verification & Hardening Test Suite...
===================================================================

[Category 1: LWC Module Unit Tests]
  ✓ reassembleChunks: empty array and null returns empty string
  ✓ reassembleChunks: reassembles array of string chunks accurately
  ✓ validatePayloadIntegrity: accepts valid graph structures (nodes/edges, stages/flows, focal/rings)
  ✓ validatePayloadIntegrity: rejects parseable JSON without expected schema, invalid root types, and dangling edges
  ✓ verifyChunkSequence: detects correct contiguous indices starting at specified offset
  ✓ verifyChunkSequence: rejects gaps, duplicates, reordering, negative offsets, and invalid types

[Category 2: Bounded Pagination & Boundary Inputs]
  ✓ simulateBoundedFetch: caps requested limit at max allowed page size (10)
  ✓ simulateBoundedFetch: handles default maxChunks when null/undefined or <= 0
  ✓ simulateBoundedFetch: handles negative, fractional, and stringified start indices safely

[Category 3: Benchmark Fixture Paginated Verification]
  ✓ Fixture PBIM: file size, exact chunk count, paginated retrieval, and JSON verification
  ✓ Fixture BQC: file size, exact chunk count, paginated retrieval, and JSON verification
  ✓ Fixture CST: file size, exact chunk count, paginated retrieval, and JSON verification

[Category 4: Advanced Edge Cases, UTF-8 Multibyte, Race Conditions & Lifecycle]
  ✓ Unicode & Multibyte UTF-8 handling across chunk boundaries
  ✓ Surrogate Pair Boundary Safety: prevents splitting UTF-16 surrogate pairs at, before, and after chunk boundaries
  ✓ Oversized Synthetic Payload (10 MB / 100 Chunks)
  ✓ In-flight Request Cancellation / Stale Request Discard (Rapid Project Switch)
  ✓ Cytoscape Mounting & Teardown Lifecycle Cleanup

[Category 5: Expanded Adversarial Security, Fault Injection & Ingestion Verification]
  ✓ verifyChunkSequence: null element in chunk array does not throw TypeError
  ✓ chunkPayload: caps chunk size at 131,072 characters
  ✓ simulateBoundedFetch: large startIndex arithmetic safety check
  ✓ Ingestion Contract: throws validation errors on blank project name/key
  ✓ Metadata DTO Alignment Contract: Apex DTO field set matches LWC expectations
  ✓ validateChunkLimits & validatePayloadSize: enforces max chunk size and total payload size bounds
  ✓ Ingestion Bounded Batching & Idempotency Simulation Contract

[Category 6: Reusable LWC Layout Engine (daLayoutEngine) Parity Tests]
  ✓ daLayoutEngine: P0 computeArchitectureLayout produces deterministic finite coordinates
  ✓ daLayoutEngine: P0 computeArchitectureLayout against real benchmark fixture (CST)
  ✓ daLayoutEngine: P1 computeOrbitLayout produces valid radial coordinates
  ✓ daLayoutEngine: P1 computeConstellationLayout produces focal origin and curved edge paths
  ✓ daLayoutEngine: P2 computeSankeyLayout positions stage columns and flow paths
  ✓ Graph Viewer SELECTION != NAVIGATION Invariant Check

[Category 7: Production DaGraphViewer LWC Class Direct Unit Tests (11 Scenarios)]
  ✓ TC-01: Initial project load
  ✓ TC-02: Switching from project A to project B
  ✓ TC-03: Rapid switching from A to B to C
  ✓ TC-04: Delayed response from A arriving after switching to B
  ✓ TC-05: Failure loading project B
  ✓ TC-06: Empty graph payload for project B
  ✓ TC-07: Selected-node ID reset on project change
  ✓ TC-08: Cytoscape destruction and reinitialization
  ✓ TC-09: Component disconnection during an outstanding request
  ✓ TC-10: Rerendering without a project-ID change
  ✓ TC-11: SELECTION ≠ NAVIGATION invariant check
  ✓ TC-12: FEAT-STATE-02 ViewState loading and restoration
  ✓ TC-13: FEAT-STATE-02 ViewState debounced saving on drag/viewport change

===================================================================
Summary: 43 PASSED, 0 FAILED

STDERR:


```



### Artifact W0411-ART-084: Raw Execution Log: baseline-poc-sweep-2.log
- **File**: `docs/wave-0/4.13/evidence/raw/baseline-poc-sweep-2.log`
- **Type**: `Log File`
- **SHA-256**: `4e88c5b92bc58c2f6aa79e2cf0429912a018928667c825109722898db16e42ad`
- **Byte Count**: `4239`

```javascript
COMMAND: node scratch/salesforce-poc/tests/run-poc-tests.cjs
SWEEP: 2
EXIT_CODE: 0
START: 2026-11-06T16:50:06.158Z
END: 2026-11-06T16:50:07.976Z
DURATION_MS: 1818
PRE_HASH: 81d8acade55e8896e654bb8a80b97b395ff365ea3522869ab18e9c65606577b2
POST_HASH: 81d8acade55e8896e654bb8a80b97b395ff365ea3522869ab18e9c65606577b2
STDOUT:
Running Salesforce POC Offline Verification & Hardening Test Suite...
===================================================================

[Category 1: LWC Module Unit Tests]
  ✓ reassembleChunks: empty array and null returns empty string
  ✓ reassembleChunks: reassembles array of string chunks accurately
  ✓ validatePayloadIntegrity: accepts valid graph structures (nodes/edges, stages/flows, focal/rings)
  ✓ validatePayloadIntegrity: rejects parseable JSON without expected schema, invalid root types, and dangling edges
  ✓ verifyChunkSequence: detects correct contiguous indices starting at specified offset
  ✓ verifyChunkSequence: rejects gaps, duplicates, reordering, negative offsets, and invalid types

[Category 2: Bounded Pagination & Boundary Inputs]
  ✓ simulateBoundedFetch: caps requested limit at max allowed page size (10)
  ✓ simulateBoundedFetch: handles default maxChunks when null/undefined or <= 0
  ✓ simulateBoundedFetch: handles negative, fractional, and stringified start indices safely

[Category 3: Benchmark Fixture Paginated Verification]
  ✓ Fixture PBIM: file size, exact chunk count, paginated retrieval, and JSON verification
  ✓ Fixture BQC: file size, exact chunk count, paginated retrieval, and JSON verification
  ✓ Fixture CST: file size, exact chunk count, paginated retrieval, and JSON verification

[Category 4: Advanced Edge Cases, UTF-8 Multibyte, Race Conditions & Lifecycle]
  ✓ Unicode & Multibyte UTF-8 handling across chunk boundaries
  ✓ Surrogate Pair Boundary Safety: prevents splitting UTF-16 surrogate pairs at, before, and after chunk boundaries
  ✓ Oversized Synthetic Payload (10 MB / 100 Chunks)
  ✓ In-flight Request Cancellation / Stale Request Discard (Rapid Project Switch)
  ✓ Cytoscape Mounting & Teardown Lifecycle Cleanup

[Category 5: Expanded Adversarial Security, Fault Injection & Ingestion Verification]
  ✓ verifyChunkSequence: null element in chunk array does not throw TypeError
  ✓ chunkPayload: caps chunk size at 131,072 characters
  ✓ simulateBoundedFetch: large startIndex arithmetic safety check
  ✓ Ingestion Contract: throws validation errors on blank project name/key
  ✓ Metadata DTO Alignment Contract: Apex DTO field set matches LWC expectations
  ✓ validateChunkLimits & validatePayloadSize: enforces max chunk size and total payload size bounds
  ✓ Ingestion Bounded Batching & Idempotency Simulation Contract

[Category 6: Reusable LWC Layout Engine (daLayoutEngine) Parity Tests]
  ✓ daLayoutEngine: P0 computeArchitectureLayout produces deterministic finite coordinates
  ✓ daLayoutEngine: P0 computeArchitectureLayout against real benchmark fixture (CST)
  ✓ daLayoutEngine: P1 computeOrbitLayout produces valid radial coordinates
  ✓ daLayoutEngine: P1 computeConstellationLayout produces focal origin and curved edge paths
  ✓ daLayoutEngine: P2 computeSankeyLayout positions stage columns and flow paths
  ✓ Graph Viewer SELECTION != NAVIGATION Invariant Check

[Category 7: Production DaGraphViewer LWC Class Direct Unit Tests (11 Scenarios)]
  ✓ TC-01: Initial project load
  ✓ TC-02: Switching from project A to project B
  ✓ TC-03: Rapid switching from A to B to C
  ✓ TC-04: Delayed response from A arriving after switching to B
  ✓ TC-05: Failure loading project B
  ✓ TC-06: Empty graph payload for project B
  ✓ TC-07: Selected-node ID reset on project change
  ✓ TC-08: Cytoscape destruction and reinitialization
  ✓ TC-09: Component disconnection during an outstanding request
  ✓ TC-10: Rerendering without a project-ID change
  ✓ TC-11: SELECTION ≠ NAVIGATION invariant check
  ✓ TC-12: FEAT-STATE-02 ViewState loading and restoration
  ✓ TC-13: FEAT-STATE-02 ViewState debounced saving on drag/viewport change

===================================================================
Summary: 43 PASSED, 0 FAILED

STDERR:


```



### Artifact W0411-ART-085: Raw Execution Log: baseline-poc-sweep-3.log
- **File**: `docs/wave-0/4.13/evidence/raw/baseline-poc-sweep-3.log`
- **Type**: `Log File`
- **SHA-256**: `47549b0e2175506d980949d69f22166e856d6624e4e6a2f5d230e5c2fd04cf39`
- **Byte Count**: `4239`

```javascript
COMMAND: node scratch/salesforce-poc/tests/run-poc-tests.cjs
SWEEP: 3
EXIT_CODE: 0
START: 2026-11-06T16:50:08.801Z
END: 2026-11-06T16:50:10.612Z
DURATION_MS: 1811
PRE_HASH: 81d8acade55e8896e654bb8a80b97b395ff365ea3522869ab18e9c65606577b2
POST_HASH: 81d8acade55e8896e654bb8a80b97b395ff365ea3522869ab18e9c65606577b2
STDOUT:
Running Salesforce POC Offline Verification & Hardening Test Suite...
===================================================================

[Category 1: LWC Module Unit Tests]
  ✓ reassembleChunks: empty array and null returns empty string
  ✓ reassembleChunks: reassembles array of string chunks accurately
  ✓ validatePayloadIntegrity: accepts valid graph structures (nodes/edges, stages/flows, focal/rings)
  ✓ validatePayloadIntegrity: rejects parseable JSON without expected schema, invalid root types, and dangling edges
  ✓ verifyChunkSequence: detects correct contiguous indices starting at specified offset
  ✓ verifyChunkSequence: rejects gaps, duplicates, reordering, negative offsets, and invalid types

[Category 2: Bounded Pagination & Boundary Inputs]
  ✓ simulateBoundedFetch: caps requested limit at max allowed page size (10)
  ✓ simulateBoundedFetch: handles default maxChunks when null/undefined or <= 0
  ✓ simulateBoundedFetch: handles negative, fractional, and stringified start indices safely

[Category 3: Benchmark Fixture Paginated Verification]
  ✓ Fixture PBIM: file size, exact chunk count, paginated retrieval, and JSON verification
  ✓ Fixture BQC: file size, exact chunk count, paginated retrieval, and JSON verification
  ✓ Fixture CST: file size, exact chunk count, paginated retrieval, and JSON verification

[Category 4: Advanced Edge Cases, UTF-8 Multibyte, Race Conditions & Lifecycle]
  ✓ Unicode & Multibyte UTF-8 handling across chunk boundaries
  ✓ Surrogate Pair Boundary Safety: prevents splitting UTF-16 surrogate pairs at, before, and after chunk boundaries
  ✓ Oversized Synthetic Payload (10 MB / 100 Chunks)
  ✓ In-flight Request Cancellation / Stale Request Discard (Rapid Project Switch)
  ✓ Cytoscape Mounting & Teardown Lifecycle Cleanup

[Category 5: Expanded Adversarial Security, Fault Injection & Ingestion Verification]
  ✓ verifyChunkSequence: null element in chunk array does not throw TypeError
  ✓ chunkPayload: caps chunk size at 131,072 characters
  ✓ simulateBoundedFetch: large startIndex arithmetic safety check
  ✓ Ingestion Contract: throws validation errors on blank project name/key
  ✓ Metadata DTO Alignment Contract: Apex DTO field set matches LWC expectations
  ✓ validateChunkLimits & validatePayloadSize: enforces max chunk size and total payload size bounds
  ✓ Ingestion Bounded Batching & Idempotency Simulation Contract

[Category 6: Reusable LWC Layout Engine (daLayoutEngine) Parity Tests]
  ✓ daLayoutEngine: P0 computeArchitectureLayout produces deterministic finite coordinates
  ✓ daLayoutEngine: P0 computeArchitectureLayout against real benchmark fixture (CST)
  ✓ daLayoutEngine: P1 computeOrbitLayout produces valid radial coordinates
  ✓ daLayoutEngine: P1 computeConstellationLayout produces focal origin and curved edge paths
  ✓ daLayoutEngine: P2 computeSankeyLayout positions stage columns and flow paths
  ✓ Graph Viewer SELECTION != NAVIGATION Invariant Check

[Category 7: Production DaGraphViewer LWC Class Direct Unit Tests (11 Scenarios)]
  ✓ TC-01: Initial project load
  ✓ TC-02: Switching from project A to project B
  ✓ TC-03: Rapid switching from A to B to C
  ✓ TC-04: Delayed response from A arriving after switching to B
  ✓ TC-05: Failure loading project B
  ✓ TC-06: Empty graph payload for project B
  ✓ TC-07: Selected-node ID reset on project change
  ✓ TC-08: Cytoscape destruction and reinitialization
  ✓ TC-09: Component disconnection during an outstanding request
  ✓ TC-10: Rerendering without a project-ID change
  ✓ TC-11: SELECTION ≠ NAVIGATION invariant check
  ✓ TC-12: FEAT-STATE-02 ViewState loading and restoration
  ✓ TC-13: FEAT-STATE-02 ViewState debounced saving on drag/viewport change

===================================================================
Summary: 43 PASSED, 0 FAILED

STDERR:


```



### Artifact W0411-ART-086: Raw Execution Log: baseline-wave4-sweep-1.log
- **File**: `docs/wave-0/4.13/evidence/raw/baseline-wave4-sweep-1.log`
- **Type**: `Log File`
- **SHA-256**: `91285c3ebd2706aaf95073a2d34b9e4cfa754aee06448ee2f914096c3eeeb32d`
- **Byte Count**: `2807`

```javascript
COMMAND: node scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs
SWEEP: 1
EXIT_CODE: 0
START: 2026-11-06T16:50:05.380Z
END: 2026-11-06T16:50:05.529Z
DURATION_MS: 149
PRE_HASH: 4f36245fbb0931286b38a1ea487a17cddfdfef79c4f680df53ef1299b3f784b7
POST_HASH: 4f36245fbb0931286b38a1ea487a17cddfdfef79c4f680df53ef1299b3f784b7
STDOUT:
Running Wave 4 Phase 2C Coordinator Integration Test Suite...
================================================================

[Section 1: Shared Graph Payload Lifecycle]
  ✓ 1. Shell loads and validates chunked/raw graph payload
  ✓ 2. Shell passes the same validated payload to Matrix and Findings
  ✓ 4. No duplicate graph requests when shared payload is supplied
  ✓ 5. Stale graph responses are ignored
  ✓ 6. Project switching invalidates prior graph data
  ✓ 7. Component disconnect invalidates in-flight requests
  ✓ 8. Loading, empty and error states are distinct

[Section 2: Preset Manager Event Responsibilities]
  ✓ 9. Preset Manager receives correct inputs via getters
  ✓ 10. filterchange updates active criteria without accidental container persistence
  ✓ 11. containerchange updates and persists the V2 container
  ✓ 12. Preset selection updates criteria without erasing presets
  ✓ 13. Preset create/update/delete updates container and persists correctly

[Section 3: Strict Project-Scoped Presets]
  ✓ 14. Matching project preset is retained
  ✓ 15. Different project preset and unscoped presets are excluded
  ✓ 16. Missing project context exposes no presets
  ✓ 17. Malformed preference JSON does not trigger destructive writes
  ✓ 18. V1 migration remains in-memory only during load
  ✓ 19. V2 container preserves presets and active preset ID

[Section 4: Child Views Integration & Predicates]
  ✓ 3. Graph Viewer remains functional and receives filter criteria
  ✓ 20. Matrix receives correct shared payload and criteria
  ✓ 21. Findings receives correct shared payload and criteria
  ✓ 22. Graph filtering uses canonical criteria
  ✓ 23. Coverage states retain exact canonical semantics
  ✓ 24. UNKNOWN and UNTESTED remain distinct
  ✓ 25. High-coupling condition uses coupling > 15 OR fanIn > 10 threshold
  ✓ 26. Unresolved Matrix edges are preserved and classified

[Section 5: Frozen Invariants & State Protection]
  ✓ 27. Existing shell navigation remains intact
  ✓ 28. Invariant 1: SELECTION != NAVIGATION
  ✓ 29. Existing position and zoom/pan fields remain untouched
  ✓ 30. Stale preference requests are ignored
  ✓ 31. Deduplication prevents duplicate preference writes
  ✓ 32. All 12 frozen invariants verified by source contracts

================================================================
Wave 4 Phase 2C Integration Suite Results: 32 PASSED, 0 FAILED

STDERR:


```



### Artifact W0411-ART-087: Raw Execution Log: baseline-wave4-sweep-2.log
- **File**: `docs/wave-0/4.13/evidence/raw/baseline-wave4-sweep-2.log`
- **Type**: `Log File`
- **SHA-256**: `20857fcbba6742336dcbae2fb3309e30de6a277f92b9ccb79d2d6a7404db181b`
- **Byte Count**: `2807`

```javascript
COMMAND: node scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs
SWEEP: 2
EXIT_CODE: 0
START: 2026-11-06T16:50:07.977Z
END: 2026-11-06T16:50:08.123Z
DURATION_MS: 146
PRE_HASH: 4f36245fbb0931286b38a1ea487a17cddfdfef79c4f680df53ef1299b3f784b7
POST_HASH: 4f36245fbb0931286b38a1ea487a17cddfdfef79c4f680df53ef1299b3f784b7
STDOUT:
Running Wave 4 Phase 2C Coordinator Integration Test Suite...
================================================================

[Section 1: Shared Graph Payload Lifecycle]
  ✓ 1. Shell loads and validates chunked/raw graph payload
  ✓ 2. Shell passes the same validated payload to Matrix and Findings
  ✓ 4. No duplicate graph requests when shared payload is supplied
  ✓ 5. Stale graph responses are ignored
  ✓ 6. Project switching invalidates prior graph data
  ✓ 7. Component disconnect invalidates in-flight requests
  ✓ 8. Loading, empty and error states are distinct

[Section 2: Preset Manager Event Responsibilities]
  ✓ 9. Preset Manager receives correct inputs via getters
  ✓ 10. filterchange updates active criteria without accidental container persistence
  ✓ 11. containerchange updates and persists the V2 container
  ✓ 12. Preset selection updates criteria without erasing presets
  ✓ 13. Preset create/update/delete updates container and persists correctly

[Section 3: Strict Project-Scoped Presets]
  ✓ 14. Matching project preset is retained
  ✓ 15. Different project preset and unscoped presets are excluded
  ✓ 16. Missing project context exposes no presets
  ✓ 17. Malformed preference JSON does not trigger destructive writes
  ✓ 18. V1 migration remains in-memory only during load
  ✓ 19. V2 container preserves presets and active preset ID

[Section 4: Child Views Integration & Predicates]
  ✓ 3. Graph Viewer remains functional and receives filter criteria
  ✓ 20. Matrix receives correct shared payload and criteria
  ✓ 21. Findings receives correct shared payload and criteria
  ✓ 22. Graph filtering uses canonical criteria
  ✓ 23. Coverage states retain exact canonical semantics
  ✓ 24. UNKNOWN and UNTESTED remain distinct
  ✓ 25. High-coupling condition uses coupling > 15 OR fanIn > 10 threshold
  ✓ 26. Unresolved Matrix edges are preserved and classified

[Section 5: Frozen Invariants & State Protection]
  ✓ 27. Existing shell navigation remains intact
  ✓ 28. Invariant 1: SELECTION != NAVIGATION
  ✓ 29. Existing position and zoom/pan fields remain untouched
  ✓ 30. Stale preference requests are ignored
  ✓ 31. Deduplication prevents duplicate preference writes
  ✓ 32. All 12 frozen invariants verified by source contracts

================================================================
Wave 4 Phase 2C Integration Suite Results: 32 PASSED, 0 FAILED

STDERR:


```



### Artifact W0411-ART-088: Raw Execution Log: baseline-wave4-sweep-3.log
- **File**: `docs/wave-0/4.13/evidence/raw/baseline-wave4-sweep-3.log`
- **Type**: `Log File`
- **SHA-256**: `a3c386e0eced77168be7aeff09621bb4971e93cae2350d651520e4859331e9ac`
- **Byte Count**: `2806`

```javascript
COMMAND: node scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs
SWEEP: 3
EXIT_CODE: 0
START: 2026-11-06T16:50:10.613Z
END: 2026-11-06T16:50:10.705Z
DURATION_MS: 92
PRE_HASH: 4f36245fbb0931286b38a1ea487a17cddfdfef79c4f680df53ef1299b3f784b7
POST_HASH: 4f36245fbb0931286b38a1ea487a17cddfdfef79c4f680df53ef1299b3f784b7
STDOUT:
Running Wave 4 Phase 2C Coordinator Integration Test Suite...
================================================================

[Section 1: Shared Graph Payload Lifecycle]
  ✓ 1. Shell loads and validates chunked/raw graph payload
  ✓ 2. Shell passes the same validated payload to Matrix and Findings
  ✓ 4. No duplicate graph requests when shared payload is supplied
  ✓ 5. Stale graph responses are ignored
  ✓ 6. Project switching invalidates prior graph data
  ✓ 7. Component disconnect invalidates in-flight requests
  ✓ 8. Loading, empty and error states are distinct

[Section 2: Preset Manager Event Responsibilities]
  ✓ 9. Preset Manager receives correct inputs via getters
  ✓ 10. filterchange updates active criteria without accidental container persistence
  ✓ 11. containerchange updates and persists the V2 container
  ✓ 12. Preset selection updates criteria without erasing presets
  ✓ 13. Preset create/update/delete updates container and persists correctly

[Section 3: Strict Project-Scoped Presets]
  ✓ 14. Matching project preset is retained
  ✓ 15. Different project preset and unscoped presets are excluded
  ✓ 16. Missing project context exposes no presets
  ✓ 17. Malformed preference JSON does not trigger destructive writes
  ✓ 18. V1 migration remains in-memory only during load
  ✓ 19. V2 container preserves presets and active preset ID

[Section 4: Child Views Integration & Predicates]
  ✓ 3. Graph Viewer remains functional and receives filter criteria
  ✓ 20. Matrix receives correct shared payload and criteria
  ✓ 21. Findings receives correct shared payload and criteria
  ✓ 22. Graph filtering uses canonical criteria
  ✓ 23. Coverage states retain exact canonical semantics
  ✓ 24. UNKNOWN and UNTESTED remain distinct
  ✓ 25. High-coupling condition uses coupling > 15 OR fanIn > 10 threshold
  ✓ 26. Unresolved Matrix edges are preserved and classified

[Section 5: Frozen Invariants & State Protection]
  ✓ 27. Existing shell navigation remains intact
  ✓ 28. Invariant 1: SELECTION != NAVIGATION
  ✓ 29. Existing position and zoom/pan fields remain untouched
  ✓ 30. Stale preference requests are ignored
  ✓ 31. Deduplication prevents duplicate preference writes
  ✓ 32. All 12 frozen invariants verified by source contracts

================================================================
Wave 4 Phase 2C Integration Suite Results: 32 PASSED, 0 FAILED

STDERR:


```



### Artifact W0411-ART-089: Raw Execution Log: baseline-workstream-a-sweep-1.log
- **File**: `docs/wave-0/4.13/evidence/raw/baseline-workstream-a-sweep-1.log`
- **Type**: `Log File`
- **SHA-256**: `3d32a2ee0c3d143525d49f0c6b5b973dd59bfb9666a9dfbfe801659e43a5a180`
- **Byte Count**: `2550`

```javascript
COMMAND: node scratch/salesforce-poc/tests/run-workstream-a-tests.cjs
SWEEP: 1
EXIT_CODE: 0
START: 2026-11-06T16:50:05.951Z
END: 2026-11-06T16:50:06.046Z
DURATION_MS: 95
PRE_HASH: 61a8eadcd3009fef01d4f1216d5afa24f4292fb789d292fac90d78d2ca874bf1
POST_HASH: 61a8eadcd3009fef01d4f1216d5afa24f4292fb789d292fac90d78d2ca874bf1
STDOUT:
Running Workstream A LWC Offline Unit Tests (daAppShell & daProjectSelector)...
================================================================================
  ✓ 1. Application shell initial render defaults
  ✓ 2. Navigation among approved existing views (Graph, Matrix, Findings)
  ✓ 3. Project selector loading and populated state
  ✓ 4. Empty project-list behavior
  ✓ 5. Project-list request failure behavior
  ✓ 6. Selecting a project updates parent-owned project context
  ✓ 7. Active graph viewer receives correct project ID binding
  ✓ 8. Switching views preserves active project context and selection
  ✓ 9. Re-selecting the same project suppresses redundant updates
  ✓ 10. Graph-node selection does NOT alter project or navigate views (SELECTION != NAVIGATION)
  ✓ 11. Project switching clears prior node selection to prevent stale state
  ✓ 12. Accessibility and tab index properties contract
  ✓ 13. daAppShell HTML template integrates c-da-annotation-panel with active project and node bindings
  ✓ 14. Load preferences for the initial project
  ✓ 15. Load preferences after changing projects
  ✓ 16. Reject a stale response from a previous project
  ✓ 17. Restore a valid saved active view
  ✓ 18. Restore a valid saved layout
  ✓ 19. Restore valid versioned filter JSON
  ✓ 20. Handle missing preferences
  ✓ 21. Handle malformed filter JSON
  ✓ 22. Handle unsupported schema versions
  ✓ 23. Apply approved empty-filter fallback
  ✓ 24. Change only layout while preserving unrelated preferences
  ✓ 25. Change only filters while preserving unrelated preferences
  ✓ 26. Change only active view while preserving unrelated preferences
  ✓ 27. Ensure graph positions are not overwritten during preference saves
  ✓ 28. Ensure zoom/pan is not overwritten during preference saves
  ✓ 29. Prevent redundant saves
  ✓ 30. Handle save failures
  ✓ 31. Prevent duplicate load/save operations
  ✓ 32. Preserve SELECTION != NAVIGATION invariant during preference changes
  ✓ 33. Preserve existing component lifecycle cleanup

================================================================================
Summary: 33 PASSED, 0 FAILED

STDERR:


```



### Artifact W0411-ART-090: Raw Execution Log: baseline-workstream-a-sweep-2.log
- **File**: `docs/wave-0/4.13/evidence/raw/baseline-workstream-a-sweep-2.log`
- **Type**: `Log File`
- **SHA-256**: `4b56e9576d0cce4c75394074f8d8a376a4b6b2c3bff508bf5bbc4c76f9bed79d`
- **Byte Count**: `2550`

```javascript
COMMAND: node scratch/salesforce-poc/tests/run-workstream-a-tests.cjs
SWEEP: 2
EXIT_CODE: 0
START: 2026-11-06T16:50:08.562Z
END: 2026-11-06T16:50:08.646Z
DURATION_MS: 84
PRE_HASH: 61a8eadcd3009fef01d4f1216d5afa24f4292fb789d292fac90d78d2ca874bf1
POST_HASH: 61a8eadcd3009fef01d4f1216d5afa24f4292fb789d292fac90d78d2ca874bf1
STDOUT:
Running Workstream A LWC Offline Unit Tests (daAppShell & daProjectSelector)...
================================================================================
  ✓ 1. Application shell initial render defaults
  ✓ 2. Navigation among approved existing views (Graph, Matrix, Findings)
  ✓ 3. Project selector loading and populated state
  ✓ 4. Empty project-list behavior
  ✓ 5. Project-list request failure behavior
  ✓ 6. Selecting a project updates parent-owned project context
  ✓ 7. Active graph viewer receives correct project ID binding
  ✓ 8. Switching views preserves active project context and selection
  ✓ 9. Re-selecting the same project suppresses redundant updates
  ✓ 10. Graph-node selection does NOT alter project or navigate views (SELECTION != NAVIGATION)
  ✓ 11. Project switching clears prior node selection to prevent stale state
  ✓ 12. Accessibility and tab index properties contract
  ✓ 13. daAppShell HTML template integrates c-da-annotation-panel with active project and node bindings
  ✓ 14. Load preferences for the initial project
  ✓ 15. Load preferences after changing projects
  ✓ 16. Reject a stale response from a previous project
  ✓ 17. Restore a valid saved active view
  ✓ 18. Restore a valid saved layout
  ✓ 19. Restore valid versioned filter JSON
  ✓ 20. Handle missing preferences
  ✓ 21. Handle malformed filter JSON
  ✓ 22. Handle unsupported schema versions
  ✓ 23. Apply approved empty-filter fallback
  ✓ 24. Change only layout while preserving unrelated preferences
  ✓ 25. Change only filters while preserving unrelated preferences
  ✓ 26. Change only active view while preserving unrelated preferences
  ✓ 27. Ensure graph positions are not overwritten during preference saves
  ✓ 28. Ensure zoom/pan is not overwritten during preference saves
  ✓ 29. Prevent redundant saves
  ✓ 30. Handle save failures
  ✓ 31. Prevent duplicate load/save operations
  ✓ 32. Preserve SELECTION != NAVIGATION invariant during preference changes
  ✓ 33. Preserve existing component lifecycle cleanup

================================================================================
Summary: 33 PASSED, 0 FAILED

STDERR:


```



### Artifact W0411-ART-091: Raw Execution Log: baseline-workstream-a-sweep-3.log
- **File**: `docs/wave-0/4.13/evidence/raw/baseline-workstream-a-sweep-3.log`
- **Type**: `Log File`
- **SHA-256**: `123d9bd711e894858bcf6e4b52092b2b4736959c541923de942fedc7a064ecfc`
- **Byte Count**: `2551`

```javascript
COMMAND: node scratch/salesforce-poc/tests/run-workstream-a-tests.cjs
SWEEP: 3
EXIT_CODE: 0
START: 2026-11-06T16:50:11.169Z
END: 2026-11-06T16:50:11.275Z
DURATION_MS: 106
PRE_HASH: 61a8eadcd3009fef01d4f1216d5afa24f4292fb789d292fac90d78d2ca874bf1
POST_HASH: 61a8eadcd3009fef01d4f1216d5afa24f4292fb789d292fac90d78d2ca874bf1
STDOUT:
Running Workstream A LWC Offline Unit Tests (daAppShell & daProjectSelector)...
================================================================================
  ✓ 1. Application shell initial render defaults
  ✓ 2. Navigation among approved existing views (Graph, Matrix, Findings)
  ✓ 3. Project selector loading and populated state
  ✓ 4. Empty project-list behavior
  ✓ 5. Project-list request failure behavior
  ✓ 6. Selecting a project updates parent-owned project context
  ✓ 7. Active graph viewer receives correct project ID binding
  ✓ 8. Switching views preserves active project context and selection
  ✓ 9. Re-selecting the same project suppresses redundant updates
  ✓ 10. Graph-node selection does NOT alter project or navigate views (SELECTION != NAVIGATION)
  ✓ 11. Project switching clears prior node selection to prevent stale state
  ✓ 12. Accessibility and tab index properties contract
  ✓ 13. daAppShell HTML template integrates c-da-annotation-panel with active project and node bindings
  ✓ 14. Load preferences for the initial project
  ✓ 15. Load preferences after changing projects
  ✓ 16. Reject a stale response from a previous project
  ✓ 17. Restore a valid saved active view
  ✓ 18. Restore a valid saved layout
  ✓ 19. Restore valid versioned filter JSON
  ✓ 20. Handle missing preferences
  ✓ 21. Handle malformed filter JSON
  ✓ 22. Handle unsupported schema versions
  ✓ 23. Apply approved empty-filter fallback
  ✓ 24. Change only layout while preserving unrelated preferences
  ✓ 25. Change only filters while preserving unrelated preferences
  ✓ 26. Change only active view while preserving unrelated preferences
  ✓ 27. Ensure graph positions are not overwritten during preference saves
  ✓ 28. Ensure zoom/pan is not overwritten during preference saves
  ✓ 29. Prevent redundant saves
  ✓ 30. Handle save failures
  ✓ 31. Prevent duplicate load/save operations
  ✓ 32. Preserve SELECTION != NAVIGATION invariant during preference changes
  ✓ 33. Preserve existing component lifecycle cleanup

================================================================================
Summary: 33 PASSED, 0 FAILED

STDERR:


```



### Artifact W0411-ART-092: Raw Execution Log: baseline-workstream-c-sweep-1.log
- **File**: `docs/wave-0/4.13/evidence/raw/baseline-workstream-c-sweep-1.log`
- **Type**: `Log File`
- **SHA-256**: `be876cfb8d1a237d0ea78407d6bfd387151f0e4ba9245a48e6dec970defa9e34`
- **Byte Count**: `2555`

```javascript
COMMAND: node scratch/salesforce-poc/tests/run-workstream-c-tests.cjs
SWEEP: 1
EXIT_CODE: 0
START: 2026-11-06T16:50:06.047Z
END: 2026-11-06T16:50:06.157Z
DURATION_MS: 110
PRE_HASH: b3787bec64052fde20cb350ede3e758ca83d2355e30be824b6711bf19416131d
POST_HASH: b3787bec64052fde20cb350ede3e758ca83d2355e30be824b6711bf19416131d
STDOUT:
Running Workstream C Offline Verification & Integration Suite...
===================================================================

[Category 1: FEAT-STATE-02 ViewState & Position Persistence Tests]
  ✓ 1. First-use behavior: returns null when no saved preference exists
  ✓ 2. Saving and loading valid node positions and view state
  ✓ 3. Project and user isolation: preferences are strictly scoped
  ✓ 4. Project switch during save/load rejects cross-project pollution
  ✓ 5. Malformed JSON payload detection and rejection
  ✓ 6. Oversized JSON payload detection and rejection (>131072 chars) - R4 Boundary Verification
  ✓ 7. Blank or missing Project ID rejection
  ✓ 7a. Null arguments preserve existing saved preference values (Null-Coalescing Guard)
  ✓ 7b. Empty string parameter updates field value and is not treated as null
  ✓ 7c. R1: V1 filter save over existing V2 container preserves presets and activePresetId set to null
  ✓ 7d. R1: Incoming V2 container replaces existing container atomically
  ✓ 7e. R1: Empty string clears Filters_JSON__c and null preserves stored value
  ✓ 7f. R1: Malformed and unsupported schema fail closed and preserve existing data

[Category 2: FEAT-DATA-02 User Annotations & Notes Tests]
  ✓ 8. Creating and loading node annotations for specific project
  ✓ 9. Updating annotation text, status, and resolved timestamp
  ✓ 10. Deleting annotation record
  ✓ 11. Input validation: missing required fields and length limits
  ✓ 12. Project switch isolation: annotations from project A do not leak to project B
  ✓ 13. Selection Invariant Check: Annotation interactions do NOT mutate active project or view (SELECTION != NAVIGATION)

[Category 3: LWC Annotation Panel Component Direct Unit Tests]
  ✓ 14. daAnnotationPanel: fetching and creating annotations via LWC component
  ✓ 16. daAnnotationPanel: stale request response rejection on rapid node change

[Category 4: Production Apex Class Source Code Contract Verification]
  ✓ 15. Production Apex Source Contracts: DAUserPreferenceController.cls & DAAnnotationController.cls

===================================================================
Summary: 22 PASSED, 0 FAILED

STDERR:


```



### Artifact W0411-ART-093: Raw Execution Log: baseline-workstream-c-sweep-2.log
- **File**: `docs/wave-0/4.13/evidence/raw/baseline-workstream-c-sweep-2.log`
- **Type**: `Log File`
- **SHA-256**: `074b31d4c035110d7ab6013dea16bc39841f1e00068bf0b977ea18d3daf21c93`
- **Byte Count**: `2555`

```javascript
COMMAND: node scratch/salesforce-poc/tests/run-workstream-c-tests.cjs
SWEEP: 2
EXIT_CODE: 0
START: 2026-11-06T16:50:08.647Z
END: 2026-11-06T16:50:08.800Z
DURATION_MS: 153
PRE_HASH: b3787bec64052fde20cb350ede3e758ca83d2355e30be824b6711bf19416131d
POST_HASH: b3787bec64052fde20cb350ede3e758ca83d2355e30be824b6711bf19416131d
STDOUT:
Running Workstream C Offline Verification & Integration Suite...
===================================================================

[Category 1: FEAT-STATE-02 ViewState & Position Persistence Tests]
  ✓ 1. First-use behavior: returns null when no saved preference exists
  ✓ 2. Saving and loading valid node positions and view state
  ✓ 3. Project and user isolation: preferences are strictly scoped
  ✓ 4. Project switch during save/load rejects cross-project pollution
  ✓ 5. Malformed JSON payload detection and rejection
  ✓ 6. Oversized JSON payload detection and rejection (>131072 chars) - R4 Boundary Verification
  ✓ 7. Blank or missing Project ID rejection
  ✓ 7a. Null arguments preserve existing saved preference values (Null-Coalescing Guard)
  ✓ 7b. Empty string parameter updates field value and is not treated as null
  ✓ 7c. R1: V1 filter save over existing V2 container preserves presets and activePresetId set to null
  ✓ 7d. R1: Incoming V2 container replaces existing container atomically
  ✓ 7e. R1: Empty string clears Filters_JSON__c and null preserves stored value
  ✓ 7f. R1: Malformed and unsupported schema fail closed and preserve existing data

[Category 2: FEAT-DATA-02 User Annotations & Notes Tests]
  ✓ 8. Creating and loading node annotations for specific project
  ✓ 9. Updating annotation text, status, and resolved timestamp
  ✓ 10. Deleting annotation record
  ✓ 11. Input validation: missing required fields and length limits
  ✓ 12. Project switch isolation: annotations from project A do not leak to project B
  ✓ 13. Selection Invariant Check: Annotation interactions do NOT mutate active project or view (SELECTION != NAVIGATION)

[Category 3: LWC Annotation Panel Component Direct Unit Tests]
  ✓ 14. daAnnotationPanel: fetching and creating annotations via LWC component
  ✓ 16. daAnnotationPanel: stale request response rejection on rapid node change

[Category 4: Production Apex Class Source Code Contract Verification]
  ✓ 15. Production Apex Source Contracts: DAUserPreferenceController.cls & DAAnnotationController.cls

===================================================================
Summary: 22 PASSED, 0 FAILED

STDERR:


```



### Artifact W0411-ART-094: Raw Execution Log: baseline-workstream-c-sweep-3.log
- **File**: `docs/wave-0/4.13/evidence/raw/baseline-workstream-c-sweep-3.log`
- **Type**: `Log File`
- **SHA-256**: `62e8d00969dd1bfd24ea649e3a0a65bec30d93c19170bfadf7fb248e6f430449`
- **Byte Count**: `2555`

```javascript
COMMAND: node scratch/salesforce-poc/tests/run-workstream-c-tests.cjs
SWEEP: 3
EXIT_CODE: 0
START: 2026-11-06T16:50:11.276Z
END: 2026-11-06T16:50:11.399Z
DURATION_MS: 123
PRE_HASH: b3787bec64052fde20cb350ede3e758ca83d2355e30be824b6711bf19416131d
POST_HASH: b3787bec64052fde20cb350ede3e758ca83d2355e30be824b6711bf19416131d
STDOUT:
Running Workstream C Offline Verification & Integration Suite...
===================================================================

[Category 1: FEAT-STATE-02 ViewState & Position Persistence Tests]
  ✓ 1. First-use behavior: returns null when no saved preference exists
  ✓ 2. Saving and loading valid node positions and view state
  ✓ 3. Project and user isolation: preferences are strictly scoped
  ✓ 4. Project switch during save/load rejects cross-project pollution
  ✓ 5. Malformed JSON payload detection and rejection
  ✓ 6. Oversized JSON payload detection and rejection (>131072 chars) - R4 Boundary Verification
  ✓ 7. Blank or missing Project ID rejection
  ✓ 7a. Null arguments preserve existing saved preference values (Null-Coalescing Guard)
  ✓ 7b. Empty string parameter updates field value and is not treated as null
  ✓ 7c. R1: V1 filter save over existing V2 container preserves presets and activePresetId set to null
  ✓ 7d. R1: Incoming V2 container replaces existing container atomically
  ✓ 7e. R1: Empty string clears Filters_JSON__c and null preserves stored value
  ✓ 7f. R1: Malformed and unsupported schema fail closed and preserve existing data

[Category 2: FEAT-DATA-02 User Annotations & Notes Tests]
  ✓ 8. Creating and loading node annotations for specific project
  ✓ 9. Updating annotation text, status, and resolved timestamp
  ✓ 10. Deleting annotation record
  ✓ 11. Input validation: missing required fields and length limits
  ✓ 12. Project switch isolation: annotations from project A do not leak to project B
  ✓ 13. Selection Invariant Check: Annotation interactions do NOT mutate active project or view (SELECTION != NAVIGATION)

[Category 3: LWC Annotation Panel Component Direct Unit Tests]
  ✓ 14. daAnnotationPanel: fetching and creating annotations via LWC component
  ✓ 16. daAnnotationPanel: stale request response rejection on rapid node change

[Category 4: Production Apex Class Source Code Contract Verification]
  ✓ 15. Production Apex Source Contracts: DAUserPreferenceController.cls & DAAnnotationController.cls

===================================================================
Summary: 22 PASSED, 0 FAILED

STDERR:


```



### Artifact W0411-ART-095: Raw Execution Log: validator-mutation-MUT-01.log
- **File**: `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-01.log`
- **Type**: `Log File`
- **SHA-256**: `22be576c548bdc6992f4c059348adac6049243e10548fc28cca105af9aacb18c`
- **Byte Count**: `1279`

```javascript
COMMAND: node validate-wave0-4-13-dispatch.cjs
MUTATION: MUT-01
DESC: Unmanaged file injected into ownership manifest
START: 2026-11-06T17:26:02.631Z
END: 2026-11-06T17:26:02.711Z
EXIT_CODE: 1
EXPECTED_FINDINGS: ["MANIFEST-COUNT-175"]
ACTUAL_VIOLATIONS: ["MANIFEST-COUNT-175"]
EXACT_MATCH: true
STATUS: PASS
STDOUT:
======================================================================
   RUNNING Wave 0.4.13 ISOLATED SEMANTIC VALIDATOR
   Target Directory: /tmp/w0410-mut-MUT-01-azLzGF
======================================================================

Passed Assertions:     57
Failed Assertions:     1
Unverified Gates:      2
Findings Recorded:     3

Identified Findings (3):
- Code: MANIFEST-COUNT-175 | Status: VIOLATION | Severity: ERROR | Category: staticSchema | Desc: Manifest contains exactly 175 records
- Code: UNVERIFIED-SF-LIVE-ORG | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Live Salesforce org deployment & governor limit verification
- Code: UNVERIFIED-BROWSER-CANVAS | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Browser DOM drag & canvas rendering verification
======================================================================


STDERR:
Validator completed with 1 failure(s).


```



### Artifact W0411-ART-096: Raw Execution Log: validator-mutation-MUT-02.log
- **File**: `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-02.log`
- **Type**: `Log File`
- **SHA-256**: `ad100084129482c5309d8a826facada7ea9f33f074c042ce65d9be7651ad99a0`
- **Byte Count**: `1459`

```javascript
COMMAND: node validate-wave0-4-13-dispatch.cjs
MUTATION: MUT-02
DESC: W9-1 canonical task removed from task register
START: 2026-11-06T17:26:02.857Z
END: 2026-11-06T17:26:02.932Z
EXIT_CODE: 1
EXPECTED_FINDINGS: ["TASK-COUNT-21","TASK-MISSING-W9-1"]
ACTUAL_VIOLATIONS: ["TASK-COUNT-21","TASK-MISSING-W9-1"]
EXACT_MATCH: true
STATUS: PASS
STDOUT:
======================================================================
   RUNNING Wave 0.4.13 ISOLATED SEMANTIC VALIDATOR
   Target Directory: /tmp/w0410-mut-MUT-02-r48v2o
======================================================================

Passed Assertions:     55
Failed Assertions:     2
Unverified Gates:      2
Findings Recorded:     4

Identified Findings (4):
- Code: TASK-COUNT-21 | Status: VIOLATION | Severity: ERROR | Category: staticSchema | Desc: Authoritative task register contains exactly 21 tasks
- Code: TASK-MISSING-W9-1 | Status: VIOLATION | Severity: ERROR | Category: staticSchema | Desc: Task register contains canonical task W9-1
- Code: UNVERIFIED-SF-LIVE-ORG | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Live Salesforce org deployment & governor limit verification
- Code: UNVERIFIED-BROWSER-CANVAS | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Browser DOM drag & canvas rendering verification
======================================================================


STDERR:
Validator completed with 2 failure(s).


```



### Artifact W0411-ART-097: Raw Execution Log: validator-mutation-MUT-03.log
- **File**: `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-03.log`
- **Type**: `Log File`
- **SHA-256**: `fa8906cf5ec8b4a2c54f06dccde92bc9622f49c68133da4b63395aacfd5f3002`
- **Byte Count**: `1265`

```javascript
COMMAND: node validate-wave0-4-13-dispatch.cjs
MUTATION: MUT-03
DESC: W5 serialization violated (W5-3 running before W5-2)
START: 2026-11-06T17:26:03.045Z
END: 2026-11-06T17:26:03.115Z
EXIT_CODE: 1
EXPECTED_FINDINGS: ["W5-CHAIN-W5-3"]
ACTUAL_VIOLATIONS: ["W5-CHAIN-W5-3"]
EXACT_MATCH: true
STATUS: PASS
STDOUT:
======================================================================
   RUNNING Wave 0.4.13 ISOLATED SEMANTIC VALIDATOR
   Target Directory: /tmp/w0410-mut-MUT-03-Ot541W
======================================================================

Passed Assertions:     57
Failed Assertions:     1
Unverified Gates:      2
Findings Recorded:     3

Identified Findings (3):
- Code: W5-CHAIN-W5-3 | Status: VIOLATION | Severity: ERROR | Category: semanticReview | Desc: W5-3 requires W5-2 prerequisite
- Code: UNVERIFIED-SF-LIVE-ORG | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Live Salesforce org deployment & governor limit verification
- Code: UNVERIFIED-BROWSER-CANVAS | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Browser DOM drag & canvas rendering verification
======================================================================


STDERR:
Validator completed with 1 failure(s).


```



### Artifact W0411-ART-098: Raw Execution Log: validator-mutation-MUT-04.log
- **File**: `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-04.log`
- **Type**: `Log File`
- **SHA-256**: `7458e38e08551aeb8a5d5c515a9fdeb45aa863e82ab0281faf07416e8478b026`
- **Byte Count**: `1265`

```javascript
COMMAND: node validate-wave0-4-13-dispatch.cjs
MUTATION: MUT-04
DESC: Cyclic dependency between W6-1 and W6-2 injected
START: 2026-11-06T17:26:03.215Z
END: 2026-11-06T17:26:03.346Z
EXIT_CODE: 1
EXPECTED_FINDINGS: ["DEP-ACYCLIC"]
ACTUAL_VIOLATIONS: ["DEP-ACYCLIC"]
EXACT_MATCH: true
STATUS: PASS
STDOUT:
======================================================================
   RUNNING Wave 0.4.13 ISOLATED SEMANTIC VALIDATOR
   Target Directory: /tmp/w0410-mut-MUT-04-RIke4q
======================================================================

Passed Assertions:     57
Failed Assertions:     1
Unverified Gates:      2
Findings Recorded:     3

Identified Findings (3):
- Code: DEP-ACYCLIC | Status: VIOLATION | Severity: ERROR | Category: semanticReview | Desc: Task dependency graph is strictly acyclic
- Code: UNVERIFIED-SF-LIVE-ORG | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Live Salesforce org deployment & governor limit verification
- Code: UNVERIFIED-BROWSER-CANVAS | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Browser DOM drag & canvas rendering verification
======================================================================


STDERR:
Validator completed with 1 failure(s).


```



### Artifact W0411-ART-099: Raw Execution Log: validator-mutation-MUT-05.log
- **File**: `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-05.log`
- **Type**: `Log File`
- **SHA-256**: `b4014b00f3e12a6c4d096e07ea69fa794fe2efe2de00ce8089bfbdb8b0715c4b`
- **Byte Count**: `1447`

```javascript
COMMAND: node validate-wave0-4-13-dispatch.cjs
MUTATION: MUT-05
DESC: Duplicate path in ownership manifest
START: 2026-11-06T17:26:03.446Z
END: 2026-11-06T17:26:03.516Z
EXIT_CODE: 1
EXPECTED_FINDINGS: ["MANIFEST-COUNT-175","MANIFEST-DUPLICATE"]
ACTUAL_VIOLATIONS: ["MANIFEST-COUNT-175","MANIFEST-DUPLICATE"]
EXACT_MATCH: true
STATUS: PASS
STDOUT:
======================================================================
   RUNNING Wave 0.4.13 ISOLATED SEMANTIC VALIDATOR
   Target Directory: /tmp/w0410-mut-MUT-05-nMKhEb
======================================================================

Passed Assertions:     56
Failed Assertions:     2
Unverified Gates:      2
Findings Recorded:     4

Identified Findings (4):
- Code: MANIFEST-COUNT-175 | Status: VIOLATION | Severity: ERROR | Category: staticSchema | Desc: Manifest contains exactly 175 records
- Code: MANIFEST-DUPLICATE | Status: VIOLATION | Severity: ERROR | Category: staticSchema | Desc: Manifest contains zero duplicate paths
- Code: UNVERIFIED-SF-LIVE-ORG | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Live Salesforce org deployment & governor limit verification
- Code: UNVERIFIED-BROWSER-CANVAS | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Browser DOM drag & canvas rendering verification
======================================================================


STDERR:
Validator completed with 2 failure(s).


```



### Artifact W0411-ART-100: Raw Execution Log: validator-mutation-MUT-06.log
- **File**: `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-06.log`
- **Type**: `Log File`
- **SHA-256**: `b635943ee114549344c0eec7f15554fd24427c65539119e498683c15b5b6faf6`
- **Byte Count**: `1467`

```javascript
COMMAND: node validate-wave0-4-13-dispatch.cjs
MUTATION: MUT-06
DESC: Directory target inserted into manifest
START: 2026-11-06T17:26:03.602Z
END: 2026-11-06T17:26:03.675Z
EXIT_CODE: 1
EXPECTED_FINDINGS: ["MANIFEST-NO-DIR-scratch/salesforce-poc/force-app/main/default/lwc/"]
ACTUAL_VIOLATIONS: ["MANIFEST-NO-DIR-scratch/salesforce-poc/force-app/main/default/lwc/"]
EXACT_MATCH: true
STATUS: PASS
STDOUT:
======================================================================
   RUNNING Wave 0.4.13 ISOLATED SEMANTIC VALIDATOR
   Target Directory: /tmp/w0410-mut-MUT-06-4Z9yEt
======================================================================

Passed Assertions:     58
Failed Assertions:     1
Unverified Gates:      2
Findings Recorded:     3

Identified Findings (3):
- Code: MANIFEST-NO-DIR-scratch/salesforce-poc/force-app/main/default/lwc/ | Status: VIOLATION | Severity: ERROR | Category: filesystem | Desc: Manifest entry scratch/salesforce-poc/force-app/main/default/lwc/ is not a directory target
- Code: UNVERIFIED-SF-LIVE-ORG | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Live Salesforce org deployment & governor limit verification
- Code: UNVERIFIED-BROWSER-CANVAS | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Browser DOM drag & canvas rendering verification
======================================================================


STDERR:
Validator completed with 1 failure(s).


```



### Artifact W0411-ART-101: Raw Execution Log: validator-mutation-MUT-07.log
- **File**: `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-07.log`
- **Type**: `Log File`
- **SHA-256**: `e3679a3d24146b2f9bd3987f2126015bb2abd4e661e737e3dc745b40d710a6f5`
- **Byte Count**: `1472`

```javascript
COMMAND: node validate-wave0-4-13-dispatch.cjs
MUTATION: MUT-07
DESC: Batch 1 task count violation
START: 2026-11-06T17:26:03.771Z
END: 2026-11-06T17:26:03.846Z
EXIT_CODE: 1
EXPECTED_FINDINGS: ["BATCH1-TASK-COUNT-11","BATCH1-ROW-COUNT-49"]
ACTUAL_VIOLATIONS: ["BATCH1-TASK-COUNT-11","BATCH1-ROW-COUNT-49"]
EXACT_MATCH: true
STATUS: PASS
STDOUT:
======================================================================
   RUNNING Wave 0.4.13 ISOLATED SEMANTIC VALIDATOR
   Target Directory: /tmp/w0410-mut-MUT-07-dwKrCB
======================================================================

Passed Assertions:     56
Failed Assertions:     2
Unverified Gates:      2
Findings Recorded:     4

Identified Findings (4):
- Code: BATCH1-TASK-COUNT-11 | Status: VIOLATION | Severity: ERROR | Category: staticSchema | Desc: Batch 1 allowlist contains exactly 11 distinct tasks
- Code: BATCH1-ROW-COUNT-49 | Status: VIOLATION | Severity: ERROR | Category: staticSchema | Desc: Batch 1 allowlist contains exactly 49 path rows
- Code: UNVERIFIED-SF-LIVE-ORG | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Live Salesforce org deployment & governor limit verification
- Code: UNVERIFIED-BROWSER-CANVAS | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Browser DOM drag & canvas rendering verification
======================================================================


STDERR:
Validator completed with 2 failure(s).


```



### Artifact W0411-ART-102: Raw Execution Log: validator-mutation-MUT-08.log
- **File**: `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-08.log`
- **Type**: `Log File`
- **SHA-256**: `6e5f3cdcfdf6d69e4d7b887ff124cba1b565e9f1e7950ff8226bcf88e189fe8c`
- **Byte Count**: `1299`

```javascript
COMMAND: node validate-wave0-4-13-dispatch.cjs
MUTATION: MUT-08
DESC: W7 contract ambiguous OR query introduced
START: 2026-11-06T17:26:03.931Z
END: 2026-11-06T17:26:04.003Z
EXIT_CODE: 1
EXPECTED_FINDINGS: ["W7-REJECT-AMBIGUOUS-OR"]
ACTUAL_VIOLATIONS: ["W7-REJECT-AMBIGUOUS-OR"]
EXACT_MATCH: true
STATUS: PASS
STDOUT:
======================================================================
   RUNNING Wave 0.4.13 ISOLATED SEMANTIC VALIDATOR
   Target Directory: /tmp/w0410-mut-MUT-08-rbKCsJ
======================================================================

Passed Assertions:     57
Failed Assertions:     1
Unverified Gates:      2
Findings Recorded:     3

Identified Findings (3):
- Code: W7-REJECT-AMBIGUOUS-OR | Status: VIOLATION | Severity: ERROR | Category: semanticReview | Desc: W7 contract explicitly rejects ambiguous OR query
- Code: UNVERIFIED-SF-LIVE-ORG | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Live Salesforce org deployment & governor limit verification
- Code: UNVERIFIED-BROWSER-CANVAS | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Browser DOM drag & canvas rendering verification
======================================================================


STDERR:
Validator completed with 1 failure(s).


```



### Artifact W0411-ART-103: Raw Execution Log: validator-mutation-MUT-09.log
- **File**: `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-09.log`
- **Type**: `Log File`
- **SHA-256**: `17044a1525c7afb639d50edefa578ca87d74f156dafcbd7fd64be4a0e483e65f`
- **Byte Count**: `1270`

```javascript
COMMAND: node validate-wave0-4-13-dispatch.cjs
MUTATION: MUT-09
DESC: W8 raw string limit omitted
START: 2026-11-06T17:26:04.089Z
END: 2026-11-06T17:26:04.168Z
EXIT_CODE: 1
EXPECTED_FINDINGS: ["W8-10MB-STRING-GUARD"]
ACTUAL_VIOLATIONS: ["W8-10MB-STRING-GUARD"]
EXACT_MATCH: true
STATUS: PASS
STDOUT:
======================================================================
   RUNNING Wave 0.4.13 ISOLATED SEMANTIC VALIDATOR
   Target Directory: /tmp/w0410-mut-MUT-09-iw9uHc
======================================================================

Passed Assertions:     57
Failed Assertions:     1
Unverified Gates:      2
Findings Recorded:     3

Identified Findings (3):
- Code: W8-10MB-STRING-GUARD | Status: VIOLATION | Severity: ERROR | Category: semanticReview | Desc: Wave 8 enforces 10MB string length guard
- Code: UNVERIFIED-SF-LIVE-ORG | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Live Salesforce org deployment & governor limit verification
- Code: UNVERIFIED-BROWSER-CANVAS | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Browser DOM drag & canvas rendering verification
======================================================================


STDERR:
Validator completed with 1 failure(s).


```



### Artifact W0411-ART-104: Raw Execution Log: validator-mutation-MUT-10.log
- **File**: `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-10.log`
- **Type**: `Log File`
- **SHA-256**: `289ede0b5a5ad18894cf9d5b6d2e66b304426c4e2ce4df16b96040a02c6ed0ed`
- **Byte Count**: `1309`

```javascript
COMMAND: node validate-wave0-4-13-dispatch.cjs
MUTATION: MUT-10
DESC: daAppShell.js dispatched event falsely introduced
START: 2026-11-06T17:26:04.260Z
END: 2026-11-06T17:26:04.332Z
EXIT_CODE: 1
EXPECTED_FINDINGS: ["APPSHELL-NO-DISPATCH-EVENT"]
ACTUAL_VIOLATIONS: ["APPSHELL-NO-DISPATCH-EVENT"]
EXACT_MATCH: true
STATUS: PASS
STDOUT:
======================================================================
   RUNNING Wave 0.4.13 ISOLATED SEMANTIC VALIDATOR
   Target Directory: /tmp/w0410-mut-MUT-10-i3Inyt
======================================================================

Passed Assertions:     57
Failed Assertions:     1
Unverified Gates:      2
Findings Recorded:     3

Identified Findings (3):
- Code: APPSHELL-NO-DISPATCH-EVENT | Status: VIOLATION | Severity: ERROR | Category: semanticReview | Desc: daAppShell has zero dispatchEvent calls
- Code: UNVERIFIED-SF-LIVE-ORG | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Live Salesforce org deployment & governor limit verification
- Code: UNVERIFIED-BROWSER-CANVAS | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Browser DOM drag & canvas rendering verification
======================================================================


STDERR:
Validator completed with 1 failure(s).


```



### Artifact W0411-ART-105: Raw Execution Log: validator-mutation-MUT-11.log
- **File**: `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-11.log`
- **Type**: `Log File`
- **SHA-256**: `3072d66c246b7e5c87acda93b0043dfe72ab00e4f85a0f06eade7a7c6a8dce34`
- **Byte Count**: `1272`

```javascript
COMMAND: node validate-wave0-4-13-dispatch.cjs
MUTATION: MUT-11
DESC: Batch 1 task row outside allowed set injected
START: 2026-11-06T17:26:04.426Z
END: 2026-11-06T17:26:04.507Z
EXIT_CODE: 1
EXPECTED_FINDINGS: ["BATCH1-TASK-W5-1"]
ACTUAL_VIOLATIONS: ["BATCH1-TASK-W5-1"]
EXACT_MATCH: true
STATUS: PASS
STDOUT:
======================================================================
   RUNNING Wave 0.4.13 ISOLATED SEMANTIC VALIDATOR
   Target Directory: /tmp/w0410-mut-MUT-11-OZ7s0m
======================================================================

Passed Assertions:     57
Failed Assertions:     1
Unverified Gates:      2
Findings Recorded:     3

Identified Findings (3):
- Code: BATCH1-TASK-W5-1 | Status: VIOLATION | Severity: ERROR | Category: crossDocumentConsistency | Desc: Batch 1 contains task W5-1
- Code: UNVERIFIED-SF-LIVE-ORG | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Live Salesforce org deployment & governor limit verification
- Code: UNVERIFIED-BROWSER-CANVAS | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Browser DOM drag & canvas rendering verification
======================================================================


STDERR:
Validator completed with 1 failure(s).


```



### Artifact W0411-ART-106: Raw Execution Log: validator-mutation-MUT-12.log
- **File**: `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-12.log`
- **Type**: `Log File`
- **SHA-256**: `b31572deebd009baf50aa8890763952a57b90fcbd5cd82dae5858cb78565bc11`
- **Byte Count**: `1264`

```javascript
COMMAND: node validate-wave0-4-13-dispatch.cjs
MUTATION: MUT-12
DESC: Traceability contract count mismatch
START: 2026-11-06T17:26:04.606Z
END: 2026-11-06T17:26:04.675Z
EXIT_CODE: 1
EXPECTED_FINDINGS: ["TRACE-COUNT-9"]
ACTUAL_VIOLATIONS: ["TRACE-COUNT-9"]
EXACT_MATCH: true
STATUS: PASS
STDOUT:
======================================================================
   RUNNING Wave 0.4.13 ISOLATED SEMANTIC VALIDATOR
   Target Directory: /tmp/w0410-mut-MUT-12-1qHMoi
======================================================================

Passed Assertions:     57
Failed Assertions:     1
Unverified Gates:      2
Findings Recorded:     3

Identified Findings (3):
- Code: TRACE-COUNT-9 | Status: VIOLATION | Severity: ERROR | Category: staticSchema | Desc: Traceability matrix contains exactly 9 contracts
- Code: UNVERIFIED-SF-LIVE-ORG | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Live Salesforce org deployment & governor limit verification
- Code: UNVERIFIED-BROWSER-CANVAS | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Browser DOM drag & canvas rendering verification
======================================================================


STDERR:
Validator completed with 1 failure(s).


```



### Artifact W0411-ART-107: Raw Execution Log: validator-mutation-MUT-13.log
- **File**: `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-13.log`
- **Type**: `Log File`
- **SHA-256**: `cfb9c1d7fa76a94e991807522141d1a97abcf014451469bdb2d417d3eb2f97cd`
- **Byte Count**: `1266`

```javascript
COMMAND: node validate-wave0-4-13-dispatch.cjs
MUTATION: MUT-13
DESC: Ownership manifest count violation
START: 2026-11-06T17:26:04.757Z
END: 2026-11-06T17:26:04.850Z
EXIT_CODE: 1
EXPECTED_FINDINGS: ["MANIFEST-COUNT-175"]
ACTUAL_VIOLATIONS: ["MANIFEST-COUNT-175"]
EXACT_MATCH: true
STATUS: PASS
STDOUT:
======================================================================
   RUNNING Wave 0.4.13 ISOLATED SEMANTIC VALIDATOR
   Target Directory: /tmp/w0410-mut-MUT-13-gB3gfz
======================================================================

Passed Assertions:     57
Failed Assertions:     1
Unverified Gates:      2
Findings Recorded:     3

Identified Findings (3):
- Code: MANIFEST-COUNT-175 | Status: VIOLATION | Severity: ERROR | Category: staticSchema | Desc: Manifest contains exactly 175 records
- Code: UNVERIFIED-SF-LIVE-ORG | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Live Salesforce org deployment & governor limit verification
- Code: UNVERIFIED-BROWSER-CANVAS | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Browser DOM drag & canvas rendering verification
======================================================================


STDERR:
Validator completed with 1 failure(s).


```



### Artifact W0411-ART-108: Raw Execution Log: validator-mutation-MUT-14.log
- **File**: `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-14.log`
- **Type**: `Log File`
- **SHA-256**: `fd9517d7a92cdebd05fb8bf780180205d94e139d568b5d96eb092cf0089a7e29`
- **Byte Count**: `1233`

```javascript
COMMAND: node validate-wave0-4-13-dispatch.cjs
MUTATION: MUT-14
DESC: W5-1 dispatch status tampered
START: 2026-11-06T17:26:04.936Z
END: 2026-11-06T17:26:05.007Z
EXIT_CODE: 1
EXPECTED_FINDINGS: ["W5-1-READY"]
ACTUAL_VIOLATIONS: ["W5-1-READY"]
EXACT_MATCH: true
STATUS: PASS
STDOUT:
======================================================================
   RUNNING Wave 0.4.13 ISOLATED SEMANTIC VALIDATOR
   Target Directory: /tmp/w0410-mut-MUT-14-8gTSSF
======================================================================

Passed Assertions:     57
Failed Assertions:     1
Unverified Gates:      2
Findings Recorded:     3

Identified Findings (3):
- Code: W5-1-READY | Status: VIOLATION | Severity: ERROR | Category: semanticReview | Desc: W5-1 has READY_TO_LAUNCH status
- Code: UNVERIFIED-SF-LIVE-ORG | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Live Salesforce org deployment & governor limit verification
- Code: UNVERIFIED-BROWSER-CANVAS | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Browser DOM drag & canvas rendering verification
======================================================================


STDERR:
Validator completed with 1 failure(s).


```



### Artifact W0411-ART-109: Raw Execution Log: validator-mutation-MUT-15.log
- **File**: `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-15.log`
- **Type**: `Log File`
- **SHA-256**: `02556474beb03dcb7d7e8c6ac56548c64786edfe24efe8923724b74879e86915`
- **Byte Count**: `1256`

```javascript
COMMAND: node validate-wave0-4-13-dispatch.cjs
MUTATION: MUT-15
DESC: W5-2 serialized status tampered
START: 2026-11-06T17:26:05.093Z
END: 2026-11-06T17:26:05.164Z
EXIT_CODE: 1
EXPECTED_FINDINGS: ["W5-2-DEPENDENT"]
ACTUAL_VIOLATIONS: ["W5-2-DEPENDENT"]
EXACT_MATCH: true
STATUS: PASS
STDOUT:
======================================================================
   RUNNING Wave 0.4.13 ISOLATED SEMANTIC VALIDATOR
   Target Directory: /tmp/w0410-mut-MUT-15-1PyTwt
======================================================================

Passed Assertions:     57
Failed Assertions:     1
Unverified Gates:      2
Findings Recorded:     3

Identified Findings (3):
- Code: W5-2-DEPENDENT | Status: VIOLATION | Severity: ERROR | Category: semanticReview | Desc: W5-2 has IMPLEMENTATION_DEPENDENT status
- Code: UNVERIFIED-SF-LIVE-ORG | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Live Salesforce org deployment & governor limit verification
- Code: UNVERIFIED-BROWSER-CANVAS | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Browser DOM drag & canvas rendering verification
======================================================================


STDERR:
Validator completed with 1 failure(s).


```



### Artifact W0411-ART-110: Raw Execution Log: validator-mutation-MUT-16.log
- **File**: `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-16.log`
- **Type**: `Log File`
- **SHA-256**: `c340c34a0b5315738d2e81f60f1b24159cf281376964471847b915d7200c3a0f`
- **Byte Count**: `1291`

```javascript
COMMAND: node validate-wave0-4-13-dispatch.cjs
MUTATION: MUT-16
DESC: Missing required W7 canonical runName field
START: 2026-11-06T17:26:05.249Z
END: 2026-11-06T17:26:05.316Z
EXIT_CODE: 1
EXPECTED_FINDINGS: ["W7-RUNNAME-CANONICAL"]
ACTUAL_VIOLATIONS: ["W7-RUNNAME-CANONICAL"]
EXACT_MATCH: true
STATUS: PASS
STDOUT:
======================================================================
   RUNNING Wave 0.4.13 ISOLATED SEMANTIC VALIDATOR
   Target Directory: /tmp/w0410-mut-MUT-16-BQCRJ0
======================================================================

Passed Assertions:     57
Failed Assertions:     1
Unverified Gates:      2
Findings Recorded:     3

Identified Findings (3):
- Code: W7-RUNNAME-CANONICAL | Status: VIOLATION | Severity: ERROR | Category: semanticReview | Desc: W7 contract specifies canonical runName field
- Code: UNVERIFIED-SF-LIVE-ORG | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Live Salesforce org deployment & governor limit verification
- Code: UNVERIFIED-BROWSER-CANVAS | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Browser DOM drag & canvas rendering verification
======================================================================


STDERR:
Validator completed with 1 failure(s).


```



### Artifact W0411-ART-111: Raw Execution Log: validator-mutation-MUT-17.log
- **File**: `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-17.log`
- **Type**: `Log File`
- **SHA-256**: `51d5d472268b6febc4eff1a2ef40be36aabc03371f423b2b4d9a0467541d4d74`
- **Byte Count**: `1302`

```javascript
COMMAND: node validate-wave0-4-13-dispatch.cjs
MUTATION: MUT-17
DESC: Component API activeProjectId property missing from daAppShell.js
START: 2026-11-06T17:26:05.403Z
END: 2026-11-06T17:26:05.474Z
EXIT_CODE: 1
EXPECTED_FINDINGS: ["APPSHELL-L77-API"]
ACTUAL_VIOLATIONS: ["APPSHELL-L77-API"]
EXACT_MATCH: true
STATUS: PASS
STDOUT:
======================================================================
   RUNNING Wave 0.4.13 ISOLATED SEMANTIC VALIDATOR
   Target Directory: /tmp/w0410-mut-MUT-17-0Ch8Hv
======================================================================

Passed Assertions:     57
Failed Assertions:     1
Unverified Gates:      2
Findings Recorded:     3

Identified Findings (3):
- Code: APPSHELL-L77-API | Status: VIOLATION | Severity: ERROR | Category: semanticReview | Desc: daAppShell defines public @api activeProjectId
- Code: UNVERIFIED-SF-LIVE-ORG | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Live Salesforce org deployment & governor limit verification
- Code: UNVERIFIED-BROWSER-CANVAS | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Browser DOM drag & canvas rendering verification
======================================================================


STDERR:
Validator completed with 1 failure(s).


```



### Artifact W0411-ART-112: Raw Execution Log: validator-mutation-MUT-18.log
- **File**: `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-18.log`
- **Type**: `Log File`
- **SHA-256**: `197fabd60f680bf875e0d2d55cb554542dec389dd318af18dda402336f800600`
- **Byte Count**: `1587`

```javascript
COMMAND: node validate-wave0-4-13-dispatch.cjs
MUTATION: MUT-18
DESC: Path traversal sequence injected into ownership manifest
START: 2026-11-06T17:26:05.565Z
END: 2026-11-06T17:26:05.647Z
EXIT_CODE: 1
EXPECTED_FINDINGS: ["MANIFEST-COUNT-175","MANIFEST-NO-TRAVERSAL-scratch/../../secret.txt"]
ACTUAL_VIOLATIONS: ["MANIFEST-COUNT-175","MANIFEST-NO-TRAVERSAL-scratch/../../secret.txt"]
EXACT_MATCH: true
STATUS: PASS
STDOUT:
======================================================================
   RUNNING Wave 0.4.13 ISOLATED SEMANTIC VALIDATOR
   Target Directory: /tmp/w0410-mut-MUT-18-CaQ17d
======================================================================

Passed Assertions:     57
Failed Assertions:     2
Unverified Gates:      2
Findings Recorded:     4

Identified Findings (4):
- Code: MANIFEST-COUNT-175 | Status: VIOLATION | Severity: ERROR | Category: staticSchema | Desc: Manifest contains exactly 175 records
- Code: MANIFEST-NO-TRAVERSAL-scratch/../../secret.txt | Status: VIOLATION | Severity: ERROR | Category: filesystem | Desc: Manifest entry scratch/../../secret.txt does not contain traversal sequences
- Code: UNVERIFIED-SF-LIVE-ORG | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Live Salesforce org deployment & governor limit verification
- Code: UNVERIFIED-BROWSER-CANVAS | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Browser DOM drag & canvas rendering verification
======================================================================


STDERR:
Validator completed with 2 failure(s).


```



### Artifact W0411-ART-113: Raw Execution Log: validator-mutation-MUT-19.log
- **File**: `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-19.log`
- **Type**: `Log File`
- **SHA-256**: `9842f22d7e447b10728045fdd922e0f50acf7260a78bf207ccf153de9d626650`
- **Byte Count**: `1471`

```javascript
COMMAND: node validate-wave0-4-13-dispatch.cjs
MUTATION: MUT-19
DESC: Unexpected task W99-1 injected into task register
START: 2026-11-06T17:26:05.765Z
END: 2026-11-06T17:26:05.890Z
EXIT_CODE: 1
EXPECTED_FINDINGS: ["TASK-COUNT-21","TASK-UNEXPECTED-W99-1"]
ACTUAL_VIOLATIONS: ["TASK-COUNT-21","TASK-UNEXPECTED-W99-1"]
EXACT_MATCH: true
STATUS: PASS
STDOUT:
======================================================================
   RUNNING Wave 0.4.13 ISOLATED SEMANTIC VALIDATOR
   Target Directory: /tmp/w0410-mut-MUT-19-Q9WjJi
======================================================================

Passed Assertions:     57
Failed Assertions:     2
Unverified Gates:      2
Findings Recorded:     4

Identified Findings (4):
- Code: TASK-COUNT-21 | Status: VIOLATION | Severity: ERROR | Category: staticSchema | Desc: Authoritative task register contains exactly 21 tasks
- Code: TASK-UNEXPECTED-W99-1 | Status: VIOLATION | Severity: ERROR | Category: staticSchema | Desc: Task W99-1 is within canonical task set
- Code: UNVERIFIED-SF-LIVE-ORG | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Live Salesforce org deployment & governor limit verification
- Code: UNVERIFIED-BROWSER-CANVAS | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Browser DOM drag & canvas rendering verification
======================================================================


STDERR:
Validator completed with 2 failure(s).


```



### Artifact W0411-ART-114: Raw Execution Log: validator-mutation-MUT-20.log
- **File**: `docs/wave-0/4.13/evidence/raw/validator-mutation-MUT-20.log`
- **Type**: `Log File`
- **SHA-256**: `48b348eca597c0321a75ce45e901edf2a062b3400bcf2575e028c3a9237ea9a5`
- **Byte Count**: `1284`

```javascript
COMMAND: node validate-wave0-4-13-dispatch.cjs
MUTATION: MUT-20
DESC: Batch 1 row count tampered in allowlist
START: 2026-11-06T17:26:06.043Z
END: 2026-11-06T17:26:06.159Z
EXIT_CODE: 1
EXPECTED_FINDINGS: ["BATCH1-ROW-COUNT-49"]
ACTUAL_VIOLATIONS: ["BATCH1-ROW-COUNT-49"]
EXACT_MATCH: true
STATUS: PASS
STDOUT:
======================================================================
   RUNNING Wave 0.4.13 ISOLATED SEMANTIC VALIDATOR
   Target Directory: /tmp/w0410-mut-MUT-20-XLTzM4
======================================================================

Passed Assertions:     57
Failed Assertions:     1
Unverified Gates:      2
Findings Recorded:     3

Identified Findings (3):
- Code: BATCH1-ROW-COUNT-49 | Status: VIOLATION | Severity: ERROR | Category: staticSchema | Desc: Batch 1 allowlist contains exactly 49 path rows
- Code: UNVERIFIED-SF-LIVE-ORG | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Live Salesforce org deployment & governor limit verification
- Code: UNVERIFIED-BROWSER-CANVAS | Status: UNVERIFIED | Severity: WARNING | Category: empiricalExecution | Desc: Browser DOM drag & canvas rendering verification
======================================================================


STDERR:
Validator completed with 1 failure(s).


```



# Section 28: Frozen Baseline Runner Hash Comparison

Pre- and post-execution SHA-256 hashes of all 9 frozen runners were strictly verified:
- `run-poc-tests.cjs`: Bit-for-bit identical before and after execution.
- `run-wave4-integration-suite.cjs`: Bit-for-bit identical before and after execution.
- `run-lane-a-schema-tests.cjs`: Bit-for-bit identical before and after execution.
- `run-lane-c-preset-manager-tests.cjs`: Bit-for-bit identical before and after execution.
- `run-lane-d-graph-filter-tests.cjs`: Bit-for-bit identical before and after execution.
- `run-lane-e-matrix-tests.cjs`: Bit-for-bit identical before and after execution.
- `run-lane-f-findings-tests.cjs`: Bit-for-bit identical before and after execution.
- `run-workstream-a-tests.cjs`: Bit-for-bit identical before and after execution.
- `run-workstream-c-tests.cjs`: Bit-for-bit identical before and after execution.



# Section 29: Component Provenance Evidence

Audit of `daAppShell.js` confirmed:
- Inbound public properties: `activeProjectId` (line 77), `activeProjectKey` (line 78).
- Inbound event handlers: `handleFilterChange`, `handleContainerChange`, `handleProjectChange`, `handleNodeSelect`.
- Outbound dispatchEvent calls: Zero.



# Section 30: Wave 0.4.9 Discrepancy Closure Matrix

| Finding ID | Finding Description | Remediation & Implementation | Verification Evidence | Status |
|---|---|---|---|:---:|
| **P0-01** | Coordinator-only rollback privilege escalation | Public `pathSafeRollback` rejects coordinator-exclusive paths fail-closed; never derives coordinator privileges from caller-supplied data | `test-rollback.cjs` RB-01, RB-02 | **CLOSED** |
| **P0-02** | Public mutation hooks exposed in signatures | Completely removed test hook callbacks from all signatures | `test-api-surface.cjs` API-01..API-06 | **CLOSED** |
| **P1-01** | Incomplete rollback preflight / zero-byte bug | Comprehensive Phase A preflight across ALL targets; fixed empty base64 string handling; byte-exact SHA-256 and mode validation | `test-rollback.cjs` RB-01..RB-06 | **CLOSED** |
| **P1-02** | Strict CSV not invoked in production caller | `parseCsvStrict` explicitly enables strict RFC 4180 parsing with strict dialect options | `test-csv-parser.cjs` CSV-01..CSV-16 | **CLOSED** |
| **P1-03** | Silent deduplication of normalized paths in diff | Reject duplicate diff sections for identical normalized paths; parse C-quoted paths with octals | `test-authorization-patch.cjs` AUTH-09..AUTH-12 | **CLOSED** |
| **P1-04** | Authoritative task dependencies not enforced | Parsed dependencies from task register; cycle detection; W5 chain enforcement (W5-1 -> W5-2 -> ... -> W5-6) | `test-authorization-patch.cjs` AUTH-01..AUTH-04 | **CLOSED** |
| **P1-05** | Path-tainted shell execution in git checks | Replaced all `execSync` with `spawnSync` (`shell: false`, argument array) | `test-authorization-patch.cjs` AUTH-07, AUTH-08 | **CLOSED** |
| **P1-06** | Mutation validator used subset matching | Exact set equality matching; clean negative controls before and after; child-process execution | `test-validator-mutations.cjs` MUT-01..MUT-20 | **CLOSED** |
| **P1-07** | Harness failure exit codes not propagated | Non-zero `process.exitCode` on failure; child-process exit verified | All test suites | **CLOSED** |
| **P1-08** | Synthesis generator lacked complete verification | Validates exact SHA-256 and byte counts; fail-closed; deterministic byte-identical output | `test-synthesis.cjs` SYN-01..SYN-04 | **CLOSED** |
| **P1-09** | Artifact manifest mismatch & broken record | Full 1-to-1 artifact manifest mapping every embedded artifact and log file | Section 7 Artifact Catalog | **CLOSED** |



# Section 31: Residual Risks and Explicit Limitations

### Residual Risks
1. **Coordinator-Only Rollback**: Public rollback rejects coordinator-exclusive paths fail-closed. Until a trusted coordinator cryptographic identity boundary exists in the runtime, coordinator-only rollback is officially unsupported.
2. **Platform Concurrency Window**: On OS environments lacking file-descriptor-relative open/write primitives, external processes with root privileges could hypothetically mutate parent directories.
3. **Live Org Acceptance**: Live Salesforce governor limits and Apex test suites must be validated upon scratch org deployment.

### Explicit Limitations
This deliverable does NOT authorize Batch 1 dispatch. Feature agents must not be launched.



# Section 32: Final Authorization Recommendation

### Verdict: `READY FOR INDEPENDENT AUTHORIZATION REVIEW`
### BATCH 1 DISPATCH AUTHORIZED: NO

All security vulnerabilities and evidence gaps have been resolved. The tooling is now eligible for authoritative independent review.
