/**
 * @description Standardized Error Response Envelope for Dependency Analyzer API
 */
public inherited sharing class DAErrorResponse {
    @AuraEnabled public String errorCode { get; set; }
    @AuraEnabled public String errorMessage { get; set; }
    @AuraEnabled public String errorDetails { get; set; }
    @AuraEnabled public Long timestamp { get; set; }

    public DAErrorResponse(String code, String message, String details) {
        this.errorCode = code;
        this.errorMessage = message;
        this.errorDetails = details;
        this.timestamp = System.currentTimeMillis();
    }
}