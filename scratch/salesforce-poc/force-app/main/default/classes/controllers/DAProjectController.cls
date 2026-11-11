/**
 * @description Apex Controller providing AuraEnabled project creation, validation, and import management endpoints.
 * Governed by Agent 7 under Workstream D (GAP-WKF-02).
 * Integrates DAProjectSecurityService for authorization checks and DAGraphIngestionService for ingestion lifecycle.
 */
public with sharing class DAProjectController {

    public class ProjectCreationResult {
        @AuraEnabled public Boolean isSuccess;
        @AuraEnabled public String projectId;
        @AuraEnabled public String projectKey;
        @AuraEnabled public String projectName;
        @AuraEnabled public String errorMessage;

        public ProjectCreationResult(Boolean isSuccess, String projectId, String projectKey, String projectName, String errorMessage) {
            this.isSuccess = isSuccess;
            this.projectId = projectId;
            this.projectKey = projectKey;
            this.projectName = projectName;
            this.errorMessage = errorMessage;
        }
    }

    public class ImportRunInitResult {
        @AuraEnabled public Boolean isSuccess;
        @AuraEnabled public String runId;
        @AuraEnabled public String errorMessage;

        public ImportRunInitResult(Boolean isSuccess, String runId, String errorMessage) {
            this.isSuccess = isSuccess;
            this.runId = runId;
            this.errorMessage = errorMessage;
        }
    }

    /**
     * @description Checks if a given projectKey is unique and available for new project registration.
     */
    @AuraEnabled(cacheable=false)
    public static Boolean isProjectKeyAvailable(String projectKey) {
        if (String.isBlank(projectKey)) {
            return false;
        }
        String cleanKey = projectKey.trim().toLowerCase();
        List<DA_Project__c> existing = [
            SELECT Id
            FROM DA_Project__c
            WHERE Project_Key__c = :cleanKey
            WITH USER_MODE
            LIMIT 1
        ];
        return existing.isEmpty();
    }

    /**
     * @description Creates a new DA_Project__c record with duplicate detection and security validation.
     * Prevents duplicate project keys and enforces Private OWD project ownership.
     */
    @AuraEnabled
    public static ProjectCreationResult createProject(String name, String projectKey, String repositoryUrl, String description) {
        if (String.isBlank(name)) {
            return new ProjectCreationResult(false, null, null, null, 'Project Name is required.');
        }

        String cleanKey = String.isNotBlank(projectKey) ? projectKey.trim().toLowerCase() : slugify(name);
        if (String.isBlank(cleanKey)) {
            return new ProjectCreationResult(false, null, null, null, 'Project Key cannot be empty or invalid.');
        }

        // Check for duplicates
        List<DA_Project__c> duplicates = [
            SELECT Id, Name, Project_Key__c
            FROM DA_Project__c
            WHERE Project_Key__c = :cleanKey
            WITH USER_MODE
            LIMIT 1
        ];

        if (!duplicates.isEmpty()) {
            return new ProjectCreationResult(false, null, cleanKey, duplicates[0].Name, 'A project with Project Key \'' + cleanKey + '\' already exists.');
        }

        try {
            DA_Project__c newProject = new DA_Project__c(
                Name = name.trim(),
                Project_Key__c = cleanKey,
                Repository_Url__c = String.isNotBlank(repositoryUrl) ? repositoryUrl.trim() : null,
                Status__c = 'Active'
            );

            insert as user newProject;

            return new ProjectCreationResult(true, newProject.Id, cleanKey, newProject.Name, null);
        } catch (Exception ex) {
            return new ProjectCreationResult(false, null, cleanKey, null, 'Failed to create project: ' + ex.getMessage());
        }
    }

    /**
     * @description Initiates a graph analysis run for a given project after verifying caller authorization.
     * Enforces DAProjectSecurityService.validateProjectAccessForCurrentUser with SCOPE_ANALYSIS_UPLOAD.
     */
    @AuraEnabled
    public static ImportRunInitResult initiateAnalysisRun(
        String projectId,
        String runName,
        Integer expectedChunks,
        Long expectedTotalBytes,
        String commitHash,
        String expectedSha256Checksum
    ) {
        if (String.isBlank(projectId)) {
            return new ImportRunInitResult(false, null, 'Project ID is required.');
        }

        // Verify authorization
        DAProjectSecurityService.ProjectAccessContext auth = DAProjectSecurityService.validateProjectAccessForCurrentUser(
            (Id) projectId,
            DAProjectSecurityService.SCOPE_ANALYSIS_UPLOAD
        );

        if (!auth.hasAccess) {
            return new ImportRunInitResult(false, null, 'Unauthorized: User does not have ANALYSIS_UPLOAD permission for this project.');
        }

        try {
            String defaultRunName = String.isNotBlank(runName) ? runName.trim() : ('Analysis Run ' + Datetime.now().format('yyyy-MM-dd HH:mm:ss'));
            String runId = DAGraphIngestionService.createAnalysisRun(
                projectId,
                defaultRunName,
                expectedChunks,
                expectedTotalBytes,
                commitHash,
                expectedSha256Checksum
            );
            return new ImportRunInitResult(true, runId, null);
        } catch (Exception ex) {
            return new ImportRunInitResult(false, null, 'Failed to initiate analysis run: ' + ex.getMessage());
        }
    }

    /**
     * @description Uploads a batch of chunks for an active analysis run.
     */
    @AuraEnabled
    public static String uploadChunks(String runId, List<Map<String, Object>> chunkList) {
        if (String.isBlank(runId) || chunkList == null || chunkList.isEmpty()) {
            throw new AuraHandledException('Run ID and non-empty chunk list are required.');
        }

        List<DAGraphIngestionService.GraphChunkPayload> payloads = new List<DAGraphIngestionService.GraphChunkPayload>();
        for (Map<String, Object> item : chunkList) {
            DAGraphIngestionService.GraphChunkPayload p = new DAGraphIngestionService.GraphChunkPayload();
            p.chunkIndex = (Integer) item.get('chunkIndex');
            p.payloadData = (String) item.get('payloadData');
            payloads.add(p);
        }

        try {
            DAGraphIngestionService.saveGraphChunks(runId, payloads);
            return 'SUCCESS';
        } catch (Exception ex) {
            throw new AuraHandledException('Chunk upload failed: ' + ex.getMessage());
        }
    }

    /**
     * @description Finalizes an analysis run and transitions status to AVAILABLE if valid.
     */
    @AuraEnabled
    public static DAGraphIngestionService.FinalizationResult finalizeRun(String runId, Integer expectedChunks, String expectedChecksum) {
        if (String.isBlank(runId)) {
            throw new AuraHandledException('Run ID is required.');
        }

        return DAGraphIngestionService.finalizeAnalysisRunWithResult(runId, expectedChunks, expectedChecksum);
    }

    /**
     * @description Utility to generate deterministic URL/key slug from project name.
     */
    private static String slugify(String input) {
        if (String.isBlank(input)) {
            return '';
        }
        String slug = input.trim().toLowerCase();
        slug = slug.replaceAll('[^a-z0-9\\s-]', '');
        slug = slug.replaceAll('\\s+', '-');
        slug = slug.replaceAll('-+', '-');
        return slug;
    }
}
