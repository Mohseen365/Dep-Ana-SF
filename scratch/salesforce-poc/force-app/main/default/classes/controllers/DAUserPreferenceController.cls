public with sharing class DAUserPreferenceController {

    private static Boolean isValidId(String str) {
        if (String.isBlank(str)) {
            return false;
        }
        try {
            Id evalId = (Id) str;
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @AuraEnabled(cacheable=true)
    public static DA_User_Preference__c getUserPreference(String projectId) {
        if (String.isBlank(projectId)) {
            throw new AuraHandledException('Project ID parameter cannot be null or blank.');
        }

        try {
            Id currentUserId = UserInfo.getUserId();
            Boolean isId = isValidId(projectId);

            List<DA_User_Preference__c> prefs;
            if (isId) {
                prefs = [
                    SELECT Id, User__c, Project__c, Preference_Key__c,
                           Active_View_Mode__c, Active_Layout_Mode__c,
                           Positions_JSON__c, Filters_JSON__c, Zoom_Pan_JSON__c
                    FROM DA_User_Preference__c
                    WHERE (User__c = :currentUserId OR CreatedById = :currentUserId)
                      AND Project__c = :projectId
                    WITH USER_MODE
                    LIMIT 1
                ];
            } else {
                prefs = [
                    SELECT Id, User__c, Project__c, Preference_Key__c,
                           Active_View_Mode__c, Active_Layout_Mode__c,
                           Positions_JSON__c, Filters_JSON__c, Zoom_Pan_JSON__c
                    FROM DA_User_Preference__c
                    WHERE (User__c = :currentUserId OR CreatedById = :currentUserId)
                      AND Project__r.Project_Key__c = :projectId
                    WITH USER_MODE
                    LIMIT 1
                ];
            }

            if (prefs.isEmpty()) {
                return null;
            }

            return prefs[0];
        } catch (Exception e) {
            throw new AuraHandledException('Failed to retrieve user preferences: ' + e.getMessage());
        }
    }

    @AuraEnabled
    public static DA_User_Preference__c saveUserPreference(
        String projectId,
        String viewMode,
        String layoutMode,
        String positionsJson,
        String filtersJson,
        String zoomPanJson
    ) {
        if (String.isBlank(projectId)) {
            throw new AuraHandledException('Project ID parameter cannot be null or blank.');
        }

        // Payload length validation
        if (positionsJson != null && positionsJson.length() > 131072) {
            throw new AuraHandledException('Positions JSON exceeds maximum allowed length of 131,072 characters.');
        }
        if (filtersJson != null && filtersJson.length() > 131072) {
            throw new AuraHandledException('Filters JSON exceeds maximum allowed length of 131,072 characters.');
        }
        if (zoomPanJson != null && zoomPanJson.length() > 131072) {
            throw new AuraHandledException('Zoom Pan JSON exceeds maximum allowed length of 131,072 characters.');
        }

        // JSON payload syntax validation
        validateJsonString(positionsJson, 'Positions');
        validateJsonString(filtersJson, 'Filters');
        validateJsonString(zoomPanJson, 'Zoom/Pan');

        try {
            Id currentUserId = UserInfo.getUserId();
            Boolean isId = isValidId(projectId);

            List<DA_Project__c> projects;
            if (isId) {
                projects = [
                    SELECT Id, Project_Key__c
                    FROM DA_Project__c
                    WHERE Id = :projectId
                    WITH USER_MODE
                    LIMIT 1
                ];
            } else {
                projects = [
                    SELECT Id, Project_Key__c
                    FROM DA_Project__c
                    WHERE Project_Key__c = :projectId
                    WITH USER_MODE
                    LIMIT 1
                ];
            }

            if (projects.isEmpty()) {
                throw new AuraHandledException('Project not found or unauthorized: ' + projectId);
            }

            DA_Project__c targetProject = projects[0];
            String prefKey = String.valueOf(currentUserId) + ':' + String.valueOf(targetProject.Id);

            List<DA_User_Preference__c> existingPrefs = [
                SELECT Id, User__c, Project__c, Preference_Key__c
                FROM DA_User_Preference__c
                WHERE Preference_Key__c = :prefKey
                WITH USER_MODE
                LIMIT 1
            ];

            DA_User_Preference__c prefRecord;
            if (!existingPrefs.isEmpty()) {
                prefRecord = existingPrefs[0];
            } else {
                prefRecord = new DA_User_Preference__c();
                prefRecord.User__c = currentUserId;
                prefRecord.Project__c = targetProject.Id;
                prefRecord.Preference_Key__c = prefKey;
            }

            prefRecord.Active_View_Mode__c = viewMode;
            prefRecord.Active_Layout_Mode__c = layoutMode;
            prefRecord.Positions_JSON__c = positionsJson;
            prefRecord.Filters_JSON__c = filtersJson;
            prefRecord.Zoom_Pan_JSON__c = zoomPanJson;

            upsert as user prefRecord Preference_Key__c;

            return prefRecord;
        } catch (Exception e) {
            throw new AuraHandledException('Failed to save user preferences: ' + e.getMessage());
        }
    }

    private static void validateJsonString(String input, String fieldName) {
        if (String.isNotBlank(input)) {
            try {
                JSON.deserializeUntyped(input);
            } catch (Exception e) {
                throw new AuraHandledException('Malformed ' + fieldName + ' JSON payload: ' + e.getMessage());
            }
        }
    }
}
