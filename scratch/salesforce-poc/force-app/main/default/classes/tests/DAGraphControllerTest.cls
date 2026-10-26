/**
 * @description Unit tests for DAGraphController
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
            Name = 'Run 1'
        );
        insert run;

        DA_Graph_Chunk__c chunk = new DA_Graph_Chunk__c(
            DA_Analysis_Run__c = run.Id,
            Name = 'Chunk 0',
            Chunk_Index__c = 0,
            Payload_Data__c = '{"nodes":[],"edges":[]}'
        );
        insert chunk;
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
    static void testGetLatestGraphForProject() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c LIMIT 1];

        Test.startTest();
        DAGraphDTO dto = DAGraphController.getLatestGraphForProject(proj.Id);
        Test.stopTest();

        Assert.areEqual(proj.Id, dto.projectId);
        Assert.areEqual(true, dto.isChunked);
        Assert.areEqual(1, dto.totalChunks);
        Assert.areEqual('{"nodes":[],"edges":[]}', dto.chunks[0]);
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
}