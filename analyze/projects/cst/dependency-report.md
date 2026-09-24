# Salesforce Dependency Report

## LWC → Apex

| LWC | Apex | Method |
|---|---|---|
| LWC:account-metrics | ApexClass:AccountController | getAccountsWithServices |
| LWC:account-metrics | ApexClass:AccountController | getAccountSpendHistory |
| LWC:admin-audit | ApexClass:AdminAuditController | getAuditLogs |
| LWC:admin-budgets | ApexClass:BudgetController | getOrganizationBudgets |
| LWC:admin-data-explorer | ApexClass:AdminDataExplorerController | getObjectRecords |
| LWC:admin-data-health | ApexClass:AdminHealthController | getHealthStatus |
| LWC:admin-overview | ApexClass:AdminOverviewController | getOverviewMetrics |
| LWC:admin-spend-explorer | ApexClass:AdminSpendController | getGlobalSpendExplorer |
| LWC:data-importer | ApexClass:ImportController | processInvoiceCSV |
| LWC:filter-panel | ApexClass:OrganizationController | getUserOrganizations |
| LWC:forecast-manager | ApexClass:ForecastController | manageForecasts |
| LWC:forecast-manager | ApexClass:ForecastController | getForecasts |
| LWC:forecast-manager | ApexClass:OrganizationController | getUserOrganizations |
| LWC:forecast-manager | ApexClass:SpendController | getAggregatedSpend |
| LWC:forecast-manager | ApexClass:FiscalController | getPeriodMapping |
| LWC:forecast-manager | ApexClass:BudgetController | getOrganizationBudgets |
| LWC:forecast-manager | ApexClass:BudgetController | manageBudget |
| LWC:forecast-manager | ApexClass:BudgetController | clearBudget |
| LWC:home-overview | ApexClass:SpendController | getAggregatedSpend |
| LWC:home-overview | ApexClass:BudgetController | getOrganizationBudgets |
| LWC:home-overview | ApexClass:OrganizationController | getUserOrganizations |
| LWC:home-overview | ApexClass:BudgetAlertController | getBudgetAlerts |
| LWC:organization-tree | ApexClass:OrganizationService | getUserOrganizations |
| LWC:organization-tree | ApexClass:SpendController | getAggregatedSpend |
| LWC:spend-analytics | ApexClass:SpendController | getAggregatedSpend |
| LWC:spend-analytics | ApexClass:OrganizationController | getUserOrganizations |
| LWC:spend-analytics | ApexClass:BudgetController | getOrganizationBudgets |
| LWC:spend-analytics | ApexClass:ForecastController | getForecasts |
| LWC:top-services-table | ApexClass:SpendController | getAggregatedSpend |
| LWC:user-management | ApexClass:UserController | getUserHierarchyAccess |
| LWC:user-management | ApexClass:UserController | getUsersList |
| LWC:user-management | ApexClass:OrganizationController | getUserOrganizations |
| LWC:user-management | ApexClass:UserController | assignUserRole |
| LWC:user-management | ApexClass:UserController | removeUserRole |

## LWC → LWC

| Parent | Child | Type |
|---|---|---|
| LWC:home-overview | LWC:utils | lwc-import |
| LWC:organization-tree | LWC:utils | lwc-import |
| LWC:admin-audit | LWC:error-panel | lwc-template-child |
| LWC:admin-budgets | LWC:error-panel | lwc-template-child |
| LWC:admin-cloud-accounts | LWC:account-metrics | lwc-template-child |
| LWC:admin-data-explorer | LWC:error-panel | lwc-template-child |
| LWC:admin-data-health | LWC:error-panel | lwc-template-child |
| LWC:admin-forecasts | LWC:forecast-manager | lwc-template-child |
| LWC:administration-nav | LWC:user-management | lwc-template-child |
| LWC:administration-nav | LWC:data-importer | lwc-template-child |
| LWC:admin-organizations | LWC:organization-tree | lwc-template-child |
| LWC:admin-overview | LWC:error-panel | lwc-template-child |
| LWC:admin-spend-explorer | LWC:error-panel | lwc-template-child |
| LWC:admin-user-access | LWC:user-management | lwc-template-child |
| LWC:app-shell | LWC:spend-tracker-nav | lwc-template-child |
| LWC:app-shell | LWC:administration-nav | lwc-template-child |
| LWC:home-overview | LWC:spend-analytics | lwc-template-child |
| LWC:home-overview | LWC:top-services-table | lwc-template-child |
| LWC:organization-tree | LWC:error-panel | lwc-template-child |
| LWC:spend-tracker-nav | LWC:home-overview | lwc-template-child |
| LWC:spend-tracker-nav | LWC:organization-tree | lwc-template-child |
| LWC:spend-tracker-nav | LWC:account-metrics | lwc-template-child |
| LWC:spend-tracker-nav | LWC:forecast-manager | lwc-template-child |
| LWC:spend-tracker-nav | LWC:filter-panel | lwc-template-child |
| LWC:spend-tracker-nav | LWC:spend-analytics | lwc-template-child |
| LWC:system-admin-app | LWC:admin-overview | lwc-template-child |
| LWC:system-admin-app | LWC:admin-spend-explorer | lwc-template-child |
| LWC:system-admin-app | LWC:admin-data-explorer | lwc-template-child |
| LWC:system-admin-app | LWC:admin-organizations | lwc-template-child |
| LWC:system-admin-app | LWC:admin-cloud-accounts | lwc-template-child |
| LWC:system-admin-app | LWC:admin-budgets | lwc-template-child |
| LWC:system-admin-app | LWC:admin-forecasts | lwc-template-child |
| LWC:system-admin-app | LWC:admin-user-access | lwc-template-child |
| LWC:system-admin-app | LWC:admin-audit | lwc-template-child |
| LWC:system-admin-app | LWC:admin-data-health | lwc-template-child |

## Apex → Apex

