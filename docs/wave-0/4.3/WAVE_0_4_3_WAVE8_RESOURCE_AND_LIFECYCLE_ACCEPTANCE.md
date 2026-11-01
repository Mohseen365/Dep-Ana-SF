# WAVE 0.4.3 WAVE 8 RESOURCE AND LIFECYCLE ACCEPTANCE

## 1. Reclassification of Resource Claims

In Wave 0.4.2, unsupported numerical claims were made regarding snapshot memory consumption (claiming 30–80 MB per parsed snapshot and 150–200 MB for dual snapshots without measurement).

Wave 0.4.3 reclassifies all memory and resource dimensions under rigorous technical categories:

| Resource Dimension | Stated Value | Category | Technical Basis & Boundary |
|:---|:---|:---:|:---|
| **Max Payload Size Guard** | 10,485,760 chars (~10 MB) | **MEASURED / CONSTANT** | Constant `MAX_TOTAL_PAYLOAD_SIZE` defined in `daGraphPayloadLoader.js`. Characters $\ne$ Heap limit. |
| **Combined String Ceiling**| 20,971,520 chars (~20 MB) | **PROPOSED LIMIT** | Proposed architectural threshold for dual-snapshot compare. Not enforced in code. |
| **JavaScript Flat String Heap** | ~2 bytes per UTF-16 code unit | **DERIVED** | V8 internal representation: 10M chars requires ~20.97 MB flat buffer. |
| **Parsed Graph Object Tree**| 3x–6x raw string size | **UNVERIFIED (PLATFORM-DEPENDENT)** | Highly dependent on node/edge density, Cytoscape graph wrappers, and browser engine. |
| **Apex Heap Governor Limit**| 6 MB sync / 12 MB async | **PLATFORM SPECIFICATION** | Enforced by Salesforce multitenant runtime during chunk query assembly. |
| **Browser DOM / Tab Heap**| Variable | **UNVERIFIED** | Dependent on client machine hardware and browser tab isolation. |

---

## 2. Asynchronous Lifecycle Acceptance Matrix (19 Scenarios)

| Scenario ID | Scenario Name | Expected UI State | Expected Request State | Generation Token Behavior | Data Disposal / Retention |
|:---:|:---|:---|:---|:---|:---|
| **LFC-01** | Both snapshot requests succeed | Spinner hidden; diff rendered | All chunks received; status COMPLETE | Generation token active; matches response | Both graphs stored; chunks garbage collected |
| **LFC-02** | First request fails | Error banner displayed; diff aborted | First aborted/errored; second discarded | Token active; flags error state | Partial snapshot nullified; memory reclaimed |
| **LFC-03** | Second request fails | Error banner displayed; diff aborted | First completed; second failed | Token active; flags error state | First snapshot reference nullified immediately |
| **LFC-04** | One request times out | Timeout banner displayed | AbortController signal fired | Token incremented | In-flight buffers discarded |
| **LFC-05** | Malformed chunk metadata | Error banner ("Invalid chunk index")| Processing aborted | Token unchanged; error handled | Corrupted chunk discarded |
| **LFC-06** | Incomplete chunk sequence | Error banner ("Missing chunks") | Stream closed prematurely | Token unchanged; error handled | Partial buffers freed |
| **LFC-07** | Chunk boundary splits surrogate pair | Text decoder reconstructs pair | Stream continues cleanly | Token unchanged | UTF-8 decoder maintains multi-byte state |
| **LFC-08** | Project changed during load | New project loading spinner | Old request ignored via token | **Token incremented**; old response ignored | Old buffers discarded immediately |
| **LFC-09** | Selected run changed during load | New run loading spinner | Old request ignored via token | **Token incremented**; old response ignored | Old buffers discarded immediately |
| **LFC-10** | Newer request supersedes older | New run data rendered | Older request discarded on arrival | **Token incremented**; old token invalidated | Superseded data rejected and freed |
| **LFC-11** | Stale success arrives | UI remains unchanged (shows current) | Stale payload dropped silently | Stale token does not match active token | Stale payload dropped to garbage collector |
| **LFC-12** | Stale error arrives | UI remains unchanged (no false error)| Stale error dropped silently | Stale token does not match active token | Stale error ignored |
| **LFC-13** | Component disconnects during load | DOM removed cleanly | Request detached | Generation token invalidated | All component references severed |
| **LFC-14** | Component reconnects | Fresh initial load | New requests dispatched | Fresh generation token initialized | Fresh state created |
| **LFC-15** | Partial `Promise.all` failure | Unified error message shown | Failing promise triggers rejection | Token unchanged; error dispatched | Both snapshot promises cleaned up |
| **LFC-16** | Loading state cleanup | Spinner hidden on settle | Settled (success or error) | Token active | Loading flags reset in `finally` block |
| **LFC-17** | Error state cleanup | Error banner cleared on retry | Reset on new invocation | Token incremented on retry | Previous error state purged |
| **LFC-18** | Reference cleanup on modal close | Modal hidden; view destroyed | All active diff calculations halted | Token incremented | Graph models, DOM references set to `null` |
| **LFC-19** | Oversized payload rejection | Fast rejection banner ("Size limit") | Rejected prior to chunk assembly | Token unchanged | Immediate rejection; zero chunks parsed |

---

## 3. Physical Cancellation vs. Request Invalidation Distinction

- **Client Invalidation (Implemented via Token)**: The LWC component maintains an internal `requestGenerationToken` integer. Each user action increments this counter. When an asynchronous Apex call resolves, the callback compares its captured token with the component's current token. If mismatched, the result is dropped.
- **Physical Apex Cancellation (Not Supported)**: Apex `@AuraEnabled` server transactions cannot be physically aborted from the client once dispatched over the wire. They execute until completion or timeout on the Salesforce app server.
