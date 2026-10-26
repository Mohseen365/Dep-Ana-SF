/**
 * @description Ingestion service handling creation of projects, analysis runs, and graph chunk persistence
 */
public with sharing class DAGraphIngestionService {

    public static final Integer MAX_CHUNK_SIZE = 131072; // LongTextArea field limit

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
        if (String.isBlank(runId) || chunkData == null || chunkData.isEmpty()) {
            return 0;
        }

        // Validate run existence using WITH USER_MODE
        List<DA_Analysis_Run__c> runs = [
            SELECT Id
            FROM DA_Analysis_Run__c
            WHERE Id = :runId
            WITH USER_MODE
            LIMIT 1
        ];

        if (runs.isEmpty()) {
            throw new IllegalArgumentException('Invalid or unauthorized Run ID: ' + runId);
        }

        List<DA_Graph_Chunk__c> records = new List<DA_Graph_Chunk__c>();
        for (Integer i = 0; i < chunkData.size(); i++) {
            String payloadStr = chunkData[i];
            if (payloadStr != null && payloadStr.length() > MAX_CHUNK_SIZE) {
                throw new IllegalArgumentException('Chunk at index ' + i + ' exceeds maximum allowed size of ' + MAX_CHUNK_SIZE + ' characters.');
            }
            records.add(new DA_Graph_Chunk__c(
                DA_Analysis_Run__c = runId,
                Name = 'Chunk ' + i,
                Chunk_Index__c = i,
                Payload_Data__c = payloadStr != null ? payloadStr : ''
            ));
        }

        insert as user records;
        return records.size();
    }
}