| From | To | Type | Method |
|---|---|---|---|
| ApexClass:AccountController | ApexClass:AccountService | method-call | getAccountsWithServices -> getAccountsWithServices |
| ApexClass:AccountController | ApexClass:AccountService | method-call | getAccountSpendHistory -> getAccountSpendHistory |
| ApexClass:AccountService | External:AccountWrapper | instantiation |  |
| ApexClass:AccountService | External:SpendHistoryWrapper | instantiation |  |
| ApexClass:AccountService | ApexClass:CloudAccountSelector | method-call | getAccountsWithServices -> selectAllWithOrgInfo |
| ApexClass:AccountService | ApexClass:CloudServiceSelector | method-call | getAccountsWithServices -> selectByCloudAccountIds |
| ApexClass:AccountService | ApexClass:CloudSpendSelector | method-call | getAccountSpendHistory -> selectByAccountIds |
| ApexClass:AccountService | CustomObject:Cloud_Spend__c | type-reference | getAccountSpendHistory |
| ApexClass:AccountService | CustomObject:Cloud_Account__c | type-reference | getAccountsWithServices |
| ApexClass:AccountService | External:AccountWrapper | generic-type |  |
| ApexClass:AccountService | CustomObject:Cloud_Account__c | generic-type | getAccountsWithServices |
| ApexClass:AccountService | External:SpendHistoryWrapper | generic-type |  |
| ApexClass:AccountService | CustomObject:Cloud_Spend__c | generic-type | getAccountSpendHistory |
| ApexClass:AccountServiceTest | CustomObject:Organization_Hierarchy__c | instantiation | setup |
| ApexClass:AccountServiceTest | CustomObject:Cloud_Account__c | instantiation | setup |
| ApexClass:AccountServiceTest | CustomObject:Cloud_Service__c | instantiation | setup |
| ApexClass:AccountServiceTest | CustomObject:Cloud_Spend__c | instantiation | setup |
| ApexClass:AccountServiceTest | ApexClass:AccountService | method-call | testGetAccountsWithServices -> getAccountsWithServices |
| ApexClass:AccountServiceTest | External:Assert | method-call | testGetAccountsWithServices -> isNotNull |
| ApexClass:AccountServiceTest | External:Assert | method-call | testGetAccountsWithServices -> isFalse |
| ApexClass:AccountServiceTest | External:Assert | method-call | testGetAccountsWithServices -> areEqual |
| ApexClass:AccountServiceTest | ApexClass:AccountService | method-call | testGetAccountSpendHistory -> getAccountSpendHistory |
| ApexClass:AccountServiceTest | External:Assert | method-call | testGetAccountSpendHistory -> isTrue |
| ApexClass:AccountServiceTest | CustomObject:Organization_Hierarchy__c | type-reference | setup |
| ApexClass:AccountServiceTest | CustomObject:Cloud_Account__c | type-reference | setup |
| ApexClass:AccountServiceTest | CustomObject:Cloud_Service__c | type-reference | setup |
| ApexClass:AccountServiceTest | CustomObject:Cloud_Spend__c | type-reference | setup |
| ApexClass:AccountServiceTest | ApexClass:AccountService | test-reference |  |
| ApexClass:AdminAccessServiceTest | External:User | instantiation | testAdminControllersWithAdminUser |
| ApexClass:AdminAccessServiceTest | External:PermissionSetAssignment | instantiation | testAdminControllersWithAdminUser |
| ApexClass:AdminAccessServiceTest | ApexClass:AdminOverviewController | method-call | testAdminControllersWithAdminUser -> getOverviewMetrics |
| ApexClass:AdminAccessServiceTest | ApexClass:AdminSpendController | method-call | testAdminControllersWithAdminUser -> getGlobalSpendExplorer |
| ApexClass:AdminAccessServiceTest | ApexClass:AdminDataExplorerController | method-call | testAdminControllersWithAdminUser -> getObjectRecords |
| ApexClass:AdminAccessServiceTest | ApexClass:AdminUserController | method-call | testAdminControllersWithAdminUser -> getAllUsers |
| ApexClass:AdminAccessServiceTest | ApexClass:AdminAuditController | method-call | testAdminControllersWithAdminUser -> getAuditLogs |
| ApexClass:AdminAccessServiceTest | ApexClass:AdminHealthController | method-call | testAdminControllersWithAdminUser -> getHealthStatus |
| ApexClass:AdminAccessServiceTest | External:Profile | type-reference | testAdminControllersWithAdminUser |
| ApexClass:AdminAccessServiceTest | External:User | type-reference | testAdminControllersWithAdminUser |
| ApexClass:AdminAccessServiceTest | External:PermissionSet | type-reference | testAdminControllersWithAdminUser |
| ApexClass:AdminAccessServiceTest | External:AdminOverviewWrapper | type-reference | testAdminControllersWithAdminUser |
| ApexClass:AdminAccessServiceTest | ApexClass:QueryResult | type-reference | testAdminControllersWithAdminUser |
| ApexClass:AdminAccessServiceTest | External:HealthCheckWrapper | type-reference | testAdminControllersWithAdminUser |
| ApexClass:AdminAccessServiceTest | External:User | generic-type | testAdminControllersWithAdminUser |
| ApexClass:AdminAccessServiceTest | CustomObject:Action_Audit__c | generic-type | testAdminControllersWithAdminUser |
| ApexClass:AdminAccessServiceTest | ApexClass:AdminOverviewController | test-reference |  |
| ApexClass:AdminAccessServiceTest | ApexClass:QueryResult | test-reference |  |
| ApexClass:AdminAccessServiceTest | ApexClass:AdminSpendController | test-reference |  |
| ApexClass:AdminAccessServiceTest | ApexClass:AdminDataExplorerController | test-reference |  |
| ApexClass:AdminAccessServiceTest | ApexClass:AdminUserController | test-reference |  |
| ApexClass:AdminAccessServiceTest | ApexClass:AdminAuditController | test-reference |  |
| ApexClass:AdminAccessServiceTest | ApexClass:AdminHealthController | test-reference |  |
| ApexClass:AdminAuditController | ApexClass:SpendTrackerAuthorizationService | method-call | getAuditLogs -> isSystemAdmin |
| ApexClass:AdminAuditController | ApexClass:AuditService | method-call | getAuditLogs -> getAuditLogs |
| ApexClass:AdminAuditController | CustomObject:Action_Audit__c | generic-type |  |
| ApexClass:AdminDataExplorerController | ApexClass:QueryResult | instantiation |  |
| ApexClass:AdminDataExplorerController | ApexClass:SpendTrackerAuthorizationService | method-call | getObjectRecords -> isSystemAdmin |
| ApexClass:AdminHealthController | External:HealthCheckWrapper | instantiation | getHealthStatus |
| ApexClass:AdminHealthController | ApexClass:SpendTrackerAuthorizationService | method-call | getHealthStatus -> isSystemAdmin |
| ApexClass:AdminHealthController | External:HealthCheckWrapper | type-reference |  |
| ApexClass:AdminOverviewController | External:AdminOverviewWrapper | instantiation | getOverviewMetrics |
| ApexClass:AdminOverviewController | External:SpendImportBatchDTO | instantiation | getOverviewMetrics |
| ApexClass:AdminOverviewController | ApexClass:SpendTrackerAuthorizationService | method-call | getOverviewMetrics -> isSystemAdmin |
| ApexClass:AdminOverviewController | External:AdminOverviewWrapper | type-reference |  |
| ApexClass:AdminOverviewController | External:SpendImportBatchDTO | type-reference | getOverviewMetrics |
| ApexClass:AdminOverviewController | CustomObject:Spend_Import_Batch__c | generic-type | getOverviewMetrics |
| ApexClass:AdminOverviewController | External:SpendImportBatchDTO | generic-type | getOverviewMetrics |
| ApexClass:AdminSpendController | ApexClass:QueryResult | instantiation |  |
| ApexClass:AdminSpendController | ApexClass:SpendTrackerAuthorizationService | method-call | getGlobalSpendExplorer -> isSystemAdmin |
| ApexClass:AdminSpendController | External:Year__c | type-reference | getGlobalSpendExplorer |
| ApexClass:AdminSpendController | CustomObject:Cloud_Spend__c | generic-type | getGlobalSpendExplorer |
| ApexClass:AdminUserController | ApexClass:SpendTrackerAuthorizationService | method-call | getAllUsers -> isSystemAdmin |
| ApexClass:AdminUserController | ApexClass:UserSelector | method-call | getAllUsers -> selectAllUsers |
| ApexClass:AdminUserController | ApexClass:UserOrganizationRoleSelector | method-call | getAllUserRoles -> selectAllWithUserInfo |
| ApexClass:AdminUserController | External:User | generic-type |  |
| ApexClass:AdminUserController | CustomObject:User_Organization_Role__c | generic-type |  |
| ApexClass:AuditService | CustomObject:Action_Audit__c | instantiation | logAction |
| ApexClass:AuditService | CustomObject:Action_Audit__c | generic-type |  |
| ApexClass:AuditServiceTest | ApexClass:AuditService | method-call | testLogActionSuccess -> logAction |
| ApexClass:AuditServiceTest | External:Assert | method-call | testLogActionSuccess -> areEqual |
| ApexClass:AuditServiceTest | External:Assert | method-call | testLogActionExceptionSafety -> isNotNull |
| ApexClass:AuditServiceTest | CustomObject:Action_Audit__c | generic-type | testLogActionSuccess |
| ApexClass:AuditServiceTest | ApexClass:AuditService | test-reference |  |
| ApexClass:AuthorizationServiceTest | External:Account | instantiation | setupTestData |
| ApexClass:AuthorizationServiceTest | CustomObject:Organization_Hierarchy__c | instantiation | setupTestData |
| ApexClass:AuthorizationServiceTest | External:User | instantiation | setupTestData |
| ApexClass:AuthorizationServiceTest | CustomObject:User_Organization_Role__c | instantiation | setupTestData |
| ApexClass:AuthorizationServiceTest | CustomObject:Cloud_Account__c | instantiation | setupTestData |
| ApexClass:AuthorizationServiceTest | CustomObject:Cloud_Spend__c | instantiation | setupTestData |
| ApexClass:AuthorizationServiceTest | External:Contact | instantiation | createExternalUserWithContact |
| ApexClass:AuthorizationServiceTest | External:PermissionSetAssignment | instantiation | testAdminUserAccessScoping |
| ApexClass:AuthorizationServiceTest | ApexClass:SpendTrackerAuthorizationService | method-call | testStandardUserAccessScoping -> getAccessContext |
| ApexClass:AuthorizationServiceTest | ApexClass:SpendTrackerAuthorizationService | method-call | testStandardUserAccessScoping -> canViewOrganization |
| ApexClass:AuthorizationServiceTest | ApexClass:OrganizationTriggerHandler | method-call | testDefenseInDepthMalformedCrossTenantTraversalsCannotLeak -> setExecuting |
| ApexClass:AuthorizationServiceTest | ApexClass:SpendTrackerAuthorizationService | method-call | testSpendIsolationForNormalUser -> canViewCloudAccount |
| ApexClass:AuthorizationServiceTest | ApexClass:SpendTrackerAuthorizationService | method-call | testAdminUserAccessScoping -> isSystemAdmin |
| ApexClass:AuthorizationServiceTest | External:Assert | method-call | testP14_1_UserOnlyAuthorization -> isTrue |
| ApexClass:AuthorizationServiceTest | External:Assert | method-call | testP14_4_ContactHasNoContactId -> isNull |
| ApexClass:AuthorizationServiceTest | External:Assert | method-call | testP14_5_ContactWithNoRole -> isFalse |
| ApexClass:AuthorizationServiceTest | External:Assert | method-call | testP14_14_DuplicateRolesDeduplication -> areEqual |
| ApexClass:AuthorizationServiceTest | External:Assert | method-call | testP14_15_BulkRolePopulationPerformance -> isNotNull |
| ApexClass:AuthorizationServiceTest | ApexClass:SpendTrackerAuthorizationService | method-call | testP14_16_AuthorizationParityGate -> getLegacyUserOnlyAccessContext |
| ApexClass:AuthorizationServiceTest | External:Account | type-reference | setupTestData |
| ApexClass:AuthorizationServiceTest | CustomObject:Organization_Hierarchy__c | type-reference | setupTestData |
| ApexClass:AuthorizationServiceTest | External:Profile | type-reference | setupTestData |
| ApexClass:AuthorizationServiceTest | External:User | type-reference | setupTestData |
| ApexClass:AuthorizationServiceTest | CustomObject:User_Organization_Role__c | type-reference | setupTestData |
| ApexClass:AuthorizationServiceTest | CustomObject:Cloud_Account__c | type-reference | setupTestData |
| ApexClass:AuthorizationServiceTest | CustomObject:Cloud_Spend__c | type-reference | setupTestData |
| ApexClass:AuthorizationServiceTest | External:Contact | type-reference | createExternalUserWithContact |
| ApexClass:AuthorizationServiceTest | ApexClass:SpendTrackerAccessContext | type-reference | testStandardUserAccessScoping |
| ApexClass:AuthorizationServiceTest | External:PermissionSet | type-reference | testAdminUserAccessScoping |
| ApexClass:AuthorizationServiceTest | External:Account | generic-type | setupTestData |
| ApexClass:AuthorizationServiceTest | CustomObject:Organization_Hierarchy__c | generic-type | setupTestData |
| ApexClass:AuthorizationServiceTest | External:User | generic-type | setupTestData |
| ApexClass:AuthorizationServiceTest | CustomObject:Cloud_Account__c | generic-type | setupTestData |
| ApexClass:AuthorizationServiceTest | CustomObject:Cloud_Spend__c | generic-type | setupTestData |
| ApexClass:AuthorizationServiceTest | CustomObject:User_Organization_Role__c | generic-type | testP14_3_UserPlusContactAuthorizationUnion |
| ApexClass:AuthorizationServiceTest | ApexClass:SpendTrackerAccessContext | test-reference |  |
| ApexClass:AuthorizationServiceTest | ApexClass:SpendTrackerAuthorizationService | test-reference |  |
| ApexClass:AuthorizationServiceTest | ApexClass:OrganizationTriggerHandler | test-reference |  |
| ApexClass:BudgetAlertController | ApexClass:BudgetAlertService | method-call | getBudgetAlerts -> getBudgetAlerts |
| ApexClass:BudgetAlertService | External:BudgetAlertWrapper | instantiation |  |
| ApexClass:BudgetAlertService | ApexClass:OrganizationBudgetSelector | method-call | getBudgetAlerts -> selectByOrgIds |
| ApexClass:BudgetAlertService | ApexClass:SpendService | method-call | getBudgetAlerts -> getAggregatedSpend |
| ApexClass:BudgetAlertService | External:BudgetAlertWrapper | generic-type |  |
| ApexClass:BudgetAlertService | CustomObject:Organization_Budget__c | generic-type | getBudgetAlerts |
| ApexClass:BudgetAlertServiceTest | CustomObject:Organization_Hierarchy__c | instantiation | setup |
| ApexClass:BudgetAlertServiceTest | CustomObject:Cloud_Account__c | instantiation | setup |
| ApexClass:BudgetAlertServiceTest | CustomObject:Cloud_Spend__c | instantiation | setup |
| ApexClass:BudgetAlertServiceTest | CustomObject:Organization_Budget__c | instantiation | setup |
| ApexClass:BudgetAlertServiceTest | ApexClass:BudgetAlertService | method-call | testGetBudgetAlertsWithOrgIds -> getBudgetAlerts |
| ApexClass:BudgetAlertServiceTest | External:Assert | method-call | testGetBudgetAlertsWithOrgIds -> isFalse |
| ApexClass:BudgetAlertServiceTest | External:Assert | method-call | testGetBudgetAlertsWithOrgIds -> areEqual |
| ApexClass:BudgetAlertServiceTest | CustomObject:Organization_Hierarchy__c | type-reference | setup |
| ApexClass:BudgetAlertServiceTest | CustomObject:Cloud_Account__c | type-reference | setup |
| ApexClass:BudgetAlertServiceTest | CustomObject:Cloud_Spend__c | type-reference | setup |
| ApexClass:BudgetAlertServiceTest | CustomObject:Organization_Budget__c | type-reference | setup |
| ApexClass:BudgetAlertServiceTest | ApexClass:BudgetAlertService | test-reference |  |
| ApexClass:BudgetController | ApexClass:BudgetService | method-call | getOrganizationBudgets -> getOrganizationBudgets |
| ApexClass:BudgetController | ApexClass:BudgetService | method-call | manageBudget -> manageBudget |
| ApexClass:BudgetController | ApexClass:BudgetService | method-call | clearBudget -> clearBudget |
| ApexClass:BudgetService | External:BudgetWrapper | instantiation |  |
| ApexClass:BudgetService | CustomObject:Organization_Budget__c | instantiation | manageBudget |
| ApexClass:BudgetService | ApexClass:OrganizationBudgetSelector | method-call | getOrganizationBudgets -> selectAllWithOrgInfo |
| ApexClass:BudgetService | ApexClass:OrganizationBudgetSelector | method-call | manageBudget -> selectByOrgIdAndYear |
| ApexClass:BudgetService | ApexClass:AuditService | method-call | manageBudget -> logAction |
| ApexClass:BudgetService | CustomObject:Organization_Budget__c | type-reference | getOrganizationBudgets |
| ApexClass:BudgetService | External:BudgetWrapper | generic-type |  |
| ApexClass:BudgetService | CustomObject:Organization_Budget__c | generic-type | getOrganizationBudgets |
| ApexClass:BudgetServiceTest | CustomObject:Organization_Hierarchy__c | instantiation | setup |
| ApexClass:BudgetServiceTest | ApexClass:BudgetService | method-call | testManageAndGetBudgets -> manageBudget |
| ApexClass:BudgetServiceTest | ApexClass:BudgetService | method-call | testManageAndGetBudgets -> getOrganizationBudgets |
| ApexClass:BudgetServiceTest | External:Assert | method-call | testManageAndGetBudgets -> areEqual |
| ApexClass:BudgetServiceTest | ApexClass:BudgetService | method-call | testManageAndGetBudgets -> clearBudget |
| ApexClass:BudgetServiceTest | External:Assert | method-call | testManageAndGetBudgets -> isTrue |
| ApexClass:BudgetServiceTest | CustomObject:Organization_Hierarchy__c | type-reference | setup |
| ApexClass:BudgetServiceTest | ApexClass:BudgetService | test-reference |  |
| ApexClass:CloudAccountController | ApexClass:AccountService | method-call | getAccountsWithServices -> getAccountsWithServices |
| ApexClass:CloudAccountSelector | CustomObject:Cloud_Account__c | generic-type |  |
| ApexClass:CloudAccountService | ApexClass:AccountService | method-call | getAccountsWithServices -> getAccountsWithServices |
| ApexClass:CloudServiceSelector | CustomObject:Cloud_Service__c | generic-type |  |
| ApexClass:CloudSpendMonthBackfillBatch | External:BatchableContext | type-reference | start |
| ApexClass:CloudSpendMonthBackfillBatch | CustomObject:Cloud_Spend__c | generic-type | execute |
| ApexClass:CloudSpendMonthBackfillBatch | External:Database.Batchable<SObject> | implements |  |
| ApexClass:CloudSpendOrganizationRefactorTest | External:Account | instantiation | setupData |
| ApexClass:CloudSpendOrganizationRefactorTest | External:Contact | instantiation | setupData |
| ApexClass:CloudSpendOrganizationRefactorTest | External:User | instantiation | setupData |
| ApexClass:CloudSpendOrganizationRefactorTest | CustomObject:Organization_Hierarchy__c | instantiation | setupData |
| ApexClass:CloudSpendOrganizationRefactorTest | CustomObject:User_Organization_Role__c | instantiation | setupData |
| ApexClass:CloudSpendOrganizationRefactorTest | CustomObject:Cloud_Account__c | instantiation | setupData |
| ApexClass:CloudSpendOrganizationRefactorTest | CustomObject:Cloud_Spend__c | instantiation | setupData |
| ApexClass:CloudSpendOrganizationRefactorTest | ApexClass:SpendService | method-call | testDirectOrganizationResolution -> getAggregatedSpend |
| ApexClass:CloudSpendOrganizationRefactorTest | External:Assert | method-call | testDirectOrganizationResolution -> isFalse |
| ApexClass:CloudSpendOrganizationRefactorTest | External:Assert | method-call | testDirectOrganizationResolution -> areEqual |
| ApexClass:CloudSpendOrganizationRefactorTest | ApexClass:CloudSpendSelector | method-call | testDuplicateOrganizationNamesAcrossTenants -> selectAggregatedSpend |
| ApexClass:CloudSpendOrganizationRefactorTest | External:Assert | method-call | testMultipleOrganizationsSameProvider -> isTrue |
| ApexClass:CloudSpendOrganizationRefactorTest | External:Assert | method-call | testUnlinkedCloudAccount -> areNotEqual |
| ApexClass:CloudSpendOrganizationRefactorTest | ApexClass:AdminHealthController | method-call | testUnlinkedCloudAccount -> getHealthStatus |
| ApexClass:CloudSpendOrganizationRefactorTest | ApexClass:AdminSpendController | method-call | testSystemAdminSpendVisibility -> getGlobalSpendExplorer |
| ApexClass:CloudSpendOrganizationRefactorTest | External:Assert | method-call | testSystemAdminSpendVisibility -> isNotNull |
| ApexClass:CloudSpendOrganizationRefactorTest | External:Account | type-reference | setupData |
| ApexClass:CloudSpendOrganizationRefactorTest | External:Contact | type-reference | setupData |
| ApexClass:CloudSpendOrganizationRefactorTest | External:Profile | type-reference | setupData |
| ApexClass:CloudSpendOrganizationRefactorTest | External:User | type-reference | setupData |
| ApexClass:CloudSpendOrganizationRefactorTest | CustomObject:Organization_Hierarchy__c | type-reference | setupData |
| ApexClass:CloudSpendOrganizationRefactorTest | CustomObject:User_Organization_Role__c | type-reference | setupData |
| ApexClass:CloudSpendOrganizationRefactorTest | CustomObject:Cloud_Account__c | type-reference | setupData |
| ApexClass:CloudSpendOrganizationRefactorTest | External:HealthCheckWrapper | type-reference | testUnlinkedCloudAccount |
| ApexClass:CloudSpendOrganizationRefactorTest | CustomObject:Cloud_Spend__c | type-reference | setupData |
| ApexClass:CloudSpendOrganizationRefactorTest | ApexClass:QueryResult | type-reference | testSystemAdminSpendVisibility |
| ApexClass:CloudSpendOrganizationRefactorTest | External:Account | generic-type | setupData |
| ApexClass:CloudSpendOrganizationRefactorTest | External:Contact | generic-type | setupData |
| ApexClass:CloudSpendOrganizationRefactorTest | CustomObject:Organization_Hierarchy__c | generic-type | setupData |
| ApexClass:CloudSpendOrganizationRefactorTest | CustomObject:Cloud_Account__c | generic-type | setupData |
| ApexClass:CloudSpendOrganizationRefactorTest | CustomObject:Cloud_Spend__c | generic-type | setupData |
| ApexClass:CloudSpendOrganizationRefactorTest | ApexClass:SpendService | test-reference |  |
| ApexClass:CloudSpendOrganizationRefactorTest | ApexClass:CloudSpendSelector | test-reference |  |
| ApexClass:CloudSpendOrganizationRefactorTest | ApexClass:AdminHealthController | test-reference |  |
| ApexClass:CloudSpendOrganizationRefactorTest | ApexClass:QueryResult | test-reference |  |
| ApexClass:CloudSpendOrganizationRefactorTest | ApexClass:AdminSpendController | test-reference |  |
| ApexClass:CloudSpendSelector | External:QueryException | type-reference | selectByAccountIds |
| ApexClass:CloudSpendSelector | External:Organization__c | type-reference | selectAggregatedSpend |
| ApexClass:CloudSpendSelector | External:Cloud_Provider__c | type-reference | selectAggregatedSpend |
| ApexClass:CloudSpendSelector | External:Spend_Month__c | type-reference | selectAggregatedSpend |
| ApexClass:CloudSpendSelector | External:Service__c | type-reference | selectAggregatedSpend |
| ApexClass:CloudSpendSelector | External:Region__c | type-reference | selectAggregatedSpend |
| ApexClass:CloudSpendSelector | CustomObject:Cloud_Spend__c | generic-type |  |
| ApexClass:CloudSpendService | ApexClass:SpendService | method-call | getAggregatedSpend -> getAggregatedSpend |
| ApexClass:CloudSpendTriggerHandler | CustomObject:Cloud_Spend__c | type-reference | populateSpendMonth |
| ApexClass:CloudSpendTriggerHandler | CustomObject:Cloud_Spend__c | generic-type | populateSpendMonth |
| ApexClass:CloudSpendTriggerHandlerTest | CustomObject:Cloud_Spend__c | instantiation | setupData |
| ApexClass:CloudSpendTriggerHandlerTest | ApexClass:CloudSpendMonthBackfillBatch | instantiation | testBatchBackfill |
| ApexClass:CloudSpendTriggerHandlerTest | CustomObject:Cloud_Spend__c | type-reference | setupData |
| ApexClass:CloudSpendTriggerHandlerTest | External:SaveResult | type-reference | testInvalidMonthZero |
| ApexClass:CloudSpendTriggerHandlerTest | CustomObject:Cloud_Spend__c | generic-type | testBulkInsert |
| ApexClass:CloudSpendTriggerHandlerTest | ApexClass:CloudSpendMonthBackfillBatch | test-reference |  |
| ApexClass:ControllersTest | CustomObject:Organization_Hierarchy__c | instantiation | setup |
| ApexClass:ControllersTest | CustomObject:Cloud_Account__c | instantiation | setup |
| ApexClass:ControllersTest | CustomObject:Cloud_Service__c | instantiation | setup |
| ApexClass:ControllersTest | CustomObject:Cloud_Spend__c | instantiation | setup |
| ApexClass:ControllersTest | CustomObject:User_Organization_Role__c | instantiation | setup |
| ApexClass:ControllersTest | External:ContentVersion | instantiation | testImportAndSpendControllers |
| ApexClass:ControllersTest | ApexClass:AccountController | method-call | testAccountController -> getAccountsWithServices |
| ApexClass:ControllersTest | ApexClass:AccountController | method-call | testAccountController -> getAccountSpendHistory |
| ApexClass:ControllersTest | External:Assert | method-call | testAccountController -> isFalse |
| ApexClass:ControllersTest | External:Assert | method-call | testAccountController -> isTrue |
| ApexClass:ControllersTest | ApexClass:BudgetController | method-call | testBudgetAlertAndBudgetControllers -> manageBudget |
| ApexClass:ControllersTest | ApexClass:BudgetController | method-call | testBudgetAlertAndBudgetControllers -> getOrganizationBudgets |
| ApexClass:ControllersTest | ApexClass:BudgetAlertController | method-call | testBudgetAlertAndBudgetControllers -> getBudgetAlerts |
| ApexClass:ControllersTest | ApexClass:BudgetController | method-call | testBudgetAlertAndBudgetControllers -> clearBudget |
| ApexClass:ControllersTest | External:Assert | method-call | testBudgetAlertAndBudgetControllers -> isNotNull |
| ApexClass:ControllersTest | ApexClass:ForecastController | method-call | testFiscalAndForecastControllers -> manageForecasts |
| ApexClass:ControllersTest | ApexClass:ForecastController | method-call | testFiscalAndForecastControllers -> getForecasts |
| ApexClass:ControllersTest | ApexClass:FiscalController | method-call | testFiscalAndForecastControllers -> getPeriodMapping |
| ApexClass:ControllersTest | ApexClass:ImportController | method-call | testImportAndSpendControllers -> processInvoiceCSV |
| ApexClass:ControllersTest | ApexClass:SpendController | method-call | testImportAndSpendControllers -> getAggregatedSpend |
| ApexClass:ControllersTest | ApexClass:OrganizationController | method-call | testOrganizationAndUserControllers -> getUserOrganizations |
| ApexClass:ControllersTest | ApexClass:UserController | method-call | testOrganizationAndUserControllers -> assignUserRole |
| ApexClass:ControllersTest | ApexClass:UserController | method-call | testOrganizationAndUserControllers -> getUserHierarchyAccess |
| ApexClass:ControllersTest | ApexClass:UserController | method-call | testOrganizationAndUserControllers -> getUsersList |
| ApexClass:ControllersTest | ApexClass:UserController | method-call | testOrganizationAndUserControllers -> removeUserRole |
| ApexClass:ControllersTest | ApexClass:UserController | method-call | testOrganizationAndUserControllers -> registerUser |
| ApexClass:ControllersTest | External:Assert | method-call | testOrganizationAndUserControllers -> fail |
| ApexClass:ControllersTest | CustomObject:Organization_Hierarchy__c | type-reference | setup |
| ApexClass:ControllersTest | CustomObject:Cloud_Account__c | type-reference | setup |
| ApexClass:ControllersTest | CustomObject:Cloud_Service__c | type-reference | setup |
| ApexClass:ControllersTest | CustomObject:Cloud_Spend__c | type-reference | setup |
| ApexClass:ControllersTest | CustomObject:User_Organization_Role__c | type-reference | setup |
| ApexClass:ControllersTest | External:ContentVersion | type-reference | testImportAndSpendControllers |
| ApexClass:ControllersTest | External:User | generic-type | testOrganizationAndUserControllers |
| ApexClass:ControllersTest | ApexClass:AccountService | test-reference |  |
| ApexClass:ControllersTest | ApexClass:AccountController | test-reference |  |
| ApexClass:ControllersTest | ApexClass:BudgetController | test-reference |  |
| ApexClass:ControllersTest | ApexClass:BudgetService | test-reference |  |
| ApexClass:ControllersTest | ApexClass:BudgetAlertService | test-reference |  |
| ApexClass:ControllersTest | ApexClass:BudgetAlertController | test-reference |  |
| ApexClass:ControllersTest | ApexClass:ForecastController | test-reference |  |
| ApexClass:ControllersTest | ApexClass:ForecastService | test-reference |  |
| ApexClass:ControllersTest | ApexClass:FiscalController | test-reference |  |
| ApexClass:ControllersTest | ApexClass:ImportController | test-reference |  |
| ApexClass:ControllersTest | ApexClass:SpendService | test-reference |  |
| ApexClass:ControllersTest | ApexClass:SpendController | test-reference |  |
| ApexClass:ControllersTest | ApexClass:OrganizationService | test-reference |  |
| ApexClass:ControllersTest | ApexClass:OrganizationController | test-reference |  |
| ApexClass:ControllersTest | ApexClass:UserController | test-reference |  |
| ApexClass:ControllersTest | ApexClass:UserService | test-reference |  |
| ApexClass:create_users | External:ProvisioningException | instantiation | createUsers |
| ApexClass:create_users | External:BusinessDataProvisioningQueueable | instantiation | createUsers |
| ApexClass:create_users | External:User | instantiation |  |
| ApexClass:create_users | External:PermissionSetAssignment | instantiation |  |
| ApexClass:create_users | External:Lead | instantiation |  |
| ApexClass:create_users | External:Account | instantiation | createLeads |
| ApexClass:create_users | External:Contact | instantiation | createLeads |
| ApexClass:create_users | CustomObject:Organization_Hierarchy__c | instantiation | createLeads |
| ApexClass:create_users | CustomObject:User_Organization_Role__c | instantiation |  |
| ApexClass:create_users | CustomObject:Cloud_Account__c | instantiation | createLeads |
| ApexClass:create_users | CustomObject:Cloud_Service__c | instantiation |  |
| ApexClass:create_users | CustomObject:Cloud_Spend__c | instantiation |  |
| ApexClass:create_users | CustomObject:Organization_Budget__c | instantiation |  |
| ApexClass:create_users | CustomObject:Forecast__c | instantiation |  |
| ApexClass:create_users | CustomObject:Action_Audit__c | instantiation |  |
| ApexClass:create_users | External:Email | method-call | createLeads -> toLowerCase |
| ApexClass:create_users | External:User | type-reference |  |
| ApexClass:create_users | External:QueueableContext | type-reference | execute |
| ApexClass:create_users | External:Account | type-reference | createLeads |
| ApexClass:create_users | CustomObject:Organization_Hierarchy__c | type-reference | createLeads |
| ApexClass:create_users | CustomObject:Cloud_Account__c | type-reference | createLeads |
| ApexClass:create_users | External:User | generic-type | createUsers |
| ApexClass:create_users | External:PermissionSetGroup | generic-type |  |
| ApexClass:create_users | External:PermissionSetAssignment | generic-type |  |
| ApexClass:create_users | External:Account | generic-type | createLeads |
| ApexClass:create_users | CustomObject:Organization_Hierarchy__c | generic-type | createLeads |
| ApexClass:create_users | CustomObject:Cloud_Account__c | generic-type | createLeads |
| ApexClass:create_users | External:Lead | generic-type | createLeads |
| ApexClass:create_users | External:Contact | generic-type |  |
| ApexClass:create_users | CustomObject:User_Organization_Role__c | generic-type |  |
| ApexClass:create_users | CustomObject:Cloud_Service__c | generic-type |  |
| ApexClass:create_users | CustomObject:Cloud_Spend__c | generic-type |  |
| ApexClass:create_users | CustomObject:Organization_Budget__c | generic-type |  |
| ApexClass:create_users | CustomObject:Forecast__c | generic-type |  |
| ApexClass:create_users | CustomObject:Action_Audit__c | generic-type |  |
| ApexClass:create_usersTest | External:Assert | method-call | testCreateUsersAndProvisioning -> isTrue |
| ApexClass:create_usersTest | External:Assert | method-call | testCreateUsersAndProvisioning -> isNotNull |
| ApexClass:create_usersTest | External:Assert | method-call | testProvisioningIdempotency -> areEqual |
| ApexClass:create_usersTest | External:Assert | method-call | testQueueableExecution -> isFalse |
| ApexClass:create_usersTest | External:User | type-reference |  |
| ApexClass:create_usersTest | External:Lead | generic-type | testCreateUsersAndProvisioning |
| ApexClass:create_usersTest | External:Account | generic-type | testCreateUsersAndProvisioning |
| ApexClass:create_usersTest | External:Contact | generic-type | testCreateUsersAndProvisioning |
| ApexClass:create_usersTest | CustomObject:Organization_Hierarchy__c | generic-type | testCreateUsersAndProvisioning |
| ApexClass:create_usersTest | CustomObject:User_Organization_Role__c | generic-type | testCreateUsersAndProvisioning |
| ApexClass:create_usersTest | CustomObject:Cloud_Account__c | generic-type | testCreateUsersAndProvisioning |
| ApexClass:create_usersTest | CustomObject:Cloud_Service__c | generic-type | testCreateUsersAndProvisioning |
| ApexClass:create_usersTest | CustomObject:Cloud_Spend__c | generic-type | testCreateUsersAndProvisioning |
| ApexClass:create_usersTest | CustomObject:Organization_Budget__c | generic-type | testCreateUsersAndProvisioning |
| ApexClass:create_usersTest | CustomObject:Forecast__c | generic-type | testCreateUsersAndProvisioning |
| ApexClass:create_usersTest | CustomObject:Action_Audit__c | generic-type | testCreateUsersAndProvisioning |
| ApexClass:ErrorResponse | External:UUID | method-call | randomUUID |
| ApexClass:FiscalController | ApexClass:FiscalUtils | method-call | getPeriodMapping -> getPeriodMapping |
| ApexClass:FiscalPeriodMappingSelector | CustomObject:Fiscal_Period_Mapping__mdt | generic-type |  |
| ApexClass:FiscalUtils | External:PeriodMapping | instantiation |  |
| ApexClass:FiscalUtils | ApexClass:FiscalPeriodMappingSelector | method-call | getPeriodMapping -> selectByFiscalYear |
| ApexClass:FiscalUtils | External:Start_Date__c | method-call | getPeriodMapping -> month |
| ApexClass:FiscalUtils | ApexClass:DateUtils | method-call | getPeriodMapping -> getFirstDayOfMonth |
| ApexClass:FiscalUtils | ApexClass:DateUtils | method-call | getPeriodMapping -> getLastDayOfMonth |
| ApexClass:FiscalUtils | CustomObject:Fiscal_Period_Mapping__mdt | generic-type | getPeriodMapping |
| ApexClass:FiscalUtilsTest | ApexClass:FiscalUtils | method-call | testGetPeriodMapping -> getPeriodMapping |
| ApexClass:FiscalUtilsTest | External:Assert | method-call | testGetPeriodMapping -> isNotNull |
| ApexClass:FiscalUtilsTest | ApexClass:FiscalUtils | test-reference |  |
| ApexClass:ForecastController | ApexClass:ForecastService | method-call | getForecasts -> getForecasts |
| ApexClass:ForecastController | ApexClass:ForecastService | method-call | manageForecasts -> manageForecasts |
| ApexClass:ForecastSelector | CustomObject:Forecast__c | generic-type |  |
| ApexClass:ForecastService | External:ForecastWrapper | instantiation |  |
| ApexClass:ForecastService | CustomObject:Forecast__c | instantiation | manageForecasts |
| ApexClass:ForecastService | ApexClass:ForecastSelector | method-call | getForecasts -> selectForecasts |
| ApexClass:ForecastService | ApexClass:CloudAccountSelector | method-call | manageForecasts -> selectByOrganizationIds |
| ApexClass:ForecastService | ApexClass:ForecastSelector | method-call | manageForecasts -> selectByAccountOrgMonthYear |
| ApexClass:ForecastService | CustomObject:Forecast__c | type-reference | getForecasts |
| ApexClass:ForecastService | External:ForecastWrapper | generic-type |  |
| ApexClass:ForecastService | CustomObject:Forecast__c | generic-type | getForecasts |
| ApexClass:ForecastService | CustomObject:Cloud_Account__c | generic-type | manageForecasts |
| ApexClass:ForecastServiceTest | CustomObject:Organization_Hierarchy__c | instantiation | setup |
| ApexClass:ForecastServiceTest | CustomObject:Cloud_Account__c | instantiation | setup |
| ApexClass:ForecastServiceTest | ApexClass:ForecastService | method-call | testManageAndGetForecasts -> manageForecasts |
| ApexClass:ForecastServiceTest | ApexClass:ForecastService | method-call | testManageAndGetForecasts -> getForecasts |
| ApexClass:ForecastServiceTest | External:Assert | method-call | testManageAndGetForecasts -> areEqual |
| ApexClass:ForecastServiceTest | CustomObject:Organization_Hierarchy__c | type-reference | setup |
| ApexClass:ForecastServiceTest | CustomObject:Cloud_Account__c | type-reference | setup |
| ApexClass:ForecastServiceTest | ApexClass:ForecastService | test-reference |  |
| ApexClass:ImportController | ApexClass:ImportService | method-call | processInvoiceCSV -> processInvoiceCSV |
| ApexClass:ImportService | CustomObject:Cloud_Spend__c | instantiation | processInvoiceCSV |
| ApexClass:ImportService | ApexClass:ContentVersionSelector | method-call | processInvoiceCSV -> selectById |
| ApexClass:ImportService | External:VersionData | method-call | processInvoiceCSV -> toString |
| ApexClass:ImportService | ApexClass:CloudAccountSelector | method-call | processInvoiceCSV -> selectAllAccountIdMap |
| ApexClass:ImportService | ApexClass:AuditService | method-call | processInvoiceCSV -> logAction |
| ApexClass:ImportService | External:ContentVersion | type-reference | processInvoiceCSV |
| ApexClass:ImportService | CustomObject:Cloud_Spend__c | generic-type | processInvoiceCSV |
| ApexClass:ImportServiceTest | CustomObject:Organization_Hierarchy__c | instantiation | setup |
| ApexClass:ImportServiceTest | CustomObject:Cloud_Account__c | instantiation | setup |
| ApexClass:ImportServiceTest | External:ContentVersion | instantiation | testProcessInvoiceCSVValid |
| ApexClass:ImportServiceTest | ApexClass:ImportService | method-call | testProcessInvoiceCSVValid -> processInvoiceCSV |
| ApexClass:ImportServiceTest | External:Assert | method-call | testProcessInvoiceCSVValid -> areEqual |
| ApexClass:ImportServiceTest | External:Assert | method-call | testProcessInvoiceCSVSkipShortLines -> isTrue |
| ApexClass:ImportServiceTest | CustomObject:Organization_Hierarchy__c | type-reference | setup |
| ApexClass:ImportServiceTest | CustomObject:Cloud_Account__c | type-reference | setup |
| ApexClass:ImportServiceTest | External:ContentVersion | type-reference | testProcessInvoiceCSVValid |
| ApexClass:ImportServiceTest | CustomObject:Cloud_Spend__c | generic-type | testProcessInvoiceCSVValid |
| ApexClass:ImportServiceTest | ApexClass:ImportService | test-reference |  |
| ApexClass:OrganizationBudgetSelector | External:QueryException | type-reference | selectAllWithOrgInfo |
| ApexClass:OrganizationBudgetSelector | CustomObject:Organization_Budget__c | generic-type |  |
| ApexClass:OrganizationController | ApexClass:OrganizationService | method-call | getUserOrganizations -> getUserOrganizations |
| ApexClass:OrganizationController | ApexClass:OrganizationService | method-call | createHierarchyNode -> createHierarchyNode |
| ApexClass:OrganizationHierarchySelector | CustomObject:Organization_Hierarchy__c | generic-type |  |
| ApexClass:OrganizationHierarchyService | ApexClass:OrganizationHierarchySelector | method-call | getOrganizationsForUser -> selectAll |
| ApexClass:OrganizationHierarchyService | ApexClass:OrganizationHierarchySelector | method-call | getOrganizationsForUser -> selectByIds |
| ApexClass:OrganizationHierarchyService | ApexClass:SpendTrackerAccessContext | type-reference | getOrganizationsForUser |
| ApexClass:OrganizationHierarchyService | CustomObject:Organization_Hierarchy__c | generic-type |  |
| ApexClass:OrganizationService | External:OrganizationWrapper | instantiation |  |
| ApexClass:OrganizationService | CustomObject:Organization_Hierarchy__c | instantiation | getUserOrganizations |
| ApexClass:OrganizationService | ApexClass:SpendTrackerAuthorizationService | method-call | getUserOrganizations -> getAccessContext |
| ApexClass:OrganizationService | ApexClass:OrganizationHierarchyService | method-call | getUserOrganizations -> getOrganizationsForUser |
| ApexClass:OrganizationService | ApexClass:OrganizationHierarchySelector | method-call | getUserOrganizations -> selectByIds |
| ApexClass:OrganizationService | ApexClass:OrganizationHierarchySelector | method-call | getUserOrganizations -> selectChildrenByParentIds |
| ApexClass:OrganizationService | ApexClass:CloudAccountSelector | method-call | getUserOrganizations -> selectByOrganizationIds |
| ApexClass:OrganizationService | ApexClass:AuditService | method-call | createHierarchyNodeWithAccount -> logAction |
| ApexClass:OrganizationService | External:Starting | type-reference | getUserOrganizations |
| ApexClass:OrganizationService | ApexClass:SpendTrackerAccessContext | type-reference | getUserOrganizations |
| ApexClass:OrganizationService | CustomObject:Organization_Hierarchy__c | type-reference | getUserOrganizations |
| ApexClass:OrganizationService | External:OrganizationWrapper | generic-type |  |
| ApexClass:OrganizationService | CustomObject:Organization_Hierarchy__c | generic-type | getUserOrganizations |
| ApexClass:OrganizationService | CustomObject:Cloud_Account__c | generic-type | getUserOrganizations |
| ApexClass:OrganizationServiceTest | External:Account | instantiation | setup |
| ApexClass:OrganizationServiceTest | CustomObject:Organization_Hierarchy__c | instantiation | setup |
| ApexClass:OrganizationServiceTest | CustomObject:Cloud_Account__c | instantiation | setup |
| ApexClass:OrganizationServiceTest | CustomObject:User_Organization_Role__c | instantiation | setup |
| ApexClass:OrganizationServiceTest | ApexClass:OrganizationService | method-call | testGetUserOrganizationsAdmin -> getUserOrganizations |
| ApexClass:OrganizationServiceTest | External:Assert | method-call | testGetUserOrganizationsAdmin -> isFalse |
| ApexClass:OrganizationServiceTest | External:Assert | method-call | testGetUserOrganizationsAdmin -> areEqual |
| ApexClass:OrganizationServiceTest | External:Assert | method-call | testDynamicRootAndChildRelationship -> isNotNull |
| ApexClass:OrganizationServiceTest | External:Assert | method-call | testDynamicRootAndChildRelationship -> isTrue |
| ApexClass:OrganizationServiceTest | ApexClass:OrganizationService | method-call | testCreateHierarchyNodeMultiLevel -> createHierarchyNodeWithAccount |
| ApexClass:OrganizationServiceTest | External:Assert | method-call | testCreateHierarchyNodeDuplicate -> fail |
| ApexClass:OrganizationServiceTest | External:Account | type-reference | setup |
| ApexClass:OrganizationServiceTest | CustomObject:Organization_Hierarchy__c | type-reference | setup |
| ApexClass:OrganizationServiceTest | CustomObject:Cloud_Account__c | type-reference | setup |
| ApexClass:OrganizationServiceTest | CustomObject:User_Organization_Role__c | type-reference | setup |
| ApexClass:OrganizationServiceTest | External:OrganizationWrapper | type-reference | testGetUserOrganizationsAdmin |
| ApexClass:OrganizationServiceTest | CustomObject:Organization_Hierarchy__c | generic-type | testDeepHierarchyBeyondFiveAndThirtyLevels |
| ApexClass:OrganizationServiceTest | ApexClass:OrganizationService | test-reference |  |
| ApexClass:OrganizationTriggerHandler | CustomObject:Organization_Hierarchy__c | instantiation | handleBeforeInsert |
| ApexClass:OrganizationTriggerHandler | CustomObject:Organization_Hierarchy__c | type-reference | handleBeforeInsert |
| ApexClass:OrganizationTriggerHandler | CustomObject:Organization_Hierarchy__c | generic-type | handleBeforeInsert |
| ApexClass:OrganizationTriggerHandlerTest | External:Account | instantiation | setupAccounts |
| ApexClass:OrganizationTriggerHandlerTest | CustomObject:Organization_Hierarchy__c | instantiation | testSameTenantParentAllowed |
| ApexClass:OrganizationTriggerHandlerTest | External:Assert | method-call | testSameTenantParentAllowed -> areEqual |
| ApexClass:OrganizationTriggerHandlerTest | External:Assert | method-call | testCrossTenantParentRejected -> fail |
| ApexClass:OrganizationTriggerHandlerTest | External:Assert | method-call | testCrossTenantParentRejected -> isTrue |
| ApexClass:OrganizationTriggerHandlerTest | External:Account | type-reference | setupAccounts |
| ApexClass:OrganizationTriggerHandlerTest | CustomObject:Organization_Hierarchy__c | type-reference | testSameTenantParentAllowed |
| ApexClass:OrganizationTriggerHandlerTest | External:DmlException | type-reference | testCrossTenantParentRejected |
| ApexClass:OrganizationTriggerHandlerTest | External:Account | generic-type | setupAccounts |
| ApexClass:OrganizationTriggerHandlerTest | CustomObject:Organization_Hierarchy__c | generic-type | testParentChangePreservesTenantInvariant |
| ApexClass:SelectorsTest | CustomObject:Organization_Hierarchy__c | instantiation | setup |
| ApexClass:SelectorsTest | CustomObject:Cloud_Account__c | instantiation | setup |
| ApexClass:SelectorsTest | CustomObject:Cloud_Service__c | instantiation | setup |
| ApexClass:SelectorsTest | CustomObject:Cloud_Spend__c | instantiation | setup |
| ApexClass:SelectorsTest | CustomObject:Organization_Budget__c | instantiation | setup |
| ApexClass:SelectorsTest | CustomObject:Forecast__c | instantiation | setup |
| ApexClass:SelectorsTest | CustomObject:User_Organization_Role__c | instantiation | setup |
| ApexClass:SelectorsTest | External:ContentVersion | instantiation | testContentVersionSelector |
| ApexClass:SelectorsTest | ApexClass:CloudAccountSelector | method-call | testCloudAccountSelector -> selectAllWithOrgInfo |
| ApexClass:SelectorsTest | ApexClass:CloudAccountSelector | method-call | testCloudAccountSelector -> selectByOrganizationIds |
| ApexClass:SelectorsTest | ApexClass:CloudAccountSelector | method-call | testCloudAccountSelector -> selectAllAccountIdMap |
| ApexClass:SelectorsTest | External:Assert | method-call | testCloudAccountSelector -> isFalse |
| ApexClass:SelectorsTest | ApexClass:CloudServiceSelector | method-call | testCloudServiceSelector -> selectByCloudAccountIds |
| ApexClass:SelectorsTest | ApexClass:CloudSpendSelector | method-call | testCloudSpendSelector -> selectByAccountIds |
| ApexClass:SelectorsTest | ApexClass:CloudSpendSelector | method-call | testCloudSpendSelector -> selectAggregatedSpend |
| ApexClass:SelectorsTest | ApexClass:OrganizationBudgetSelector | method-call | testOrganizationBudgetSelector -> selectAllWithOrgInfo |
| ApexClass:SelectorsTest | ApexClass:OrganizationBudgetSelector | method-call | testOrganizationBudgetSelector -> selectByOrgIds |
| ApexClass:SelectorsTest | ApexClass:OrganizationBudgetSelector | method-call | testOrganizationBudgetSelector -> selectByOrgIdAndYear |
| ApexClass:SelectorsTest | ApexClass:OrganizationHierarchySelector | method-call | testOrganizationHierarchySelector -> selectAll |
| ApexClass:SelectorsTest | ApexClass:OrganizationHierarchySelector | method-call | testOrganizationHierarchySelector -> selectByIdsOrL1Unlinked |
| ApexClass:SelectorsTest | ApexClass:OrganizationHierarchySelector | method-call | testOrganizationHierarchySelector -> selectByLevels |
| ApexClass:SelectorsTest | ApexClass:UserOrganizationRoleSelector | method-call | testUserOrganizationRoleSelector -> selectByUserId |
| ApexClass:SelectorsTest | ApexClass:UserOrganizationRoleSelector | method-call | testUserOrganizationRoleSelector -> selectAllWithUserInfo |
| ApexClass:SelectorsTest | ApexClass:UserOrganizationRoleSelector | method-call | testUserOrganizationRoleSelector -> selectByUserIdAndOrgId |
| ApexClass:SelectorsTest | ApexClass:UserOrganizationRoleSelector | method-call | testUserOrganizationRoleSelector -> selectById |
| ApexClass:SelectorsTest | ApexClass:ForecastSelector | method-call | testForecastSelector -> selectForecasts |
| ApexClass:SelectorsTest | ApexClass:ForecastSelector | method-call | testForecastSelector -> selectByAccountOrgMonthYear |
| ApexClass:SelectorsTest | ApexClass:UserSelector | method-call | testUserSelector -> selectActiveUsers |
| ApexClass:SelectorsTest | ApexClass:UserSelector | method-call | testUserSelector -> selectProfileByName |
| ApexClass:SelectorsTest | ApexClass:UserSelector | method-call | testUserSelector -> selectAnyProfile |
| ApexClass:SelectorsTest | ApexClass:ContentVersionSelector | method-call | testContentVersionSelector -> selectById |
| ApexClass:SelectorsTest | External:Assert | method-call | testContentVersionSelector -> isNotNull |
| ApexClass:SelectorsTest | ApexClass:FiscalPeriodMappingSelector | method-call | testFiscalPeriodMappingSelector -> selectByFiscalYear |
| ApexClass:SelectorsTest | CustomObject:Organization_Hierarchy__c | type-reference | setup |
| ApexClass:SelectorsTest | CustomObject:Cloud_Account__c | type-reference | setup |
| ApexClass:SelectorsTest | CustomObject:Cloud_Service__c | type-reference | setup |
| ApexClass:SelectorsTest | CustomObject:Cloud_Spend__c | type-reference | setup |
| ApexClass:SelectorsTest | CustomObject:Organization_Budget__c | type-reference | setup |
| ApexClass:SelectorsTest | CustomObject:Forecast__c | type-reference | setup |
| ApexClass:SelectorsTest | CustomObject:User_Organization_Role__c | type-reference | setup |
| ApexClass:SelectorsTest | External:ContentVersion | type-reference | testContentVersionSelector |
| ApexClass:SelectorsTest | CustomObject:Cloud_Account__c | generic-type | testCloudAccountSelector |
| ApexClass:SelectorsTest | CustomObject:Cloud_Service__c | generic-type | testCloudServiceSelector |
| ApexClass:SelectorsTest | CustomObject:Cloud_Spend__c | generic-type | testCloudSpendSelector |
| ApexClass:SelectorsTest | CustomObject:Organization_Budget__c | generic-type | testOrganizationBudgetSelector |
| ApexClass:SelectorsTest | CustomObject:Organization_Hierarchy__c | generic-type | testOrganizationHierarchySelector |
| ApexClass:SelectorsTest | CustomObject:User_Organization_Role__c | generic-type | testUserOrganizationRoleSelector |
| ApexClass:SelectorsTest | CustomObject:Forecast__c | generic-type | testForecastSelector |
| ApexClass:SelectorsTest | External:User | generic-type | testUserSelector |
| ApexClass:SelectorsTest | External:Profile | generic-type | testUserSelector |
| ApexClass:SelectorsTest | CustomObject:Fiscal_Period_Mapping__mdt | generic-type | testFiscalPeriodMappingSelector |
| ApexClass:SelectorsTest | ApexClass:CloudAccountSelector | test-reference |  |
| ApexClass:SelectorsTest | ApexClass:CloudServiceSelector | test-reference |  |
| ApexClass:SelectorsTest | ApexClass:CloudSpendSelector | test-reference |  |
| ApexClass:SelectorsTest | ApexClass:OrganizationBudgetSelector | test-reference |  |
| ApexClass:SelectorsTest | ApexClass:OrganizationHierarchySelector | test-reference |  |
| ApexClass:SelectorsTest | ApexClass:UserOrganizationRoleSelector | test-reference |  |
| ApexClass:SelectorsTest | ApexClass:ForecastSelector | test-reference |  |
| ApexClass:SelectorsTest | ApexClass:UserSelector | test-reference |  |
| ApexClass:SelectorsTest | ApexClass:ContentVersionSelector | test-reference |  |
| ApexClass:SelectorsTest | ApexClass:FiscalPeriodMappingSelector | test-reference |  |
| ApexClass:SpendAnalyticsService | ApexClass:SpendService | method-call | getAggregatedSpend -> getAggregatedSpend |
| ApexClass:SpendController | ApexClass:SpendService | method-call | getAggregatedSpend -> getAggregatedSpend |
| ApexClass:SpendImportService | CustomObject:Spend_Import_Batch__c | instantiation |  |
| ApexClass:SpendImportService | CustomObject:Cloud_Spend__c | instantiation | processInvoiceCSV |
| ApexClass:SpendImportService | ApexClass:ContentVersionSelector | method-call | processInvoiceCSV -> selectById |
| ApexClass:SpendImportService | External:VersionData | method-call | processInvoiceCSV -> toString |
| ApexClass:SpendImportService | ApexClass:CsvParser | method-call | processInvoiceCSV -> parseCsv |
| ApexClass:SpendImportService | ApexClass:CloudAccountSelector | method-call | processInvoiceCSV -> selectAllAccountIdMap |
| ApexClass:SpendImportService | External:Error_Message__c | method-call | processInvoiceCSV -> length |
| ApexClass:SpendImportService | External:Error_Message__c | method-call | processInvoiceCSV -> substring |
| ApexClass:SpendImportService | ApexClass:AuditService | method-call | processInvoiceCSV -> logAction |
| ApexClass:SpendImportService | External:ContentVersion | type-reference | processInvoiceCSV |
| ApexClass:SpendImportService | CustomObject:Spend_Import_Batch__c | type-reference |  |
| ApexClass:SpendImportService | CustomObject:Cloud_Account__c | type-reference | processInvoiceCSV |
| ApexClass:SpendImportService | CustomObject:Cloud_Spend__c | type-reference | processInvoiceCSV |
| ApexClass:SpendImportService | CustomObject:Cloud_Spend__c | generic-type | processInvoiceCSV |
| ApexClass:SpendService | External:AggregateSpendWrapper | instantiation |  |
| ApexClass:SpendService | ApexClass:SpendTrackerAuthorizationService | method-call | getAggregatedSpend -> getAccessContext |
| ApexClass:SpendService | ApexClass:CloudSpendSelector | method-call | getAggregatedSpend -> selectAggregatedSpend |
| ApexClass:SpendService | ApexClass:SpendTrackerAccessContext | type-reference | getAggregatedSpend |
| ApexClass:SpendService | External:AggregateSpendWrapper | generic-type |  |
| ApexClass:SpendServiceTest | CustomObject:Organization_Hierarchy__c | instantiation | setup |
| ApexClass:SpendServiceTest | CustomObject:Cloud_Account__c | instantiation | setup |
| ApexClass:SpendServiceTest | CustomObject:Cloud_Spend__c | instantiation | setup |
| ApexClass:SpendServiceTest | ApexClass:SpendService | method-call | testGetAggregatedSpendWithOrgIds -> getAggregatedSpend |
| ApexClass:SpendServiceTest | External:Assert | method-call | testGetAggregatedSpendWithOrgIds -> areEqual |
| ApexClass:SpendServiceTest | External:Assert | method-call | testGetAggregatedSpendEmptyOrgIds -> isFalse |
| ApexClass:SpendServiceTest | CustomObject:Organization_Hierarchy__c | type-reference | setup |
| ApexClass:SpendServiceTest | CustomObject:Cloud_Account__c | type-reference | setup |
| ApexClass:SpendServiceTest | CustomObject:Cloud_Spend__c | type-reference | setup |
| ApexClass:SpendServiceTest | CustomObject:Cloud_Spend__c | generic-type | setup |
| ApexClass:SpendServiceTest | ApexClass:SpendService | test-reference |  |
| ApexClass:SpendTrackerAuthorizationService | ApexClass:SpendTrackerAccessContext | instantiation |  |
| ApexClass:SpendTrackerAuthorizationService | ApexClass:SystemAdminAccessPolicy | method-call | isSystemAdmin |
| ApexClass:SpendTrackerAuthorizationService | ApexClass:AuditService | method-call | isSystemAdmin -> logAction |
| ApexClass:SpendTrackerAuthorizationService | ApexClass:StandardAccessPolicy | method-call | canViewOrganization -> canViewOrganization |
| ApexClass:SpendTrackerAuthorizationService | ApexClass:StandardAccessPolicy | method-call | canViewCloudAccount -> canViewCloudAccount |
| ApexClass:SpendTrackerAuthorizationService | ApexClass:SpendTrackerAccessContext | type-reference |  |
| ApexClass:SpendTrackerAuthorizationService | External:User | generic-type | isSystemAdmin |
| ApexClass:SpendTrackerAuthorizationService | CustomObject:User_Organization_Role__c | generic-type | isSystemAdmin |
| ApexClass:SpendTrackerAuthorizationService | CustomObject:Organization_Hierarchy__c | generic-type |  |
| ApexClass:SpendTrackerTest | CustomObject:Organization_Hierarchy__c | instantiation | setup |
| ApexClass:SpendTrackerTest | CustomObject:Cloud_Account__c | instantiation | setup |
| ApexClass:SpendTrackerTest | CustomObject:Cloud_Spend__c | instantiation | setup |
| ApexClass:SpendTrackerTest | External:ContentVersion | instantiation | testCSVImportSuccessAndValidation |
| ApexClass:SpendTrackerTest | CustomObject:Organization_Budget__c | instantiation | testBudgetAlertsAndForecasts |
| ApexClass:SpendTrackerTest | ApexClass:OrganizationService | method-call | testOrganizationRetrieval -> getUserOrganizations |
| ApexClass:SpendTrackerTest | External:Assert | method-call | testOrganizationRetrieval -> isNotNull |
| ApexClass:SpendTrackerTest | External:Assert | method-call | testOrganizationRetrieval -> isFalse |
| ApexClass:SpendTrackerTest | ApexClass:SpendService | method-call | testSpendAggregation -> getAggregatedSpend |
| ApexClass:SpendTrackerTest | External:Assert | method-call | testSpendAggregation -> areEqual |
| ApexClass:SpendTrackerTest | ApexClass:OrganizationService | method-call | testHierarchyCreationAndTriggerHandler -> createHierarchyNode |
| ApexClass:SpendTrackerTest | ApexClass:ImportService | method-call | testCSVImportSuccessAndValidation -> processInvoiceCSV |
| ApexClass:SpendTrackerTest | ApexClass:BudgetService | method-call | testBudgetManagement -> manageBudget |
| ApexClass:SpendTrackerTest | ApexClass:BudgetService | method-call | testBudgetManagement -> getOrganizationBudgets |
| ApexClass:SpendTrackerTest | ApexClass:BudgetService | method-call | testBudgetManagement -> clearBudget |
| ApexClass:SpendTrackerTest | External:Assert | method-call | testBudgetManagement -> isTrue |
| ApexClass:SpendTrackerTest | ApexClass:UserService | method-call | testUserRoleManagementAndRegistration -> assignUserRole |
| ApexClass:SpendTrackerTest | ApexClass:UserService | method-call | testUserRoleManagementAndRegistration -> getUserHierarchyAccess |
| ApexClass:SpendTrackerTest | ApexClass:UserService | method-call | testUserRoleManagementAndRegistration -> removeUserRole |
| ApexClass:SpendTrackerTest | ApexClass:UserService | method-call | testUserRoleManagementAndRegistration -> getUsersList |
| ApexClass:SpendTrackerTest | ApexClass:UserService | method-call | testUserRoleManagementAndRegistration -> registerUser |
| ApexClass:SpendTrackerTest | ApexClass:BudgetAlertService | method-call | testBudgetAlertsAndForecasts -> getBudgetAlerts |
| ApexClass:SpendTrackerTest | ApexClass:ForecastService | method-call | testBudgetAlertsAndForecasts -> manageForecasts |
| ApexClass:SpendTrackerTest | ApexClass:ForecastService | method-call | testBudgetAlertsAndForecasts -> getForecasts |
| ApexClass:SpendTrackerTest | ApexClass:AuditService | method-call | testAuditServiceAndAccountServiceSafeguards -> logAction |
| ApexClass:SpendTrackerTest | ApexClass:AccountService | method-call | testAuditServiceAndAccountServiceSafeguards -> getAccountsWithServices |
| ApexClass:SpendTrackerTest | ApexClass:AccountService | method-call | testAuditServiceAndAccountServiceSafeguards -> getAccountSpendHistory |
| ApexClass:SpendTrackerTest | ApexClass:FiscalUtils | method-call | testFiscalUtils -> getPeriodMapping |
| ApexClass:SpendTrackerTest | CustomObject:Organization_Hierarchy__c | type-reference | setup |
| ApexClass:SpendTrackerTest | CustomObject:Cloud_Account__c | type-reference | setup |
| ApexClass:SpendTrackerTest | CustomObject:Cloud_Spend__c | type-reference | setup |
| ApexClass:SpendTrackerTest | External:ContentVersion | type-reference | testCSVImportSuccessAndValidation |
| ApexClass:SpendTrackerTest | External:User | type-reference | testOrganizationRetrieval |
| ApexClass:SpendTrackerTest | CustomObject:Organization_Budget__c | type-reference | testBudgetAlertsAndForecasts |
| ApexClass:SpendTrackerTest | CustomObject:Organization_Hierarchy__c | generic-type | testSpendAggregation |
| ApexClass:SpendTrackerTest | CustomObject:Cloud_Spend__c | generic-type | testCSVImportSuccessAndValidation |
| ApexClass:SpendTrackerTest | External:User | generic-type | testUserRoleManagementAndRegistration |
| ApexClass:SpendTrackerTest | ApexClass:OrganizationService | test-reference |  |
| ApexClass:SpendTrackerTest | ApexClass:SpendService | test-reference |  |
| ApexClass:SpendTrackerTest | ApexClass:ImportService | test-reference |  |
| ApexClass:SpendTrackerTest | ApexClass:BudgetService | test-reference |  |
| ApexClass:SpendTrackerTest | ApexClass:UserService | test-reference |  |
| ApexClass:SpendTrackerTest | ApexClass:BudgetAlertService | test-reference |  |
| ApexClass:SpendTrackerTest | ApexClass:ForecastService | test-reference |  |
| ApexClass:SpendTrackerTest | ApexClass:AuditService | test-reference |  |
| ApexClass:SpendTrackerTest | ApexClass:AccountService | test-reference |  |
| ApexClass:SpendTrackerTest | ApexClass:FiscalUtils | test-reference |  |
| ApexClass:StandardAccessPolicy | ApexClass:SpendTrackerAccessContext | type-reference | canViewOrganization |
| ApexClass:SystemAdminAccessPolicy | External:PermissionSetAssignment | generic-type | isSystemAdmin |
| ApexClass:SystemAdminAccessPolicy | External:User | generic-type | isSystemAdmin |
| ApexClass:UserContactMappingService | External:ClassificationResult | instantiation |  |
| ApexClass:UserContactMappingService | External:BackfillResult | instantiation | backfillRoles |
| ApexClass:UserContactMappingService | External:Classification | method-call | values |
| ApexClass:UserContactMappingService | External:User | method-call | classifyRoles -> ContactId |
| ApexClass:UserContactMappingService | ApexClass:AuditService | method-call | backfillRoles -> logAction |
| ApexClass:UserContactMappingService | CustomObject:User_Organization_Role__c | type-reference |  |
| ApexClass:UserContactMappingService | External:Classification | type-reference |  |
| ApexClass:UserContactMappingService | External:User | type-reference |  |
| ApexClass:UserContactMappingService | External:Contact | type-reference |  |
| ApexClass:UserContactMappingService | CustomObject:Organization_Hierarchy__c | type-reference | classifyRoles |
| ApexClass:UserContactMappingService | External:BackfillResult | type-reference |  |
| ApexClass:UserContactMappingService | External:ClassificationResult | generic-type |  |
| ApexClass:UserContactMappingService | CustomObject:User_Organization_Role__c | generic-type | populateContactIds |
| ApexClass:UserContactMappingServiceTest | External:Account | instantiation | setupTestData |
| ApexClass:UserContactMappingServiceTest | CustomObject:Organization_Hierarchy__c | instantiation | setupTestData |
| ApexClass:UserContactMappingServiceTest | External:Contact | instantiation |  |
| ApexClass:UserContactMappingServiceTest | External:User | instantiation |  |
| ApexClass:UserContactMappingServiceTest | CustomObject:User_Organization_Role__c | instantiation | testUserWithContactIdMapping |
| ApexClass:UserContactMappingServiceTest | External:Assert | method-call | testUserWithContactIdMapping -> isNotNull |
| ApexClass:UserContactMappingServiceTest | External:Assert | method-call | testUserWithoutContactIdNoContactCreation -> isNull |
| ApexClass:UserContactMappingServiceTest | External:Assert | method-call | testUserWithoutContactIdNoContactCreation -> areEqual |
| ApexClass:UserContactMappingServiceTest | ApexClass:UserContactMappingService | method-call | testBackfillNullContactMapping -> executeBackfill |
| ApexClass:UserContactMappingServiceTest | External:Assert | method-call | testBackfillNullContactMapping -> isTrue |
| ApexClass:UserContactMappingServiceTest | ApexClass:UserContactMappingService | method-call | testInconsistentMappingDetection -> classifyRoles |
| ApexClass:UserContactMappingServiceTest | External:Assert | method-call | testMandatoryNoEmailMatchingRule -> areNotEqual |
| ApexClass:UserContactMappingServiceTest | ApexClass:SpendTrackerAuthorizationService | method-call | testExistingAuthorizationParity -> getAccessContext |
| ApexClass:UserContactMappingServiceTest | External:Account | type-reference | setupTestData |
| ApexClass:UserContactMappingServiceTest | CustomObject:Organization_Hierarchy__c | type-reference | setupTestData |
| ApexClass:UserContactMappingServiceTest | External:Contact | type-reference |  |
| ApexClass:UserContactMappingServiceTest | External:User | type-reference |  |
| ApexClass:UserContactMappingServiceTest | CustomObject:User_Organization_Role__c | type-reference | testUserWithContactIdMapping |
| ApexClass:UserContactMappingServiceTest | External:BackfillResult | type-reference | testBackfillNullContactMapping |
| ApexClass:UserContactMappingServiceTest | ApexClass:SpendTrackerAccessContext | type-reference | testExistingAuthorizationParity |
| ApexClass:UserContactMappingServiceTest | External:Account | generic-type | setupTestData |
| ApexClass:UserContactMappingServiceTest | CustomObject:Organization_Hierarchy__c | generic-type | setupTestData |
| ApexClass:UserContactMappingServiceTest | External:Contact | generic-type | setupTestData |
| ApexClass:UserContactMappingServiceTest | CustomObject:User_Organization_Role__c | generic-type | testInconsistentMappingDetection |
| ApexClass:UserContactMappingServiceTest | ApexClass:UserContactMappingService | test-reference |  |
| ApexClass:UserContactMappingServiceTest | ApexClass:SpendTrackerAccessContext | test-reference |  |
| ApexClass:UserContactMappingServiceTest | ApexClass:SpendTrackerAuthorizationService | test-reference |  |
| ApexClass:UserController | ApexClass:UserService | method-call | getUserHierarchyAccess -> getUserHierarchyAccess |
| ApexClass:UserController | ApexClass:UserService | method-call | getUsersList -> getUsersList |
| ApexClass:UserController | ApexClass:UserService | method-call | assignUserRole -> assignUserRole |
| ApexClass:UserController | ApexClass:UserService | method-call | removeUserRole -> removeUserRole |
| ApexClass:UserController | ApexClass:UserService | method-call | registerUser -> registerUser |
| ApexClass:UserController | External:User | generic-type |  |
| ApexClass:UserManagementController | ApexClass:UserController | method-call | getUserHierarchyAccess -> getUserHierarchyAccess |
| ApexClass:UserManagementController | ApexClass:UserController | method-call | getUsersList -> getUsersList |
| ApexClass:UserManagementController | ApexClass:UserController | method-call | assignUserRole -> assignUserRole |
| ApexClass:UserManagementController | ApexClass:UserController | method-call | removeUserRole -> removeUserRole |
| ApexClass:UserManagementController | ApexClass:UserController | method-call | registerUser -> registerUser |
| ApexClass:UserManagementController | External:User | generic-type |  |
| ApexClass:UserManagementService | ApexClass:UserService | method-call | getUserHierarchyAccess -> getUserHierarchyAccess |
| ApexClass:UserOrganizationRoleSelector | External:QueryException | type-reference | selectByUserId |
| ApexClass:UserOrganizationRoleSelector | CustomObject:User_Organization_Role__c | generic-type |  |
| ApexClass:UserOrganizationRoleTriggerHandler | ApexClass:UserContactMappingService | method-call | handleBeforeInsertOrUpdate -> populateContactIds |
| ApexClass:UserOrganizationRoleTriggerHandler | ApexClass:AuditService | method-call | handleAfterInsert -> logAction |
| ApexClass:UserOrganizationRoleTriggerHandler | External:Contact | type-reference | handleBeforeInsertOrUpdate |
| ApexClass:UserOrganizationRoleTriggerHandler | CustomObject:Organization_Hierarchy__c | type-reference | validateAndDeduplicateRoles |
| ApexClass:UserOrganizationRoleTriggerHandler | CustomObject:User_Organization_Role__c | type-reference | handleBeforeInsertOrUpdate |
| ApexClass:UserOrganizationRoleTriggerHandler | CustomObject:User_Organization_Role__c | generic-type | handleBeforeInsertOrUpdate |
| ApexClass:UserOrganizationRoleTriggerTest | CustomObject:Organization_Hierarchy__c | instantiation | setup |
| ApexClass:UserOrganizationRoleTriggerTest | CustomObject:User_Organization_Role__c | instantiation | testTriggerLifecycleAndHandlerExecution |
| ApexClass:UserOrganizationRoleTriggerTest | External:Contact | instantiation | testContactLookupAssociation |
| ApexClass:UserOrganizationRoleTriggerTest | External:Account | instantiation | testP20_2_ContactOnlyRoleWorks |
| ApexClass:UserOrganizationRoleTriggerTest | External:Assert | method-call | testHandlerExecutionFlag -> isFalse |
| ApexClass:UserOrganizationRoleTriggerTest | ApexClass:UserOrganizationRoleTriggerHandler | method-call | testHandlerExecutionFlag -> isExecuting |
| ApexClass:UserOrganizationRoleTriggerTest | ApexClass:UserOrganizationRoleTriggerHandler | method-call | testHandlerExecutionFlag -> setExecuting |
| ApexClass:UserOrganizationRoleTriggerTest | External:Assert | method-call | testHandlerExecutionFlag -> isTrue |
| ApexClass:UserOrganizationRoleTriggerTest | External:Assert | method-call | testContactLookupAssociation -> areEqual |
| ApexClass:UserOrganizationRoleTriggerTest | External:Assert | method-call | testP20_1_UserOnlyRoleWorks -> isNotNull |
| ApexClass:UserOrganizationRoleTriggerTest | External:Assert | method-call | testP20_8_RemovingUserPreservesContactAccess -> isNull |
| ApexClass:UserOrganizationRoleTriggerTest | ApexClass:SpendTrackerAuthorizationService | method-call | testP20_10_SystemAdminBehaviorUnchanged -> isSystemAdmin |
| ApexClass:UserOrganizationRoleTriggerTest | CustomObject:Organization_Hierarchy__c | type-reference | setup |
| ApexClass:UserOrganizationRoleTriggerTest | CustomObject:User_Organization_Role__c | type-reference | testTriggerLifecycleAndHandlerExecution |
| ApexClass:UserOrganizationRoleTriggerTest | External:Contact | type-reference | testContactLookupAssociation |
| ApexClass:UserOrganizationRoleTriggerTest | External:Account | type-reference | testP20_2_ContactOnlyRoleWorks |
| ApexClass:UserOrganizationRoleTriggerTest | External:Account | generic-type | testP20_5_ContactTenantMismatchRejected |
| ApexClass:UserOrganizationRoleTriggerTest | External:Contact | generic-type | testP20_12_BulkRoleMixedInsertUpdate |
| ApexClass:UserOrganizationRoleTriggerTest | CustomObject:User_Organization_Role__c | generic-type | testP20_12_BulkRoleMixedInsertUpdate |
| ApexClass:UserOrganizationRoleTriggerTest | ApexClass:UserOrganizationRoleTriggerHandler | test-reference |  |
| ApexClass:UserOrganizationRoleTriggerTest | ApexClass:SpendTrackerAuthorizationService | test-reference |  |
| ApexClass:UserSelector | External:User | generic-type |  |
| ApexClass:UserSelector | External:Profile | generic-type |  |
| ApexClass:UserService | External:UserRoleWrapper | instantiation |  |
| ApexClass:UserService | External:RoleMapping | instantiation | getUserHierarchyAccess |
| ApexClass:UserService | CustomObject:User_Organization_Role__c | instantiation | assignUserRole |
| ApexClass:UserService | External:User | instantiation |  |
| ApexClass:UserService | ApexClass:UserOrganizationRoleSelector | method-call | getUserHierarchyAccess -> selectAllWithUserInfo |
| ApexClass:UserService | ApexClass:OrganizationHierarchySelector | method-call | getUserHierarchyAccess -> selectByIds |
| ApexClass:UserService | ApexClass:UserSelector | method-call | getUsersList -> selectActiveUsers |
| ApexClass:UserService | ApexClass:UserOrganizationRoleSelector | method-call | assignUserRole -> selectByUserIdAndOrgId |
| ApexClass:UserService | ApexClass:AuditService | method-call | assignUserRole -> logAction |
| ApexClass:UserService | ApexClass:UserOrganizationRoleSelector | method-call | removeUserRole -> selectById |
| ApexClass:UserService | ApexClass:UserSelector | method-call | registerUser -> selectProfileByName |
| ApexClass:UserService | ApexClass:UserSelector | method-call | registerUser -> selectAnyProfile |
| ApexClass:UserService | CustomObject:Organization_Hierarchy__c | type-reference | getUserHierarchyAccess |
| ApexClass:UserService | CustomObject:User_Organization_Role__c | type-reference | getUserHierarchyAccess |
| ApexClass:UserService | External:User | type-reference |  |
| ApexClass:UserService | External:UserRoleWrapper | generic-type |  |
| ApexClass:UserService | CustomObject:User_Organization_Role__c | generic-type | getUserHierarchyAccess |
| ApexClass:UserService | External:User | generic-type |  |
| ApexClass:UserService | External:Profile | generic-type | registerUser |
| ApexClass:UserService | External:RoleMapping | generic-type |  |
| ApexClass:UserServiceTest | External:Account | instantiation | setup |
| ApexClass:UserServiceTest | CustomObject:Organization_Hierarchy__c | instantiation | setup |
| ApexClass:UserServiceTest | CustomObject:User_Organization_Role__c | instantiation | setup |
| ApexClass:UserServiceTest | ApexClass:UserService | method-call | testGetUserHierarchyAccess -> getUserHierarchyAccess |
| ApexClass:UserServiceTest | External:Assert | method-call | testGetUserHierarchyAccess -> isFalse |
| ApexClass:UserServiceTest | External:Assert | method-call | testGetUserHierarchyAccess -> areEqual |
| ApexClass:UserServiceTest | ApexClass:UserService | method-call | testGetUsersList -> getUsersList |
| ApexClass:UserServiceTest | ApexClass:UserService | method-call | testAssignAndRemoveUserRole -> assignUserRole |
| ApexClass:UserServiceTest | ApexClass:UserService | method-call | testAssignAndRemoveUserRole -> removeUserRole |
| ApexClass:UserServiceTest | External:Assert | method-call | testAssignAndRemoveUserRole -> isTrue |
| ApexClass:UserServiceTest | ApexClass:UserService | method-call | testRegisterUserValidAndBlank -> registerUser |
| ApexClass:UserServiceTest | External:Assert | method-call | testRegisterUserValidAndBlank -> fail |
| ApexClass:UserServiceTest | External:Assert | method-call | testRegisterUserValidAndBlank -> isNotNull |
| ApexClass:UserServiceTest | External:Account | type-reference | setup |
| ApexClass:UserServiceTest | CustomObject:Organization_Hierarchy__c | type-reference | setup |
| ApexClass:UserServiceTest | CustomObject:User_Organization_Role__c | type-reference | setup |
| ApexClass:UserServiceTest | External:User | type-reference |  |
| ApexClass:UserServiceTest | External:User | generic-type | testGetUsersList |
| ApexClass:UserServiceTest | CustomObject:User_Organization_Role__c | generic-type | testAssignAndRemoveUserRole |
| ApexClass:UserServiceTest | ApexClass:UserService | test-reference |  |
| ApexTrigger:CloudSpendTrigger | ApexClass:CloudSpendTriggerHandler | trigger-handler | populateSpendMonth |
| ApexTrigger:OrganizationTrigger | ApexClass:OrganizationTriggerHandler | trigger-handler | handleBeforeInsert |
| ApexTrigger:OrganizationTrigger | ApexClass:OrganizationTriggerHandler | trigger-handler | handleBeforeUpdate |
| ApexTrigger:OrganizationTrigger | ApexClass:OrganizationTriggerHandler | trigger-handler | handleAfterInsert |
| ApexTrigger:UserOrganizationRoleTrigger | ApexClass:UserOrganizationRoleTriggerHandler | trigger-handler | handleBeforeInsertOrUpdate |
| ApexTrigger:UserOrganizationRoleTrigger | ApexClass:UserOrganizationRoleTriggerHandler | trigger-handler | handleAfterInsert |
| ApexTrigger:UserOrganizationRoleTrigger | ApexClass:UserOrganizationRoleTriggerHandler | trigger-handler | handleAfterUpdate |
| ApexTrigger:UserOrganizationRoleTrigger | ApexClass:UserOrganizationRoleTriggerHandler | trigger-handler | handleAfterDelete |

