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
                SELECT Id, User__c, Project__c, Preference_Key__c,
                       Active_View_Mode__c, Active_Layout_Mode__c,
                       Positions_JSON__c, Filters_JSON__c, Zoom_Pan_JSON__c
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

            if (viewMode != null) {
                prefRecord.Active_View_Mode__c = viewMode;
            }
            if (layoutMode != null) {
                prefRecord.Active_Layout_Mode__c = layoutMode;
            }
            if (positionsJson != null) {
                prefRecord.Positions_JSON__c = positionsJson;
            }
            if (filtersJson != null) {
                prefRecord.Filters_JSON__c = mergeV1IntoV2Container(prefRecord.Filters_JSON__c, filtersJson);
            }
            if (zoomPanJson != null) {
                prefRecord.Zoom_Pan_JSON__c = zoomPanJson;
            }

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

    @TestVisible
    private static String mergeV1IntoV2Container(String existingV2Json, String incomingFilterJson) {
        // Empty string incoming is an explicit clear operation
        if (incomingFilterJson != null && incomingFilterJson.trim() == '') {
            return '';
        }

        // Null incoming or blank incoming preserves existing stored value
        if (incomingFilterJson == null) {
            return existingV2Json;
        }

        // If existing is blank or null, incoming replaces directly
        if (String.isBlank(existingV2Json)) {
            return incomingFilterJson;
        }

        try {
            Object deserializedIncoming = JSON.deserializeUntyped(incomingFilterJson);
            if (!(deserializedIncoming instanceof Map<String, Object>)) {
                // Non-object incoming structure fails closed and preserves existing data
                return existingV2Json;
            }
            Map<String, Object> incomingMap = (Map<String, Object>) deserializedIncoming;

            // Incoming V2 payload: atomic replacement of existing container
            if (incomingMap.containsKey('schemaVersion')) {
                Object verObj = incomingMap.get('schemaVersion');
                Integer incomingVer = 0;
                if (verObj instanceof Integer || verObj instanceof Long || verObj instanceof Decimal) {
                    incomingVer = Integer.valueOf(verObj);
                }
                if (incomingVer == 2) {
                    // Valid V2 incoming container replaces existing container atomically
                    return incomingFilterJson;
                } else {
                    // Unsupported schema version fails closed and preserves existing data
                    return existingV2Json;
                }
            }

            // Ambiguous incoming payload (contains presets but missing schemaVersion) fails closed
            if (incomingMap.containsKey('presets')) {
                return existingV2Json;
            }

            // Deserialize existing stored payload
            Object deserializedExisting = JSON.deserializeUntyped(existingV2Json);
            if (!(deserializedExisting instanceof Map<String, Object>)) {
                // Malformed existing container fails closed and preserves existing
                return existingV2Json;
            }
            Map<String, Object> existingContainer = (Map<String, Object>) deserializedExisting;

            Boolean hasSchemaVer = existingContainer.containsKey('schemaVersion');
            Boolean hasPresets = existingContainer.containsKey('presets');

            // If existing is ambiguous (presets without schemaVersion), fail closed
            if (!hasSchemaVer && hasPresets) {
                return existingV2Json;
            }

            if (hasSchemaVer) {
                Object existingVerObj = existingContainer.get('schemaVersion');
                Integer existingVer = 0;
                if (existingVerObj instanceof Integer || existingVerObj instanceof Long || existingVerObj instanceof Decimal) {
                    existingVer = Integer.valueOf(existingVerObj);
                }

                if (existingVer == 2) {
                    // Existing is V2 container and incoming is flat V1
                    // Merge incoming V1 criteria into existing activeFilter while preserving presets
                    existingContainer.put('activeFilter', incomingMap);
                    existingContainer.put('activePresetId', null); // Ad-hoc modification clears active preset ID
                    return JSON.serialize(existingContainer);
                } else {
                    // Unsupported existing version fails closed
                    return existingV2Json;
                }
            }

            // Existing was flat V1 and incoming is flat V1 -> standard V1 update
            return incomingFilterJson;
        } catch (Exception e) {
            // FAIL-CLOSED INVARIANT: Return existing stored value intact on any error
            return existingV2Json;
        }
    }
}
