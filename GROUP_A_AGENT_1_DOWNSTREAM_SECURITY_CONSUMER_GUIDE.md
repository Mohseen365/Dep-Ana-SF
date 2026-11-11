# Group A Agent 1: Downstream Security Consumer Guide

## Document Identification
- **Document Title**: Group A Agent 1 Downstream Security Consumer Guide
- **Target Audience**: Agent 2 (Ingestion), Agent 3 (REST Transport), Agent 6 (Findings Persistence), Agent 7 (Project Selector & Upload UI)
- **Author**: Agent 1 (Salesforce Security & Project Isolation Lead)
- **Coordinator**: Integration Coordinator D1
- **Interface Version**: `v1.0.2` (Hardened Patch Revision)
- **Status**: FROZEN FOR DOWNSTREAM CONSUMPTION

---

## 1. Overview & Core Principles

This guide provides concrete, copy-pasteable implementation guidance for downstream service authors consuming the Dependency Analyzer security interface (`DAProjectSecurityService.cls`).

All downstream components must strictly adhere to the following security invariants:
1. **Never Trust Caller-Supplied Identity**: Always bind operations to `UserInfo.getUserId()` unless running within an explicitly authorized internal system context.
2. **Always Enforce Canonical Scopes**: Evaluate required permissions using exact canonical scope tokens.
3. **Fail-Closed on Unproven Provenance**: Never assume a user has access because a query succeeded or because an emergency grant is absent.
4. **Preserve Master-Detail Boundaries**: Always scope child queries to an authorized parent `DA_Project__c` ID.
5. **Handle Security Exceptions Gracefully**: Map `DAProjectSecurityService.SecurityException` to standardized `DAErrorResponse` or AuraHandledExceptions without exposing raw stack traces.

---

## 2. Public API Reference: `DAProjectSecurityService`

### 2.1 Primary Authorization Methods

```apex
// 1. Primary User-Facing Authorization Check
// Automatically binds evaluation to UserInfo.getUserId(). Prevents client-side identity spoofing.
public static DAProjectSecurityService.ProjectAccessContext validateProjectAccessForCurrentUser(
    Id projectId,
    String requiredScope
);

// 2. Caller-Specified Check (Requires caller to match UserInfo.getUserId() or be a trusted internal class)
public static DAProjectSecurityService.ProjectAccessContext validateProjectAccess(
    Id projectId,
    Id userId,
    String requiredScope
);

// 3. Trusted Internal Service-to-Service Check (Only for DAEmergencyAccessCleanupService, DAGraphIngestionService)
public static DAProjectSecurityService.ProjectAccessContext validateProjectAccessTrustedInternal(
    Id projectId,
    Id userId,
    String requiredScope
);
```

### 2.2 Canonical Permission Scope Tokens

Downstream agents must use the canonical scope tokens defined in `DAProjectSecurityService`:

| Scope Constant | Token String | Purpose | Permitted By `SCOPE_FULL`? |
|---|---|---|---|
| `DAProjectSecurityService.SCOPE_FULL` | `'FULL'` | Unrestricted administrative/system project access | Yes (Self) |
| `DAProjectSecurityService.SCOPE_PROJECT_READ` | `'PROJECT_READ'` | View project metadata, dashboard summary | Yes |
| `DAProjectSecurityService.SCOPE_GRAPH_READ` | `'GRAPH_READ'` | Read graph chunks, view graph nodes/edges | Yes |
| `DAProjectSecurityService.SCOPE_FINDING_READ` | `'FINDING_READ'` | Read static analysis findings & rules | Yes |
| `DAProjectSecurityService.SCOPE_FINDING_WRITE` | `'FINDING_WRITE'` | Update finding triage status, resolution note | Yes |
| `DAProjectSecurityService.SCOPE_ANALYSIS_UPLOAD`| `'ANALYSIS_UPLOAD'`| Create analysis runs, upload graph chunks | Yes |
| `DAProjectSecurityService.SCOPE_ANALYSIS_FINALIZE`| `'ANALYSIS_FINALIZE'`| Finalize analysis run status to AVAILABLE/EMPTY | Yes |

