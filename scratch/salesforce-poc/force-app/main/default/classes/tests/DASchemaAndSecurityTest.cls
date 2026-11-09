/**
 * Apex Test class validating P0 Custom Object Schema, Master-Detail Relationships, and CRUD/FLS Security.
 */
@IsTest
private class DASchemaAndSecurityTest {

    @TestSetup
    static void setupTestData() {
        // Create baseline project
        DA_Project__c project = new DA_Project__c(
            Name = 'Test Baseline Project',
            Project_Key__c = 'baseline_test_proj',
            Repository_Url__c = 'https://github.com/example/test-repo',
            Status__c = 'Active'
        );
        insert project;

        // Create baseline analysis run
        DA_Analysis_Run__c run = new DA_Analysis_Run__c(
            DA_Project__c = project.Id,
            Commit_Hash__c = '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
            Run_Timestamp__c = DateTime.now(),
            Status__c = 'AVAILABLE',
            Node_Count__c = 100,
            Edge_Count__c = 250,
            Cyclic_SCC_Count__c = 3,
            Total_Chunks__c = 2,
            Total_Payload_Size_Chars__c = 150000L
        );
        insert run;

        // Create baseline graph chunks
        List<DA_Graph_Chunk__c> chunks = new List<DA_Graph_Chunk__c>{
            new DA_Graph_Chunk__c(
                DA_Analysis_Run__c = run.Id,
                Chunk_Index__c = 0,
                Payload_Data__c = '{"nodes":[{"id":"1"}]}'
            ),
            new DA_Graph_Chunk__c(
                DA_Analysis_Run__c = run.Id,
                Chunk_Index__c = 1,
                Payload_Data__c = ',"edges":[{"source":"1","target":"1"}]}'
            )
        };
        insert chunks;

        // Create baseline finding
        DA_Finding__c finding = new DA_Finding__c(
            DA_Analysis_Run__c = run.Id,
            Rule_Id__c = 'RULE-CYCLIC-DEPENDENCY',
            Severity__c = 'Critical',
            Target_Node_Id__c = '1',
            Details__c = 'Cyclic loop detected between Node 1 and Node 1'
        );
        insert finding;
    }

    @IsTest
    static void testSchemaIntegrityAndQueryOrdering() {
        DA_Project__c proj = [SELECT Id, Name, Project_Key__c, Repository_Url__c, Status__c FROM DA_Project__c WHERE Project_Key__c = 'baseline_test_proj' LIMIT 1];
        System.assertNotEquals(null, proj.Id, 'Project must exist');
        System.assertEquals('Active', proj.Status__c, 'Status should match');

        List<DA_Analysis_Run__c> runs = [
            SELECT Id, DA_Project__c, Commit_Hash__c, Status__c, Node_Count__c, Edge_Count__c, Cyclic_SCC_Count__c
            FROM DA_Analysis_Run__c
            WHERE DA_Project__c = :proj.Id
            WITH USER_MODE
            ORDER BY Run_Timestamp__c DESC, Id DESC
        ];
        System.assertEquals(1, runs.size(), 'Should find 1 analysis run');
        System.assertEquals('AVAILABLE', runs[0].Status__c, 'Run status should be AVAILABLE');
        System.assertEquals(100, runs[0].Node_Count__c, 'Node count should be 100');

        List<DA_Graph_Chunk__c> chunks = [
            SELECT Id, Chunk_Index__c, Payload_Data__c
            FROM DA_Graph_Chunk__c
            WHERE DA_Analysis_Run__c = :runs[0].Id
            WITH USER_MODE
            ORDER BY Chunk_Index__c ASC, Id ASC
        ];
        System.assertEquals(2, chunks.size(), 'Should find 2 chunks in sequence');
        System.assertEquals(0, chunks[0].Chunk_Index__c, 'First chunk index must be 0');
        System.assertEquals(1, chunks[1].Chunk_Index__c, 'Second chunk index must be 1');

        List<DA_Finding__c> findings = [
            SELECT Id, Rule_Id__c, Severity__c, Target_Node_Id__c
            FROM DA_Finding__c
            WHERE DA_Analysis_Run__c = :runs[0].Id
            WITH USER_MODE
        ];
        System.assertEquals(1, findings.size(), 'Should find 1 finding linked via Master-Detail');
        System.assertEquals('Critical', findings[0].Severity__c, 'Severity must match');
    }

    @IsTest
    static void testDTOAndErrorResponseContracts() {
        DAGraphDTO dto = new DAGraphDTO();
        dto.projectId = 'test-proj-id';
        dto.projectName = 'Test Project';
        dto.isChunked = true;
        dto.totalChunks = 5;
        System.assertEquals('test-proj-id', dto.projectId);
        System.assertEquals(5, dto.totalChunks);

        DAAnalysisRunDTO runDto = new DAAnalysisRunDTO();
        runDto.commitHash = 'abc';
        runDto.nodeDelta = 10;
        runDto.edgeDelta = -5;
        runDto.cyclicSccDelta = -1;
        System.assertEquals(10, runDto.nodeDelta);

        DAErrorResponse err = new DAErrorResponse('INVALID_PARAM', 'Project ID required', 'CORR-1234');
        System.assertEquals('INVALID_PARAM', err.errorCode);
        System.assertEquals('CORR-1234', err.correlationId);
    }
}
