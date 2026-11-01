# Wave 0: Security, Performance, and Data Integrity Gates

**Status:** APPROVED MANDATORY SPECIFICATION
**Target Architecture:** Salesforce LWC, Apex with Sharing & Platform Limits

---

## 1. Salesforce Platform Security Gates

### 1.1 Apex User-Mode Execution & Sharing
- **Rule SEC-01 (Mandatory User Mode):** All SOQL queries and DML operations across `DAGraphController` and future controllers must specify `WITH USER_MODE` or `as user` (Spring '25 standard).
- **Rule SEC-02 (Sharing Enforcement):** All Apex classes must be explicitly declared `with sharing`. Under no circumstances may `without sharing` or `inherited sharing` be used without independent security approval.
- **Rule SEC-03 (CRUD/FLS Validation):** Fields queried from `DA_Project__c`, `DA_Analysis_Run__c`, `DA_Graph_Chunk__c`, and `DA_User_Preference__c` must adhere to user permissions. SOQL in user mode automatically enforces FLS.
- **Rule SEC-04 (Cross-Tenant / Cross-Project Isolation):** Every Apex endpoint accepting a `projectId` must strictly validate that child records (`DA_Analysis_Run__c`, `DA_User_Preference__c`, `DA_Annotation__c`) belong to the requested project.

### 1.2 Lightning Web Security (LWS) & Client Isolation
- **Rule SEC-05 (DOM Isolation):** Components must not attempt to access parent DOM or peer components via `document.querySelector` or traversing `parentElement`. All interaction must use custom DOM events.
- **Rule SEC-06 (Sanitized Markup):** No dynamic unescaped HTML injection (`innerHTML` or `dangerouslySetInnerHTML`). Dynamic text must be rendered through standard LWC templates or sanitized text nodes.

---

## 2. Data Integrity & Payload Gates

### 2.1 Payload Chunking & Surrogate-Pair Safety
- **Rule DATA-01 (Hard Boundary Capping):** Maximum chunk size for `Payload_Data__c` is strictly 131,072 characters.
- **Rule DATA-02 (Surrogate-Pair Integrity):** When chunking JSON strings containing emoji or multibyte Unicode characters, chunk boundaries must never bisect a high/low surrogate pair (0xD800 to 0xDFFF).
- **Rule DATA-03 (Reassembly Verification):** Payloads reassembled via `daGraphPayloadLoader` must pass contiguous zero-based sequence validation (`verifyChunkSequence`) before JSON parsing.

### 2.2 Payload Immutability
- **Rule DATA-04 (Shared Payload Protection):** The graph payload object supplied by `daAppShell` is frozen by architectural contract. Views requiring layout modifications, filtering, or simulation must operate on defensive copies.

---

## 3. Performance & Resource Governance Gates

### 3.1 Cytoscape Canvas & Lifecycle Governance
- **Rule PERF-01 (Strict Single-Instance Cytoscape):** At any given moment, only one Cytoscape instance may be active in the viewport. Secondary views (Wave 8 Compare, Wave 6 Radar/Treemap) must not initialize parallel Cytoscape engines.
- **Rule PERF-02 (Deterministic Teardown):** On `disconnectedCallback()` or when switching to an analytical HTML view, Cytoscape instances must execute `cy.destroy()` and dereference event listeners.

### 3.2 Memory-Safe Graph Diffing (Wave 8)
- **Rule PERF-03 (Map-Based Entity Diff):** Graph diffing between Run A and Run B must be executed using hash maps indexed by `node.id` and `edge.id`, yielding $O(N + E)$ computational complexity and avoiding quadratic array scans.

### 3.3 Debounced Persistence
- **Rule PERF-04 (Save Debouncing):** Viewport pan/zoom changes and manual drag positions must be debounced by at least 500ms before persisting to `DA_User_Preference__c` to prevent governor limit exhaustion.
