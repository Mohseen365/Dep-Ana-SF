/**
 * @description Unit tests for DAProjectController
 */
@IsTest
private class DAProjectControllerTest {

    @TestSetup
    static void setupTestData() {
        DA_Project__c p = new DA_Project__c(
            Name = 'Alpha Project',
            Project_Key__c = 'alpha-project',
            Status__c = 'Active'
        );
        insert p;
    }

    @IsTest
    static void testIsProjectKeyAvailable() {
        System.assertEquals(false, DAProjectController.isProjectKeyAvailable('alpha-project'));
        System.assertEquals(true, DAProjectController.isProjectKeyAvailable('beta-project'));
        System.assertEquals(false, DAProjectController.isProjectKeyAvailable(''));
    }

    @IsTest
    static void testCreateProjectSuccess() {
        DAProjectController.ProjectCreationResult result = DAProjectController.createProject(
            'Beta Project',
            'beta-project',
            'https://github.com/org/repo',
            'Description'
        );

        System.assertNotEquals(null, result);
        System.assertEquals(true, result.isSuccess);
        System.assertNotEquals(null, result.projectId);
        System.assertEquals('beta-project', result.projectKey);
    }

    @IsTest
    static void testCreateProjectDuplicateKeyRejected() {
        DAProjectController.ProjectCreationResult result = DAProjectController.createProject(
            'Alpha Clone',
            'alpha-project',
            'https://github.com/org/clone',
            'Duplicate'
        );

        System.assertNotEquals(null, result);
        System.assertEquals(false, result.isSuccess);
        System.assert(result.errorMessage.contains('already exists'));
    }

    @IsTest
    static void testCreateProjectAutoSlug() {
        DAProjectController.ProjectCreationResult result = DAProjectController.createProject(
            'Delta Service System',
            null,
            null,
            null
        );

        System.assertNotEquals(null, result);
        System.assertEquals(true, result.isSuccess);
        System.assertEquals('delta-service-system', result.projectKey);
    }

    @IsTest
    static void testInitiateAnalysisRunWithSecurity() {
        DA_Project__c p = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'alpha-project' LIMIT 1];

        // Direct project owner has access
        DAProjectController.ImportRunInitResult initRes = DAProjectController.initiateAnalysisRun(
            p.Id,
            'Test Run 1',
            1,
            100L,
            'abc1234',
            'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
        );

        System.assertNotEquals(null, initRes);
        System.assertEquals(true, initRes.isSuccess);
        System.assertNotEquals(null, initRes.runId);
    }
}
