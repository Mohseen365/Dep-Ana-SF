/**
 * @description Append-only protection trigger for DA_Security_Audit_Log__c.
 * Strictly prevents modifications (BEFORE UPDATE) and deletions (BEFORE DELETE).
 */
trigger DASecurityAuditLogTrigger on DA_Security_Audit_Log__c (before update, before delete) {
    if (Trigger.isBefore) {
        if (Trigger.isUpdate) {
            for (DA_Security_Audit_Log__c log : Trigger.new) {
                log.addError('DA_AUDIT_IMMUTABLE: Security audit log entries cannot be modified or deleted.');
            }
        } else if (Trigger.isDelete) {
            for (DA_Security_Audit_Log__c log : Trigger.old) {
                log.addError('DA_AUDIT_IMMUTABLE: Security audit log entries cannot be modified or deleted.');
            }
        }
    }
}
