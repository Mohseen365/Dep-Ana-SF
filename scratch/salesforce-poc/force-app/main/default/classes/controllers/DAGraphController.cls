/**
 * @description Apex Controller providing AuraEnabled graph retrieval and metadata endpoints
 */
public with sharing class DAGraphController {

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
     * @description Fetches metadata only for the latest graph run for a project (no full chunk aggregation).
     */
    @AuraEnabled(cacheable=true)
    public static DAGraphDTO getLatestGraphMetadataForProject(String projectId) {
        if (String.isBlank(projectId)) {
            throw new AuraHandledException('Project ID is required.');
        }

        List<DA_Analysis_Run__c> runs = [
            SELECT Id, Name, DA_Project__c, DA_Project__r.Name, DA_Project__r.Project_Key__c, CreatedDate
            FROM DA_Analysis_Run__c
            WHERE DA_Project__c = :projectId OR DA_Project__r.Project_Key__c = :projectId
            WITH USER_MODE
            ORDER BY CreatedDate DESC
            LIMIT 1
        ];

        if (runs.isEmpty()) {
            DAGraphDTO emptyDto = new DAGraphDTO();
            emptyDto.projectId = projectId;
            return emptyDto;
        }

        DA_Analysis_Run__c run = runs[0];
        DAGraphDTO dto = new DAGraphDTO();
        dto.projectId = run.DA_Project__c;
        dto.projectName = run.DA_Project__r.Name;
        dto.projectKey = run.DA_Project__r.Project_Key__c;
        dto.runId = run.Id;

        AggregateResult[] agg = [
            SELECT COUNT(Id) totalCount
            FROM DA_Graph_Chunk__c
            WHERE DA_Analysis_Run__c = :run.Id
            WITH USER_MODE
        ];

        Integer totalCount = 0;
        if (!agg.isEmpty() && agg[0].get('totalCount') != null) {
            totalCount = (Integer) agg[0].get('totalCount');
        }

        dto.isChunked = totalCount > 0;
        dto.totalChunks = totalCount;

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

        // Validate run existence and strict project-run ownership access via USER_MODE
        List<DA_Analysis_Run__c> runs = [
            SELECT Id, DA_Project__c
            FROM DA_Analysis_Run__c
            WHERE Id = :runId
              AND (DA_Project__c = :projectId OR DA_Project__r.Project_Key__c = :projectId)
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
}