## Apex → Salesforce Data

| Apex | Target | Type | Evidence |
|---|---|---|---|
| ApexClass:AccountServiceTest | CustomObject:Cloud_Account__c | soql-object | SOQL FROM Cloud_Account__c |
| ApexClass:AdminAccessServiceTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:AdminAccessServiceTest | CustomObject:PermissionSet | soql-object | SOQL FROM PermissionSet |
| ApexClass:AdminAccessServiceTest | CustomObject:admin | soql-object | SOQL FROM admin |
| ApexClass:AdminDataExplorerController | CustomObject:Cloud_Spend__c | soql-object | SOQL FROM Cloud_Spend__c |
| ApexClass:AdminDataExplorerController | CustomField:Cloud_Spend__c.Cloud_Provider__c | soql-field | Cloud_Spend__c.Cloud_Provider__c |
| ApexClass:AdminDataExplorerController | CustomField:Cloud_Spend__c.Service__c | soql-field | Cloud_Spend__c.Service__c |
| ApexClass:AdminDataExplorerController | CustomField:Cloud_Spend__c.Amount__c | soql-field | Cloud_Spend__c.Amount__c |
| ApexClass:AdminDataExplorerController | CustomField:Cloud_Spend__c.Month__c | soql-field | Cloud_Spend__c.Month__c |
| ApexClass:AdminDataExplorerController | CustomField:Cloud_Spend__c.Year__c | soql-field | Cloud_Spend__c.Year__c |
| ApexClass:AdminDataExplorerController | CustomObject:Cloud_Account__c | soql-object | SOQL FROM Cloud_Account__c |
| ApexClass:AdminDataExplorerController | CustomField:Cloud_Account__c.Account_ID__c | soql-field | Cloud_Account__c.Account_ID__c |
| ApexClass:AdminDataExplorerController | CustomField:Cloud_Account__c.Cloud_Provider__c | soql-field | Cloud_Account__c.Cloud_Provider__c |
| ApexClass:AdminDataExplorerController | CustomObject:Cloud_Service__c | soql-object | SOQL FROM Cloud_Service__c |
| ApexClass:AdminDataExplorerController | CustomObject:Organization_Hierarchy__c | soql-object | SOQL FROM Organization_Hierarchy__c |
| ApexClass:AdminDataExplorerController | CustomField:Organization_Hierarchy__c.Account__c | soql-field | Organization_Hierarchy__c.Account__c |
| ApexClass:AdminDataExplorerController | CustomObject:Organization_Budget__c | soql-object | SOQL FROM Organization_Budget__c |
| ApexClass:AdminDataExplorerController | CustomField:Organization_Budget__c.Amount__c | soql-field | Organization_Budget__c.Amount__c |
| ApexClass:AdminDataExplorerController | CustomField:Organization_Budget__c.Year__c | soql-field | Organization_Budget__c.Year__c |
| ApexClass:AdminDataExplorerController | CustomObject:Forecast__c | soql-object | SOQL FROM Forecast__c |
| ApexClass:AdminDataExplorerController | CustomField:Forecast__c.Amount__c | soql-field | Forecast__c.Amount__c |
| ApexClass:AdminDataExplorerController | CustomField:Forecast__c.Fiscal_Month__c | soql-field | Forecast__c.Fiscal_Month__c |
| ApexClass:AdminDataExplorerController | CustomField:Forecast__c.Fiscal_Year__c | soql-field | Forecast__c.Fiscal_Year__c |
| ApexClass:AdminDataExplorerController | CustomObject:User | soql-object | SOQL FROM User |
| ApexClass:AdminDataExplorerController | CustomObject:User_Organization_Role__c | soql-object | SOQL FROM User_Organization_Role__c |
| ApexClass:AdminDataExplorerController | CustomField:User_Organization_Role__c.Role__c | soql-field | User_Organization_Role__c.Role__c |
| ApexClass:AdminDataExplorerController | CustomObject:Spend_Import_Batch__c | soql-object | SOQL FROM Spend_Import_Batch__c |
| ApexClass:AdminDataExplorerController | CustomField:Spend_Import_Batch__c.File_Name__c | soql-field | Spend_Import_Batch__c.File_Name__c |
| ApexClass:AdminDataExplorerController | CustomField:Spend_Import_Batch__c.Status__c | soql-field | Spend_Import_Batch__c.Status__c |
| ApexClass:AdminDataExplorerController | CustomField:Spend_Import_Batch__c.Upload_Date__c | soql-field | Spend_Import_Batch__c.Upload_Date__c |
| ApexClass:AdminDataExplorerController | CustomField:Spend_Import_Batch__c.Provider__c | soql-field | Spend_Import_Batch__c.Provider__c |
| ApexClass:AdminDataExplorerController | CustomField:Spend_Import_Batch__c.Records_Received__c | soql-field | Spend_Import_Batch__c.Records_Received__c |
| ApexClass:AdminDataExplorerController | CustomField:Spend_Import_Batch__c.Records_Created__c | soql-field | Spend_Import_Batch__c.Records_Created__c |
| ApexClass:AdminDataExplorerController | CustomField:Spend_Import_Batch__c.Records_Failed__c | soql-field | Spend_Import_Batch__c.Records_Failed__c |
| ApexClass:AdminDataExplorerController | CustomObject:Action_Audit__c | soql-object | SOQL FROM Action_Audit__c |
| ApexClass:AdminDataExplorerController | CustomField:Action_Audit__c.Action__c | soql-field | Action_Audit__c.Action__c |
| ApexClass:AdminDataExplorerController | CustomField:Action_Audit__c.Message__c | soql-field | Action_Audit__c.Message__c |
| ApexClass:AdminDataExplorerController | CustomField:Action_Audit__c.Timestamp__c | soql-field | Action_Audit__c.Timestamp__c |
| ApexClass:AdminHealthController | CustomObject:Cloud_Account__c | soql-object | SOQL FROM Cloud_Account__c |
| ApexClass:AdminHealthController | CustomObject:Cloud_Spend__c | soql-object | SOQL FROM Cloud_Spend__c |
| ApexClass:AdminHealthController | CustomObject:Spend_Import_Batch__c | soql-object | SOQL FROM Spend_Import_Batch__c |
| ApexClass:AdminOverviewController | CustomObject:Cloud_Spend__c | soql-object | SOQL FROM Cloud_Spend__c |
| ApexClass:AdminOverviewController | CustomObject:Organization_Budget__c | soql-object | SOQL FROM Organization_Budget__c |
| ApexClass:AdminOverviewController | CustomObject:Cloud_Account__c | soql-object | SOQL FROM Cloud_Account__c |
| ApexClass:AdminOverviewController | CustomObject:Organization_Hierarchy__c | soql-object | SOQL FROM Organization_Hierarchy__c |
| ApexClass:AdminOverviewController | CustomObject:User | soql-object | SOQL FROM User |
| ApexClass:AdminOverviewController | CustomObject:Cloud_Service__c | soql-object | SOQL FROM Cloud_Service__c |
| ApexClass:AdminOverviewController | CustomObject:Spend_Import_Batch__c | soql-object | SOQL FROM Spend_Import_Batch__c |
| ApexClass:AdminOverviewController | CustomField:Spend_Import_Batch__c.File_Name__c | soql-field | Spend_Import_Batch__c.File_Name__c |
| ApexClass:AdminOverviewController | CustomField:Spend_Import_Batch__c.Status__c | soql-field | Spend_Import_Batch__c.Status__c |
| ApexClass:AdminOverviewController | CustomField:Spend_Import_Batch__c.Upload_Date__c | soql-field | Spend_Import_Batch__c.Upload_Date__c |
| ApexClass:AdminOverviewController | CustomField:Spend_Import_Batch__c.Records_Received__c | soql-field | Spend_Import_Batch__c.Records_Received__c |
| ApexClass:AdminOverviewController | CustomField:Spend_Import_Batch__c.Records_Created__c | soql-field | Spend_Import_Batch__c.Records_Created__c |
| ApexClass:AdminOverviewController | CustomField:Spend_Import_Batch__c.Records_Failed__c | soql-field | Spend_Import_Batch__c.Records_Failed__c |
| ApexClass:AdminOverviewController | CustomField:Spend_Import_Batch__c.Provider__c | soql-field | Spend_Import_Batch__c.Provider__c |
| ApexClass:AdminSpendController | CustomObject:Cloud_Spend__c | soql-object | SOQL FROM Cloud_Spend__c |
| ApexClass:AdminSpendController | CustomField:Cloud_Spend__c.Cloud_Account__c | soql-field | Cloud_Spend__c.Cloud_Account__c |
| ApexClass:AdminSpendController | CustomField:Cloud_Spend__c.Cloud_Provider__c | soql-field | Cloud_Spend__c.Cloud_Provider__c |
| ApexClass:AdminSpendController | CustomField:Cloud_Spend__c.Service__c | soql-field | Cloud_Spend__c.Service__c |
| ApexClass:AdminSpendController | CustomField:Cloud_Spend__c.Region__c | soql-field | Cloud_Spend__c.Region__c |
| ApexClass:AdminSpendController | CustomField:Cloud_Spend__c.Amount__c | soql-field | Cloud_Spend__c.Amount__c |
| ApexClass:AdminSpendController | CustomField:Cloud_Spend__c.Month__c | soql-field | Cloud_Spend__c.Month__c |
| ApexClass:AdminSpendController | CustomField:Cloud_Spend__c.Year__c | soql-field | Cloud_Spend__c.Year__c |
| ApexClass:AuditService | CustomObject:Action_Audit__c | soql-object | SOQL FROM Action_Audit__c |
| ApexClass:AuditService | CustomField:Action_Audit__c.Action__c | soql-field | Action_Audit__c.Action__c |
| ApexClass:AuditService | CustomField:Action_Audit__c.Message__c | soql-field | Action_Audit__c.Message__c |
| ApexClass:AuditService | CustomField:Action_Audit__c.User__c | soql-field | Action_Audit__c.User__c |
| ApexClass:AuditService | CustomField:Action_Audit__c.Timestamp__c | soql-field | Action_Audit__c.Timestamp__c |
| ApexClass:AuditServiceTest | CustomObject:Action_Audit__c | soql-object | SOQL FROM Action_Audit__c |
| ApexClass:AuditServiceTest | CustomField:Action_Audit__c.Action__c | soql-field | Action_Audit__c.Action__c |
| ApexClass:AuditServiceTest | CustomField:Action_Audit__c.Message__c | soql-field | Action_Audit__c.Message__c |
| ApexClass:AuditServiceTest | CustomField:Action_Audit__c.User__c | soql-field | Action_Audit__c.User__c |
| ApexClass:AuthorizationServiceTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:AuthorizationServiceTest | CustomObject:User | soql-object | SOQL FROM User |
| ApexClass:AuthorizationServiceTest | CustomObject:Organization_Hierarchy__c | soql-object | SOQL FROM Organization_Hierarchy__c |
| ApexClass:AuthorizationServiceTest | CustomObject:Cloud_Account__c | soql-object | SOQL FROM Cloud_Account__c |
| ApexClass:AuthorizationServiceTest | CustomObject:PermissionSet | soql-object | SOQL FROM PermissionSet |
| ApexClass:AuthorizationServiceTest | CustomObject:Account | soql-object | SOQL FROM Account |
| ApexClass:AuthorizationServiceTest | CustomObject:Tenant | soql-object | SOQL FROM Tenant |
| ApexClass:BudgetAlertServiceTest | CustomObject:Organization_Hierarchy__c | soql-object | SOQL FROM Organization_Hierarchy__c |
| ApexClass:BudgetAlertServiceTest | CustomObject:Organization_Budget__c | soql-object | SOQL FROM Organization_Budget__c |
| ApexClass:BudgetAlertServiceTest | CustomField:Organization_Budget__c.Amount__c | soql-field | Organization_Budget__c.Amount__c |
| ApexClass:BudgetServiceTest | CustomObject:Organization_Hierarchy__c | soql-object | SOQL FROM Organization_Hierarchy__c |
| ApexClass:CloudAccountSelector | CustomObject:Cloud_Account__c | soql-object | SOQL FROM Cloud_Account__c |
| ApexClass:CloudAccountSelector | CustomField:Cloud_Account__c.Account_ID__c | soql-field | Cloud_Account__c.Account_ID__c |
| ApexClass:CloudAccountSelector | CustomField:Cloud_Account__c.Cloud_Provider__c | soql-field | Cloud_Account__c.Cloud_Provider__c |
| ApexClass:CloudAccountSelector | CustomField:Cloud_Account__c.Organization__c | soql-field | Cloud_Account__c.Organization__c |
| ApexClass:CloudServiceSelector | CustomObject:Cloud_Service__c | soql-object | SOQL FROM Cloud_Service__c |
| ApexClass:CloudServiceSelector | CustomField:Cloud_Service__c.Cloud_Account__c | soql-field | Cloud_Service__c.Cloud_Account__c |
| ApexClass:CloudSpendMonthBackfillBatch | CustomObject:Cloud_Spend__c | soql-object | SOQL FROM Cloud_Spend__c |
| ApexClass:CloudSpendMonthBackfillBatch | CustomField:Cloud_Spend__c.Month__c | soql-field | Cloud_Spend__c.Month__c |
| ApexClass:CloudSpendMonthBackfillBatch | CustomField:Cloud_Spend__c.Year__c | soql-field | Cloud_Spend__c.Year__c |
| ApexClass:CloudSpendOrganizationRefactorTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:CloudSpendOrganizationRefactorTest | CustomObject:Organization_Hierarchy__c | soql-object | SOQL FROM Organization_Hierarchy__c |
| ApexClass:CloudSpendOrganizationRefactorTest | CustomObject:User | soql-object | SOQL FROM User |
| ApexClass:CloudSpendOrganizationRefactorTest | CustomObject:Account | soql-object | SOQL FROM Account |
| ApexClass:CloudSpendOrganizationRefactorTest | CustomObject:Cloud_Account__c | soql-object | SOQL FROM Cloud_Account__c |
| ApexClass:CloudSpendOrganizationRefactorTest | CustomField:Cloud_Account__c.Organization__c | soql-field | Cloud_Account__c.Organization__c |
| ApexClass:CloudSpendSelector | CustomObject:Cloud_Spend__c | soql-object | SOQL FROM Cloud_Spend__c |
| ApexClass:CloudSpendSelector | CustomField:Cloud_Spend__c.Cloud_Account__c | soql-field | Cloud_Spend__c.Cloud_Account__c |
| ApexClass:CloudSpendSelector | CustomField:Cloud_Spend__c.Amount__c | soql-field | Cloud_Spend__c.Amount__c |
| ApexClass:CloudSpendSelector | CustomField:Cloud_Spend__c.Month__c | soql-field | Cloud_Spend__c.Month__c |
| ApexClass:CloudSpendSelector | CustomField:Cloud_Spend__c.Year__c | soql-field | Cloud_Spend__c.Year__c |
| ApexClass:CloudSpendTriggerHandlerTest | CustomObject:Cloud_Spend__c | soql-object | SOQL FROM Cloud_Spend__c |
| ApexClass:CloudSpendTriggerHandlerTest | CustomField:Cloud_Spend__c.Month__c | soql-field | Cloud_Spend__c.Month__c |
| ApexClass:CloudSpendTriggerHandlerTest | CustomField:Cloud_Spend__c.Year__c | soql-field | Cloud_Spend__c.Year__c |
| ApexClass:ContentVersionSelector | CustomObject:ContentVersion | soql-object | SOQL FROM ContentVersion |
| ApexClass:ControllersTest | CustomObject:Cloud_Account__c | soql-object | SOQL FROM Cloud_Account__c |
| ApexClass:ControllersTest | CustomObject:Organization_Hierarchy__c | soql-object | SOQL FROM Organization_Hierarchy__c |
| ApexClass:create_users | CustomObject:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:create_users | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:create_users | CustomObject:User | soql-object | SOQL FROM User |
| ApexClass:create_users | CustomObject:PermissionSetGroup | soql-object | SOQL FROM PermissionSetGroup |
| ApexClass:create_users | CustomObject:PermissionSetAssignment | soql-object | SOQL FROM PermissionSetAssignment |
| ApexClass:create_users | CustomObject:Lead | soql-object | SOQL FROM Lead |
| ApexClass:create_users | CustomObject:Account | soql-object | SOQL FROM Account |
| ApexClass:create_users | CustomField:Account.Organization_Hierarchy_Root__c | soql-field | Account.Organization_Hierarchy_Root__c |
| ApexClass:create_users | CustomObject:Contact | soql-object | SOQL FROM Contact |
| ApexClass:create_users | CustomObject:Organization_Hierarchy__c | soql-object | SOQL FROM Organization_Hierarchy__c |
| ApexClass:create_users | CustomField:Organization_Hierarchy__c.Parent_Organization__c | soql-field | Organization_Hierarchy__c.Parent_Organization__c |
| ApexClass:create_users | CustomField:Organization_Hierarchy__c.Account__c | soql-field | Organization_Hierarchy__c.Account__c |
| ApexClass:create_users | CustomObject:User_Organization_Role__c | soql-object | SOQL FROM User_Organization_Role__c |
| ApexClass:create_users | CustomField:User_Organization_Role__c.User__c | soql-field | User_Organization_Role__c.User__c |
| ApexClass:create_users | CustomField:User_Organization_Role__c.Organization__c | soql-field | User_Organization_Role__c.Organization__c |
| ApexClass:create_users | CustomObject:Cloud_Account__c | soql-object | SOQL FROM Cloud_Account__c |
| ApexClass:create_users | CustomField:Cloud_Account__c.Account_ID__c | soql-field | Cloud_Account__c.Account_ID__c |
| ApexClass:create_users | CustomField:Cloud_Account__c.Cloud_Provider__c | soql-field | Cloud_Account__c.Cloud_Provider__c |
| ApexClass:create_users | CustomField:Cloud_Account__c.Organization__c | soql-field | Cloud_Account__c.Organization__c |
| ApexClass:create_users | CustomObject:Cloud_Service__c | soql-object | SOQL FROM Cloud_Service__c |
| ApexClass:create_users | CustomField:Cloud_Service__c.Cloud_Account__c | soql-field | Cloud_Service__c.Cloud_Account__c |
| ApexClass:create_users | CustomField:Cloud_Service__c.Service_Type__c | soql-field | Cloud_Service__c.Service_Type__c |
| ApexClass:create_users | CustomField:Cloud_Service__c.Status__c | soql-field | Cloud_Service__c.Status__c |
| ApexClass:create_users | CustomObject:Cloud_Spend__c | soql-object | SOQL FROM Cloud_Spend__c |
| ApexClass:create_users | CustomObject:Organization_Budget__c | soql-object | SOQL FROM Organization_Budget__c |
| ApexClass:create_users | CustomField:Organization_Budget__c.Organization__c | soql-field | Organization_Budget__c.Organization__c |
| ApexClass:create_users | CustomObject:Forecast__c | soql-object | SOQL FROM Forecast__c |
| ApexClass:create_users | CustomObject:Action_Audit__c | soql-object | SOQL FROM Action_Audit__c |
| ApexClass:create_usersTest | CustomObject:Lead | soql-object | SOQL FROM Lead |
| ApexClass:create_usersTest | CustomObject:Account | soql-object | SOQL FROM Account |
| ApexClass:create_usersTest | CustomObject:Contact | soql-object | SOQL FROM Contact |
| ApexClass:create_usersTest | CustomObject:Organization_Hierarchy__c | soql-object | SOQL FROM Organization_Hierarchy__c |
| ApexClass:create_usersTest | CustomObject:User_Organization_Role__c | soql-object | SOQL FROM User_Organization_Role__c |
| ApexClass:create_usersTest | CustomObject:Cloud_Account__c | soql-object | SOQL FROM Cloud_Account__c |
| ApexClass:create_usersTest | CustomObject:Cloud_Service__c | soql-object | SOQL FROM Cloud_Service__c |
| ApexClass:create_usersTest | CustomField:Cloud_Service__c.Service_Type__c | soql-field | Cloud_Service__c.Service_Type__c |
| ApexClass:create_usersTest | CustomField:Cloud_Service__c.Status__c | soql-field | Cloud_Service__c.Status__c |
| ApexClass:create_usersTest | CustomObject:Cloud_Spend__c | soql-object | SOQL FROM Cloud_Spend__c |
| ApexClass:create_usersTest | CustomObject:Organization_Budget__c | soql-object | SOQL FROM Organization_Budget__c |
| ApexClass:create_usersTest | CustomObject:Forecast__c | soql-object | SOQL FROM Forecast__c |
| ApexClass:create_usersTest | CustomObject:Action_Audit__c | soql-object | SOQL FROM Action_Audit__c |
| ApexClass:create_usersTest | CustomObject:User | soql-object | SOQL FROM User |
| ApexClass:FiscalPeriodMappingSelector | CustomObject:Fiscal_Period_Mapping__mdt | soql-object | SOQL FROM Fiscal_Period_Mapping__mdt |
| ApexClass:FiscalPeriodMappingSelector | CustomField:Fiscal_Period_Mapping__mdt.Fiscal_Month__c | soql-field | Fiscal_Period_Mapping__mdt.Fiscal_Month__c |
| ApexClass:FiscalPeriodMappingSelector | CustomField:Fiscal_Period_Mapping__mdt.Fiscal_Year__c | soql-field | Fiscal_Period_Mapping__mdt.Fiscal_Year__c |
| ApexClass:FiscalPeriodMappingSelector | CustomField:Fiscal_Period_Mapping__mdt.Start_Date__c | soql-field | Fiscal_Period_Mapping__mdt.Start_Date__c |
| ApexClass:FiscalPeriodMappingSelector | CustomField:Fiscal_Period_Mapping__mdt.End_Date__c | soql-field | Fiscal_Period_Mapping__mdt.End_Date__c |
| ApexClass:ForecastSelector | CustomObject:Forecast__c | soql-object | SOQL FROM Forecast__c |
| ApexClass:ForecastSelector | CustomField:Forecast__c.Amount__c | soql-field | Forecast__c.Amount__c |
| ApexClass:ForecastSelector | CustomField:Forecast__c.Cloud_Account__c | soql-field | Forecast__c.Cloud_Account__c |
| ApexClass:ForecastSelector | CustomField:Forecast__c.Fiscal_Month__c | soql-field | Forecast__c.Fiscal_Month__c |
| ApexClass:ForecastSelector | CustomField:Forecast__c.Fiscal_Year__c | soql-field | Forecast__c.Fiscal_Year__c |
| ApexClass:ForecastServiceTest | CustomObject:Organization_Hierarchy__c | soql-object | SOQL FROM Organization_Hierarchy__c |
| ApexClass:ForecastServiceTest | CustomObject:Cloud_Account__c | soql-object | SOQL FROM Cloud_Account__c |
| ApexClass:ImportServiceTest | CustomObject:Cloud_Spend__c | soql-object | SOQL FROM Cloud_Spend__c |
| ApexClass:ImportServiceTest | CustomField:Cloud_Spend__c.Amount__c | soql-field | Cloud_Spend__c.Amount__c |
| ApexClass:ImportServiceTest | CustomField:Cloud_Spend__c.Service__c | soql-field | Cloud_Spend__c.Service__c |
| ApexClass:OrganizationBudgetSelector | CustomObject:Organization_Budget__c | soql-object | SOQL FROM Organization_Budget__c |
| ApexClass:OrganizationBudgetSelector | CustomField:Organization_Budget__c.Amount__c | soql-field | Organization_Budget__c.Amount__c |
| ApexClass:OrganizationBudgetSelector | CustomField:Organization_Budget__c.Organization__c | soql-field | Organization_Budget__c.Organization__c |
| ApexClass:OrganizationBudgetSelector | CustomField:Organization_Budget__c.Year__c | soql-field | Organization_Budget__c.Year__c |
| ApexClass:OrganizationHierarchySelector | CustomObject:Organization_Hierarchy__c | soql-object | SOQL FROM Organization_Hierarchy__c |
| ApexClass:OrganizationHierarchySelector | CustomField:Organization_Hierarchy__c.Parent_Organization__c | soql-field | Organization_Hierarchy__c.Parent_Organization__c |
| ApexClass:OrganizationHierarchySelector | CustomField:Organization_Hierarchy__c.Account__c | soql-field | Organization_Hierarchy__c.Account__c |
| ApexClass:OrganizationService | CustomObject:Organization_Hierarchy__c | soql-object | SOQL FROM Organization_Hierarchy__c |
| ApexClass:OrganizationService | CustomField:Organization_Hierarchy__c.Parent_Organization__c | soql-field | Organization_Hierarchy__c.Parent_Organization__c |
| ApexClass:OrganizationService | CustomField:Organization_Hierarchy__c.Account__c | soql-field | Organization_Hierarchy__c.Account__c |
| ApexClass:OrganizationServiceTest | CustomObject:Account | soql-object | SOQL FROM Account |
| ApexClass:OrganizationServiceTest | CustomObject:Organization_Hierarchy__c | soql-object | SOQL FROM Organization_Hierarchy__c |
| ApexClass:OrganizationServiceTest | CustomField:Organization_Hierarchy__c.Parent_Organization__c | soql-field | Organization_Hierarchy__c.Parent_Organization__c |
| ApexClass:OrganizationServiceTest | CustomField:Organization_Hierarchy__c.Account__c | soql-field | Organization_Hierarchy__c.Account__c |
| ApexClass:OrganizationTriggerHandler | CustomObject:Organization_Hierarchy__c | soql-object | SOQL FROM Organization_Hierarchy__c |
| ApexClass:OrganizationTriggerHandler | CustomField:Organization_Hierarchy__c.Account__c | soql-field | Organization_Hierarchy__c.Account__c |
| ApexClass:OrganizationTriggerHandler | CustomField:Organization_Hierarchy__c.Parent_Organization__c | soql-field | Organization_Hierarchy__c.Parent_Organization__c |
| ApexClass:OrganizationTriggerHandlerTest | CustomObject:Account | soql-object | SOQL FROM Account |
| ApexClass:OrganizationTriggerHandlerTest | CustomObject:Organization_Hierarchy__c | soql-object | SOQL FROM Organization_Hierarchy__c |
| ApexClass:OrganizationTriggerHandlerTest | CustomField:Organization_Hierarchy__c.Account__c | soql-field | Organization_Hierarchy__c.Account__c |
| ApexClass:OrganizationTriggerHandlerTest | CustomField:Organization_Hierarchy__c.Parent_Organization__c | soql-field | Organization_Hierarchy__c.Parent_Organization__c |
| ApexClass:SelectorsTest | CustomObject:Organization_Hierarchy__c | soql-object | SOQL FROM Organization_Hierarchy__c |
| ApexClass:SelectorsTest | CustomObject:Cloud_Account__c | soql-object | SOQL FROM Cloud_Account__c |
| ApexClass:SelectorsTest | CustomObject:User_Organization_Role__c | soql-object | SOQL FROM User_Organization_Role__c |
| ApexClass:SpendServiceTest | CustomObject:Organization_Hierarchy__c | soql-object | SOQL FROM Organization_Hierarchy__c |
| ApexClass:SpendTrackerAuthorizationService | CustomObject:User | soql-object | SOQL FROM User |
| ApexClass:SpendTrackerAuthorizationService | CustomObject:User_Organization_Role__c | soql-object | SOQL FROM User_Organization_Role__c |
| ApexClass:SpendTrackerAuthorizationService | CustomField:User_Organization_Role__c.Organization__c | soql-field | User_Organization_Role__c.Organization__c |
| ApexClass:SpendTrackerAuthorizationService | CustomField:User_Organization_Role__c.User__c | soql-field | User_Organization_Role__c.User__c |
| ApexClass:SpendTrackerAuthorizationService | CustomField:User_Organization_Role__c.Contact__c | soql-field | User_Organization_Role__c.Contact__c |
| ApexClass:SpendTrackerAuthorizationService | CustomObject:Organization_Hierarchy__c | soql-object | SOQL FROM Organization_Hierarchy__c |
| ApexClass:SpendTrackerAuthorizationService | CustomField:Organization_Hierarchy__c.Account__c | soql-field | Organization_Hierarchy__c.Account__c |
| ApexClass:SpendTrackerAuthorizationService | CustomField:Organization_Hierarchy__c.Parent_Organization__c | soql-field | Organization_Hierarchy__c.Parent_Organization__c |
| ApexClass:SpendTrackerTest | CustomObject:Organization_Hierarchy__c | soql-object | SOQL FROM Organization_Hierarchy__c |
| ApexClass:SpendTrackerTest | CustomField:Organization_Hierarchy__c.Parent_Organization__c | soql-field | Organization_Hierarchy__c.Parent_Organization__c |
| ApexClass:SpendTrackerTest | CustomObject:ContentVersion | soql-object | SOQL FROM ContentVersion |
| ApexClass:SpendTrackerTest | CustomObject:Cloud_Spend__c | soql-object | SOQL FROM Cloud_Spend__c |
| ApexClass:SpendTrackerTest | CustomField:Cloud_Spend__c.Amount__c | soql-field | Cloud_Spend__c.Amount__c |
| ApexClass:SpendTrackerTest | CustomObject:User | soql-object | SOQL FROM User |
| ApexClass:SpendTrackerTest | CustomObject:Cloud_Account__c | soql-object | SOQL FROM Cloud_Account__c |
| ApexClass:SystemAdminAccessPolicy | CustomObject:PermissionSetAssignment | soql-object | SOQL FROM PermissionSetAssignment |
| ApexClass:SystemAdminAccessPolicy | CustomObject:User | soql-object | SOQL FROM User |
| ApexClass:UserContactMappingService | CustomObject:User | soql-object | SOQL FROM User |
| ApexClass:UserContactMappingService | CustomObject:Contact | soql-object | SOQL FROM Contact |
| ApexClass:UserContactMappingService | CustomObject:Organization_Hierarchy__c | soql-object | SOQL FROM Organization_Hierarchy__c |
| ApexClass:UserContactMappingService | CustomField:Organization_Hierarchy__c.Account__c | soql-field | Organization_Hierarchy__c.Account__c |
| ApexClass:UserContactMappingService | CustomObject:User_Organization_Role__c | soql-object | SOQL FROM User_Organization_Role__c |
| ApexClass:UserContactMappingService | CustomField:User_Organization_Role__c.User__c | soql-field | User_Organization_Role__c.User__c |
| ApexClass:UserContactMappingService | CustomField:User_Organization_Role__c.Contact__c | soql-field | User_Organization_Role__c.Contact__c |
| ApexClass:UserContactMappingService | CustomField:User_Organization_Role__c.Organization__c | soql-field | User_Organization_Role__c.Organization__c |
| ApexClass:UserContactMappingServiceTest | CustomObject:Organization_Hierarchy__c | soql-object | SOQL FROM Organization_Hierarchy__c |
| ApexClass:UserContactMappingServiceTest | CustomField:Organization_Hierarchy__c.Account__c | soql-field | Organization_Hierarchy__c.Account__c |
| ApexClass:UserContactMappingServiceTest | CustomObject:Contact | soql-object | SOQL FROM Contact |
| ApexClass:UserContactMappingServiceTest | CustomObject:User_Organization_Role__c | soql-object | SOQL FROM User_Organization_Role__c |
| ApexClass:UserContactMappingServiceTest | CustomField:User_Organization_Role__c.User__c | soql-field | User_Organization_Role__c.User__c |
| ApexClass:UserContactMappingServiceTest | CustomField:User_Organization_Role__c.Contact__c | soql-field | User_Organization_Role__c.Contact__c |
| ApexClass:UserContactMappingServiceTest | CustomObject:User | soql-object | SOQL FROM User |
| ApexClass:UserContactMappingServiceTest | CustomObject:email | soql-object | SOQL FROM email |
| ApexClass:UserOrganizationRoleSelector | CustomObject:User_Organization_Role__c | soql-object | SOQL FROM User_Organization_Role__c |
| ApexClass:UserOrganizationRoleSelector | CustomField:User_Organization_Role__c.Organization__c | soql-field | User_Organization_Role__c.Organization__c |
| ApexClass:UserOrganizationRoleSelector | CustomField:User_Organization_Role__c.Role__c | soql-field | User_Organization_Role__c.Role__c |
| ApexClass:UserOrganizationRoleSelector | CustomField:User_Organization_Role__c.Contact__c | soql-field | User_Organization_Role__c.Contact__c |
| ApexClass:UserOrganizationRoleSelector | CustomField:User_Organization_Role__c.User__c | soql-field | User_Organization_Role__c.User__c |
| ApexClass:UserOrganizationRoleTriggerHandler | CustomObject:Contact | soql-object | SOQL FROM Contact |
| ApexClass:UserOrganizationRoleTriggerHandler | CustomObject:Organization_Hierarchy__c | soql-object | SOQL FROM Organization_Hierarchy__c |
| ApexClass:UserOrganizationRoleTriggerHandler | CustomField:Organization_Hierarchy__c.Account__c | soql-field | Organization_Hierarchy__c.Account__c |
| ApexClass:UserOrganizationRoleTriggerHandler | CustomObject:User_Organization_Role__c | soql-object | SOQL FROM User_Organization_Role__c |
| ApexClass:UserOrganizationRoleTriggerHandler | CustomField:User_Organization_Role__c.User__c | soql-field | User_Organization_Role__c.User__c |
| ApexClass:UserOrganizationRoleTriggerHandler | CustomField:User_Organization_Role__c.Contact__c | soql-field | User_Organization_Role__c.Contact__c |
| ApexClass:UserOrganizationRoleTriggerHandler | CustomField:User_Organization_Role__c.Organization__c | soql-field | User_Organization_Role__c.Organization__c |
| ApexClass:UserOrganizationRoleTriggerHandler | CustomField:User_Organization_Role__c.Role__c | soql-field | User_Organization_Role__c.Role__c |
| ApexClass:UserOrganizationRoleTriggerTest | CustomObject:Organization_Hierarchy__c | soql-object | SOQL FROM Organization_Hierarchy__c |
| ApexClass:UserOrganizationRoleTriggerTest | CustomObject:User_Organization_Role__c | soql-object | SOQL FROM User_Organization_Role__c |
| ApexClass:UserOrganizationRoleTriggerTest | CustomField:User_Organization_Role__c.Contact__c | soql-field | User_Organization_Role__c.Contact__c |
| ApexClass:UserOrganizationRoleTriggerTest | CustomField:User_Organization_Role__c.User__c | soql-field | User_Organization_Role__c.User__c |
| ApexClass:UserSelector | CustomObject:User | soql-object | SOQL FROM User |
| ApexClass:UserSelector | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:UserServiceTest | CustomObject:Organization_Hierarchy__c | soql-object | SOQL FROM Organization_Hierarchy__c |
| ApexClass:UserServiceTest | CustomObject:User_Organization_Role__c | soql-object | SOQL FROM User_Organization_Role__c |
| ApexClass:UserServiceTest | CustomObject:User | soql-object | SOQL FROM User |
| ApexTrigger:CloudSpendTrigger | CustomObject:Cloud_Spend__c | trigger-object | Trigger CloudSpendTrigger on Cloud_Spend__c |
| ApexTrigger:OrganizationTrigger | CustomObject:Organization_Hierarchy__c | trigger-object | Trigger OrganizationTrigger on Organization_Hierarchy__c |
| ApexTrigger:UserOrganizationRoleTrigger | CustomObject:User_Organization_Role__c | trigger-object | Trigger UserOrganizationRoleTrigger on User_Organization_Role__c |

