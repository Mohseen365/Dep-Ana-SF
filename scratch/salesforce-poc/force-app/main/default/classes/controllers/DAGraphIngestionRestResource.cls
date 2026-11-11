/**
 * @description Apex REST Ingestion Resource for Dependency Analyzer.
 * URL Mapping: /da/v1/ingest/* (full path: /services/apexrest/da/v1/ingest/*)
 * Routes:
 *   POST /init     - Initialize analysis run with security validation
 *   POST /chunks   - Batch chunk persistence with idempotency & wire limit enforcement
 *   POST /finalize - Validate chunk completeness, verify checksum, and finalize run
 *
 * Implements pre-flight wire-size check (< 5 MiB) to protect Apex heap,
 * integrates DAProjectSecurityService fail-closed, delegates to DAGraphIngestionService,
 * and outputs standard DAErrorResponse on failures.
 */
@RestResource(urlMapping='/da/v1/ingest/*')
global with sharing class DAGraphIngestionRestResource {

    // Error codes conforming to STAGE_J_AGENT_3_FINAL_REST_CONTRACT.md
    public static final String ERR_INVALID_PAYLOAD = 'ERR_INVALID_PAYLOAD';
    public static final String ERR_UNAUTHORIZED = 'ERR_UNAUTHORIZED';
    public static final String ERR_NOT_FOUND = 'ERR_NOT_FOUND';
    public static final String ERR_CONFLICTING_RETRY = 'ERR_CONFLICTING_RETRY';
    public static final String ERR_CHUNK_WIRE_OVERSIZE = 'ERR_CHUNK_WIRE_OVERSIZE';
    public static final String ERR_INTERNAL_ERROR = 'ERR_INTERNAL_ERROR';

    @HttpPost
    global static void doPost() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;

        if (res == null) {
            res = new RestResponse();
            RestContext.response = res;
        }

        res.addHeader('Content-Type', 'application/json');

        // Pre-flight wire-size validation before expensive string conversion / JSON deserialization
        if (req != null && req.requestBody != null) {
            Integer bodyBytes = req.requestBody.size();
            if (bodyBytes > DAGraphIngestionService.MAX_HTTP_REQUEST_BYTES) {
                sendError(res, 413, ERR_CHUNK_WIRE_OVERSIZE,
                    'Request body (' + bodyBytes + ' bytes) exceeds application wire limit of ' +
                    DAGraphIngestionService.MAX_HTTP_REQUEST_BYTES + ' bytes (5 MiB).',
                    'Dynamic downscaling required. Reduce batch size.');
                return;
            }
        }

        String requestPath = req != null && req.requestURI != null ? req.requestURI : '';
        String subPath = extractSubPath(requestPath);
        String bodyString = (req != null && req.requestBody != null) ? req.requestBody.toString() : '';

        try {
            if (subPath == 'init' || subPath == '/init') {
                handleInit(bodyString, res);
            } else if (subPath == 'chunks' || subPath == '/chunks') {
                handleChunks(bodyString, res);
            } else if (subPath == 'finalize' || subPath == '/finalize') {
                handleFinalize(bodyString, res);
            } else {
                sendError(res, 404, ERR_NOT_FOUND, 'Unknown ingestion endpoint path: ' + requestPath,
                    'Supported endpoints: /init, /chunks, /finalize');
            }
        } catch (JSONException jsonEx) {
            sendError(res, 400, ERR_INVALID_PAYLOAD, 'Malformed JSON payload: ' + jsonEx.getMessage(), null);
        } catch (IllegalArgumentException argEx) {
            sendError(res, 400, ERR_INVALID_PAYLOAD, argEx.getMessage(), null);
        } catch (DAGraphIngestionService.IngestionException ingEx) {
            if (ingEx.getMessage() != null && ingEx.getMessage().contains('Conflicting payload')) {
                sendError(res, 409, ERR_CONFLICTING_RETRY, ingEx.getMessage(), null);
            } else {
                sendError(res, 400, ERR_INVALID_PAYLOAD, ingEx.getMessage(), null);
            }
        } catch (Exception ex) {
            sendError(res, 500, ERR_INTERNAL_ERROR, 'Internal server error: ' + ex.getMessage(), ex.getTypeName());
        }
    }

    /**
     * Extracts the sub-path following /da/v1/ingest/
     */
    private static String extractSubPath(String uri) {
        if (String.isBlank(uri)) {
            return '';
        }
        String normalized = uri.toLowerCase();
        Integer ingestIdx = normalized.indexOf('/da/v1/ingest');
        if (ingestIdx != -1) {
            String remainder = uri.substring(ingestIdx + '/da/v1/ingest'.length());
            return remainder.replaceAll('^/+', '');
        }
        return uri;
    }

    /**
     * Resolves project record ID from either 15/18 character ID or Project_Key__c.
     */
    private static Id resolveProjectId(String projectIdOrKey) {
        if (String.isBlank(projectIdOrKey)) {
            return null;
        }
        String trimmed = projectIdOrKey.trim();
        if ((trimmed.length() == 15 || trimmed.length() == 18) && trimmed.replaceAll('[a-zA-Z0-9]', '').length() == 0) {
            try {
                return (Id) trimmed;
            } catch (Exception e) {
                // Not a valid ID, fall back to key query
            }
        }

        List<DA_Project__c> projs = [
            SELECT Id
            FROM DA_Project__c
            WHERE Project_Key__c = :trimmed
            WITH USER_MODE
            LIMIT 1
        ];

        return projs.isEmpty() ? null : projs[0].Id;
    }

    /**
     * Handles POST /da/v1/ingest/init
     */
    private static void handleInit(String bodyString, RestResponse res) {
        if (String.isBlank(bodyString)) {
            sendError(res, 400, ERR_INVALID_PAYLOAD, 'Request body cannot be empty for /init', null);
            return;
        }

        DAGraphIngestionDTO.InitRunRequest req = (DAGraphIngestionDTO.InitRunRequest) JSON.deserialize(
            bodyString,
            DAGraphIngestionDTO.InitRunRequest.class
        );

        if (req == null || String.isBlank(req.projectId)) {
            sendError(res, 400, ERR_INVALID_PAYLOAD, 'Field projectId is required.', null);
            return;
        }

        Id projId = resolveProjectId(req.projectId);
        if (projId == null) {
            sendError(res, 404, ERR_NOT_FOUND, 'Target project not found: ' + req.projectId, null);
            return;
        }

        if (req.expectedChunks == null) {
            sendError(res, 400, ERR_INVALID_PAYLOAD, 'Field expectedChunks is required.', null);
            return;
        }

        if (req.expectedChunks < 0) {
            sendError(res, 400, ERR_INVALID_PAYLOAD, 'Field expectedChunks cannot be negative.', null);
            return;
        }

        if (req.expectedTotalBytes == null) {
            sendError(res, 400, ERR_INVALID_PAYLOAD, 'Field expectedTotalBytes is required.', null);
            return;
        }

        if (req.expectedTotalBytes < 0) {
            sendError(res, 400, ERR_INVALID_PAYLOAD, 'Field expectedTotalBytes cannot be negative.', null);
            return;
        }

        // Validate security access
        DAProjectSecurityService.ProjectAccessContext auth = DAProjectSecurityService.validateProjectAccessForCurrentUser(
            projId,
            DAProjectSecurityService.SCOPE_ANALYSIS_UPLOAD
        );

        if (!auth.hasAccess) {
            sendError(res, 403, ERR_UNAUTHORIZED,
                'Unauthorized: User lacks ' + DAProjectSecurityService.SCOPE_ANALYSIS_UPLOAD + ' permission on project.',
                auth.errorMessage);
            return;
        }

        String runName = String.isNotBlank(req.runName)
            ? req.runName.trim()
            : ('Analysis Run ' + Datetime.now().format('yyyy-MM-dd HH:mm:ss'));

        String runId = DAGraphIngestionService.createAnalysisRun(
            String.valueOf(projId),
            runName,
            req.expectedChunks,
            req.expectedTotalBytes,
            req.commitHash,
            req.expectedChecksum
        );

        Boolean isExplicitEmpty = (req.expectedChunks == 0 && req.expectedTotalBytes == 0);
        String initialStatus = isExplicitEmpty ? DAGraphIngestionService.STATUS_EMPTY : DAGraphIngestionService.STATUS_QUEUED;

        DAGraphIngestionDTO.InitRunResponse respDto = new DAGraphIngestionDTO.InitRunResponse(runId, initialStatus);
        res.statusCode = 200;
        res.responseBody = Blob.valueOf(JSON.serialize(respDto));
    }

    /**
     * Handles POST /da/v1/ingest/chunks
     */
    private static void handleChunks(String bodyString, RestResponse res) {
        if (String.isBlank(bodyString)) {
            sendError(res, 400, ERR_INVALID_PAYLOAD, 'Request body cannot be empty for /chunks', null);
            return;
        }

        DAGraphIngestionDTO.BatchChunkUploadRequest req = (DAGraphIngestionDTO.BatchChunkUploadRequest) JSON.deserialize(
            bodyString,
            DAGraphIngestionDTO.BatchChunkUploadRequest.class
        );

        if (req == null || String.isBlank(req.runId)) {
            sendError(res, 400, ERR_INVALID_PAYLOAD, 'Field runId is required.', null);
            return;
        }

        if (req.chunks == null || req.chunks.isEmpty()) {
            sendError(res, 400, ERR_INVALID_PAYLOAD, 'Chunks list cannot be null or empty.', null);
            return;
        }

        if (req.chunks.size() > DAGraphIngestionService.MAX_BATCH_CHUNKS) {
            sendError(res, 400, ERR_INVALID_PAYLOAD,
                'Batch chunk count (' + req.chunks.size() + ') exceeds limit of ' +
                DAGraphIngestionService.MAX_BATCH_CHUNKS + ' chunks per call.', null);
            return;
        }

        // Query run and project relationship
        List<DA_Analysis_Run__c> runs = [
            SELECT Id, DA_Project__c, Status__c, Total_Chunks__c, Total_Payload_Size_Chars__c
            FROM DA_Analysis_Run__c
            WHERE Id = :req.runId
            WITH USER_MODE
            LIMIT 1
        ];

        if (runs.isEmpty()) {
            sendError(res, 404, ERR_NOT_FOUND, 'Analysis run not found: ' + req.runId, null);
            return;
        }

        DA_Analysis_Run__c run = runs[0];

        // Security authorization check on run's parent project
        DAProjectSecurityService.ProjectAccessContext auth = DAProjectSecurityService.validateProjectAccessForCurrentUser(
            run.DA_Project__c,
            DAProjectSecurityService.SCOPE_ANALYSIS_UPLOAD
        );

        if (!auth.hasAccess) {
            sendError(res, 403, ERR_UNAUTHORIZED,
                'Unauthorized: User lacks ' + DAProjectSecurityService.SCOPE_ANALYSIS_UPLOAD + ' permission on project.',
                auth.errorMessage);
            return;
        }

        if (run.Status__c == DAGraphIngestionService.STATUS_AVAILABLE) {
            sendError(res, 409, ERR_CONFLICTING_RETRY, 'Cannot upload chunks to an already finalized AVAILABLE run: ' + req.runId, null);
            return;
        }

        if (run.Status__c == DAGraphIngestionService.STATUS_EMPTY) {
            sendError(res, 409, ERR_CONFLICTING_RETRY, 'Cannot upload chunks to an EMPTY run: ' + req.runId, null);
            return;
        }

        if (run.Status__c == DAGraphIngestionService.STATUS_FAILED ||
            run.Status__c == DAGraphIngestionService.STATUS_CANCELLED ||
            run.Status__c == DAGraphIngestionService.STATUS_EXPIRED) {
            sendError(res, 409, ERR_CONFLICTING_RETRY, 'Cannot upload chunks to a closed run with status: ' + run.Status__c, null);
            return;
        }

        // Validate chunk contents and build payload list
        List<String> chunkStrings = new List<String>();
        List<Integer> chunkIndices = new List<Integer>();
        Integer minIndex = null;
        Integer maxIndex = null;

        for (DAGraphIngestionDTO.ChunkItem item : req.chunks) {
            if (item.chunkIndex == null || item.chunkIndex < 0) {
                sendError(res, 400, ERR_INVALID_PAYLOAD, 'Invalid chunk index: ' + item.chunkIndex, null);
                return;
            }

            if (run.Total_Chunks__c != null && item.chunkIndex >= run.Total_Chunks__c) {
                sendError(res, 400, ERR_INVALID_PAYLOAD,
                    'Chunk index ' + item.chunkIndex + ' is out of bounds for expected count ' + run.Total_Chunks__c, null);
                return;
            }

            if (item.payloadData != null && item.payloadData.length() > DAGraphIngestionService.MAX_CHUNK_SIZE) {
                sendError(res, 400, ERR_INVALID_PAYLOAD,
                    'Chunk at index ' + item.chunkIndex + ' exceeds maximum permitted size of ' +
                    DAGraphIngestionService.MAX_CHUNK_SIZE + ' characters.', null);
                return;
            }

            chunkStrings.add(item.payloadData != null ? item.payloadData : '');
            chunkIndices.add(item.chunkIndex);

            if (minIndex == null || item.chunkIndex < minIndex) {
                minIndex = item.chunkIndex;
            }
            if (maxIndex == null || item.chunkIndex > maxIndex) {
                maxIndex = item.chunkIndex;
            }
        }

        // Save chunks via canonical DAGraphIngestionService
        Integer persistedCount = DAGraphIngestionService.saveGraphChunks(
            req.runId,
            chunkStrings,
            minIndex,
            String.valueOf(run.DA_Project__c)
        );

        // Query total persisted chunks for this run
        Integer totalPersisted = [
            SELECT COUNT()
            FROM DA_Graph_Chunk__c
            WHERE DA_Analysis_Run__c = :req.runId
            WITH USER_MODE
        ];

        DAGraphIngestionDTO.BatchChunkUploadResponse respDto = new DAGraphIngestionDTO.BatchChunkUploadResponse();
        respDto.runId = req.runId;
        respDto.persistedChunks = chunkIndices;
        respDto.totalPersisted = totalPersisted;
        respDto.status = DAGraphIngestionService.STATUS_IN_PROGRESS;
        respDto.isComplete = (run.Total_Chunks__c != null && totalPersisted >= run.Total_Chunks__c);

        res.statusCode = 200;
        res.responseBody = Blob.valueOf(JSON.serialize(respDto));
    }

    /**
     * Handles POST /da/v1/ingest/finalize
     */
    private static void handleFinalize(String bodyString, RestResponse res) {
        if (String.isBlank(bodyString)) {
            sendError(res, 400, ERR_INVALID_PAYLOAD, 'Request body cannot be empty for /finalize', null);
            return;
        }

        DAGraphIngestionDTO.FinalizeRunRequest req = (DAGraphIngestionDTO.FinalizeRunRequest) JSON.deserialize(
            bodyString,
            DAGraphIngestionDTO.FinalizeRunRequest.class
        );

        if (req == null || String.isBlank(req.runId)) {
            sendError(res, 400, ERR_INVALID_PAYLOAD, 'Field runId is required.', null);
            return;
        }

        List<DA_Analysis_Run__c> runs = [
            SELECT Id, DA_Project__c, Status__c, Total_Chunks__c, Total_Payload_Size_Chars__c, Payload_Checksum__c,
                   Node_Count__c, Edge_Count__c, Cyclic_SCC_Count__c
            FROM DA_Analysis_Run__c
            WHERE Id = :req.runId
            WITH USER_MODE
            LIMIT 1
        ];

        if (runs.isEmpty()) {
            sendError(res, 404, ERR_NOT_FOUND, 'Analysis run not found: ' + req.runId, null);
            return;
        }

        DA_Analysis_Run__c run = runs[0];

        // Security authorization check for finalization
        DAProjectSecurityService.ProjectAccessContext auth = DAProjectSecurityService.validateProjectAccessForCurrentUser(
            run.DA_Project__c,
            DAProjectSecurityService.SCOPE_ANALYSIS_FINALIZE
        );

        if (!auth.hasAccess) {
            sendError(res, 403, ERR_UNAUTHORIZED,
                'Unauthorized: User lacks ' + DAProjectSecurityService.SCOPE_ANALYSIS_FINALIZE + ' permission on project.',
                auth.errorMessage);
            return;
        }

        // Delegate to authoritative finalization service
        DAGraphIngestionService.FinalizationResult result = DAGraphIngestionService.finalizeAnalysisRunWithResult(
            req.runId,
            req.expectedChunks,
            req.expectedChecksum
        );

        // Re-query updated run record for fresh status & metrics
        List<DA_Analysis_Run__c> updatedRuns = [
            SELECT Id, Status__c, Node_Count__c, Edge_Count__c, Cyclic_SCC_Count__c
            FROM DA_Analysis_Run__c
            WHERE Id = :req.runId
            WITH USER_MODE
            LIMIT 1
        ];

        DA_Analysis_Run__c updatedRun = updatedRuns.isEmpty() ? run : updatedRuns[0];

        DAGraphIngestionDTO.FinalizeRunResponse respDto = new DAGraphIngestionDTO.FinalizeRunResponse();
        respDto.runId = req.runId;
        respDto.status = updatedRun.Status__c;
        respDto.success = result.isSuccess;
        respDto.nodeCount = updatedRun.Node_Count__c != null ? (Integer) updatedRun.Node_Count__c : 0;
        respDto.edgeCount = updatedRun.Edge_Count__c != null ? (Integer) updatedRun.Edge_Count__c : 0;
        respDto.cyclicSccCount = updatedRun.Cyclic_SCC_Count__c != null ? (Integer) updatedRun.Cyclic_SCC_Count__c : 0;
        respDto.errorMessage = result.errorMessage;

        res.statusCode = 200;
        res.responseBody = Blob.valueOf(JSON.serialize(respDto));
    }

    /**
     * Serializes DAErrorResponse into the RestResponse body with the given HTTP status.
     */
    private static void sendError(RestResponse res, Integer httpStatus, String errorCode, String message, String details) {
        res.statusCode = httpStatus;
        DAErrorResponse err = new DAErrorResponse(errorCode, message, details);
        res.responseBody = Blob.valueOf(JSON.serialize(err));
    }
}
