# Unresolved Dependency References

These were detected in source but could not be resolved to a local symbol.

| From | To | Type | Evidence |
|---|---|---|---|
| ApexClass:ApprovalFlowControllerTest | External:MaintenanceSelectorMock | instantiation | new MaintenanceSelectorMock() |
| ApexClass:AssetDashboardControllerTest | External:AssetSelectorMock | instantiation | new AssetSelectorMock() |
| ApexClass:AssetDashboardControllerTest | External:DashboardResponse | type-reference | DashboardResponse |
| ApexClass:AssetDashboardService | External:DashboardResponse | type-reference | DashboardResponse |
| ApexClass:AssetDashboardServiceTest | External:DashboardResponse | type-reference | DashboardResponse |
| ApexClass:AssetDTOs | External:TimelineEventDTO | type-reference | TimelineEventDTO |
| ApexClass:AssetDTOs | External:TimelineEventDTO | generic-type | <TimelineEventDTO> |
| ApexClass:AssetDTOs | External:HealthMapMarkerDTO | generic-type | <HealthMapMarkerDTO> |
| ApexClass:AssetDTOs | External:ComboboxOption | generic-type | <ComboboxOption> |
| ApexClass:AssetDTOs | External:ChartDataDTO | generic-type | <ChartDataDTO> |
| ApexClass:AssetDTOs | External:KpiItemDTO | generic-type | <KpiItemDTO> |
| ApexClass:AssetDTOs | External:AssetCardDTO | generic-type | <AssetCardDTO> |
| ApexClass:AssetDTOs | External:AssetMapMarkerDTO | generic-type | <AssetMapMarkerDTO> |
| ApexClass:AssetDTOs | External:ChartDTO | generic-type | <ChartDTO> |
| ApexClass:AssetDTOs | External:FilterOptionDTO | generic-type | <FilterOptionDTO> |
| ApexClass:AssetDTOsTest | External:TimelineEventDTO | type-reference | TimelineEventDTO |
| ApexClass:AssetDTOsTest | External:LocationDTO | type-reference | LocationDTO |
| ApexClass:AssetDTOsTest | External:AssetDetailDTO | type-reference | AssetDetailDTO |
| ApexClass:AssetDTOsTest | External:HealthMapMarkerDTO | type-reference | HealthMapMarkerDTO |
| ApexClass:AssetDTOsTest | External:DashboardResponse | type-reference | DashboardResponse |
| ApexClass:AssetDTOsTest | External:AssetCardDTO | type-reference | AssetCardDTO |
| ApexClass:AssetDTOsTest | External:AssetMapMarkerDTO | type-reference | AssetMapMarkerDTO |
| ApexClass:AssetDTOsTest | External:ChartDataDTO | type-reference | ChartDataDTO |
| ApexClass:AssetDTOsTest | External:ComboboxOption | type-reference | ComboboxOption |
| ApexClass:AssetDTOsTest | External:FilterOptionDTO | type-reference | FilterOptionDTO |
| ApexClass:AssetDTOsTest | External:ChartDTO | type-reference | ChartDTO |
| ApexClass:AssetDTOsTest | External:AssetExplorerResponse | type-reference | AssetExplorerResponse |
| ApexClass:AssetExplorerControllerTest | External:User | instantiation | new User() |
| ApexClass:AssetExplorerControllerTest | External:Profile | type-reference | Profile |
| ApexClass:AssetExplorerControllerTest | External:User | type-reference | User |
| ApexClass:AssetExplorerControllerTest | External:AssetExplorerResponse | type-reference | AssetExplorerResponse |
| ApexClass:AssetExplorerControllerTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:AssetExplorerService | External:KpiItemDTO | type-reference | KpiItemDTO |
| ApexClass:AssetExplorerService | External:AssetExplorerResponse | type-reference | AssetExplorerResponse |
| ApexClass:AssetExplorerService | External:AssetCardDTO | type-reference | AssetCardDTO |
| ApexClass:AssetExplorerServiceTest | External:User | type-reference | User |
| ApexClass:AssetExplorerServiceTest | External:AssetExplorerResponse | type-reference | AssetExplorerResponse |
| ApexClass:AssetExplorerServiceTest | External:Object:User | soql-object | SOQL FROM User |
| ApexClass:AssetExplorerServiceTest | External:Object:controller | soql-object | SOQL FROM controller |
| ApexClass:AssetExplorerServiceTest | External:Object:service | soql-object | SOQL FROM service |
| ApexClass:AssetSelector | External:StubProvider | type-reference | StubProvider |
| ApexClass:AssetSelector | External:CreatedDate | type-reference | CreatedDate |
| ApexClass:AssetSelector | External:Object:Maintenance_Requests__r | soql-object | SOQL FROM Maintenance_Requests__r |
| ApexClass:AssetSelector | External:Object:Inspections__r | soql-object | SOQL FROM Inspections__r |
| ApexClass:AssetSelectorTest | External:Maintenance_Requests__r | method-call | Maintenance_Requests__r.size() |
| ApexClass:AssetSummaryBuilder | External:CreatedDate | method-call | CreatedDate.date() |
| ApexClass:AssetSummaryBuilder | External:AssetDetailDTO | type-reference | AssetDetailDTO |
| ApexClass:AuditLogServiceTest | External:User | instantiation | new User() |
| ApexClass:AuditLogServiceTest | External:Profile | type-reference | Profile |
| ApexClass:AuditLogServiceTest | External:User | type-reference | User |
| ApexClass:AuditLogServiceTest | External:NullPointerException | type-reference | NullPointerException |
| ApexClass:AuditLogServiceTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:BudgetBatch | External:BatchableContext | type-reference | BatchableContext |
| ApexClass:BudgetBatch | External:Database.Batchable<SObject> | implements | implements Database.Batchable<SObject> |
| ApexClass:BudgetBatch | External:Database.Stateful | implements | implements Database.Stateful |
| ApexClass:BudgetControllerTest | External:User | instantiation | new User() |
| ApexClass:BudgetControllerTest | External:Profile | type-reference | Profile |
| ApexClass:BudgetControllerTest | External:User | type-reference | User |
| ApexClass:BudgetControllerTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:BudgetHandler | External:IllegalArgumentException | instantiation | new IllegalArgumentException() |
| ApexClass:BudgetSelector | External:StubProvider | type-reference | StubProvider |
| ApexClass:BudgetSelector | External:Expense_Date__c | type-reference | Expense_Date__c |
| ApexClass:BudgetSelector | External:CreatedDate | type-reference | CreatedDate |
| ApexClass:BudgetSelector | External:Budget__Share | generic-type | <Budget__Share> |
| ApexClass:BudgetSelector | External:Expense_Record__Share | generic-type | <Expense_Record__Share> |
| ApexClass:BudgetSelector | External:Object:Budget__Share | soql-object | SOQL FROM Budget__Share |
| ApexClass:BudgetSelector | External:Object:Expense_Record__Share | soql-object | SOQL FROM Expense_Record__Share |
| ApexClass:BudgetSelector | External:Object:Expense_Records__r | soql-object | SOQL FROM Expense_Records__r |
| ApexClass:BudgetSelectorTest | External:Budget__Share | generic-type | <Budget__Share> |
| ApexClass:BudgetService | External:Budget__Share | instantiation | new Budget__Share() |
| ApexClass:BudgetService | External:Expense_Record__Share | instantiation | new Expense_Record__Share() |
| ApexClass:BudgetService | External:Budget__Share | type-reference | Budget__Share |
| ApexClass:BudgetService | External:DmlException | type-reference | DmlException |
| ApexClass:BudgetService | External:Expense_Record__Share | type-reference | Expense_Record__Share |
| ApexClass:BudgetService | External:Budget__Share | generic-type | <Budget__Share> |
| ApexClass:BudgetService | External:Expense_Record__Share | generic-type | <Expense_Record__Share> |
| ApexClass:BudgetServiceTest | External:DmlException | type-reference | DmlException |
| ApexClass:BudgetTriggerTest | External:User | instantiation | new User() |
| ApexClass:BudgetTriggerTest | External:Profile | type-reference | Profile |
| ApexClass:BudgetTriggerTest | External:User | type-reference | User |
| ApexClass:BudgetTriggerTest | External:Budget__Share | type-reference | Budget__Share |
| ApexClass:BudgetTriggerTest | External:Budget__Share | generic-type | <Budget__Share> |
| ApexClass:BudgetTriggerTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:BudgetTriggerTest | External:Object:Budget__Share | soql-object | SOQL FROM Budget__Share |
| ApexClass:BuildersTest | External:AssetDetailDTO | type-reference | AssetDetailDTO |
| ApexClass:CacheService | External:Org | method-call | Org.getPartition() |
| ApexClass:CacheService | External:OrgPartition | type-reference | OrgPartition |
| ApexClass:CitizenRequestController | External:ComplaintDTO | instantiation | new ComplaintDTO() |
| ApexClass:CitizenRequestController | External:TimelineEventDTO | instantiation | new TimelineEventDTO() |
| ApexClass:CitizenRequestController | External:PhotoDTO | instantiation | new PhotoDTO() |
| ApexClass:CitizenRequestController | External:DuplicateCheckResult | instantiation | new DuplicateCheckResult() |
| ApexClass:CitizenRequestController | External:DuplicateCandidateDTO | instantiation | new DuplicateCandidateDTO() |
| ApexClass:CitizenRequestController | External:ComplaintDTO | type-reference | ComplaintDTO |
| ApexClass:CitizenRequestController | External:TimelineEventDTO | type-reference | TimelineEventDTO |
| ApexClass:CitizenRequestController | External:PhotoDTO | type-reference | PhotoDTO |
| ApexClass:CitizenRequestController | External:DuplicateCandidateDTO | type-reference | DuplicateCandidateDTO |
| ApexClass:CitizenRequestController | External:TimelineEventDTO | generic-type | <TimelineEventDTO> |
| ApexClass:CitizenRequestController | External:PhotoDTO | generic-type | <PhotoDTO> |
| ApexClass:CitizenRequestController | External:ContentDocumentLink | generic-type | <ContentDocumentLink> |
| ApexClass:CitizenRequestController | External:ContentVersion | generic-type | <ContentVersion> |
| ApexClass:CitizenRequestController | External:DuplicateCandidateDTO | generic-type | <DuplicateCandidateDTO> |
| ApexClass:CitizenRequestControllerTest | External:SelectorMock | instantiation | new SelectorMock() |
| ApexClass:CitizenRequestControllerTest | External:ComplaintDTO | type-reference | ComplaintDTO |
| ApexClass:CitizenRequestControllerTest | External:Object:Mock | soql-object | SOQL FROM Mock |
| ApexClass:CitizenRequestSelector | External:StubProvider | type-reference | StubProvider |
| ApexClass:CitizenRequestSelector | External:ContentDocumentLink | generic-type | <ContentDocumentLink> |
| ApexClass:CitizenRequestSelector | External:Object:ContentDocumentLink | soql-object | SOQL FROM ContentDocumentLink |
| ApexClass:CitizenRequestSelectorTest | External:ContentDocumentLink | generic-type | <ContentDocumentLink> |
| ApexClass:CitizenRequestService | External:Object:Citizen | soql-object | SOQL FROM Citizen |
| ApexClass:ContractorAssignmentSelector | External:StubProvider | type-reference | StubProvider |
| ApexClass:DailyInspectionReminderScheduler | External:SchedulableContext | type-reference | SchedulableContext |
| ApexClass:DailyInspectionReminderScheduler | External:Schedulable | implements | implements Schedulable |
| ApexClass:DailyInspectionReminderSchedulerTest | External:User | instantiation | new User() |
| ApexClass:DailyInspectionReminderSchedulerTest | External:Profile | type-reference | Profile |
| ApexClass:DailyInspectionReminderSchedulerTest | External:User | type-reference | User |
| ApexClass:DailyInspectionReminderSchedulerTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:EngineerAssignmentHelper | External:Skill__c | method-call | Skill__c.split() |
| ApexClass:EngineerAssignmentService | External:Maintenance_Request__Share | instantiation | new Maintenance_Request__Share() |
| ApexClass:EngineerAssignmentService | External:SkillVerificationResult | instantiation | new SkillVerificationResult() |
| ApexClass:EngineerAssignmentService | External:Skill__c | method-call | Skill__c.split() |
| ApexClass:EngineerAssignmentService | External:Skill__c | method-call | Skill__c.contains() |
| ApexClass:EngineerAssignmentService | External:Maintenance_Request__Share | type-reference | Maintenance_Request__Share |
| ApexClass:EngineerAssignmentService | External:SaveResult | type-reference | SaveResult |
| ApexClass:EngineerAssignmentService | External:Maintenance_Request__Share | generic-type | <Maintenance_Request__Share> |
| ApexClass:EngineerAssignmentServiceTest | External:User | instantiation | new User() |
| ApexClass:EngineerAssignmentServiceTest | External:Remarks__c | method-call | Remarks__c.contains() |
| ApexClass:EngineerAssignmentServiceTest | External:Profile | type-reference | Profile |
| ApexClass:EngineerAssignmentServiceTest | External:User | type-reference | User |
| ApexClass:EngineerAssignmentServiceTest | External:Maintenance_Request__Share | generic-type | <Maintenance_Request__Share> |
| ApexClass:EngineerAssignmentServiceTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:EngineerAssignmentServiceTest | External:Object:Maintenance_Request__Share | soql-object | SOQL FROM Maintenance_Request__Share |
| ApexClass:EngineerController | External:AssignmentDetail | generic-type | <AssignmentDetail> |
| ApexClass:EngineerController | External:EngineerWrapper | generic-type | <EngineerWrapper> |
| ApexClass:EngineerController | External:ZoneOption | generic-type | <ZoneOption> |
| ApexClass:EngineerControllerTest | External:UserRole | instantiation | new UserRole() |
| ApexClass:EngineerControllerTest | External:User | instantiation | new User() |
| ApexClass:EngineerControllerTest | External:DashboardData | type-reference | DashboardData |
| ApexClass:EngineerControllerTest | External:User | type-reference | User |
| ApexClass:EngineerControllerTest | External:Profile | type-reference | Profile |
| ApexClass:EngineerControllerTest | External:UserRole | type-reference | UserRole |
| ApexClass:EngineerControllerTest | External:Profile | generic-type | <Profile> |
| ApexClass:EngineerControllerTest | External:UserRole | generic-type | <UserRole> |
| ApexClass:EngineerControllerTest | External:Object:User | soql-object | SOQL FROM User |
| ApexClass:EngineerControllerTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:EngineerControllerTest | External:Object:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:EngineerSelector | External:StubProvider | type-reference | StubProvider |
| ApexClass:EngineerSelector | External:Object:Maintenance_Requests__r | soql-object | SOQL FROM Maintenance_Requests__r |
| ApexClass:EngineerService | External:Maintenance_Requests__r | method-call | Maintenance_Requests__r.size() |
| ApexClass:EngineerService | External:DashboardData | type-reference | DashboardData |
| ApexClass:EngineerService | External:ZoneOption | type-reference | ZoneOption |
| ApexClass:EngineerService | External:EngineerWrapper | type-reference | EngineerWrapper |
| ApexClass:EngineerService | External:AssignmentDetail | type-reference | AssignmentDetail |
| ApexClass:EngineerService | External:Profile | generic-type | <Profile> |
| ApexClass:EngineerService | External:UserRole | generic-type | <UserRole> |
| ApexClass:ExpenseSelector | External:StubProvider | type-reference | StubProvider |
| ApexClass:ExpenseSelector | External:Expense_Date__c | type-reference | Expense_Date__c |
| ApexClass:ExpenseTriggerHandlerTest | External:DmlException | type-reference | DmlException |
| ApexClass:ExternalIntegrationService | External:CalloutException | type-reference | CalloutException |
| ApexClass:fflib_SObjectUnitOfWork | External:Savepoint | type-reference | Savepoint |
| ApexClass:FilterBuilder | External:FilterOptionDTO | type-reference | FilterOptionDTO |
| ApexClass:InspectionSelector | External:StubProvider | type-reference | StubProvider |
| ApexClass:InspectionSelector | External:ContentDocumentLink | generic-type | <ContentDocumentLink> |
| ApexClass:InspectionSelector | External:ContentVersion | generic-type | <ContentVersion> |
| ApexClass:InspectionSelector | External:Object:ContentDocumentLink | soql-object | SOQL FROM ContentDocumentLink |
| ApexClass:InspectionSelector | External:Object:ContentVersion | soql-object | SOQL FROM ContentVersion |
| ApexClass:InspectionSelector | External:Object:Inspection_Responses__r | soql-object | SOQL FROM Inspection_Responses__r |
| ApexClass:InspectionService | External:StartInspectionWrapper | instantiation | new StartInspectionWrapper() |
| ApexClass:InspectionService | External:ChecklistQuestionWrapper | instantiation | new ChecklistQuestionWrapper() |
| ApexClass:InspectionService | External:OptionWrapper | instantiation | new OptionWrapper() |
| ApexClass:InspectionService | External:Org | method-call | Org.getPartition() |
| ApexClass:InspectionService | External:SaveResult | type-reference | SaveResult |
| ApexClass:InspectionService | External:StartInspectionWrapper | type-reference | StartInspectionWrapper |
| ApexClass:InspectionService | External:QueryException | type-reference | QueryException |
| ApexClass:InspectionService | External:DmlException | type-reference | DmlException |
| ApexClass:InspectionService | External:ChecklistQuestionWrapper | type-reference | ChecklistQuestionWrapper |
| ApexClass:InspectionService | External:OptionWrapper | type-reference | OptionWrapper |
| ApexClass:InspectionService | External:OrgPartition | type-reference | OrgPartition |
| ApexClass:InspectionService | External:InspectionSubmissionWrapper | type-reference | InspectionSubmissionWrapper |
| ApexClass:InspectionService | External:OptionWrapper | generic-type | <OptionWrapper> |
| ApexClass:InspectionService | External:InspectionResponseWrapper | generic-type | <InspectionResponseWrapper> |
| ApexClass:InspectionService | External:ChecklistQuestionWrapper | generic-type | <ChecklistQuestionWrapper> |
| ApexClass:InspectionServiceTest | External:User | instantiation | new User() |
| ApexClass:InspectionServiceTest | External:ContentVersion | instantiation | new ContentVersion() |
| ApexClass:InspectionServiceTest | External:ContentDocumentLink | instantiation | new ContentDocumentLink() |
| ApexClass:InspectionServiceTest | External:Profile | type-reference | Profile |
| ApexClass:InspectionServiceTest | External:UserRole | type-reference | UserRole |
| ApexClass:InspectionServiceTest | External:User | type-reference | User |
| ApexClass:InspectionServiceTest | External:DmlException | type-reference | DmlException |
| ApexClass:InspectionServiceTest | External:ContentVersion | type-reference | ContentVersion |
| ApexClass:InspectionServiceTest | External:ContentDocumentLink | type-reference | ContentDocumentLink |
| ApexClass:InspectionServiceTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:InspectionServiceTest | External:Object:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:InspectionServiceTest | External:Object:ContentVersion | soql-object | SOQL FROM ContentVersion |
| ApexClass:InspectionTriggerHandlerTest | External:ContentVersion | instantiation | new ContentVersion() |
| ApexClass:InspectionTriggerHandlerTest | External:ContentDocumentLink | instantiation | new ContentDocumentLink() |
| ApexClass:InspectionTriggerHandlerTest | External:ContentVersion | type-reference | ContentVersion |
| ApexClass:InspectionTriggerHandlerTest | External:ContentDocumentLink | type-reference | ContentDocumentLink |
| ApexClass:InspectionTriggerHandlerTest | External:Object:ContentVersion | soql-object | SOQL FROM ContentVersion |
| ApexClass:MaintenanceRequestControllerTest | External:User | instantiation | new User() |
| ApexClass:MaintenanceRequestControllerTest | External:Message__c | method-call | Message__c.contains() |
| ApexClass:MaintenanceRequestControllerTest | External:Profile | type-reference | Profile |
| ApexClass:MaintenanceRequestControllerTest | External:UserRole | type-reference | UserRole |
| ApexClass:MaintenanceRequestControllerTest | External:User | type-reference | User |
| ApexClass:MaintenanceRequestControllerTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:MaintenanceRequestControllerTest | External:Object:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:MaintenanceRequestQueueable | External:QueueableContext | type-reference | QueueableContext |
| ApexClass:MaintenanceRequestQueueable | External:Queueable | implements | implements Queueable |
| ApexClass:MaintenanceRequestQueueable | External:Database.AllowsCallouts | implements | implements Database.AllowsCallouts |
| ApexClass:MaintenanceRequestSharingService | External:Maintenance_Request__Share | instantiation | new Maintenance_Request__Share() |
| ApexClass:MaintenanceRequestSharingService | External:Maintenance_Request__Share | type-reference | Maintenance_Request__Share |
| ApexClass:MaintenanceRequestSharingService | External:Maintenance_Request__Share | generic-type | <Maintenance_Request__Share> |
| ApexClass:MaintenanceRequestSharingServiceTest | External:Maintenance_Request__Share | generic-type | <Maintenance_Request__Share> |
| ApexClass:MaintenanceRequestSharingServiceTest | External:Object:Maintenance_Request__Share | soql-object | SOQL FROM Maintenance_Request__Share |
| ApexClass:MaintenanceRequestTriggerHandlerTest | External:User | instantiation | new User() |
| ApexClass:MaintenanceRequestTriggerHandlerTest | External:User | type-reference | User |
| ApexClass:MaintenanceRequestTriggerHandlerTest | External:Profile | type-reference | Profile |
| ApexClass:MaintenanceRequestTriggerHandlerTest | External:Maintenance_Request__Share | generic-type | <Maintenance_Request__Share> |
| ApexClass:MaintenanceRequestTriggerHandlerTest | External:User | generic-type | <User> |
| ApexClass:MaintenanceRequestTriggerHandlerTest | External:Object:User | soql-object | SOQL FROM User |
| ApexClass:MaintenanceRequestTriggerHandlerTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:MaintenanceRequestTriggerHandlerTest | External:Object:Maintenance_Request__Share | soql-object | SOQL FROM Maintenance_Request__Share |
| ApexClass:MaintenanceSelector | External:StubProvider | type-reference | StubProvider |
| ApexClass:MaintenanceServiceTest | External:User | instantiation | new User() |
| ApexClass:MaintenanceServiceTest | External:Profile | type-reference | Profile |
| ApexClass:MaintenanceServiceTest | External:UserRole | type-reference | UserRole |
| ApexClass:MaintenanceServiceTest | External:User | type-reference | User |
| ApexClass:MaintenanceServiceTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:MaintenanceServiceTest | External:Object:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:ManagementApprovalServiceTest | External:Request | type-reference | Request |
| ApexClass:ManagementAssignmentServiceTest | External:User | instantiation | new User() |
| ApexClass:ManagementAssignmentServiceTest | External:User | type-reference | User |
| ApexClass:ManagementAssignmentServiceTest | External:Profile | type-reference | Profile |
| ApexClass:ManagementAssignmentServiceTest | External:Object:User | soql-object | SOQL FROM User |
| ApexClass:ManagementAssignmentServiceTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:ManagementEscalationServiceTest | External:Message__c | method-call | Message__c.contains() |
| ApexClass:ManagementNotificationService | External:DmlException | type-reference | DmlException |
| ApexClass:ManagementNotificationServiceTest | External:User | instantiation | new User() |
| ApexClass:ManagementNotificationServiceTest | External:User | type-reference | User |
| ApexClass:ManagementNotificationServiceTest | External:Profile | type-reference | Profile |
| ApexClass:ManagementNotificationServiceTest | External:Object:User | soql-object | SOQL FROM User |
| ApexClass:ManagementNotificationServiceTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:ManagementWorkflowHandlerTest | External:User | instantiation | new User() |
| ApexClass:ManagementWorkflowHandlerTest | External:Profile | type-reference | Profile |
| ApexClass:ManagementWorkflowHandlerTest | External:User | type-reference | User |
| ApexClass:ManagementWorkflowHandlerTest | External:Object:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:ManagementWorkflowHandlerTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:MapBuilder | External:HealthMapMarkerDTO | type-reference | HealthMapMarkerDTO |
| ApexClass:MapBuilder | External:AssetMapMarkerDTO | type-reference | AssetMapMarkerDTO |
| ApexClass:NotificationSecurityTest | External:User | instantiation | new User() |
| ApexClass:NotificationSecurityTest | External:Profile | type-reference | Profile |
| ApexClass:NotificationSecurityTest | External:UserRole | type-reference | UserRole |
| ApexClass:NotificationSecurityTest | External:User | type-reference | User |
| ApexClass:NotificationSecurityTest | External:DmlException | type-reference | DmlException |
| ApexClass:NotificationSecurityTest | External:Updated | type-reference | Updated |
| ApexClass:NotificationSecurityTest | External:User | generic-type | <User> |
| ApexClass:NotificationSecurityTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:NotificationSecurityTest | External:Object:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:NotificationSecurityTriggerTest | External:User | instantiation | new User() |
| ApexClass:NotificationSecurityTriggerTest | External:Profile | type-reference | Profile |
| ApexClass:NotificationSecurityTriggerTest | External:UserRole | type-reference | UserRole |
| ApexClass:NotificationSecurityTriggerTest | External:User | type-reference | User |
| ApexClass:NotificationSecurityTriggerTest | External:DmlException | type-reference | DmlException |
| ApexClass:NotificationSecurityTriggerTest | External:User | generic-type | <User> |
| ApexClass:NotificationSecurityTriggerTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:NotificationSecurityTriggerTest | External:Object:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:NotificationSelector | External:Notification__Share | generic-type | <Notification__Share> |
| ApexClass:NotificationSelector | External:Object:Notification__Share | soql-object | SOQL FROM Notification__Share |
| ApexClass:NotificationService | External:EmailException | type-reference | EmailException |
| ApexClass:NotificationSharingService | External:Notification__Share | instantiation | new Notification__Share() |
| ApexClass:NotificationSharingService | External:Notification__Share | type-reference | Notification__Share |
| ApexClass:NotificationSharingService | External:Notification__Share | generic-type | <Notification__Share> |
| ApexClass:NotificationSharingServiceTest | External:User | instantiation | new User() |
| ApexClass:NotificationSharingServiceTest | External:Profile | type-reference | Profile |
| ApexClass:NotificationSharingServiceTest | External:UserRole | type-reference | UserRole |
| ApexClass:NotificationSharingServiceTest | External:User | type-reference | User |
| ApexClass:NotificationSharingServiceTest | External:Notification__Share | type-reference | Notification__Share |
| ApexClass:NotificationSharingServiceTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:NotificationSharingServiceTest | External:Object:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:NotificationSharingServiceTest | External:Object:Notification__Share | soql-object | SOQL FROM Notification__Share |
| ApexClass:NotificationSharingTriggerTest | External:User | instantiation | new User() |
| ApexClass:NotificationSharingTriggerTest | External:Profile | type-reference | Profile |
| ApexClass:NotificationSharingTriggerTest | External:UserRole | type-reference | UserRole |
| ApexClass:NotificationSharingTriggerTest | External:User | type-reference | User |
| ApexClass:NotificationSharingTriggerTest | External:User | generic-type | <User> |
| ApexClass:NotificationSharingTriggerTest | External:Notification__Share | generic-type | <Notification__Share> |
| ApexClass:NotificationSharingTriggerTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:NotificationSharingTriggerTest | External:Object:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:NotificationSharingTriggerTest | External:Object:Notification__Share | soql-object | SOQL FROM Notification__Share |
| ApexClass:OperationsHeadDashboardController | External:CityKpis | instantiation | new CityKpis() |
| ApexClass:OperationsHeadDashboardController | External:CityKpis | type-reference | CityKpis |
| ApexClass:OperationsHeadDashboardControllerTest | External:User | instantiation | new User() |
| ApexClass:OperationsHeadDashboardControllerTest | External:CityKpis | type-reference | CityKpis |
| ApexClass:OperationsHeadDashboardControllerTest | External:Profile | type-reference | Profile |
| ApexClass:OperationsHeadDashboardControllerTest | External:User | type-reference | User |
| ApexClass:OperationsHeadDashboardControllerTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:SendSMSQueueable | External:QueueableContext | type-reference | QueueableContext |
| ApexClass:SendSMSQueueable | External:Queueable | implements | implements Queueable |
| ApexClass:SendSMSQueueable | External:Database.AllowsCallouts | implements | implements Database.AllowsCallouts |
| ApexClass:SendSMSQueueableTest | External:User | instantiation | new User() |
| ApexClass:SendSMSQueueableTest | External:Message__c | method-call | Message__c.contains() |
| ApexClass:SendSMSQueueableTest | External:Profile | type-reference | Profile |
| ApexClass:SendSMSQueueableTest | External:UserRole | type-reference | UserRole |
| ApexClass:SendSMSQueueableTest | External:User | type-reference | User |
| ApexClass:SendSMSQueueableTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:SendSMSQueueableTest | External:Object:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:SLABatch | External:BatchableContext | type-reference | BatchableContext |
| ApexClass:SLABatch | External:Database.Batchable<SObject> | implements | implements Database.Batchable<SObject> |
| ApexClass:SLABatch | External:Database.Stateful | implements | implements Database.Stateful |
| ApexClass:SLABatchTest | External:User | instantiation | new User() |
| ApexClass:SLABatchTest | External:Message__c | method-call | Message__c.contains() |
| ApexClass:SLABatchTest | External:Profile | type-reference | Profile |
| ApexClass:SLABatchTest | External:User | type-reference | User |
| ApexClass:SLABatchTest | External:CronTrigger | type-reference | CronTrigger |
| ApexClass:SLABatchTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:SLABatchTest | External:Object:CronTrigger | soql-object | SOQL FROM CronTrigger |
| ApexClass:SLABatchTest | External:Object:SLA | soql-object | SOQL FROM SLA |
| ApexClass:SLAScheduler | External:SchedulableContext | type-reference | SchedulableContext |
| ApexClass:SLAScheduler | External:Schedulable | implements | implements Schedulable |
| ApexClass:SLASchedulerTest | External:User | instantiation | new User() |
| ApexClass:SLASchedulerTest | External:Profile | type-reference | Profile |
| ApexClass:SLASchedulerTest | External:UserRole | type-reference | UserRole |
| ApexClass:SLASchedulerTest | External:User | type-reference | User |
| ApexClass:SLASchedulerTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:SLASchedulerTest | External:Object:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:SLAServiceTest | External:User | instantiation | new User() |
| ApexClass:SLAServiceTest | External:Profile | type-reference | Profile |
| ApexClass:SLAServiceTest | External:UserRole | type-reference | UserRole |
| ApexClass:SLAServiceTest | External:User | type-reference | User |
| ApexClass:SLAServiceTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:SLAServiceTest | External:Object:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:TelemetryBatchTriggerHandler | External:Object:event | soql-object | SOQL FROM event |
| ApexClass:TelemetryBatchTriggerTest | External:Message__c | method-call | Message__c.contains() |
| ApexClass:TimelineBuilder | External:CreatedDate | method-call | CreatedDate.date() |
| ApexClass:TimelineBuilder | External:TimelineEventDTO | type-reference | TimelineEventDTO |
| ApexClass:TimelineControllerTest | External:User | instantiation | new User() |
| ApexClass:TimelineControllerTest | External:Profile | type-reference | Profile |
| ApexClass:TimelineControllerTest | External:UserRole | type-reference | UserRole |
| ApexClass:TimelineControllerTest | External:User | type-reference | User |
| ApexClass:TimelineControllerTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:TimelineControllerTest | External:Object:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:UserContext | External:ZoneAccessContext | instantiation | new ZoneAccessContext() |
| ApexClass:UserContext | External:UserAuthorizationContext | instantiation | new UserAuthorizationContext() |
| ApexClass:UserContext | External:UserSessionContext | instantiation | new UserSessionContext() |
| ApexClass:UserContext | External:User | type-reference | User |
| ApexClass:UserContextResolver | External:User | type-reference | User |
| ApexClass:UserContextResolverTest | External:User | instantiation | new User() |
| ApexClass:UserContextResolverTest | External:Profile | type-reference | Profile |
| ApexClass:UserContextResolverTest | External:UserRole | type-reference | UserRole |
| ApexClass:UserContextResolverTest | External:User | type-reference | User |
| ApexClass:UserContextResolverTest | External:UserRole | generic-type | <UserRole> |
| ApexClass:UserContextResolverTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:UserContextResolverTest | External:Object:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:UserSelector | External:Profile | generic-type | <Profile> |
| ApexClass:UserSelector | External:UserRole | generic-type | <UserRole> |
| ApexClass:UserSelector | External:User | generic-type | <User> |
| ApexClass:UserSelector | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:UserSelector | External:Object:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:UserSelector | External:Object:User | soql-object | SOQL FROM User |
| ApexClass:VendorAssignmentControllerTest | External:User | instantiation | new User() |
| ApexClass:VendorAssignmentControllerTest | External:Phase | type-reference | Phase |
| ApexClass:VendorAssignmentControllerTest | External:Street | type-reference | Street |
| ApexClass:VendorAssignmentControllerTest | External:Profile | type-reference | Profile |
| ApexClass:VendorAssignmentControllerTest | External:User | type-reference | User |
| ApexClass:VendorAssignmentControllerTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:VendorPerformanceController | External:VendorPerformanceWrapper | instantiation | new VendorPerformanceWrapper() |
| ApexClass:VendorPerformanceController | External:Assigned_Date__c | method-call | Assigned_Date__c.daysBetween() |
| ApexClass:VendorPerformanceController | External:VendorPerformanceWrapper | type-reference | VendorPerformanceWrapper |
| ApexClass:VendorPerformanceController | External:VendorPerformanceWrapper | generic-type | <VendorPerformanceWrapper> |
| ApexClass:VendorPerformanceControllerTest | External:User | instantiation | new User() |
| ApexClass:VendorPerformanceControllerTest | External:Profile | type-reference | Profile |
| ApexClass:VendorPerformanceControllerTest | External:User | type-reference | User |
| ApexClass:VendorPerformanceControllerTest | External:VendorPerformanceWrapper | type-reference | VendorPerformanceWrapper |
| ApexClass:VendorPerformanceControllerTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:VendorSelector | External:StubProvider | type-reference | StubProvider |
| ApexClass:VendorSelector | External:Object:Contractor_Assignments__r | soql-object | SOQL FROM Contractor_Assignments__r |
| ApexClass:WeatherIntegrationService | External:CalloutException | type-reference | CalloutException |
| ApexClass:WeatherUpdateScheduler | External:SchedulableContext | type-reference | SchedulableContext |
| ApexClass:WeatherUpdateScheduler | External:Schedulable | implements | implements Schedulable |
| ApexClass:ZoneDashboardController | External:ZoneKpis | instantiation | new ZoneKpis() |
| ApexClass:ZoneDashboardController | External:ZoneKpis | type-reference | ZoneKpis |
| ApexClass:ZoneDashboardControllerTest | External:User | instantiation | new User() |
| ApexClass:ZoneDashboardControllerTest | External:Profile | type-reference | Profile |
| ApexClass:ZoneDashboardControllerTest | External:UserRole | type-reference | UserRole |
| ApexClass:ZoneDashboardControllerTest | External:User | type-reference | User |
| ApexClass:ZoneDashboardControllerTest | External:ZoneKpis | type-reference | ZoneKpis |
| ApexClass:ZoneDashboardControllerTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:ZoneDashboardControllerTest | External:Object:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:ZoneManagerTriggerTest | External:User | instantiation | new User() |
| ApexClass:ZoneManagerTriggerTest | External:Profile | type-reference | Profile |
| ApexClass:ZoneManagerTriggerTest | External:User | type-reference | User |
| ApexClass:ZoneManagerTriggerTest | External:Object:Profile | soql-object | SOQL FROM Profile |
| ApexClass:ZoneSelector | External:StubProvider | type-reference | StubProvider |
| ApexClass:ZoneUtil | External:UserZoneDTO | instantiation | new UserZoneDTO() |
| ApexClass:ZoneUtil | External:Status__c | method-call | Status__c.getDescribe() |
| ApexClass:ZoneUtil | External:UserZoneDTO | type-reference | UserZoneDTO |
| ApexClass:ZoneUtil | External:User | generic-type | <User> |
| ApexClass:ZoneUtilTest | External:User | instantiation | new User() |
| ApexClass:ZoneUtilTest | External:Profile | type-reference | Profile |
| ApexClass:ZoneUtilTest | External:User | type-reference | User |
| ApexClass:ZoneUtilTest | External:UserZoneDTO | type-reference | UserZoneDTO |
| ApexClass:ZoneUtilTest | External:Object:Profile | soql-object | SOQL FROM Profile |
