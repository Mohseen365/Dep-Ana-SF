/**
 * @description Apex Controller providing AuraEnabled graph retrieval and metadata endpoints
 */
public with sharing class DAGraphController {

    private static Boolean isValidId(String str) {
        if (String.isBlank(str)) {
            return false;
        }
        try {
            Id evalId = (Id) str;
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * @description Resolves a DA_Project__c record using strict two-step resolution:
     * 1. Query by Salesforce Record ID first (if valid Id format)
     * 2. Fall back to unique Project_Key__c only if ID query returns no rows or str is not a valid ID
     * Prevents cross-project leakage and enforces project isolation.
     */
    public static DA_Project__c resolveProject(String projectIdOrKey) {
        if (String.isBlank(projectIdOrKey)) {
            return null;
        }

        if (isValidId(projectIdOrKey)) {
            List<DA_Project__c> byId = [
                SELECT Id, Name, Project_Key__c, CreatedDate
                FROM DA_Project__c
                WHERE Id = :projectIdOrKey
                WITH USER_MODE
                LIMIT 1
            ];
            if (!byId.isEmpty()) {
                return byId[0];
            }
        }

        List<DA_Project__c> byKey = [
            SELECT Id, Name, Project_Key__c, CreatedDate
            FROM DA_Project__c
            WHERE Project_Key__c = :projectIdOrKey
            WITH USER_MODE
            LIMIT 1
        ];

        return byKey.isEmpty() ? null : byKey[0];
    }

    @AuraEnabled(cacheable=true)
    public static List<DA_Project__c> getProjects() {
        return [
            SELECT Id, Name, Project_Key__c, CreatedDate
            FROM DA_Project__c
            WITH USER_MODE
            ORDER BY Name ASC
            LIMIT 100
        ];
    }

    /**
     * @description Fetches metadata only for the latest available graph run for a project (no full chunk aggregation).
     * Enforces amended DEC-01 integrity rule: Status__c == 'AVAILABLE' AND COUNT(chunks) == Total_Chunks__c.
     * Uses bulkified aggregate query outside loops to prevent SOQL governor limit exhaustion.
     */
    @AuraEnabled(cacheable=true)
    public static DAGraphDTO getLatestGraphMetadataForProject(String projectId) {
        if (String.isBlank(projectId)) {
            throw new AuraHandledException('Project ID is required.');
        }

        DA_Project__c project = resolveProject(projectId);
        if (project == null) {
            DAGraphDTO emptyDto = new DAGraphDTO();
            emptyDto.projectId = projectId;
            return emptyDto;
        }

        // Query runs for the resolved project ordered deterministically
        List<DA_Analysis_Run__c> runs = [
            SELECT Id, Name, DA_Project__c, DA_Project__r.Name, DA_Project__r.Project_Key__c,
                   Status__c, Total_Chunks__c, Node_Count__c, Edge_Count__c, Commit_Hash__c,
                   Run_Timestamp__c, CreatedDate
            FROM DA_Analysis_Run__c
            WHERE DA_Project__c = :project.Id
            WITH USER_MODE
            ORDER BY Run_Timestamp__c DESC NULLS LAST, CreatedDate DESC, Id DESC
            LIMIT 20
        ];

        if (runs.isEmpty()) {
            DAGraphDTO emptyDto = new DAGraphDTO();
            emptyDto.projectId = project.Id;
            emptyDto.projectName = project.Name;
            emptyDto.projectKey = project.Project_Key__c;
            return emptyDto;
        }

        // Bulkified chunk count aggregation outside loop to strictly prevent SOQL governor limits
        Set<Id> runIds = new Set<Id>();
        for (DA_Analysis_Run__c r : runs) {
            if (r.Status__c == 'AVAILABLE') {
                runIds.add(r.Id);
            }
        }

        Map<Id, Integer> chunkCountsByRunId = new Map<Id, Integer>();
        if (!runIds.isEmpty()) {
            for (AggregateResult ar : [
                SELECT DA_Analysis_Run__c runId, COUNT(Id) totalCount
                FROM DA_Graph_Chunk__c
                WHERE DA_Analysis_Run__c IN :runIds
                WITH USER_MODE
                GROUP BY DA_Analysis_Run__c
            ]) {
                chunkCountsByRunId.put((Id) ar.get('runId'), (Integer) ar.get('totalCount'));
            }
        }

        // Find the latest run meeting amended ingestion integrity:
        // Status__c == 'AVAILABLE' AND count(persisted chunks) == Total_Chunks__c
        DA_Analysis_Run__c validRun = null;
        Integer verifiedChunkCount = 0;

        for (DA_Analysis_Run__c candidate : runs) {
            if (candidate.Status__c != 'AVAILABLE') {
                continue;
            }

            Integer actualChunks = chunkCountsByRunId.containsKey(candidate.Id) ? chunkCountsByRunId.get(candidate.Id) : 0;
            Integer expectedChunks = candidate.Total_Chunks__c != null ? candidate.Total_Chunks__c.intValue() : actualChunks;

            // Integrity verification: must be AVAILABLE and chunk counts must match exactly
            if (actualChunks == expectedChunks) {
                validRun = candidate;
                verifiedChunkCount = actualChunks;
                break;
            }
        }

        if (validRun == null) {
            DAGraphDTO emptyDto = new DAGraphDTO();
            emptyDto.projectId = project.Id;
            emptyDto.projectName = project.Name;
            emptyDto.projectKey = project.Project_Key__c;
            return emptyDto;
        }

        DAGraphDTO dto = new DAGraphDTO();
        dto.projectId = project.Id;
        dto.projectName = project.Name;
        dto.projectKey = project.Project_Key__c;
        dto.runId = validRun.Id;
        dto.commitHash = validRun.Commit_Hash__c;
        dto.nodeCount = validRun.Node_Count__c != null ? validRun.Node_Count__c.intValue() : 0;
        dto.edgeCount = validRun.Edge_Count__c != null ? validRun.Edge_Count__c.intValue() : 0;
        dto.isChunked = verifiedChunkCount > 0;
        dto.totalChunks = verifiedChunkCount;

        return dto;
    }

    /**
     * @description Fetches a bounded range of chunks for a given run ID with scope & permission validation.
     * @param runId The ID of the DA_Analysis_Run__c
     * @param startIndex Zero-based starting chunk index (inclusive)
     * @param maxChunks Maximum number of chunks to return (capped at 10 per call)
     */
    @AuraEnabled(cacheable=true)
    public static List<DA_Graph_Chunk__c> getGraphChunks(String runId, Integer startIndex, Integer maxChunks) {
        if (String.isBlank(runId)) {
            throw new AuraHandledException('Run ID is required.');
        }

        // Derive expected project context from validated run under USER_MODE
        List<DA_Analysis_Run__c> runs = [
            SELECT Id, DA_Project__c
            FROM DA_Analysis_Run__c
            WHERE Id = :runId AND DA_Project__c != null
            WITH USER_MODE
            LIMIT 1
        ];

        if (runs.isEmpty()) {
            throw new AuraHandledException('Invalid, unauthorized, or project-mismatched Run ID.');
        }

        return getGraphChunks(runId, startIndex, maxChunks, runs[0].DA_Project__c);
    }

    /**
     * @description Fetches a bounded range of chunks for a given run ID with project ownership validation.
     * @param runId The ID of the DA_Analysis_Run__c
     * @param startIndex Zero-based starting chunk index (inclusive)
     * @param maxChunks Maximum number of chunks to return (capped at 10 per call)
     * @param projectId Project ID or key to enforce strict project-run ownership scoping
     */
    @AuraEnabled(cacheable=true)
    public static List<DA_Graph_Chunk__c> getGraphChunks(String runId, Integer startIndex, Integer maxChunks, String projectId) {
        if (String.isBlank(runId)) {
            throw new AuraHandledException('Run ID is required.');
        }
        if (String.isBlank(projectId)) {
            return getGraphChunks(runId, startIndex, maxChunks);
        }

        if (startIndex == null || startIndex < 0) {
            startIndex = 0;
        }
        if (maxChunks == null || maxChunks <= 0) {
            maxChunks = 5;
        } else if (maxChunks > 10) {
            maxChunks = 10;
        }

        DA_Project__c resolvedProj = resolveProject(projectId);
        if (resolvedProj == null) {
            throw new AuraHandledException('Invalid, unauthorized, or project-mismatched Run ID.');
        }

        // Validate run existence and strict project-run ownership access via USER_MODE
        List<DA_Analysis_Run__c> runs = [
            SELECT Id, DA_Project__c
            FROM DA_Analysis_Run__c
            WHERE Id = :runId
              AND DA_Project__c = :resolvedProj.Id
            WITH USER_MODE
            LIMIT 1
        ];

        if (runs.isEmpty()) {
            throw new AuraHandledException('Invalid, unauthorized, or project-mismatched Run ID.');
        }

        // Guard against integer overflow on high startIndex values
        Long calcMaxIndex = (Long) startIndex + (Long) maxChunks - 1;
        Integer maxIndex = (calcMaxIndex > 2147483647L) ? 2147483647 : (Integer) calcMaxIndex;

        return [
            SELECT Chunk_Index__c, Payload_Data__c
            FROM DA_Graph_Chunk__c
            WHERE DA_Analysis_Run__c = :runId
              AND Chunk_Index__c >= :startIndex
              AND Chunk_Index__c <= :maxIndex
            WITH USER_MODE
            ORDER BY Chunk_Index__c ASC
        ];
    }

    /**
     * @deprecated Preserved for backward compatibility. Use getLatestGraphMetadataForProject and getGraphChunks.
     */
    @AuraEnabled(cacheable=true)
    public static DAGraphDTO getLatestGraphForProject(String projectId) {
        DAGraphDTO dto = getLatestGraphMetadataForProject(projectId);
        if (dto.runId != null && dto.totalChunks > 0) {
            List<DA_Graph_Chunk__c> chunks = [
                SELECT Chunk_Index__c, Payload_Data__c
                FROM DA_Graph_Chunk__c
                WHERE DA_Analysis_Run__c = :dto.runId
                WITH USER_MODE
                ORDER BY Chunk_Index__c ASC
            ];

            if (!chunks.isEmpty()) {
                if (!DAGraphChunkService.verifyChunkSequence(chunks)) {
                    throw new AuraHandledException('Corrupted or missing payload chunks detected.');
                }
                for (DA_Graph_Chunk__c chunk : chunks) {
                    dto.chunks.add(chunk.Payload_Data__c);
                }
            }
        }
        return dto;
    }

    // =========================================================================
    // AGENT 6: FINDING REVIEW PERSISTENCE (PO-DEC-V2-05 / GAP-WKF-01)
    // =========================================================================

    public static final Set<String> ALLOWED_REVIEW_STATUSES = new Set<String>{
        'OPEN', 'IN_REVIEW', 'RESOLVED', 'WONT_FIX'
    };

    /**
     * @description Validates state transitions between finding review statuses.
     * Allowed transitions:
     * - OPEN -> IN_REVIEW, RESOLVED, WONT_FIX
     * - IN_REVIEW -> RESOLVED, WONT_FIX, OPEN
     * - RESOLVED -> OPEN, IN_REVIEW
     * - WONT_FIX -> OPEN, IN_REVIEW
     * - Same-to-same is valid (idempotent)
     */
    public static Boolean isValidStatusTransition(String fromStatus, String toStatus) {
        if (String.isBlank(toStatus) || !ALLOWED_REVIEW_STATUSES.contains(toStatus)) {
            return false;
        }
        if (String.isBlank(fromStatus)) {
            fromStatus = 'OPEN';
        }
        if (fromStatus == toStatus) {
            return true;
        }
        if (fromStatus == 'OPEN') {
            return toStatus == 'IN_REVIEW' || toStatus == 'RESOLVED' || toStatus == 'WONT_FIX';
        }
        if (fromStatus == 'IN_REVIEW') {
            return toStatus == 'RESOLVED' || toStatus == 'WONT_FIX' || toStatus == 'OPEN';
        }
        if (fromStatus == 'RESOLVED') {
            return toStatus == 'OPEN' || toStatus == 'IN_REVIEW';
        }
        if (fromStatus == 'WONT_FIX') {
            return toStatus == 'OPEN' || toStatus == 'IN_REVIEW';
        }
        return false;
    }

    /**
     * @description Updates the review status of a finding with security authorization, project scoping,
     * deterministic state machine validation, optimistic concurrency control, and audit trail logging.
     *
     * @param projectId Salesforce ID or unique Project_Key__c of the target project
     * @param findingIdOrKey Salesforce record ID of DA_Finding__c or client-side Finding_Key__c
     * @param newStatus Target review status ('OPEN', 'IN_REVIEW', 'RESOLVED', 'WONT_FIX')
     * @param reviewNotes Contextual notes/rationale for the status update
     * @param expectedLastModified Optional timestamp for optimistic concurrency conflict detection
     */
    @AuraEnabled
    public static DA_Finding__c updateFindingStatus(
        String projectId,
        String findingIdOrKey,
        String newStatus,
        String reviewNotes,
        Datetime expectedLastModified
    ) {
        if (String.isBlank(projectId)) {
            throw new AuraHandledException('Project ID is required.');
        }
        if (String.isBlank(findingIdOrKey)) {
            throw new AuraHandledException('Finding ID or Key is required.');
        }
        if (String.isBlank(newStatus) || !ALLOWED_REVIEW_STATUSES.contains(newStatus)) {
            throw new AuraHandledException('Invalid review status: ' + newStatus + '. Allowed values: ' + ALLOWED_REVIEW_STATUSES);
        }

        DA_Project__c project = resolveProject(projectId);
        if (project == null) {
            throw new AuraHandledException('Invalid or unauthorized Project.');
        }

        // Security authorization via DAProjectSecurityService (requires SCOPE_FINDING_WRITE)
        DAProjectSecurityService.ProjectAccessContext secCtx =
            DAProjectSecurityService.validateProjectAccessForCurrentUser(project.Id, DAProjectSecurityService.SCOPE_FINDING_WRITE);
        if (!secCtx.hasAccess) {
            throw new AuraHandledException('Unauthorized: Caller lacks required permission scope ' + DAProjectSecurityService.SCOPE_FINDING_WRITE + ' on project.');
        }

        List<DA_Finding__c> findings;
        Boolean isId = isValidId(findingIdOrKey);

        if (isId) {
            findings = [
                SELECT Id, Name, Status__c, Reviewer__c, Reviewed_At__c, Review_Notes__c, Finding_Key__c,
                       Target_Node_Id__c, Severity__c, Rule_Id__c, DA_Analysis_Run__c,
                       DA_Analysis_Run__r.DA_Project__c, LastModifiedDate
                FROM DA_Finding__c
                WHERE Id = :findingIdOrKey
                  AND DA_Analysis_Run__r.DA_Project__c = :project.Id
                WITH USER_MODE
                LIMIT 1
            ];
        } else {
            findings = [
                SELECT Id, Name, Status__c, Reviewer__c, Reviewed_At__c, Review_Notes__c, Finding_Key__c,
                       Target_Node_Id__c, Severity__c, Rule_Id__c, DA_Analysis_Run__c,
                       DA_Analysis_Run__r.DA_Project__c, LastModifiedDate
                FROM DA_Finding__c
                WHERE Finding_Key__c = :findingIdOrKey
                  AND DA_Analysis_Run__r.DA_Project__c = :project.Id
                WITH USER_MODE
                LIMIT 1
            ];
        }

        if (findings.isEmpty()) {
            // If finding record does not yet exist in Salesforce (e.g. dynamically derived client finding),
            // find the latest AVAILABLE analysis run for this project and create a persisted record.
            List<DA_Analysis_Run__c> latestRuns = [
                SELECT Id FROM DA_Analysis_Run__c
                WHERE DA_Project__c = :project.Id AND Status__c = 'AVAILABLE'
                WITH USER_MODE
                ORDER BY Run_Timestamp__c DESC NULLS LAST, CreatedDate DESC
                LIMIT 1
            ];

            if (latestRuns.isEmpty()) {
                throw new AuraHandledException('Finding not found and no available analysis run exists for project.');
            }

            DA_Finding__c newFinding = new DA_Finding__c(
                DA_Analysis_Run__c = latestRuns[0].Id,
                Name = findingIdOrKey.length() > 80 ? findingIdOrKey.substring(0, 80) : findingIdOrKey,
                Finding_Key__c = findingIdOrKey,
                Rule_Id__c = 'ARCH_FINDING',
                Severity__c = 'Info',
                Status__c = newStatus,
                Reviewer__c = UserInfo.getName(),
                Reviewed_At__c = System.now(),
                Review_Notes__c = reviewNotes
            );

            insert as user newFinding;

            return [
                SELECT Id, Name, Status__c, Reviewer__c, Reviewed_At__c, Review_Notes__c,
                       Finding_Key__c, Target_Node_Id__c, Severity__c, Rule_Id__c, LastModifiedDate
                FROM DA_Finding__c
                WHERE Id = :newFinding.Id
                WITH USER_MODE
                LIMIT 1
            ];
        }

        DA_Finding__c finding = findings[0];

        // Optimistic concurrency detection: verify caller's observed version is current
        if (expectedLastModified != null && finding.LastModifiedDate != null) {
            if (finding.LastModifiedDate > expectedLastModified) {
                throw new AuraHandledException('CONCURRENCY_CONFLICT: The finding status was updated by another analyst (' +
                    finding.Reviewer__c + ' at ' + finding.LastModifiedDate + '). Please refresh.');
            }
        }

        // Validate state machine transition
        String currentStatus = String.isNotBlank(finding.Status__c) ? finding.Status__c : 'OPEN';
        if (!isValidStatusTransition(currentStatus, newStatus)) {
            throw new AuraHandledException('Invalid review state transition from ' + currentStatus + ' to ' + newStatus);
        }

        // Apply mutations
        finding.Status__c = newStatus;
        finding.Reviewer__c = UserInfo.getName();
        finding.Reviewed_At__c = System.now();
        if (reviewNotes != null) {
            finding.Review_Notes__c = reviewNotes;
        }

        update as user finding;

        return [
            SELECT Id, Name, Status__c, Reviewer__c, Reviewed_At__c, Review_Notes__c,
                   Finding_Key__c, Target_Node_Id__c, Severity__c, Rule_Id__c, LastModifiedDate
            FROM DA_Finding__c
            WHERE Id = :finding.Id
            WITH USER_MODE
            LIMIT 1
        ];
    }

    /**
     * @description Paginated retrieval of persistent finding review statuses for a project.
     * Enforces project isolation and read security scope (SCOPE_FINDING_READ).
     *
     * @param projectId Salesforce ID or unique Project_Key__c of the target project
     * @param pageSize Maximum number of records per page (default 100, max 500)
     * @param offset Starting record offset
     * @return Map containing totalCount, pageSize, offset, and a map of finding keys/ids to review status summaries.
     */
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getFindingReviewStatuses(String projectId, Integer pageSize, Integer offset) {
        if (String.isBlank(projectId)) {
            throw new AuraHandledException('Project ID is required.');
        }

        DA_Project__c project = resolveProject(projectId);
        if (project == null) {
            throw new AuraHandledException('Invalid or unauthorized Project.');
        }

        // Security authorization via DAProjectSecurityService (requires SCOPE_FINDING_READ)
        DAProjectSecurityService.ProjectAccessContext secCtx =
            DAProjectSecurityService.validateProjectAccessForCurrentUser(project.Id, DAProjectSecurityService.SCOPE_FINDING_READ);
        if (!secCtx.hasAccess) {
            throw new AuraHandledException('Unauthorized: Caller lacks required permission scope ' + DAProjectSecurityService.SCOPE_FINDING_READ + ' on project.');
        }

        if (pageSize == null || pageSize <= 0) {
            pageSize = 100;
        } else if (pageSize > 500) {
            pageSize = 500;
        }
        if (offset == null || offset < 0) {
            offset = 0;
        }

        // Total count of findings in project runs
        Integer totalCount = [
            SELECT COUNT()
            FROM DA_Finding__c
            WHERE DA_Analysis_Run__r.DA_Project__c = :project.Id
            WITH USER_MODE
        ];

        List<DA_Finding__c> findings = [
            SELECT Id, Name, Status__c, Reviewer__c, Reviewed_At__c, Review_Notes__c,
                   Finding_Key__c, Target_Node_Id__c, Severity__c, Rule_Id__c, LastModifiedDate
            FROM DA_Finding__c
            WHERE DA_Analysis_Run__r.DA_Project__c = :project.Id
            WITH USER_MODE
            ORDER BY LastModifiedDate DESC, Id ASC
            LIMIT :pageSize
            OFFSET :offset
        ];

        Map<String, Map<String, Object>> statusMap = new Map<String, Map<String, Object>>();
        for (DA_Finding__c f : findings) {
            Map<String, Object> summary = new Map<String, Object>();
            summary.put('id', f.Id);
            summary.put('findingKey', f.Finding_Key__c);
            summary.put('status', String.isNotBlank(f.Status__c) ? f.Status__c : 'OPEN');
            summary.put('reviewer', f.Reviewer__c);
            summary.put('reviewedAt', f.Reviewed_At__c);
            summary.put('reviewNotes', f.Review_Notes__c);
            summary.put('targetNodeId', f.Target_Node_Id__c);
            summary.put('severity', f.Severity__c);
            summary.put('ruleId', f.Rule_Id__c);
            summary.put('lastModifiedDate', f.LastModifiedDate != null ? f.LastModifiedDate.getTime() : null);

            // Index by ID
            statusMap.put(f.Id, summary);
            // Index also by Finding_Key__c if populated for seamless client-side key correlation
            if (String.isNotBlank(f.Finding_Key__c)) {
                statusMap.put(f.Finding_Key__c, summary);
            }
        }

        Map<String, Object> response = new Map<String, Object>();
        response.put('projectId', project.Id);
        response.put('totalCount', totalCount);
        response.put('pageSize', pageSize);
        response.put('offset', offset);
        response.put('statuses', statusMap);

        return response;
    }
}
