/**
 * @description Standardized Graph Data Transfer Object for Dependency Analyzer POC
 */
public inherited sharing class DAGraphDTO {
    @AuraEnabled public String projectId { get; set; }
    @AuraEnabled public String projectKey { get; set; }
    @AuraEnabled public String projectName { get; set; }
    @AuraEnabled public String runId { get; set; }
    @AuraEnabled public String commitHash { get; set; }
    @AuraEnabled public Integer nodeCount { get; set; }
    @AuraEnabled public Integer edgeCount { get; set; }
    @AuraEnabled public Boolean isChunked { get; set; }
    @AuraEnabled public Integer totalChunks { get; set; }
    @AuraEnabled public String rawPayload { get; set; }
    @AuraEnabled public List<String> chunks { get; set; }

    public DAGraphDTO() {
        this.isChunked = false;
        this.totalChunks = 0;
        this.chunks = new List<String>();
    }
}