## Circular Dependencies

None detected.

## High Risk Components

| Component | Type | Fan-In | Fan-Out | Risk | Reasons |
|---|---|---:|---:|---|---|
| OrganizationService | ApexClass | 10 | 17 | HIGH | high fan-in, high fan-out, high coupling, unresolved references, direct LWC consumer |
| UserService | ApexClass | 19 | 20 | HIGH | high fan-in, high fan-out, high coupling, unresolved references |
| SpendTrackerAuthorizationService | ApexClass | 18 | 17 | HIGH | high fan-in, high fan-out, high coupling, unresolved references |
| AccountService | ApexClass | 11 | 11 | HIGH | high fan-in, high fan-out, high coupling, unresolved references |
| AdminDataExplorerController | ApexClass | 3 | 36 | HIGH | high fan-out, high coupling, unresolved references, direct LWC consumer |
| AdminOverviewController | ApexClass | 3 | 21 | HIGH | high fan-out, high coupling, unresolved references, direct LWC consumer |
| UserController | ApexClass | 15 | 6 | HIGH | high fan-in, high coupling, unresolved references, direct LWC consumer |
| AdminSpendController | ApexClass | 5 | 12 | HIGH | high fan-out, high coupling, unresolved references, direct LWC consumer |
| create_users | ApexClass | 0 | 63 | HIGH | high fan-out, high coupling, unresolved references |
| UserContactMappingService | ApexClass | 4 | 21 | HIGH | high fan-out, high coupling, unresolved references |
| UserOrganizationRoleTriggerHandler | ApexClass | 7 | 14 | HIGH | high fan-out, high coupling, unresolved references |
| BudgetService | ApexClass | 12 | 8 | HIGH | high fan-in, high coupling, unresolved references |
| CloudSpendSelector | ApexClass | 7 | 12 | HIGH | high fan-out, high coupling, unresolved references |
| ForecastService | ApexClass | 9 | 9 | HIGH | high fan-in, high coupling, unresolved references |
| UserOrganizationRoleSelector | ApexClass | 9 | 7 | HIGH | high fan-in, high coupling, unresolved references |
| SpendService | ApexClass | 11 | 5 | HIGH | high fan-in, high coupling, unresolved references |
| Organization_Hierarchy__c | Object | 80 | 0 | HIGH | high fan-in, high coupling |
| SelectorsTest | ApexClass | 0 | 64 | HIGH | high fan-out, high coupling, unresolved references |
| Assert | External | 63 | 0 | HIGH | high fan-in, high coupling |
| SpendTrackerTest | ApexClass | 0 | 54 | HIGH | high fan-out, high coupling, unresolved references |
| ControllersTest | ApexClass | 0 | 52 | HIGH | high fan-out, high coupling, unresolved references |
| Cloud_Spend__c | Object | 52 | 0 | HIGH | high fan-in, high coupling |
| Cloud_Account__c | Object | 48 | 0 | HIGH | high fan-in, high coupling |
| User_Organization_Role__c | Object | 46 | 0 | HIGH | high fan-in, high coupling |
| AuthorizationServiceTest | ApexClass | 0 | 45 | HIGH | high fan-out, high coupling, unresolved references |
| CloudSpendOrganizationRefactorTest | ApexClass | 0 | 42 | HIGH | high fan-out, high coupling, unresolved references |
| UserContactMappingServiceTest | ApexClass | 0 | 35 | HIGH | high fan-out, high coupling, unresolved references |
| User | External | 31 | 0 | HIGH | high fan-in, high coupling |
| create_usersTest | ApexClass | 0 | 30 | HIGH | high fan-out, high coupling, unresolved references |
| AdminAccessServiceTest | ApexClass | 0 | 26 | HIGH | high fan-out, high coupling, unresolved references |
| UserOrganizationRoleTriggerTest | ApexClass | 0 | 25 | HIGH | high fan-out, high coupling, unresolved references |
| UserServiceTest | ApexClass | 0 | 23 | HIGH | high fan-out, high coupling, unresolved references |
| Account | External | 23 | 0 | HIGH | high fan-in, high coupling |
| OrganizationServiceTest | ApexClass | 0 | 22 | HIGH | high fan-out, high coupling, unresolved references |
| Organization_Budget__c | Object | 21 | 0 | HIGH | high fan-in, high coupling |
| AuditService | ApexClass | 13 | 7 | HIGH | high fan-in, high coupling |
| AccountServiceTest | ApexClass | 0 | 16 | HIGH | high fan-out, high coupling, unresolved references |
| Cloud_Service__c | Object | 16 | 0 | HIGH | high fan-in, high coupling |
| Contact | External | 16 | 0 | HIGH | high fan-in, high coupling |
| BudgetAlertServiceTest | ApexClass | 0 | 15 | HIGH | high fan-out, high coupling, unresolved references |
