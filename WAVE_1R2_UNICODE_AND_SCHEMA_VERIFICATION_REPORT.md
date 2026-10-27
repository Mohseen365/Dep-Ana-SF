# Wave 1R.2 Unicode & Schema Verification Report

## Executive Summary
This report presents independent verification evidence for UTF-16 Unicode surrogate-pair safety during chunking and graph schema validation contracts.

## 1. Unicode-Safe Chunking Verification
- **Surrogate Pair Protection:** Both JavaScript (`daGraphPayloadLoader.js`) and Apex (`DAGraphChunkService.cls`) inspect boundary character code units. If a boundary falls between a High Surrogate (`0xD800`–`0xDBFF`) and Low Surrogate (`0xDC00`–`0xDFFF`), the chunk boundary is adjusted backward by 1 character unit (`endIdx--`).
- **Tested Scenarios:**
  1. Emoji (`🚀`, `🔥`, `⚡`) and CJK characters (`日本語`) positioned straddling, immediately before, and immediately after chunk boundaries.
  2. Exact character reassembly matching original input strings byte-for-byte.
  3. No empty chunk creation or infinite loop conditions.

## 2. Graph Schema Validation Verification
- **`validatePayloadIntegrity(rawJson)` Contract:**
  1. Rejects null, non-string, empty, or oversized strings (>10 MB).
  2. Rejects primitives, arrays as root envelopes, and malformed JSON.
  3. Validates canonical graph objects (`nodes` array with non-empty string `id`, `edges` array with non-empty string `source` and `target`).
  4. Enforces endpoint existence: edges referencing non-existent node IDs are rejected.
  5. Supports Cytoscape (`elements`), Sankey (`stages` & `flows`), and Constellation (`focalNode` & `rings`) payload structures.

## 3. Test Evidence Summary
- Real benchmark fixtures verified in `scratch/salesforce-poc/tests/run-poc-tests.cjs`:
  - **PBIM:** 4,253,569 chars, 43 chunks, 528 nodes, 2063 edges — Passed.
  - **BQC:** 1,332,083 chars, 14 chunks, 274 nodes, 603 edges — Passed.
  - **CST:** 1,860,770 chars, 19 chunks, 240 nodes, 1024 edges — Passed.