*Note on Hierarchical Matching*:
- `SCOPE_FULL` satisfies **all** scopes.
- `SCOPE_ANALYSIS_FINALIZE` satisfies `SCOPE_ANALYSIS_UPLOAD`.
- `SCOPE_FINDING_WRITE` satisfies `SCOPE_FINDING_READ`.
- `SCOPE_GRAPH_READ` or `SCOPE_FINDING_READ` satisfies `SCOPE_PROJECT_READ`.

### 2.3 Context DTO: `ProjectAccessContext`

```apex
public class ProjectAccessContext {
    public Id projectId;               // Evaluated Project ID
    public Id userId;                  // Evaluated User ID (Principal)
    public String requiredScope;       // Scope requested
    public Boolean hasAccess;          // True if access granted, False otherwise
    public Boolean isEmergencyAccess;  // True if granted via temporary emergency lease
    public Id grantId;                 // ID of active DA_Emergency_Access_Grant__c (if emergency)
    public Datetime evaluationTime;    // Exact timestamp of evaluation
    public String accessProvenance;    // 'DIRECT_SHARE', 'EMERGENCY_GRANT', or 'UNAUTHORIZED'
}
```

---

## 3. Implementation Recipes for Downstream Agents

### 3.1 Recipe for Agent 2 (DAGraphIngestionService)
*Governance State: Scope A is UNBLOCKED; Scope B is HOLD_SECURITY_ACCEPTANCE pending D1 signoff.*

Before persisting analysis runs or graph chunks, validate `SCOPE_ANALYSIS_UPLOAD`:

```apex
public static DAAnalysisRunDTO initializeAnalysisRun(
    Id projectId,
    String commitHash,
    Integer expectedChunks,
    Long expectedBytes
) {
    if (projectId == null) {
        throw new IngestionException('Project ID is required.');
    }

    // Step 1: Security Authorization Check
    DAProjectSecurityService.ProjectAccessContext authCtx =
        DAProjectSecurityService.validateProjectAccessForCurrentUser(
            projectId,
            DAProjectSecurityService.SCOPE_ANALYSIS_UPLOAD
        );

    if (!authCtx.hasAccess) {
        throw new IngestionException(
            'Access Denied: User lacks ANALYSIS_UPLOAD permissions for project ' + projectId +
            ' (Provenance: ' + authCtx.accessProvenance + ')'
        );
    }

    // Step 2: Proceed with Run Initialization
    // ...
}
```

During finalization, validate `SCOPE_ANALYSIS_FINALIZE`:

```apex
public static FinalizationResult finalizeAnalysisRun(Id runId, Integer chunkCount) {
    // Step 1: Query run with USER_MODE to obtain parent project ID
    DA_Analysis_Run__c run = [
        SELECT Id, DA_Project__c, Status__c, Total_Chunks__c
        FROM DA_Analysis_Run__c
        WHERE Id = :runId
        WITH USER_MODE
        LIMIT 1
    ];

    // Step 2: Security Authorization Check
    DAProjectSecurityService.ProjectAccessContext authCtx =
        DAProjectSecurityService.validateProjectAccessForCurrentUser(
            run.DA_Project__c,
            DAProjectSecurityService.SCOPE_ANALYSIS_FINALIZE
        );

    if (!authCtx.hasAccess) {
        throw new IngestionException(
            'Access Denied: User lacks ANALYSIS_FINALIZE permissions for project ' + run.DA_Project__c
        );
    }

    // Step 3: Proceed with state transition to AVAILABLE or EMPTY
    // ...
}
```

### 3.2 Recipe for Agent 3 (Apex REST Ingestion Controllers)
*Governance State: PREPARATION_ALLOWED_INTEGRATION_GATED.*

In Apex REST endpoints (`@RestResource`), wrap requests in standard exception handlers and map `SecurityException` to HTTP 403 Forbidden with `DAErrorResponse`:

