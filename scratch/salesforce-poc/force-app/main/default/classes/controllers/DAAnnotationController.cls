public with sharing class DAAnnotationController {

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
    public static List<DA_Annotation__c> getAnnotations(String projectId, String nodeId) {
        if (String.isBlank(projectId)) {
            throw new AuraHandledException('Project ID parameter cannot be null or blank.');
        }

        try {
            Boolean isId = isValidId(projectId);
            Boolean hasNode = String.isNotBlank(nodeId);

            if (isId) {
                if (hasNode) {
                    return [
                        SELECT Id, Name, Project__c, Finding__c, Node_Id__c, Author__c,
                               Text__c, Status__c, Resolved_At__c, CreatedDate, LastModifiedDate
                        FROM DA_Annotation__c
                        WHERE Project__c = :projectId
                          AND Node_Id__c = :nodeId
                        WITH USER_MODE
                        ORDER BY CreatedDate DESC
                    ];
                } else {
                    return [
                        SELECT Id, Name, Project__c, Finding__c, Node_Id__c, Author__c,
                               Text__c, Status__c, Resolved_At__c, CreatedDate, LastModifiedDate
                        FROM DA_Annotation__c
                        WHERE Project__c = :projectId
                        WITH USER_MODE
                        ORDER BY CreatedDate DESC
                    ];
                }
            } else {
                if (hasNode) {
                    return [
                        SELECT Id, Name, Project__c, Finding__c, Node_Id__c, Author__c,
                               Text__c, Status__c, Resolved_At__c, CreatedDate, LastModifiedDate
                        FROM DA_Annotation__c
                        WHERE Project__r.Project_Key__c = :projectId
                          AND Node_Id__c = :nodeId
                        WITH USER_MODE
                        ORDER BY CreatedDate DESC
                    ];
                } else {
                    return [
                        SELECT Id, Name, Project__c, Finding__c, Node_Id__c, Author__c,
                               Text__c, Status__c, Resolved_At__c, CreatedDate, LastModifiedDate
                        FROM DA_Annotation__c
                        WHERE Project__r.Project_Key__c = :projectId
                        WITH USER_MODE
                        ORDER BY CreatedDate DESC
                    ];
                }
            }
        } catch (Exception e) {
            throw new AuraHandledException('Failed to retrieve annotations: ' + e.getMessage());
        }
    }

    @AuraEnabled
    public static DA_Annotation__c createAnnotation(
        String projectId,
        String nodeId,
        String title,
        String text,
        String status,
        String findingId
    ) {
        if (String.isBlank(projectId)) {
            throw new AuraHandledException('Project ID parameter cannot be null or blank.');
        }
        if (String.isBlank(nodeId)) {
            throw new AuraHandledException('Node ID parameter cannot be null or blank.');
        }
        if (String.isBlank(text)) {
            throw new AuraHandledException('Annotation text cannot be null or blank.');
        }

        // Length validations
        if (title != null && title.length() > 255) {
            throw new AuraHandledException('Annotation title exceeds maximum allowed length of 255 characters.');
        }
        if (nodeId.length() > 255) {
            throw new AuraHandledException('Node ID exceeds maximum allowed length of 255 characters.');
        }
        if (text.length() > 32768) {
            throw new AuraHandledException('Annotation text exceeds maximum allowed length of 32,768 characters.');
        }

        try {
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

            DA_Annotation__c ann = new DA_Annotation__c();
            ann.Project__c = targetProject.Id;
            ann.Node_Id__c = nodeId;
            ann.Name = String.isNotBlank(title) ? title : ('Note - ' + nodeId);
            ann.Author__c = UserInfo.getName();
            ann.Text__c = text;
            ann.Status__c = String.isNotBlank(status) ? status : 'OPEN';

            if (String.isNotBlank(findingId) && isValidId(findingId)) {
                List<DA_Finding__c> findings = [
                    SELECT Id FROM DA_Finding__c WHERE Id = :findingId WITH USER_MODE LIMIT 1
                ];
                if (!findings.isEmpty()) {
                    ann.Finding__c = findings[0].Id;
                }
            }

            insert as user ann;

            return [
                SELECT Id, Name, Project__c, Finding__c, Node_Id__c, Author__c,
                       Text__c, Status__c, Resolved_At__c, CreatedDate, LastModifiedDate
                FROM DA_Annotation__c
                WHERE Id = :ann.Id
                WITH USER_MODE
                LIMIT 1
            ];
        } catch (Exception e) {
            throw new AuraHandledException('Failed to create annotation: ' + e.getMessage());
        }
    }

    @AuraEnabled
    public static DA_Annotation__c updateAnnotation(
        String annotationId,
        String title,
        String text,
        String status
    ) {
        if (String.isBlank(annotationId) || !isValidId(annotationId)) {
            throw new AuraHandledException('Annotation ID parameter cannot be null, blank, or invalid.');
        }

        if (title != null && title.length() > 255) {
            throw new AuraHandledException('Annotation title exceeds maximum allowed length of 255 characters.');
        }
        if (text != null && text.length() > 32768) {
            throw new AuraHandledException('Annotation text exceeds maximum allowed length of 32,768 characters.');
        }

        try {
            List<DA_Annotation__c> existing = [
                SELECT Id, Name, Text__c, Status__c, Resolved_At__c
                FROM DA_Annotation__c
                WHERE Id = :annotationId
                WITH USER_MODE
                LIMIT 1
            ];

            if (existing.isEmpty()) {
                throw new AuraHandledException('Annotation record not found or unauthorized: ' + annotationId);
            }

            DA_Annotation__c ann = existing[0];

            if (String.isNotBlank(title)) {
                ann.Name = title;
            }
            if (String.isNotBlank(text)) {
                ann.Text__c = text;
            }
            if (String.isNotBlank(status)) {
                if (status == 'RESOLVED' && ann.Status__c != 'RESOLVED') {
                    ann.Resolved_At__c = System.now();
                }
                ann.Status__c = status;
            }

            update as user ann;

            return [
                SELECT Id, Name, Project__c, Finding__c, Node_Id__c, Author__c,
                       Text__c, Status__c, Resolved_At__c, CreatedDate, LastModifiedDate
                FROM DA_Annotation__c
                WHERE Id = :ann.Id
                WITH USER_MODE
                LIMIT 1
            ];
        } catch (Exception e) {
            throw new AuraHandledException('Failed to update annotation: ' + e.getMessage());
        }
    }

    @AuraEnabled
    public static Boolean deleteAnnotation(String annotationId) {
        if (String.isBlank(annotationId) || !isValidId(annotationId)) {
            throw new AuraHandledException('Annotation ID parameter cannot be null, blank, or invalid.');
        }

        try {
            List<DA_Annotation__c> existing = [
                SELECT Id FROM DA_Annotation__c WHERE Id = :annotationId WITH USER_MODE LIMIT 1
            ];

            if (existing.isEmpty()) {
                throw new AuraHandledException('Annotation record not found or unauthorized: ' + annotationId);
            }

            delete as user existing[0];
            return true;
        } catch (Exception e) {
            throw new AuraHandledException('Failed to delete annotation: ' + e.getMessage());
        }
    }
}
