# WAVE 0.4.3 W7 PROJECT RESOLUTION CONTRACT

## 1. Definitive Architecture & Precedence

In Wave 0.4.2, two-step project resolution was ratified to eliminate multi-project run leakage:
1. **Step 1**: Attempt resolution by Salesforce record `Id`.
2. **Step 2**: Only if Step 1 produces zero matches or an invalid ID syntax, attempt resolution by unique `Project_Key__c`.
3. **Execution**: The subsequent query for `DA_Analysis_Run__c` executes strictly using the single resolved Salesforce `DA_Project__c.Id`. Multi-project OR conditions (`WHERE Project__c = :id OR Project__r.Project_Key__c = :key`) are strictly prohibited.

---

## 2. Salesforce ID Normalization and Access Semantics

### 2.1 15-Character vs. 18-Character IDs
- **Salesforce Standard**: 15-character IDs are case-sensitive. 18-character IDs append a 3-character case-insensitive checksum suffix.
- **Apex Parsing (`Id.valueOf(input)`)**:
  - Valid 15-character or 18-character base-62 strings parse successfully into an `Id` primitive.
  - Strings that fail syntactic validation (wrong length, non-base-62 characters) throw a `StringException` ("Invalid id: ...").
- **Error Handling & Fallback Policy**:
  - If `Id.valueOf()` throws `StringException`, the input is deemed non-ID-shaped. The controller safely catches this exception and falls through directly to Step 2 (External Key lookup).
  - If the input is syntactically a valid ID but no record is found matching that ID in `DA_Project__c`, the controller proceeds to Step 2 (External Key lookup).

### 2.2 Access Control and Project Visibility Boundaries
The controller distinguishes internal states while preventing project enumeration / leakage to unauthorized users:

| Scenario | Internal Condition | Outward User Behavior | Security / FLS Policy |
|:---|:---|:---|:---|
| **Non-Existent Project** | Neither Id nor Project_Key__c exists | Returns empty list `[]` | Clean empty response |
| **Inaccessible Project** | Record exists in database but current user lacks sharing/read access | Returns empty list `[]` | Fails closed; does not disclose record existence |
| **Ambiguous Key** | Multiple projects match `Project_Key__c` | Throws `AuraHandledException` ("Ambiguous project key") | Requires administrator remediation |
| **Object / Field Security** | User lacks read access on `DA_Project__c` or `DA_Analysis_Run__c` | Throws `AuraHandledException` ("Insufficient permissions") | Strict user-mode enforcement (`WITH USER_MODE`) |

---

## 3. Query Contract and DTO Specification

### 3.1 DTO Field Invariants
The DTO field returned by `DAGraphController.getAnalysisRuns` must retain the canonical name:
```apex
public class AnalysisRunDTO {
    @AuraEnabled public Id runId { get; set; }
    @AuraEnabled public String runName { get; set; } // Canonical name mapped to DA_Analysis_Run__c.Name
    @AuraEnabled public Datetime createdDate { get; set; }
    @AuraEnabled public Id projectId { get; set; }
}
```

### 3.2 Offline vs. Salesforce Platform Verification Boundary

| Assertion | Verification Status in Wave 0.4.3 | Required Future Verification Gate |
|:---|:---:|:---|
| **Strict Two-Step Logical Separation** | **VERIFIED (Code Contract)** | Offline unit test in `run-w7-p1-tests.cjs` |
| **No Cross-Project Run Leakage** | **VERIFIED (Static Analysis)** | Offline mock SOQL test in Wave 7 |
| **`Id.valueOf()` Exception Catching** | **VERIFIED (Offline Specification)** | Salesforce Apex unit test in scratch org |
| **`WITH USER_MODE` Sharing Enforcement** | **UNVERIFIED (Offline Sandbox)** | Live Salesforce scratch org test with standard user persona |
| **SOQL Query Row Limits and Sorting** | **VERIFIED (Static Analysis)** | SOQL syntax inspection (`ORDER BY CreatedDate DESC LIMIT :maxRuns`) |
