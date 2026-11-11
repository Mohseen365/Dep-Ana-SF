/**
 * @description Unit tests for DAGraphController including bounded chunk retrieval, two-step resolution, and ingestion integrity
 */
@IsTest
private class DAGraphControllerTest {

    @TestSetup
    static void setupTestData() {
        DA_Project__c proj = new DA_Project__c(
            Name = 'Test Project Alpha',
            Project_Key__c = 'PROJ_ALPHA'
        );
        insert proj;

        DA_Analysis_Run__c run = new DA_Analysis_Run__c(
            DA_Project__c = proj.Id,
            Name = 'Run 1',
            Status__c = 'AVAILABLE',
            Total_Chunks__c = 7,
            Node_Count__c = 100,
            Edge_Count__c = 200,
            Commit_Hash__c = 'abc1234'
        );
        insert run;

        List<DA_Graph_Chunk__c> chunks = new List<DA_Graph_Chunk__c>();
        for (Integer i = 0; i < 7; i++) {
            chunks.add(new DA_Graph_Chunk__c(
                DA_Analysis_Run__c = run.Id,
                Name = 'Chunk ' + i,
                Chunk_Index__c = i,
                Payload_Data__c = '{"chunk":' + i + '}'
            ));
        }
        insert chunks;
    }

    @IsTest
    static void testGetProjects() {
        Test.startTest();
        List<DA_Project__c> projects = DAGraphController.getProjects();
        Test.stopTest();

        Assert.areEqual(1, projects.size(), 'Should return 1 project record');
        Assert.areEqual('Test Project Alpha', projects[0].Name);
    }

