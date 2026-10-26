# Wave 6 Cross-Report Consistency Audit

## 1. Scope
This audit reconciles all data metrics, fixture sizes, chunk counts, test totals, and claims across Wave 3, Wave 4, Wave 5, and Wave 6 reports.

## 2. Reconciliation Matrix

| Parameter / Claim | Wave 3/4 Report | Wave 5 Report | Wave 6 Audit Truth | Status / Resolution |
|---|---|---|---|---|
| **PBIM Character Size** | 4,253,569 | 4,253,569 | 4,253,569 | CONSISTENT |
| **PBIM Chunk Count (100KB)** | 43 | 43 | 43 | CONSISTENT |
| **PBIM Node / Edge Count** | 528 / 2,063 | 528 / 2,063 | 528 / 2,063 | CONSISTENT |
| **BQC Character Size** | 1,332,083 | 1,332,083 | 1,332,083 | CONSISTENT |
| **BQC Chunk Count (100KB)** | 14 | 14 | 14 | CONSISTENT |
| **BQC Node / Edge Count** | 274 / 603 | 274 / 603 | 274 / 603 | CONSISTENT |
| **CST Character Size** | 1,860,770 | 1,860,770 | 1,860,770 | CONSISTENT |
| **CST Chunk Count (100KB)** | 19 | 19 | 19 | CONSISTENT |
| **CST Node / Edge Count** | 240 / 1,024 | 240 / 1,024 | 240 / 1,024 | CONSISTENT |
| **POC Suite Test Count** | 16 (Wave 4) | 21 (Wave 5) | 21 (Wave 6) | CONSISTENT (5 tests added in W5) |
| **Root CLI Test Count** | 34 | 34 | 34 | CONSISTENT |
| **Focused Vitest Pass/Fail** | 31 / 4 | 31 / 4 | 31 / 4 | CONSISTENT |

## 3. Critical Report Clarifications & Discrepancies Resolved
1. **Apex Executable Testing vs JS Simulation:**
   - *Issue:* Previous reports described Category 2 and Category 5 tests as verifying Apex controller behavior.
   - *Resolution:* Wave 6 explicitly clarifies that JS tests simulate Apex boundary algorithms. Real Apex execution (`DAGraphControllerTest`, `DAGraphSecurityTest`) is authored in `.cls` files and deferred to the final Salesforce stage.
2. **Metadata Field Length & Chunk Size Cap:**
   - *Issue:* Verify `maxChunkSize` in Apex service matches metadata length.
   - *Resolution:* Confirmed `Payload_Data__c.field-meta.xml` defines `<length>131072</length>` and `DAGraphChunkService.cls` caps requested sizes at `131072`.
