/**
 * @description Ingestion service handling creation of projects, analysis runs, and graph chunk persistence
 */
public with sharing class DAGraphIngestionService {

    public static final Integer MAX_CHUNK_SIZE = 131072; // LongTextArea field limit (128 KB)
    public static final Integer MAX_BATCH_CHUNKS = 10; // Bounded client-driven batch limit per call
    public static final Integer MAX_TOTAL_PAYLOAD_SIZE = 10485760; // 10 MB overall payload cap

    public static String createProject(String projectName, String projectKey) {
        if (String.isBlank(projectName) || String.isBlank(projectKey)) {
            throw new IllegalArgumentException('Project name and project key are required.');
        }

        String sanitizedKey = projectKey.trim();
        String sanitizedName = projectName.trim();

        // Check if project key already exists
        List<DA_Project__c> existing = [
            SELECT Id, Name
            FROM DA_Project__c
            WHERE Project_Key__c = :sanitizedKey
            WITH USER_MODE
            LIMIT 1
        ];

        if (!existing.isEmpty()) {
            return existing[0].Id;
        }

        DA_Project__c proj = new DA_Project__c(
            Name = sanitizedName,
            Project_Key__c = sanitizedKey
        );
        insert as user proj;
        return proj.Id;
    }

    public static String createAnalysisRun(String projectId, String runName) {
        if (String.isBlank(projectId) || String.isBlank(runName)) {
            throw new IllegalArgumentException('Project ID and run name are required.');
        }

        DA_Analysis_Run__c run = new DA_Analysis_Run__c(
            DA_Project__c = projectId,
            Name = runName.trim()
        );
        insert as user run;
        return run.Id;
    }

    public static Integer saveGraphChunks(String runId, List<String> chunkData) {
        return saveGraphChunks(runId, chunkData, 0, null);
    }

    /**
     * @description Bounded, failure-aware batch chunk persistence with project scoping & idempotency.
     */
    public static Integer saveGraphChunks(String runId, List<String> chunkData, Integer startIndex, String projectId) {
        if (String.isBlank(runId) || chunkData == null || chunkData.isEmpty()) {
            return 0;
        }

        if (startIndex == null || startIndex < 0) {
            startIndex = 0;
        }

        if (chunkData.size() > MAX_BATCH_CHUNKS) {
            throw new IllegalArgumentException('Batch chunk count (' + chunkData.size() + ') exceeds maximum permitted limit of ' + MAX_BATCH_CHUNKS + ' chunks per call.');
        }

        // Validate run existence and project ownership with WITH USER_MODE
        List<DA_Analysis_Run__c> runs;
        if (String.isNotBlank(projectId)) {
            runs = [
                SELECT Id, DA_Project__c
                FROM DA_Analysis_Run__c
                WHERE Id = :runId
                  AND (DA_Project__c = :projectId OR DA_Project__r.Project_Key__c = :projectId)
                WITH USER_MODE
                LIMIT 1
            ];
        } else {
            runs = [
                SELECT Id, DA_Project__c
                FROM DA_Analysis_Run__c
                WHERE Id = :runId
                  AND DA_Project__c != null
                WITH USER_MODE
                LIMIT 1
            ];
        }

        if (runs.isEmpty()) {
            throw new IllegalArgumentException('Invalid, unauthorized, or project-mismatched Run ID: ' + runId);
        }

        // Calculate expected chunk index bounds
        Integer endIndex = startIndex + chunkData.size() - 1;

        // Query existing chunk records in target range to enforce idempotent persistence
        List<DA_Graph_Chunk__c> existingChunks = [
            SELECT Id, Chunk_Index__c, Payload_Data__c
            FROM DA_Graph_Chunk__c
            WHERE DA_Analysis_Run__c = :runId
              AND Chunk_Index__c >= :startIndex
              AND Chunk_Index__c <= :endIndex
            WITH USER_MODE
        ];

        Map<Integer, DA_Graph_Chunk__c> existingMap = new Map<Integer, DA_Graph_Chunk__c>();
        for (DA_Graph_Chunk__c c : existingChunks) {
            if (c.Chunk_Index__c != null) {
                existingMap.put((Integer) c.Chunk_Index__c, c);
            }
        }

        List<DA_Graph_Chunk__c> toInsert = new List<DA_Graph_Chunk__c>();
        List<DA_Graph_Chunk__c> toUpdate = new List<DA_Graph_Chunk__c>();

        for (Integer i = 0; i < chunkData.size(); i++) {
            Integer targetIndex = startIndex + i;
            String payloadStr = chunkData[i];

            if (payloadStr != null && payloadStr.length() > MAX_CHUNK_SIZE) {
                throw new IllegalArgumentException('Chunk at index ' + targetIndex + ' exceeds maximum allowed size of ' + MAX_CHUNK_SIZE + ' characters.');
            }

            String safePayload = payloadStr != null ? payloadStr : '';

            if (existingMap.containsKey(targetIndex)) {
                DA_Graph_Chunk__c existingRecord = existingMap.get(targetIndex);
                existingRecord.Payload_Data__c = safePayload;
                toUpdate.add(existingRecord);
            } else {
                toInsert.add(new DA_Graph_Chunk__c(
                    DA_Analysis_Run__c = runId,
                    Name = 'Chunk ' + targetIndex,
                    Chunk_Index__c = targetIndex,
                    Payload_Data__c = safePayload
                ));
            }
        }

        if (!toUpdate.isEmpty()) {
            update as user toUpdate;
        }
        if (!toInsert.isEmpty()) {
            insert as user toInsert;
        }

        return toUpdate.size() + toInsert.size();
    }
}