    @IsTest
    static void testGetLatestGraphMetadataForProject() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c LIMIT 1];

        Test.startTest();
        DAGraphDTO dto = DAGraphController.getLatestGraphMetadataForProject(proj.Id);
        Test.stopTest();

        Assert.areEqual(proj.Id, dto.projectId);
        Assert.areEqual(true, dto.isChunked);
        Assert.areEqual(7, dto.totalChunks);
        Assert.areEqual(0, dto.chunks.size(), 'Metadata endpoint must not populate chunk payloads directly');
    }

    @IsTest
    static void testTwoStepResolutionWithKeyFallback() {
        Test.startTest();
        DAGraphDTO dto = DAGraphController.getLatestGraphMetadataForProject('PROJ_ALPHA');
        Test.stopTest();

        Assert.isNotNull(dto.projectId);
        Assert.areEqual('Test Project Alpha', dto.projectName);
        Assert.areEqual('PROJ_ALPHA', dto.projectKey);
        Assert.areEqual(7, dto.totalChunks);
    }

    @IsTest
    static void testIngestionIntegrityPartialChunkMismatchRejection() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c LIMIT 1];

        // Create an incomplete run where Status is AVAILABLE but Total_Chunks__c does not match chunk rows
        DA_Analysis_Run__c brokenRun = new DA_Analysis_Run__c(
            DA_Project__c = proj.Id,
            Name = 'Incomplete Run',
            Status__c = 'AVAILABLE',
            Total_Chunks__c = 10,
            Run_Timestamp__c = DateTime.now().addDays(1)
        );
        insert brokenRun;

        // Only insert 2 chunks out of 10
        insert new List<DA_Graph_Chunk__c>{
            new DA_Graph_Chunk__c(DA_Analysis_Run__c = brokenRun.Id, Name = 'Chunk 0', Chunk_Index__c = 0, Payload_Data__c = '{}'),
            new DA_Graph_Chunk__c(DA_Analysis_Run__c = brokenRun.Id, Name = 'Chunk 1', Chunk_Index__c = 1, Payload_Data__c = '{}')
        };

        Test.startTest();
        DAGraphDTO dto = DAGraphController.getLatestGraphMetadataForProject(proj.Id);
        Test.stopTest();

        // Must reject brokenRun and fall back to valid setup run with 7 chunks
        Assert.areEqual(7, dto.totalChunks, 'Must reject incomplete run and serve previous valid run');
    }

    @IsTest
    static void testGetGraphChunksBoundedRetrieval() {
        DA_Analysis_Run__c run = [SELECT Id FROM DA_Analysis_Run__c WHERE Total_Chunks__c = 7 LIMIT 1];

        Test.startTest();
        List<DA_Graph_Chunk__c> batch1 = DAGraphController.getGraphChunks(run.Id, 0, 5);
        List<DA_Graph_Chunk__c> batch2 = DAGraphController.getGraphChunks(run.Id, 5, 5);
        Test.stopTest();

        Assert.areEqual(5, batch1.size(), 'Batch 1 should contain 5 chunks');
        Assert.areEqual(0, batch1[0].Chunk_Index__c);
        Assert.areEqual(4, batch1[4].Chunk_Index__c);

        Assert.areEqual(2, batch2.size(), 'Batch 2 should contain remaining 2 chunks');
        Assert.areEqual(5, batch2[0].Chunk_Index__c);
        Assert.areEqual(6, batch2[1].Chunk_Index__c);

        Assert.isTrue(DAGraphChunkService.verifyBoundedChunkSequence(batch1, 0));
        Assert.isTrue(DAGraphChunkService.verifyBoundedChunkSequence(batch2, 5));
    }

    @IsTest
    static void testGetGraphChunksInvalidRunId() {
        try {
            Test.startTest();
            DAGraphController.getGraphChunks('001000000000000AAA', 0, 5);
            Test.stopTest();
            Assert.fail('Should have thrown AuraHandledException for invalid Run ID');
        } catch (AuraHandledException e) {
            Assert.isTrue(true);
        }
    }

    @IsTest
    static void testGetLatestGraphForProjectLegacy() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c LIMIT 1];

        Test.startTest();
        DAGraphDTO dto = DAGraphController.getLatestGraphForProject(proj.Id);
        Test.stopTest();

        Assert.areEqual(proj.Id, dto.projectId);
        Assert.areEqual(true, dto.isChunked);
        Assert.areEqual(7, dto.totalChunks);
        Assert.areEqual(7, dto.chunks.size());
    }

    @IsTest
    static void testGetLatestGraphBlankId() {
        try {
            Test.startTest();
            DAGraphController.getLatestGraphForProject('');
            Test.stopTest();
            Assert.fail('Should have thrown AuraHandledException');
        } catch (AuraHandledException e) {
            Assert.isTrue(true);
        }
    }

    // =========================================================================
    // AGENT 6: FINDING REVIEW PERSISTENCE TESTS
    // =========================================================================

    @IsTest
    static void testFindingStatusTransitionsAndLifecycle() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c LIMIT 1];
        DA_Analysis_Run__c run = [SELECT Id FROM DA_Analysis_Run__c WHERE DA_Project__c = :proj.Id LIMIT 1];

        DA_Finding__c finding = new DA_Finding__c(
            DA_Analysis_Run__c = run.Id,
            Name = 'Cyclic Reference in OrderService',
            Finding_Key__c = 'finding-cycle-1',
            Rule_Id__c = 'CIRCULAR_DEPENDENCY',
            Severity__c = 'Critical',
            Target_Node_Id__c = 'ApexClass:OrderService',
            Status__c = 'OPEN'
        );
        insert finding;

        Test.startTest();
        // 1. Transition OPEN -> IN_REVIEW
        DA_Finding__c updated1 = DAGraphController.updateFindingStatus(
            proj.Id,
            finding.Id,
            'IN_REVIEW',
            'Investigating decoupling with Interface',
            null
        );
        Assert.areEqual('IN_REVIEW', updated1.Status__c);
        Assert.areEqual(UserInfo.getName(), updated1.Reviewer__c);
        Assert.isNotNull(updated1.Reviewed_At__c);
        Assert.areEqual('Investigating decoupling with Interface', updated1.Review_Notes__c);

        // 2. Transition IN_REVIEW -> RESOLVED
        DA_Finding__c updated2 = DAGraphController.updateFindingStatus(
            proj.Id,
            finding.Id,
            'RESOLVED',
            'Decoupled via IOrderService',
            null
        );
        Assert.areEqual('RESOLVED', updated2.Status__c);

        // 3. Transition RESOLVED -> OPEN (Reopen)
        DA_Finding__c updated3 = DAGraphController.updateFindingStatus(
            proj.Id,
            finding.Id,
            'OPEN',
            'Reopened due to regression',
            null
        );
        Assert.areEqual('OPEN', updated3.Status__c);

        // 4. Retrieve via paginated getFindingReviewStatuses
        Map<String, Object> response = DAGraphController.getFindingReviewStatuses(proj.Id, 10, 0);
        Assert.areEqual(proj.Id, (Id) response.get('projectId'));
        Assert.areEqual(1, (Integer) response.get('totalCount'));
        Map<String, Map<String, Object>> statusMap = (Map<String, Map<String, Object>>) response.get('statuses');
        Assert.isTrue(statusMap.containsKey(finding.Id));
        Assert.isTrue(statusMap.containsKey('finding-cycle-1'));
        Test.stopTest();
    }

    @IsTest
    static void testFindingPersistenceDynamicUpsert() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c LIMIT 1];

        Test.startTest();
        // Dynamic finding not yet in DB
        DA_Finding__c created = DAGraphController.updateFindingStatus(
            proj.Id,
            'finding-risk-AccountController',
            'IN_REVIEW',
            'Adding unit test suite',
            null
        );
        Test.stopTest();

        Assert.isNotNull(created.Id);
        Assert.areEqual('IN_REVIEW', created.Status__c);
        Assert.areEqual('finding-risk-AccountController', created.Finding_Key__c);
    }

    @IsTest
    static void testInvalidStatusTransitionRejection() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c LIMIT 1];
        DA_Analysis_Run__c run = [SELECT Id FROM DA_Analysis_Run__c WHERE DA_Project__c = :proj.Id LIMIT 1];

        DA_Finding__c finding = new DA_Finding__c(
            DA_Analysis_Run__c = run.Id,
            Name = 'Hotspot Finding',
            Finding_Key__c = 'finding-hotspot-1',
            Rule_Id__c = 'HIGH_COUPLING',
            Severity__c = 'Major',
            Status__c = 'RESOLVED'
        );
        insert finding;

        try {
            Test.startTest();
            // Invalid: RESOLVED -> WONT_FIX is prohibited
            DAGraphController.updateFindingStatus(proj.Id, finding.Id, 'WONT_FIX', null, null);
            Test.stopTest();
            Assert.fail('Should have rejected invalid state transition RESOLVED -> WONT_FIX');
        } catch (AuraHandledException e) {
            Assert.isTrue(true);
        }
    }

    @IsTest
    static void testOptimisticConcurrencyConflictDetection() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c LIMIT 1];
        DA_Analysis_Run__c run = [SELECT Id FROM DA_Analysis_Run__c WHERE DA_Project__c = :proj.Id LIMIT 1];

        DA_Finding__c finding = new DA_Finding__c(
            DA_Analysis_Run__c = run.Id,
            Name = 'Race Condition Target',
            Finding_Key__c = 'finding-race-1',
            Rule_Id__c = 'HIGH_COUPLING',
            Severity__c = 'Major',
            Status__c = 'OPEN'
        );
        insert finding;

        try {
            Test.startTest();
            // Pass an expectedLastModified timestamp in the past (e.g. 1 hour ago)
            Datetime staleTimestamp = Datetime.now().addHours(-1);
            DAGraphController.updateFindingStatus(proj.Id, finding.Id, 'IN_REVIEW', 'Concurrent test', staleTimestamp);
            Test.stopTest();
            Assert.fail('Should have thrown CONCURRENCY_CONFLICT');
        } catch (AuraHandledException e) {
            Assert.isTrue(true);
        }
    }
}
