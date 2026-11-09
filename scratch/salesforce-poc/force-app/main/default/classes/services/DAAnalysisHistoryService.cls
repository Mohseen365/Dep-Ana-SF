/**
 * Service orchestrating analysis run retrieval, pagination, and metric delta calculations.
 */
public with sharing class DAAnalysisHistoryService {
    public static final Integer DEFAULT_LIMIT = 20;
    public static final Integer MAX_LIMIT = 100;

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
     * Resolves project ID using strict two-step resolution (Id first, then Project_Key__c fallback).
     */
    public static Id resolveProjectId(String projectIdOrKey) {
        if (String.isBlank(projectIdOrKey)) {
            return null;
        }
        if (isValidId(projectIdOrKey)) {
            List<DA_Project__c> byId = [
                SELECT Id FROM DA_Project__c WHERE Id = :projectIdOrKey WITH USER_MODE LIMIT 1
            ];
            if (!byId.isEmpty()) {
                return byId[0].Id;
            }
        }
        List<DA_Project__c> byKey = [
            SELECT Id FROM DA_Project__c WHERE Project_Key__c = :projectIdOrKey WITH USER_MODE LIMIT 1
        ];
        return byKey.isEmpty() ? null : byKey[0].Id;
    }

    public static List<DAAnalysisRunDTO> getAnalysisRuns(Id projectId, Integer queryLimit, Integer queryOffset) {
        if (projectId == null) {
            throw new IllegalArgumentException('projectId is required.');
        }

        Integer effectiveLimit = (queryLimit == null || queryLimit <= 0) ? DEFAULT_LIMIT : Math.min(queryLimit, MAX_LIMIT);
        Integer effectiveOffset = (queryOffset == null || queryOffset < 0) ? 0 : queryOffset;

        List<DA_Analysis_Run__c> runs = [
            SELECT Id, DA_Project__c, Commit_Hash__c, Run_Timestamp__c, Status__c,
                   Node_Count__c, Edge_Count__c, Cyclic_SCC_Count__c,
                   Total_Chunks__c, Total_Payload_Size_Chars__c, CreatedDate
            FROM DA_Analysis_Run__c
            WHERE DA_Project__c = :projectId
            WITH USER_MODE
            ORDER BY Run_Timestamp__c DESC, Id DESC
            LIMIT :effectiveLimit OFFSET :effectiveOffset
        ];

        List<DAAnalysisRunDTO> dtos = new List<DAAnalysisRunDTO>();
        for (Integer i = 0; i < runs.size(); i++) {
            DA_Analysis_Run__c r = runs[i];
            DAAnalysisRunDTO dto = new DAAnalysisRunDTO();
            dto.runId = r.Id;
            dto.projectId = r.DA_Project__c;
            dto.commitHash = r.Commit_Hash__c;
            dto.runTimestamp = r.Run_Timestamp__c != null ? r.Run_Timestamp__c : r.CreatedDate;
            dto.status = r.Status__c;
            dto.nodeCount = r.Node_Count__c != null ? r.Node_Count__c.intValue() : 0;
            dto.edgeCount = r.Edge_Count__c != null ? r.Edge_Count__c.intValue() : 0;
            dto.cyclicSccCount = r.Cyclic_SCC_Count__c != null ? r.Cyclic_SCC_Count__c.intValue() : 0;
            dto.totalChunks = r.Total_Chunks__c != null ? r.Total_Chunks__c.intValue() : 0;
            dto.totalPayloadSizeChars = r.Total_Payload_Size_Chars__c != null ? r.Total_Payload_Size_Chars__c.longValue() : 0L;

            // Calculate delta relative to the immediately preceding run in chronological history (if available)
            if (i + 1 < runs.size()) {
                DA_Analysis_Run__c prev = runs[i + 1];
                Integer prevNodes = prev.Node_Count__c != null ? prev.Node_Count__c.intValue() : 0;
                Integer prevEdges = prev.Edge_Count__c != null ? prev.Edge_Count__c.intValue() : 0;
                Integer prevCycles = prev.Cyclic_SCC_Count__c != null ? prev.Cyclic_SCC_Count__c.intValue() : 0;

                dto.nodeDelta = dto.nodeCount - prevNodes;
                dto.edgeDelta = dto.edgeCount - prevEdges;
                dto.cyclicSccDelta = dto.cyclicSccCount - prevCycles;
            }

            dtos.add(dto);
        }

        return dtos;
    }

    /**
     * Overloaded string version of getAnalysisRuns supporting both Salesforce Id and Project Key.
     */
    public static List<DAAnalysisRunDTO> getAnalysisRuns(String projectIdOrKey, Integer queryLimit, Integer queryOffset) {
        if (String.isBlank(projectIdOrKey)) {
            throw new IllegalArgumentException('projectId is required.');
        }
        Id resolvedId = resolveProjectId(projectIdOrKey);
        if (resolvedId == null) {
            return new List<DAAnalysisRunDTO>();
        }
        return getAnalysisRuns(resolvedId, queryLimit, queryOffset);
    }
}
