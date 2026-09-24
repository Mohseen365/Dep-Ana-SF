# Unresolved Dependency References

These were detected in source but could not be resolved to a local symbol.

| From | To | Type | Evidence |
|---|---|---|---|
| ApexClass:AccountService | External:AccountWrapper | instantiation | new AccountWrapper() |
| ApexClass:AccountService | External:SpendHistoryWrapper | instantiation | new SpendHistoryWrapper() |
| ApexClass:AccountService | External:AccountWrapper | generic-type | <AccountWrapper> |
| ApexClass:AccountService | External:SpendHistoryWrapper | generic-type | <SpendHistoryWrapper> |
| ApexClass:AccountServiceTest | External:Assert | method-call | Assert.isNotNull() |
| ApexClass:AccountServiceTest | External:Assert | method-call | Assert.isFalse() |
| ApexClass:AccountServiceTest | External:Assert | method-call | Assert.areEqual() |
| ApexClass:AccountServiceTest | External:Assert | method-call | Assert.isTrue() |
| ApexClass:AdminAccessServiceTest | External:User | instantiation | new User() |
| ApexClass:AdminAccessServiceTest | External:PermissionSetAssignment | instantiation | new PermissionSetAssignment() |
| ApexClass:AdminAccessServiceTest | External:Profile | type-reference | Profile |
| ApexClass:AdminAccessServiceTest | External:User | type-reference | User |
| ApexClass:AdminAccessServiceTest | External:PermissionSet | type-reference | PermissionSet |
| ApexClass:AdminAccessServiceTest | External:AdminOverviewWrapper | type-reference | AdminOverviewWrapper |
| ApexClass:AdminAccessServiceTest | External:HealthCheckWrapper | type-reference | HealthCheckWrapper |
| ApexClass:AdminAccessServiceTest | External:User | generic-type | <User> |
| ApexClass:AdminAccessServiceTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:AdminAccessServiceTest | External:Object:PermissionSet | soql-object | SOQL FROM PermissionSet |
| ApexClass:AdminAccessServiceTest | External:Object:admin | soql-object | SOQL FROM admin |
| ApexClass:AdminDataExplorerController | External:Object:User | soql-object | SOQL FROM User |
| ApexClass:AdminHealthController | External:HealthCheckWrapper | instantiation | new HealthCheckWrapper() |
| ApexClass:AdminHealthController | External:HealthCheckWrapper | type-reference | HealthCheckWrapper |
| ApexClass:AdminOverviewController | External:AdminOverviewWrapper | instantiation | new AdminOverviewWrapper() |
| ApexClass:AdminOverviewController | External:SpendImportBatchDTO | instantiation | new SpendImportBatchDTO() |
| ApexClass:AdminOverviewController | External:AdminOverviewWrapper | type-reference | AdminOverviewWrapper |
| ApexClass:AdminOverviewController | External:SpendImportBatchDTO | type-reference | SpendImportBatchDTO |
| ApexClass:AdminOverviewController | External:SpendImportBatchDTO | generic-type | <SpendImportBatchDTO> |
| ApexClass:AdminOverviewController | External:Object:User | soql-object | SOQL FROM User |
| ApexClass:AdminSpendController | External:Year__c | type-reference | Year__c |
| ApexClass:AdminUserController | External:User | generic-type | <User> |
| ApexClass:AuditServiceTest | External:Assert | method-call | Assert.areEqual() |
| ApexClass:AuditServiceTest | External:Assert | method-call | Assert.isNotNull() |
| ApexClass:AuthorizationServiceTest | External:Account | instantiation | new Account() |
| ApexClass:AuthorizationServiceTest | External:User | instantiation | new User() |
| ApexClass:AuthorizationServiceTest | External:Contact | instantiation | new Contact() |
| ApexClass:AuthorizationServiceTest | External:PermissionSetAssignment | instantiation | new PermissionSetAssignment() |
| ApexClass:AuthorizationServiceTest | External:Assert | method-call | Assert.isTrue() |
| ApexClass:AuthorizationServiceTest | External:Assert | method-call | Assert.isNull() |
| ApexClass:AuthorizationServiceTest | External:Assert | method-call | Assert.isFalse() |
| ApexClass:AuthorizationServiceTest | External:Assert | method-call | Assert.areEqual() |
| ApexClass:AuthorizationServiceTest | External:Assert | method-call | Assert.isNotNull() |
| ApexClass:AuthorizationServiceTest | External:Account | type-reference | Account |
| ApexClass:AuthorizationServiceTest | External:Profile | type-reference | Profile |
| ApexClass:AuthorizationServiceTest | External:User | type-reference | User |
| ApexClass:AuthorizationServiceTest | External:Contact | type-reference | Contact |
| ApexClass:AuthorizationServiceTest | External:PermissionSet | type-reference | PermissionSet |
| ApexClass:AuthorizationServiceTest | External:Account | generic-type | <Account> |
| ApexClass:AuthorizationServiceTest | External:User | generic-type | <User> |
| ApexClass:AuthorizationServiceTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:AuthorizationServiceTest | External:Object:User | soql-object | SOQL FROM User |
| ApexClass:AuthorizationServiceTest | External:Object:PermissionSet | soql-object | SOQL FROM PermissionSet |
| ApexClass:AuthorizationServiceTest | External:Object:Account | soql-object | SOQL FROM Account |
| ApexClass:AuthorizationServiceTest | External:Object:Tenant | soql-object | SOQL FROM Tenant |
| ApexClass:BudgetAlertService | External:BudgetAlertWrapper | instantiation | new BudgetAlertWrapper() |
| ApexClass:BudgetAlertService | External:BudgetAlertWrapper | generic-type | <BudgetAlertWrapper> |
| ApexClass:BudgetAlertServiceTest | External:Assert | method-call | Assert.isFalse() |
| ApexClass:BudgetAlertServiceTest | External:Assert | method-call | Assert.areEqual() |
| ApexClass:BudgetService | External:BudgetWrapper | instantiation | new BudgetWrapper() |
| ApexClass:BudgetService | External:BudgetWrapper | generic-type | <BudgetWrapper> |
| ApexClass:BudgetServiceTest | External:Assert | method-call | Assert.areEqual() |
| ApexClass:BudgetServiceTest | External:Assert | method-call | Assert.isTrue() |
| ApexClass:CloudSpendMonthBackfillBatch | External:BatchableContext | type-reference | BatchableContext |
| ApexClass:CloudSpendMonthBackfillBatch | External:Database.Batchable<SObject> | implements | implements Database.Batchable<SObject> |
| ApexClass:CloudSpendOrganizationRefactorTest | External:Account | instantiation | new Account() |
| ApexClass:CloudSpendOrganizationRefactorTest | External:Contact | instantiation | new Contact() |
| ApexClass:CloudSpendOrganizationRefactorTest | External:User | instantiation | new User() |
| ApexClass:CloudSpendOrganizationRefactorTest | External:Assert | method-call | Assert.isFalse() |
| ApexClass:CloudSpendOrganizationRefactorTest | External:Assert | method-call | Assert.areEqual() |
| ApexClass:CloudSpendOrganizationRefactorTest | External:Assert | method-call | Assert.isTrue() |
| ApexClass:CloudSpendOrganizationRefactorTest | External:Assert | method-call | Assert.areNotEqual() |
| ApexClass:CloudSpendOrganizationRefactorTest | External:Assert | method-call | Assert.isNotNull() |
| ApexClass:CloudSpendOrganizationRefactorTest | External:Account | type-reference | Account |
| ApexClass:CloudSpendOrganizationRefactorTest | External:Contact | type-reference | Contact |
| ApexClass:CloudSpendOrganizationRefactorTest | External:Profile | type-reference | Profile |
| ApexClass:CloudSpendOrganizationRefactorTest | External:User | type-reference | User |
| ApexClass:CloudSpendOrganizationRefactorTest | External:HealthCheckWrapper | type-reference | HealthCheckWrapper |
| ApexClass:CloudSpendOrganizationRefactorTest | External:Account | generic-type | <Account> |
| ApexClass:CloudSpendOrganizationRefactorTest | External:Contact | generic-type | <Contact> |
| ApexClass:CloudSpendOrganizationRefactorTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:CloudSpendOrganizationRefactorTest | External:Object:User | soql-object | SOQL FROM User |
| ApexClass:CloudSpendOrganizationRefactorTest | External:Object:Account | soql-object | SOQL FROM Account |
| ApexClass:CloudSpendSelector | External:QueryException | type-reference | QueryException |
| ApexClass:CloudSpendSelector | External:Organization__c | type-reference | Organization__c |
| ApexClass:CloudSpendSelector | External:Cloud_Provider__c | type-reference | Cloud_Provider__c |
| ApexClass:CloudSpendSelector | External:Spend_Month__c | type-reference | Spend_Month__c |
| ApexClass:CloudSpendSelector | External:Service__c | type-reference | Service__c |
| ApexClass:CloudSpendSelector | External:Region__c | type-reference | Region__c |
| ApexClass:CloudSpendTriggerHandlerTest | External:SaveResult | type-reference | SaveResult |
| ApexClass:ContentVersionSelector | External:Object:ContentVersion | soql-object | SOQL FROM ContentVersion |
| ApexClass:ControllersTest | External:ContentVersion | instantiation | new ContentVersion() |
| ApexClass:ControllersTest | External:Assert | method-call | Assert.isFalse() |
| ApexClass:ControllersTest | External:Assert | method-call | Assert.isTrue() |
| ApexClass:ControllersTest | External:Assert | method-call | Assert.isNotNull() |
| ApexClass:ControllersTest | External:Assert | method-call | Assert.fail() |
| ApexClass:ControllersTest | External:ContentVersion | type-reference | ContentVersion |
| ApexClass:ControllersTest | External:User | generic-type | <User> |
| ApexClass:create_users | External:ProvisioningException | instantiation | new ProvisioningException() |
| ApexClass:create_users | External:BusinessDataProvisioningQueueable | instantiation | new BusinessDataProvisioningQueueable() |
| ApexClass:create_users | External:User | instantiation | new User() |
| ApexClass:create_users | External:PermissionSetAssignment | instantiation | new PermissionSetAssignment() |
| ApexClass:create_users | External:Lead | instantiation | new Lead() |
| ApexClass:create_users | External:Account | instantiation | new Account() |
| ApexClass:create_users | External:Contact | instantiation | new Contact() |
| ApexClass:create_users | External:Email | method-call | Email.toLowerCase() |
| ApexClass:create_users | External:User | type-reference | User |
| ApexClass:create_users | External:QueueableContext | type-reference | QueueableContext |
| ApexClass:create_users | External:Account | type-reference | Account |
| ApexClass:create_users | External:User | generic-type | <User> |
| ApexClass:create_users | External:PermissionSetGroup | generic-type | <PermissionSetGroup> |
| ApexClass:create_users | External:PermissionSetAssignment | generic-type | <PermissionSetAssignment> |
| ApexClass:create_users | External:Account | generic-type | <Account> |
| ApexClass:create_users | External:Lead | generic-type | <Lead> |
| ApexClass:create_users | External:Contact | generic-type | <Contact> |
| ApexClass:create_users | External:Object:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:create_users | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:create_users | External:Object:User | soql-object | SOQL FROM User |
| ApexClass:create_users | External:Object:PermissionSetGroup | soql-object | SOQL FROM PermissionSetGroup |
| ApexClass:create_users | External:Object:PermissionSetAssignment | soql-object | SOQL FROM PermissionSetAssignment |
| ApexClass:create_users | External:Object:Lead | soql-object | SOQL FROM Lead |
| ApexClass:create_users | External:Object:Account | soql-object | SOQL FROM Account |
| ApexClass:create_users | External:Object:Contact | soql-object | SOQL FROM Contact |
| ApexClass:create_usersTest | External:Assert | method-call | Assert.isTrue() |
| ApexClass:create_usersTest | External:Assert | method-call | Assert.isNotNull() |
| ApexClass:create_usersTest | External:Assert | method-call | Assert.areEqual() |
| ApexClass:create_usersTest | External:Assert | method-call | Assert.isFalse() |
| ApexClass:create_usersTest | External:User | type-reference | User |
| ApexClass:create_usersTest | External:Lead | generic-type | <Lead> |
| ApexClass:create_usersTest | External:Account | generic-type | <Account> |
| ApexClass:create_usersTest | External:Contact | generic-type | <Contact> |
| ApexClass:create_usersTest | External:Object:Lead | soql-object | SOQL FROM Lead |
| ApexClass:create_usersTest | External:Object:Account | soql-object | SOQL FROM Account |
| ApexClass:create_usersTest | External:Object:Contact | soql-object | SOQL FROM Contact |
| ApexClass:create_usersTest | External:Object:User | soql-object | SOQL FROM User |
| ApexClass:ErrorResponse | External:UUID | method-call | UUID.randomUUID() |
| ApexClass:FiscalUtils | External:PeriodMapping | instantiation | new PeriodMapping() |
| ApexClass:FiscalUtils | External:Start_Date__c | method-call | Start_Date__c.month() |
| ApexClass:FiscalUtilsTest | External:Assert | method-call | Assert.isNotNull() |
| ApexClass:ForecastService | External:ForecastWrapper | instantiation | new ForecastWrapper() |
| ApexClass:ForecastService | External:ForecastWrapper | generic-type | <ForecastWrapper> |
| ApexClass:ForecastServiceTest | External:Assert | method-call | Assert.areEqual() |
| ApexClass:ImportService | External:VersionData | method-call | VersionData.toString() |
| ApexClass:ImportService | External:ContentVersion | type-reference | ContentVersion |
| ApexClass:ImportServiceTest | External:ContentVersion | instantiation | new ContentVersion() |
| ApexClass:ImportServiceTest | External:Assert | method-call | Assert.areEqual() |
| ApexClass:ImportServiceTest | External:Assert | method-call | Assert.isTrue() |
| ApexClass:ImportServiceTest | External:ContentVersion | type-reference | ContentVersion |
| ApexClass:OrganizationBudgetSelector | External:QueryException | type-reference | QueryException |
| ApexClass:OrganizationService | External:OrganizationWrapper | instantiation | new OrganizationWrapper() |
| ApexClass:OrganizationService | External:Starting | type-reference | Starting |
| ApexClass:OrganizationService | External:OrganizationWrapper | generic-type | <OrganizationWrapper> |
| ApexClass:OrganizationServiceTest | External:Account | instantiation | new Account() |
| ApexClass:OrganizationServiceTest | External:Assert | method-call | Assert.isFalse() |
| ApexClass:OrganizationServiceTest | External:Assert | method-call | Assert.areEqual() |
| ApexClass:OrganizationServiceTest | External:Assert | method-call | Assert.isNotNull() |
| ApexClass:OrganizationServiceTest | External:Assert | method-call | Assert.isTrue() |
| ApexClass:OrganizationServiceTest | External:Assert | method-call | Assert.fail() |
| ApexClass:OrganizationServiceTest | External:Account | type-reference | Account |
| ApexClass:OrganizationServiceTest | External:OrganizationWrapper | type-reference | OrganizationWrapper |
| ApexClass:OrganizationServiceTest | External:Object:Account | soql-object | SOQL FROM Account |
| ApexClass:OrganizationTriggerHandlerTest | External:Account | instantiation | new Account() |
| ApexClass:OrganizationTriggerHandlerTest | External:Assert | method-call | Assert.areEqual() |
| ApexClass:OrganizationTriggerHandlerTest | External:Assert | method-call | Assert.fail() |
| ApexClass:OrganizationTriggerHandlerTest | External:Assert | method-call | Assert.isTrue() |
| ApexClass:OrganizationTriggerHandlerTest | External:Account | type-reference | Account |
| ApexClass:OrganizationTriggerHandlerTest | External:DmlException | type-reference | DmlException |
| ApexClass:OrganizationTriggerHandlerTest | External:Account | generic-type | <Account> |
| ApexClass:OrganizationTriggerHandlerTest | External:Object:Account | soql-object | SOQL FROM Account |
| ApexClass:SelectorsTest | External:ContentVersion | instantiation | new ContentVersion() |
| ApexClass:SelectorsTest | External:Assert | method-call | Assert.isFalse() |
| ApexClass:SelectorsTest | External:Assert | method-call | Assert.isNotNull() |
| ApexClass:SelectorsTest | External:ContentVersion | type-reference | ContentVersion |
| ApexClass:SelectorsTest | External:User | generic-type | <User> |
| ApexClass:SelectorsTest | External:Profile | generic-type | <Profile> |
| ApexClass:SpendImportService | External:VersionData | method-call | VersionData.toString() |
| ApexClass:SpendImportService | External:Error_Message__c | method-call | Error_Message__c.length() |
| ApexClass:SpendImportService | External:Error_Message__c | method-call | Error_Message__c.substring() |
| ApexClass:SpendImportService | External:ContentVersion | type-reference | ContentVersion |
| ApexClass:SpendService | External:AggregateSpendWrapper | instantiation | new AggregateSpendWrapper() |
| ApexClass:SpendService | External:AggregateSpendWrapper | generic-type | <AggregateSpendWrapper> |
| ApexClass:SpendServiceTest | External:Assert | method-call | Assert.areEqual() |
| ApexClass:SpendServiceTest | External:Assert | method-call | Assert.isFalse() |
| ApexClass:SpendTrackerAuthorizationService | External:User | generic-type | <User> |
| ApexClass:SpendTrackerAuthorizationService | External:Object:User | soql-object | SOQL FROM User |
| ApexClass:SpendTrackerTest | External:ContentVersion | instantiation | new ContentVersion() |
| ApexClass:SpendTrackerTest | External:Assert | method-call | Assert.isNotNull() |
| ApexClass:SpendTrackerTest | External:Assert | method-call | Assert.isFalse() |
| ApexClass:SpendTrackerTest | External:Assert | method-call | Assert.areEqual() |
| ApexClass:SpendTrackerTest | External:Assert | method-call | Assert.isTrue() |
| ApexClass:SpendTrackerTest | External:ContentVersion | type-reference | ContentVersion |
| ApexClass:SpendTrackerTest | External:User | type-reference | User |
| ApexClass:SpendTrackerTest | External:User | generic-type | <User> |
| ApexClass:SpendTrackerTest | External:Object:ContentVersion | soql-object | SOQL FROM ContentVersion |
| ApexClass:SpendTrackerTest | External:Object:User | soql-object | SOQL FROM User |
| ApexClass:SystemAdminAccessPolicy | External:PermissionSetAssignment | generic-type | <PermissionSetAssignment> |
| ApexClass:SystemAdminAccessPolicy | External:User | generic-type | <User> |
| ApexClass:SystemAdminAccessPolicy | External:Object:PermissionSetAssignment | soql-object | SOQL FROM PermissionSetAssignment |
| ApexClass:SystemAdminAccessPolicy | External:Object:User | soql-object | SOQL FROM User |
| ApexClass:UserContactMappingService | External:ClassificationResult | instantiation | new ClassificationResult() |
| ApexClass:UserContactMappingService | External:BackfillResult | instantiation | new BackfillResult() |
| ApexClass:UserContactMappingService | External:Classification | method-call | Classification.values() |
| ApexClass:UserContactMappingService | External:User | method-call | User.ContactId() |
| ApexClass:UserContactMappingService | External:Classification | type-reference | Classification |
| ApexClass:UserContactMappingService | External:User | type-reference | User |
| ApexClass:UserContactMappingService | External:Contact | type-reference | Contact |
| ApexClass:UserContactMappingService | External:BackfillResult | type-reference | BackfillResult |
| ApexClass:UserContactMappingService | External:ClassificationResult | generic-type | <ClassificationResult> |
| ApexClass:UserContactMappingService | External:Object:User | soql-object | SOQL FROM User |
| ApexClass:UserContactMappingService | External:Object:Contact | soql-object | SOQL FROM Contact |
| ApexClass:UserContactMappingServiceTest | External:Account | instantiation | new Account() |
| ApexClass:UserContactMappingServiceTest | External:Contact | instantiation | new Contact() |
| ApexClass:UserContactMappingServiceTest | External:User | instantiation | new User() |
| ApexClass:UserContactMappingServiceTest | External:Assert | method-call | Assert.isNotNull() |
| ApexClass:UserContactMappingServiceTest | External:Assert | method-call | Assert.isNull() |
| ApexClass:UserContactMappingServiceTest | External:Assert | method-call | Assert.areEqual() |
| ApexClass:UserContactMappingServiceTest | External:Assert | method-call | Assert.isTrue() |
| ApexClass:UserContactMappingServiceTest | External:Assert | method-call | Assert.areNotEqual() |
| ApexClass:UserContactMappingServiceTest | External:Account | type-reference | Account |
| ApexClass:UserContactMappingServiceTest | External:Contact | type-reference | Contact |
| ApexClass:UserContactMappingServiceTest | External:User | type-reference | User |
| ApexClass:UserContactMappingServiceTest | External:BackfillResult | type-reference | BackfillResult |
| ApexClass:UserContactMappingServiceTest | External:Account | generic-type | <Account> |
| ApexClass:UserContactMappingServiceTest | External:Contact | generic-type | <Contact> |
| ApexClass:UserContactMappingServiceTest | External:Object:Contact | soql-object | SOQL FROM Contact |
| ApexClass:UserContactMappingServiceTest | External:Object:User | soql-object | SOQL FROM User |
| ApexClass:UserContactMappingServiceTest | External:Object:email | soql-object | SOQL FROM email |
| ApexClass:UserController | External:User | generic-type | <User> |
| ApexClass:UserManagementController | External:User | generic-type | <User> |
| ApexClass:UserOrganizationRoleSelector | External:QueryException | type-reference | QueryException |
| ApexClass:UserOrganizationRoleTriggerHandler | External:Contact | type-reference | Contact |
| ApexClass:UserOrganizationRoleTriggerHandler | External:Object:Contact | soql-object | SOQL FROM Contact |
| ApexClass:UserOrganizationRoleTriggerTest | External:Contact | instantiation | new Contact() |
| ApexClass:UserOrganizationRoleTriggerTest | External:Account | instantiation | new Account() |
| ApexClass:UserOrganizationRoleTriggerTest | External:Assert | method-call | Assert.isFalse() |
| ApexClass:UserOrganizationRoleTriggerTest | External:Assert | method-call | Assert.isTrue() |
| ApexClass:UserOrganizationRoleTriggerTest | External:Assert | method-call | Assert.areEqual() |
| ApexClass:UserOrganizationRoleTriggerTest | External:Assert | method-call | Assert.isNotNull() |
| ApexClass:UserOrganizationRoleTriggerTest | External:Assert | method-call | Assert.isNull() |
| ApexClass:UserOrganizationRoleTriggerTest | External:Contact | type-reference | Contact |
| ApexClass:UserOrganizationRoleTriggerTest | External:Account | type-reference | Account |
| ApexClass:UserOrganizationRoleTriggerTest | External:Account | generic-type | <Account> |
| ApexClass:UserOrganizationRoleTriggerTest | External:Contact | generic-type | <Contact> |
| ApexClass:UserSelector | External:User | generic-type | <User> |
| ApexClass:UserSelector | External:Profile | generic-type | <Profile> |
| ApexClass:UserSelector | External:Object:User | soql-object | SOQL FROM User |
| ApexClass:UserSelector | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:UserService | External:UserRoleWrapper | instantiation | new UserRoleWrapper() |
| ApexClass:UserService | External:RoleMapping | instantiation | new RoleMapping() |
| ApexClass:UserService | External:User | instantiation | new User() |
| ApexClass:UserService | External:User | type-reference | User |
| ApexClass:UserService | External:UserRoleWrapper | generic-type | <UserRoleWrapper> |
| ApexClass:UserService | External:User | generic-type | <User> |
| ApexClass:UserService | External:Profile | generic-type | <Profile> |
| ApexClass:UserService | External:RoleMapping | generic-type | <RoleMapping> |
| ApexClass:UserServiceTest | External:Account | instantiation | new Account() |
| ApexClass:UserServiceTest | External:Assert | method-call | Assert.isFalse() |
| ApexClass:UserServiceTest | External:Assert | method-call | Assert.areEqual() |
| ApexClass:UserServiceTest | External:Assert | method-call | Assert.isTrue() |
| ApexClass:UserServiceTest | External:Assert | method-call | Assert.fail() |
| ApexClass:UserServiceTest | External:Assert | method-call | Assert.isNotNull() |
| ApexClass:UserServiceTest | External:Account | type-reference | Account |
| ApexClass:UserServiceTest | External:User | type-reference | User |
| ApexClass:UserServiceTest | External:User | generic-type | <User> |
| ApexClass:UserServiceTest | External:Object:User | soql-object | SOQL FROM User |
