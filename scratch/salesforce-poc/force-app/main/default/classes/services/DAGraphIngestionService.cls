/**
 * @description Ingestion service handling creation of projects, analysis runs, and graph chunk persistence.
 * Implements explicit lifecycle state machine (QUEUED -> IN_PROGRESS -> VALIDATING -> AVAILABLE / FAILED),
 * unique Chunk_Key__c generation, duplicate chunk suppression, identical retry acceptance, conflicting retry rejection,
 * deterministic chunk validation, and last-known-good graph preservation.
 */
public with sharing class DAGraphIngestionService {

    public class IngestionException extends Exception {}

    public static final Integer MAX_CHUNK_SIZE = 131072; // LongTextArea field limit (128 KB)
    public static final Integer MAX_BATCH_CHUNKS = 10; // Bounded client-driven batch limit per call
    public static final Integer MAX_TOTAL_PAYLOAD_SIZE = 10485760; // 10 MB overall payload cap

    // Canonical Analysis Run Lifecycle States
    public static final String STATUS_QUEUED = 'QUEUED';
    public static final String STATUS_IN_PROGRESS = 'IN_PROGRESS';
    public static final String STATUS_VALIDATING = 'VALIDATING';
    public static final String STATUS_AVAILABLE = 'AVAILABLE';
    public static final String STATUS_FAILED = 'FAILED';
    public static final String STATUS_CANCELLED = 'CANCELLED';
    public static final String STATUS_EXPIRED = 'EXPIRED';

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

    /**
     * @description Creates a new analysis run with explicit initial state QUEUED.
     */
    public static String createAnalysisRun(String projectId, String runName) {
        return createAnalysisRun(projectId, runName, null, null);
    }

    public static String createAnalysisRun(String projectId, String runName, Integer expectedChunks, Long expectedTotalBytes) {
        if (String.isBlank(projectId) || String.isBlank(runName)) {
            throw new IllegalArgumentException('Project ID and run name are required.');
        }

        DA_Analysis_Run__c run = new DA_Analysis_Run__c(
            DA_Project__c = projectId,
            Name = runName.trim(),
            Status__c = STATUS_QUEUED,
            Run_Timestamp__c = Datetime.now(),
            Total_Chunks__c = expectedChunks != null ? expectedChunks : 0,
            Total_Payload_Size_Chars__c = expectedTotalBytes != null ? expectedTotalBytes : 0
        );
        insert as user run;
        return run.Id;
    }

    /**
     * @description Advances an analysis run to IN_PROGRESS when chunk upload commences.
     */
    public static void startUpload(String runId) {
        if (String.isBlank(runId)) {
            throw new IllegalArgumentException('Run ID is required.');
        }

        List<DA_Analysis_Run__c> runs = [
            SELECT Id, Status__c
            FROM DA_Analysis_Run__c
            WHERE Id = :runId
            WITH USER_MODE
            LIMIT 1
        ];

        if (runs.isEmpty()) {
            throw new IngestionException('Analysis run not found: ' + runId);
        }

        DA_Analysis_Run__c run = runs[0];
        if (run.Status__c == STATUS_QUEUED) {
            run.Status__c = STATUS_IN_PROGRESS;
            update as user run;
        }
    }

    public static Integer saveGraphChunks(String runId, List<String> chunkData) {
        return saveGraphChunks(runId, chunkData, 0, null);
    }

    /**
     * @description Bounded, failure-aware batch chunk persistence with project scoping,
     * unique Chunk_Key__c generation, identical retry acceptance, and conflicting retry rejection.
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

        // Validate run existence, status, and project ownership with WITH USER_MODE
        List<DA_Analysis_Run__c> runs;
        if (String.isNotBlank(projectId)) {
            runs = [
                SELECT Id, Status__c, DA_Project__c, Total_Chunks__c
                FROM DA_Analysis_Run__c
                WHERE Id = :runId
                  AND (DA_Project__c = :projectId OR DA_Project__r.Project_Key__c = :projectId)
                WITH USER_MODE
                LIMIT 1
            ];
        } else {
            runs = [
                SELECT Id, Status__c, DA_Project__c, Total_Chunks__c
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

        DA_Analysis_Run__c run = runs[0];
        // Cannot upload chunks to an already finalized or failed run
        if (run.Status__c == STATUS_AVAILABLE) {
            throw new IngestionException('Cannot upload chunks to an already finalized AVAILABLE run: ' + runId);
        }
        if (run.Status__c == STATUS_FAILED || run.Status__c == STATUS_CANCELLED || run.Status__c == STATUS_EXPIRED) {
            throw new IngestionException('Cannot upload chunks to a closed run with status: ' + run.Status__c);
        }

        // Transition QUEUED -> IN_PROGRESS on first chunk write
        if (run.Status__c == STATUS_QUEUED) {
            run.Status__c = STATUS_IN_PROGRESS;
            update as user run;
        }

        // Calculate expected chunk index bounds
        Integer endIndex = startIndex + chunkData.size() - 1;

        // Query existing chunk records in target range
        List<DA_Graph_Chunk__c> existingChunks = [
            SELECT Id, Chunk_Index__c, Chunk_Key__c, Payload_Data__c
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
            String chunkKey = runId + '_' + targetIndex;

            if (existingMap.containsKey(targetIndex)) {
                DA_Graph_Chunk__c existingRecord = existingMap.get(targetIndex);
                // Deterministic idempotency & conflicting retry check:
                if (existingRecord.Payload_Data__c == safePayload) {
                    // Identical retry -> idempotent no-op
                    continue;
                } else {
                    // Conflicting retry with different payload -> reject
                    throw new IngestionException('Conflicting payload for existing chunk at index ' + targetIndex + ' in run ' + runId);
                }
            } else {
                toInsert.add(new DA_Graph_Chunk__c(
                    DA_Analysis_Run__c = runId,
                    Name = 'Chunk ' + targetIndex,
                    Chunk_Index__c = targetIndex,
                    Chunk_Key__c = chunkKey,
                    Payload_Data__c = safePayload
                ));
            }
        }

        if (!toInsert.isEmpty()) {
            insert as user toInsert;
        }

        return toUpdate.size() + toInsert.size();
    }

    /**
     * @description Finalizes an analysis run. Validates chunk continuity, transitions to VALIDATING,
     * then AVAILABLE. An incomplete or failed run never displaces the last-known-good graph.
     */
    public static Boolean finalizeAnalysisRun(String runId, Integer expectedTotalChunks) {
        if (String.isBlank(runId)) {
            throw new IllegalArgumentException('Run ID is required for finalization.');
        }

        List<DA_Analysis_Run__c> runs = [
            SELECT Id, DA_Project__c, Status__c, Total_Chunks__c
            FROM DA_Analysis_Run__c
            WHERE Id = :runId
            WITH USER_MODE
            LIMIT 1
        ];

        if (runs.isEmpty()) {
            throw new IngestionException('Analysis run not found: ' + runId);
        }

        DA_Analysis_Run__c run = runs[0];
        run.Status__c = STATUS_VALIDATING;
        update as user run;

        // Count actual saved chunks
        List<DA_Graph_Chunk__c> actualChunks = [
            SELECT Id, Chunk_Index__c
            FROM DA_Graph_Chunk__c
            WHERE DA_Analysis_Run__c = :runId
            WITH USER_MODE
            ORDER BY Chunk_Index__c ASC
        ];

        Integer expected = (expectedTotalChunks != null && expectedTotalChunks > 0)
            ? expectedTotalChunks
            : (run.Total_Chunks__c != null ? (Integer) run.Total_Chunks__c : 0);

        if (actualChunks.size() != expected) {
            run.Status__c = STATUS_FAILED;
            update as user run;
            throw new IngestionException('Finalization failed: Expected ' + expected + ' chunks, but found ' + actualChunks.size());
        }

        // Validate chunk index continuity (0 to expected - 1)
        for (Integer idx = 0; idx < actualChunks.size(); idx++) {
            if (actualChunks[idx].Chunk_Index__c != idx) {
                run.Status__c = STATUS_FAILED;
                update as user run;
                throw new IngestionException('Finalization failed: Missing chunk index ' + idx);
            }
        }

        // Successfully validated: transition to AVAILABLE
        run.Status__c = STATUS_AVAILABLE;
        update as user run;
        return true;
    }

    /**
     * @description Fails an analysis run explicitly.
     */
    public static void failAnalysisRun(String runId, String errorMessage) {
        if (String.isBlank(runId)) {
            return;
        }

        List<DA_Analysis_Run__c> runs = [
            SELECT Id, Status__c
            FROM DA_Analysis_Run__c
            WHERE Id = :runId
            WITH USER_MODE
            LIMIT 1
        ];

        if (!runs.isEmpty()) {
            DA_Analysis_Run__c run = runs[0];
            run.Status__c = STATUS_FAILED;
            update as user run;
        }
    }

    /**
     * @description Retrieves the latest available (finalized) analysis run for a project.
     * Incomplete (QUEUED, IN_PROGRESS, VALIDATING) and failed runs are strictly excluded.
     * Preserves last-known-good graph.
     */
    public static DA_Analysis_Run__c getLatestAvailableRun(String projectId) {
        if (String.isBlank(projectId)) {
            return null;
        }

        List<DA_Analysis_Run__c> runs = [
            SELECT Id, Name, Status__c, Run_Timestamp__c, Total_Chunks__c, Commit_Hash__c,
                   Node_Count__c, Edge_Count__c, Cyclic_SCC_Count__c, Total_Payload_Size_Chars__c
            FROM DA_Analysis_Run__c
            WHERE DA_Project__c = :projectId
              AND Status__c = :STATUS_AVAILABLE
            WITH USER_MODE
            ORDER BY Run_Timestamp__c DESC, CreatedDate DESC
            LIMIT 1
        ];

        return runs.isEmpty() ? null : runs[0];
    }
}
