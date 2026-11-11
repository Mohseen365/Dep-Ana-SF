/**
 * @description Direct Apex unit test suite for DAGraphIngestionRestResource.
 * Exercises all REST endpoints (/init, /chunks, /finalize), DTO handling, security integration,
 * wire ceiling enforcement, idempotency, failure persistence, EMPTY run semantics, and last-known-good graph preservation.
 * Conforms to STAGE_J_AGENT_3_FINAL_REST_CONTRACT.md.
 */
@IsTest
private class DAGraphIngestionRestResourceTest {

    @TestSetup
    static void setupTestData() {
        DA_Project__c proj = new DA_Project__c(
            Name = 'Alpha Project',
            Project_Key__c = 'alpha-proj',
            Status__c = 'Active'
        );
        insert proj;

        DA_Project__c projBeta = new DA_Project__c(
            Name = 'Beta Project',
            Project_Key__c = 'beta-proj',
            Status__c = 'Active'
        );
        insert projBeta;

        // Existing AVAILABLE run on Alpha to verify last-known-good graph preservation
        DA_Analysis_Run__c lkgRun = new DA_Analysis_Run__c(
            DA_Project__c = proj.Id,
            Name = 'LKG Run',
            Status__c = 'AVAILABLE',
            Total_Chunks__c = 1,
            Total_Payload_Size_Chars__c = 50L,
            Node_Count__c = 10,
            Edge_Count__c = 15,
            Cyclic_SCC_Count__c = 1
        );
        insert lkgRun;

        insert new DA_Graph_Chunk__c(
            DA_Analysis_Run__c = lkgRun.Id,
            Chunk_Index__c = 0,
            Chunk_Key__c = lkgRun.Id + '_0',
            Payload_Data__c = '{"nodes":[{"id":"n1"}],"edges":[]}'
        );
    }

    private static void setupRestContext(String endpoint, String requestBody) {
        RestRequest req = new RestRequest();
        req.requestURI = '/services/apexrest/da/v1/ingest' + endpoint;
        req.httpMethod = 'POST';
        if (requestBody != null) {
            req.requestBody = Blob.valueOf(requestBody);
        }
        RestContext.request = req;
        RestContext.response = new RestResponse();
    }

