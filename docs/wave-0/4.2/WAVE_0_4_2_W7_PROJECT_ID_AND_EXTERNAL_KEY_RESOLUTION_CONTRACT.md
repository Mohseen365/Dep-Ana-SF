# Wave 0.4.2: Workstream B — W7 Project ID and External Key Resolution Contract

## 1. Context and Problem Statement

In Wave 0.4.1 (`WAVE_0_4_1_WAVE7_ID_KEY_AND_DTO_CONTRACT_RECONCILIATION.md`), Section 2.2 proposed the following query strategy for `DAGraphController.getAnalysisRuns(String projectId, Integer maxRuns)`:
```apex
// If syntactically an ID:
WHERE DA_Project__c = :projectId OR DA_Project__r.Project_Key__c = :projectId
```
This query is architecturally unsafe and introduces an ambiguous multi-project leakage defect:
- If `projectId` represents a valid Salesforce Record ID for **Project A**, but **Project B** happens to have an external `Project_Key__c` equal to that exact string (or vice versa), the `OR` branch will match runs belonging to **both Project A and Project B**.
- An API consumer requesting runs for Project A would receive an interleaved or polluted list containing Project B's analysis runs, violating tenant data isolation and project boundary invariants.

This contract provides the definitive, implementation-ready resolution contract.

---

## 2. Definitive Two-Step Resolution Contract

### 2.1 Resolution Principle
The input parameter `projectId` must be resolved to **exactly one unique `DA_Project__c` record ID** before any analysis runs are queried.
Under no circumstances may a single SOQL query evaluate `DA_Project__c = :projectId OR DA_Project__r.Project_Key__c = :projectId`.

### 2.2 Two-Step Disambiguation Algorithm

```
                  ┌──────────────────────────────┐
                  │ Input parameter: `projectId` │
                  └──────────────┬───────────────┘
                                 │
                  ┌──────────────▼───────────────┐
                  │ 1. Validate Input Not Blank? │─── No ───► Return Empty List []
                  └──────────────┬───────────────┘
                                 │ Yes
                  ┌──────────────▼───────────────┐
                  │ 2. Syntactic 15/18 ID Shape? │
                  └──────┬───────────────┬───────┘
                         │ Yes           │ No
                         ▼               │
       ┌───────────────────────────────┐ │
       │ Step A: Query Project by Id   │ │
       │ SELECT Id FROM DA_Project__c  │ │
       │ WHERE Id = :projectId         │ │
       │ WITH USER_MODE LIMIT 1        │ │
       └──────────────┬────────────────┘ │
                      │                  │
               Found Record?             │
              ┌───────┴───────┐          │
              │ Yes           │ No       │
              ▼               ▼          ▼
    ┌──────────────────┐ ┌───────────────────────────────────────────────┐
    │ Authoritative    │ │ Step B: Query Project by External Key         │
    │ Project ID       │ │ SELECT Id FROM DA_Project__c                  │
    │ = project.Id     │ │ WHERE Project_Key__c = :projectId             │
    │ (Do NOT query key│ │ WITH USER_MODE LIMIT 2                        │
    └─────────┬────────┘ └──────────────────────┬────────────────────────┘
              │                                 │
              │                         Count of Results?
              │                  ┌──────────────┼──────────────┐
              │                  │ Exactly 1    │ 0            │ > 1 (Collision)
              │                  ▼              ▼              ▼
              │          ┌──────────────┐ ┌──────────┐ ┌─────────────────────────┐
              │          │ Authoritative│ │ Not Found│ │ Ambiguity Exception:    │
              │          │ Project ID   │ │ Return []│ │ "Multiple projects with │
              │          │ = project.Id │ └──────────┘ │  key, contact admin"    │
              │          └──────┬───────┘              └─────────────────────────┘
              │                 │
              └────────┬────────┘
                       ▼
       ┌────────────────────────────────────────────────┐
       │ Step C: Query Analysis Runs Scoped Solely to ID│
       │ SELECT Id, Name, DA_Project__c, CreatedDate... │
       │ FROM DA_Analysis_Run__c                        │
       │ WHERE DA_Project__c = :authoritativeProjectId  │
       │ WITH USER_MODE                                 │
       │ ORDER BY CreatedDate DESC                      │
       │ LIMIT :safeMaxRuns                             │
       └────────────────────────────────────────────────┘
```

---

## 3. Detailed Algorithmic Rules

### Rule 1: Syntactic ID Shape vs Existence Proof
A string matching the 15-character or 18-character regex `^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$` has the **shape** of an ID, but shape is not existence.
- The controller attempts a try-cast via `Id.valueOf(projectId)` or the regex.
- If it is syntactically an ID, it queries `SELECT Id FROM DA_Project__c WHERE Id = :projectId WITH USER_MODE LIMIT 1`.
- If a project record is returned, that record's `Id` is the authoritative project ID. **Evaluation terminates immediately**; no query on `Project_Key__c` is ever made.