```apex
@RestResource(urlMapping='/dependency/v1/projects/*/chunks')
global with sharing class DAGraphRestEndpoint {

    @HttpPost
    global static void uploadChunk() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;

        try {
            // Extract projectId from URI
            Id projectId = extractProjectId(req.requestURI);

            // Enforce caller authorization
            DAProjectSecurityService.ProjectAccessContext auth =
                DAProjectSecurityService.validateProjectAccessForCurrentUser(
                    projectId,
                    DAProjectSecurityService.SCOPE_ANALYSIS_UPLOAD
                );

            if (!auth.hasAccess) {
                res.statusCode = 403;
                res.responseBody = Blob.valueOf(JSON.serialize(
                    new DAErrorResponse('FORBIDDEN', 'Access denied to project ' + projectId, null)
                ));
                return;
            }

            // Enforce 5 MiB wire ceiling
            if (req.requestBody.size() > 5242880) {
                res.statusCode = 413;
                res.responseBody = Blob.valueOf(JSON.serialize(
                    new DAErrorResponse('PAYLOAD_TOO_LARGE', 'Request wire size exceeds 5 MiB ceiling', null)
                ));
                return;
            }

            // Process payload...

        } catch (DAProjectSecurityService.SecurityException secEx) {
            res.statusCode = 403;
            res.responseBody = Blob.valueOf(JSON.serialize(
                new DAErrorResponse('FORBIDDEN', secEx.getMessage(), null)
            ));
        } catch (Exception ex) {
            res.statusCode = 500;
            res.responseBody = Blob.valueOf(JSON.serialize(
                new DAErrorResponse('INTERNAL_ERROR', 'An unexpected error occurred.', null)
            ));
        }
    }
}
```

### 3.3 Recipe for Agent 6 (DAFindingsView & Persistence)
*Governance State: PREPARATION_ALLOWED_SECURITY_IMPLEMENTATION_GATED.*

When persisting finding reviews or updates:

```apex
@AuraEnabled
public static void updateFindingStatus(Id findingId, String newStatus, String triageNotes) {
    if (findingId == null) {
        throw new AuraHandledException('Finding ID is required.');
    }

    // Query parent project ID via Master-Detail run
    DA_Finding__c finding = [
        SELECT Id, DA_Analysis_Run__r.DA_Project__c, Status__c
        FROM DA_Finding__c
        WHERE Id = :findingId
        WITH USER_MODE
        LIMIT 1
    ];

    Id projectId = finding.DA_Analysis_Run__r.DA_Project__c;

    // Validate FINDING_WRITE scope
    DAProjectSecurityService.ProjectAccessContext auth =
        DAProjectSecurityService.validateProjectAccessForCurrentUser(
            projectId,
            DAProjectSecurityService.SCOPE_FINDING_WRITE
        );

    if (!auth.hasAccess) {
        throw new AuraHandledException('Unauthorized: You lack FINDING_WRITE permissions on this project.');
    }

    finding.Status__c = newStatus;
    finding.Triage_Notes__c = triageNotes;
    update as user finding;
}
```

### 3.4 Recipe for Agent 7 (daProjectSelector & Upload UI)
*Governance State: BLOCKED_INTERFACE_ACCEPTANCE.*

When listing projects in the UI selector:
```apex
@AuraEnabled(cacheable=true)
public static List<DA_Project__c> getAvailableProjects() {
    // Under Private OWD, WITH USER_MODE ensures only records owned by, shared to,
    // or accessible via active emergency grants are returned.
    return [
        SELECT Id, Name, Project_Key__c, Status__c, Repository_Url__c
        FROM DA_Project__c
        WITH USER_MODE
        ORDER BY Name ASC
        LIMIT 100
    ];
}
```

When creating a new project:
```apex
@AuraEnabled
public static DA_Project__c createProject(String projectName, String projectKey, String repoUrl) {
    DA_Project__c proj = new DA_Project__c(
        Name = projectName,
        Project_Key__c = projectKey,
        Repository_Url__c = repoUrl,
        Status__c = 'Active',
        OwnerId = UserInfo.getUserId() // Sets direct owner -> DIRECT_SHARE provenance
    );
    insert as user proj;
    return proj;
}
```

---

## 4. Downstream Integration Checklist

Before submitting code that integrates with `DAProjectSecurityService`, verify the following:
- [ ] No direct queries against `DA_Emergency_Access_Grant__c` or `DA_Security_Audit_Log__c` without going through `DAProjectSecurityService`.
- [ ] No direct evaluation of `DA_Project__Share` row presence in client controllers.
- [ ] Never pass an arbitrary `userId` into `validateProjectAccess` from an LWC `@AuraEnabled` method.
- [ ] Ensure all SOQL queries enforce `WITH USER_MODE`.
- [ ] Ensure all DML statements use `insert as user` or `update as user`.
- [ ] All required scopes use exact constants from `DAProjectSecurityService` (`SCOPE_*`).
- [ ] Offline test mocks in downstream unit tests must not bypass security checks in non-test contexts.