    @IsTest
    static void testInitRunSuccess() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'alpha-proj' LIMIT 1];

        DAGraphIngestionDTO.InitRunRequest initReq = new DAGraphIngestionDTO.InitRunRequest();
        initReq.projectId = proj.Id;
        initReq.runName = 'Test Ingestion Run';
        initReq.commitHash = 'abc1234567890123456789012345678901234567';
        initReq.expectedChunks = 2;
        initReq.expectedTotalBytes = 500L;
        initReq.expectedChecksum = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

        setupRestContext('/init', JSON.serialize(initReq));

        Test.startTest();
        DAGraphIngestionRestResource.doPost();
        Test.stopTest();

        RestResponse res = RestContext.response;
        Assert.areEqual(200, res.statusCode, 'Expected 200 OK on init');

        DAGraphIngestionDTO.InitRunResponse respDto = (DAGraphIngestionDTO.InitRunResponse) JSON.deserialize(
            res.responseBody.toString(),
            DAGraphIngestionDTO.InitRunResponse.class
        );

        Assert.isNotNull(respDto.runId, 'runId must not be null');
        Assert.areEqual(DAGraphIngestionService.STATUS_QUEUED, respDto.status);
        Assert.areEqual(DAGraphIngestionService.MAX_CHUNK_SIZE, respDto.chunkSizeLimit);
    }

    @IsTest
    static void testInitRunExplicitEmpty() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'alpha-proj' LIMIT 1];

        DAGraphIngestionDTO.InitRunRequest initReq = new DAGraphIngestionDTO.InitRunRequest();
        initReq.projectId = proj.Id;
        initReq.expectedChunks = 0;
        initReq.expectedTotalBytes = 0L;

        setupRestContext('/init', JSON.serialize(initReq));

        Test.startTest();
        DAGraphIngestionRestResource.doPost();
        Test.stopTest();

        RestResponse res = RestContext.response;
        Assert.areEqual(200, res.statusCode);

        DAGraphIngestionDTO.InitRunResponse respDto = (DAGraphIngestionDTO.InitRunResponse) JSON.deserialize(
            res.responseBody.toString(),
            DAGraphIngestionDTO.InitRunResponse.class
        );

        Assert.areEqual(DAGraphIngestionService.STATUS_EMPTY, respDto.status, '0 chunks / 0 bytes must initialize as EMPTY');
    }

    @IsTest
    static void testInitRunMissingFields() {
        setupRestContext('/init', '{}');

        Test.startTest();
        DAGraphIngestionRestResource.doPost();
        Test.stopTest();

        RestResponse res = RestContext.response;
        Assert.areEqual(400, res.statusCode, 'Missing projectId must return 400');
        Assert.isTrue(res.responseBody.toString().contains('ERR_INVALID_PAYLOAD'));
    }

    @IsTest
    static void testInitRunProjectNotFound() {
        DAGraphIngestionDTO.InitRunRequest initReq = new DAGraphIngestionDTO.InitRunRequest();
        initReq.projectId = 'NON_EXISTENT_PROJECT_KEY';
        initReq.expectedChunks = 1;
        initReq.expectedTotalBytes = 100L;

        setupRestContext('/init', JSON.serialize(initReq));

        Test.startTest();
        DAGraphIngestionRestResource.doPost();
        Test.stopTest();

        RestResponse res = RestContext.response;
        Assert.areEqual(404, res.statusCode, 'Non-existent project must return 404');
        Assert.isTrue(res.responseBody.toString().contains('ERR_NOT_FOUND'));
    }

    @IsTest
    static void testInitRunOversizedPayloadViolation() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'alpha-proj' LIMIT 1];

        DAGraphIngestionDTO.InitRunRequest initReq = new DAGraphIngestionDTO.InitRunRequest();
        initReq.projectId = proj.Id;
        initReq.expectedChunks = 100;
        initReq.expectedTotalBytes = DAGraphIngestionService.MAX_TOTAL_PAYLOAD_CHARS + 1000L; // Exceeds cap

        setupRestContext('/init', JSON.serialize(initReq));

        Test.startTest();
        DAGraphIngestionRestResource.doPost();
        Test.stopTest();

        RestResponse res = RestContext.response;
        Assert.areEqual(400, res.statusCode);
        Assert.isTrue(res.responseBody.toString().contains('ERR_INVALID_PAYLOAD'));
    }

    @IsTest
    static void testChunkUploadSuccessAndIdempotentRetry() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'alpha-proj' LIMIT 1];
        String runId = DAGraphIngestionService.createAnalysisRun(proj.Id, 'Chunk Test Run', 2, 200L);

        DAGraphIngestionDTO.BatchChunkUploadRequest chunkReq = new DAGraphIngestionDTO.BatchChunkUploadRequest();
        chunkReq.runId = runId;
        chunkReq.chunks = new List<DAGraphIngestionDTO.ChunkItem>();

        DAGraphIngestionDTO.ChunkItem c0 = new DAGraphIngestionDTO.ChunkItem();
        c0.chunkIndex = 0;
        c0.payloadData = '{"nodes":[{"id":"A"}]}';
        chunkReq.chunks.add(c0);

        DAGraphIngestionDTO.ChunkItem c1 = new DAGraphIngestionDTO.ChunkItem();
        c1.chunkIndex = 1;
        c1.payloadData = '{"edges":[{"source":"A","target":"B"}]}';
        chunkReq.chunks.add(c1);

        setupRestContext('/chunks', JSON.serialize(chunkReq));

        Test.startTest();
        DAGraphIngestionRestResource.doPost();
        Test.stopTest();

        RestResponse res = RestContext.response;
        Assert.areEqual(200, res.statusCode, 'Chunk batch upload must return 200');

        DAGraphIngestionDTO.BatchChunkUploadResponse respDto = (DAGraphIngestionDTO.BatchChunkUploadResponse) JSON.deserialize(
            res.responseBody.toString(),
            DAGraphIngestionDTO.BatchChunkUploadResponse.class
        );

        Assert.areEqual(2, respDto.persistedChunks.size());
        Assert.areEqual(2, respDto.totalPersisted);
        Assert.areEqual(true, respDto.isComplete);

        // Test identical retry: must succeed idempotently without duplicate insert
        setupRestContext('/chunks', JSON.serialize(chunkReq));
        DAGraphIngestionRestResource.doPost();

        RestResponse retryRes = RestContext.response;
        Assert.areEqual(200, retryRes.statusCode, 'Identical retry must succeed idempotently');

        Integer chunkCount = [SELECT COUNT() FROM DA_Graph_Chunk__c WHERE DA_Analysis_Run__c = :runId WITH USER_MODE];
        Assert.areEqual(2, chunkCount, 'Duplicate records must not be created');
    }

    @IsTest
    static void testChunkUploadConflictingRetryRejection() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'alpha-proj' LIMIT 1];
        String runId = DAGraphIngestionService.createAnalysisRun(proj.Id, 'Conflict Test Run', 2, 200L);

        // First upload chunk 0
        DAGraphIngestionDTO.BatchChunkUploadRequest chunkReq1 = new DAGraphIngestionDTO.BatchChunkUploadRequest();
        chunkReq1.runId = runId;
        chunkReq1.chunks = new List<DAGraphIngestionDTO.ChunkItem>();
        DAGraphIngestionDTO.ChunkItem c0 = new DAGraphIngestionDTO.ChunkItem();
        c0.chunkIndex = 0;
        c0.payloadData = '{"nodes":[{"id":"original"}]}';
        chunkReq1.chunks.add(c0);

        setupRestContext('/chunks', JSON.serialize(chunkReq1));
        DAGraphIngestionRestResource.doPost();
        Assert.areEqual(200, RestContext.response.statusCode);

        // Conflicting upload for chunk 0 with different payload
        DAGraphIngestionDTO.BatchChunkUploadRequest chunkReq2 = new DAGraphIngestionDTO.BatchChunkUploadRequest();
        chunkReq2.runId = runId;
        chunkReq2.chunks = new List<DAGraphIngestionDTO.ChunkItem>();
        DAGraphIngestionDTO.ChunkItem conflictC0 = new DAGraphIngestionDTO.ChunkItem();
        conflictC0.chunkIndex = 0;
        conflictC0.payloadData = '{"nodes":[{"id":"conflicting"}]}';
        chunkReq2.chunks.add(conflictC0);

        setupRestContext('/chunks', JSON.serialize(chunkReq2));

        Test.startTest();
        DAGraphIngestionRestResource.doPost();
        Test.stopTest();

        RestResponse res = RestContext.response;
        Assert.areEqual(409, res.statusCode, 'Conflicting chunk retry must return 409 Conflict');
        Assert.isTrue(res.responseBody.toString().contains('ERR_CONFLICTING_RETRY'));
    }

    @IsTest
    static void testChunkUploadBatchExceeded() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'alpha-proj' LIMIT 1];
        String runId = DAGraphIngestionService.createAnalysisRun(proj.Id, 'Batch Exceeded Run', 20, 2000L);

        DAGraphIngestionDTO.BatchChunkUploadRequest chunkReq = new DAGraphIngestionDTO.BatchChunkUploadRequest();
        chunkReq.runId = runId;
        chunkReq.chunks = new List<DAGraphIngestionDTO.ChunkItem>();
        for (Integer i = 0; i < 11; i++) { // 11 chunks exceeds MAX_BATCH_CHUNKS (10)
            DAGraphIngestionDTO.ChunkItem c = new DAGraphIngestionDTO.ChunkItem();
            c.chunkIndex = i;
            c.payloadData = 'data';
            chunkReq.chunks.add(c);
        }

        setupRestContext('/chunks', JSON.serialize(chunkReq));

        Test.startTest();
        DAGraphIngestionRestResource.doPost();
        Test.stopTest();

        RestResponse res = RestContext.response;
        Assert.areEqual(400, res.statusCode, 'Batch exceeding 10 chunks must return 400');
        Assert.isTrue(res.responseBody.toString().contains('ERR_INVALID_PAYLOAD'));
    }

    @IsTest
    static void testChunkUploadIndividualChunkOversized() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'alpha-proj' LIMIT 1];
        String runId = DAGraphIngestionService.createAnalysisRun(proj.Id, 'Chunk Oversized Run', 1, 200000L);

        DAGraphIngestionDTO.BatchChunkUploadRequest chunkReq = new DAGraphIngestionDTO.BatchChunkUploadRequest();
        chunkReq.runId = runId;
        chunkReq.chunks = new List<DAGraphIngestionDTO.ChunkItem>();
        DAGraphIngestionDTO.ChunkItem c = new DAGraphIngestionDTO.ChunkItem();
        c.chunkIndex = 0;
        // Make payload exceed 131,072 characters
        c.payloadData = 'A'.repeat(DAGraphIngestionService.MAX_CHUNK_SIZE + 10);
        chunkReq.chunks.add(c);

        setupRestContext('/chunks', JSON.serialize(chunkReq));

        Test.startTest();
        DAGraphIngestionRestResource.doPost();
        Test.stopTest();

        RestResponse res = RestContext.response;
        Assert.areEqual(400, res.statusCode, 'Oversized chunk must return 400');
        Assert.isTrue(res.responseBody.toString().contains('ERR_INVALID_PAYLOAD'));
    }

    @IsTest
    static void testWireOversizeCeilingEnforcement() {
        // Construct oversized request body exceeding 5,242,880 bytes
        RestRequest req = new RestRequest();
        req.requestURI = '/services/apexrest/da/v1/ingest/chunks';
        req.httpMethod = 'POST';
        // Mock large blob
        req.requestBody = Blob.valueOf('X'.repeat(5242881));
        RestContext.request = req;
        RestContext.response = new RestResponse();

        Test.startTest();
        DAGraphIngestionRestResource.doPost();
        Test.stopTest();

        RestResponse res = RestContext.response;
        Assert.areEqual(413, res.statusCode, 'Wire payload > 5 MiB must return 413 Payload Too Large');
        Assert.isTrue(res.responseBody.toString().contains('ERR_CHUNK_WIRE_OVERSIZE'));
    }

    @IsTest
    static void testFinalizeRunSuccess() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'alpha-proj' LIMIT 1];
        String runId = DAGraphIngestionService.createAnalysisRun(proj.Id, 'Finalize Success Run', 1, 100L);

        String chunkContent = '{"nodes":[{"id":"A"}],"edges":[]}';
        insert new DA_Graph_Chunk__c(
            DA_Analysis_Run__c = runId,
            Chunk_Index__c = 0,
            Chunk_Key__c = runId + '_0',
            Payload_Data__c = chunkContent
        );

        Blob digest = Crypto.generateDigest('SHA-256', Blob.valueOf(chunkContent));
        String expectedChecksum = EncodingUtil.convertToHex(digest).toLowerCase();

        DAGraphIngestionDTO.FinalizeRunRequest finReq = new DAGraphIngestionDTO.FinalizeRunRequest();
        finReq.runId = runId;
        finReq.expectedChunks = 1;
        finReq.expectedChecksum = expectedChecksum;

        setupRestContext('/finalize', JSON.serialize(finReq));

        Test.startTest();
        DAGraphIngestionRestResource.doPost();
        Test.stopTest();

        RestResponse res = RestContext.response;
        Assert.areEqual(200, res.statusCode, 'Successful finalization must return 200');

        DAGraphIngestionDTO.FinalizeRunResponse respDto = (DAGraphIngestionDTO.FinalizeRunResponse) JSON.deserialize(
            res.responseBody.toString(),
            DAGraphIngestionDTO.FinalizeRunResponse.class
        );

        Assert.areEqual(true, respDto.success);
        Assert.areEqual(DAGraphIngestionService.STATUS_AVAILABLE, respDto.status);

        DA_Analysis_Run__c updatedRun = [SELECT Status__c FROM DA_Analysis_Run__c WHERE Id = :runId LIMIT 1];
        Assert.areEqual(DAGraphIngestionService.STATUS_AVAILABLE, updatedRun.Status__c);
    }

    @IsTest
    static void testFinalizeRunChecksumMismatchFailureAndLkgPreservation() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'alpha-proj' LIMIT 1];
        String runId = DAGraphIngestionService.createAnalysisRun(proj.Id, 'Checksum Fail Run', 1, 100L);

        insert new DA_Graph_Chunk__c(
            DA_Analysis_Run__c = runId,
            Chunk_Index__c = 0,
            Chunk_Key__c = runId + '_0',
            Payload_Data__c = '{"nodes":[]}'
        );

        DAGraphIngestionDTO.FinalizeRunRequest finReq = new DAGraphIngestionDTO.FinalizeRunRequest();
        finReq.runId = runId;
        finReq.expectedChunks = 1;
        finReq.expectedChecksum = '0000000000000000000000000000000000000000000000000000000000000000'; // Wrong hash

        setupRestContext('/finalize', JSON.serialize(finReq));

        Test.startTest();
        DAGraphIngestionRestResource.doPost();
        Test.stopTest();

        RestResponse res = RestContext.response;
        Assert.areEqual(200, res.statusCode); // Returns structured response with success = false

        DAGraphIngestionDTO.FinalizeRunResponse respDto = (DAGraphIngestionDTO.FinalizeRunResponse) JSON.deserialize(
            res.responseBody.toString(),
            DAGraphIngestionDTO.FinalizeRunResponse.class
        );

        Assert.areEqual(false, respDto.success);
        Assert.areEqual(DAGraphIngestionService.STATUS_FAILED, respDto.status);
        Assert.isTrue(respDto.errorMessage.contains('Checksum mismatch'));

        // Verify FAILED state persisted safely in DB
        DA_Analysis_Run__c failedRun = [SELECT Status__c FROM DA_Analysis_Run__c WHERE Id = :runId LIMIT 1];
        Assert.areEqual(DAGraphIngestionService.STATUS_FAILED, failedRun.Status__c);

        // Verify LKG run remains unaffected
        DA_Analysis_Run__c lkg = DAGraphIngestionService.getLatestAvailableRun(proj.Id);
        Assert.isNotNull(lkg);
        Assert.areEqual('LKG Run', lkg.Name);
        Assert.areEqual(DAGraphIngestionService.STATUS_AVAILABLE, lkg.Status__c);
    }

    @IsTest
    static void testFinalizeRunMissingChunksFailure() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'alpha-proj' LIMIT 1];
        String runId = DAGraphIngestionService.createAnalysisRun(proj.Id, 'Missing Chunks Run', 3, 300L);

        // Only insert 1 chunk when 3 are expected
        insert new DA_Graph_Chunk__c(
            DA_Analysis_Run__c = runId,
            Chunk_Index__c = 0,
            Chunk_Key__c = runId + '_0',
            Payload_Data__c = '{"nodes":[]}'
        );

        DAGraphIngestionDTO.FinalizeRunRequest finReq = new DAGraphIngestionDTO.FinalizeRunRequest();
        finReq.runId = runId;
        finReq.expectedChunks = 3;

        setupRestContext('/finalize', JSON.serialize(finReq));

        Test.startTest();
        DAGraphIngestionRestResource.doPost();
        Test.stopTest();

        DAGraphIngestionDTO.FinalizeRunResponse respDto = (DAGraphIngestionDTO.FinalizeRunResponse) JSON.deserialize(
            RestContext.response.responseBody.toString(),
            DAGraphIngestionDTO.FinalizeRunResponse.class
        );

        Assert.areEqual(false, respDto.success);
        Assert.areEqual(DAGraphIngestionService.STATUS_FAILED, respDto.status);
        Assert.isTrue(respDto.errorMessage.contains('Expected 3 chunks, but found 1'));
    }

    @IsTest
    static void testFinalizeRunCallerChunkCountMismatchRejection() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'alpha-proj' LIMIT 1];
        String runId = DAGraphIngestionService.createAnalysisRun(proj.Id, 'Count Mismatch Run', 2, 200L);

        DAGraphIngestionDTO.FinalizeRunRequest finReq = new DAGraphIngestionDTO.FinalizeRunRequest();
        finReq.runId = runId;
        finReq.expectedChunks = 5; // Mismatch with run's configured 2

        setupRestContext('/finalize', JSON.serialize(finReq));

        Test.startTest();
        DAGraphIngestionRestResource.doPost();
        Test.stopTest();

        DAGraphIngestionDTO.FinalizeRunResponse respDto = (DAGraphIngestionDTO.FinalizeRunResponse) JSON.deserialize(
            RestContext.response.responseBody.toString(),
            DAGraphIngestionDTO.FinalizeRunResponse.class
        );

        Assert.areEqual(false, respDto.success);
        Assert.areEqual(DAGraphIngestionService.STATUS_FAILED, respDto.status);
        Assert.isTrue(respDto.errorMessage.contains('does not match persisted expected chunk count'));
    }

    @IsTest
    static void testFinalizeRunExplicitEmptySuccess() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'alpha-proj' LIMIT 1];
        String runId = DAGraphIngestionService.createAnalysisRun(proj.Id, 'Empty Run', 0, 0L);

        DAGraphIngestionDTO.FinalizeRunRequest finReq = new DAGraphIngestionDTO.FinalizeRunRequest();
        finReq.runId = runId;
        finReq.expectedChunks = 0;

        setupRestContext('/finalize', JSON.serialize(finReq));

        Test.startTest();
        DAGraphIngestionRestResource.doPost();
        Test.stopTest();

        DAGraphIngestionDTO.FinalizeRunResponse respDto = (DAGraphIngestionDTO.FinalizeRunResponse) JSON.deserialize(
            RestContext.response.responseBody.toString(),
            DAGraphIngestionDTO.FinalizeRunResponse.class
        );

        Assert.areEqual(true, respDto.success);
        Assert.areEqual(DAGraphIngestionService.STATUS_EMPTY, respDto.status);
    }

    @IsTest
    static void testInvalidEndpoint404() {
        setupRestContext('/unknown_endpoint', '{}');

        Test.startTest();
        DAGraphIngestionRestResource.doPost();
        Test.stopTest();

        RestResponse res = RestContext.response;
        Assert.areEqual(404, res.statusCode);
        Assert.isTrue(res.responseBody.toString().contains('ERR_NOT_FOUND'));
    }

    @IsTest
    static void testUnauthorizedUserAccessFailure() {
        Profile stdProfile = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];
        User restrictedUser = new User(
            Alias = 'ruser',
            Email = 'restricted_agent3@testorg.com',
            EmailEncodingKey = 'UTF-8',
            LastName = 'Restricted',
            LanguageLocaleKey = 'en_US',
            LocaleSidKey = 'en_US',
            ProfileId = stdProfile.Id,
            TimeZoneSidKey = 'America/Los_Angeles',
            UserName = 'restricted_agent3_' + DateTime.now().getTime() + '@testorg.com'
        );

        DA_Project__c proj = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'alpha-proj' LIMIT 1];

        DAGraphIngestionDTO.InitRunRequest initReq = new DAGraphIngestionDTO.InitRunRequest();
        initReq.projectId = proj.Id;
        initReq.expectedChunks = 1;
        initReq.expectedTotalBytes = 100L;

        System.runAs(restrictedUser) {
            setupRestContext('/init', JSON.serialize(initReq));

            Test.startTest();
            DAGraphIngestionRestResource.doPost();
            Test.stopTest();

            RestResponse res = RestContext.response;
            Assert.areEqual(403, res.statusCode, 'Restricted user without upload scope must be rejected 403');
            Assert.isTrue(res.responseBody.toString().contains('ERR_UNAUTHORIZED'));
        }
    }
}
