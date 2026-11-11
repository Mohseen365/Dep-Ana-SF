/**
 * @description Schedulable and batch service to perform supplementary cleanup of expired emergency shares.
 * Runtime authorization rejects expired leases dynamically at query time; this service performs physical
 * share record garbage collection without affecting runtime fail-closed security.
 */
public with sharing class DAEmergencyAccessCleanupService implements Schedulable, Database.Batchable<sObject> {

    public void execute(SchedulableContext sc) {
        Database.executeBatch(new DAEmergencyAccessCleanupService(), 100);
    }

    public Database.QueryLocator start(Database.BatchableContext bc) {
        Datetime currentDatetime = Datetime.now();
        // Query expired or revoked grants that are still marked Is_Active__c = true
        return Database.getQueryLocator([
            SELECT Id, Project__c, User__c, Expires_At__c, Revoked__c, Is_Active__c
            FROM DA_Emergency_Access_Grant__c
            WHERE (Expires_At__c <= :currentDatetime OR Revoked__c = TRUE)
              AND Is_Active__c = TRUE
            WITH USER_MODE
        ]);
    }

    public void execute(Database.BatchableContext bc, List<DA_Emergency_Access_Grant__c> scope) {
        if (scope == null || scope.isEmpty()) {
            return;
        }

        List<DA_Emergency_Access_Grant__c> toDeactivate = new List<DA_Emergency_Access_Grant__c>();

        for (DA_Emergency_Access_Grant__c grant : scope) {
            grant.Is_Active__c = false;
            toDeactivate.add(grant);

            // Attempt share cleanup
            try {
                DAProjectSecurityService.cleanupShareRow(grant.Project__c, grant.User__c);
            } catch (Exception ex) {
                DAProjectSecurityService.logAuditEvent(
                    grant.Project__c,
                    grant.User__c,
                    DAProjectSecurityService.ACTION_CLEANUP_FAILURE,
                    'Scheduled cleanup failure for grant ' + grant.Id + ': ' + ex.getMessage()
                );
            }
        }

        if (!toDeactivate.isEmpty()) {
            update as user toDeactivate;
        }
    }

    public void finish(Database.BatchableContext bc) {
        // Scheduled cleanup batch complete
    }
}