### Rule 2: Fallback to External Key
If syntactic ID resolution fails (either because the string is not an ID shape, or because the query on `Id = :projectId` returned 0 records):
- The controller queries `SELECT Id FROM DA_Project__c WHERE Project_Key__c = :projectId WITH USER_MODE LIMIT 2`.
- Notice `LIMIT 2`: this guarantees the controller detects key ambiguity without scanning the entire table.
- **If 0 records found:** Return an empty list `[]` (controlled not-found). Do not throw an unhandled exception.
- **If exactly 1 record found:** That record's `Id` is the authoritative project ID.
- **If > 1 records found:** Fail safely by throwing an `AuraHandledException('Ambiguous project key: multiple projects match key ' + projectId)`.

### Rule 3: Single-Project Scoping for Runs
Once `authoritativeProjectId` is resolved:
```apex
SELECT Id, Name, DA_Project__c, DA_Project__r.Name, DA_Project__r.Project_Key__c, CreatedDate
FROM DA_Analysis_Run__c
WHERE DA_Project__c = :authoritativeProjectId
WITH USER_MODE
ORDER BY CreatedDate DESC
LIMIT :safeMaxRuns
```
Because the `WHERE` clause filters solely on `DA_Project__c = :authoritativeProjectId`, it is mathematically impossible for runs from another project to be included.

### Rule 4: Security and Information Disclosure
- All queries must be executed `WITH USER_MODE`.
- If a user lacks read access to `DA_Project__c` or `DA_Analysis_Run__c`, user-mode enforcement prevents data disclosure.
- If a project exists in the database but the current user cannot see it due to sharing rules, the query returns 0 rows. The controller returns `[]`, identical to the non-existent case, preventing unauthorized tenant existence probing.

### Rule 5: Parameter Sanitization and Pagination
- If `projectId` is `null`, blank, or whitespace-only: return `[]`.
- `maxRuns`: Defaults to 20 if `null` or `<= 0`. Clamped to a maximum of 100 to prevent heap and query governor limits.

---

## 4. Canonical DTO and Method Specification

```apex
public with sharing class DAAnalysisRunSummaryDTO {
    @AuraEnabled public String runId { get; set; }
    @AuraEnabled public String runName { get; set; }      // Canonical field (maps to DA_Analysis_Run__c.Name)
    @AuraEnabled public String projectId { get; set; }
    @AuraEnabled public String projectName { get; set; }
    @AuraEnabled public String projectKey { get; set; }
    @AuraEnabled public Datetime createdDate { get; set; }
}
```

```apex
@AuraEnabled(cacheable=true)
public static List<DAAnalysisRunSummaryDTO> getAnalysisRuns(String projectId, Integer maxRuns)
```

---

## 5. Mandatory Test Matrix (14 Scenarios)

| Scenario ID | Test Input | Project State in Org | Expected Resolution Behavior | Multi-Project Risk |
| :--- | :--- | :--- | :--- | :---: |
| `TC-W7-01` | Valid 18-char Project ID | Project A (`Id = 001...AAA`) exists | Resolves to Project A by ID; queries runs for `001...AAA` | **0%** |
| `TC-W7-02` | Valid 15-char Project ID | Project A (`Id = 001...AAA`) exists | Resolves to Project A by ID; queries runs for `001...AAA` | **0%** |
| `TC-W7-03` | Valid External Key (`PROJ-ALPHA`) | Project B (`Key = PROJ-ALPHA`) exists | Resolves to Project B by Key; queries runs for Project B ID | **0%** |
| `TC-W7-04` | 18-char string resembling ID | No Project has that ID; Project C has `Key = 001...CCC` | Step A returns 0; Step B resolves Project C by Key | **0%** |
| `TC-W7-05` | String matching ID of Proj A and Key of Proj B | Project A has `Id = 001...X`; Project B has `Key = 001...X` | Step A resolves Project A; Step B NEVER executed; only Proj A runs returned | **0%** |
| `TC-W7-06` | Unknown ID-shaped string | No project has this ID or Key | Step A returns 0; Step B returns 0; returns `[]` | **0%** |
| `TC-W7-07` | Unknown external key string | No project matches key | Step A skipped; Step B returns 0; returns `[]` | **0%** |
| `TC-W7-08` | Duplicate External Key | Project D and Project E both have `Key = DUP-KEY` | Step B detects 2 records; throws AuraHandledException | **0%** |
| `TC-W7-09` | Inaccessible Project | Project exists but user has no sharing access | User mode returns 0 rows; returns `[]` safely | **0%** |
| `TC-W7-10` | Project with 0 Analysis Runs | Project exists, has no runs | Resolves Project ID; runs query returns `[]` | **0%** |
| `TC-W7-11` | Project A runs vs Project B runs | Project A has runs R1, R2; Project B has runs R3, R4 | Returns strictly R1, R2 when Project A is requested | **0%** |
| `TC-W7-12` | Null Input | Input is `null` | Returns `[]` immediately | **0%** |
| `TC-W7-13` | Blank / Whitespace Input | Input is `"   "` | Returns `[]` immediately | **0%** |
| `TC-W7-14` | Malformed string (symbols, quotes) | Input is `"' OR 1=1 --"` | Bound variable protects SOQL; returns `[]` | **0%** |
