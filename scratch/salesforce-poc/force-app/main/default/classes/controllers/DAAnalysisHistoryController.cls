/**
 * Controller exposing Analysis History methods to LWC.
 */
public with sharing class DAAnalysisHistoryController {
    /**
     * @description Fetches analysis runs accepting either Salesforce Id or Project Key (String)
     */
    @AuraEnabled(cacheable=true)
    public static List<DAAnalysisRunDTO> getAnalysisRuns(String projectId, Integer queryLimit, Integer queryOffset) {
        try {
            return DAAnalysisHistoryService.getAnalysisRuns(projectId, queryLimit, queryOffset);
        } catch (Exception ex) {
            throw new AuraHandledException('Failed to retrieve analysis runs: ' + ex.getMessage());
        }
    }

    /**
     * @description Retained for backward compatibility with Id-typed invocations
     */
    public static List<DAAnalysisRunDTO> getAnalysisRuns(Id projectId, Integer queryLimit, Integer queryOffset) {
        return DAAnalysisHistoryService.getAnalysisRuns(projectId, queryLimit, queryOffset);
    }
}
