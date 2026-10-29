/**
 * @description Comprehensive unit tests for DAUserPreferenceController
 */
@IsTest
private class DAUserPreferenceControllerTest {

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
    }

    private static User createTestUser(String aliasSuffix) {
        Profile p = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];
        String uniqueName = 'da_test_user_' + aliasSuffix + '_' + System.currentTimeMillis() + '@example.com';
        User u = new User(
            Alias = 'tuser' + aliasSuffix,
            Email = 'da_test_' + aliasSuffix + '@example.com',
            EmailEncodingKey = 'UTF-8',
            LastName = 'TestUser' + aliasSuffix,
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
    static void testGetUserPreference_FirstUse_ReturnsNull() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'PROJ_ALPHA' LIMIT 1];

        Test.startTest();
        DA_User_Preference__c prefById = DAUserPreferenceController.getUserPreference(proj.Id);
        DA_User_Preference__c prefByKey = DAUserPreferenceController.getUserPreference('PROJ_ALPHA');
        Test.stopTest();

        Assert.isNull(prefById, 'First-use retrieval by Record ID should return null');
        Assert.isNull(prefByKey, 'First-use retrieval by Project Key should return null');
    }

    @IsTest
    static void testSaveAndGetUserPreference_ByRecordId() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'PROJ_ALPHA' LIMIT 1];
        String positions = '{"node1":{"x":100,"y":200}}';
        String filters = '{"showRisk":true}';
        String zoomPan = '{"zoom":1.5,"pan":{"x":10,"y":20}}';

        Test.startTest();
        DA_User_Preference__c saved = DAUserPreferenceController.saveUserPreference(
            proj.Id,
            'GRAPH_VIEW',
            'COSE_LAYOUT',
            positions,
            filters,
            zoomPan
        );
        DA_User_Preference__c fetched = DAUserPreferenceController.getUserPreference(proj.Id);
        Test.stopTest();

        Assert.isNotNull(saved, 'Saved preference record should not be null');
        Assert.areEqual('GRAPH_VIEW', saved.Active_View_Mode__c);
        Assert.areEqual('COSE_LAYOUT', saved.Active_Layout_Mode__c);
        Assert.areEqual(positions, saved.Positions_JSON__c);
        Assert.areEqual(filters, saved.Filters_JSON__c);
        Assert.areEqual(zoomPan, saved.Zoom_Pan_JSON__c);

        Assert.isNotNull(fetched, 'Fetched preference record should not be null');
        Assert.areEqual(saved.Id, fetched.Id);
        Assert.areEqual('GRAPH_VIEW', fetched.Active_View_Mode__c);
        Assert.areEqual('COSE_LAYOUT', fetched.Active_Layout_Mode__c);
        Assert.areEqual(positions, fetched.Positions_JSON__c);
        Assert.areEqual(filters, fetched.Filters_JSON__c);
        Assert.areEqual(zoomPan, fetched.Zoom_Pan_JSON__c);
    }

    @IsTest
    static void testSaveAndGetUserPreference_ByProjectKey() {
        String positions = '{"node2":{"x":300,"y":400}}';

        Test.startTest();
        DA_User_Preference__c saved = DAUserPreferenceController.saveUserPreference(
            'PROJ_ALPHA',
            'MATRIX_VIEW',
            'GRID_LAYOUT',
            positions,
            null,
            null
        );
        DA_User_Preference__c fetched = DAUserPreferenceController.getUserPreference('PROJ_ALPHA');
        Test.stopTest();

        Assert.isNotNull(saved, 'Saved preference record should not be null');
        Assert.areEqual('MATRIX_VIEW', saved.Active_View_Mode__c);
        Assert.areEqual('GRID_LAYOUT', saved.Active_Layout_Mode__c);
        Assert.areEqual(positions, saved.Positions_JSON__c);

        Assert.isNotNull(fetched, 'Fetched preference record should not be null');
        Assert.areEqual('MATRIX_VIEW', fetched.Active_View_Mode__c);
    }

    @IsTest
    static void testSaveUserPreference_UpdateExisting_NoDuplicates() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'PROJ_ALPHA' LIMIT 1];

        Test.startTest();
        DAUserPreferenceController.saveUserPreference(
            proj.Id,
            'VIEW_1',
            'LAYOUT_1',
            '{"node":1}',
            null,
            null
        );
        DAUserPreferenceController.saveUserPreference(
            proj.Id,
            'VIEW_2',
            'LAYOUT_2',
            '{"node":2}',
            '{"filter":1}',
            '{"zoom":1}'
        );
        Test.stopTest();

        List<DA_User_Preference__c> allPrefs = [
            SELECT Id, Active_View_Mode__c, Active_Layout_Mode__c, Positions_JSON__c
            FROM DA_User_Preference__c
            WHERE Project__c = :proj.Id AND User__c = :UserInfo.getUserId()
        ];

        Assert.areEqual(1, allPrefs.size(), 'Repeated saves for same user/project pair should update existing record, not duplicate');
        Assert.areEqual('VIEW_2', allPrefs[0].Active_View_Mode__c);
        Assert.areEqual('LAYOUT_2', allPrefs[0].Active_Layout_Mode__c);
        Assert.areEqual('{"node":2}', allPrefs[0].Positions_JSON__c);
    }

    @IsTest
    static void testInputValidation_BlankProjectId() {
        try {
            Test.startTest();
            DAUserPreferenceController.getUserPreference('');
            Test.stopTest();
            Assert.fail('Should have thrown exception for blank Project ID in getUserPreference');
        } catch (AuraHandledException e) {
            Assert.isTrue(true);
        }

        try {
            Test.startTest();
            DAUserPreferenceController.saveUserPreference('  ', 'VIEW', 'LAYOUT', null, null, null);
            Test.stopTest();
            Assert.fail('Should have thrown exception for blank Project ID in saveUserPreference');
        } catch (AuraHandledException e) {
            Assert.isTrue(true);
        }
    }

    @IsTest
    static void testInputValidation_NonexistentProject() {
        try {
            Test.startTest();
            DAUserPreferenceController.saveUserPreference('NONEXISTENT_PROJ_KEY', 'VIEW', 'LAYOUT', null, null, null);
            Test.stopTest();
            Assert.fail('Should have thrown exception for nonexistent project');
        } catch (AuraHandledException e) {
            Assert.isTrue(true);
        }
    }

    @IsTest
    static void testInputValidation_MalformedJson() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'PROJ_ALPHA' LIMIT 1];

        try {
            Test.startTest();
            DAUserPreferenceController.saveUserPreference(
                proj.Id,
                'VIEW',
                'LAYOUT',
                '{ invalid_json: ',
                null,
                null
            );
            Test.stopTest();
            Assert.fail('Should have thrown exception for malformed positions JSON');
        } catch (AuraHandledException e) {
            Assert.isTrue(true);
        }
    }

    @IsTest
    static void testInputValidation_OversizedJson() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'PROJ_ALPHA' LIMIT 1];
        String oversizedJson = '{"data":"' + 'x'.repeat(131070) + '"}';

        try {
            Test.startTest();
            DAUserPreferenceController.saveUserPreference(
                proj.Id,
                'VIEW',
                'LAYOUT',
                oversizedJson,
                null,
                null
            );
            Test.stopTest();
            Assert.fail('Should have thrown exception for oversized positions JSON (>131072 chars)');
        } catch (AuraHandledException e) {
            Assert.isTrue(true);
        }
    }

    @IsTest
    static void testUserIsolation_SystemRunAs() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'PROJ_ALPHA' LIMIT 1];
        User user1 = createTestUser('1');
        User user2 = createTestUser('2');

        System.runAs(user1) {
            DAUserPreferenceController.saveUserPreference(
                proj.Id,
                'USER1_VIEW',
                'USER1_LAYOUT',
                '{"user":1}',
                null,
                null
            );
        }

        System.runAs(user2) {
            DA_User_Preference__c user2Fetched = DAUserPreferenceController.getUserPreference(proj.Id);
            Assert.isNull(user2Fetched, 'User 2 should not see User 1 preferences');

            DAUserPreferenceController.saveUserPreference(
                proj.Id,
                'USER2_VIEW',
                'USER2_LAYOUT',
                '{"user":2}',
                null,
                null
            );

            DA_User_Preference__c user2Saved = DAUserPreferenceController.getUserPreference(proj.Id);
            Assert.isNotNull(user2Saved, 'User 2 should be able to save and retrieve their own preference');
            Assert.areEqual('USER2_VIEW', user2Saved.Active_View_Mode__c);
        }

        System.runAs(user1) {
            DA_User_Preference__c user1Fetched = DAUserPreferenceController.getUserPreference(proj.Id);
            Assert.isNotNull(user1Fetched, 'User 1 preference should remain untouched');
            Assert.areEqual('USER1_VIEW', user1Fetched.Active_View_Mode__c);
        }
    }

    @IsTest
    static void testProjectIsolation() {
        DA_Project__c projAlpha = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'PROJ_ALPHA' LIMIT 1];
        DA_Project__c projBeta = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'PROJ_BETA' LIMIT 1];

        Test.startTest();
        DAUserPreferenceController.saveUserPreference(
            projAlpha.Id,
            'ALPHA_VIEW',
            'ALPHA_LAYOUT',
            '{"alpha":true}',
            null,
            null
        );

        DA_User_Preference__c alphaPref = DAUserPreferenceController.getUserPreference(projAlpha.Id);
        DA_User_Preference__c betaPref = DAUserPreferenceController.getUserPreference(projBeta.Id);
        Test.stopTest();

        Assert.isNotNull(alphaPref, 'Preference for Project Alpha should exist');
        Assert.isNull(betaPref, 'Preference for Project Beta should be null when only Alpha was saved');
    }
}
