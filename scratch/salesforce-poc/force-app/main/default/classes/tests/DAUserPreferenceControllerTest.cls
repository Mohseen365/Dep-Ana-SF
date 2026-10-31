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
    static void testSaveUserPreference_NullArgumentsPreserveExistingValues() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'PROJ_ALPHA' LIMIT 1];

        String initialPositions = '{"node1":{"x":100,"y":200}}';
        String initialFilters = '{"search":"Account"}';
        String initialZoomPan = '{"zoom":1.5,"pan":{"x":10,"y":20}}';

        Test.startTest();
        DAUserPreferenceController.saveUserPreference(
            proj.Id,
            'GRAPH_VIEW',
            'COSE_LAYOUT',
            initialPositions,
            initialFilters,
            initialZoomPan
        );

        DAUserPreferenceController.saveUserPreference(
            proj.Id,
            'MATRIX_VIEW',
            null,
            null,
            '{"search":"Contact"}',
            null
        );

        DA_User_Preference__c fetched = DAUserPreferenceController.getUserPreference(proj.Id);
        Test.stopTest();

        Assert.isNotNull(fetched, 'Fetched preference record should not be null');
        Assert.areEqual('MATRIX_VIEW', fetched.Active_View_Mode__c, 'Active view mode should be updated');
        Assert.areEqual('COSE_LAYOUT', fetched.Active_Layout_Mode__c, 'Layout mode should remain preserved when null passed');
        Assert.areEqual(initialPositions, fetched.Positions_JSON__c, 'Positions JSON should remain preserved when null passed');
        Assert.areEqual('{"search":"Contact"}', fetched.Filters_JSON__c, 'Filters JSON should be updated when non-null passed');
        Assert.areEqual(initialZoomPan, fetched.Zoom_Pan_JSON__c, 'Zoom Pan JSON should remain preserved when null passed');
    }

    @IsTest
    static void testSaveUserPreference_EmptyStringHandling() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'PROJ_ALPHA' LIMIT 1];

        Test.startTest();
        DAUserPreferenceController.saveUserPreference(
            proj.Id,
            'GRAPH_VIEW',
            'COSE_LAYOUT',
            '{"node1":{"x":100,"y":200}}',
            '{"search":"Account"}',
            '{"zoom":1.0}'
        );

        DAUserPreferenceController.saveUserPreference(
            proj.Id,
            'GRAPH_VIEW',
            'COSE_LAYOUT',
            '',
            null,
            null
        );

        DA_User_Preference__c fetched = DAUserPreferenceController.getUserPreference(proj.Id);
        Test.stopTest();

        Assert.isNotNull(fetched, 'Fetched preference record should not be null');
        Assert.areEqual('', fetched.Positions_JSON__c, 'Empty string should not be treated as null and should update field value');
        Assert.areEqual('{"search":"Account"}', fetched.Filters_JSON__c, 'Filters JSON should remain preserved when null passed');
        Assert.areEqual('{"zoom":1.0}', fetched.Zoom_Pan_JSON__c, 'Zoom Pan JSON should remain preserved when null passed');
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
    static void testInputValidation_OversizedJson_R4Boundaries() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'PROJ_ALPHA' LIMIT 1];
        String maxAllowedJson = '{"k":"' + 'x'.repeat(131064) + '"}'; // exactly 131,072 characters
        String oversizedJson = '{"k":"' + 'x'.repeat(131065) + '"}'; // exactly 131,073 characters (first rejected boundary)

        Test.startTest();

        // 1. Positions_JSON__c: 131,072 accepted
        DA_User_Preference__c pAccepted = DAUserPreferenceController.saveUserPreference(proj.Id, 'VIEW', 'LAYOUT', maxAllowedJson, null, null);
        Assert.areEqual(131072, pAccepted.Positions_JSON__c.length(), 'Positions_JSON__c must accept exactly 131,072 characters');

        // 1. Positions_JSON__c: 131,073 rejected
        try {
            DAUserPreferenceController.saveUserPreference(proj.Id, 'VIEW', 'LAYOUT', oversizedJson, null, null);
            Assert.fail('Should have thrown exception for oversized Positions JSON at 131,073 chars');
        } catch (AuraHandledException e) {
            Assert.isTrue(true);
        }

        // 2. Filters_JSON__c: 131,072 accepted
        DA_User_Preference__c fAccepted = DAUserPreferenceController.saveUserPreference(proj.Id, 'VIEW', 'LAYOUT', null, maxAllowedJson, null);
        Assert.areEqual(131072, fAccepted.Filters_JSON__c.length(), 'Filters_JSON__c must accept exactly 131,072 characters');

        // 2. Filters_JSON__c: 131,073 rejected
        try {
            DAUserPreferenceController.saveUserPreference(proj.Id, 'VIEW', 'LAYOUT', null, oversizedJson, null);
            Assert.fail('Should have thrown exception for oversized Filters JSON at 131,073 chars');
        } catch (AuraHandledException e) {
            Assert.isTrue(true);
        }

        // 3. Zoom_Pan_JSON__c: 131,072 accepted
        DA_User_Preference__c zAccepted = DAUserPreferenceController.saveUserPreference(proj.Id, 'VIEW', 'LAYOUT', null, null, maxAllowedJson);
        Assert.areEqual(131072, zAccepted.Zoom_Pan_JSON__c.length(), 'Zoom_Pan_JSON__c must accept exactly 131,072 characters');

        // 3. Zoom_Pan_JSON__c: 131,073 rejected
        try {
            DAUserPreferenceController.saveUserPreference(proj.Id, 'VIEW', 'LAYOUT', null, null, oversizedJson);
            Assert.fail('Should have thrown exception for oversized Zoom/Pan JSON at 131,073 chars');
        } catch (AuraHandledException e) {
            Assert.isTrue(true);
        }

        Test.stopTest();
    }

    @IsTest
    static void testR1_MergeV1IntoV2Container_PreservesPresets() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'PROJ_ALPHA' LIMIT 1];
        String initialV2 = '{"schemaVersion":2,"activePresetId":"p1","activeFilter":{"search":"Old"},"presets":[{"id":"p1","name":"P1"}]}';

        Test.startTest();
        // Seed V2 container
        DAUserPreferenceController.saveUserPreference(proj.Id, 'VIEW', 'LAYOUT', null, initialV2, null);

        // V1 write updates activeFilter
        String incomingV1 = '{"search":"New","riskLevels":["HIGH"]}';
        DA_User_Preference__c updated = DAUserPreferenceController.saveUserPreference(proj.Id, 'VIEW', 'LAYOUT', null, incomingV1, null);

        Test.stopTest();

        Assert.isNotNull(updated.Filters_JSON__c);
        Assert.isTrue(updated.Filters_JSON__c.contains('"schemaVersion":2'));
        Assert.isTrue(updated.Filters_JSON__c.contains('"presets":[{"id":"p1","name":"P1"}]'), 'Presets must be preserved intact');
        Assert.isTrue(updated.Filters_JSON__c.contains('"activePresetId":null'), 'Active preset ID must be reset to null on ad-hoc filter change');
        Assert.isTrue(updated.Filters_JSON__c.contains('"search":"New"'), 'Active filter criteria must be updated');
    }

    @IsTest
    static void testR1_MergeV1IntoV2Container_AtomicV2ReplacementAndFailClosed() {
        DA_Project__c proj = [SELECT Id FROM DA_Project__c WHERE Project_Key__c = 'PROJ_ALPHA' LIMIT 1];
        String initialV2 = '{"schemaVersion":2,"activePresetId":"p1","activeFilter":{"search":"Old"},"presets":[{"id":"p1","name":"P1"}]}';
        String replacedV2 = '{"schemaVersion":2,"activePresetId":"p2","activeFilter":{"search":"Replaced"},"presets":[{"id":"p2","name":"P2"}]}';

        Test.startTest();
        // Seed V2 container
        DAUserPreferenceController.saveUserPreference(proj.Id, 'VIEW', 'LAYOUT', null, initialV2, null);

        // Incoming V2 replaces atomically
        DA_User_Preference__c replaced = DAUserPreferenceController.saveUserPreference(proj.Id, 'VIEW', 'LAYOUT', null, replacedV2, null);
        Assert.areEqual(replacedV2, replaced.Filters_JSON__c, 'V2 container replacement must be atomic');

        // Unsupported schemaVersion 99 fails closed and preserves existing data
        String badVersion = '{"schemaVersion":99,"activeFilter":{}}';
        DA_User_Preference__c preservedBadVer = DAUserPreferenceController.saveUserPreference(proj.Id, 'VIEW', 'LAYOUT', null, badVersion, null);
        Assert.areEqual(replacedV2, preservedBadVer.Filters_JSON__c, 'Unsupported schema version must preserve existing stored data');

        // Ambiguous incoming (presets without schemaVersion) fails closed
        String ambiguous = '{"presets":[{"id":"x"}],"activeFilter":{}}';
        DA_User_Preference__c preservedAmbiguous = DAUserPreferenceController.saveUserPreference(proj.Id, 'VIEW', 'LAYOUT', null, ambiguous, null);
        Assert.areEqual(replacedV2, preservedAmbiguous.Filters_JSON__c, 'Ambiguous payload must preserve existing stored data');

        // Empty string clears Filters_JSON__c
        DA_User_Preference__c cleared = DAUserPreferenceController.saveUserPreference(proj.Id, 'VIEW', 'LAYOUT', null, '', null);
        Assert.areEqual('', cleared.Filters_JSON__c, 'Empty string should clear Filters_JSON__c');

        Test.stopTest();
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
