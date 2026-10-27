# Wave 1R Unicode Chunking and Schema Validation Report

## 1. Unicode-Safe Chunking Specification & Remediation

### Defect Description
JavaScript `string.substring()` and Apex `String.substring()` operate on 16-bit UTF-16 code units. Supplementary Unicode characters (such as emojis `🚀`, `🔥`, `⚡` or high code point CJK ideographs above `U+FFFF`) require two UTF-16 code units (a high surrogate `0xD800..0xDBFF` followed by a low surrogate `0xDC00..0xDFFF`).
When a chunk boundary lands between a high and low surrogate pair, naive slicing places the high surrogate at the end of chunk N and the low surrogate at the beginning of chunk N+1.
When individual chunks are serialized, stored in Salesforce `LongTextArea` fields, or transmitted across network boundaries, unpaired surrogates are converted to Unicode replacement characters (`U+FFFD`), corrupting the payload permanently.

### Implemented Contract
In both JavaScript (`daGraphPayloadLoader.js`) and Apex (`DAGraphChunkService.cls`):
1. `chunkPayload(rawJson, maxChunkSize)` determines the candidate chunk boundary `end = Math.min(offset + maxChunkSize, length)`.
2. If `end < length`, the code unit at `end - 1` is inspected:
   * In JS: `rawJson.charCodeAt(end - 1)`
   * In Apex: `rawJson.charAt(end - 1)`
3. If the code unit is a high surrogate (`>= 0xD800` and `<= 0xDBFF` / `>= 55296` and `<= 56319`), `end` is decremented by 1 (`end--`).
4. The high surrogate is deferred to the start of the next chunk where it remains adjacent to its low surrogate.
5. `reassembleChunks()` concatenates the safe chunks back into the exact original UTF-16 string sequence.

### Verification Results
* **Straddling Surrogate Pair:** Tested emoji `🚀` straddled across index 26 for chunk limit 27. Chunk 0 length was adjusted to 26, ending before `\uD83D`. Chunk 1 started with `🚀`. Reassembled string matched original string 100% and parsed cleanly as JSON.
* **Pre-Boundary Surrogate Pair:** Tested emoji `🔥` at index 22-23 (before boundary 25). Fits in chunk 0.
* **Post-Boundary Surrogate Pair:** Tested emoji `⚡` after boundary (index 27). Starts chunk 1.
* **Fixture Reconstruction:** Benchmark fixtures PBIM (4,253,569 chars), BQC (1,332,083 chars), and CST (1,860,770 chars) reassembled and parsed with 0 errors.

---

## 2. Graph Schema Invariant Validation

### Defect Description
`validatePayloadIntegrity()` previously validated `JSON.parse(rawJson)` returning `typeof parsed === 'object'`, allowing non-graph payloads such as `{ "invalid": true }` or `[1, 2, 3]` to pass integrity validation.

### Implemented Schema Contract
`validatePayloadIntegrity(rawJson)` enforces the following structural rules:
1. `rawJson` must be a non-empty string <= 10 MB (`10,485,760` chars).
2. `JSON.parse(rawJson)` must evaluate to a non-null object (arrays, primitives, and null are rejected).
3. For standard graph envelopes:
   * `parsed.nodes` must be an Array.
   * `parsed.edges` must be undefined or an Array.
   * Every record in `parsed.nodes` must be an object with a non-empty string `id`.
   * Every record in `parsed.edges` must be an object with string `source` (or `sourceFeatureId`) and `target` (or `targetFeatureId`).
   * **Endpoint Invariant:** Every `source` and `target` specified in `edges` must exist in the `nodes` set.
4. Also accepts recognized layout payload variants (`elements`, `stages`/`flows`, `focalNode`/`rings`).

### Verification Results
* `{"invalid": true}` -> `FALSE` (rejected)
* `[1, 2, 3]` -> `FALSE` (rejected)
* `{"nodes": "invalid"}` -> `FALSE` (rejected)
* `{"nodes":[{"id":"1"}],"edges":[{"source":"1","target":"2"}]}` -> `FALSE` (dangling edge rejected)
* `{"nodes":[{"id":"1"}],"edges":[]}` -> `TRUE` (accepted)
* Real PBIM, BQC, CST benchmark fixtures -> `TRUE` (all 3 fixtures accepted, 0 missing endpoints found)
