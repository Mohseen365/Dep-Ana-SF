/**
 * Controller exposing Analysis History methods to LWC.
 */
public with sharing class DAAnalysisHistoryController {
    @AuraEnabled(cacheable=true)
    public static List<DAAnalysisRunDTO> getAnalysisRuns(Id projectId, Integer queryLimit, Integer queryOffset) {
        try {
            return DAAnalysisHistoryService.getAnalysisRuns(projectId, queryLimit, queryOffset);
        } catch (Exception ex) {
            throw new AuraHandledException('Failed to retrieve analysis runs: ' + ex.getMessage());
        }
    }
}
