# Wave 5 LWC Integration and Lifecycle Audit Report

## 1. Active LWC Component Architecture
- **`daGraphPayloadLoader`:** Exported pure utility functions:
  - `reassembleChunks(chunks)`
  - `validatePayloadIntegrity(rawJson)`
  - `verifyChunkSequence(chunks, expectedStartIndex)` (Hardened in Wave 5 with null-element guard)
- **`daGraphViewer`:** Lightning Web Component controller:
  - `renderedCallback()` loads Cytoscape static resource.
  - `fetchGraphData()` performs metadata-first loading followed by paginated `getGraphChunks` calls.
  - `currentRequestId` counter protects against stale responses upon rapid project switching.
  - `renderGraph(graphData)` destroys existing Cytoscape instances before creating new ones.
  - `disconnectedCallback()` cleans up Cytoscape instances on unmount.

## 2. Unreferenced Legacy LWC Audit
- **`lwc/graphViewer/`:** Contains prototype implementation loading full unchunked graph payload via legacy `GraphDataController.getGraphData`.
- **Status:** Unreferenced in active application and page metadata. Preserved as historical prototype artifact without affecting production code or bundle size.

## 3. UI Invariants & Principles
- **Selection vs Navigation Invariant:** Enforced across LWC event handling. Node click/selection updates visual inspection pane without executing project navigation.
- **Loading & Error UI States:** Explicit spinners and SLDS alert messages rendered during pagination and error states.
