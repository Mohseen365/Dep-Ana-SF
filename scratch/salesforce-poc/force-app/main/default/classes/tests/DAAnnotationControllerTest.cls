/**
 * @description Comprehensive unit tests for DAAnnotationController
 */
@IsTest
private class DAAnnotationControllerTest {

    @TestSetup
    static void setupTestData() {
        List<DA_Project__c> projects = new List<DA_Project__c>{
            new DA_Project__c(
                Name = 'Test Project Alpha',
                Project_Key__c = 'PROJ_ALPHA'
            ),
            new DA_Project__c(
                Name = 'Test Project Beta',
                Project_Key__c = 'PROJ_BETA'
            )
        };
        insert projects;

        DA_Analysis_Run__c run = new DA_Analysis_Run__c(
            DA_Project__c = projects[0].Id,
            Name = 'Run Alpha'
        );
        insert run;

        DA_Finding__c finding = new DA_Finding__c(
            DA_Analysis_Run__c = run.Id,
            Summary__c = 'Test Finding Summary',
            Severity__c = 'HIGH',
            Category__c = 'SECURITY'
        );
        insert finding;
    }

    private static User createTestUser(String aliasSuffix) {
        Profile p = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];
        String uniqueName = 'da_test_ann_user_' + aliasSuffix + '_' + System.currentTimeMillis() + '@example.com';
        User u = new User(
            Alias = 'auser' + aliasSuffix,
            Email = 'da_ann_test_' + aliasSuffix + '@example.com',
            EmailEncodingKey = 'UTF-8',
            LastName = 'AnnTestUser' + aliasSuffix,
            LanguageLocaleKey = 'en_US',
            LocaleSidKey = 'en_US',
            ProfileId = p.Id,
            TimeZoneSidKey = 'America/Los_Angeles',
            UserName = uniqueName
        );
        insert u;
        return u;
    }

    @IsTest
    static void testGetAnnotations_Empty_ReturnsEmptyList() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'PROJ_ALPHA' LIMIT 1];

        Test.startTest();
        List<DA_Annotation__c> resultsById = DAAnnotationController.getAnnotations(proj.Id, null);
        List<DA_Annotation__c> resultsByKey = DAAnnotationController.getAnnotations('PROJ_ALPHA', 'node_1');
        Test.stopTest();

        Assert.isNotNull(resultsById, 'List should not be null when no annotations exist');
        Assert.areEqual(0, resultsById.size(), 'List should be empty');
        Assert.isNotNull(resultsByKey, 'List should not be null');
        Assert.areEqual(0, resultsByKey.size(), 'List should be empty');
    }

    @IsTest
    static void testCreateAndGetAnnotations_Success() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'PROJ_ALPHA' LIMIT 1];
        DA_Finding__c finding = [SELECT Id FROM DA_Finding__c LIMIT 1];

        Test.startTest();
        DA_Annotation__c ann1 = DAAnnotationController.createAnnotation(
            proj.Id,
            'node_100',
            'Important Note',
            'This node requires refactoring.',
            'OPEN',
            finding.Id
        );

        DA_Annotation__c ann2 = DAAnnotationController.createAnnotation(
            'PROJ_ALPHA',
            'node_200',
            null, // Default title test
            'General project note.',
            null, // Default status test
            null
        );
        Test.stopTest();

        Assert.isNotNull(ann1, 'Annotation 1 should be created');
        Assert.areEqual('Important Note', ann1.Name);
        Assert.areEqual('node_100', ann1.Node_Id__c);
        Assert.areEqual('This node requires refactoring.', ann1.Text__c);
        Assert.areEqual('OPEN', ann1.Status__c);
        Assert.areEqual(finding.Id, ann1.Finding__c);
        Assert.areEqual(UserInfo.getName(), ann1.Author__c, 'Author should be set to UserInfo.getName()');

        Assert.isNotNull(ann2, 'Annotation 2 should be created');
        Assert.areEqual('Note - node_200', ann2.Name, 'Default title should be Note - {nodeId}');
        Assert.areEqual('OPEN', ann2.Status__c, 'Default status should be OPEN');

        // Verify retrieval with and without node filtering
        List<DA_Annotation__c> projAnns = DAAnnotationController.getAnnotations(proj.Id, null);
        Assert.areEqual(2, projAnns.size(), 'Project should have 2 total annotations');

        List<DA_Annotation__c> nodeAnns = DAAnnotationController.getAnnotations(proj.Id, 'node_100');
        Assert.areEqual(1, nodeAnns.size(), 'Node filtering should return 1 annotation');
        Assert.areEqual(ann1.Id, nodeAnns[0].Id);
    }

    @IsTest
    static void testUpdateAnnotation_TextAndStatusResolution() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'PROJ_ALPHA' LIMIT 1];
        DA_Annotation__c ann = DAAnnotationController.createAnnotation(
            proj.Id,
            'node_1',
            'Initial Title',
            'Initial Text',
            'OPEN',
            null
        );

        Assert.isNull(ann.Resolved_At__c, 'Resolved_At__c should initially be null');

        Test.startTest();
        DA_Annotation__c updated = DAAnnotationController.updateAnnotation(
            ann.Id,
            'Updated Title',
            'Updated Text Content',
            'RESOLVED'
        );
        Test.stopTest();

        Assert.areEqual('Updated Title', updated.Name);
        Assert.areEqual('Updated Text Content', updated.Text__c);
        Assert.areEqual('RESOLVED', updated.Status__c);
        Assert.isNotNull(updated.Resolved_At__c, 'Resolved_At__c should be populated on resolution');
    }

    @IsTest
    static void testDeleteAnnotation_Success() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'PROJ_ALPHA' LIMIT 1];
        DA_Annotation__c ann = DAAnnotationController.createAnnotation(
            proj.Id,
            'node_1',
            'Title',
            'Text',
            'OPEN',
            null
        );

        Test.startTest();
        Boolean deleteResult = DAAnnotationController.deleteAnnotation(ann.Id);
        Test.stopTest();

        Assert.isTrue(deleteResult, 'deleteAnnotation should return true');
        List<DA_Annotation__c> existing = [SELECT Id FROM DA_Annotation__c WHERE Id = :ann.Id];
        Assert.areEqual(0, existing.size(), 'Record should be removed from database');
    }

    @IsTest
    static void testInputValidation_CreateFailures() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'PROJ_ALPHA' LIMIT 1];

        // Blank Project ID
        try {
            Test.startTest();
            DAAnnotationController.createAnnotation('', 'node_1', 'Title', 'Text', 'OPEN', null);
            Test.stopTest();
            Assert.fail('Should fail on blank project ID');
        } catch (AuraHandledException e) {
            Assert.isTrue(true);
        }

        // Blank Node ID
        try {
            Test.startTest();
            DAAnnotationController.createAnnotation(proj.Id, '  ', 'Title', 'Text', 'OPEN', null);
            Test.stopTest();
            Assert.fail('Should fail on blank node ID');
        } catch (AuraHandledException e) {
            Assert.isTrue(true);
        }

        // Blank Text
        try {
            Test.startTest();
            DAAnnotationController.createAnnotation(proj.Id, 'node_1', 'Title', '', 'OPEN', null);
            Test.stopTest();
            Assert.fail('Should fail on blank text');
        } catch (AuraHandledException e) {
            Assert.isTrue(true);
        }

        // Title length > 255
        try {
            Test.startTest();
            DAAnnotationController.createAnnotation(proj.Id, 'node_1', 'x'.repeat(256), 'Text', 'OPEN', null);
            Test.stopTest();
            Assert.fail('Should fail on oversized title');
        } catch (AuraHandledException e) {
            Assert.isTrue(true);
        }

        // Node ID length > 255
        try {
            Test.startTest();
            DAAnnotationController.createAnnotation(proj.Id, 'x'.repeat(256), 'Title', 'Text', 'OPEN', null);
            Test.stopTest();
            Assert.fail('Should fail on oversized node ID');
        } catch (AuraHandledException e) {
            Assert.isTrue(true);
        }

        // Text length > 32768
        try {
            Test.startTest();
            DAAnnotationController.createAnnotation(proj.Id, 'node_1', 'Title', 'x'.repeat(32769), 'OPEN', null);
            Test.stopTest();
            Assert.fail('Should fail on oversized text');
        } catch (AuraHandledException e) {
            Assert.isTrue(true);
        }

        // Nonexistent Project
        try {
            Test.startTest();
            DAAnnotationController.createAnnotation('NONEXISTENT_PROJ', 'node_1', 'Title', 'Text', 'OPEN', null);
            Test.stopTest();
            Assert.fail('Should fail on nonexistent project');
        } catch (AuraHandledException e) {
            Assert.isTrue(true);
        }
    }

    @IsTest
    static void testInputValidation_UpdateAndDeleteFailures() {
        // Invalid or blank ID on update
        try {
            Test.startTest();
            DAAnnotationController.updateAnnotation('INVALID_ID', 'Title', 'Text', 'OPEN');
            Test.stopTest();
            Assert.fail('Should fail on invalid annotation ID');
        } catch (AuraHandledException e) {
            Assert.isTrue(true);
        }

        // Invalid or blank ID on delete
        try {
            Test.startTest();
            DAAnnotationController.deleteAnnotation('');
            Test.stopTest();
            Assert.fail('Should fail on blank annotation ID');
        } catch (AuraHandledException e) {
            Assert.isTrue(true);
        }
    }

    @IsTest
    static void testProjectIsolation() {
        DA_Project__c projAlpha = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'PROJ_ALPHA' LIMIT 1];
        DA_Project__c projBeta = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'PROJ_BETA' LIMIT 1];

        DAAnnotationController.createAnnotation(
            projAlpha.Id,
            'node_common',
            'Alpha Note',
            'Alpha Text',
            'OPEN',
            null
        );

        Test.startTest();
        List<DA_Annotation__c> alphaAnns = DAAnnotationController.getAnnotations(projAlpha.Id, 'node_common');
        List<DA_Annotation__c> betaAnns = DAAnnotationController.getAnnotations(projBeta.Id, 'node_common');
        Test.stopTest();

        Assert.areEqual(1, alphaAnns.size(), 'Project Alpha should have 1 annotation for node_common');
        Assert.areEqual(0, betaAnns.size(), 'Project Beta should have 0 annotations for node_common');
    }

    @IsTest
    static void testUserAccess_SystemRunAs() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'PROJ_ALPHA' LIMIT 1];
        User user1 = createTestUser('1');

        System.runAs(user1) {
            DA_Annotation__c ann = DAAnnotationController.createAnnotation(
                proj.Id,
                'node_user1',
                'User 1 Note',
                'Created by user 1',
                'OPEN',
                null
            );

            Assert.areEqual(user1.LastName, ann.Author__c, 'Author display name should reflect User 1');
            List<DA_Annotation__c> retrieved = DAAnnotationController.getAnnotations(proj.Id, 'node_user1');
            Assert.areEqual(1, retrieved.size(), 'User 1 should retrieve their annotation under sharing');
        }
    }
}
