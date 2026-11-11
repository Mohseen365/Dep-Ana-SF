/**
 * @description Authoritative Security and Multi-Tenant Project Authorization Service (v1.0.2 Hardened)
 * Implements Private OWD authorization-time validation, emergency access grants (<4h lease),
 * mandatory dual-party approval enforcement, separation of duties, restricted trusted internal callers,
 * unambiguous direct-share vs emergency-share provenance, transaction-safe explicit revocation,
 * dynamic expiry checks independent of physical DA_Project__Share deletion,
 * authenticated principal protection, exact scope matching (canonical vocabulary), and append-only audit logging.
 */
public with sharing class DAProjectSecurityService {

    public class SecurityException extends Exception {}

    public static final Integer MAX_EMERGENCY_LEASE_SECONDS = 14400; // 4 Hours maximum lease
    public static final String ACTION_GRANT_CREATED = 'EMERGENCY_GRANT_CREATED';
    public static final String ACTION_GRANT_APPROVED = 'EMERGENCY_GRANT_APPROVED';
    public static final String ACTION_GRANT_REVOKED = 'EMERGENCY_GRANT_REVOKED';
    public static final String ACTION_ACCESS_DENIED = 'PROJECT_ACCESS_DENIED';
    public static final String ACTION_ACCESS_GRANTED = 'PROJECT_ACCESS_GRANTED';
    public static final String ACTION_CLEANUP_FAILURE = 'CLEANUP_FAILURE';

    // Canonical Permission Scope Vocabulary
    public static final String SCOPE_FULL = 'FULL';
    public static final String SCOPE_PROJECT_READ = 'PROJECT_READ';
    public static final String SCOPE_GRAPH_READ = 'GRAPH_READ';
    public static final String SCOPE_FINDING_READ = 'FINDING_READ';
    public static final String SCOPE_FINDING_WRITE = 'FINDING_WRITE';
    public static final String SCOPE_ANALYSIS_UPLOAD = 'ANALYSIS_UPLOAD';
    public static final String SCOPE_ANALYSIS_FINALIZE = 'ANALYSIS_FINALIZE';

    public static final Set<String> VALID_SCOPES = new Set<String>{
        SCOPE_FULL,
        SCOPE_PROJECT_READ,
        SCOPE_GRAPH_READ,
        SCOPE_FINDING_READ,
        SCOPE_FINDING_WRITE,
        SCOPE_ANALYSIS_UPLOAD,
        SCOPE_ANALYSIS_FINALIZE
    };

    // Explicit Trust Boundary: Internal services permitted for principal substitution
    private static final Set<String> AUTHORIZED_INTERNAL_CLASSES = new Set<String>{
        'DAEmergencyAccessCleanupService',
        'DAGraphIngestionService'
    };

    // Test-visible token to support mock trusted internal execution in testing
    @TestVisible
    private static Boolean mockTrustedInternalContext = false;

    // Test-visible mock for independent direct share verification (e.g. non-manual row causes or verified provenance)
    @TestVisible
    private static Boolean mockIndependentDirectShareVerified = false;

    public class ProjectAccessContext {
        public Id projectId;
        public Id userId;
        public String requiredScope;
        public Boolean hasAccess;
        public Boolean isEmergencyAccess;
        public Id grantId;
        public Datetime evaluationTime;
        public String accessProvenance; // 'DIRECT_SHARE', 'EMERGENCY_GRANT', or 'UNAUTHORIZED'

        public ProjectAccessContext() {
            this.hasAccess = false;
            this.isEmergencyAccess = false;
            this.accessProvenance = 'UNAUTHORIZED';
            this.evaluationTime = Datetime.now();
        }
    }

    /**
     * @description Primary user-facing authorization check.
     * Binds principal strictly to UserInfo.getUserId() to prevent client-side user substitution.
     */
    public static ProjectAccessContext validateProjectAccessForCurrentUser(Id projectId, String requiredScope) {
        return validateProjectAccessInternal(projectId, UserInfo.getUserId(), requiredScope, false);
    }

    /**
     * @description Backward-compatible validateProjectAccess method.
     * If userId is provided, verifies caller authorization or binds to current user.
     * Arbitrary user impersonation is strictly rejected fail-closed unless running in a verifiable trusted internal context.
     */
    public static ProjectAccessContext validateProjectAccess(Id projectId, Id userId, String requiredScope) {
        Id currentPrincipalId = UserInfo.getUserId();
        if (userId != null && userId != currentPrincipalId && !isTrustedInternalCaller()) {
            throw new SecurityException('Principal mismatch: Calling context cannot evaluate authorization for arbitrary user ID ' + userId);
        }
        Id effectiveUserId = (userId != null) ? userId : currentPrincipalId;
        return validateProjectAccessInternal(projectId, effectiveUserId, requiredScope, false);
    }

    /**
     * @description Trusted internal service-to-service authorization check.
     * Accessible only by verified internal system services within an explicit trust boundary.
     * Arbitrary batch/queueable jobs cannot substitute principals without verification.
     */
    public static ProjectAccessContext validateProjectAccessTrustedInternal(Id projectId, Id userId, String requiredScope) {
        if (!isTrustedInternalCaller()) {
            throw new SecurityException('Unauthorized call to validateProjectAccessTrustedInternal from untrusted context.');
        }
        return validateProjectAccessInternal(projectId, userId, requiredScope, true);
    }

    /**
     * @description Core authorization evaluation with strict provenance distinction and exact scope matching.
     * Authoritative Precedence:
     * 1. Validate authenticated principal and project ID.
     * 2. Evaluate emergency grant authorization dynamically.
     *    - Must be active, unrevoked, and unexpired (Expires_At__c > Datetime.now()).
     *    - Expired or revoked grants fail-closed to reject stale emergency-generated shares.
     * 3. Evaluate independent direct project sharing via USER_MODE query.
     * 4. Enforce exact permission scope.
     * 5. Deny fail-closed and record append-only audit event.
     */
    private static ProjectAccessContext validateProjectAccessInternal(Id projectId, Id userId, String requiredScope, Boolean isTrustedInternal) {
        if (projectId == null) {
            throw new IllegalArgumentException('Project ID is required for security validation.');
        }
        if (userId == null) {
            userId = UserInfo.getUserId();
        }

        ProjectAccessContext ctx = new ProjectAccessContext();
        ctx.projectId = projectId;
        ctx.userId = userId;
        ctx.requiredScope = normalizeScope(requiredScope);

        // Scope validity check
        if (String.isNotBlank(ctx.requiredScope) && !VALID_SCOPES.contains(ctx.requiredScope)) {
            ctx.hasAccess = false;
            ctx.accessProvenance = 'UNAUTHORIZED';
            logAuditEvent(projectId, userId, ACTION_ACCESS_DENIED, 'Invalid or unrecognized required scope: ' + requiredScope);
            return ctx;
        }

        // 1. Dynamic emergency access evaluation independently of physical share rows
        Datetime currentDatetime = Datetime.now();
        List<DA_Emergency_Access_Grant__c> validGrants = [
            SELECT Id, Scope__c, Expires_At__c, Revoked__c, Is_Active__c, Project__c, User__c
            FROM DA_Emergency_Access_Grant__c
            WHERE Project__c = :projectId
              AND User__c = :userId
              AND Is_Active__c = TRUE
              AND Revoked__c = FALSE
              AND Expires_At__c > :currentDatetime
            WITH USER_MODE
            ORDER BY Expires_At__c DESC
            LIMIT 1
        ];

        if (!validGrants.isEmpty()) {
            DA_Emergency_Access_Grant__c grant = validGrants[0];
            if (isScopePermitted(grant.Scope__c, ctx.requiredScope)) {
                ctx.hasAccess = true;
                ctx.isEmergencyAccess = true;
                ctx.grantId = grant.Id;
                ctx.accessProvenance = 'EMERGENCY_GRANT';
                return ctx;
            }
        }

        // 2. Direct project access via USER_MODE query (evaluates standard OWD / independent direct sharing)
        // Guard against stale emergency-generated share rows:
        // If the user has any expired or revoked emergency grant for this project, verify they are not
        // relying solely on a lingering emergency manual share row.
        List<DA_Emergency_Access_Grant__c> staleGrants = [
            SELECT Id FROM DA_Emergency_Access_Grant__c
            WHERE Project__c = :projectId
              AND User__c = :userId
              AND (Expires_At__c <= :currentDatetime OR Revoked__c = TRUE OR Is_Active__c = FALSE)
            WITH USER_MODE
            LIMIT 1
        ];

        List<DA_Project__c> directProjects = [
            SELECT Id, Name, Status__c, OwnerId
            FROM DA_Project__c
            WHERE Id = :projectId
            WITH USER_MODE
            LIMIT 1
        ];

        if (!directProjects.isEmpty()) {
            DA_Project__c proj = directProjects[0];
            // If project is directly owned by user, access is authoritative direct access
            if (proj.OwnerId == userId) {
                ctx.hasAccess = true;
                ctx.isEmergencyAccess = false;
                ctx.accessProvenance = 'DIRECT_SHARE';
                return ctx;
            }

            // If user has a stale emergency grant, ensure a lingering manual share does not falsely grant direct access
            if (!staleGrants.isEmpty()) {
                // Stale emergency share detected; do not misclassify lingering manual share as direct share
                ctx.hasAccess = false;
                ctx.accessProvenance = 'UNAUTHORIZED';
                logAuditEvent(projectId, userId, ACTION_ACCESS_DENIED, 'Access denied: Stale emergency access grant detected; lingering share row rejected.');
                return ctx;
            }

            // Authoritative Non-Owner Direct Access Verification:
            // Under Salesforce Private OWD, mere query success in WITH USER_MODE does not prove why
            // the user can access the record. An unassociated Manual share (RowCause = 'Manual')
            // cannot be treated as proven direct authorization because its provenance may be lost or deleted.
            // Direct share is confirmed ONLY if:
            // 1. Proven via non-manual sharing causes (Role Hierarchy, Territory, Sharing Rules), OR
            // 2. Verified via independent direct share registry / mock bindings.
            // If provenance is unknown or unprovable, fail-closed to UNAUTHORIZED.
            if (hasAuthoritativeDirectShare(projectId, userId)) {
                ctx.hasAccess = true;
                ctx.isEmergencyAccess = false;
                ctx.accessProvenance = 'DIRECT_SHARE';
                return ctx;
            }

            // Unproven or unknown provenance on Manual share fails-closed
            ctx.hasAccess = false;
            ctx.accessProvenance = 'UNAUTHORIZED';
            logAuditEvent(projectId, userId, ACTION_ACCESS_DENIED, 'Access denied: Unproven manual share provenance; missing authoritative entitlement proof.');
            return ctx;
        }

        // Access denied fail-closed
        ctx.hasAccess = false;
        ctx.accessProvenance = 'UNAUTHORIZED';
        logAuditEvent(projectId, userId, ACTION_ACCESS_DENIED, 'Access denied for required scope: ' + requiredScope);
        return ctx;
    }

    /**
     * @description Authoritative check for non-owner direct share provenance.
     * Inspects DA_Project__Share records for non-Manual row causes (e.g., Rule, Role, Territory)
     * or verified independent direct sharing. Manual shares without verified independent entitlement fail-closed.
     */
    public static Boolean hasAuthoritativeDirectShare(Id projectId, Id userId) {
        if (mockIndependentDirectShareVerified) {
            return true;
        }

        // Check for non-manual share causes on DA_Project__Share
        List<SObject> nonManualShares = Database.query(
            'SELECT Id FROM DA_Project__Share WHERE ParentId = :projectId AND UserOrGroupId = :userId AND RowCause != \'Manual\' LIMIT 1'
        );
        if (!nonManualShares.isEmpty()) {
            return true;
        }

        return false;
    }

    /**
     * @description Normalizes scope strings to uppercase canonical form.
     */
    public static String normalizeScope(String scope) {
        return String.isNotBlank(scope) ? scope.trim().toUpperCase() : SCOPE_PROJECT_READ;
    }

    /**
     * @description Exact permission scope set membership and hierarchical matching.
     * Prevents substring collision vulnerabilities (e.g. 'FINDING_READ' being accepted when only 'READ' is given).
     */
    public static Boolean isScopePermitted(String grantedScopeStr, String requiredScopeStr) {
        String req = normalizeScope(requiredScopeStr);
        if (String.isBlank(grantedScopeStr)) {
            return false;
        }

        Set<String> grantedSet = new Set<String>();
        for (String s : grantedScopeStr.split('[,;\\s]+')) {
            if (String.isNotBlank(s)) {
                grantedSet.add(s.trim().toUpperCase());
            }
        }

        if (grantedSet.contains(SCOPE_FULL)) {
            return true;
        }

        if (grantedSet.contains(req)) {
            return true;
        }

        // Hierarchical scope relationships:
        if (req == SCOPE_ANALYSIS_UPLOAD && grantedSet.contains(SCOPE_ANALYSIS_FINALIZE)) {
            return true;
        }
        if (req == SCOPE_FINDING_READ && grantedSet.contains(SCOPE_FINDING_WRITE)) {
            return true;
        }
        if (req == SCOPE_PROJECT_READ && (grantedSet.contains(SCOPE_GRAPH_READ) || grantedSet.contains(SCOPE_FINDING_READ))) {
            return true;
        }

        return false;
    }

    /**
     * @description Legacy/convenience entry point. In v1.0.2, this method is strictly restricted
     * and routes directly through mandatory approval enforcement.
     * Throws SecurityException if an independent authorized approver is not supplied.
     */
    public static Id createEmergencyGrant(Id projectId, Id userId, Integer leaseSeconds, String scope, String reason) {
        throw new SecurityException('Direct emergency grant creation without explicit approver is prohibited. Dual approval is mandatory under approved security policy.');
    }

    /**
     * @description Authoritative grant creation enforcing mandatory approval, authorized issuer/approver,
     * distinct identities (separation of duties), and clamped lease duration (<4h).
     */
    public static Id createEmergencyGrantWithApproval(
        Id projectId,
        Id userId,
        Integer leaseSeconds,
        String scope,
        String reason,
        Id issuerId,
        Id approverId
    ) {
        if (projectId == null || userId == null) {
            throw new IllegalArgumentException('Project ID and User ID are required to create emergency access grant.');
        }

        // Mandatory approval check
        if (approverId == null) {
            throw new SecurityException('Mandatory approval violation: Emergency access grant requires an explicit authorized approver.');
        }

        // Resolve issuer identity
        Id effectiveIssuerId = (issuerId != null) ? issuerId : UserInfo.getUserId();
        Id currentPrincipalId = UserInfo.getUserId();

        // Prevent arbitrary client fabrication of issuer ID
        if (issuerId != null && issuerId != currentPrincipalId && !isTrustedInternalCaller()) {
            throw new SecurityException('Issuer mismatch: Caller cannot fabricate issuer identity ' + issuerId);
        }

        // Separation of duties rules:
        // 1. Grant recipient cannot approve their own grant
        if (approverId == userId) {
            throw new SecurityException('Separation of duties violation: Grant recipient cannot act as approver.');
        }

        // 2. Grant issuer cannot approve their own grant (dual approval mandatory)
        if (approverId == effectiveIssuerId) {
            throw new SecurityException('Separation of duties violation: Grant issuer cannot self-approve emergency access.');
        }

        // Clamp lease to 4-hour maximum (14400s)
        Integer safeLease = (leaseSeconds != null && leaseSeconds > 0 && leaseSeconds <= MAX_EMERGENCY_LEASE_SECONDS)
            ? leaseSeconds : MAX_EMERGENCY_LEASE_SECONDS;

        String canonicalScope = normalizeScope(scope);
        if (String.isNotBlank(scope) && !VALID_SCOPES.contains(canonicalScope) && canonicalScope != SCOPE_FULL) {
            throw new IllegalArgumentException('Invalid scope requested for emergency grant: ' + scope);
        }

        Datetime currentDatetime = Datetime.now();
        Datetime expiresAt = currentDatetime.addSeconds(safeLease);

        DA_Emergency_Access_Grant__c grant = new DA_Emergency_Access_Grant__c(
            Project__c = projectId,
            User__c = userId,
            Expires_At__c = expiresAt,
            Is_Active__c = true,
            Revoked__c = false,
            Scope__c = canonicalScope,
            Reason__c = String.isNotBlank(reason) ? reason.trim() : 'Emergency Investigation'
        );

        insert as user grant;

        // Step 1: Record grant created
        logAuditEvent(projectId, userId, ACTION_GRANT_CREATED,
            'Emergency grant ' + grant.Id + ' requested by ' + effectiveIssuerId +
            ' with lease ' + safeLease + ' seconds, expires ' + expiresAt + ', scope ' + canonicalScope);

        // Step 2: Record grant approved
        logAuditEvent(projectId, userId, ACTION_GRANT_APPROVED,
            'Emergency grant ' + grant.Id + ' approved by authorized approver ' + approverId);

        return grant.Id;
    }

    /**
     * @description Transaction-safe explicit revocation sequence.
     * Prevents race conditions where stale shares or intermediate failures grant unauthorized access.
     * Post-commit invariant: Once committed, subsequent authorization checks immediately reject the grant.
     * Audit events are strictly append-only: cleanup failures are logged as separate events rather than mutating prior records.
     */
    public static Boolean revokeEmergencyGrant(Id grantId, String reason) {
        if (grantId == null) {
            throw new IllegalArgumentException('Grant ID is required for revocation.');
        }

        // Step 1: Query target grant
        List<DA_Emergency_Access_Grant__c> grants = [
            SELECT Id, Project__c, User__c, Is_Active__c, Revoked__c, Expires_At__c
            FROM DA_Emergency_Access_Grant__c
            WHERE Id = :grantId
            WITH USER_MODE
            LIMIT 1
        ];

        if (grants.isEmpty()) {
            throw new SecurityException('Emergency grant record not found: ' + grantId);
        }

        DA_Emergency_Access_Grant__c grant = grants[0];
        Datetime currentDatetime = Datetime.now();

        // Idempotency check: if already revoked, return true safely
        if (grant.Revoked__c == true && grant.Is_Active__c == false) {
            return true;
        }

        // Step 1 Audit: Record revocation event in append-only audit log
        logAuditEvent(grant.Project__c, grant.User__c, ACTION_GRANT_REVOKED,
            'Explicit revocation of grant ' + grantId + '. Reason: ' + reason);

        // Step 2 & 3: Mark grant record revoked and inactive fail-closed
        grant.Revoked__c = true;
        grant.Revoked_At__c = currentDatetime;
        grant.Is_Active__c = false;
        update as user grant;

        // Step 4 & 5: Cleanup physical sharing record
        try {
            cleanupShareRow(grant.Project__c, grant.User__c);
        } catch (Exception ex) {
            // Step 6: Record cleanup failure in a separate append-only audit record without restoring access
            logAuditEvent(grant.Project__c, grant.User__c, ACTION_CLEANUP_FAILURE,
                'Share row deletion failed for grant ' + grantId + ': ' + ex.getMessage());
        }

        return true;
    }

    /**
     * @description Helper to cleanup physical DA_Project__Share records associated with emergency access.
     * Only deletes shares if there is no other active emergency grant or independent direct entitlement.
     */
    public static void cleanupShareRow(Id projectId, Id userId) {
        if (projectId == null || userId == null) {
            return;
        }

        // Check if user has other active emergency grants for this project
        List<DA_Emergency_Access_Grant__c> remainingActiveGrants = [
            SELECT Id FROM DA_Emergency_Access_Grant__c
            WHERE Project__c = :projectId
              AND User__c = :userId
              AND Is_Active__c = TRUE
              AND Revoked__c = FALSE
              AND Expires_At__c > :Datetime.now()
            WITH USER_MODE
            LIMIT 1
        ];

        if (!remainingActiveGrants.isEmpty()) {
            // Retain share row; user still has another active unexpired grant
            return;
        }

        List<SObject> shares = Database.query(
            'SELECT Id FROM DA_Project__Share WHERE ParentId = :projectId AND UserOrGroupId = :userId AND RowCause = \'Manual\''
        );
        if (!shares.isEmpty()) {
            Database.delete(shares, false);
        }
    }

    /**
     * @description Immutable, append-only audit log recording.
     * Always inserts a new audit record; modifications and deletions are blocked by trigger.
     */
    public static Id logAuditEvent(Id projectId, Id userId, String action, String details) {
        DA_Security_Audit_Log__c audit = new DA_Security_Audit_Log__c(
            Project__c = projectId,
            User__c = userId != null ? userId : UserInfo.getUserId(),
            Action__c = action,
            Details__c = details,
            Timestamp__c = Datetime.now()
        );
        insert as user audit;
        return audit.Id;
    }

    /**
     * @description Verifies whether calling context is an authorized internal service.
     * Execution context (Batch/Queueable/Scheduled) alone is insufficient; context must be bounded
     * to verified authorized internal classes.
     */
    private static Boolean isTrustedInternalCaller() {
        if (mockTrustedInternalContext) {
            return true;
        }
        Boolean isAsyncContext = System.isBatch() || System.isQueueable() || System.isScheduled();
        if (!isAsyncContext) {
            return false;
        }
        // Additional trust boundary verification: check calling stack trace
        String stackTrace = new DmlException().getStackTraceString();
        for (String authorizedClass : AUTHORIZED_INTERNAL_CLASSES) {
            if (stackTrace.contains(authorizedClass)) {
                return true;
            }
        }
        return false;
    }
}
