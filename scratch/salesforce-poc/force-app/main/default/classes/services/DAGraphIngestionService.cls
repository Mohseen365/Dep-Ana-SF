/**
 * @description Ingestion service handling creation of projects, analysis runs, and graph chunk persistence
 */
public with sharing class DAGraphIngestionService {

    public static String createProject(String projectName, String projectKey) {
        if (String.isBlank(projectName) || String.isBlank(projectKey)) {
            throw new IllegalArgumentException('Project name and project key are required.');
        }

        DA_Project__c proj = new DA_Project__c(
            Name = projectName,
            Project_Key__c = projectKey
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
            Name = runName
        );
        insert as user run;
        return run.Id;
    }

    public static Integer saveGraphChunks(String runId, List<String> chunkData) {
        if (String.isBlank(runId) || chunkData == null || chunkData.isEmpty()) {
            return 0;
        }

        List<DA_Graph_Chunk__c> records = new List<DA_Graph_Chunk__c>();
        for (Integer i = 0; i < chunkData.size(); i++) {
            records.add(new DA_Graph_Chunk__c(
                DA_Analysis_Run__c = runId,
                Name = 'Chunk ' + i,
                Chunk_Index__c = i,
                Payload_Data__c = chunkData[i]
            ));
        }

        insert as user records;
        return records.size();
    }
}
