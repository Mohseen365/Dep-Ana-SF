/**
 * DTO representing an Analysis Run execution snapshot with metrics and deltas.
 */
public with sharing class DAAnalysisRunDTO {
    @AuraEnabled public Id runId { get; set; }
    @AuraEnabled public Id projectId { get; set; }
    @AuraEnabled public String commitHash { get; set; }
    @AuraEnabled public DateTime runTimestamp { get; set; }
    @AuraEnabled public String status { get; set; }
    @AuraEnabled public Integer nodeCount { get; set; }
    @AuraEnabled public Integer edgeCount { get; set; }
    @AuraEnabled public Integer cyclicSccCount { get; set; }
    @AuraEnabled public Integer totalChunks { get; set; }
    @AuraEnabled public Long totalPayloadSizeChars { get; set; }
    @AuraEnabled public Integer nodeDelta { get; set; }
    @AuraEnabled public Integer edgeDelta { get; set; }
    @AuraEnabled public Integer cyclicSccDelta { get; set; }

    public DAAnalysisRunDTO() {
        this.nodeDelta = 0;
        this.edgeDelta = 0;
        this.cyclicSccDelta = 0;
    }
}
