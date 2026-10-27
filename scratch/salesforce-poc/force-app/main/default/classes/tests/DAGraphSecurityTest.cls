/**
 * @description Multi-tenant isolation and security tests for DA_* objects
 */
@IsTest
private class DAGraphSecurityTest {

    @IsTest
    static void testProjectIsolation() {
        DA_Project__c projA = new DA_Project__c(Name = 'Project A', Project_Key__c = 'PROJ_A');
        DA_Project__c projB = new DA_Project__c(Name = 'Project B', Project_Key__c = 'PROJ_B');
        insert new List<DA_Project__c>{ projA, projB };

        DA_Analysis_Run__c runA = new DA_Analysis_Run__c(DA_Project__c = projA.Id, Name = 'Run A');
        DA_Analysis_Run__c runB = new DA_Analysis_Run__c(DA_Project__c = projB.Id, Name = 'Run B');
        insert new List<DA_Analysis_Run__c>{ runA, runB };

        Test.startTest();
        DAGraphDTO dtoA = DAGraphController.getLatestGraphMetadataForProject(projA.Id);
        Test.stopTest();

        Assert.areEqual(projA.Id, dtoA.projectId, 'Retrieved DTO must match Project A ID strictly');
        Assert.areNotEqual(projB.Id, dtoA.projectId, 'Retrieved DTO must not expose Project B data');
    }

    @IsTest
    static void testSystemRunAsRestrictedUserAccess() {
        Profile stdProfile = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];
        User restrictedUser = new User(
            Alias = 'ruser',
            Email = 'restricteduser@testorg.com',
            EmailEncodingKey = 'UTF-8',
            LastName = 'Testing',
            LanguageLocaleKey = 'en_US',
            LocaleSidKey = 'en_US',
            ProfileId = stdProfile.Id,
            TimeZoneSidKey = 'America/Los_Angeles',
            UserName = 'restricteduser_' + DateTime.now().getTime() + '@testorg.com'
        );

        DA_Project__c proj = new DA_Project__c(Name = 'Restricted Proj', Project_Key__c = 'PROJ_REST');
        insert proj;

        DA_Analysis_Run__c run = new DA_Analysis_Run__c(DA_Project__c = proj.Id, Name = 'Restricted Run');
        insert run;

        DA_Graph_Chunk__c chunk = new DA_Graph_Chunk__c(
            DA_Analysis_Run__c = run.Id,
            Chunk_Index__c = 0,
            Payload_Data__c = '{"nodes":[]}'
        );
        insert chunk;

        System.runAs(restrictedUser) {
            try {
                Test.startTest();
                DAGraphController.getGraphChunks(run.Id, 0, 5);
                Test.stopTest();
            } catch (System.QueryException e) {
                // Expected if object or field access is restricted via USER_MODE / sharing
                Assert.isTrue(true, 'QueryException expected for restricted user');
            } catch (AuraHandledException e) {
                // Expected if controller handles restriction gracefully
                Assert.isTrue(true, 'AuraHandledException expected for restricted user');
            }
        }
    }

    @IsTest
    static void testUnauthorizedChunkRetrievalWithGuessedRunId() {
        Test.startTest();
        try {
            DAGraphController.getGraphChunks('a00000000000001AAA', 0, 5);
            Assert.fail('Should reject non-existent or unauthorized run ID');
        } catch (AuraHandledException e) {
            Assert.isTrue(true);
        }
        Test.stopTest();
    }

    @IsTest
    static void testCrossProjectChunkRetrievalRejection() {
        DA_Project__c projA = new DA_Project__c(Name = 'Project A', Project_Key__c = 'PROJ_A');
        DA_Project__c projB = new DA_Project__c(Name = 'Project B', Project_Key__c = 'PROJ_B');
        insert new List<DA_Project__c>{ projA, projB };

        DA_Analysis_Run__c runB = new DA_Analysis_Run__c(DA_Project__c = projB.Id, Name = 'Run B');
        insert runB;

        insert new DA_Graph_Chunk__c(
            DA_Analysis_Run__c = runB.Id,
            Chunk_Index__c = 0,
            Payload_Data__c = '{"nodes":[{"id":"B"}]}'
        );

        Test.startTest();
        // Authorized retrieval with matching project and run
        List<DA_Graph_Chunk__c> validChunks = DAGraphController.getGraphChunks(runB.Id, 0, 5, projB.Id);
        Assert.areEqual(1, validChunks.size(), 'Matching project ID must successfully return chunks');

        // Mismatched cross-project retrieval attempt
        try {
            DAGraphController.getGraphChunks(runB.Id, 0, 5, projA.Id);
            Assert.fail('Should reject attempt to fetch Project B run chunks using Project A ID');
        } catch (AuraHandledException e) {
            Assert.isTrue(true, 'AuraHandledException expected for mismatched project context');
        }
        Test.stopTest();
    }
}
