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

    @AuraEnabled(cacheable=true)
    public static DAGraphDTO getLatestGraphForProject(String projectId) {
        if (String.isBlank(projectId)) {
            throw new AuraHandledException('Project ID is required.');
        }

        List<DA_Analysis_Run__c> runs = [
            SELECT Id, Name, DA_Project__c, DA_Project__r.Name, DA_Project__r.Project_Key__c
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

        List<DA_Graph_Chunk__c> chunks = [
            SELECT Chunk_Index__c, Payload_Data__c
            FROM DA_Graph_Chunk__c
            WHERE DA_Analysis_Run__c = :run.Id
            WITH USER_MODE
            ORDER BY Chunk_Index__c ASC
        ];

        if (!chunks.isEmpty()) {
            if (!DAGraphChunkService.verifyChunkSequence(chunks)) {
                throw new AuraHandledException('Corrupted or missing payload chunks detected.');
            }
            dto.isChunked = true;
            dto.totalChunks = chunks.size();
            for (DA_Graph_Chunk__c chunk : chunks) {
                dto.chunks.add(chunk.Payload_Data__c);
            }
        }

        return dto;
    }
}
