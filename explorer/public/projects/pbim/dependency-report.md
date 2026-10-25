# Salesforce Dependency Report

## LWC → Apex

| LWC | Apex | Method |
|---|---|---|
| LWC:approval-flow | ApexClass:ApprovalFlowController | getPendingRequests |
| LWC:approval-flow | ApexClass:ApprovalFlowController | approveRequest |
| LWC:approval-flow | ApexClass:ApprovalFlowController | rejectRequest |
| LWC:asset-dashboard-container | ApexClass:AssetDashboardController | getDashboardData |
| LWC:asset-detail-dashboard | ApexClass:AssetDashboardController | getDashboardData |
| LWC:asset-health-map | ApexClass:AssetDashboardController | getDashboardData |
| LWC:asset-history | ApexClass:AssetDashboardController | getDashboardData |
| LWC:asset-management-dashboard | ApexClass:AssetExplorerController | loadDashboard |
| LWC:asset-management-dashboard | ApexClass:AssetExplorerController | loadAssetsChunk |
| LWC:budget-utilization-summary | ApexClass:BudgetController | getBudgetSummary |
| LWC:budget-utilization-summary | ApexClass:BudgetController | getAllBudgets |
| LWC:budget-utilization-summary | ApexClass:BudgetController | getExpenseRecords |
| LWC:citizen-complaint-list | ApexClass:CitizenRequestController | getMyComplaints |
| LWC:citizen-complaint-tracker | ApexClass:CitizenRequestController | trackComplaint |
| LWC:citizen-complaint-tracker | ApexClass:CitizenRequestController | getComplaintDetailsById |
| LWC:citizen-complaint-tracker | ApexClass:CitizenRequestController | getComplaintFiles |
| LWC:citizen-complaint-tracker | ApexClass:CitizenRequestController | isUserLoggedIn |
| LWC:citizen-report-portal | ApexClass:CityZoneController | getCityZones |
| LWC:citizen-report-portal | ApexClass:CitizenRequestController | checkDuplicateIssues |
| LWC:dynamic-inspection-form | ApexClass:InspectionService | getChecklistQuestions |
| LWC:dynamic-inspection-form | ApexClass:InspectionService | submitInspection |
| LWC:dynamic-inspection-form | ApexClass:InspectionService | startInspection |
| LWC:engineer-workload-dashboard | ApexClass:EngineerController | getEngineerWorkload |
| LWC:engineer-workload-dashboard | ApexClass:EngineerAssignmentService | reassignRequest |
| LWC:maintenance-request-kanban | ApexClass:MaintenanceRequestController | getAllRequests |
| LWC:maintenance-request-kanban | ApexClass:MaintenanceRequestController | updateRequestStatus |
| LWC:notification-center | ApexClass:NotificationCenterController | getRecentAlerts |
| LWC:vendor-assignment-panel | ApexClass:VendorAssignmentController | getActiveVendors |
| LWC:vendor-assignment-panel | ApexClass:VendorAssignmentController | assignVendorWithEstimate |
| LWC:vendor-assignment-panel | ApexClass:VendorAssignmentController | getAssignmentByRequest |
| LWC:vendor-assignment-panel | ApexClass:VendorAssignmentController | acceptAssignment |
| LWC:vendor-assignment-panel | ApexClass:VendorAssignmentController | rejectAssignment |
| LWC:vendor-assignment-panel | ApexClass:VendorAssignmentController | completeAssignmentWithCost |
| LWC:vendor-assignment-panel | ApexClass:MaintenanceRequestController | verifyAndResolveRequest |
| LWC:vendor-assignment-panel | ApexClass:BudgetController | getAllBudgets |
| LWC:vendor-history-modal | ApexClass:VendorPerformanceController | getVendorHistory |
| LWC:vendor-workspace | ApexClass:MaintenanceRequestController | getAllRequests |
| LWC:vendor-workspace | ApexClass:VendorAssignmentController | getActiveVendors |
| LWC:vendor-workspace | ApexClass:VendorAssignmentController | assignVendorWithEstimate |
| LWC:vendor-workspace | ApexClass:ExpenseController | createExpenseRecord |
| LWC:vendor-workspace | ApexClass:VendorAssignmentController | completeAssignment |
| LWC:vendor-workspace | ApexClass:VendorAssignmentController | getPendingAssignmentsForVendor |
| LWC:zone-dashboard | ApexClass:ZoneDashboardController | getZoneKpis |
| LWC:zone-dashboard | ApexClass:ZoneUtil | getUserZoneData |
| LWC:zone-dashboard | ApexClass:CityZoneController | getCityZones |
| LWC:zone-manager-dashboard | ApexClass:ManagementDashboardController | getDashboardData |
| LWC:zone-manager-dashboard | ApexClass:CityZoneController | getCityZones |
| LWC:zone-manager-dashboard | ApexClass:ZoneUtil | getUserZoneId |
| LWC:zone-manager-dashboard | ApexClass:ManagementDashboardController | getPrioritySlaBreaches |
| LWC:zone-manager-dashboard | ApexClass:ManagementDashboardController | getPendingEstimateApprovals |
| LWC:zone-manager-dashboard | ApexClass:ManagementDashboardController | getOpenCitizenIntake |

## LWC → LWC

| Parent | Child | Type |
|---|---|---|
| LWC:asset-dashboard-container | LWC:asset-detail-dashboard | lwc-template-child |
| LWC:asset-dashboard-container | LWC:asset-health-map | lwc-template-child |
| LWC:asset-dashboard-container | LWC:asset-history | lwc-template-child |
| LWC:asset-detail-dashboard | LWC:asset-kpi-card | lwc-template-child |
| LWC:asset-management-dashboard | LWC:kpi-cards | lwc-template-child |
| LWC:asset-management-dashboard | LWC:filter-panel | lwc-template-child |
| LWC:asset-management-dashboard | LWC:asset-charts | lwc-template-child |
| LWC:asset-management-dashboard | LWC:asset-list | lwc-template-child |
| LWC:asset-management-dashboard | LWC:asset-map | lwc-template-child |
| LWC:asset-management-dashboard | LWC:asset-preview-panel | lwc-template-child |
| LWC:asset-preview-panel | LWC:asset-kpi-card | lwc-template-child |
| LWC:citizen-complaint-list | LWC:citizen-complaint-tracker | lwc-template-child |
| LWC:citizen-complaint-tracker | LWC:sla-countdown-timer | lwc-template-child |
| LWC:citizen-complaint-tracker | LWC:maintenance-timeline | lwc-template-child |
| LWC:vendor-assignment-panel | LWC:vendor-card | lwc-template-child |
| LWC:vendor-assignment-panel | LWC:vendor-history-modal | lwc-template-child |
| LWC:vendor-workspace | LWC:vendor-card | lwc-template-child |
| LWC:vendor-workspace | LWC:vendor-history-modal | lwc-template-child |
| LWC:zone-manager-dashboard | LWC:zone-dashboard | lwc-template-child |

## Apex → Apex

| From | To | Type | Method |
|---|---|---|---|
| ApexClass:ApprovalFlowController | ApexClass:ManagementApprovalService | method-call | getPendingRequests -> getPendingRequests |
| ApexClass:ApprovalFlowController | ApexClass:ManagementApprovalService | method-call | approveRequest -> processApprovalAction |
| ApexClass:ApprovalFlowController | CustomObject:Maintenance_Request__c | generic-type |  |
| ApexClass:ApprovalFlowControllerTest | CustomObject:Maintenance_Request__c | instantiation |  |
| ApexClass:ApprovalFlowControllerTest | External:MaintenanceSelectorMock | instantiation |  |
| ApexClass:ApprovalFlowControllerTest | ApexClass:TestDataFactory | method-call | testGetPendingRequestsMocked -> createCityZone |
| ApexClass:ApprovalFlowControllerTest | ApexClass:TestDataFactory | method-call | testGetPendingRequestsMocked -> createInfrastructureAsset |
| ApexClass:ApprovalFlowControllerTest | ApexClass:TestDataFactory | method-call | testGetPendingRequestsMocked -> createMaintenanceRequest |
| ApexClass:ApprovalFlowControllerTest | ApexClass:ApprovalFlowController | method-call | testGetPendingRequestsMocked -> getPendingRequests |
| ApexClass:ApprovalFlowControllerTest | ApexClass:MaintenanceSelector | method-call | testApproveRequestMocked -> setMock |
| ApexClass:ApprovalFlowControllerTest | ApexClass:ApprovalFlowController | method-call | testApproveRequestMocked -> approveRequest |
| ApexClass:ApprovalFlowControllerTest | ApexClass:ApprovalFlowController | method-call | testRejectRequestMocked -> rejectRequest |
| ApexClass:ApprovalFlowControllerTest | CustomObject:City_Zone__c | type-reference | testGetPendingRequestsMocked |
| ApexClass:ApprovalFlowControllerTest | CustomObject:Infrastructure_Asset__c | type-reference | testGetPendingRequestsMocked |
| ApexClass:ApprovalFlowControllerTest | CustomObject:Maintenance_Request__c | type-reference |  |
| ApexClass:ApprovalFlowControllerTest | CustomObject:Maintenance_Request__c | generic-type |  |
| ApexClass:ApprovalFlowControllerTest | ApexClass:TestDataFactory | test-reference |  |
| ApexClass:ApprovalFlowControllerTest | ApexClass:ApprovalFlowController | test-reference |  |
| ApexClass:ApprovalFlowControllerTest | ApexClass:MaintenanceSelector | test-reference |  |
| ApexClass:AssetDashboardController | ApexClass:AssetDashboardService | instantiation | getDashboardData |
| ApexClass:AssetDashboardController | ApexClass:AssetDashboardService | type-reference | getDashboardData |
| ApexClass:AssetDashboardControllerTest | CustomObject:Infrastructure_Asset__c | instantiation |  |
| ApexClass:AssetDashboardControllerTest | External:AssetSelectorMock | instantiation |  |
| ApexClass:AssetDashboardControllerTest | ApexClass:AssetSelector | method-call | testGetDashboardDataMocked -> setMock |
| ApexClass:AssetDashboardControllerTest | ApexClass:AssetDashboardController | method-call | testGetDashboardDataMocked -> getDashboardData |
| ApexClass:AssetDashboardControllerTest | CustomObject:Infrastructure_Asset__c | type-reference |  |
| ApexClass:AssetDashboardControllerTest | External:DashboardResponse | type-reference | testGetDashboardDataMocked |
| ApexClass:AssetDashboardControllerTest | CustomObject:Infrastructure_Asset__c | generic-type | handleMethodCall |
| ApexClass:AssetDashboardControllerTest | ApexClass:AssetSelector | test-reference |  |
| ApexClass:AssetDashboardControllerTest | ApexClass:AssetDTOs | test-reference |  |
| ApexClass:AssetDashboardControllerTest | ApexClass:AssetDashboardController | test-reference |  |
| ApexClass:AssetDashboardSelectorTest | CustomObject:City_Zone__c | instantiation | testSelectorMethods |
| ApexClass:AssetDashboardSelectorTest | CustomObject:Infrastructure_Asset__c | instantiation | testSelectorMethods |
| ApexClass:AssetDashboardSelectorTest | CustomObject:Maintenance_Request__c | instantiation | testSelectorMethods |
| ApexClass:AssetDashboardSelectorTest | CustomObject:Inspection__c | instantiation | testSelectorMethods |
| ApexClass:AssetDashboardSelectorTest | CustomObject:Budget__c | instantiation | testSelectorMethods |
| ApexClass:AssetDashboardSelectorTest | CustomObject:Expense_Record__c | instantiation | testSelectorMethods |
| ApexClass:AssetDashboardSelectorTest | ApexClass:AssetSelector | method-call | testSelectorMethods -> getAsset |
| ApexClass:AssetDashboardSelectorTest | ApexClass:AssetSelector | method-call | testSelectorMethods -> getMaintenanceRequests |
| ApexClass:AssetDashboardSelectorTest | ApexClass:AssetSelector | method-call | testSelectorMethods -> getInspections |
| ApexClass:AssetDashboardSelectorTest | ApexClass:AssetSelector | method-call | testSelectorMethods -> getExpenseRecords |
| ApexClass:AssetDashboardSelectorTest | ApexClass:AssetSelector | method-call | testSelectorMethods -> getLastCompletedInspection |
| ApexClass:AssetDashboardSelectorTest | ApexClass:AssetSelector | method-call | testSelectorMethods -> getHealthMapAssets |
| ApexClass:AssetDashboardSelectorTest | CustomObject:City_Zone__c | type-reference | testSelectorMethods |
| ApexClass:AssetDashboardSelectorTest | CustomObject:Infrastructure_Asset__c | type-reference | testSelectorMethods |
| ApexClass:AssetDashboardSelectorTest | CustomObject:Maintenance_Request__c | type-reference | testSelectorMethods |
| ApexClass:AssetDashboardSelectorTest | CustomObject:Inspection__c | type-reference | testSelectorMethods |
| ApexClass:AssetDashboardSelectorTest | CustomObject:Budget__c | type-reference | testSelectorMethods |
| ApexClass:AssetDashboardSelectorTest | CustomObject:Expense_Record__c | type-reference | testSelectorMethods |
| ApexClass:AssetDashboardSelectorTest | CustomObject:Maintenance_Request__c | generic-type | testSelectorMethods |
| ApexClass:AssetDashboardSelectorTest | CustomObject:Inspection__c | generic-type | testSelectorMethods |
| ApexClass:AssetDashboardSelectorTest | CustomObject:Expense_Record__c | generic-type | testSelectorMethods |
| ApexClass:AssetDashboardSelectorTest | CustomObject:Infrastructure_Asset__c | generic-type | testSelectorMethods |
| ApexClass:AssetDashboardSelectorTest | ApexClass:AssetSelector | test-reference |  |
| ApexClass:AssetDashboardService | ApexClass:DashboardContext | instantiation |  |
| ApexClass:AssetDashboardService | ApexClass:AssetSelector | method-call | getAssetDetail -> getAssetsWithDetails |
| ApexClass:AssetDashboardService | ApexClass:AssetDTOs | method-call | getDashboardData -> DashboardResponse |
| ApexClass:AssetDashboardService | ApexClass:AssetSummaryBuilder | method-call | getDashboardData -> build |
| ApexClass:AssetDashboardService | ApexClass:TimelineBuilder | method-call | getDashboardData -> build |
| ApexClass:AssetDashboardService | ApexClass:MapBuilder | method-call | getDashboardData -> buildHealthMapMarkers |
| ApexClass:AssetDashboardService | ApexClass:HealthScoreCalculator | method-call | calculateHealthScore -> calculateHealthScore |
| ApexClass:AssetDashboardService | ApexClass:DashboardContext | type-reference |  |
| ApexClass:AssetDashboardService | External:DashboardResponse | type-reference |  |
| ApexClass:AssetDashboardService | CustomObject:Infrastructure_Asset__c | generic-type | getAssetDetail |
| ApexClass:AssetDashboardServiceTest | CustomObject:City_Zone__c | instantiation | testServiceDetailedMapping |
| ApexClass:AssetDashboardServiceTest | CustomObject:Infrastructure_Asset__c | instantiation | testServiceDetailedMapping |
| ApexClass:AssetDashboardServiceTest | CustomObject:Maintenance_Request__c | instantiation | testServiceDetailedMapping |
| ApexClass:AssetDashboardServiceTest | CustomObject:Budget__c | instantiation | testServiceDetailedMapping |
| ApexClass:AssetDashboardServiceTest | CustomObject:Expense_Record__c | instantiation | testServiceDetailedMapping |
| ApexClass:AssetDashboardServiceTest | CustomObject:Inspection__c | instantiation | testServiceDetailedMapping |
| ApexClass:AssetDashboardServiceTest | ApexClass:AssetDashboardService | instantiation | testServiceDetailedMapping |
| ApexClass:AssetDashboardServiceTest | CustomObject:City_Zone__c | type-reference | testServiceDetailedMapping |
| ApexClass:AssetDashboardServiceTest | CustomObject:Infrastructure_Asset__c | type-reference | testServiceDetailedMapping |
| ApexClass:AssetDashboardServiceTest | CustomObject:Maintenance_Request__c | type-reference | testServiceDetailedMapping |
| ApexClass:AssetDashboardServiceTest | CustomObject:Budget__c | type-reference | testServiceDetailedMapping |
| ApexClass:AssetDashboardServiceTest | CustomObject:Expense_Record__c | type-reference | testServiceDetailedMapping |
| ApexClass:AssetDashboardServiceTest | CustomObject:Inspection__c | type-reference | testServiceDetailedMapping |
| ApexClass:AssetDashboardServiceTest | ApexClass:AssetDashboardService | type-reference |  |
| ApexClass:AssetDashboardServiceTest | External:DashboardResponse | type-reference | testServiceDetailedMapping |
| ApexClass:AssetDashboardServiceTest | ApexClass:AssetDashboardService | test-reference |  |
| ApexClass:AssetDashboardServiceTest | ApexClass:AssetDTOs | test-reference |  |
| ApexClass:AssetDTOs | External:TimelineEventDTO | type-reference |  |
| ApexClass:AssetDTOs | External:TimelineEventDTO | generic-type |  |
| ApexClass:AssetDTOs | External:HealthMapMarkerDTO | generic-type |  |
| ApexClass:AssetDTOs | External:ComboboxOption | generic-type |  |
| ApexClass:AssetDTOs | External:ChartDataDTO | generic-type |  |
| ApexClass:AssetDTOs | External:KpiItemDTO | generic-type |  |
| ApexClass:AssetDTOs | External:AssetCardDTO | generic-type |  |
| ApexClass:AssetDTOs | External:AssetMapMarkerDTO | generic-type |  |
| ApexClass:AssetDTOs | External:ChartDTO | generic-type |  |
| ApexClass:AssetDTOs | External:FilterOptionDTO | generic-type |  |
| ApexClass:AssetDTOsTest | ApexClass:AssetDTOs | method-call | testAssetDTOsPropertiesAndComparable -> TimelineEventDTO |
| ApexClass:AssetDTOsTest | ApexClass:AssetDTOs | method-call | testAssetDTOsPropertiesAndComparable -> LocationDTO |
| ApexClass:AssetDTOsTest | ApexClass:AssetDTOs | method-call | testAssetDTOsPropertiesAndComparable -> AssetDetailDTO |
| ApexClass:AssetDTOsTest | ApexClass:AssetDTOs | method-call | testAssetDTOsPropertiesAndComparable -> HealthMapMarkerDTO |
| ApexClass:AssetDTOsTest | ApexClass:AssetDTOs | method-call | testAssetDTOsPropertiesAndComparable -> DashboardResponse |
| ApexClass:AssetDTOsTest | ApexClass:AssetDTOs | method-call | testAssetDTOsPropertiesAndComparable -> AssetCardDTO |
| ApexClass:AssetDTOsTest | ApexClass:AssetDTOs | method-call | testAssetDTOsPropertiesAndComparable -> AssetMapMarkerDTO |
| ApexClass:AssetDTOsTest | ApexClass:AssetDTOs | method-call | testAssetDTOsPropertiesAndComparable -> ChartDataDTO |
| ApexClass:AssetDTOsTest | ApexClass:AssetDTOs | method-call | testAssetDTOsPropertiesAndComparable -> ComboboxOption |
| ApexClass:AssetDTOsTest | ApexClass:AssetDTOs | method-call | testAssetDTOsPropertiesAndComparable -> FilterOptionDTO |
| ApexClass:AssetDTOsTest | ApexClass:AssetDTOs | method-call | testAssetDTOsPropertiesAndComparable -> ChartDTO |
| ApexClass:AssetDTOsTest | ApexClass:AssetDTOs | method-call | testAssetDTOsPropertiesAndComparable -> AssetExplorerResponse |
| ApexClass:AssetDTOsTest | External:TimelineEventDTO | type-reference | testAssetDTOsPropertiesAndComparable |
| ApexClass:AssetDTOsTest | External:LocationDTO | type-reference | testAssetDTOsPropertiesAndComparable |
| ApexClass:AssetDTOsTest | External:AssetDetailDTO | type-reference | testAssetDTOsPropertiesAndComparable |
| ApexClass:AssetDTOsTest | External:HealthMapMarkerDTO | type-reference | testAssetDTOsPropertiesAndComparable |
| ApexClass:AssetDTOsTest | External:DashboardResponse | type-reference | testAssetDTOsPropertiesAndComparable |
| ApexClass:AssetDTOsTest | External:AssetCardDTO | type-reference | testAssetDTOsPropertiesAndComparable |
| ApexClass:AssetDTOsTest | External:AssetMapMarkerDTO | type-reference | testAssetDTOsPropertiesAndComparable |
| ApexClass:AssetDTOsTest | External:ChartDataDTO | type-reference | testAssetDTOsPropertiesAndComparable |
| ApexClass:AssetDTOsTest | External:ComboboxOption | type-reference | testAssetDTOsPropertiesAndComparable |
| ApexClass:AssetDTOsTest | External:FilterOptionDTO | type-reference | testAssetDTOsPropertiesAndComparable |
| ApexClass:AssetDTOsTest | External:ChartDTO | type-reference | testAssetDTOsPropertiesAndComparable |
| ApexClass:AssetDTOsTest | External:AssetExplorerResponse | type-reference | testAssetDTOsPropertiesAndComparable |
| ApexClass:AssetDTOsTest | ApexClass:AssetDTOs | test-reference |  |
| ApexClass:AssetExplorerController | ApexClass:AssetExplorerService | method-call | loadDashboard -> getDashboardData |
| ApexClass:AssetExplorerController | ApexClass:AssetExplorerService | method-call | loadAssetsChunk -> loadAssetsChunk |
| ApexClass:AssetExplorerController | ApexClass:ZoneUtil | method-call | getUserContextFilters -> getAccessibleZoneIds |
| ApexClass:AssetExplorerController | ApexClass:ZoneSelector | method-call | getUserContextFilters -> getZonesByIds |
| ApexClass:AssetExplorerController | ApexClass:ZoneUtil | method-call | getFilterOptions -> getAvailableFilterOptions |
| ApexClass:AssetExplorerController | CustomObject:City_Zone__c | generic-type | getUserContextFilters |
| ApexClass:AssetExplorerControllerTest | External:User | instantiation |  |
| ApexClass:AssetExplorerControllerTest | CustomObject:City_Zone__c | instantiation | testControllerDashboardAndChunkSuccess |
| ApexClass:AssetExplorerControllerTest | CustomObject:Infrastructure_Asset__c | instantiation | testControllerDashboardAndChunkSuccess |
| ApexClass:AssetExplorerControllerTest | ApexClass:AssetExplorerController | method-call | testControllerDashboardAndChunkSuccess -> loadDashboard |
| ApexClass:AssetExplorerControllerTest | ApexClass:AssetExplorerController | method-call | testControllerDashboardAndChunkSuccess -> loadAssetsChunk |
| ApexClass:AssetExplorerControllerTest | ApexClass:AssetExplorerController | method-call | testControllerDashboardAndChunkSuccess -> getUserContextFilters |
| ApexClass:AssetExplorerControllerTest | ApexClass:AssetExplorerController | method-call | testControllerDashboardAndChunkSuccess -> getFilterOptions |
| ApexClass:AssetExplorerControllerTest | External:Profile | type-reference | createTestUser |
| ApexClass:AssetExplorerControllerTest | External:User | type-reference |  |
| ApexClass:AssetExplorerControllerTest | CustomObject:City_Zone__c | type-reference | testControllerDashboardAndChunkSuccess |
| ApexClass:AssetExplorerControllerTest | CustomObject:Infrastructure_Asset__c | type-reference | testControllerDashboardAndChunkSuccess |
| ApexClass:AssetExplorerControllerTest | External:AssetExplorerResponse | type-reference | testControllerDashboardAndChunkSuccess |
| ApexClass:AssetExplorerControllerTest | ApexClass:AssetDTOs | test-reference |  |
| ApexClass:AssetExplorerControllerTest | ApexClass:AssetExplorerController | test-reference |  |
| ApexClass:AssetExplorerSelector | ApexClass:AssetSelector | method-call | queryAssets -> queryAssets |
| ApexClass:AssetExplorerSelector | CustomObject:Infrastructure_Asset__c | generic-type |  |
| ApexClass:AssetExplorerSelectorTest | CustomObject:City_Zone__c | instantiation | testQueryAssetsAndDistinctGetters |
| ApexClass:AssetExplorerSelectorTest | CustomObject:Infrastructure_Asset__c | instantiation | testQueryAssetsAndDistinctGetters |
| ApexClass:AssetExplorerSelectorTest | ApexClass:AssetExplorerSelector | method-call | testQueryAssetsAndDistinctGetters -> queryAssets |
| ApexClass:AssetExplorerSelectorTest | ApexClass:AssetExplorerSelector | method-call | testQueryAssetsAndDistinctGetters -> getDistinctAssetTypes |
| ApexClass:AssetExplorerSelectorTest | ApexClass:AssetExplorerSelector | method-call | testQueryAssetsAndDistinctGetters -> getDistinctStatuses |
| ApexClass:AssetExplorerSelectorTest | ApexClass:AssetExplorerSelector | method-call | testQueryAssetsAndDistinctGetters -> getDistinctPriorities |
| ApexClass:AssetExplorerSelectorTest | CustomObject:City_Zone__c | type-reference | testQueryAssetsAndDistinctGetters |
| ApexClass:AssetExplorerSelectorTest | CustomObject:Infrastructure_Asset__c | type-reference | testQueryAssetsAndDistinctGetters |
| ApexClass:AssetExplorerSelectorTest | CustomObject:Infrastructure_Asset__c | generic-type | testQueryAssetsAndDistinctGetters |
| ApexClass:AssetExplorerSelectorTest | ApexClass:AssetExplorerSelector | test-reference |  |
| ApexClass:AssetExplorerService | ApexClass:ZoneUtil | method-call | getDashboardData -> getAccessibleZoneIds |
| ApexClass:AssetExplorerService | ApexClass:AssetSelector | method-call | getDashboardData -> getAssetsByZone |
| ApexClass:AssetExplorerService | ApexClass:AssetDTOs | method-call | getDashboardData -> KpiItemDTO |
| ApexClass:AssetExplorerService | ApexClass:AssetSelector | method-call | getDashboardData -> queryAssets |
| ApexClass:AssetExplorerService | ApexClass:MapBuilder | method-call | getDashboardData -> buildExplorerMapMarkers |
| ApexClass:AssetExplorerService | ApexClass:ChartBuilder | method-call | getDashboardData -> buildStatusCharts |
| ApexClass:AssetExplorerService | ApexClass:ZoneUtil | method-call | getDashboardData -> getAvailableFilterOptions |
| ApexClass:AssetExplorerService | ApexClass:FilterBuilder | method-call | getDashboardData -> buildFilterOptions |
| ApexClass:AssetExplorerService | ApexClass:AssetDTOs | method-call | getDashboardData -> AssetExplorerResponse |
| ApexClass:AssetExplorerService | ApexClass:ExpenseSelector | method-call | loadAssetsChunk -> getBudgetSpentPerAsset |
| ApexClass:AssetExplorerService | ApexClass:AssetDTOs | method-call | loadAssetsChunk -> AssetCardDTO |
| ApexClass:AssetExplorerService | External:KpiItemDTO | type-reference | getDashboardData |
| ApexClass:AssetExplorerService | External:AssetExplorerResponse | type-reference |  |
| ApexClass:AssetExplorerService | External:AssetCardDTO | type-reference | getDashboardData |
| ApexClass:AssetExplorerService | CustomObject:Infrastructure_Asset__c | generic-type | getDashboardData |
| ApexClass:AssetExplorerServiceTest | CustomObject:City_Zone__c | instantiation | setupData |
| ApexClass:AssetExplorerServiceTest | CustomObject:Infrastructure_Asset__c | instantiation | setupData |
| ApexClass:AssetExplorerServiceTest | CustomObject:Maintenance_Request__c | instantiation | setupData |
| ApexClass:AssetExplorerServiceTest | CustomObject:Expense_Record__c | instantiation | setupData |
| ApexClass:AssetExplorerServiceTest | ApexClass:AssetExplorerController | method-call | testLoadDashboard -> loadDashboard |
| ApexClass:AssetExplorerServiceTest | ApexClass:AssetExplorerService | method-call | testLoadDashboard -> getDashboardData |
| ApexClass:AssetExplorerServiceTest | ApexClass:AssetExplorerController | method-call | testLoadAssetsChunk -> loadAssetsChunk |
| ApexClass:AssetExplorerServiceTest | ApexClass:AssetExplorerService | method-call | testLoadAssetsChunk -> loadAssetsChunk |
| ApexClass:AssetExplorerServiceTest | ApexClass:AssetExplorerController | method-call | testGetUserContextFilters -> getUserContextFilters |
| ApexClass:AssetExplorerServiceTest | ApexClass:AssetExplorerSelector | method-call | testSelectorsStaticMethods -> getDistinctAssetTypes |
| ApexClass:AssetExplorerServiceTest | ApexClass:AssetExplorerSelector | method-call | testSelectorsStaticMethods -> getDistinctStatuses |
| ApexClass:AssetExplorerServiceTest | ApexClass:AssetExplorerSelector | method-call | testSelectorsStaticMethods -> getDistinctPriorities |
| ApexClass:AssetExplorerServiceTest | CustomObject:City_Zone__c | type-reference | setupData |
| ApexClass:AssetExplorerServiceTest | CustomObject:Infrastructure_Asset__c | type-reference | setupData |
| ApexClass:AssetExplorerServiceTest | CustomObject:Maintenance_Request__c | type-reference | setupData |
| ApexClass:AssetExplorerServiceTest | CustomObject:Expense_Record__c | type-reference | setupData |
| ApexClass:AssetExplorerServiceTest | External:User | type-reference | testLoadDashboard |
| ApexClass:AssetExplorerServiceTest | External:AssetExplorerResponse | type-reference | testLoadDashboard |
| ApexClass:AssetExplorerServiceTest | CustomObject:Infrastructure_Asset__c | generic-type | setupData |
| ApexClass:AssetExplorerServiceTest | ApexClass:AssetDTOs | test-reference |  |
| ApexClass:AssetExplorerServiceTest | ApexClass:AssetExplorerController | test-reference |  |
| ApexClass:AssetExplorerServiceTest | ApexClass:AssetExplorerService | test-reference |  |
| ApexClass:AssetExplorerServiceTest | ApexClass:AssetExplorerSelector | test-reference |  |
| ApexClass:AssetSelector | ApexClass:TransactionCache | method-call | getAssetById -> get |
| ApexClass:AssetSelector | ApexClass:TransactionCache | method-call | getAssetById -> put |
| ApexClass:AssetSelector | ApexClass:MaintenanceSelector | method-call | getMaintenanceRequests -> getMaintenanceRequestsByAssetId |
| ApexClass:AssetSelector | ApexClass:InspectionSelector | method-call | getInspections -> getInspectionsByAssetId |
| ApexClass:AssetSelector | ApexClass:ExpenseSelector | method-call | getExpenseRecords -> getExpensesByAssetId |
| ApexClass:AssetSelector | ApexClass:InspectionSelector | method-call | getLastCompletedInspection -> getLastCompletedInspection |
| ApexClass:AssetSelector | ApexClass:ExternalIntegrationService | method-call | getHealthMapAssets -> fetchAssetCoordinates |
| ApexClass:AssetSelector | External:StubProvider | type-reference |  |
| ApexClass:AssetSelector | CustomObject:Infrastructure_Asset__c | type-reference |  |
| ApexClass:AssetSelector | External:CreatedDate | type-reference | getAssetById |
| ApexClass:AssetSelector | CustomObject:Infrastructure_Asset__c | generic-type | getAssetById |
| ApexClass:AssetSelector | CustomObject:Maintenance_Request__c | generic-type |  |
| ApexClass:AssetSelector | CustomObject:Inspection__c | generic-type |  |
| ApexClass:AssetSelector | CustomObject:Expense_Record__c | generic-type |  |
| ApexClass:AssetSelectorTest | CustomObject:Expense_Record__c | instantiation | testAssetSelectorQueries |
| ApexClass:AssetSelectorTest | CustomObject:Inspection__c | instantiation | testAssetSelectorQueries |
| ApexClass:AssetSelectorTest | ApexClass:TestDataFactory | method-call | testAssetSelectorQueries -> createCityZone |
| ApexClass:AssetSelectorTest | ApexClass:TestDataFactory | method-call | testAssetSelectorQueries -> createInfrastructureAsset |
| ApexClass:AssetSelectorTest | ApexClass:TestDataFactory | method-call | testAssetSelectorQueries -> createCitizenRequest |
| ApexClass:AssetSelectorTest | ApexClass:TestDataFactory | method-call | testAssetSelectorQueries -> createMaintenanceRequest |
| ApexClass:AssetSelectorTest | ApexClass:TestDataFactory | method-call | testAssetSelectorQueries -> createBudget |
| ApexClass:AssetSelectorTest | ApexClass:AssetSelector | method-call | testAssetSelectorQueries -> getAssetById |
| ApexClass:AssetSelectorTest | ApexClass:AssetSelector | method-call | testAssetSelectorQueries -> getAssetWithRequests |
| ApexClass:AssetSelectorTest | External:Maintenance_Requests__r | method-call | testAssetSelectorQueries -> size |
| ApexClass:AssetSelectorTest | ApexClass:AssetSelector | method-call | testAssetSelectorQueries -> getAssetsForMap |
| ApexClass:AssetSelectorTest | ApexClass:AssetSelector | method-call | testAssetSelectorQueries -> getAssetsByZone |
| ApexClass:AssetSelectorTest | ApexClass:AssetSelector | method-call | testAssetSelectorQueries -> queryAssets |
| ApexClass:AssetSelectorTest | ApexClass:AssetSelector | method-call | testAssetSelectorQueries -> getAssetCountByZone |
| ApexClass:AssetSelectorTest | ApexClass:AssetSelector | method-call | testAssetSelectorQueries -> getTotalAssetCount |
| ApexClass:AssetSelectorTest | ApexClass:AssetSelector | method-call | testAssetSelectorQueries -> getAssetWithAssetTypeLookup |
| ApexClass:AssetSelectorTest | ApexClass:AssetSelector | method-call | testAssetSelectorQueries -> getAssetsWithDetails |
| ApexClass:AssetSelectorTest | ApexClass:AssetSelector | method-call | testAssetSelectorQueries -> getExpensesSummedByAsset |
| ApexClass:AssetSelectorTest | ApexClass:AssetSelector | method-call | testAssetSelectorQueries -> getAsset |
| ApexClass:AssetSelectorTest | ApexClass:AssetSelector | method-call | testAssetSelectorQueries -> getMaintenanceRequests |
| ApexClass:AssetSelectorTest | ApexClass:AssetSelector | method-call | testAssetSelectorQueries -> getInspections |
| ApexClass:AssetSelectorTest | ApexClass:AssetSelector | method-call | testAssetSelectorQueries -> getExpenseRecords |
| ApexClass:AssetSelectorTest | ApexClass:AssetSelector | method-call | testAssetSelectorQueries -> getLastCompletedInspection |
| ApexClass:AssetSelectorTest | CustomObject:City_Zone__c | type-reference | testAssetSelectorQueries |
| ApexClass:AssetSelectorTest | CustomObject:Infrastructure_Asset__c | type-reference | testAssetSelectorQueries |
| ApexClass:AssetSelectorTest | CustomObject:Citizen_Request__c | type-reference | testAssetSelectorQueries |
| ApexClass:AssetSelectorTest | CustomObject:Maintenance_Request__c | type-reference | testAssetSelectorQueries |
| ApexClass:AssetSelectorTest | CustomObject:Budget__c | type-reference | testAssetSelectorQueries |
| ApexClass:AssetSelectorTest | CustomObject:Expense_Record__c | type-reference | testAssetSelectorQueries |
| ApexClass:AssetSelectorTest | CustomObject:Inspection__c | type-reference | testAssetSelectorQueries |
| ApexClass:AssetSelectorTest | CustomObject:Infrastructure_Asset__c | generic-type | testAssetSelectorQueries |
| ApexClass:AssetSelectorTest | CustomObject:Maintenance_Request__c | generic-type | testAssetSelectorQueries |
| ApexClass:AssetSelectorTest | CustomObject:Inspection__c | generic-type | testAssetSelectorQueries |
| ApexClass:AssetSelectorTest | CustomObject:Expense_Record__c | generic-type | testAssetSelectorQueries |
| ApexClass:AssetSelectorTest | ApexClass:TestDataFactory | test-reference |  |
| ApexClass:AssetSelectorTest | ApexClass:AssetSelector | test-reference |  |
| ApexClass:AssetSummaryBuilder | ApexClass:AssetDTOs | method-call | build -> AssetDetailDTO |
| ApexClass:AssetSummaryBuilder | External:CreatedDate | method-call | build -> date |
| ApexClass:AssetSummaryBuilder | ApexClass:DashboardContext | type-reference |  |
| ApexClass:AssetSummaryBuilder | External:AssetDetailDTO | type-reference |  |
| ApexClass:AssetTypeTriggerTest | CustomObject:Asset_Type__c | instantiation | testAssetTypeLifecycle |
| ApexClass:AssetTypeTriggerTest | CustomObject:Asset_Type__c | type-reference | testAssetTypeLifecycle |
| ApexClass:AuditLogSelector | CustomObject:Audit_Log__c | generic-type |  |
| ApexClass:AuditLogService | CustomObject:Infrastructure_Alert__e | instantiation | createAuditLog |
| ApexClass:AuditLogService | CustomObject:Infrastructure_Alert__e | type-reference | createAuditLog |
| ApexClass:AuditLogServiceTest | External:User | instantiation |  |
| ApexClass:AuditLogServiceTest | ApexClass:AuditLogService | method-call | testCreateAuditLog -> createAuditLog |
| ApexClass:AuditLogServiceTest | ApexClass:AuditLogService | method-call | testLogError -> logError |
| ApexClass:AuditLogServiceTest | External:Profile | type-reference | createTestUser |
| ApexClass:AuditLogServiceTest | External:User | type-reference |  |
| ApexClass:AuditLogServiceTest | External:NullPointerException | type-reference | testLogError |
| ApexClass:AuditLogServiceTest | CustomObject:Audit_Log__c | generic-type | testCreateAuditLog |
| ApexClass:AuditLogServiceTest | ApexClass:AuditLogService | test-reference |  |
| ApexClass:BudgetBatch | ApexClass:BudgetService | method-call | execute -> updateBudgetConsumption |
| ApexClass:BudgetBatch | ApexClass:AuditLogService | method-call | finish -> createAuditLog |
| ApexClass:BudgetBatch | External:BatchableContext | type-reference | start |
| ApexClass:BudgetBatch | CustomObject:Budget__c | generic-type | execute |
| ApexClass:BudgetBatch | External:Database.Batchable<SObject> | implements |  |
| ApexClass:BudgetBatch | External:Database.Stateful | implements |  |
| ApexClass:BudgetBatchTest | CustomObject:Budget__c | instantiation | testBudgetBatchRun |
| ApexClass:BudgetBatchTest | ApexClass:BudgetBatch | instantiation | testBudgetBatchRun |
| ApexClass:BudgetBatchTest | CustomObject:Budget__c | type-reference | testBudgetBatchRun |
| ApexClass:BudgetBatchTest | ApexClass:BudgetBatch | type-reference |  |
| ApexClass:BudgetBatchTest | ApexClass:BudgetBatch | test-reference |  |
| ApexClass:BudgetController | ApexClass:BudgetService | method-call | getBudgetSummary -> getBudgetSummary |
| ApexClass:BudgetController | ApexClass:BudgetService | method-call | getAllBudgets -> getAllBudgets |
| ApexClass:BudgetController | ApexClass:BudgetService | method-call | getExpenseRecords -> getExpenseRecords |
| ApexClass:BudgetController | CustomObject:Budget__c | generic-type |  |
| ApexClass:BudgetController | CustomObject:Expense_Record__c | generic-type |  |
| ApexClass:BudgetControllerTest | CustomObject:Budget__c | instantiation | testGetBudgetSummary |
| ApexClass:BudgetControllerTest | External:User | instantiation | testGetBudgetSummary |
| ApexClass:BudgetControllerTest | ApexClass:BudgetController | method-call | testGetBudgetSummary -> getBudgetSummary |
| ApexClass:BudgetControllerTest | ApexClass:BudgetController | method-call | testGetBudgetSummary -> getAllBudgets |
| ApexClass:BudgetControllerTest | ApexClass:BudgetController | method-call | testGetBudgetSummary -> getExpenseRecords |
| ApexClass:BudgetControllerTest | CustomObject:Budget__c | type-reference | testGetBudgetSummary |
| ApexClass:BudgetControllerTest | External:Profile | type-reference | testGetBudgetSummary |
| ApexClass:BudgetControllerTest | External:User | type-reference | testGetBudgetSummary |
| ApexClass:BudgetControllerTest | CustomObject:Budget__c | generic-type | testGetBudgetSummary |
| ApexClass:BudgetControllerTest | CustomObject:Expense_Record__c | generic-type | testGetBudgetSummary |
| ApexClass:BudgetControllerTest | ApexClass:BudgetController | test-reference |  |
| ApexClass:BudgetDomain | CustomObject:Budget__c | type-reference | validateWithinBudgetLimit |
| ApexClass:BudgetDomain | CustomObject:Expense_Record__c | generic-type | validateExpenses |
| ApexClass:BudgetHandler | External:IllegalArgumentException | instantiation | shareBudgets |
| ApexClass:BudgetHandler | ApexClass:BudgetService | method-call | shareBudgets -> shareBudgetsWithZoneManagers |
| ApexClass:BudgetHandler | ApexClass:TriggerGuard | method-call | afterUpdate -> hasBeenProcessed |
| ApexClass:BudgetHandler | ApexClass:TriggerGuard | method-call | afterUpdate -> markProcessed |
| ApexClass:BudgetHandler | CustomObject:Budget__c | type-reference | shareBudgets |
| ApexClass:BudgetHandler | CustomObject:Budget__c | generic-type | shareBudgets |
| ApexClass:BudgetHandlerTest | CustomObject:Budget__c | instantiation | testShareBudgets |
| ApexClass:BudgetHandlerTest | ApexClass:BudgetHandler | method-call | testShareBudgets -> shareBudgets |
| ApexClass:BudgetHandlerTest | CustomObject:Budget__c | type-reference | testShareBudgets |
| ApexClass:BudgetHandlerTest | CustomObject:Budget__c | generic-type | testShareBudgets |
| ApexClass:BudgetHandlerTest | ApexClass:BudgetHandler | test-reference |  |
| ApexClass:BudgetSelector | ApexClass:TransactionCache | method-call | getBudgetById -> get |
| ApexClass:BudgetSelector | ApexClass:TransactionCache | method-call | getBudgetById -> put |
| ApexClass:BudgetSelector | External:StubProvider | type-reference |  |
| ApexClass:BudgetSelector | CustomObject:Budget__c | type-reference |  |
| ApexClass:BudgetSelector | External:Expense_Date__c | type-reference | getBudgetsWithExpensesAndZone |
| ApexClass:BudgetSelector | External:CreatedDate | type-reference | getBudgetsWithExpensesAndZone |
| ApexClass:BudgetSelector | CustomObject:Budget__c | generic-type |  |
| ApexClass:BudgetSelector | External:Budget__Share | generic-type |  |
| ApexClass:BudgetSelector | CustomObject:Maintenance_Request__c | generic-type |  |
| ApexClass:BudgetSelector | CustomObject:Infrastructure_Asset__c | generic-type |  |
| ApexClass:BudgetSelector | CustomObject:City_Zone__c | generic-type |  |
| ApexClass:BudgetSelector | External:Expense_Record__Share | generic-type |  |
| ApexClass:BudgetSelectorTest | ApexClass:TestDataFactory | method-call | testBudgetSelectorQueries -> createCityZone |
| ApexClass:BudgetSelectorTest | ApexClass:TestDataFactory | method-call | testBudgetSelectorQueries -> createBudget |
| ApexClass:BudgetSelectorTest | ApexClass:BudgetSelector | method-call | testBudgetSelectorQueries -> getBudgetById |
| ApexClass:BudgetSelectorTest | ApexClass:BudgetSelector | method-call | testBudgetSelectorQueries -> getAllBudgets |
| ApexClass:BudgetSelectorTest | ApexClass:BudgetSelector | method-call | testBudgetSelectorQueries -> getCityWideBudgetAggregate |
| ApexClass:BudgetSelectorTest | ApexClass:BudgetSelector | method-call | testBudgetSelectorQueries -> getBudgetsByIds |
| ApexClass:BudgetSelectorTest | ApexClass:BudgetSelector | method-call | testBudgetSelectorQueries -> getActiveBudgetsByZonesAndYear |
| ApexClass:BudgetSelectorTest | ApexClass:BudgetSelector | method-call | testBudgetSelectorQueries -> findBudgetsForAssetAndYear |
| ApexClass:BudgetSelectorTest | ApexClass:BudgetSelector | method-call | testBudgetSelectorQueries -> getBudgetsWithZoneManagers |
| ApexClass:BudgetSelectorTest | ApexClass:BudgetSelector | method-call | testBudgetSelectorQueries -> getExistingSharesSystem |
| ApexClass:BudgetSelectorTest | ApexClass:BudgetSelector | method-call | testBudgetSelectorQueries -> getBudgetByZoneAndYear |
| ApexClass:BudgetSelectorTest | ApexClass:BudgetSelector | method-call | testBudgetSelectorQueries -> getBudgetsWithExpensesAndZone |
| ApexClass:BudgetSelectorTest | CustomObject:City_Zone__c | type-reference | testBudgetSelectorQueries |
| ApexClass:BudgetSelectorTest | CustomObject:Budget__c | type-reference | testBudgetSelectorQueries |
| ApexClass:BudgetSelectorTest | CustomObject:Budget__c | generic-type | testBudgetSelectorQueries |
| ApexClass:BudgetSelectorTest | External:Budget__Share | generic-type | testBudgetSelectorQueries |
| ApexClass:BudgetSelectorTest | ApexClass:TestDataFactory | test-reference |  |
| ApexClass:BudgetSelectorTest | ApexClass:BudgetSelector | test-reference |  |
| ApexClass:BudgetService | CustomObject:Budget__c | instantiation | validateExpenseAgainstBudget |
| ApexClass:BudgetService | CustomObject:Expense_Record__c | instantiation | validateExpenseAgainstBudget |
| ApexClass:BudgetService | External:Budget__Share | instantiation | shareBudgetsWithZoneManagers |
| ApexClass:BudgetService | External:Expense_Record__Share | instantiation | shareExpensesWithZoneManagers |
| ApexClass:BudgetService | ApexClass:BudgetDomain | method-call | validateExpenseAgainstBudget -> validateExpenses |
| ApexClass:BudgetService | ApexClass:BudgetSelector | method-call | validateExpenseAgainstBudget -> getBudgetsByIds |
| ApexClass:BudgetService | ApexClass:BudgetDomain | method-call | validateExpenseAgainstBudget -> validateWithinBudgetLimit |
| ApexClass:BudgetService | ApexClass:BudgetSelector | method-call | autoPopulateBudget -> getMaintenanceRequestsWithZones |
| ApexClass:BudgetService | ApexClass:BudgetSelector | method-call | autoPopulateBudget -> getActiveBudgetsByZonesAndYear |
| ApexClass:BudgetService | ApexClass:BudgetSelector | method-call | updateBudgetConsumption -> getBudgetExpenseAggregates |
| ApexClass:BudgetService | ApexClass:BudgetSelector | method-call | findBudgetForAsset -> getAssetZone |
| ApexClass:BudgetService | ApexClass:BudgetSelector | method-call | findBudgetForAsset -> findBudgetsForAssetAndYear |
| ApexClass:BudgetService | ApexClass:BudgetSelector | method-call | approveBudget -> getMaintenanceRequestForApproval |
| ApexClass:BudgetService | ApexClass:AuditLogService | method-call | approveBudget -> createAuditLog |
| ApexClass:BudgetService | ApexClass:BudgetSelector | method-call | shareBudgetsWithZoneManagers -> getCityZonesWithManagers |
| ApexClass:BudgetService | ApexClass:BudgetSelector | method-call | shareBudgetsWithZoneManagers -> getExistingSharesSystem |
| ApexClass:BudgetService | ApexClass:AuditLogService | method-call | shareBudgetsWithZoneManagers -> logError |
| ApexClass:BudgetService | ApexClass:BudgetSelector | method-call | shareExpensesWithZoneManagers -> getBudgetsWithZoneManagers |
| ApexClass:BudgetService | ApexClass:BudgetSelector | method-call | shareExpensesWithZoneManagers -> getExpenseRecordShares |
| ApexClass:BudgetService | ApexClass:BudgetSelector | method-call | getBudgetSummary -> getBudgetsWithExpensesAndZone |
| ApexClass:BudgetService | ApexClass:BudgetSelector | method-call | getAllBudgets -> getAllBudgets |
| ApexClass:BudgetService | ApexClass:ExpenseSelector | method-call | getExpenseRecords -> getExpensesByBudgetIds |
| ApexClass:BudgetService | ApexClass:BudgetSelector | method-call | getCityWideBudgetAggregate |
| ApexClass:BudgetService | CustomObject:Maintenance_Request__c | type-reference | autoPopulateBudget |
| ApexClass:BudgetService | CustomObject:Infrastructure_Asset__c | type-reference | autoPopulateBudget |
| ApexClass:BudgetService | CustomObject:Budget__c | type-reference | validateExpenseAgainstBudget |
| ApexClass:BudgetService | CustomObject:Expense_Record__c | type-reference | validateExpenseAgainstBudget |
| ApexClass:BudgetService | CustomObject:City_Zone__c | type-reference | autoPopulateBudget |
| ApexClass:BudgetService | External:Budget__Share | type-reference | shareBudgetsWithZoneManagers |
| ApexClass:BudgetService | External:DmlException | type-reference | shareBudgetsWithZoneManagers |
| ApexClass:BudgetService | External:Expense_Record__Share | type-reference | shareExpensesWithZoneManagers |
| ApexClass:BudgetService | CustomObject:Expense_Record__c | generic-type | validateExpenseAgainstBudget |
| ApexClass:BudgetService | CustomObject:Budget__c | generic-type | autoPopulateBudget |
| ApexClass:BudgetService | CustomObject:Infrastructure_Asset__c | generic-type | findBudgetForAsset |
| ApexClass:BudgetService | CustomObject:Maintenance_Request__c | generic-type | approveBudget |
| ApexClass:BudgetService | External:Budget__Share | generic-type | shareBudgetsWithZoneManagers |
| ApexClass:BudgetService | External:Expense_Record__Share | generic-type | shareExpensesWithZoneManagers |
| ApexClass:BudgetServiceTest | CustomObject:City_Zone__c | instantiation | setup |
| ApexClass:BudgetServiceTest | CustomObject:Budget__c | instantiation | setup |
| ApexClass:BudgetServiceTest | CustomObject:Infrastructure_Asset__c | instantiation | setup |
| ApexClass:BudgetServiceTest | CustomObject:Expense_Record__c | instantiation | testValidExpense |
| ApexClass:BudgetServiceTest | ApexClass:BudgetBatch | instantiation | testBudgetBatch |
| ApexClass:BudgetServiceTest | CustomObject:Maintenance_Request__c | instantiation | testApproveBudgetSuccess |
| ApexClass:BudgetServiceTest | ApexClass:BudgetService | method-call | testFindBudgetForAsset -> findBudgetForAsset |
| ApexClass:BudgetServiceTest | ApexClass:BudgetService | method-call | testApproveBudgetSuccess -> approveBudget |
| ApexClass:BudgetServiceTest | CustomObject:City_Zone__c | type-reference | setup |
| ApexClass:BudgetServiceTest | CustomObject:Budget__c | type-reference | setup |
| ApexClass:BudgetServiceTest | CustomObject:Infrastructure_Asset__c | type-reference | setup |
| ApexClass:BudgetServiceTest | CustomObject:Expense_Record__c | type-reference | testValidExpense |
| ApexClass:BudgetServiceTest | External:DmlException | type-reference | testInvalidExpense |
| ApexClass:BudgetServiceTest | CustomObject:Maintenance_Request__c | type-reference | testApproveBudgetSuccess |
| ApexClass:BudgetServiceTest | CustomObject:Expense_Record__c | generic-type | testApproveBudgetSuccess |
| ApexClass:BudgetServiceTest | ApexClass:BudgetBatch | test-reference |  |
| ApexClass:BudgetServiceTest | ApexClass:BudgetService | test-reference |  |
| ApexClass:BudgetTriggerTest | External:User | instantiation |  |
| ApexClass:BudgetTriggerTest | CustomObject:City_Zone__c | instantiation | testBudgetSharingOnInsert |
| ApexClass:BudgetTriggerTest | CustomObject:Budget__c | instantiation | testBudgetSharingOnInsert |
| ApexClass:BudgetTriggerTest | External:Profile | type-reference | createTestUser |
| ApexClass:BudgetTriggerTest | External:User | type-reference |  |
| ApexClass:BudgetTriggerTest | CustomObject:City_Zone__c | type-reference | testBudgetSharingOnInsert |
| ApexClass:BudgetTriggerTest | CustomObject:Budget__c | type-reference | testBudgetSharingOnInsert |
| ApexClass:BudgetTriggerTest | External:Budget__Share | type-reference | testBudgetSharingOnInsert |
| ApexClass:BudgetTriggerTest | CustomObject:City_Zone__c | generic-type | testBudgetSharingOnUpdateZoneChange |
| ApexClass:BudgetTriggerTest | External:Budget__Share | generic-type | testBudgetSharingOnUpdateZoneChange |
| ApexClass:BuildersTest | CustomObject:City_Zone__c | instantiation | testBuildersWithContext |
| ApexClass:BuildersTest | CustomObject:Infrastructure_Asset__c | instantiation | testBuildersWithContext |
| ApexClass:BuildersTest | ApexClass:DashboardContext | instantiation | testBuildersWithContext |
| ApexClass:BuildersTest | ApexClass:AssetSummaryBuilder | method-call | testBuildersWithContext -> build |
| ApexClass:BuildersTest | ApexClass:TimelineBuilder | method-call | testBuildersWithContext -> build |
| ApexClass:BuildersTest | ApexClass:MapBuilder | method-call | testBuildersWithContext -> buildHealthMapMarkers |
| ApexClass:BuildersTest | ApexClass:MapBuilder | method-call | testBuildersWithContext -> buildExplorerMapMarkers |
| ApexClass:BuildersTest | ApexClass:ChartBuilder | method-call | testBuildersWithContext -> buildStatusCharts |
| ApexClass:BuildersTest | ApexClass:FilterBuilder | method-call | testBuildersWithContext -> buildFilterOptions |
| ApexClass:BuildersTest | CustomObject:City_Zone__c | type-reference | testBuildersWithContext |
| ApexClass:BuildersTest | CustomObject:Infrastructure_Asset__c | type-reference | testBuildersWithContext |
| ApexClass:BuildersTest | ApexClass:DashboardContext | type-reference | testBuildersWithContext |
| ApexClass:BuildersTest | External:AssetDetailDTO | type-reference | testBuildersWithContext |
| ApexClass:BuildersTest | CustomObject:Infrastructure_Asset__c | generic-type | testBuildersWithContext |
| ApexClass:BuildersTest | ApexClass:DashboardContext | test-reference |  |
| ApexClass:BuildersTest | ApexClass:AssetDTOs | test-reference |  |
| ApexClass:BuildersTest | ApexClass:AssetSummaryBuilder | test-reference |  |
| ApexClass:BuildersTest | ApexClass:TimelineBuilder | test-reference |  |
| ApexClass:BuildersTest | ApexClass:MapBuilder | test-reference |  |
| ApexClass:BuildersTest | ApexClass:ChartBuilder | test-reference |  |
| ApexClass:BuildersTest | ApexClass:FilterBuilder | test-reference |  |
| ApexClass:CacheService | External:Org | method-call | get -> getPartition |
| ApexClass:CacheService | External:OrgPartition | type-reference | get |
| ApexClass:CacheServiceTest | ApexClass:CacheService | method-call | testInvalidateAssetTypeCache -> invalidateAssetTypeCache |
| ApexClass:CacheServiceTest | ApexClass:CacheService | method-call | testGetAndPutMethods -> put |
| ApexClass:CacheServiceTest | ApexClass:CacheService | method-call | testGetAndPutMethods -> get |
| ApexClass:CacheServiceTest | ApexClass:CacheService | test-reference |  |
| ApexClass:ChartBuilder | ApexClass:AssetDTOs | method-call | buildStatusCharts -> ChartDataDTO |
| ApexClass:ChartBuilder | ApexClass:AssetDTOs | method-call | buildStatusCharts -> ChartDTO |
| ApexClass:ChartBuilder | CustomObject:Infrastructure_Asset__c | generic-type | buildStatusCharts |
| ApexClass:ChecklistSelector | CustomObject:Checklist_Question__c | generic-type |  |
| ApexClass:ChecklistSelector | CustomObject:Checklist_Template__c | generic-type |  |
| ApexClass:ChecklistSelector | CustomObject:Inspection_Checklist__c | generic-type |  |
| ApexClass:CitizenRequestController | External:ComplaintDTO | instantiation | getComplaintDetails |
| ApexClass:CitizenRequestController | External:TimelineEventDTO | instantiation |  |
| ApexClass:CitizenRequestController | External:PhotoDTO | instantiation |  |
| ApexClass:CitizenRequestController | External:DuplicateCheckResult | instantiation |  |
| ApexClass:CitizenRequestController | External:DuplicateCandidateDTO | instantiation | checkDuplicateIssues |
| ApexClass:CitizenRequestController | ApexClass:CitizenRequestSelector | method-call | getComplaintDetails -> getCitizenRequestByName |
| ApexClass:CitizenRequestController | ApexClass:CitizenRequestSelector | method-call | getComplaintDetails -> getCitizenRequestsWithMaintenanceDetails |
| ApexClass:CitizenRequestController | ApexClass:CitizenRequestHelper | method-call | getComplaintDetails -> getProgressStep |
| ApexClass:CitizenRequestController | ApexClass:CitizenRequestHelper | method-call | getComplaintDetails -> calculateOverdue |
| ApexClass:CitizenRequestController | ApexClass:CitizenRequestHelper | method-call | getComplaintDetails -> calculateRemainingMinutes |
| ApexClass:CitizenRequestController | ApexClass:CitizenRequestHelper | method-call | getComplaintDetails -> getStatusType |
| ApexClass:CitizenRequestController | ApexClass:MaintenanceSelector | method-call | getMaintenanceRequestForCitizenDetails |
| ApexClass:CitizenRequestController | ApexClass:AuditLogSelector | method-call | getAuditLogsByRecordId |
| ApexClass:CitizenRequestController | ApexClass:InspectionSelector | method-call | getInspectionsByMaintenanceRequestId |
| ApexClass:CitizenRequestController | ApexClass:InspectionSelector | method-call | getContentDocumentLinksByLinkedEntityIds |
| ApexClass:CitizenRequestController | ApexClass:InspectionSelector | method-call | getContentVersionsByDocumentIds |
| ApexClass:CitizenRequestController | ApexClass:CitizenRequestSelector | method-call | getMyComplaints -> getCitizenRequestsByOwnerId |
| ApexClass:CitizenRequestController | ApexClass:AuditLogService | method-call | getMyComplaints -> logError |
| ApexClass:CitizenRequestController | ApexClass:CitizenRequestSelector | method-call | trackComplaint -> getCitizenRequestByNameAndPhone |
| ApexClass:CitizenRequestController | ApexClass:CitizenRequestSelector | method-call | getComplaintDetailsById -> getCitizenRequestById |
| ApexClass:CitizenRequestController | ApexClass:CitizenRequestSelector | method-call | getComplaintFiles -> getFilesByComplaintId |
| ApexClass:CitizenRequestController | ApexClass:CitizenRequestSelector | method-call | checkDuplicateIssues -> getCitizenRequestsWithCoordinates |
| ApexClass:CitizenRequestController | ApexClass:CitizenRequestDomain | method-call | checkDuplicateIssues -> validateNoDuplicates |
| ApexClass:CitizenRequestController | CustomObject:Citizen_Request__c | type-reference | getComplaintDetails |
| ApexClass:CitizenRequestController | CustomObject:Maintenance_Request__c | type-reference | getComplaintDetails |
| ApexClass:CitizenRequestController | External:ComplaintDTO | type-reference |  |
| ApexClass:CitizenRequestController | External:TimelineEventDTO | type-reference |  |
| ApexClass:CitizenRequestController | External:PhotoDTO | type-reference |  |
| ApexClass:CitizenRequestController | External:DuplicateCandidateDTO | type-reference | checkDuplicateIssues |
| ApexClass:CitizenRequestController | External:TimelineEventDTO | generic-type |  |
| ApexClass:CitizenRequestController | External:PhotoDTO | generic-type |  |
| ApexClass:CitizenRequestController | CustomObject:Citizen_Request__c | generic-type | getComplaintDetails |
| ApexClass:CitizenRequestController | CustomObject:Audit_Log__c | generic-type |  |
| ApexClass:CitizenRequestController | CustomObject:Inspection__c | generic-type |  |
| ApexClass:CitizenRequestController | External:ContentDocumentLink | generic-type |  |
| ApexClass:CitizenRequestController | External:ContentVersion | generic-type |  |
| ApexClass:CitizenRequestController | External:DuplicateCandidateDTO | generic-type | checkDuplicateIssues |
| ApexClass:CitizenRequestControllerTest | CustomObject:Citizen_Request__c | instantiation |  |
| ApexClass:CitizenRequestControllerTest | External:SelectorMock | instantiation |  |
| ApexClass:CitizenRequestControllerTest | ApexClass:CitizenRequestSelector | method-call | testGetComplaintDetailsMocked -> setMock |
| ApexClass:CitizenRequestControllerTest | ApexClass:CitizenRequestController | method-call | testGetComplaintDetailsMocked -> getComplaintDetails |
| ApexClass:CitizenRequestControllerTest | CustomObject:Citizen_Request__c | type-reference |  |
| ApexClass:CitizenRequestControllerTest | External:ComplaintDTO | type-reference | testGetComplaintDetailsMocked |
| ApexClass:CitizenRequestControllerTest | CustomObject:Citizen_Request__c | generic-type | handleMethodCall |
| ApexClass:CitizenRequestControllerTest | ApexClass:CitizenRequestSelector | test-reference |  |
| ApexClass:CitizenRequestControllerTest | ApexClass:CitizenRequestController | test-reference |  |
| ApexClass:CitizenRequestSelector | External:StubProvider | type-reference |  |
| ApexClass:CitizenRequestSelector | CustomObject:Citizen_Request__c | generic-type |  |
| ApexClass:CitizenRequestSelector | External:ContentDocumentLink | generic-type |  |
| ApexClass:CitizenRequestSelectorTest | ApexClass:TestDataFactory | method-call | testCitizenRequestSelectorQueries -> createCityZone |
| ApexClass:CitizenRequestSelectorTest | ApexClass:TestDataFactory | method-call | testCitizenRequestSelectorQueries -> createCitizenRequest |
| ApexClass:CitizenRequestSelectorTest | ApexClass:TestDataFactory | method-call | testCitizenRequestSelectorQueries -> createInfrastructureAsset |
| ApexClass:CitizenRequestSelectorTest | ApexClass:TestDataFactory | method-call | testCitizenRequestSelectorQueries -> createMaintenanceRequest |
| ApexClass:CitizenRequestSelectorTest | ApexClass:CitizenRequestSelector | method-call | testCitizenRequestSelectorQueries -> getCitizenRequestByName |
| ApexClass:CitizenRequestSelectorTest | ApexClass:CitizenRequestSelector | method-call | testCitizenRequestSelectorQueries -> getCitizenRequestsByOwnerId |
| ApexClass:CitizenRequestSelectorTest | ApexClass:CitizenRequestSelector | method-call | testCitizenRequestSelectorQueries -> getCitizenRequestByNameAndPhone |
| ApexClass:CitizenRequestSelectorTest | ApexClass:CitizenRequestSelector | method-call | testCitizenRequestSelectorQueries -> getCitizenRequestById |
| ApexClass:CitizenRequestSelectorTest | ApexClass:CitizenRequestSelector | method-call | testCitizenRequestSelectorQueries -> getCitizenRequestsByMaintenanceRequestId |
| ApexClass:CitizenRequestSelectorTest | ApexClass:CitizenRequestSelector | method-call | testCitizenRequestSelectorQueries -> getNearbyCitizenRequestsByCoordinates |
| ApexClass:CitizenRequestSelectorTest | ApexClass:CitizenRequestSelector | method-call | testCitizenRequestSelectorQueries -> getCitizenRequestsWithCoordinates |
| ApexClass:CitizenRequestSelectorTest | ApexClass:CitizenRequestSelector | method-call | testCitizenRequestSelectorQueries -> getCitizenRequestsWithMaintenanceDetails |
| ApexClass:CitizenRequestSelectorTest | ApexClass:CitizenRequestSelector | method-call | testCitizenRequestSelectorQueries -> getFilesByComplaintId |
| ApexClass:CitizenRequestSelectorTest | CustomObject:City_Zone__c | type-reference | testCitizenRequestSelectorQueries |
| ApexClass:CitizenRequestSelectorTest | CustomObject:Citizen_Request__c | type-reference | testCitizenRequestSelectorQueries |
| ApexClass:CitizenRequestSelectorTest | CustomObject:Infrastructure_Asset__c | type-reference | testCitizenRequestSelectorQueries |
| ApexClass:CitizenRequestSelectorTest | CustomObject:Maintenance_Request__c | type-reference | testCitizenRequestSelectorQueries |
| ApexClass:CitizenRequestSelectorTest | CustomObject:Citizen_Request__c | generic-type | testCitizenRequestSelectorQueries |
| ApexClass:CitizenRequestSelectorTest | External:ContentDocumentLink | generic-type | testCitizenRequestSelectorQueries |
| ApexClass:CitizenRequestSelectorTest | ApexClass:TestDataFactory | test-reference |  |
| ApexClass:CitizenRequestSelectorTest | ApexClass:CitizenRequestSelector | test-reference |  |
| ApexClass:CitizenRequestService | CustomObject:Maintenance_Request__c | instantiation |  |
| ApexClass:CitizenRequestService | CustomObject:Citizen_Request__c | instantiation |  |
| ApexClass:CitizenRequestService | CustomObject:Audit_Log__c | instantiation | createMaintenanceRequest |
| ApexClass:CitizenRequestService | ApexClass:NotificationService | method-call | sendCitizenAcknowledgement -> sendSMS |
| ApexClass:CitizenRequestService | ApexClass:CitizenRequestSelector | method-call | updateCitizenStatus -> getCitizenRequestsByMaintenanceRequestId |
| ApexClass:CitizenRequestService | CustomObject:Citizen_Request__c | type-reference |  |
| ApexClass:CitizenRequestService | CustomObject:Citizen_Request__c | generic-type | createMaintenanceRequest |
| ApexClass:CitizenRequestService | CustomObject:Maintenance_Request__c | generic-type | createMaintenanceRequest |
| ApexClass:CitizenRequestService | CustomObject:Audit_Log__c | generic-type | createMaintenanceRequest |
| ApexClass:CitizenRequestServiceTest | CustomObject:City_Zone__c | instantiation | testCitizenRequestCreatesMaintenanceRequest |
| ApexClass:CitizenRequestServiceTest | CustomObject:Infrastructure_Asset__c | instantiation | testCitizenRequestCreatesMaintenanceRequest |
| ApexClass:CitizenRequestServiceTest | CustomObject:Citizen_Request__c | instantiation | testCitizenRequestCreatesMaintenanceRequest |
| ApexClass:CitizenRequestServiceTest | CustomObject:Field_Engineer__c | instantiation | testCitizenRequestCreatesMaintenanceRequest |
| ApexClass:CitizenRequestServiceTest | CustomObject:Maintenance_Request__c | instantiation | testCitizenRequestCreatesMaintenanceRequest |
| ApexClass:CitizenRequestServiceTest | ApexClass:CitizenRequestService | method-call | testUpdateCitizenStatus -> updateCitizenStatus |
| ApexClass:CitizenRequestServiceTest | ApexClass:CitizenRequestService | method-call | testEdgeCasesAndEmptyParameters -> createMaintenanceRequest |
| ApexClass:CitizenRequestServiceTest | ApexClass:CitizenRequestService | method-call | testHandleStatusChangeNotificationsNoPhone -> handleStatusChangeNotifications |
| ApexClass:CitizenRequestServiceTest | CustomObject:City_Zone__c | type-reference | testCitizenRequestCreatesMaintenanceRequest |
| ApexClass:CitizenRequestServiceTest | CustomObject:Infrastructure_Asset__c | type-reference | testCitizenRequestCreatesMaintenanceRequest |
| ApexClass:CitizenRequestServiceTest | CustomObject:Citizen_Request__c | type-reference | testCitizenRequestCreatesMaintenanceRequest |
| ApexClass:CitizenRequestServiceTest | CustomObject:Field_Engineer__c | type-reference | testCitizenRequestCreatesMaintenanceRequest |
| ApexClass:CitizenRequestServiceTest | CustomObject:Maintenance_Request__c | type-reference | testCitizenRequestCreatesMaintenanceRequest |
| ApexClass:CitizenRequestServiceTest | CustomObject:Maintenance_Request__c | generic-type | testCitizenRequestCreatesMaintenanceRequest |
| ApexClass:CitizenRequestServiceTest | CustomObject:Audit_Log__c | generic-type | testCitizenRequestCreatesMaintenanceRequest |
| ApexClass:CitizenRequestServiceTest | CustomObject:Citizen_Request__c | generic-type | testEdgeCasesAndEmptyParameters |
| ApexClass:CitizenRequestServiceTest | ApexClass:CitizenRequestService | test-reference |  |
| ApexClass:CitizenRequestTriggerHandler | ApexClass:TriggerGuard | method-call | afterInsert -> hasBeenProcessed |
| ApexClass:CitizenRequestTriggerHandler | ApexClass:TriggerGuard | method-call | afterInsert -> markProcessed |
| ApexClass:CitizenRequestTriggerHandler | ApexClass:CitizenRequestService | method-call | afterInsert -> createMaintenanceRequest |
| ApexClass:CitizenRequestTriggerHandler | ApexClass:CitizenRequestService | method-call | afterUpdate -> handleStatusChangeNotifications |
| ApexClass:CitizenRequestTriggerHandler | CustomObject:Citizen_Request__c | generic-type | afterInsert |
| ApexClass:CitizenRequestTriggerHandlerTest | CustomObject:City_Zone__c | instantiation | testAfterInsertDelegation |
| ApexClass:CitizenRequestTriggerHandlerTest | CustomObject:Infrastructure_Asset__c | instantiation | testAfterInsertDelegation |
| ApexClass:CitizenRequestTriggerHandlerTest | CustomObject:Citizen_Request__c | instantiation | testAfterInsertDelegation |
| ApexClass:CitizenRequestTriggerHandlerTest | CustomObject:City_Zone__c | type-reference | testAfterInsertDelegation |
| ApexClass:CitizenRequestTriggerHandlerTest | CustomObject:Infrastructure_Asset__c | type-reference | testAfterInsertDelegation |
| ApexClass:CitizenRequestTriggerHandlerTest | CustomObject:Citizen_Request__c | type-reference | testAfterInsertDelegation |
| ApexClass:CitizenRequestTriggerHandlerTest | CustomObject:Maintenance_Request__c | generic-type | testAfterInsertDelegation |
| ApexClass:CityZoneController | ApexClass:ZoneUtil | method-call | getCityZones -> getActiveZones |
| ApexClass:CityZoneController | CustomObject:City_Zone__c | generic-type |  |
| ApexClass:CityZoneControllerTest | CustomObject:City_Zone__c | instantiation | setupData |
| ApexClass:CityZoneControllerTest | ApexClass:CityZoneController | method-call | testGetCityZonesReturnsRecords -> getCityZones |
| ApexClass:CityZoneControllerTest | CustomObject:City_Zone__c | generic-type | setupData |
| ApexClass:CityZoneControllerTest | ApexClass:CityZoneController | test-reference |  |
| ApexClass:CommissionerTriggerTest | CustomObject:Maintenance_Request__c | instantiation | testCommissionerTriggerPositive |
| ApexClass:CommissionerTriggerTest | CustomObject:Maintenance_Request__c | type-reference | testCommissionerTriggerPositive |
| ApexClass:ContractorAssignmentSelector | External:StubProvider | type-reference |  |
| ApexClass:ContractorAssignmentSelector | CustomObject:Contractor_Assignment__c | generic-type |  |
| ApexClass:ContractorAssignmentSelectorTest | CustomObject:Contractor_Assignment__c | instantiation | testContractorAssignmentSelectorQueries |
| ApexClass:ContractorAssignmentSelectorTest | ApexClass:TestDataFactory | method-call | testContractorAssignmentSelectorQueries -> createCityZone |
| ApexClass:ContractorAssignmentSelectorTest | ApexClass:TestDataFactory | method-call | testContractorAssignmentSelectorQueries -> createInfrastructureAsset |
| ApexClass:ContractorAssignmentSelectorTest | ApexClass:TestDataFactory | method-call | testContractorAssignmentSelectorQueries -> createMaintenanceRequest |
| ApexClass:ContractorAssignmentSelectorTest | ApexClass:TestDataFactory | method-call | testContractorAssignmentSelectorQueries -> createVendor |
| ApexClass:ContractorAssignmentSelectorTest | ApexClass:ContractorAssignmentSelector | method-call | testContractorAssignmentSelectorQueries -> getAssignmentById |
| ApexClass:ContractorAssignmentSelectorTest | ApexClass:ContractorAssignmentSelector | method-call | testContractorAssignmentSelectorQueries -> getAssignmentByRequest |
| ApexClass:ContractorAssignmentSelectorTest | ApexClass:ContractorAssignmentSelector | method-call | testContractorAssignmentSelectorQueries -> getAssignmentsByVendor |
| ApexClass:ContractorAssignmentSelectorTest | ApexClass:ContractorAssignmentSelector | method-call | testContractorAssignmentSelectorQueries -> getVendorHistory |
| ApexClass:ContractorAssignmentSelectorTest | ApexClass:ContractorAssignmentSelector | method-call | testContractorAssignmentSelectorQueries -> getActiveAssignmentsCount |
| ApexClass:ContractorAssignmentSelectorTest | CustomObject:City_Zone__c | type-reference | testContractorAssignmentSelectorQueries |
| ApexClass:ContractorAssignmentSelectorTest | CustomObject:Infrastructure_Asset__c | type-reference | testContractorAssignmentSelectorQueries |
| ApexClass:ContractorAssignmentSelectorTest | CustomObject:Maintenance_Request__c | type-reference | testContractorAssignmentSelectorQueries |
| ApexClass:ContractorAssignmentSelectorTest | CustomObject:Vendor__c | type-reference | testContractorAssignmentSelectorQueries |
| ApexClass:ContractorAssignmentSelectorTest | CustomObject:Contractor_Assignment__c | type-reference | testContractorAssignmentSelectorQueries |
| ApexClass:ContractorAssignmentSelectorTest | CustomObject:Contractor_Assignment__c | generic-type | testContractorAssignmentSelectorQueries |
| ApexClass:ContractorAssignmentSelectorTest | ApexClass:TestDataFactory | test-reference |  |
| ApexClass:ContractorAssignmentSelectorTest | ApexClass:ContractorAssignmentSelector | test-reference |  |
| ApexClass:ContractorAssignmentService | CustomObject:Contractor_Assignment__c | instantiation | assignVendorWithEstimate |
| ApexClass:ContractorAssignmentService | CustomObject:Maintenance_Request__c | instantiation | assignVendorWithEstimate |
| ApexClass:ContractorAssignmentService | CustomObject:Vendor__c | instantiation |  |
| ApexClass:ContractorAssignmentService | ApexClass:VendorSelector | method-call | getActiveVendors -> getActiveVendors |
| ApexClass:ContractorAssignmentService | ApexClass:AuditLogService | method-call | assignVendorWithEstimate -> createAuditLog |
| ApexClass:ContractorAssignmentService | ApexClass:ContractorAssignmentSelector | method-call | completeAssignmentWithCost -> getAssignmentById |
| ApexClass:ContractorAssignmentService | ApexClass:ContractorAssignmentSelector | method-call | getAssignmentByRequest -> getAssignmentByRequest |
| ApexClass:ContractorAssignmentService | ApexClass:ContractorAssignmentSelector | method-call | getAssignmentsByVendor |
| ApexClass:ContractorAssignmentService | ApexClass:VendorPerformanceHelper | method-call | calculateVendorRating |
| ApexClass:ContractorAssignmentService | ApexClass:VendorSelector | method-call | getVendorForNotification |
| ApexClass:ContractorAssignmentService | ApexClass:NotificationService | method-call | sendSMS |
| ApexClass:ContractorAssignmentService | ApexClass:NotificationService | method-call | sendEmail |
| ApexClass:ContractorAssignmentService | CustomObject:Contractor_Assignment__c | type-reference | assignVendorWithEstimate |
| ApexClass:ContractorAssignmentService | CustomObject:Vendor__c | type-reference |  |
| ApexClass:ContractorAssignmentService | CustomObject:Vendor__c | generic-type |  |
| ApexClass:ContractorAssignmentService | CustomObject:Contractor_Assignment__c | generic-type | completeAssignmentWithCost |
| ApexClass:ContractorAssignmentServiceTest | CustomObject:Infrastructure_Asset__c | instantiation | testAssignVendor |
| ApexClass:ContractorAssignmentServiceTest | CustomObject:Maintenance_Request__c | instantiation | testAssignVendor |
| ApexClass:ContractorAssignmentServiceTest | CustomObject:Vendor__c | instantiation | testAssignVendor |
| ApexClass:ContractorAssignmentServiceTest | CustomObject:Contractor_Assignment__c | instantiation | testAssignVendor |
| ApexClass:ContractorAssignmentServiceTest | ApexClass:ContractorAssignmentService | method-call | testAssignVendor -> assignVendor |
| ApexClass:ContractorAssignmentServiceTest | ApexClass:ContractorAssignmentService | method-call | testCompleteAssignmentAndRating -> completeAssignment |
| ApexClass:ContractorAssignmentServiceTest | ApexClass:ContractorAssignmentService | method-call | testGetActiveVendors -> getActiveVendors |
| ApexClass:ContractorAssignmentServiceTest | ApexClass:ContractorAssignmentService | method-call | testNotifyVendorNoContactDetails -> notifyVendor |
| ApexClass:ContractorAssignmentServiceTest | ApexClass:ContractorAssignmentService | method-call | testCalculateVendorRatingCappingAndDefault -> calculateVendorRating |
| ApexClass:ContractorAssignmentServiceTest | CustomObject:Infrastructure_Asset__c | type-reference | testAssignVendor |
| ApexClass:ContractorAssignmentServiceTest | CustomObject:Maintenance_Request__c | type-reference | testAssignVendor |
| ApexClass:ContractorAssignmentServiceTest | CustomObject:Vendor__c | type-reference | testAssignVendor |
| ApexClass:ContractorAssignmentServiceTest | CustomObject:Contractor_Assignment__c | type-reference | testAssignVendor |
| ApexClass:ContractorAssignmentServiceTest | CustomObject:Contractor_Assignment__c | generic-type | testAssignVendor |
| ApexClass:ContractorAssignmentServiceTest | CustomObject:Vendor__c | generic-type | testGetActiveVendors |
| ApexClass:ContractorAssignmentServiceTest | ApexClass:ContractorAssignmentService | test-reference |  |
| ApexClass:ContractorAssignmentTriggerHandler | ApexClass:TriggerGuard | method-call | afterUpdate -> hasBeenProcessed |
| ApexClass:ContractorAssignmentTriggerHandler | ApexClass:ContractorAssignmentService | method-call | afterUpdate -> completeAssignment |
| ApexClass:ContractorAssignmentTriggerHandler | ApexClass:TriggerGuard | method-call | afterUpdate -> markProcessed |
| ApexClass:ContractorAssignmentTriggerHandler | CustomObject:Contractor_Assignment__c | type-reference | afterUpdate |
| ApexClass:ContractorAssignmentTriggerHandler | CustomObject:Contractor_Assignment__c | generic-type | afterUpdate |
| ApexClass:ContractorAssignmentTriggerHandlerTest | CustomObject:Infrastructure_Asset__c | instantiation | testAfterUpdateTrigger |
| ApexClass:ContractorAssignmentTriggerHandlerTest | CustomObject:Maintenance_Request__c | instantiation | testAfterUpdateTrigger |
| ApexClass:ContractorAssignmentTriggerHandlerTest | CustomObject:Vendor__c | instantiation | testAfterUpdateTrigger |
| ApexClass:ContractorAssignmentTriggerHandlerTest | CustomObject:Contractor_Assignment__c | instantiation | testAfterUpdateTrigger |
| ApexClass:ContractorAssignmentTriggerHandlerTest | CustomObject:Infrastructure_Asset__c | type-reference | testAfterUpdateTrigger |
| ApexClass:ContractorAssignmentTriggerHandlerTest | CustomObject:Maintenance_Request__c | type-reference | testAfterUpdateTrigger |
| ApexClass:ContractorAssignmentTriggerHandlerTest | CustomObject:Vendor__c | type-reference | testAfterUpdateTrigger |
| ApexClass:ContractorAssignmentTriggerHandlerTest | CustomObject:Contractor_Assignment__c | type-reference | testAfterUpdateTrigger |
| ApexClass:DailyInspectionReminderScheduler | ApexClass:InspectionService | method-call | execute -> sendDailyReminders |
| ApexClass:DailyInspectionReminderScheduler | External:SchedulableContext | type-reference | execute |
| ApexClass:DailyInspectionReminderScheduler | External:Schedulable | implements |  |
| ApexClass:DailyInspectionReminderSchedulerTest | External:User | instantiation |  |
| ApexClass:DailyInspectionReminderSchedulerTest | CustomObject:Infrastructure_Asset__c | instantiation | testScheduler |
| ApexClass:DailyInspectionReminderSchedulerTest | CustomObject:Maintenance_Request__c | instantiation | testScheduler |
| ApexClass:DailyInspectionReminderSchedulerTest | CustomObject:Field_Engineer__c | instantiation | testScheduler |
| ApexClass:DailyInspectionReminderSchedulerTest | CustomObject:Inspection__c | instantiation | testScheduler |
| ApexClass:DailyInspectionReminderSchedulerTest | ApexClass:DailyInspectionReminderScheduler | instantiation | testScheduler |
| ApexClass:DailyInspectionReminderSchedulerTest | External:Profile | type-reference | createTestUser |
| ApexClass:DailyInspectionReminderSchedulerTest | External:User | type-reference |  |
| ApexClass:DailyInspectionReminderSchedulerTest | CustomObject:Infrastructure_Asset__c | type-reference | testScheduler |
| ApexClass:DailyInspectionReminderSchedulerTest | CustomObject:Maintenance_Request__c | type-reference | testScheduler |
| ApexClass:DailyInspectionReminderSchedulerTest | CustomObject:Field_Engineer__c | type-reference | testScheduler |
| ApexClass:DailyInspectionReminderSchedulerTest | CustomObject:Inspection__c | type-reference | testScheduler |
| ApexClass:DailyInspectionReminderSchedulerTest | ApexClass:DailyInspectionReminderScheduler | type-reference |  |
| ApexClass:DailyInspectionReminderSchedulerTest | CustomObject:Audit_Log__c | generic-type | testScheduler |
| ApexClass:DailyInspectionReminderSchedulerTest | CustomObject:Inspection__c | generic-type | testSchedulerFilteringAndNullEmail |
| ApexClass:DailyInspectionReminderSchedulerTest | ApexClass:DailyInspectionReminderScheduler | test-reference |  |
| ApexClass:DashboardContext | ApexClass:AssetSelector | method-call | loadData -> getAssetsWithDetails |
| ApexClass:DashboardContext | ApexClass:ExpenseSelector | method-call | loadData -> getExpensesByAssetId |
| ApexClass:DashboardContext | ApexClass:AssetSelector | method-call | findLastCompletedInspection -> getExpensesSummedByAsset |
| ApexClass:DashboardContext | ApexClass:AssetDashboardService | method-call | findLastCompletedInspection -> calculateHealthScore |
| ApexClass:DashboardContext | ApexClass:AssetSelector | method-call | getHealthMapAssets -> getAssetsForMap |
| ApexClass:DashboardContext | ApexClass:ExternalIntegrationService | method-call | getHealthMapAssets -> fetchAssetCoordinates |
| ApexClass:DashboardContext | CustomObject:Inspection__c | type-reference |  |
| ApexClass:DashboardContext | CustomObject:Maintenance_Request__c | generic-type |  |
| ApexClass:DashboardContext | CustomObject:Inspection__c | generic-type |  |
| ApexClass:DashboardContext | CustomObject:Expense_Record__c | generic-type |  |
| ApexClass:DashboardContext | CustomObject:Infrastructure_Asset__c | generic-type |  |
| ApexClass:DashboardContextTest | CustomObject:City_Zone__c | instantiation | testContextLoadingAndMetrics |
| ApexClass:DashboardContextTest | CustomObject:Infrastructure_Asset__c | instantiation | testContextLoadingAndMetrics |
| ApexClass:DashboardContextTest | CustomObject:Maintenance_Request__c | instantiation | testContextLoadingAndMetrics |
| ApexClass:DashboardContextTest | CustomObject:Expense_Record__c | instantiation | testContextLoadingAndMetrics |
| ApexClass:DashboardContextTest | CustomObject:Inspection__c | instantiation | testContextLoadingAndMetrics |
| ApexClass:DashboardContextTest | ApexClass:DashboardContext | instantiation |  |
| ApexClass:DashboardContextTest | CustomObject:City_Zone__c | type-reference | testContextLoadingAndMetrics |
| ApexClass:DashboardContextTest | CustomObject:Infrastructure_Asset__c | type-reference | testContextLoadingAndMetrics |
| ApexClass:DashboardContextTest | CustomObject:Maintenance_Request__c | type-reference | testContextLoadingAndMetrics |
| ApexClass:DashboardContextTest | CustomObject:Expense_Record__c | type-reference | testContextLoadingAndMetrics |
| ApexClass:DashboardContextTest | CustomObject:Inspection__c | type-reference | testContextLoadingAndMetrics |
| ApexClass:DashboardContextTest | ApexClass:DashboardContext | type-reference |  |
| ApexClass:DashboardContextTest | CustomObject:Infrastructure_Asset__c | generic-type | testContextLoadingAndMetrics |
| ApexClass:DashboardContextTest | ApexClass:DashboardContext | test-reference |  |
| ApexClass:EngineerAssignmentHelper | External:Skill__c | method-call | selectEngineerWithSkillAndLowestWorkload -> split |
| ApexClass:EngineerAssignmentHelper | CustomObject:Field_Engineer__c | type-reference |  |
| ApexClass:EngineerAssignmentHelper | CustomObject:Field_Engineer__c | generic-type | selectEngineerWithLowestWorkload |
| ApexClass:EngineerAssignmentService | External:Maintenance_Request__Share | instantiation | createMaintenanceRequestShares |
| ApexClass:EngineerAssignmentService | CustomObject:Infrastructure_Alert__e | instantiation | handleEngineerSkillReassignment |
| ApexClass:EngineerAssignmentService | External:SkillVerificationResult | instantiation |  |
| ApexClass:EngineerAssignmentService | CustomObject:Assignment_History__c | instantiation | createAssignmentHistoryOnUpdate |
| ApexClass:EngineerAssignmentService | ApexClass:EngineerSelector | method-call | getCitizenRequestsWithAssetAndLocationSystem |
| ApexClass:EngineerAssignmentService | ApexClass:EngineerSelector | method-call | getEngineersForAutoAssignSystem |
| ApexClass:EngineerAssignmentService | ApexClass:EngineerAssignmentHelper | method-call | selectEngineerWithSkillAndLowestWorkload |
| ApexClass:EngineerAssignmentService | ApexClass:EngineerAssignmentHelper | method-call | selectEngineerWithLowestWorkload -> selectEngineerWithLowestWorkload |
| ApexClass:EngineerAssignmentService | ApexClass:EngineerAssignmentHelper | method-call | calculateDistance -> calculateDistance |
| ApexClass:EngineerAssignmentService | ApexClass:EngineerSelector | method-call | createMaintenanceRequestShares -> getEngineersByIds |
| ApexClass:EngineerAssignmentService | ApexClass:EngineerSelector | method-call | handleEngineerSkillReassignment -> getAssetRequiredSkillSystem |
| ApexClass:EngineerAssignmentService | ApexClass:EngineerSelector | method-call | handleEngineerSkillReassignment -> getMaintenanceRequestForSkillCheckSystem |
| ApexClass:EngineerAssignmentService | ApexClass:EngineerSelector | method-call | handleEngineerSkillReassignment -> getEngineerWithSkillsAndLocation |
| ApexClass:EngineerAssignmentService | External:Skill__c | method-call | handleEngineerSkillReassignment -> split |
| ApexClass:EngineerAssignmentService | ApexClass:EngineerSelector | method-call | handleEngineerSkillReassignment -> getAvailableEngineersInZoneWithLocation |
| ApexClass:EngineerAssignmentService | ApexClass:EngineerSelector | method-call | reassignRequest -> getMaintenanceRequestForReassignment |
| ApexClass:EngineerAssignmentService | ApexClass:EngineerSelector | method-call | reassignRequest -> getEngineerSkillById |
| ApexClass:EngineerAssignmentService | External:Skill__c | method-call | reassignRequest -> contains |
| ApexClass:EngineerAssignmentService | ApexClass:EngineerSelector | method-call | handleWorkloadAdjustments -> getEngineersForWorkloadAdjustmentsSystem |
| ApexClass:EngineerAssignmentService | ApexClass:EngineerSelector | method-call | syncCitizenRequestsStatus -> getCitizenRequestsByMaintenanceRequests |
| ApexClass:EngineerAssignmentService | CustomObject:Maintenance_Request__c | type-reference | autoAssignEngineer |
| ApexClass:EngineerAssignmentService | CustomObject:Citizen_Request__c | type-reference | autoAssignEngineer |
| ApexClass:EngineerAssignmentService | CustomObject:Field_Engineer__c | type-reference | autoAssignEngineer |
| ApexClass:EngineerAssignmentService | External:Maintenance_Request__Share | type-reference | createMaintenanceRequestShares |
| ApexClass:EngineerAssignmentService | CustomObject:Inspection__c | type-reference | handleEngineerSkillReassignment |
| ApexClass:EngineerAssignmentService | CustomObject:Infrastructure_Asset__c | type-reference | handleEngineerSkillReassignment |
| ApexClass:EngineerAssignmentService | External:SaveResult | type-reference | createMaintenanceRequestShares |
| ApexClass:EngineerAssignmentService | CustomObject:Maintenance_Request__c | generic-type | autoAssignEngineer |
| ApexClass:EngineerAssignmentService | CustomObject:Field_Engineer__c | generic-type | autoAssignEngineer |
| ApexClass:EngineerAssignmentService | CustomObject:Citizen_Request__c | generic-type |  |
| ApexClass:EngineerAssignmentService | External:Maintenance_Request__Share | generic-type | createMaintenanceRequestShares |
| ApexClass:EngineerAssignmentService | CustomObject:Infrastructure_Asset__c | generic-type | handleEngineerSkillReassignment |
| ApexClass:EngineerAssignmentService | CustomObject:Assignment_History__c | generic-type | createAssignmentHistoryOnUpdate |
| ApexClass:EngineerAssignmentServiceTest | External:User | instantiation |  |
| ApexClass:EngineerAssignmentServiceTest | CustomObject:Infrastructure_Asset__c | instantiation | testAutoAssignEngineerNoCitizenRequest |
| ApexClass:EngineerAssignmentServiceTest | CustomObject:Maintenance_Request__c | instantiation | testAutoAssignEngineerEmpty |
| ApexClass:EngineerAssignmentServiceTest | CustomObject:City_Zone__c | instantiation | testAutoAssignEngineerSuccess |
| ApexClass:EngineerAssignmentServiceTest | CustomObject:Citizen_Request__c | instantiation | testAutoAssignEngineerSuccess |
| ApexClass:EngineerAssignmentServiceTest | CustomObject:Field_Engineer__c | instantiation | testAutoAssignEngineerSuccess |
| ApexClass:EngineerAssignmentServiceTest | CustomObject:Asset_Type__c | instantiation | testSkillReassignmentNoRequiredSkill |
| ApexClass:EngineerAssignmentServiceTest | CustomObject:Inspection__c | instantiation | testSkillReassignmentNoRequiredSkill |
| ApexClass:EngineerAssignmentServiceTest | ApexClass:EngineerAssignmentService | method-call | testAutoAssignEngineerEmpty -> autoAssignEngineer |
| ApexClass:EngineerAssignmentServiceTest | ApexClass:EngineerAssignmentService | method-call | testCreateMaintenanceRequestShares -> createMaintenanceRequestShares |
| ApexClass:EngineerAssignmentServiceTest | ApexClass:EngineerAssignmentService | method-call | testSkillReassignmentNoRequiredSkill -> handleEngineerSkillReassignment |
| ApexClass:EngineerAssignmentServiceTest | External:Remarks__c | method-call | testSkillReassignmentTriggeredReassign -> contains |
| ApexClass:EngineerAssignmentServiceTest | External:Profile | type-reference | createTestUser |
| ApexClass:EngineerAssignmentServiceTest | External:User | type-reference |  |
| ApexClass:EngineerAssignmentServiceTest | CustomObject:Infrastructure_Asset__c | type-reference | testAutoAssignEngineerNoCitizenRequest |
| ApexClass:EngineerAssignmentServiceTest | CustomObject:Maintenance_Request__c | type-reference | testAutoAssignEngineerEmpty |
| ApexClass:EngineerAssignmentServiceTest | CustomObject:City_Zone__c | type-reference | testAutoAssignEngineerSuccess |
| ApexClass:EngineerAssignmentServiceTest | CustomObject:Citizen_Request__c | type-reference | testAutoAssignEngineerSuccess |
| ApexClass:EngineerAssignmentServiceTest | CustomObject:Field_Engineer__c | type-reference | testAutoAssignEngineerSuccess |
| ApexClass:EngineerAssignmentServiceTest | CustomObject:Asset_Type__c | type-reference | testSkillReassignmentNoRequiredSkill |
| ApexClass:EngineerAssignmentServiceTest | CustomObject:Inspection__c | type-reference | testSkillReassignmentNoRequiredSkill |
| ApexClass:EngineerAssignmentServiceTest | CustomObject:Maintenance_Request__c | generic-type | testAutoAssignEngineerEmpty |
| ApexClass:EngineerAssignmentServiceTest | CustomObject:Field_Engineer__c | generic-type | testAutoAssignEngineerSuccess |
| ApexClass:EngineerAssignmentServiceTest | External:Maintenance_Request__Share | generic-type | testCreateMaintenanceRequestShares |
| ApexClass:EngineerAssignmentServiceTest | ApexClass:EngineerAssignmentService | test-reference |  |
| ApexClass:EngineerController | ApexClass:EngineerService | method-call | getEngineerWorkload -> getEngineerWorkload |
| ApexClass:EngineerController | ApexClass:ZoneUtil | method-call | getFilterOptions -> getAvailableFilterOptions |
| ApexClass:EngineerController | External:AssignmentDetail | generic-type |  |
| ApexClass:EngineerController | External:EngineerWrapper | generic-type |  |
| ApexClass:EngineerController | External:ZoneOption | generic-type |  |
| ApexClass:EngineerControllerTest | CustomObject:Field_Engineer__c | instantiation | testGetEngineerWorkload |
| ApexClass:EngineerControllerTest | CustomObject:Infrastructure_Asset__c | instantiation | testGetEngineerWorkload |
| ApexClass:EngineerControllerTest | CustomObject:Maintenance_Request__c | instantiation | testGetEngineerWorkload |
| ApexClass:EngineerControllerTest | External:UserRole | instantiation | testEngineerWorkloadAsSpecificEngineer |
| ApexClass:EngineerControllerTest | External:User | instantiation | testEngineerWorkloadAsSpecificEngineer |
| ApexClass:EngineerControllerTest | CustomObject:City_Zone__c | instantiation | testEngineerWorkloadAsSpecificEngineer |
| ApexClass:EngineerControllerTest | ApexClass:EngineerController | method-call | testGetEngineerWorkload -> getEngineerWorkload |
| ApexClass:EngineerControllerTest | ApexClass:EngineerController | method-call | testGetFilterOptions -> getFilterOptions |
| ApexClass:EngineerControllerTest | CustomObject:Field_Engineer__c | type-reference | testGetEngineerWorkload |
| ApexClass:EngineerControllerTest | CustomObject:Infrastructure_Asset__c | type-reference | testGetEngineerWorkload |
| ApexClass:EngineerControllerTest | CustomObject:Maintenance_Request__c | type-reference | testGetEngineerWorkload |
| ApexClass:EngineerControllerTest | External:DashboardData | type-reference | testGetEngineerWorkload |
| ApexClass:EngineerControllerTest | External:User | type-reference | testEngineerWorkloadAsSpecificEngineer |
| ApexClass:EngineerControllerTest | External:Profile | type-reference | testEngineerWorkloadAsSpecificEngineer |
| ApexClass:EngineerControllerTest | External:UserRole | type-reference | testEngineerWorkloadAsSpecificEngineer |
| ApexClass:EngineerControllerTest | CustomObject:City_Zone__c | type-reference | testEngineerWorkloadAsSpecificEngineer |
| ApexClass:EngineerControllerTest | CustomObject:Field_Engineer__c | generic-type | testEngineerWorkloadScenarios |
| ApexClass:EngineerControllerTest | External:Profile | generic-type | testEngineerWorkloadAsSpecificEngineer |
| ApexClass:EngineerControllerTest | External:UserRole | generic-type | testEngineerWorkloadAsSpecificEngineer |
| ApexClass:EngineerControllerTest | CustomObject:City_Zone__c | generic-type | testEngineerWorkloadAsZoneManager |
| ApexClass:EngineerControllerTest | ApexClass:EngineerController | test-reference |  |
| ApexClass:EngineerSelector | ApexClass:TransactionCache | method-call | getEngineerById -> get |
| ApexClass:EngineerSelector | ApexClass:TransactionCache | method-call | getEngineerById -> put |
| ApexClass:EngineerSelector | External:StubProvider | type-reference |  |
| ApexClass:EngineerSelector | CustomObject:Field_Engineer__c | type-reference |  |
| ApexClass:EngineerSelector | CustomObject:Field_Engineer__c | generic-type | getEngineerById |
| ApexClass:EngineerSelector | CustomObject:Citizen_Request__c | generic-type |  |
| ApexClass:EngineerSelector | CustomObject:Infrastructure_Asset__c | generic-type |  |
| ApexClass:EngineerSelector | CustomObject:Maintenance_Request__c | generic-type |  |
| ApexClass:EngineerSelectorTest | ApexClass:TestDataFactory | method-call | testEngineerSelectorQueries -> createCityZone |
| ApexClass:EngineerSelectorTest | ApexClass:TestDataFactory | method-call | testEngineerSelectorQueries -> createInfrastructureAsset |
| ApexClass:EngineerSelectorTest | ApexClass:TestDataFactory | method-call | testEngineerSelectorQueries -> createMaintenanceRequest |
| ApexClass:EngineerSelectorTest | ApexClass:TestDataFactory | method-call | testEngineerSelectorQueries -> createFieldEngineer |
| ApexClass:EngineerSelectorTest | ApexClass:EngineerSelector | method-call | testEngineerSelectorQueries -> getEngineerById |
| ApexClass:EngineerSelectorTest | ApexClass:EngineerSelector | method-call | testEngineerSelectorQueries -> getUserFieldEngineer |
| ApexClass:EngineerSelectorTest | ApexClass:EngineerSelector | method-call | testEngineerSelectorQueries -> getEngineersByIds |
| ApexClass:EngineerSelectorTest | ApexClass:EngineerSelector | method-call | testEngineerSelectorQueries -> getEngineerWithSkillsAndLocation |
| ApexClass:EngineerSelectorTest | ApexClass:EngineerSelector | method-call | testEngineerSelectorQueries -> getAvailableEngineersInZone |
| ApexClass:EngineerSelectorTest | ApexClass:EngineerSelector | method-call | testEngineerSelectorQueries -> getEngineersByWorkloadContext |
| ApexClass:EngineerSelectorTest | ApexClass:EngineerSelector | method-call | testEngineerSelectorQueries -> getEngineersForAutoAssignSystem |
| ApexClass:EngineerSelectorTest | ApexClass:EngineerSelector | method-call | testEngineerSelectorQueries -> getEngineersForWorkloadAdjustmentsSystem |
| ApexClass:EngineerSelectorTest | ApexClass:EngineerSelector | method-call | testEngineerSelectorQueries -> getEngineerCountByZone |
| ApexClass:EngineerSelectorTest | ApexClass:EngineerSelector | method-call | testEngineerSelectorQueries -> getTotalEngineerCount |
| ApexClass:EngineerSelectorTest | ApexClass:EngineerSelector | method-call | testEngineerSelectorQueries -> getEngineersByZoneWithUser |
| ApexClass:EngineerSelectorTest | ApexClass:EngineerSelector | method-call | testEngineerSelectorQueries -> getEngineersByUserId |
| ApexClass:EngineerSelectorTest | CustomObject:City_Zone__c | type-reference | testEngineerSelectorQueries |
| ApexClass:EngineerSelectorTest | CustomObject:Infrastructure_Asset__c | type-reference | testEngineerSelectorQueries |
| ApexClass:EngineerSelectorTest | CustomObject:Maintenance_Request__c | type-reference | testEngineerSelectorQueries |
| ApexClass:EngineerSelectorTest | CustomObject:Field_Engineer__c | type-reference | testEngineerSelectorQueries |
| ApexClass:EngineerSelectorTest | CustomObject:Field_Engineer__c | generic-type | testEngineerSelectorQueries |
| ApexClass:EngineerSelectorTest | ApexClass:TestDataFactory | test-reference |  |
| ApexClass:EngineerSelectorTest | ApexClass:EngineerSelector | test-reference |  |
| ApexClass:EngineerService | ApexClass:UserSelector | method-call | getEngineerWorkload -> getProfileById |
| ApexClass:EngineerService | ApexClass:UserSelector | method-call | getEngineerWorkload -> getUserRoleById |
| ApexClass:EngineerService | ApexClass:EngineerSelector | method-call | getEngineerWorkload -> getUserFieldEngineer |
| ApexClass:EngineerService | ApexClass:EngineerController | method-call | getEngineerWorkload -> DashboardData |
| ApexClass:EngineerService | ApexClass:ZoneUtil | method-call | getEngineerWorkload -> getUserZoneId |
| ApexClass:EngineerService | ApexClass:ZoneSelector | method-call | getEngineerWorkload -> getZoneName |
| ApexClass:EngineerService | ApexClass:ZoneSelector | method-call | getEngineerWorkload -> getAllZonesSorted |
| ApexClass:EngineerService | ApexClass:EngineerController | method-call | getEngineerWorkload -> ZoneOption |
| ApexClass:EngineerService | ApexClass:EngineerSelector | method-call | getEngineerWorkload -> getEngineersByWorkloadContext |
| ApexClass:EngineerService | ApexClass:EngineerController | method-call | getEngineerWorkload -> EngineerWrapper |
| ApexClass:EngineerService | External:Maintenance_Requests__r | method-call | getEngineerWorkload -> size |
| ApexClass:EngineerService | ApexClass:EngineerController | method-call | getEngineerWorkload -> AssignmentDetail |
| ApexClass:EngineerService | External:DashboardData | type-reference |  |
| ApexClass:EngineerService | External:ZoneOption | type-reference | getEngineerWorkload |
| ApexClass:EngineerService | External:EngineerWrapper | type-reference | getEngineerWorkload |
| ApexClass:EngineerService | External:AssignmentDetail | type-reference | getEngineerWorkload |
| ApexClass:EngineerService | External:Profile | generic-type | getEngineerWorkload |
| ApexClass:EngineerService | External:UserRole | generic-type | getEngineerWorkload |
| ApexClass:EngineerService | CustomObject:Field_Engineer__c | generic-type | getEngineerWorkload |
| ApexClass:EngineerService | CustomObject:City_Zone__c | generic-type | getEngineerWorkload |
| ApexClass:EscalationSelector | CustomObject:Escalation__c | generic-type |  |
| ApexClass:ExpenseController | CustomObject:Expense_Record__c | instantiation | createExpenseRecord |
| ApexClass:ExpenseController | ApexClass:ContractorAssignmentSelector | method-call | createExpenseRecord -> getAssignmentById |
| ApexClass:ExpenseController | ApexClass:AuditLogService | method-call | createExpenseRecord -> createAuditLog |
| ApexClass:ExpenseController | CustomObject:Contractor_Assignment__c | type-reference | createExpenseRecord |
| ApexClass:ExpenseController | CustomObject:Expense_Record__c | type-reference | createExpenseRecord |
| ApexClass:ExpenseController | CustomObject:Contractor_Assignment__c | generic-type | createExpenseRecord |
| ApexClass:ExpenseSelector | External:StubProvider | type-reference |  |
| ApexClass:ExpenseSelector | External:Expense_Date__c | type-reference | getExpensesByBudgetIds |
| ApexClass:ExpenseSelector | CustomObject:Infrastructure_Asset__c | type-reference | getExpensesByAssetId |
| ApexClass:ExpenseSelector | CustomObject:Expense_Record__c | generic-type |  |
| ApexClass:ExpenseSelectorTest | CustomObject:Expense_Record__c | instantiation | testExpenseSelectorQueries |
| ApexClass:ExpenseSelectorTest | ApexClass:TestDataFactory | method-call | testExpenseSelectorQueries -> createCityZone |
| ApexClass:ExpenseSelectorTest | ApexClass:TestDataFactory | method-call | testExpenseSelectorQueries -> createInfrastructureAsset |
| ApexClass:ExpenseSelectorTest | ApexClass:TestDataFactory | method-call | testExpenseSelectorQueries -> createMaintenanceRequest |
| ApexClass:ExpenseSelectorTest | ApexClass:TestDataFactory | method-call | testExpenseSelectorQueries -> createBudget |
| ApexClass:ExpenseSelectorTest | ApexClass:ExpenseSelector | method-call | testExpenseSelectorQueries -> getExpensesByAssetId |
| ApexClass:ExpenseSelectorTest | ApexClass:ExpenseSelector | method-call | testExpenseSelectorQueries -> getBudgetSpentPerAsset |
| ApexClass:ExpenseSelectorTest | ApexClass:ExpenseSelector | method-call | testExpenseSelectorQueries -> getExpensesByBudgetIds |
| ApexClass:ExpenseSelectorTest | CustomObject:City_Zone__c | type-reference | testExpenseSelectorQueries |
| ApexClass:ExpenseSelectorTest | CustomObject:Infrastructure_Asset__c | type-reference | testExpenseSelectorQueries |
| ApexClass:ExpenseSelectorTest | CustomObject:Maintenance_Request__c | type-reference | testExpenseSelectorQueries |
| ApexClass:ExpenseSelectorTest | CustomObject:Budget__c | type-reference | testExpenseSelectorQueries |
| ApexClass:ExpenseSelectorTest | CustomObject:Expense_Record__c | type-reference | testExpenseSelectorQueries |
| ApexClass:ExpenseSelectorTest | CustomObject:Expense_Record__c | generic-type | testExpenseSelectorQueries |
| ApexClass:ExpenseSelectorTest | ApexClass:TestDataFactory | test-reference |  |
| ApexClass:ExpenseSelectorTest | ApexClass:ExpenseSelector | test-reference |  |
| ApexClass:ExpenseTriggerHandler | ApexClass:BudgetService | method-call | beforeInsert -> autoPopulateBudget |
| ApexClass:ExpenseTriggerHandler | ApexClass:BudgetService | method-call | beforeInsert -> validateExpenseAgainstBudget |
| ApexClass:ExpenseTriggerHandler | ApexClass:TriggerGuard | method-call | afterInsert -> hasBeenProcessed |
| ApexClass:ExpenseTriggerHandler | ApexClass:TriggerGuard | method-call | afterInsert -> markProcessed |
| ApexClass:ExpenseTriggerHandler | ApexClass:BudgetService | method-call | afterInsert -> updateBudgetConsumption |
| ApexClass:ExpenseTriggerHandler | ApexClass:BudgetService | method-call | afterInsert -> shareExpensesWithZoneManagers |
| ApexClass:ExpenseTriggerHandler | CustomObject:Expense_Record__c | generic-type | beforeInsert |
| ApexClass:ExpenseTriggerHandlerTest | CustomObject:Budget__c | instantiation | testExpenseLifecycle |
| ApexClass:ExpenseTriggerHandlerTest | CustomObject:Expense_Record__c | instantiation | testExpenseLifecycle |
| ApexClass:ExpenseTriggerHandlerTest | CustomObject:Budget__c | type-reference | testExpenseLifecycle |
| ApexClass:ExpenseTriggerHandlerTest | CustomObject:Expense_Record__c | type-reference | testExpenseLifecycle |
| ApexClass:ExpenseTriggerHandlerTest | External:DmlException | type-reference | testExpenseValidationOverBudget |
| ApexClass:ExpenseTriggerHandlerTest | CustomObject:Budget__c | generic-type | testExpenseAdditionalScenarios |
| ApexClass:ExternalIntegrationService | ApexClass:AuditLogService | method-call | fetchAssetCoordinates -> logError |
| ApexClass:ExternalIntegrationService | External:CalloutException | type-reference | fetchAssetCoordinates |
| ApexClass:ExternalIntegrationServiceTest | CustomObject:Infrastructure_Asset__c | instantiation | testFetchAssetCoordinates |
| ApexClass:ExternalIntegrationServiceTest | ApexClass:ExternalIntegrationService | method-call | testFetchAssetCoordinates -> fetchAssetCoordinates |
| ApexClass:ExternalIntegrationServiceTest | ApexClass:ExternalIntegrationService | method-call | testFetchAssetCoordinates -> sendSMSNotification |
| ApexClass:ExternalIntegrationServiceTest | CustomObject:Infrastructure_Asset__c | type-reference | testFetchAssetCoordinates |
| ApexClass:ExternalIntegrationServiceTest | ApexClass:ExternalIntegrationService | test-reference |  |
| ApexClass:fflib_SObjectUnitOfWork | External:Savepoint | type-reference | commitWork |
| ApexClass:fflib_SObjectUnitOfWork | ApexClass:fflib_ISObjectUnitOfWork | implements |  |
| ApexClass:fflib_SObjectUnitOfWorkTest | CustomObject:Maintenance_Request__c | instantiation | testUnitOfWorkAndPatterns |
| ApexClass:fflib_SObjectUnitOfWorkTest | CustomObject:Maintenance_Request__c | type-reference | testUnitOfWorkAndPatterns |
| ApexClass:FilterBuilder | ApexClass:AssetDTOs | method-call | buildFilterOptions -> FilterOptionDTO |
| ApexClass:FilterBuilder | ApexClass:AssetDTOs | method-call | buildFilterOptions -> ComboboxOption |
| ApexClass:FilterBuilder | External:FilterOptionDTO | type-reference |  |
| ApexClass:HealthScoreCalculatorTest | ApexClass:HealthScoreCalculator | method-call | testNormalScore -> calculateHealthScore |
| ApexClass:HealthScoreCalculatorTest | ApexClass:HealthScoreCalculator | test-reference |  |
| ApexClass:InfrastructureAlertTriggerHandler | CustomObject:Audit_Log__c | instantiation | handleEvents |
| ApexClass:InfrastructureAlertTriggerHandler | CustomObject:Infrastructure_Alert__e | generic-type | handleEvents |
| ApexClass:InfrastructureAlertTriggerHandler | CustomObject:Audit_Log__c | generic-type | handleEvents |
| ApexClass:InspectionSelector | External:StubProvider | type-reference |  |
| ApexClass:InspectionSelector | CustomObject:Inspection__c | generic-type |  |
| ApexClass:InspectionSelector | External:ContentDocumentLink | generic-type |  |
| ApexClass:InspectionSelector | External:ContentVersion | generic-type |  |
| ApexClass:InspectionSelector | CustomObject:Inspection_Response__c | generic-type |  |
| ApexClass:InspectionSelectorTest | CustomObject:Inspection__c | instantiation | testInspectionSelectorQueries |
| ApexClass:InspectionSelectorTest | ApexClass:TestDataFactory | method-call | testInspectionSelectorQueries -> createCityZone |
| ApexClass:InspectionSelectorTest | ApexClass:TestDataFactory | method-call | testInspectionSelectorQueries -> createInfrastructureAsset |
| ApexClass:InspectionSelectorTest | ApexClass:TestDataFactory | method-call | testInspectionSelectorQueries -> createMaintenanceRequest |
| ApexClass:InspectionSelectorTest | ApexClass:InspectionSelector | method-call | testInspectionSelectorQueries -> getInspectionsByAssetId |
| ApexClass:InspectionSelectorTest | ApexClass:InspectionSelector | method-call | testInspectionSelectorQueries -> getLastCompletedInspection |
| ApexClass:InspectionSelectorTest | ApexClass:InspectionSelector | method-call | testInspectionSelectorQueries -> getInspectionsByMaintenanceRequestId |
| ApexClass:InspectionSelectorTest | ApexClass:InspectionSelector | method-call | testInspectionSelectorQueries -> getInspectionsByMaintenanceRequestIds |
| ApexClass:InspectionSelectorTest | ApexClass:InspectionSelector | method-call | testInspectionSelectorQueries -> getInspectionWithMaintenanceRequest |
| ApexClass:InspectionSelectorTest | ApexClass:InspectionSelector | method-call | testInspectionSelectorQueries -> getInspectionsWithAssets |
| ApexClass:InspectionSelectorTest | ApexClass:InspectionSelector | method-call | testInspectionSelectorQueries -> getInspectionsWithResponsesAndAsset |
| ApexClass:InspectionSelectorTest | ApexClass:InspectionSelector | method-call | testInspectionSelectorQueries -> getPendingInspectionsWithEngineerEmail |
| ApexClass:InspectionSelectorTest | CustomObject:City_Zone__c | type-reference | testInspectionSelectorQueries |
| ApexClass:InspectionSelectorTest | CustomObject:Infrastructure_Asset__c | type-reference | testInspectionSelectorQueries |
| ApexClass:InspectionSelectorTest | CustomObject:Maintenance_Request__c | type-reference | testInspectionSelectorQueries |
| ApexClass:InspectionSelectorTest | CustomObject:Inspection__c | type-reference | testInspectionSelectorQueries |
| ApexClass:InspectionSelectorTest | CustomObject:Inspection__c | generic-type | testInspectionSelectorQueries |
| ApexClass:InspectionSelectorTest | ApexClass:TestDataFactory | test-reference |  |
| ApexClass:InspectionSelectorTest | ApexClass:InspectionSelector | test-reference |  |
| ApexClass:InspectionService | CustomObject:Inspection_Response__c | instantiation |  |
| ApexClass:InspectionService | CustomObject:Maintenance_Request__c | instantiation | updateMaintenanceRequestStatus |
| ApexClass:InspectionService | CustomObject:Inspection__c | instantiation | createInspectionResponses |
| ApexClass:InspectionService | External:StartInspectionWrapper | instantiation | startInspection |
| ApexClass:InspectionService | External:ChecklistQuestionWrapper | instantiation | getChecklistQuestions |
| ApexClass:InspectionService | External:OptionWrapper | instantiation | getChecklistQuestions |
| ApexClass:InspectionService | ApexClass:ChecklistSelector | method-call | createInspectionResponses -> getQuestionsByTemplateId |
| ApexClass:InspectionService | ApexClass:InspectionSelector | method-call | validateMandatoryPhotos -> getContentDocumentLinksByLinkedEntityIds |
| ApexClass:InspectionService | ApexClass:InspectionSelector | method-call | updateMaintenanceRequestStatus -> getInspectionsByMaintenanceRequestIds |
| ApexClass:InspectionService | ApexClass:InspectionSelector | method-call | calculateInspectionScore -> getResponsesByInspectionId |
| ApexClass:InspectionService | ApexClass:MaintenanceSelector | method-call | startInspection -> getMaintenanceRequestForUpdate |
| ApexClass:InspectionService | ApexClass:AssetSelector | method-call | getChecklistQuestions -> getAssetWithAssetTypeLookup |
| ApexClass:InspectionService | ApexClass:ChecklistSelector | method-call | getChecklistQuestions -> getActiveTemplateByAssetType |
| ApexClass:InspectionService | External:Org | method-call | getChecklistItems -> getPartition |
| ApexClass:InspectionService | ApexClass:ChecklistSelector | method-call | getChecklistItems -> getInspectionChecklistItems |
| ApexClass:InspectionService | ApexClass:InspectionSelector | method-call | getInspectionsWithResponsesAndAsset |
| ApexClass:InspectionService | ApexClass:EngineerAssignmentService | method-call | handleEngineerSkillReassignment |
| ApexClass:InspectionService | ApexClass:InspectionDomain | method-call | determineRepairNeeded -> determineRepairNeeded |
| ApexClass:InspectionService | ApexClass:ChecklistSelector | method-call | getChecklistQuestionsByIds |
| ApexClass:InspectionService | ApexClass:InspectionSelector | method-call | sendDailyReminders -> getPendingInspectionsWithEngineerEmail |
| ApexClass:InspectionService | ApexClass:NotificationService | method-call | sendDailyReminders -> sendEmail |
| ApexClass:InspectionService | CustomObject:Maintenance_Request__c | type-reference | updateMaintenanceRequestStatus |
| ApexClass:InspectionService | CustomObject:Inspection__c | type-reference | createInspectionResponses |
| ApexClass:InspectionService | External:SaveResult | type-reference | startInspection |
| ApexClass:InspectionService | External:StartInspectionWrapper | type-reference |  |
| ApexClass:InspectionService | External:QueryException | type-reference | startInspection |
| ApexClass:InspectionService | External:DmlException | type-reference | startInspection |
| ApexClass:InspectionService | CustomObject:Infrastructure_Asset__c | type-reference | getChecklistQuestions |
| ApexClass:InspectionService | External:ChecklistQuestionWrapper | type-reference |  |
| ApexClass:InspectionService | External:OptionWrapper | type-reference |  |
| ApexClass:InspectionService | External:OrgPartition | type-reference | getChecklistItems |
| ApexClass:InspectionService | External:InspectionSubmissionWrapper | type-reference |  |
| ApexClass:InspectionService | CustomObject:Checklist_Question__c | type-reference | createInspectionResponses |
| ApexClass:InspectionService | CustomObject:Checklist_Question__c | generic-type | createInspectionResponses |
| ApexClass:InspectionService | CustomObject:Inspection_Response__c | generic-type | createInspectionResponses |
| ApexClass:InspectionService | CustomObject:Inspection__c | generic-type | validateMandatoryPhotos |
| ApexClass:InspectionService | CustomObject:Maintenance_Request__c | generic-type | updateMaintenanceRequestStatus |
| ApexClass:InspectionService | External:OptionWrapper | generic-type |  |
| ApexClass:InspectionService | External:InspectionResponseWrapper | generic-type |  |
| ApexClass:InspectionService | External:ChecklistQuestionWrapper | generic-type |  |
| ApexClass:InspectionService | CustomObject:Infrastructure_Asset__c | generic-type | getChecklistQuestions |
| ApexClass:InspectionService | CustomObject:Checklist_Template__c | generic-type | getChecklistQuestions |
| ApexClass:InspectionService | CustomObject:Inspection_Checklist__c | generic-type |  |
| ApexClass:InspectionServiceTest | External:User | instantiation |  |
| ApexClass:InspectionServiceTest | CustomObject:Inspection__c | instantiation | testUpdateMaintenanceRequestStatusAllPassed |
| ApexClass:InspectionServiceTest | CustomObject:Checklist_Template__c | instantiation | testCreateInspectionResponsesAndScore |
| ApexClass:InspectionServiceTest | CustomObject:Checklist_Question__c | instantiation | testCreateInspectionResponsesAndScore |
| ApexClass:InspectionServiceTest | External:ContentVersion | instantiation | testAssetHealthScoreUpdatesOnCompletedInspection |
| ApexClass:InspectionServiceTest | External:ContentDocumentLink | instantiation | testAssetHealthScoreUpdatesOnCompletedInspection |
| ApexClass:InspectionServiceTest | ApexClass:TestDataFactory | method-call | testUpdateMaintenanceRequestStatusAllPassed -> createCityZone |
| ApexClass:InspectionServiceTest | ApexClass:TestDataFactory | method-call | testUpdateMaintenanceRequestStatusAllPassed -> createInfrastructureAsset |
| ApexClass:InspectionServiceTest | ApexClass:TestDataFactory | method-call | testUpdateMaintenanceRequestStatusAllPassed -> createMaintenanceRequest |
| ApexClass:InspectionServiceTest | ApexClass:InspectionService | method-call | testCreateInspectionResponsesAndScore -> createInspectionResponses |
| ApexClass:InspectionServiceTest | ApexClass:InspectionService | method-call | testCreateInspectionResponsesAndScore -> calculateInspectionScore |
| ApexClass:InspectionServiceTest | External:Profile | type-reference | createTestUser |
| ApexClass:InspectionServiceTest | External:UserRole | type-reference | createTestUser |
| ApexClass:InspectionServiceTest | External:User | type-reference |  |
| ApexClass:InspectionServiceTest | CustomObject:City_Zone__c | type-reference | testUpdateMaintenanceRequestStatusAllPassed |
| ApexClass:InspectionServiceTest | CustomObject:Infrastructure_Asset__c | type-reference | testUpdateMaintenanceRequestStatusAllPassed |
| ApexClass:InspectionServiceTest | CustomObject:Maintenance_Request__c | type-reference | testUpdateMaintenanceRequestStatusAllPassed |
| ApexClass:InspectionServiceTest | CustomObject:Inspection__c | type-reference | testUpdateMaintenanceRequestStatusAllPassed |
| ApexClass:InspectionServiceTest | External:DmlException | type-reference | testValidateMandatoryPhotos |
| ApexClass:InspectionServiceTest | CustomObject:Checklist_Template__c | type-reference | testCreateInspectionResponsesAndScore |
| ApexClass:InspectionServiceTest | CustomObject:Checklist_Question__c | type-reference | testCreateInspectionResponsesAndScore |
| ApexClass:InspectionServiceTest | External:ContentVersion | type-reference | testAssetHealthScoreUpdatesOnCompletedInspection |
| ApexClass:InspectionServiceTest | External:ContentDocumentLink | type-reference | testAssetHealthScoreUpdatesOnCompletedInspection |
| ApexClass:InspectionServiceTest | CustomObject:Inspection_Response__c | generic-type | testCreateInspectionResponsesAndScore |
| ApexClass:InspectionServiceTest | ApexClass:TestDataFactory | test-reference |  |
| ApexClass:InspectionServiceTest | ApexClass:InspectionService | test-reference |  |
| ApexClass:InspectionTriggerHandler | CustomObject:Infrastructure_Asset__c | instantiation |  |
| ApexClass:InspectionTriggerHandler | ApexClass:InspectionService | method-call | beforeUpdate -> validateMandatoryPhotos |
| ApexClass:InspectionTriggerHandler | ApexClass:TriggerGuard | method-call | autoCreateInspectionResponses -> hasBeenProcessed |
| ApexClass:InspectionTriggerHandler | ApexClass:TriggerGuard | method-call | autoCreateInspectionResponses -> markProcessed |
| ApexClass:InspectionTriggerHandler | ApexClass:InspectionSelector | method-call | getInspectionsWithAssets |
| ApexClass:InspectionTriggerHandler | ApexClass:InspectionService | method-call | calculateInspectionScore |
| ApexClass:InspectionTriggerHandler | ApexClass:InspectionDomain | method-call | getConditionFromScore |
| ApexClass:InspectionTriggerHandler | ApexClass:AuditLogService | method-call | createAuditLog |
| ApexClass:InspectionTriggerHandler | ApexClass:MaintenanceSelector | method-call | getMaintenanceRequestsWithAssetTypeLookup |
| ApexClass:InspectionTriggerHandler | ApexClass:ChecklistSelector | method-call | getActiveTemplatesByAssetTypes |
| ApexClass:InspectionTriggerHandler | ApexClass:ChecklistSelector | method-call | getFallbackTemplate |
| ApexClass:InspectionTriggerHandler | ApexClass:InspectionService | method-call | createInspectionResponses |
| ApexClass:InspectionTriggerHandler | ApexClass:InspectionService | method-call | updateMaintenanceRequestStatus |
| ApexClass:InspectionTriggerHandler | CustomObject:Inspection__c | type-reference | beforeInsert |
| ApexClass:InspectionTriggerHandler | CustomObject:Checklist_Template__c | type-reference |  |
| ApexClass:InspectionTriggerHandler | CustomObject:Inspection__c | generic-type | beforeInsert |
| ApexClass:InspectionTriggerHandler | CustomObject:Infrastructure_Asset__c | generic-type |  |
| ApexClass:InspectionTriggerHandler | CustomObject:Checklist_Template__c | generic-type |  |
| ApexClass:InspectionTriggerHandlerTest | CustomObject:City_Zone__c | instantiation | testInspectionTriggerHandlerMethods |
| ApexClass:InspectionTriggerHandlerTest | CustomObject:Checklist_Template__c | instantiation | testInspectionTriggerHandlerMethods |
| ApexClass:InspectionTriggerHandlerTest | CustomObject:Checklist_Question__c | instantiation | testInspectionTriggerHandlerMethods |
| ApexClass:InspectionTriggerHandlerTest | CustomObject:Infrastructure_Asset__c | instantiation | testInspectionTriggerHandlerMethods |
| ApexClass:InspectionTriggerHandlerTest | CustomObject:Maintenance_Request__c | instantiation | testInspectionTriggerHandlerMethods |
| ApexClass:InspectionTriggerHandlerTest | CustomObject:Inspection__c | instantiation | testInspectionTriggerHandlerMethods |
| ApexClass:InspectionTriggerHandlerTest | External:ContentVersion | instantiation | testInspectionTriggerHandlerMethods |
| ApexClass:InspectionTriggerHandlerTest | External:ContentDocumentLink | instantiation | testInspectionTriggerHandlerMethods |
| ApexClass:InspectionTriggerHandlerTest | CustomObject:City_Zone__c | type-reference | testInspectionTriggerHandlerMethods |
| ApexClass:InspectionTriggerHandlerTest | CustomObject:Checklist_Template__c | type-reference | testInspectionTriggerHandlerMethods |
| ApexClass:InspectionTriggerHandlerTest | CustomObject:Checklist_Question__c | type-reference | testInspectionTriggerHandlerMethods |
| ApexClass:InspectionTriggerHandlerTest | CustomObject:Infrastructure_Asset__c | type-reference | testInspectionTriggerHandlerMethods |
| ApexClass:InspectionTriggerHandlerTest | CustomObject:Maintenance_Request__c | type-reference | testInspectionTriggerHandlerMethods |
| ApexClass:InspectionTriggerHandlerTest | CustomObject:Inspection__c | type-reference | testInspectionTriggerHandlerMethods |
| ApexClass:InspectionTriggerHandlerTest | External:ContentVersion | type-reference | testInspectionTriggerHandlerMethods |
| ApexClass:InspectionTriggerHandlerTest | External:ContentDocumentLink | type-reference | testInspectionTriggerHandlerMethods |
| ApexClass:InspectionTriggerHandlerTest | CustomObject:Inspection_Response__c | generic-type | testInspectionTriggerHandlerMethods |
| ApexClass:MaintenanceRequestController | CustomObject:Maintenance_Request__c | instantiation |  |
| ApexClass:MaintenanceRequestController | ApexClass:MaintenanceSelector | method-call | getAllRequests -> getAllRequestsSortedByCreatedDate |
| ApexClass:MaintenanceRequestController | ApexClass:MaintenanceService | method-call | verifyAndResolveRequest -> verifyAndResolveRequest |
| ApexClass:MaintenanceRequestController | CustomObject:Maintenance_Request__c | type-reference |  |
| ApexClass:MaintenanceRequestController | CustomObject:Maintenance_Request__c | generic-type |  |
| ApexClass:MaintenanceRequestControllerTest | External:User | instantiation |  |
| ApexClass:MaintenanceRequestControllerTest | CustomObject:Infrastructure_Asset__c | instantiation | testGetAllRequestsAndStatusUpdate |
| ApexClass:MaintenanceRequestControllerTest | CustomObject:Maintenance_Request__c | instantiation | testGetAllRequestsAndStatusUpdate |
| ApexClass:MaintenanceRequestControllerTest | ApexClass:MaintenanceRequestController | method-call | testGetAllRequestsAndStatusUpdate -> getAllRequests |
| ApexClass:MaintenanceRequestControllerTest | ApexClass:MaintenanceRequestController | method-call | testGetAllRequestsAndStatusUpdate -> updateRequestStatus |
| ApexClass:MaintenanceRequestControllerTest | ApexClass:MaintenanceRequestController | method-call | testVerifyAndResolveRequest -> verifyAndResolveRequest |
| ApexClass:MaintenanceRequestControllerTest | External:Message__c | method-call | testVerifyAndResolveRequestRemarksEdgeCases -> contains |
| ApexClass:MaintenanceRequestControllerTest | External:Profile | type-reference | createTestUser |
| ApexClass:MaintenanceRequestControllerTest | External:UserRole | type-reference | createTestUser |
| ApexClass:MaintenanceRequestControllerTest | CustomObject:Infrastructure_Asset__c | type-reference | testGetAllRequestsAndStatusUpdate |
| ApexClass:MaintenanceRequestControllerTest | CustomObject:Maintenance_Request__c | type-reference | testGetAllRequestsAndStatusUpdate |
| ApexClass:MaintenanceRequestControllerTest | External:User | type-reference |  |
| ApexClass:MaintenanceRequestControllerTest | CustomObject:Maintenance_Request__c | generic-type | testGetAllRequestsAndStatusUpdate |
| ApexClass:MaintenanceRequestControllerTest | CustomObject:Audit_Log__c | generic-type | testVerifyAndResolveRequestRemarksEdgeCases |
| ApexClass:MaintenanceRequestControllerTest | ApexClass:MaintenanceRequestController | test-reference |  |
| ApexClass:MaintenanceRequestDomain | CustomObject:Maintenance_Request__c | generic-type | validateEngineerAssignment |
| ApexClass:MaintenanceRequestQueueable | ApexClass:MaintenanceSelector | method-call | execute -> getMaintenanceRequestsByIds |
| ApexClass:MaintenanceRequestQueueable | External:QueueableContext | type-reference | execute |
| ApexClass:MaintenanceRequestQueueable | CustomObject:Maintenance_Request__c | generic-type | execute |
| ApexClass:MaintenanceRequestQueueable | External:Queueable | implements |  |
| ApexClass:MaintenanceRequestQueueable | External:Database.AllowsCallouts | implements |  |
| ApexClass:MaintenanceRequestQueueable | ApexClass:QueueableDuplicateSignature | implements |  |
| ApexClass:MaintenanceRequestQueueableTest | CustomObject:Maintenance_Request__c | instantiation | testQueueableExecution |
| ApexClass:MaintenanceRequestQueueableTest | ApexClass:MaintenanceRequestQueueable | instantiation |  |
| ApexClass:MaintenanceRequestQueueableTest | CustomObject:Maintenance_Request__c | type-reference | testQueueableExecution |
| ApexClass:MaintenanceRequestQueueableTest | ApexClass:MaintenanceRequestQueueable | test-reference |  |
| ApexClass:MaintenanceRequestSharingService | External:Maintenance_Request__Share | instantiation | shareRecordProgrammatically |
| ApexClass:MaintenanceRequestSharingService | External:Maintenance_Request__Share | type-reference | shareRecordProgrammatically |
| ApexClass:MaintenanceRequestSharingService | External:Maintenance_Request__Share | generic-type | shareRecordsInBulk |
| ApexClass:MaintenanceRequestSharingServiceTest | CustomObject:Maintenance_Request__c | instantiation | testSharingOperations |
| ApexClass:MaintenanceRequestSharingServiceTest | ApexClass:MaintenanceRequestSharingService | method-call | testSharingOperations -> shareRecordProgrammatically |
| ApexClass:MaintenanceRequestSharingServiceTest | ApexClass:MaintenanceRequestSharingService | method-call | testSharingOperations -> shareRecordsInBulk |
| ApexClass:MaintenanceRequestSharingServiceTest | CustomObject:Maintenance_Request__c | type-reference | testSharingOperations |
| ApexClass:MaintenanceRequestSharingServiceTest | External:Maintenance_Request__Share | generic-type | testSharingOperations |
| ApexClass:MaintenanceRequestSharingServiceTest | ApexClass:MaintenanceRequestSharingService | test-reference |  |
| ApexClass:MaintenanceRequestTriggerHandler | ApexClass:MaintenanceRequestQueueable | instantiation | afterInsert |
| ApexClass:MaintenanceRequestTriggerHandler | ApexClass:SLAService | method-call | beforeInsert -> applySLAPolicy |
| ApexClass:MaintenanceRequestTriggerHandler | ApexClass:EngineerAssignmentService | method-call | beforeInsert -> autoAssignEngineer |
| ApexClass:MaintenanceRequestTriggerHandler | ApexClass:EngineerAssignmentService | method-call | afterInsert -> createMaintenanceRequestShares |
| ApexClass:MaintenanceRequestTriggerHandler | ApexClass:EngineerAssignmentService | method-call | beforeUpdate -> handleWorkloadAdjustments |
| ApexClass:MaintenanceRequestTriggerHandler | ApexClass:TriggerGuard | method-call | afterUpdate -> hasBeenProcessed |
| ApexClass:MaintenanceRequestTriggerHandler | ApexClass:TriggerGuard | method-call | afterUpdate -> markProcessed |
| ApexClass:MaintenanceRequestTriggerHandler | ApexClass:EngineerAssignmentService | method-call | afterUpdate -> handleSharingOnReassignment |
| ApexClass:MaintenanceRequestTriggerHandler | ApexClass:EngineerAssignmentService | method-call | afterUpdate -> syncCitizenRequestsStatus |
| ApexClass:MaintenanceRequestTriggerHandler | ApexClass:EngineerAssignmentService | method-call | afterUpdate -> createAssignmentHistoryOnUpdate |
| ApexClass:MaintenanceRequestTriggerHandler | CustomObject:Maintenance_Request__c | type-reference | beforeInsert |
| ApexClass:MaintenanceRequestTriggerHandler | CustomObject:Maintenance_Request__c | generic-type | beforeInsert |
| ApexClass:MaintenanceRequestTriggerHandlerTest | CustomObject:Infrastructure_Asset__c | instantiation | testMaintenanceRequestInsertCriticalSLA |
| ApexClass:MaintenanceRequestTriggerHandlerTest | CustomObject:Maintenance_Request__c | instantiation | testMaintenanceRequestInsertCriticalSLA |
| ApexClass:MaintenanceRequestTriggerHandlerTest | External:User | instantiation | testMaintenanceRequestAutoAssignAndSharing |
| ApexClass:MaintenanceRequestTriggerHandlerTest | CustomObject:City_Zone__c | instantiation | testMaintenanceRequestAutoAssignAndSharing |
| ApexClass:MaintenanceRequestTriggerHandlerTest | CustomObject:Field_Engineer__c | instantiation | testMaintenanceRequestAutoAssignAndSharing |
| ApexClass:MaintenanceRequestTriggerHandlerTest | CustomObject:Citizen_Request__c | instantiation | testMaintenanceRequestAutoAssignAndSharing |
| ApexClass:MaintenanceRequestTriggerHandlerTest | CustomObject:Infrastructure_Asset__c | type-reference | testMaintenanceRequestInsertCriticalSLA |
| ApexClass:MaintenanceRequestTriggerHandlerTest | CustomObject:Maintenance_Request__c | type-reference | testMaintenanceRequestInsertCriticalSLA |
| ApexClass:MaintenanceRequestTriggerHandlerTest | External:User | type-reference | testMaintenanceRequestAutoAssignAndSharing |
| ApexClass:MaintenanceRequestTriggerHandlerTest | External:Profile | type-reference | testMaintenanceRequestAutoAssignAndSharing |
| ApexClass:MaintenanceRequestTriggerHandlerTest | CustomObject:City_Zone__c | type-reference | testMaintenanceRequestAutoAssignAndSharing |
| ApexClass:MaintenanceRequestTriggerHandlerTest | CustomObject:Field_Engineer__c | type-reference | testMaintenanceRequestAutoAssignAndSharing |
| ApexClass:MaintenanceRequestTriggerHandlerTest | CustomObject:Citizen_Request__c | type-reference | testMaintenanceRequestAutoAssignAndSharing |
| ApexClass:MaintenanceRequestTriggerHandlerTest | External:Maintenance_Request__Share | generic-type | testMaintenanceRequestAutoAssignAndSharing |
| ApexClass:MaintenanceRequestTriggerHandlerTest | CustomObject:Maintenance_Request__c | generic-type | testBulkMaintenanceRequestInsert |
| ApexClass:MaintenanceRequestTriggerHandlerTest | External:User | generic-type | testMaintenanceRequestUpdateWorkflow |
| ApexClass:MaintenanceRequestTriggerHandlerTest | CustomObject:Field_Engineer__c | generic-type | testMaintenanceRequestUpdateWorkflow |
| ApexClass:MaintenanceRequestTriggerHandlerTest | CustomObject:Assignment_History__c | generic-type | testMaintenanceRequestUpdateWorkflow |
| ApexClass:MaintenanceSelector | ApexClass:UserContextResolver | method-call | validateSessionRights -> getCurrentUserContext |
| ApexClass:MaintenanceSelector | External:StubProvider | type-reference |  |
| ApexClass:MaintenanceSelector | ApexClass:UserContext | type-reference | validateSessionRights |
| ApexClass:MaintenanceSelector | CustomObject:Maintenance_Request__c | generic-type |  |
| ApexClass:MaintenanceSelectorTest | ApexClass:TestDataFactory | method-call | testMaintenanceSelectorQueries -> createCityZone |
| ApexClass:MaintenanceSelectorTest | ApexClass:TestDataFactory | method-call | testMaintenanceSelectorQueries -> createInfrastructureAsset |
| ApexClass:MaintenanceSelectorTest | ApexClass:TestDataFactory | method-call | testMaintenanceSelectorQueries -> createMaintenanceRequest |
| ApexClass:MaintenanceSelectorTest | ApexClass:MaintenanceSelector | method-call | testMaintenanceSelectorQueries -> getMaintenanceRequestsByAssetId |
| ApexClass:MaintenanceSelectorTest | ApexClass:MaintenanceSelector | method-call | testMaintenanceSelectorQueries -> getMaintenanceRequestById |
| ApexClass:MaintenanceSelectorTest | ApexClass:MaintenanceSelector | method-call | testMaintenanceSelectorQueries -> getMaintenanceRequestsByIds |
| ApexClass:MaintenanceSelectorTest | ApexClass:MaintenanceSelector | method-call | testMaintenanceSelectorQueries -> getAllRequestsSortedByCreatedDate |
| ApexClass:MaintenanceSelectorTest | ApexClass:MaintenanceSelector | method-call | testMaintenanceSelectorQueries -> getMaintenanceRequestForVerification |
| ApexClass:MaintenanceSelectorTest | ApexClass:MaintenanceSelector | method-call | testMaintenanceSelectorQueries -> getMaintenanceRequestForCitizenDetails |
| ApexClass:MaintenanceSelectorTest | ApexClass:MaintenanceSelector | method-call | testMaintenanceSelectorQueries -> getMaintenanceRequestsWithAssetTypeLookup |
| ApexClass:MaintenanceSelectorTest | ApexClass:MaintenanceSelector | method-call | testMaintenanceSelectorQueries -> getMaintenanceRequestsWithAssetAndEngineer |
| ApexClass:MaintenanceSelectorTest | ApexClass:MaintenanceSelector | method-call | testMaintenanceSelectorQueries -> validateSessionRights |
| ApexClass:MaintenanceSelectorTest | CustomObject:City_Zone__c | type-reference | testMaintenanceSelectorQueries |
| ApexClass:MaintenanceSelectorTest | CustomObject:Infrastructure_Asset__c | type-reference | testMaintenanceSelectorQueries |
| ApexClass:MaintenanceSelectorTest | CustomObject:Maintenance_Request__c | type-reference | testMaintenanceSelectorQueries |
| ApexClass:MaintenanceSelectorTest | CustomObject:Maintenance_Request__c | generic-type | testMaintenanceSelectorQueries |
| ApexClass:MaintenanceSelectorTest | ApexClass:TestDataFactory | test-reference |  |
| ApexClass:MaintenanceSelectorTest | ApexClass:MaintenanceSelector | test-reference |  |
| ApexClass:MaintenanceService | CustomObject:Audit_Log__c | instantiation | verifyAndResolveRequest |
| ApexClass:MaintenanceService | ApexClass:MaintenanceSelector | method-call | getTimeline -> getMaintenanceRequestsWithAssetAndEngineer |
| ApexClass:MaintenanceService | ApexClass:MaintenanceSelector | method-call | verifyAndResolveRequest -> getMaintenanceRequestForVerification |
| ApexClass:MaintenanceService | ApexClass:ManagementNotificationService | method-call | verifyAndResolveRequest -> sendNotification |
| ApexClass:MaintenanceService | CustomObject:Maintenance_Request__c | type-reference |  |
| ApexClass:MaintenanceService | CustomObject:Audit_Log__c | type-reference | verifyAndResolveRequest |
| ApexClass:MaintenanceService | CustomObject:Maintenance_Request__c | generic-type | getTimeline |
| ApexClass:MaintenanceServiceTest | External:User | instantiation |  |
| ApexClass:MaintenanceServiceTest | CustomObject:Asset_Type__c | instantiation | setup |
| ApexClass:MaintenanceServiceTest | ApexClass:TestDataFactory | method-call | setup -> createCityZone |
| ApexClass:MaintenanceServiceTest | ApexClass:TestDataFactory | method-call | setup -> createInfrastructureAsset |
| ApexClass:MaintenanceServiceTest | ApexClass:TestDataFactory | method-call | setup -> createCitizenRequest |
| ApexClass:MaintenanceServiceTest | ApexClass:TestDataFactory | method-call | testMaintenanceServiceBasicLogic -> createMaintenanceRequest |
| ApexClass:MaintenanceServiceTest | ApexClass:MaintenanceSelector | method-call | testMaintenanceServiceBasicLogic -> getMaintenanceRequestById |
| ApexClass:MaintenanceServiceTest | External:Profile | type-reference | createTestUser |
| ApexClass:MaintenanceServiceTest | External:UserRole | type-reference | createTestUser |
| ApexClass:MaintenanceServiceTest | CustomObject:City_Zone__c | type-reference | setup |
| ApexClass:MaintenanceServiceTest | CustomObject:Asset_Type__c | type-reference | setup |
| ApexClass:MaintenanceServiceTest | CustomObject:Infrastructure_Asset__c | type-reference | setup |
| ApexClass:MaintenanceServiceTest | CustomObject:Citizen_Request__c | type-reference | setup |
| ApexClass:MaintenanceServiceTest | External:User | type-reference |  |
| ApexClass:MaintenanceServiceTest | CustomObject:Maintenance_Request__c | type-reference | testMaintenanceServiceBasicLogic |
| ApexClass:MaintenanceServiceTest | ApexClass:TestDataFactory | test-reference |  |
| ApexClass:MaintenanceServiceTest | ApexClass:MaintenanceSelector | test-reference |  |
| ApexClass:ManagementApprovalService | CustomObject:Maintenance_Approval__c | instantiation |  |
| ApexClass:ManagementApprovalService | ApexClass:MaintenanceSelector | method-call | getPendingRequests -> getPendingRequestsByStatus |
| ApexClass:ManagementApprovalService | ApexClass:MaintenanceSelector | method-call | submitEstimate -> getMaintenanceRequestForApproval |
| ApexClass:ManagementApprovalService | ApexClass:UserContextResolver | method-call | getCurrentUserContext |
| ApexClass:ManagementApprovalService | CustomObject:Maintenance_Request__c | type-reference |  |
| ApexClass:ManagementApprovalService | ApexClass:UserContext | type-reference |  |
| ApexClass:ManagementApprovalService | CustomObject:Maintenance_Approval__c | type-reference |  |
| ApexClass:ManagementApprovalService | CustomObject:Maintenance_Request__c | generic-type |  |
| ApexClass:ManagementApprovalServiceTest | CustomObject:Maintenance_Request__c | instantiation | testSubmitEstimate |
| ApexClass:ManagementApprovalServiceTest | ApexClass:ManagementApprovalService | method-call | testSubmitEstimate -> submitEstimate |
| ApexClass:ManagementApprovalServiceTest | ApexClass:ManagementApprovalService | method-call | testApproveAndReject -> approve |
| ApexClass:ManagementApprovalServiceTest | ApexClass:ManagementApprovalService | method-call | testApproveAndReject -> reject |
| ApexClass:ManagementApprovalServiceTest | CustomObject:Maintenance_Request__c | type-reference | testSubmitEstimate |
| ApexClass:ManagementApprovalServiceTest | External:Request | type-reference | testSubmitEstimate |
| ApexClass:ManagementApprovalServiceTest | CustomObject:Maintenance_Request__c | generic-type | testSubmitEstimate |
| ApexClass:ManagementApprovalServiceTest | ApexClass:ManagementApprovalService | test-reference |  |
| ApexClass:ManagementAssignmentService | CustomObject:Assignment_History__c | instantiation |  |
| ApexClass:ManagementAssignmentService | ApexClass:MaintenanceSelector | method-call | assignEngineer -> getMaintenanceRequestWithEngineerAndStatus |
| ApexClass:ManagementAssignmentService | CustomObject:Maintenance_Request__c | type-reference | assignEngineer |
| ApexClass:ManagementAssignmentService | CustomObject:Assignment_History__c | type-reference |  |
| ApexClass:ManagementAssignmentServiceTest | External:User | instantiation | testAssignAndReassignEngineer |
| ApexClass:ManagementAssignmentServiceTest | CustomObject:Maintenance_Request__c | instantiation | testAssignAndReassignEngineer |
| ApexClass:ManagementAssignmentServiceTest | CustomObject:Field_Engineer__c | instantiation | testAssignAndReassignEngineer |
| ApexClass:ManagementAssignmentServiceTest | ApexClass:ManagementAssignmentService | method-call | testAssignAndReassignEngineer -> assignEngineer |
| ApexClass:ManagementAssignmentServiceTest | ApexClass:ManagementAssignmentService | method-call | testAssignAndReassignEngineer -> reassignEngineer |
| ApexClass:ManagementAssignmentServiceTest | External:User | type-reference | testAssignAndReassignEngineer |
| ApexClass:ManagementAssignmentServiceTest | External:Profile | type-reference | testAssignAndReassignEngineer |
| ApexClass:ManagementAssignmentServiceTest | CustomObject:Maintenance_Request__c | type-reference | testAssignAndReassignEngineer |
| ApexClass:ManagementAssignmentServiceTest | CustomObject:Field_Engineer__c | type-reference | testAssignAndReassignEngineer |
| ApexClass:ManagementAssignmentServiceTest | CustomObject:Field_Engineer__c | generic-type | testAssignAndReassignEngineer |
| ApexClass:ManagementAssignmentServiceTest | CustomObject:Assignment_History__c | generic-type | testAssignAndReassignEngineer |
| ApexClass:ManagementAssignmentServiceTest | ApexClass:ManagementAssignmentService | test-reference |  |
| ApexClass:ManagementDashboardController | ApexClass:ZoneUtil | method-call | getDashboardData -> getUserZoneId |
| ApexClass:ManagementDashboardController | ApexClass:ZoneSelector | method-call | getDashboardData -> getZonesByIds |
| ApexClass:ManagementDashboardController | ApexClass:MaintenanceSelector | method-call | getDashboardData -> getRequestCountByStatusAndZone |
| ApexClass:ManagementDashboardController | ApexClass:MaintenanceSelector | method-call | getDashboardData -> getRequestCountCreatedTodayByZone |
| ApexClass:ManagementDashboardController | ApexClass:MaintenanceSelector | method-call | getDashboardData -> getCriticalRequestCountByZoneAndOpenStatus |
| ApexClass:ManagementDashboardController | ApexClass:MaintenanceSelector | method-call | getDashboardData -> getOverdueRequestCountByZone |
| ApexClass:ManagementDashboardController | ApexClass:MaintenanceSelector | method-call | getDashboardData -> getRequestCountByStatus |
| ApexClass:ManagementDashboardController | ApexClass:MaintenanceSelector | method-call | getDashboardData -> getRequestCountCreatedToday |
| ApexClass:ManagementDashboardController | ApexClass:MaintenanceSelector | method-call | getDashboardData -> getTotalCriticalRequestCount |
| ApexClass:ManagementDashboardController | ApexClass:MaintenanceSelector | method-call | getDashboardData -> getOverdueRequestCount |
| ApexClass:ManagementDashboardController | ApexClass:MaintenanceSelector | method-call | getPrioritySlaBreaches -> getPrioritySlaBreachesByZoneAndCutoff |
| ApexClass:ManagementDashboardController | ApexClass:MaintenanceSelector | method-call | getPendingEstimateApprovals -> getPendingEstimateApprovalsByZone |
| ApexClass:ManagementDashboardController | ApexClass:MaintenanceSelector | method-call | getOpenCitizenIntake -> getOpenCitizenIntakeByZone |
| ApexClass:ManagementDashboardController | ApexClass:ZoneUtil | method-call | getFilterOptions -> getAvailableFilterOptions |
| ApexClass:ManagementDashboardController | CustomObject:City_Zone__c | generic-type | getDashboardData |
| ApexClass:ManagementDashboardController | CustomObject:Maintenance_Request__c | generic-type |  |
| ApexClass:ManagementDashboardControllerTest | CustomObject:City_Zone__c | instantiation | testGetDashboardDataWithRecords |
| ApexClass:ManagementDashboardControllerTest | CustomObject:Infrastructure_Asset__c | instantiation | testGetDashboardDataWithRecords |
| ApexClass:ManagementDashboardControllerTest | CustomObject:Maintenance_Request__c | instantiation | testGetDashboardDataWithRecords |
| ApexClass:ManagementDashboardControllerTest | ApexClass:ManagementDashboardController | method-call | testGetDashboardDataNullZone -> getDashboardData |
| ApexClass:ManagementDashboardControllerTest | ApexClass:ManagementDashboardController | method-call | testGetFilterOptions -> getFilterOptions |
| ApexClass:ManagementDashboardControllerTest | CustomObject:City_Zone__c | type-reference | testGetDashboardDataWithRecords |
| ApexClass:ManagementDashboardControllerTest | CustomObject:Infrastructure_Asset__c | type-reference | testGetDashboardDataWithRecords |
| ApexClass:ManagementDashboardControllerTest | CustomObject:Maintenance_Request__c | type-reference | testGetDashboardDataWithRecords |
| ApexClass:ManagementDashboardControllerTest | CustomObject:Maintenance_Request__c | generic-type | testGetDashboardDataWithRecords |
| ApexClass:ManagementDashboardControllerTest | ApexClass:ManagementDashboardController | test-reference |  |
| ApexClass:ManagementEscalationService | CustomObject:Escalation__c | instantiation | createEscalation |
| ApexClass:ManagementEscalationService | CustomObject:Infrastructure_Alert__e | instantiation | createEscalation |
| ApexClass:ManagementEscalationService | ApexClass:AuditLogService | method-call | createEscalation -> createAuditLog |
| ApexClass:ManagementEscalationService | ApexClass:EscalationSelector | method-call | resolveEscalation -> getEscalationById |
| ApexClass:ManagementEscalationService | CustomObject:Escalation__c | type-reference | createEscalation |
| ApexClass:ManagementEscalationService | CustomObject:Infrastructure_Alert__e | type-reference | createEscalation |
| ApexClass:ManagementEscalationService | CustomObject:Escalation__c | generic-type | resolveEscalation |
| ApexClass:ManagementEscalationServiceTest | CustomObject:Maintenance_Request__c | instantiation | testCreateAndResolveEscalation |
| ApexClass:ManagementEscalationServiceTest | ApexClass:ManagementEscalationService | method-call | testCreateAndResolveEscalation -> createEscalation |
| ApexClass:ManagementEscalationServiceTest | External:Message__c | method-call | testCreateAndResolveEscalation -> contains |
| ApexClass:ManagementEscalationServiceTest | ApexClass:ManagementEscalationService | method-call | testCreateAndResolveEscalation -> resolveEscalation |
| ApexClass:ManagementEscalationServiceTest | CustomObject:Maintenance_Request__c | type-reference | testCreateAndResolveEscalation |
| ApexClass:ManagementEscalationServiceTest | CustomObject:Escalation__c | type-reference | testCreateAndResolveEscalation |
| ApexClass:ManagementEscalationServiceTest | CustomObject:Audit_Log__c | generic-type | testCreateAndResolveEscalation |
| ApexClass:ManagementEscalationServiceTest | ApexClass:ManagementEscalationService | test-reference |  |
| ApexClass:ManagementNotificationService | CustomObject:Notification__c | instantiation | sendNotification |
| ApexClass:ManagementNotificationService | CustomObject:Notification__c | type-reference |  |
| ApexClass:ManagementNotificationService | External:DmlException | type-reference | sendNotification |
| ApexClass:ManagementNotificationServiceTest | External:User | instantiation | testSendNotification |
| ApexClass:ManagementNotificationServiceTest | ApexClass:ManagementNotificationService | method-call | testSendNotification -> sendNotification |
| ApexClass:ManagementNotificationServiceTest | External:User | type-reference | testSendNotification |
| ApexClass:ManagementNotificationServiceTest | External:Profile | type-reference | testSendNotification |
| ApexClass:ManagementNotificationServiceTest | CustomObject:Notification__c | generic-type | testSendNotification |
| ApexClass:ManagementNotificationServiceTest | ApexClass:ManagementNotificationService | test-reference |  |
| ApexClass:ManagementWorkflowHandler | ApexClass:MaintenanceSelector | method-call | handleInspectionResult -> getMaintenanceRequestById |
| ApexClass:ManagementWorkflowHandler | CustomObject:Maintenance_Request__c | type-reference | handleInspectionResult |
| ApexClass:ManagementWorkflowHandler | CustomObject:Maintenance_Request__c | generic-type | handleZoneManagerApprovals |
| ApexClass:ManagementWorkflowHandlerTest | CustomObject:Maintenance_Request__c | instantiation | testInspectionFailureWorkflow |
| ApexClass:ManagementWorkflowHandlerTest | CustomObject:Inspection__c | instantiation | testInspectionFailureWorkflow |
| ApexClass:ManagementWorkflowHandlerTest | External:User | instantiation | testEstimateRouting |
| ApexClass:ManagementWorkflowHandlerTest | ApexClass:ManagementWorkflowHandler | method-call | testEstimateRouting -> processEstimate |
| ApexClass:ManagementWorkflowHandlerTest | ApexClass:ManagementWorkflowHandler | method-call | testHandleInspectionResultSuccess -> handleInspectionResult |
| ApexClass:ManagementWorkflowHandlerTest | CustomObject:Maintenance_Request__c | type-reference | testInspectionFailureWorkflow |
| ApexClass:ManagementWorkflowHandlerTest | CustomObject:Inspection__c | type-reference | testInspectionFailureWorkflow |
| ApexClass:ManagementWorkflowHandlerTest | External:Profile | type-reference | testEstimateRouting |
| ApexClass:ManagementWorkflowHandlerTest | External:User | type-reference | testEstimateRouting |
| ApexClass:ManagementWorkflowHandlerTest | CustomObject:Maintenance_Request__c | generic-type | testProcessEstimateBoundaries |
| ApexClass:ManagementWorkflowHandlerTest | ApexClass:ManagementWorkflowHandler | test-reference |  |
| ApexClass:MapBuilder | ApexClass:AssetDTOs | method-call | buildHealthMapMarkers -> HealthMapMarkerDTO |
| ApexClass:MapBuilder | ApexClass:AssetDTOs | method-call | buildHealthMapMarkers -> LocationDTO |
| ApexClass:MapBuilder | ApexClass:AssetDTOs | method-call | buildExplorerMapMarkers -> AssetMapMarkerDTO |
| ApexClass:MapBuilder | External:HealthMapMarkerDTO | type-reference |  |
| ApexClass:MapBuilder | External:AssetMapMarkerDTO | type-reference |  |
| ApexClass:MapBuilder | CustomObject:Infrastructure_Asset__c | generic-type | buildHealthMapMarkers |
| ApexClass:NotificationCenterController | ApexClass:NotificationService | method-call | getRecentAlerts -> getRecentAlerts |
| ApexClass:NotificationCenterController | CustomObject:Audit_Log__c | generic-type |  |
| ApexClass:NotificationCenterControllerTest | CustomObject:Audit_Log__c | instantiation | testGetRecentAlerts |
| ApexClass:NotificationCenterControllerTest | ApexClass:NotificationCenterController | method-call | testGetRecentAlerts -> getRecentAlerts |
| ApexClass:NotificationCenterControllerTest | CustomObject:Audit_Log__c | type-reference | testGetRecentAlerts |
| ApexClass:NotificationCenterControllerTest | CustomObject:Audit_Log__c | generic-type | testGetRecentAlerts |
| ApexClass:NotificationCenterControllerTest | ApexClass:NotificationCenterController | test-reference |  |
| ApexClass:NotificationDomain | CustomObject:Notification__c | type-reference | enforceReadToggle |
| ApexClass:NotificationDomain | CustomObject:Notification__c | generic-type | enforceReadToggle |
| ApexClass:NotificationSecurity | ApexClass:NotificationDomain | method-call | enforceReadToggle -> enforceReadToggle |
| ApexClass:NotificationSecurity | CustomObject:Notification__c | generic-type | enforceReadToggle |
| ApexClass:NotificationSecurityTest | External:User | instantiation |  |
| ApexClass:NotificationSecurityTest | CustomObject:Notification__c | instantiation | testRecipientCanToggleIsRead |
| ApexClass:NotificationSecurityTest | ApexClass:NotificationSecurity | method-call | testNotificationSecurityEdgeCases -> enforceReadToggle |
| ApexClass:NotificationSecurityTest | External:Profile | type-reference | createTestUser |
| ApexClass:NotificationSecurityTest | External:UserRole | type-reference | createTestUser |
| ApexClass:NotificationSecurityTest | External:User | type-reference |  |
| ApexClass:NotificationSecurityTest | CustomObject:Notification__c | type-reference | testRecipientCanToggleIsRead |
| ApexClass:NotificationSecurityTest | External:DmlException | type-reference | testNonRecipientCannotToggleIsRead |
| ApexClass:NotificationSecurityTest | External:Updated | type-reference | testRecipientCanToggleIsRead |
| ApexClass:NotificationSecurityTest | External:User | generic-type | testNonRecipientCannotToggleIsRead |
| ApexClass:NotificationSecurityTest | CustomObject:Notification__c | generic-type | testNotificationSecurityEdgeCases |
| ApexClass:NotificationSecurityTest | ApexClass:NotificationSecurity | test-reference |  |
| ApexClass:NotificationSecurityTriggerTest | External:User | instantiation |  |
| ApexClass:NotificationSecurityTriggerTest | CustomObject:Notification__c | instantiation | testTriggerBlocksUnauthorizedToggle |
| ApexClass:NotificationSecurityTriggerTest | External:Profile | type-reference | createTestUser |
| ApexClass:NotificationSecurityTriggerTest | External:UserRole | type-reference | createTestUser |
| ApexClass:NotificationSecurityTriggerTest | External:User | type-reference |  |
| ApexClass:NotificationSecurityTriggerTest | CustomObject:Notification__c | type-reference | testTriggerBlocksUnauthorizedToggle |
| ApexClass:NotificationSecurityTriggerTest | External:DmlException | type-reference | testTriggerBlocksUnauthorizedToggle |
| ApexClass:NotificationSecurityTriggerTest | External:User | generic-type | testTriggerBlocksUnauthorizedToggle |
| ApexClass:NotificationSelector | External:Notification__Share | generic-type |  |
| ApexClass:NotificationService | ApexClass:SendSMSQueueable | instantiation | sendSMS |
| ApexClass:NotificationService | ApexClass:AuditLogService | method-call | sendEmail -> createAuditLog |
| ApexClass:NotificationService | ApexClass:AuditLogService | method-call | sendEmail -> logError |
| ApexClass:NotificationService | ApexClass:AuditLogSelector | method-call | getRecentAlerts -> getRecentAlerts |
| ApexClass:NotificationService | External:EmailException | type-reference | sendEmail |
| ApexClass:NotificationService | CustomObject:Audit_Log__c | generic-type |  |
| ApexClass:NotificationServiceTest | ApexClass:NotificationService | method-call | testNotifications -> sendEmail |
| ApexClass:NotificationServiceTest | ApexClass:NotificationService | method-call | testNotifications -> sendSMS |
| ApexClass:NotificationServiceTest | ApexClass:NotificationService | method-call | testNotifications -> sendCustomNotification |
| ApexClass:NotificationServiceTest | CustomObject:Audit_Log__c | generic-type | testNotifications |
| ApexClass:NotificationServiceTest | ApexClass:NotificationService | test-reference |  |
| ApexClass:NotificationSharingService | External:Notification__Share | instantiation | grantRecipientAccess |
| ApexClass:NotificationSharingService | ApexClass:NotificationSelector | method-call | revokeRecipientAccess -> getNotificationShares |
| ApexClass:NotificationSharingService | External:Notification__Share | type-reference | grantRecipientAccess |
| ApexClass:NotificationSharingService | CustomObject:Notification__c | type-reference |  |
| ApexClass:NotificationSharingService | External:Notification__Share | generic-type | revokeRecipientAccess |
| ApexClass:NotificationSharingService | CustomObject:Notification__c | generic-type | handleNotificationSharing |
| ApexClass:NotificationSharingServiceTest | External:User | instantiation |  |
| ApexClass:NotificationSharingServiceTest | CustomObject:Notification__c | instantiation | testGrantAndRevokeAccess |
| ApexClass:NotificationSharingServiceTest | ApexClass:NotificationSharingService | method-call | testGrantAndRevokeAccess -> grantRecipientAccess |
| ApexClass:NotificationSharingServiceTest | ApexClass:NotificationSharingService | method-call | testGrantAndRevokeAccess -> revokeRecipientAccess |
| ApexClass:NotificationSharingServiceTest | External:Profile | type-reference | createTestUser |
| ApexClass:NotificationSharingServiceTest | External:UserRole | type-reference | createTestUser |
| ApexClass:NotificationSharingServiceTest | External:User | type-reference |  |
| ApexClass:NotificationSharingServiceTest | CustomObject:Notification__c | type-reference | testGrantAndRevokeAccess |
| ApexClass:NotificationSharingServiceTest | External:Notification__Share | type-reference | testGrantAndRevokeAccess |
| ApexClass:NotificationSharingServiceTest | ApexClass:NotificationSharingService | test-reference |  |
| ApexClass:NotificationSharingTriggerTest | External:User | instantiation |  |
| ApexClass:NotificationSharingTriggerTest | CustomObject:Notification__c | instantiation | testInsertAndUpdateSharing |
| ApexClass:NotificationSharingTriggerTest | External:Profile | type-reference | createTestUser |
| ApexClass:NotificationSharingTriggerTest | External:UserRole | type-reference | createTestUser |
| ApexClass:NotificationSharingTriggerTest | External:User | type-reference |  |
| ApexClass:NotificationSharingTriggerTest | CustomObject:Notification__c | type-reference | testInsertAndUpdateSharing |
| ApexClass:NotificationSharingTriggerTest | External:User | generic-type | testInsertAndUpdateSharing |
| ApexClass:NotificationSharingTriggerTest | External:Notification__Share | generic-type | testInsertAndUpdateSharing |
| ApexClass:NotificationSharingTriggerTest | CustomObject:Notification__c | generic-type | testBulkNotificationSharing |
| ApexClass:OperationsHeadDashboardController | External:CityKpis | instantiation | getDashboardData |
| ApexClass:OperationsHeadDashboardController | ApexClass:AssetSelector | method-call | getDashboardData -> getTotalAssetCount |
| ApexClass:OperationsHeadDashboardController | ApexClass:MaintenanceSelector | method-call | getDashboardData -> getTotalOpenRequestCount |
| ApexClass:OperationsHeadDashboardController | ApexClass:MaintenanceSelector | method-call | getDashboardData -> getTotalCriticalRequestCount |
| ApexClass:OperationsHeadDashboardController | ApexClass:EngineerSelector | method-call | getDashboardData -> getTotalEngineerCount |
| ApexClass:OperationsHeadDashboardController | ApexClass:VendorSelector | method-call | getDashboardData -> getActiveVendorCount |
| ApexClass:OperationsHeadDashboardController | ApexClass:BudgetSelector | method-call | getDashboardData -> getCityWideBudgetAggregateByYear |
| ApexClass:OperationsHeadDashboardController | ApexClass:MaintenanceSelector | method-call | getDashboardData -> getRequestCountByStatus |
| ApexClass:OperationsHeadDashboardController | ApexClass:MaintenanceSelector | method-call | getDashboardData -> getRequestCountCreatedToday |
| ApexClass:OperationsHeadDashboardController | ApexClass:MaintenanceSelector | method-call | getDashboardData -> getOverdueRequestCount |
| ApexClass:OperationsHeadDashboardController | External:CityKpis | type-reference |  |
| ApexClass:OperationsHeadDashboardControllerTest | CustomObject:City_Zone__c | instantiation | testGetDashboardData |
| ApexClass:OperationsHeadDashboardControllerTest | CustomObject:Infrastructure_Asset__c | instantiation | testGetDashboardData |
| ApexClass:OperationsHeadDashboardControllerTest | CustomObject:Maintenance_Request__c | instantiation | testGetDashboardData |
| ApexClass:OperationsHeadDashboardControllerTest | CustomObject:Budget__c | instantiation | testGetDashboardData |
| ApexClass:OperationsHeadDashboardControllerTest | External:User | instantiation | testGetDashboardDataAsUser |
| ApexClass:OperationsHeadDashboardControllerTest | ApexClass:OperationsHeadDashboardController | method-call | testGetDashboardData -> getDashboardData |
| ApexClass:OperationsHeadDashboardControllerTest | CustomObject:City_Zone__c | type-reference | testGetDashboardData |
| ApexClass:OperationsHeadDashboardControllerTest | CustomObject:Infrastructure_Asset__c | type-reference | testGetDashboardData |
| ApexClass:OperationsHeadDashboardControllerTest | CustomObject:Maintenance_Request__c | type-reference | testGetDashboardData |
| ApexClass:OperationsHeadDashboardControllerTest | CustomObject:Budget__c | type-reference | testGetDashboardData |
| ApexClass:OperationsHeadDashboardControllerTest | External:CityKpis | type-reference | testGetDashboardData |
| ApexClass:OperationsHeadDashboardControllerTest | External:Profile | type-reference | testGetDashboardDataAsUser |
| ApexClass:OperationsHeadDashboardControllerTest | External:User | type-reference | testGetDashboardDataAsUser |
| ApexClass:OperationsHeadDashboardControllerTest | CustomObject:Maintenance_Request__c | generic-type | testGetDashboardDataIgnoreCompletedCancelled |
| ApexClass:OperationsHeadDashboardControllerTest | ApexClass:OperationsHeadDashboardController | test-reference |  |
| ApexClass:SecurityConstantsTest | ApexClass:SecurityConstants | test-reference |  |
| ApexClass:SendSMSQueueable | ApexClass:ExternalIntegrationService | method-call | execute -> sendSMSNotification |
| ApexClass:SendSMSQueueable | ApexClass:AuditLogService | method-call | execute -> createAuditLog |
| ApexClass:SendSMSQueueable | ApexClass:AuditLogService | method-call | execute -> logError |
| ApexClass:SendSMSQueueable | External:QueueableContext | type-reference | execute |
| ApexClass:SendSMSQueueable | External:Queueable | implements |  |
| ApexClass:SendSMSQueueable | External:Database.AllowsCallouts | implements |  |
| ApexClass:SendSMSQueueableTest | External:User | instantiation |  |
| ApexClass:SendSMSQueueableTest | ApexClass:SendSMSQueueable | instantiation |  |
| ApexClass:SendSMSQueueableTest | External:Message__c | method-call | testSendSMSQueueable -> contains |
| ApexClass:SendSMSQueueableTest | External:Profile | type-reference | createTestUser |
| ApexClass:SendSMSQueueableTest | External:UserRole | type-reference | createTestUser |
| ApexClass:SendSMSQueueableTest | External:User | type-reference |  |
| ApexClass:SendSMSQueueableTest | ApexClass:SendSMSQueueable | type-reference |  |
| ApexClass:SendSMSQueueableTest | CustomObject:Audit_Log__c | generic-type | testSendSMSQueueable |
| ApexClass:SendSMSQueueableTest | ApexClass:SendSMSQueueable | test-reference |  |
| ApexClass:SLABatch | CustomObject:Audit_Log__c | instantiation | execute |
| ApexClass:SLABatch | ApexClass:SLAService | method-call | execute -> checkViolation |
| ApexClass:SLABatch | ApexClass:SLAService | method-call | execute -> escalateRequest |
| ApexClass:SLABatch | External:BatchableContext | type-reference | start |
| ApexClass:SLABatch | CustomObject:Maintenance_Request__c | generic-type | execute |
| ApexClass:SLABatch | CustomObject:Audit_Log__c | generic-type | execute |
| ApexClass:SLABatch | External:Database.Batchable<SObject> | implements |  |
| ApexClass:SLABatch | External:Database.Stateful | implements |  |
| ApexClass:SLABatchTest | CustomObject:Infrastructure_Asset__c | instantiation | testSLABatchExecution |
| ApexClass:SLABatchTest | CustomObject:Maintenance_Request__c | instantiation | testSLABatchExecution |
| ApexClass:SLABatchTest | External:User | instantiation | testSLABatchExecution |
| ApexClass:SLABatchTest | ApexClass:SLABatch | instantiation | testSLABatchExecution |
| ApexClass:SLABatchTest | ApexClass:SLAScheduler | instantiation | testSLAScheduler |
| ApexClass:SLABatchTest | External:Message__c | method-call | testSLABatchExecution -> contains |
| ApexClass:SLABatchTest | CustomObject:Infrastructure_Asset__c | type-reference | testSLABatchExecution |
| ApexClass:SLABatchTest | CustomObject:Maintenance_Request__c | type-reference | testSLABatchExecution |
| ApexClass:SLABatchTest | External:Profile | type-reference | testSLABatchExecution |
| ApexClass:SLABatchTest | External:User | type-reference | testSLABatchExecution |
| ApexClass:SLABatchTest | External:CronTrigger | type-reference | testSLAScheduler |
| ApexClass:SLABatchTest | CustomObject:Audit_Log__c | generic-type | testSLABatchExecution |
| ApexClass:SLABatchTest | CustomObject:Maintenance_Request__c | generic-type | testSLABatchEmptyAndExcluded |
| ApexClass:SLABatchTest | ApexClass:SLABatch | test-reference |  |
| ApexClass:SLABatchTest | ApexClass:SLAScheduler | test-reference |  |
| ApexClass:SLAScheduler | ApexClass:SLABatch | instantiation | execute |
| ApexClass:SLAScheduler | External:SchedulableContext | type-reference | execute |
| ApexClass:SLAScheduler | External:Schedulable | implements |  |
| ApexClass:SLASchedulerTest | External:User | instantiation |  |
| ApexClass:SLASchedulerTest | ApexClass:SLAScheduler | instantiation | testScheduler |
| ApexClass:SLASchedulerTest | External:Profile | type-reference | createTestUser |
| ApexClass:SLASchedulerTest | External:UserRole | type-reference | createTestUser |
| ApexClass:SLASchedulerTest | External:User | type-reference |  |
| ApexClass:SLASchedulerTest | ApexClass:SLAScheduler | test-reference |  |
| ApexClass:SLAService | CustomObject:Infrastructure_Alert__e | instantiation | escalateRequest |
| ApexClass:SLAService | CustomObject:Maintenance_Request__c | generic-type | calculateDueDate |
| ApexClass:SLAService | CustomObject:Infrastructure_Alert__e | generic-type | escalateRequest |
| ApexClass:SLAServiceTest | External:User | instantiation |  |
| ApexClass:SLAServiceTest | CustomObject:Maintenance_Request__c | instantiation | testCalculateDueDate |
| ApexClass:SLAServiceTest | CustomObject:Infrastructure_Asset__c | instantiation | testCheckViolation |
| ApexClass:SLAServiceTest | ApexClass:SLAService | method-call | testCalculateDueDate -> calculateDueDate |
| ApexClass:SLAServiceTest | ApexClass:SLAService | method-call | testCheckViolation -> checkViolation |
| ApexClass:SLAServiceTest | ApexClass:SLAService | method-call | testEscalateRequest -> escalateRequest |
| ApexClass:SLAServiceTest | External:Profile | type-reference | createTestUser |
| ApexClass:SLAServiceTest | External:UserRole | type-reference | createTestUser |
| ApexClass:SLAServiceTest | External:User | type-reference |  |
| ApexClass:SLAServiceTest | CustomObject:Infrastructure_Asset__c | type-reference | testCheckViolation |
| ApexClass:SLAServiceTest | CustomObject:Maintenance_Request__c | type-reference | testCalculateDueDate |
| ApexClass:SLAServiceTest | CustomObject:Maintenance_Request__c | generic-type | testCalculateDueDate |
| ApexClass:SLAServiceTest | ApexClass:SLAService | test-reference |  |
| ApexClass:TelemetryBatchTriggerHandler | CustomObject:Audit_Log__c | instantiation | handleEvents |
| ApexClass:TelemetryBatchTriggerHandler | CustomObject:Telemetry_Batch_Event__e | generic-type | handleEvents |
| ApexClass:TelemetryBatchTriggerHandler | CustomObject:Audit_Log__c | generic-type | handleEvents |
| ApexClass:TelemetryBatchTriggerTest | CustomObject:Infrastructure_Asset__c | instantiation | testTelemetryBatchTriggerConsolidation |
| ApexClass:TelemetryBatchTriggerTest | CustomObject:Telemetry_Batch_Event__e | instantiation | testTelemetryBatchTriggerConsolidation |
| ApexClass:TelemetryBatchTriggerTest | External:Message__c | method-call | testTelemetryBatchTriggerConsolidation -> contains |
| ApexClass:TelemetryBatchTriggerTest | CustomObject:Infrastructure_Asset__c | type-reference | testTelemetryBatchTriggerConsolidation |
| ApexClass:TelemetryBatchTriggerTest | CustomObject:Telemetry_Batch_Event__e | generic-type | testTelemetryBatchTriggerConsolidation |
| ApexClass:TelemetryBatchTriggerTest | CustomObject:Audit_Log__c | generic-type | testTelemetryBatchTriggerConsolidation |
| ApexClass:TestDataFactory | CustomObject:City_Zone__c | instantiation |  |
| ApexClass:TestDataFactory | CustomObject:Infrastructure_Asset__c | instantiation |  |
| ApexClass:TestDataFactory | CustomObject:Maintenance_Request__c | instantiation |  |
| ApexClass:TestDataFactory | CustomObject:Citizen_Request__c | instantiation |  |
| ApexClass:TestDataFactory | CustomObject:Vendor__c | instantiation |  |
| ApexClass:TestDataFactory | CustomObject:Field_Engineer__c | instantiation |  |
| ApexClass:TestDataFactory | CustomObject:Budget__c | instantiation |  |
| ApexClass:TestDataFactory | CustomObject:City_Zone__c | type-reference |  |
| ApexClass:TestDataFactory | CustomObject:Infrastructure_Asset__c | type-reference |  |
| ApexClass:TestDataFactory | CustomObject:Maintenance_Request__c | type-reference |  |
| ApexClass:TestDataFactory | CustomObject:Citizen_Request__c | type-reference |  |
| ApexClass:TestDataFactory | CustomObject:Vendor__c | type-reference |  |
| ApexClass:TestDataFactory | CustomObject:Field_Engineer__c | type-reference |  |
| ApexClass:TestDataFactory | CustomObject:Budget__c | type-reference |  |
| ApexClass:TimelineBuilder | ApexClass:AssetDTOs | method-call | build -> TimelineEventDTO |
| ApexClass:TimelineBuilder | External:CreatedDate | method-call | build -> date |
| ApexClass:TimelineBuilder | ApexClass:TimelineSortHelper | method-call | build -> sortDescending |
| ApexClass:TimelineBuilder | ApexClass:DashboardContext | type-reference |  |
| ApexClass:TimelineBuilder | External:TimelineEventDTO | type-reference |  |
| ApexClass:TimelineController | ApexClass:MaintenanceService | method-call | getTimeline -> getTimeline |
| ApexClass:TimelineControllerTest | External:User | instantiation |  |
| ApexClass:TimelineControllerTest | CustomObject:Maintenance_Request__c | instantiation | testGetTimeline |
| ApexClass:TimelineControllerTest | ApexClass:TimelineController | method-call | testGetTimeline -> getTimeline |
| ApexClass:TimelineControllerTest | External:Profile | type-reference | createTestUser |
| ApexClass:TimelineControllerTest | External:UserRole | type-reference | createTestUser |
| ApexClass:TimelineControllerTest | CustomObject:Maintenance_Request__c | type-reference | testGetTimeline |
| ApexClass:TimelineControllerTest | External:User | type-reference |  |
| ApexClass:TimelineControllerTest | ApexClass:TimelineController | test-reference |  |
| ApexClass:TransactionCacheTest | CustomObject:Budget__c | instantiation | testTransactionCachePutAndGet |
| ApexClass:TransactionCacheTest | ApexClass:TransactionCache | method-call | testTransactionCachePutAndGet -> clear |
| ApexClass:TransactionCacheTest | ApexClass:TransactionCache | method-call | testTransactionCachePutAndGet -> get |
| ApexClass:TransactionCacheTest | ApexClass:TransactionCache | method-call | testTransactionCachePutAndGet -> put |
| ApexClass:TransactionCacheTest | ApexClass:TransactionCache | method-call | testTransactionCachePutAndGet -> getMany |
| ApexClass:TransactionCacheTest | CustomObject:Budget__c | type-reference | testTransactionCachePutAndGet |
| ApexClass:TransactionCacheTest | ApexClass:TransactionCache | test-reference |  |
| ApexClass:TriggerGuardTest | ApexClass:TriggerGuard | method-call | testTriggerGuardMethods -> hasBeenProcessed |
| ApexClass:TriggerGuardTest | ApexClass:TriggerGuard | method-call | testTriggerGuardMethods -> isProcessed |
| ApexClass:TriggerGuardTest | ApexClass:TriggerGuard | method-call | testTriggerGuardMethods -> markProcessed |
| ApexClass:TriggerGuardTest | ApexClass:TriggerGuard | method-call | testTriggerGuardMethods -> clear |
| ApexClass:TriggerGuardTest | ApexClass:TriggerGuard | test-reference |  |
| ApexClass:UserContext | External:ZoneAccessContext | instantiation |  |
| ApexClass:UserContext | External:UserAuthorizationContext | instantiation |  |
| ApexClass:UserContext | External:UserSessionContext | instantiation |  |
| ApexClass:UserContext | External:User | type-reference |  |
| ApexClass:UserContextResolver | ApexClass:UserContext | instantiation | loadUser |
| ApexClass:UserContextResolver | ApexClass:UserSelector | method-call | identifyPersona -> getUserWithProfileAndRole |
| ApexClass:UserContextResolver | ApexClass:VendorSelector | method-call | getVendorByEmail |
| ApexClass:UserContextResolver | ApexClass:ZoneSelector | method-call | getAllZoneIds |
| ApexClass:UserContextResolver | ApexClass:EngineerSelector | method-call | getEngineersByZoneWithUser |
| ApexClass:UserContextResolver | ApexClass:EngineerSelector | method-call | getEngineersByUserId |
| ApexClass:UserContextResolver | ApexClass:ZoneSelector | method-call | extractZoneName -> getZoneByName |
| ApexClass:UserContextResolver | External:User | type-reference |  |
| ApexClass:UserContextResolver | ApexClass:UserContext | type-reference |  |
| ApexClass:UserContextResolver | CustomObject:Field_Engineer__c | type-reference |  |
| ApexClass:UserContextResolver | CustomObject:Vendor__c | generic-type |  |
| ApexClass:UserContextResolver | CustomObject:City_Zone__c | generic-type |  |
| ApexClass:UserContextResolver | CustomObject:Field_Engineer__c | generic-type |  |
| ApexClass:UserContextResolverTest | CustomObject:City_Zone__c | instantiation | setup |
| ApexClass:UserContextResolverTest | External:User | instantiation |  |
| ApexClass:UserContextResolverTest | CustomObject:Field_Engineer__c | instantiation | createEngineerRecord |
| ApexClass:UserContextResolverTest | ApexClass:UserContextResolver | method-call | testEngineerWithZone -> getUserContext |
| ApexClass:UserContextResolverTest | ApexClass:UserContextResolver | method-call | testExtractZoneName -> extractZoneName |
| ApexClass:UserContextResolverTest | External:Profile | type-reference |  |
| ApexClass:UserContextResolverTest | External:UserRole | type-reference |  |
| ApexClass:UserContextResolverTest | External:User | type-reference |  |
| ApexClass:UserContextResolverTest | CustomObject:City_Zone__c | type-reference | setup |
| ApexClass:UserContextResolverTest | ApexClass:UserContext | type-reference |  |
| ApexClass:UserContextResolverTest | CustomObject:City_Zone__c | generic-type | setup |
| ApexClass:UserContextResolverTest | External:UserRole | generic-type | getRole |
| ApexClass:UserContextResolverTest | CustomObject:Field_Engineer__c | generic-type | createDuplicateEngineerRecords |
| ApexClass:UserContextResolverTest | ApexClass:SecurityConstants | test-reference |  |
| ApexClass:UserContextResolverTest | ApexClass:UserContext | test-reference |  |
| ApexClass:UserContextResolverTest | ApexClass:UserContextResolver | test-reference |  |
| ApexClass:UserContextTest | ApexClass:UserContext | instantiation | testUserContextPropertiesAndGetters |
| ApexClass:UserContextTest | ApexClass:UserContext | type-reference |  |
| ApexClass:UserContextTest | ApexClass:UserContext | test-reference |  |
| ApexClass:UserSelector | External:Profile | generic-type |  |
| ApexClass:UserSelector | External:UserRole | generic-type |  |
| ApexClass:UserSelector | External:User | generic-type | getUserWithProfileAndRole |
| ApexClass:VendorAssignmentController | ApexClass:ContractorAssignmentService | method-call | getActiveVendors -> getActiveVendors |
| ApexClass:VendorAssignmentController | ApexClass:ContractorAssignmentService | method-call | assignVendor -> assignVendor |
| ApexClass:VendorAssignmentController | ApexClass:ContractorAssignmentService | method-call | assignVendorWithEstimate -> assignVendorWithEstimate |
| ApexClass:VendorAssignmentController | ApexClass:ContractorAssignmentService | method-call | completeAssignment -> completeAssignment |
| ApexClass:VendorAssignmentController | ApexClass:ContractorAssignmentService | method-call | completeAssignmentWithCost -> completeAssignmentWithCost |
| ApexClass:VendorAssignmentController | ApexClass:ContractorAssignmentService | method-call | acceptAssignment -> acceptAssignment |
| ApexClass:VendorAssignmentController | ApexClass:ContractorAssignmentService | method-call | rejectAssignment -> rejectAssignment |
| ApexClass:VendorAssignmentController | ApexClass:ContractorAssignmentService | method-call | getAssignmentByRequest -> getAssignmentByRequest |
| ApexClass:VendorAssignmentController | ApexClass:VendorAssignmentService | method-call | getPendingAssignmentsForVendor -> getCurrentVendorId |
| ApexClass:VendorAssignmentController | ApexClass:VendorAssignmentService | method-call | getPendingAssignmentsForVendor -> getAssignmentsByVendor |
| ApexClass:VendorAssignmentController | CustomObject:Vendor__c | generic-type |  |
| ApexClass:VendorAssignmentController | CustomObject:Contractor_Assignment__c | generic-type |  |
| ApexClass:VendorAssignmentControllerTest | CustomObject:Vendor__c | instantiation | testVendorAssignment |
| ApexClass:VendorAssignmentControllerTest | CustomObject:Maintenance_Request__c | instantiation | testVendorAssignment |
| ApexClass:VendorAssignmentControllerTest | External:User | instantiation | testVendorAssignment |
| ApexClass:VendorAssignmentControllerTest | ApexClass:VendorAssignmentController | method-call | testVendorAssignment -> getActiveVendors |
| ApexClass:VendorAssignmentControllerTest | ApexClass:VendorAssignmentController | method-call | testVendorAssignment -> assignVendor |
| ApexClass:VendorAssignmentControllerTest | ApexClass:VendorAssignmentController | method-call | testVendorAssignment -> getAssignmentByRequest |
| ApexClass:VendorAssignmentControllerTest | ApexClass:VendorAssignmentController | method-call | testVendorAssignment -> acceptAssignment |
| ApexClass:VendorAssignmentControllerTest | ApexClass:VendorAssignmentController | method-call | testVendorAssignment -> completeAssignmentWithCost |
| ApexClass:VendorAssignmentControllerTest | ApexClass:VendorAssignmentController | method-call | testVendorAssignment -> assignVendorWithEstimate |
| ApexClass:VendorAssignmentControllerTest | ApexClass:VendorAssignmentController | method-call | testVendorAssignment -> rejectAssignment |
| ApexClass:VendorAssignmentControllerTest | ApexClass:VendorAssignmentController | method-call | testNegativeAndExceptions -> completeAssignment |
| ApexClass:VendorAssignmentControllerTest | CustomObject:Vendor__c | type-reference | testVendorAssignment |
| ApexClass:VendorAssignmentControllerTest | External:Phase | type-reference | testVendorAssignment |
| ApexClass:VendorAssignmentControllerTest | External:Street | type-reference | testVendorAssignment |
| ApexClass:VendorAssignmentControllerTest | CustomObject:Maintenance_Request__c | type-reference | testVendorAssignment |
| ApexClass:VendorAssignmentControllerTest | External:Profile | type-reference | testVendorAssignment |
| ApexClass:VendorAssignmentControllerTest | External:User | type-reference | testVendorAssignment |
| ApexClass:VendorAssignmentControllerTest | CustomObject:Contractor_Assignment__c | type-reference | testVendorAssignment |
| ApexClass:VendorAssignmentControllerTest | CustomObject:Vendor__c | generic-type | testVendorAssignment |
| ApexClass:VendorAssignmentControllerTest | ApexClass:VendorAssignmentController | test-reference |  |
| ApexClass:VendorAssignmentService | ApexClass:ContractorAssignmentSelector | method-call | getAssignmentsByVendor -> getAssignmentsByVendor |
| ApexClass:VendorAssignmentService | ApexClass:VendorSelector | method-call | getCurrentVendorId -> getVendorByUserId |
| ApexClass:VendorAssignmentService | CustomObject:Contractor_Assignment__c | generic-type |  |
| ApexClass:VendorAssignmentService | CustomObject:Vendor__c | generic-type | getCurrentVendorId |
| ApexClass:VendorPerformanceController | External:VendorPerformanceWrapper | instantiation | getVendorPerformance |
| ApexClass:VendorPerformanceController | ApexClass:VendorSelector | method-call | getVendorPerformance -> getVendorsWithAssignments |
| ApexClass:VendorPerformanceController | External:Assigned_Date__c | method-call | getVendorPerformance -> daysBetween |
| ApexClass:VendorPerformanceController | ApexClass:VendorPerformanceHelper | method-call | getVendorPerformance -> calculateAverageTime |
| ApexClass:VendorPerformanceController | ApexClass:VendorPerformanceHelper | method-call | getVendorPerformance -> calculateRejectedJobs |
| ApexClass:VendorPerformanceController | ApexClass:ContractorAssignmentSelector | method-call | getVendorHistory -> getVendorHistory |
| ApexClass:VendorPerformanceController | ApexClass:ContractorAssignmentSelector | method-call | getActiveAssignmentsCount -> getActiveAssignmentsCount |
| ApexClass:VendorPerformanceController | External:VendorPerformanceWrapper | type-reference |  |
| ApexClass:VendorPerformanceController | External:VendorPerformanceWrapper | generic-type |  |
| ApexClass:VendorPerformanceController | CustomObject:Vendor__c | generic-type | getVendorPerformance |
| ApexClass:VendorPerformanceController | CustomObject:Contractor_Assignment__c | generic-type |  |
| ApexClass:VendorPerformanceControllerTest | CustomObject:Vendor__c | instantiation | testGetVendorPerformance |
| ApexClass:VendorPerformanceControllerTest | CustomObject:Infrastructure_Asset__c | instantiation | testGetVendorPerformance |
| ApexClass:VendorPerformanceControllerTest | CustomObject:Maintenance_Request__c | instantiation | testGetVendorPerformance |
| ApexClass:VendorPerformanceControllerTest | CustomObject:Contractor_Assignment__c | instantiation | testGetVendorPerformance |
| ApexClass:VendorPerformanceControllerTest | External:User | instantiation | testGetVendorPerformance |
| ApexClass:VendorPerformanceControllerTest | ApexClass:VendorPerformanceController | method-call | testGetVendorPerformance -> getVendorPerformance |
| ApexClass:VendorPerformanceControllerTest | CustomObject:Vendor__c | type-reference | testGetVendorPerformance |
| ApexClass:VendorPerformanceControllerTest | CustomObject:Infrastructure_Asset__c | type-reference | testGetVendorPerformance |
| ApexClass:VendorPerformanceControllerTest | CustomObject:Maintenance_Request__c | type-reference | testGetVendorPerformance |
| ApexClass:VendorPerformanceControllerTest | CustomObject:Contractor_Assignment__c | type-reference | testGetVendorPerformance |
| ApexClass:VendorPerformanceControllerTest | External:Profile | type-reference | testGetVendorPerformance |
| ApexClass:VendorPerformanceControllerTest | External:User | type-reference | testGetVendorPerformance |
| ApexClass:VendorPerformanceControllerTest | External:VendorPerformanceWrapper | type-reference | testGetVendorPerformance |
| ApexClass:VendorPerformanceControllerTest | CustomObject:Vendor__c | generic-type | testBulkVendorPerformance |
| ApexClass:VendorPerformanceControllerTest | ApexClass:VendorPerformanceController | test-reference |  |
| ApexClass:VendorSelector | ApexClass:TransactionCache | method-call | getVendorById -> get |
| ApexClass:VendorSelector | ApexClass:TransactionCache | method-call | getVendorById -> put |
| ApexClass:VendorSelector | External:StubProvider | type-reference |  |
| ApexClass:VendorSelector | CustomObject:Vendor__c | type-reference |  |
| ApexClass:VendorSelector | CustomObject:Vendor__c | generic-type | getVendorById |
| ApexClass:VendorSelectorTest | ApexClass:TestDataFactory | method-call | testVendorSelectorQueries -> createVendor |
| ApexClass:VendorSelectorTest | ApexClass:VendorSelector | method-call | testVendorSelectorQueries -> getVendorById |
| ApexClass:VendorSelectorTest | ApexClass:VendorSelector | method-call | testVendorSelectorQueries -> getActiveVendors |
| ApexClass:VendorSelectorTest | ApexClass:VendorSelector | method-call | testVendorSelectorQueries -> getVendorForNotification |
| ApexClass:VendorSelectorTest | ApexClass:VendorSelector | method-call | testVendorSelectorQueries -> getActiveVendorCount |
| ApexClass:VendorSelectorTest | CustomObject:Vendor__c | type-reference | testVendorSelectorQueries |
| ApexClass:VendorSelectorTest | CustomObject:Vendor__c | generic-type | testVendorSelectorQueries |
| ApexClass:VendorSelectorTest | ApexClass:TestDataFactory | test-reference |  |
| ApexClass:VendorSelectorTest | ApexClass:VendorSelector | test-reference |  |
| ApexClass:WeatherIntegrationService | ApexClass:AuditLogService | method-call | updateZoneWeatherStatus -> createAuditLog |
| ApexClass:WeatherIntegrationService | ApexClass:AuditLogService | method-call | updateZoneWeatherStatus -> logError |
| ApexClass:WeatherIntegrationService | External:CalloutException | type-reference |  |
| ApexClass:WeatherIntegrationServiceTest | CustomObject:City_Zone__c | instantiation | testUpdateZoneWeatherStatus |
| ApexClass:WeatherIntegrationServiceTest | ApexClass:WeatherIntegrationService | method-call | testUpdateZoneWeatherStatus -> updateZoneWeatherStatus |
| ApexClass:WeatherIntegrationServiceTest | CustomObject:City_Zone__c | type-reference | testUpdateZoneWeatherStatus |
| ApexClass:WeatherIntegrationServiceTest | ApexClass:WeatherIntegrationService | test-reference |  |
| ApexClass:WeatherUpdateScheduler | ApexClass:ZoneSelector | method-call | execute -> getZonesWithLimit |
| ApexClass:WeatherUpdateScheduler | ApexClass:WeatherIntegrationService | method-call | execute -> updateZoneWeatherStatus |
| ApexClass:WeatherUpdateScheduler | External:SchedulableContext | type-reference | execute |
| ApexClass:WeatherUpdateScheduler | CustomObject:City_Zone__c | generic-type | execute |
| ApexClass:WeatherUpdateScheduler | External:Schedulable | implements |  |
| ApexClass:WeatherUpdateSchedulerTest | CustomObject:City_Zone__c | instantiation | testScheduler |
| ApexClass:WeatherUpdateSchedulerTest | ApexClass:WeatherUpdateScheduler | instantiation | testScheduler |
| ApexClass:WeatherUpdateSchedulerTest | CustomObject:City_Zone__c | type-reference | testScheduler |
| ApexClass:WeatherUpdateSchedulerTest | ApexClass:WeatherUpdateScheduler | test-reference |  |
| ApexClass:ZoneDashboardController | External:ZoneKpis | instantiation | getZoneKpis |
| ApexClass:ZoneDashboardController | ApexClass:ZoneUtil | method-call | getZoneKpis -> getUserZoneId |
| ApexClass:ZoneDashboardController | ApexClass:ZoneSelector | method-call | getZoneKpis -> getFirstActiveZone |
| ApexClass:ZoneDashboardController | ApexClass:ZoneSelector | method-call | getZoneKpis -> getZonesByIds |
| ApexClass:ZoneDashboardController | ApexClass:AssetSelector | method-call | getZoneKpis -> getAssetCountByZone |
| ApexClass:ZoneDashboardController | ApexClass:MaintenanceSelector | method-call | getZoneKpis -> getRequestCountsByZone |
| ApexClass:ZoneDashboardController | ApexClass:EngineerSelector | method-call | getZoneKpis -> getEngineerCountByZone |
| ApexClass:ZoneDashboardController | ApexClass:VendorSelector | method-call | getZoneKpis -> getActiveVendorCount |
| ApexClass:ZoneDashboardController | ApexClass:BudgetSelector | method-call | getZoneKpis -> getBudgetByZoneAndYear |
| ApexClass:ZoneDashboardController | ApexClass:ZoneUtil | method-call | getFilterOptions -> getAvailableFilterOptions |
| ApexClass:ZoneDashboardController | External:ZoneKpis | type-reference |  |
| ApexClass:ZoneDashboardController | CustomObject:City_Zone__c | type-reference | getZoneKpis |
| ApexClass:ZoneDashboardController | CustomObject:City_Zone__c | generic-type | getZoneKpis |
| ApexClass:ZoneDashboardController | CustomObject:Budget__c | generic-type | getZoneKpis |
| ApexClass:ZoneDashboardControllerTest | External:User | instantiation |  |
| ApexClass:ZoneDashboardControllerTest | CustomObject:City_Zone__c | instantiation | testGetZoneKpis |
| ApexClass:ZoneDashboardControllerTest | CustomObject:Field_Engineer__c | instantiation | testGetZoneKpis |
| ApexClass:ZoneDashboardControllerTest | CustomObject:Infrastructure_Asset__c | instantiation | testGetZoneKpis |
| ApexClass:ZoneDashboardControllerTest | CustomObject:Maintenance_Request__c | instantiation | testGetZoneKpis |
| ApexClass:ZoneDashboardControllerTest | CustomObject:Budget__c | instantiation | testGetZoneKpis |
| ApexClass:ZoneDashboardControllerTest | CustomObject:Vendor__c | instantiation | testGetZoneKpis |
| ApexClass:ZoneDashboardControllerTest | ApexClass:ZoneDashboardController | method-call | testGetZoneKpis -> getZoneKpis |
| ApexClass:ZoneDashboardControllerTest | ApexClass:ZoneDashboardController | method-call | testGetFilterOptions -> getFilterOptions |
| ApexClass:ZoneDashboardControllerTest | External:Profile | type-reference | createTestUser |
| ApexClass:ZoneDashboardControllerTest | External:UserRole | type-reference | createTestUser |
| ApexClass:ZoneDashboardControllerTest | CustomObject:City_Zone__c | type-reference | testGetZoneKpis |
| ApexClass:ZoneDashboardControllerTest | CustomObject:Field_Engineer__c | type-reference | testGetZoneKpis |
| ApexClass:ZoneDashboardControllerTest | CustomObject:Infrastructure_Asset__c | type-reference | testGetZoneKpis |
| ApexClass:ZoneDashboardControllerTest | CustomObject:Maintenance_Request__c | type-reference | testGetZoneKpis |
| ApexClass:ZoneDashboardControllerTest | CustomObject:Budget__c | type-reference | testGetZoneKpis |
| ApexClass:ZoneDashboardControllerTest | CustomObject:Vendor__c | type-reference | testGetZoneKpis |
| ApexClass:ZoneDashboardControllerTest | External:User | type-reference |  |
| ApexClass:ZoneDashboardControllerTest | External:ZoneKpis | type-reference | testGetZoneKpis |
| ApexClass:ZoneDashboardControllerTest | ApexClass:ZoneDashboardController | test-reference |  |
| ApexClass:ZoneManagerTriggerTest | CustomObject:Maintenance_Request__c | instantiation | testZoneManagerTriggerRouting |
| ApexClass:ZoneManagerTriggerTest | External:User | instantiation | testZoneManagerTriggerRouting |
| ApexClass:ZoneManagerTriggerTest | CustomObject:Maintenance_Request__c | type-reference | testZoneManagerTriggerRouting |
| ApexClass:ZoneManagerTriggerTest | External:Profile | type-reference | testZoneManagerTriggerRouting |
| ApexClass:ZoneManagerTriggerTest | External:User | type-reference | testZoneManagerTriggerRouting |
| ApexClass:ZoneSelector | ApexClass:TransactionCache | method-call | getZoneById -> get |
| ApexClass:ZoneSelector | ApexClass:TransactionCache | method-call | put |
| ApexClass:ZoneSelector | External:StubProvider | type-reference |  |
| ApexClass:ZoneSelector | CustomObject:City_Zone__c | type-reference |  |
| ApexClass:ZoneSelector | CustomObject:City_Zone__c | generic-type | getZoneById |
| ApexClass:ZoneSelectorTest | ApexClass:TestDataFactory | method-call | testZoneSelectorQueries -> createCityZone |
| ApexClass:ZoneSelectorTest | ApexClass:ZoneSelector | method-call | testZoneSelectorQueries -> getZoneById |
| ApexClass:ZoneSelectorTest | ApexClass:ZoneSelector | method-call | testZoneSelectorQueries -> getZonesByIds |
| ApexClass:ZoneSelectorTest | ApexClass:ZoneSelector | method-call | testZoneSelectorQueries -> getActiveZones |
| ApexClass:ZoneSelectorTest | ApexClass:ZoneSelector | method-call | testZoneSelectorQueries -> getZoneName |
| ApexClass:ZoneSelectorTest | ApexClass:ZoneSelector | method-call | testZoneSelectorQueries -> getAllZonesSorted |
| ApexClass:ZoneSelectorTest | ApexClass:ZoneSelector | method-call | testZoneSelectorQueries -> getFirstActiveZone |
| ApexClass:ZoneSelectorTest | ApexClass:ZoneSelector | method-call | testZoneSelectorQueries -> getZonesWithLimit |
| ApexClass:ZoneSelectorTest | ApexClass:ZoneSelector | method-call | testZoneSelectorQueries -> getAllZoneIds |
| ApexClass:ZoneSelectorTest | ApexClass:ZoneSelector | method-call | testZoneSelectorQueries -> getZoneByName |
| ApexClass:ZoneSelectorTest | CustomObject:City_Zone__c | type-reference | testZoneSelectorQueries |
| ApexClass:ZoneSelectorTest | CustomObject:City_Zone__c | generic-type | testZoneSelectorQueries |
| ApexClass:ZoneSelectorTest | ApexClass:TestDataFactory | test-reference |  |
| ApexClass:ZoneSelectorTest | ApexClass:ZoneSelector | test-reference |  |
| ApexClass:ZoneUtil | External:UserZoneDTO | instantiation | getUserZoneData |
| ApexClass:ZoneUtil | ApexClass:UserContextResolver | method-call | getUserZoneData -> getCurrentUserContext |
| ApexClass:ZoneUtil | ApexClass:CacheService | method-call | getActiveZones -> get |
| ApexClass:ZoneUtil | ApexClass:ZoneSelector | method-call | getActiveZones -> getActiveZones |
| ApexClass:ZoneUtil | ApexClass:CacheService | method-call | getActiveZones -> put |
| ApexClass:ZoneUtil | ApexClass:UserSelector | method-call | getAccessibleEngineerIds -> getEngineersByRoleDeveloperName |
| ApexClass:ZoneUtil | External:Status__c | method-call | getAvailableFilterOptions -> getDescribe |
| ApexClass:ZoneUtil | CustomObject:Asset_Type__c | method-call | getAvailableFilterOptions -> getDescribe |
| ApexClass:ZoneUtil | ApexClass:UserContext | type-reference | getUserZoneData |
| ApexClass:ZoneUtil | External:UserZoneDTO | type-reference |  |
| ApexClass:ZoneUtil | CustomObject:City_Zone__c | generic-type |  |
| ApexClass:ZoneUtil | External:User | generic-type | getAccessibleEngineerIds |
| ApexClass:ZoneUtilTest | External:User | instantiation | testGetUserZoneData |
| ApexClass:ZoneUtilTest | CustomObject:City_Zone__c | instantiation | testGetUserZoneData |
| ApexClass:ZoneUtilTest | CustomObject:Field_Engineer__c | instantiation | testGetUserZoneData |
| ApexClass:ZoneUtilTest | ApexClass:ZoneUtil | method-call | testGetUserZoneData -> getUserZoneData |
| ApexClass:ZoneUtilTest | ApexClass:ZoneUtil | method-call | testGetUserZoneData -> getUserZoneId |
| ApexClass:ZoneUtilTest | ApexClass:ZoneUtil | method-call | testGetAccessibleMethods -> getAccessibleZoneIds |
| ApexClass:ZoneUtilTest | ApexClass:ZoneUtil | method-call | testGetAccessibleMethods -> getAccessibleEngineerIds |
| ApexClass:ZoneUtilTest | External:Profile | type-reference | testGetUserZoneData |
| ApexClass:ZoneUtilTest | External:User | type-reference | testGetUserZoneData |
| ApexClass:ZoneUtilTest | CustomObject:City_Zone__c | type-reference | testGetUserZoneData |
| ApexClass:ZoneUtilTest | External:UserZoneDTO | type-reference | testGetUserZoneData |
| ApexClass:ZoneUtilTest | CustomObject:City_Zone__c | generic-type | testCityCommissionerAllZones |
| ApexClass:ZoneUtilTest | ApexClass:SecurityConstants | test-reference |  |
| ApexClass:ZoneUtilTest | ApexClass:ZoneUtil | test-reference |  |
| ApexTrigger:AssetTypeTrigger | ApexClass:CacheService | trigger-handler | invalidateAssetTypeCache |
| ApexTrigger:BudgetTrigger | ApexClass:BudgetHandler | trigger-handler | afterInsert |
| ApexTrigger:BudgetTrigger | ApexClass:BudgetHandler | trigger-handler | afterUpdate |
| ApexTrigger:CitizenRequestTrigger | ApexClass:CitizenRequestTriggerHandler | trigger-handler | afterInsert |
| ApexTrigger:CitizenRequestTrigger | ApexClass:CitizenRequestTriggerHandler | trigger-handler | afterUpdate |
| ApexTrigger:CommissionerTrigger | ApexClass:ManagementWorkflowHandler | trigger-handler | handleCommissionerApprovals |
| ApexTrigger:ContractorAssignmentTrigger | ApexClass:ContractorAssignmentTriggerHandler | trigger-handler | afterUpdate |
| ApexTrigger:ExpenseTrigger | ApexClass:ExpenseTriggerHandler | trigger-handler | beforeInsert |
| ApexTrigger:ExpenseTrigger | ApexClass:ExpenseTriggerHandler | trigger-handler | beforeUpdate |
| ApexTrigger:ExpenseTrigger | ApexClass:ExpenseTriggerHandler | trigger-handler | afterInsert |
| ApexTrigger:ExpenseTrigger | ApexClass:ExpenseTriggerHandler | trigger-handler | afterUpdate |
| ApexTrigger:ExpenseTrigger | ApexClass:ExpenseTriggerHandler | trigger-handler | afterDelete |
| ApexTrigger:ExpenseTrigger | ApexClass:ExpenseTriggerHandler | trigger-handler | afterUndelete |
| ApexTrigger:InfrastructureAlertTrigger | ApexClass:InfrastructureAlertTriggerHandler | trigger-handler | handleEvents |
| ApexTrigger:InspectionTrigger | ApexClass:InspectionTriggerHandler | trigger-handler | beforeInsert |
| ApexTrigger:InspectionTrigger | ApexClass:InspectionTriggerHandler | trigger-handler | beforeUpdate |
| ApexTrigger:InspectionTrigger | ApexClass:InspectionTriggerHandler | trigger-handler | afterInsert |
| ApexTrigger:InspectionTrigger | ApexClass:InspectionTriggerHandler | trigger-handler | afterUpdate |
| ApexTrigger:MaintenanceRequestTrigger | ApexClass:MaintenanceRequestTriggerHandler | trigger-handler | beforeInsert |
| ApexTrigger:MaintenanceRequestTrigger | ApexClass:MaintenanceRequestTriggerHandler | trigger-handler | afterInsert |
| ApexTrigger:MaintenanceRequestTrigger | ApexClass:MaintenanceRequestTriggerHandler | trigger-handler | beforeUpdate |
| ApexTrigger:MaintenanceRequestTrigger | ApexClass:MaintenanceRequestTriggerHandler | trigger-handler | afterUpdate |
| ApexTrigger:NotificationSecurityTrigger | ApexClass:NotificationSecurity | trigger-handler | enforceReadToggle |
| ApexTrigger:NotificationSharingTrigger | ApexClass:NotificationSharingService | trigger-handler | handleNotificationSharing |
| ApexTrigger:TelemetryBatchTrigger | ApexClass:TelemetryBatchTriggerHandler | trigger-handler | handleEvents |
| ApexTrigger:ZoneManagerTrigger | ApexClass:ManagementWorkflowHandler | trigger-handler | handleZoneManagerApprovals |

## Apex → Salesforce Data

| Apex | Target | Type | Evidence |
|---|---|---|---|
| ApexClass:AssetExplorerControllerTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:AssetExplorerServiceTest | CustomObject:User | soql-object | SOQL FROM User |
| ApexClass:AssetExplorerServiceTest | CustomObject:controller | soql-object | SOQL FROM controller |
| ApexClass:AssetExplorerServiceTest | CustomObject:service | soql-object | SOQL FROM service |
| ApexClass:AssetSelector | CustomObject:Infrastructure_Asset__c | soql-object | SOQL FROM Infrastructure_Asset__c |
| ApexClass:AssetSelector | CustomField:Infrastructure_Asset__c.Status__c | soql-field | Infrastructure_Asset__c.Status__c |
| ApexClass:AssetSelector | CustomField:Infrastructure_Asset__c.Asset_Code__c | soql-field | Infrastructure_Asset__c.Asset_Code__c |
| ApexClass:AssetSelector | CustomField:Infrastructure_Asset__c.Asset_Type__c | soql-field | Infrastructure_Asset__c.Asset_Type__c |
| ApexClass:AssetSelector | CustomField:Infrastructure_Asset__c.Health_Score__c | soql-field | Infrastructure_Asset__c.Health_Score__c |
| ApexClass:AssetSelector | CustomField:Infrastructure_Asset__c.Asset_Age_Years__c | soql-field | Infrastructure_Asset__c.Asset_Age_Years__c |
| ApexClass:AssetSelector | CustomField:Infrastructure_Asset__c.Installation_Date__c | soql-field | Infrastructure_Asset__c.Installation_Date__c |
| ApexClass:AssetSelector | CustomField:Infrastructure_Asset__c.Purchase_Date__c | soql-field | Infrastructure_Asset__c.Purchase_Date__c |
| ApexClass:AssetSelector | CustomField:Infrastructure_Asset__c.Decommission_Date__c | soql-field | Infrastructure_Asset__c.Decommission_Date__c |
| ApexClass:AssetSelector | CustomField:Infrastructure_Asset__c.Latitude__c | soql-field | Infrastructure_Asset__c.Latitude__c |
| ApexClass:AssetSelector | CustomField:Infrastructure_Asset__c.Longitude__c | soql-field | Infrastructure_Asset__c.Longitude__c |
| ApexClass:AssetSelector | CustomField:Infrastructure_Asset__c.Asset_Type_Lookup__c | soql-field | Infrastructure_Asset__c.Asset_Type_Lookup__c |
| ApexClass:AssetSelector | CustomObject:Maintenance_Requests__r | soql-object | SOQL FROM Maintenance_Requests__r |
| ApexClass:AssetSelector | CustomObject:Inspections__r | soql-object | SOQL FROM Inspections__r |
| ApexClass:AssetSelector | CustomObject:Expense_Record__c | soql-object | SOQL FROM Expense_Record__c |
| ApexClass:AuditLogSelector | CustomObject:Audit_Log__c | soql-object | SOQL FROM Audit_Log__c |
| ApexClass:AuditLogSelector | CustomField:Audit_Log__c.Message__c | soql-field | Audit_Log__c.Message__c |
| ApexClass:AuditLogSelector | CustomField:Audit_Log__c.Action__c | soql-field | Audit_Log__c.Action__c |
| ApexClass:AuditLogServiceTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:AuditLogServiceTest | CustomObject:Audit_Log__c | soql-object | SOQL FROM Audit_Log__c |
| ApexClass:AuditLogServiceTest | CustomField:Audit_Log__c.Message__c | soql-field | Audit_Log__c.Message__c |
| ApexClass:BudgetBatch | CustomObject:Budget__c | soql-object | SOQL FROM Budget__c |
| ApexClass:BudgetControllerTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:BudgetSelector | CustomObject:Budget__c | soql-object | SOQL FROM Budget__c |
| ApexClass:BudgetSelector | CustomField:Budget__c.Total_Allocated__c | soql-field | Budget__c.Total_Allocated__c |
| ApexClass:BudgetSelector | CustomField:Budget__c.Consumed_Amount__c | soql-field | Budget__c.Consumed_Amount__c |
| ApexClass:BudgetSelector | CustomField:Budget__c.Remaining_Budget__c | soql-field | Budget__c.Remaining_Budget__c |
| ApexClass:BudgetSelector | CustomField:Budget__c.Financial_Year__c | soql-field | Budget__c.Financial_Year__c |
| ApexClass:BudgetSelector | CustomField:Budget__c.Year__c | soql-field | Budget__c.Year__c |
| ApexClass:BudgetSelector | CustomField:Budget__c.Status__c | soql-field | Budget__c.Status__c |
| ApexClass:BudgetSelector | CustomField:Budget__c.Zone__c | soql-field | Budget__c.Zone__c |
| ApexClass:BudgetSelector | CustomField:Budget__c.Zone_Manager__c | soql-field | Budget__c.Zone_Manager__c |
| ApexClass:BudgetSelector | CustomObject:Budget__Share | soql-object | SOQL FROM Budget__Share |
| ApexClass:BudgetSelector | CustomObject:Maintenance_Request__c | soql-object | SOQL FROM Maintenance_Request__c |
| ApexClass:BudgetSelector | CustomField:Maintenance_Request__c.Infrastructure_Asset__c | soql-field | Maintenance_Request__c.Infrastructure_Asset__c |
| ApexClass:BudgetSelector | CustomField:Maintenance_Request__c.Status__c | soql-field | Maintenance_Request__c.Status__c |
| ApexClass:BudgetSelector | CustomObject:Expense_Record__c | soql-object | SOQL FROM Expense_Record__c |
| ApexClass:BudgetSelector | CustomField:Expense_Record__c.Budget__c | soql-field | Expense_Record__c.Budget__c |
| ApexClass:BudgetSelector | CustomObject:Infrastructure_Asset__c | soql-object | SOQL FROM Infrastructure_Asset__c |
| ApexClass:BudgetSelector | CustomField:Infrastructure_Asset__c.City_Zone__c | soql-field | Infrastructure_Asset__c.City_Zone__c |
| ApexClass:BudgetSelector | CustomObject:City_Zone__c | soql-object | SOQL FROM City_Zone__c |
| ApexClass:BudgetSelector | CustomField:City_Zone__c.Zone_Manager__c | soql-field | City_Zone__c.Zone_Manager__c |
| ApexClass:BudgetSelector | CustomObject:Expense_Record__Share | soql-object | SOQL FROM Expense_Record__Share |
| ApexClass:BudgetSelector | CustomObject:Expense_Records__r | soql-object | SOQL FROM Expense_Records__r |
| ApexClass:BudgetServiceTest | CustomObject:Budget__c | soql-object | SOQL FROM Budget__c |
| ApexClass:BudgetServiceTest | CustomField:Budget__c.Consumed_Amount__c | soql-field | Budget__c.Consumed_Amount__c |
| ApexClass:BudgetServiceTest | CustomObject:Infrastructure_Asset__c | soql-object | SOQL FROM Infrastructure_Asset__c |
| ApexClass:BudgetServiceTest | CustomObject:Maintenance_Request__c | soql-object | SOQL FROM Maintenance_Request__c |
| ApexClass:BudgetServiceTest | CustomField:Maintenance_Request__c.Status__c | soql-field | Maintenance_Request__c.Status__c |
| ApexClass:BudgetServiceTest | CustomObject:Expense_Record__c | soql-object | SOQL FROM Expense_Record__c |
| ApexClass:BudgetServiceTest | CustomField:Expense_Record__c.Amount__c | soql-field | Expense_Record__c.Amount__c |
| ApexClass:BudgetTriggerTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:BudgetTriggerTest | CustomObject:Budget__Share | soql-object | SOQL FROM Budget__Share |
| ApexClass:ChecklistSelector | CustomObject:Checklist_Question__c | soql-object | SOQL FROM Checklist_Question__c |
| ApexClass:ChecklistSelector | CustomField:Checklist_Question__c.Question__c | soql-field | Checklist_Question__c.Question__c |
| ApexClass:ChecklistSelector | CustomField:Checklist_Question__c.Sequence__c | soql-field | Checklist_Question__c.Sequence__c |
| ApexClass:ChecklistSelector | CustomField:Checklist_Question__c.Required__c | soql-field | Checklist_Question__c.Required__c |
| ApexClass:ChecklistSelector | CustomField:Checklist_Question__c.Response_Type__c | soql-field | Checklist_Question__c.Response_Type__c |
| ApexClass:ChecklistSelector | CustomField:Checklist_Question__c.Trigger_Response__c | soql-field | Checklist_Question__c.Trigger_Response__c |
| ApexClass:ChecklistSelector | CustomField:Checklist_Question__c.Trigger_Question__c | soql-field | Checklist_Question__c.Trigger_Question__c |
| ApexClass:ChecklistSelector | CustomObject:Checklist_Template__c | soql-object | SOQL FROM Checklist_Template__c |
| ApexClass:ChecklistSelector | CustomField:Checklist_Template__c.Version__c | soql-field | Checklist_Template__c.Version__c |
| ApexClass:ChecklistSelector | CustomField:Checklist_Template__c.Asset_Type__c | soql-field | Checklist_Template__c.Asset_Type__c |
| ApexClass:ChecklistSelector | CustomObject:Inspection_Checklist__c | soql-object | SOQL FROM Inspection_Checklist__c |
| ApexClass:ChecklistSelector | CustomField:Inspection_Checklist__c.Item_Label__c | soql-field | Inspection_Checklist__c.Item_Label__c |
| ApexClass:CitizenRequestControllerTest | CustomObject:Mock | soql-object | SOQL FROM Mock |
| ApexClass:CitizenRequestSelector | CustomObject:Citizen_Request__c | soql-object | SOQL FROM Citizen_Request__c |
| ApexClass:CitizenRequestSelector | CustomField:Citizen_Request__c.Description__c | soql-field | Citizen_Request__c.Description__c |
| ApexClass:CitizenRequestSelector | CustomField:Citizen_Request__c.Priority__c | soql-field | Citizen_Request__c.Priority__c |
| ApexClass:CitizenRequestSelector | CustomField:Citizen_Request__c.Status__c | soql-field | Citizen_Request__c.Status__c |
| ApexClass:CitizenRequestSelector | CustomField:Citizen_Request__c.Maintenance_Request__c | soql-field | Citizen_Request__c.Maintenance_Request__c |
| ApexClass:CitizenRequestSelector | CustomField:Citizen_Request__c.Geo_Latitude__c | soql-field | Citizen_Request__c.Geo_Latitude__c |
| ApexClass:CitizenRequestSelector | CustomField:Citizen_Request__c.Geo_Longitude__c | soql-field | Citizen_Request__c.Geo_Longitude__c |
| ApexClass:CitizenRequestSelector | CustomObject:ContentDocumentLink | soql-object | SOQL FROM ContentDocumentLink |
| ApexClass:CitizenRequestSelectorTest | CustomObject:Citizen_Request__c | soql-object | SOQL FROM Citizen_Request__c |
| ApexClass:CitizenRequestService | CustomObject:Citizen | soql-object | SOQL FROM Citizen |
| ApexClass:CitizenRequestServiceTest | CustomObject:Maintenance_Request__c | soql-object | SOQL FROM Maintenance_Request__c |
| ApexClass:CitizenRequestServiceTest | CustomField:Maintenance_Request__c.Status__c | soql-field | Maintenance_Request__c.Status__c |
| ApexClass:CitizenRequestServiceTest | CustomField:Maintenance_Request__c.Priority__c | soql-field | Maintenance_Request__c.Priority__c |
| ApexClass:CitizenRequestServiceTest | CustomField:Maintenance_Request__c.Infrastructure_Asset__c | soql-field | Maintenance_Request__c.Infrastructure_Asset__c |
| ApexClass:CitizenRequestServiceTest | CustomObject:Audit_Log__c | soql-object | SOQL FROM Audit_Log__c |
| ApexClass:CitizenRequestServiceTest | CustomField:Audit_Log__c.Message__c | soql-field | Audit_Log__c.Message__c |
| ApexClass:CitizenRequestServiceTest | CustomObject:Citizen_Request__c | soql-object | SOQL FROM Citizen_Request__c |
| ApexClass:CitizenRequestServiceTest | CustomField:Citizen_Request__c.Status__c | soql-field | Citizen_Request__c.Status__c |
| ApexClass:CitizenRequestTriggerHandlerTest | CustomObject:Maintenance_Request__c | soql-object | SOQL FROM Maintenance_Request__c |
| ApexClass:CitizenRequestTriggerHandlerTest | CustomField:Maintenance_Request__c.Status__c | soql-field | Maintenance_Request__c.Status__c |
| ApexClass:CitizenRequestTriggerHandlerTest | CustomField:Maintenance_Request__c.Priority__c | soql-field | Maintenance_Request__c.Priority__c |
| ApexClass:CitizenRequestTriggerHandlerTest | CustomObject:Citizen_Request__c | soql-object | SOQL FROM Citizen_Request__c |
| ApexClass:CitizenRequestTriggerHandlerTest | CustomField:Citizen_Request__c.Status__c | soql-field | Citizen_Request__c.Status__c |
| ApexClass:CityZoneControllerTest | CustomObject:City_Zone__c | soql-object | SOQL FROM City_Zone__c |
| ApexClass:CommissionerTriggerTest | CustomObject:Maintenance_Request__c | soql-object | SOQL FROM Maintenance_Request__c |
| ApexClass:CommissionerTriggerTest | CustomField:Maintenance_Request__c.Approval_Status__c | soql-field | Maintenance_Request__c.Approval_Status__c |
| ApexClass:CommissionerTriggerTest | CustomField:Maintenance_Request__c.Priority__c | soql-field | Maintenance_Request__c.Priority__c |
| ApexClass:ContractorAssignmentSelector | CustomObject:Contractor_Assignment__c | soql-object | SOQL FROM Contractor_Assignment__c |
| ApexClass:ContractorAssignmentSelector | CustomField:Contractor_Assignment__c.Maintenance_Request__c | soql-field | Contractor_Assignment__c.Maintenance_Request__c |
| ApexClass:ContractorAssignmentSelector | CustomField:Contractor_Assignment__c.Vendor__c | soql-field | Contractor_Assignment__c.Vendor__c |
| ApexClass:ContractorAssignmentSelector | CustomField:Contractor_Assignment__c.Status__c | soql-field | Contractor_Assignment__c.Status__c |
| ApexClass:ContractorAssignmentSelector | CustomField:Contractor_Assignment__c.Cost_Estimate__c | soql-field | Contractor_Assignment__c.Cost_Estimate__c |
| ApexClass:ContractorAssignmentSelector | CustomField:Contractor_Assignment__c.Final_Cost__c | soql-field | Contractor_Assignment__c.Final_Cost__c |
| ApexClass:ContractorAssignmentSelector | CustomField:Contractor_Assignment__c.Assigned_Date__c | soql-field | Contractor_Assignment__c.Assigned_Date__c |
| ApexClass:ContractorAssignmentSelector | CustomField:Contractor_Assignment__c.Accepted_Date__c | soql-field | Contractor_Assignment__c.Accepted_Date__c |
| ApexClass:ContractorAssignmentSelector | CustomField:Contractor_Assignment__c.Completion_Date__c | soql-field | Contractor_Assignment__c.Completion_Date__c |
| ApexClass:ContractorAssignmentServiceTest | CustomObject:Contractor_Assignment__c | soql-object | SOQL FROM Contractor_Assignment__c |
| ApexClass:ContractorAssignmentServiceTest | CustomField:Contractor_Assignment__c.Status__c | soql-field | Contractor_Assignment__c.Status__c |
| ApexClass:ContractorAssignmentServiceTest | CustomField:Contractor_Assignment__c.Vendor__c | soql-field | Contractor_Assignment__c.Vendor__c |
| ApexClass:ContractorAssignmentServiceTest | CustomField:Contractor_Assignment__c.Maintenance_Request__c | soql-field | Contractor_Assignment__c.Maintenance_Request__c |
| ApexClass:ContractorAssignmentServiceTest | CustomObject:Maintenance_Request__c | soql-object | SOQL FROM Maintenance_Request__c |
| ApexClass:ContractorAssignmentServiceTest | CustomField:Maintenance_Request__c.Status__c | soql-field | Maintenance_Request__c.Status__c |
| ApexClass:ContractorAssignmentServiceTest | CustomObject:Vendor__c | soql-object | SOQL FROM Vendor__c |
| ApexClass:ContractorAssignmentServiceTest | CustomField:Vendor__c.Rating__c | soql-field | Vendor__c.Rating__c |
| ApexClass:ContractorAssignmentTriggerHandlerTest | CustomObject:Contractor_Assignment__c | soql-object | SOQL FROM Contractor_Assignment__c |
| ApexClass:ContractorAssignmentTriggerHandlerTest | CustomField:Contractor_Assignment__c.Status__c | soql-field | Contractor_Assignment__c.Status__c |
| ApexClass:DailyInspectionReminderSchedulerTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:DailyInspectionReminderSchedulerTest | CustomObject:Audit_Log__c | soql-object | SOQL FROM Audit_Log__c |
| ApexClass:EngineerAssignmentServiceTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:EngineerAssignmentServiceTest | CustomObject:Field_Engineer__c | soql-object | SOQL FROM Field_Engineer__c |
| ApexClass:EngineerAssignmentServiceTest | CustomField:Field_Engineer__c.Current_Workload__c | soql-field | Field_Engineer__c.Current_Workload__c |
| ApexClass:EngineerAssignmentServiceTest | CustomObject:Maintenance_Request__Share | soql-object | SOQL FROM Maintenance_Request__Share |
| ApexClass:EngineerAssignmentServiceTest | CustomObject:Maintenance_Request__c | soql-object | SOQL FROM Maintenance_Request__c |
| ApexClass:EngineerAssignmentServiceTest | CustomField:Maintenance_Request__c.Assigned_Engineer__c | soql-field | Maintenance_Request__c.Assigned_Engineer__c |
| ApexClass:EngineerAssignmentServiceTest | CustomField:Maintenance_Request__c.Status__c | soql-field | Maintenance_Request__c.Status__c |
| ApexClass:EngineerControllerTest | CustomObject:Field_Engineer__c | soql-object | SOQL FROM Field_Engineer__c |
| ApexClass:EngineerControllerTest | CustomObject:User | soql-object | SOQL FROM User |
| ApexClass:EngineerControllerTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:EngineerControllerTest | CustomObject:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:EngineerSelector | CustomObject:Field_Engineer__c | soql-object | SOQL FROM Field_Engineer__c |
| ApexClass:EngineerSelector | CustomField:Field_Engineer__c.Skill__c | soql-field | Field_Engineer__c.Skill__c |
| ApexClass:EngineerSelector | CustomField:Field_Engineer__c.City_Zone__c | soql-field | Field_Engineer__c.City_Zone__c |
| ApexClass:EngineerSelector | CustomField:Field_Engineer__c.Current_Workload__c | soql-field | Field_Engineer__c.Current_Workload__c |
| ApexClass:EngineerSelector | CustomField:Field_Engineer__c.Status__c | soql-field | Field_Engineer__c.Status__c |
| ApexClass:EngineerSelector | CustomField:Field_Engineer__c.User__c | soql-field | Field_Engineer__c.User__c |
| ApexClass:EngineerSelector | CustomField:Field_Engineer__c.Location_Latitude__c | soql-field | Field_Engineer__c.Location_Latitude__c |
| ApexClass:EngineerSelector | CustomField:Field_Engineer__c.Location_Longitude__c | soql-field | Field_Engineer__c.Location_Longitude__c |
| ApexClass:EngineerSelector | CustomObject:Maintenance_Requests__r | soql-object | SOQL FROM Maintenance_Requests__r |
| ApexClass:EngineerSelector | CustomObject:Citizen_Request__c | soql-object | SOQL FROM Citizen_Request__c |
| ApexClass:EngineerSelector | CustomField:Citizen_Request__c.City_Zone__c | soql-field | Citizen_Request__c.City_Zone__c |
| ApexClass:EngineerSelector | CustomField:Citizen_Request__c.Geo_Latitude__c | soql-field | Citizen_Request__c.Geo_Latitude__c |
| ApexClass:EngineerSelector | CustomField:Citizen_Request__c.Geo_Longitude__c | soql-field | Citizen_Request__c.Geo_Longitude__c |
| ApexClass:EngineerSelector | CustomField:Citizen_Request__c.Asset__c | soql-field | Citizen_Request__c.Asset__c |
| ApexClass:EngineerSelector | CustomField:Citizen_Request__c.Status__c | soql-field | Citizen_Request__c.Status__c |
| ApexClass:EngineerSelector | CustomField:Citizen_Request__c.Maintenance_Request__c | soql-field | Citizen_Request__c.Maintenance_Request__c |
| ApexClass:EngineerSelector | CustomObject:Infrastructure_Asset__c | soql-object | SOQL FROM Infrastructure_Asset__c |
| ApexClass:EngineerSelector | CustomField:Infrastructure_Asset__c.Latitude__c | soql-field | Infrastructure_Asset__c.Latitude__c |
| ApexClass:EngineerSelector | CustomField:Infrastructure_Asset__c.Longitude__c | soql-field | Infrastructure_Asset__c.Longitude__c |
| ApexClass:EngineerSelector | CustomObject:Maintenance_Request__c | soql-object | SOQL FROM Maintenance_Request__c |
| ApexClass:EngineerSelector | CustomField:Maintenance_Request__c.Assigned_Engineer__c | soql-field | Maintenance_Request__c.Assigned_Engineer__c |
| ApexClass:EngineerSelector | CustomField:Maintenance_Request__c.Created_By_Citizen__c | soql-field | Maintenance_Request__c.Created_By_Citizen__c |
| ApexClass:EngineerSelector | CustomField:Maintenance_Request__c.Status__c | soql-field | Maintenance_Request__c.Status__c |
| ApexClass:EscalationSelector | CustomObject:Escalation__c | soql-object | SOQL FROM Escalation__c |
| ApexClass:ExpenseSelector | CustomObject:Expense_Record__c | soql-object | SOQL FROM Expense_Record__c |
| ApexClass:ExpenseSelector | CustomField:Expense_Record__c.Amount__c | soql-field | Expense_Record__c.Amount__c |
| ApexClass:ExpenseSelector | CustomField:Expense_Record__c.Budget__c | soql-field | Expense_Record__c.Budget__c |
| ApexClass:ExpenseSelector | CustomField:Expense_Record__c.Expense_Date__c | soql-field | Expense_Record__c.Expense_Date__c |
| ApexClass:ExpenseSelector | CustomField:Expense_Record__c.Invoice_Number__c | soql-field | Expense_Record__c.Invoice_Number__c |
| ApexClass:ExpenseSelector | CustomField:Expense_Record__c.Description__c | soql-field | Expense_Record__c.Description__c |
| ApexClass:ExpenseSelector | CustomField:Expense_Record__c.Vendor__c | soql-field | Expense_Record__c.Vendor__c |
| ApexClass:ExpenseSelector | CustomField:Expense_Record__c.Maintenance_Request__c | soql-field | Expense_Record__c.Maintenance_Request__c |
| ApexClass:ExpenseSelector | CustomField:Expense_Record__c.Zone_Manager__c | soql-field | Expense_Record__c.Zone_Manager__c |
| ApexClass:ExpenseTriggerHandlerTest | CustomObject:Budget__c | soql-object | SOQL FROM Budget__c |
| ApexClass:ExpenseTriggerHandlerTest | CustomField:Budget__c.Consumed_Amount__c | soql-field | Budget__c.Consumed_Amount__c |
| ApexClass:InspectionSelector | CustomObject:Inspection__c | soql-object | SOQL FROM Inspection__c |
| ApexClass:InspectionSelector | CustomField:Inspection__c.Status__c | soql-field | Inspection__c.Status__c |
| ApexClass:InspectionSelector | CustomField:Inspection__c.Result__c | soql-field | Inspection__c.Result__c |
| ApexClass:InspectionSelector | CustomField:Inspection__c.Maintenance_Request__c | soql-field | Inspection__c.Maintenance_Request__c |
| ApexClass:InspectionSelector | CustomField:Inspection__c.Estimated_Repair_Cost__c | soql-field | Inspection__c.Estimated_Repair_Cost__c |
| ApexClass:InspectionSelector | CustomField:Inspection__c.Engineer__c | soql-field | Inspection__c.Engineer__c |
| ApexClass:InspectionSelector | CustomField:Inspection__c.Remarks__c | soql-field | Inspection__c.Remarks__c |
| ApexClass:InspectionSelector | CustomField:Inspection__c.Infrastructure_Asset__c | soql-field | Inspection__c.Infrastructure_Asset__c |
| ApexClass:InspectionSelector | CustomObject:ContentDocumentLink | soql-object | SOQL FROM ContentDocumentLink |
| ApexClass:InspectionSelector | CustomObject:ContentVersion | soql-object | SOQL FROM ContentVersion |
| ApexClass:InspectionSelector | CustomObject:Inspection_Response__c | soql-object | SOQL FROM Inspection_Response__c |
| ApexClass:InspectionSelector | CustomField:Inspection_Response__c.Response__c | soql-field | Inspection_Response__c.Response__c |
| ApexClass:InspectionSelector | CustomObject:Inspection_Responses__r | soql-object | SOQL FROM Inspection_Responses__r |
| ApexClass:InspectionServiceTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:InspectionServiceTest | CustomObject:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:InspectionServiceTest | CustomObject:Maintenance_Request__c | soql-object | SOQL FROM Maintenance_Request__c |
| ApexClass:InspectionServiceTest | CustomField:Maintenance_Request__c.Status__c | soql-field | Maintenance_Request__c.Status__c |
| ApexClass:InspectionServiceTest | CustomObject:Inspection_Response__c | soql-object | SOQL FROM Inspection_Response__c |
| ApexClass:InspectionServiceTest | CustomField:Inspection_Response__c.Response__c | soql-field | Inspection_Response__c.Response__c |
| ApexClass:InspectionServiceTest | CustomObject:ContentVersion | soql-object | SOQL FROM ContentVersion |
| ApexClass:InspectionServiceTest | CustomObject:Infrastructure_Asset__c | soql-object | SOQL FROM Infrastructure_Asset__c |
| ApexClass:InspectionServiceTest | CustomField:Infrastructure_Asset__c.Health_Score__c | soql-field | Infrastructure_Asset__c.Health_Score__c |
| ApexClass:InspectionTriggerHandlerTest | CustomObject:Inspection_Response__c | soql-object | SOQL FROM Inspection_Response__c |
| ApexClass:InspectionTriggerHandlerTest | CustomField:Inspection_Response__c.Response__c | soql-field | Inspection_Response__c.Response__c |
| ApexClass:InspectionTriggerHandlerTest | CustomObject:ContentVersion | soql-object | SOQL FROM ContentVersion |
| ApexClass:InspectionTriggerHandlerTest | CustomObject:Inspection__c | soql-object | SOQL FROM Inspection__c |
| ApexClass:InspectionTriggerHandlerTest | CustomField:Inspection__c.Overall_Condition__c | soql-field | Inspection__c.Overall_Condition__c |
| ApexClass:MaintenanceRequestControllerTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:MaintenanceRequestControllerTest | CustomObject:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:MaintenanceRequestControllerTest | CustomObject:Maintenance_Request__c | soql-object | SOQL FROM Maintenance_Request__c |
| ApexClass:MaintenanceRequestControllerTest | CustomField:Maintenance_Request__c.Status__c | soql-field | Maintenance_Request__c.Status__c |
| ApexClass:MaintenanceRequestControllerTest | CustomObject:Audit_Log__c | soql-object | SOQL FROM Audit_Log__c |
| ApexClass:MaintenanceRequestControllerTest | CustomField:Audit_Log__c.Message__c | soql-field | Audit_Log__c.Message__c |
| ApexClass:MaintenanceRequestQueueableTest | CustomObject:Maintenance_Request__c | soql-object | SOQL FROM Maintenance_Request__c |
| ApexClass:MaintenanceRequestQueueableTest | CustomField:Maintenance_Request__c.Status__c | soql-field | Maintenance_Request__c.Status__c |
| ApexClass:MaintenanceRequestSharingServiceTest | CustomObject:Maintenance_Request__Share | soql-object | SOQL FROM Maintenance_Request__Share |
| ApexClass:MaintenanceRequestTriggerHandlerTest | CustomObject:Maintenance_Request__c | soql-object | SOQL FROM Maintenance_Request__c |
| ApexClass:MaintenanceRequestTriggerHandlerTest | CustomField:Maintenance_Request__c.Status__c | soql-field | Maintenance_Request__c.Status__c |
| ApexClass:MaintenanceRequestTriggerHandlerTest | CustomField:Maintenance_Request__c.Due_Date__c | soql-field | Maintenance_Request__c.Due_Date__c |
| ApexClass:MaintenanceRequestTriggerHandlerTest | CustomField:Maintenance_Request__c.Assigned_Engineer__c | soql-field | Maintenance_Request__c.Assigned_Engineer__c |
| ApexClass:MaintenanceRequestTriggerHandlerTest | CustomObject:User | soql-object | SOQL FROM User |
| ApexClass:MaintenanceRequestTriggerHandlerTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:MaintenanceRequestTriggerHandlerTest | CustomObject:Maintenance_Request__Share | soql-object | SOQL FROM Maintenance_Request__Share |
| ApexClass:MaintenanceRequestTriggerHandlerTest | CustomObject:Field_Engineer__c | soql-object | SOQL FROM Field_Engineer__c |
| ApexClass:MaintenanceRequestTriggerHandlerTest | CustomField:Field_Engineer__c.Current_Workload__c | soql-field | Field_Engineer__c.Current_Workload__c |
| ApexClass:MaintenanceRequestTriggerHandlerTest | CustomObject:Citizen_Request__c | soql-object | SOQL FROM Citizen_Request__c |
| ApexClass:MaintenanceRequestTriggerHandlerTest | CustomField:Citizen_Request__c.Status__c | soql-field | Citizen_Request__c.Status__c |
| ApexClass:MaintenanceRequestTriggerHandlerTest | CustomObject:Assignment_History__c | soql-object | SOQL FROM Assignment_History__c |
| ApexClass:MaintenanceRequestTriggerHandlerTest | CustomField:Assignment_History__c.Old_Engineer__c | soql-field | Assignment_History__c.Old_Engineer__c |
| ApexClass:MaintenanceRequestTriggerHandlerTest | CustomField:Assignment_History__c.New_Engineer__c | soql-field | Assignment_History__c.New_Engineer__c |
| ApexClass:MaintenanceRequestTriggerHandlerTest | CustomField:Assignment_History__c.Maintenance_Request__c | soql-field | Assignment_History__c.Maintenance_Request__c |
| ApexClass:MaintenanceSelector | CustomObject:Maintenance_Request__c | soql-object | SOQL FROM Maintenance_Request__c |
| ApexClass:MaintenanceSelector | CustomField:Maintenance_Request__c.Status__c | soql-field | Maintenance_Request__c.Status__c |
| ApexClass:MaintenanceSelector | CustomField:Maintenance_Request__c.Priority__c | soql-field | Maintenance_Request__c.Priority__c |
| ApexClass:MaintenanceSelector | CustomField:Maintenance_Request__c.Due_Date__c | soql-field | Maintenance_Request__c.Due_Date__c |
| ApexClass:MaintenanceSelector | CustomField:Maintenance_Request__c.Created_By_Citizen__c | soql-field | Maintenance_Request__c.Created_By_Citizen__c |
| ApexClass:MaintenanceSelector | CustomField:Maintenance_Request__c.Estimated_Repair_Cost__c | soql-field | Maintenance_Request__c.Estimated_Repair_Cost__c |
| ApexClass:MaintenanceSelector | CustomField:Maintenance_Request__c.Approval_Status__c | soql-field | Maintenance_Request__c.Approval_Status__c |
| ApexClass:MaintenanceSelector | CustomField:Maintenance_Request__c.Infrastructure_Asset__c | soql-field | Maintenance_Request__c.Infrastructure_Asset__c |
| ApexClass:MaintenanceSelector | CustomField:Maintenance_Request__c.SLA_Status__c | soql-field | Maintenance_Request__c.SLA_Status__c |
| ApexClass:MaintenanceSelector | CustomField:Maintenance_Request__c.Assigned_Engineer__c | soql-field | Maintenance_Request__c.Assigned_Engineer__c |
| ApexClass:MaintenanceServiceTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:MaintenanceServiceTest | CustomObject:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:MaintenanceServiceTest | CustomObject:Infrastructure_Asset__c | soql-object | SOQL FROM Infrastructure_Asset__c |
| ApexClass:ManagementApprovalServiceTest | CustomObject:Maintenance_Request__c | soql-object | SOQL FROM Maintenance_Request__c |
| ApexClass:ManagementApprovalServiceTest | CustomField:Maintenance_Request__c.Approval_Status__c | soql-field | Maintenance_Request__c.Approval_Status__c |
| ApexClass:ManagementApprovalServiceTest | CustomField:Maintenance_Request__c.Estimated_Repair_Cost__c | soql-field | Maintenance_Request__c.Estimated_Repair_Cost__c |
| ApexClass:ManagementApprovalServiceTest | CustomObject:Maintenance_Approval__c | soql-object | SOQL FROM Maintenance_Approval__c |
| ApexClass:ManagementApprovalServiceTest | CustomField:Maintenance_Approval__c.Approval_Level__c | soql-field | Maintenance_Approval__c.Approval_Level__c |
| ApexClass:ManagementApprovalServiceTest | CustomField:Maintenance_Approval__c.Decision__c | soql-field | Maintenance_Approval__c.Decision__c |
| ApexClass:ManagementApprovalServiceTest | CustomField:Maintenance_Approval__c.Comments__c | soql-field | Maintenance_Approval__c.Comments__c |
| ApexClass:ManagementAssignmentServiceTest | CustomObject:User | soql-object | SOQL FROM User |
| ApexClass:ManagementAssignmentServiceTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:ManagementAssignmentServiceTest | CustomObject:Maintenance_Request__c | soql-object | SOQL FROM Maintenance_Request__c |
| ApexClass:ManagementAssignmentServiceTest | CustomField:Maintenance_Request__c.Status__c | soql-field | Maintenance_Request__c.Status__c |
| ApexClass:ManagementAssignmentServiceTest | CustomField:Maintenance_Request__c.Assigned_Engineer__c | soql-field | Maintenance_Request__c.Assigned_Engineer__c |
| ApexClass:ManagementAssignmentServiceTest | CustomField:Maintenance_Request__c.Assignment_Type__c | soql-field | Maintenance_Request__c.Assignment_Type__c |
| ApexClass:ManagementAssignmentServiceTest | CustomObject:Assignment_History__c | soql-object | SOQL FROM Assignment_History__c |
| ApexClass:ManagementAssignmentServiceTest | CustomField:Assignment_History__c.Old_Engineer__c | soql-field | Assignment_History__c.Old_Engineer__c |
| ApexClass:ManagementAssignmentServiceTest | CustomField:Assignment_History__c.New_Engineer__c | soql-field | Assignment_History__c.New_Engineer__c |
| ApexClass:ManagementAssignmentServiceTest | CustomField:Assignment_History__c.Assigned_By__c | soql-field | Assignment_History__c.Assigned_By__c |
| ApexClass:ManagementAssignmentServiceTest | CustomField:Assignment_History__c.Assignment_Type__c | soql-field | Assignment_History__c.Assignment_Type__c |
| ApexClass:ManagementAssignmentServiceTest | CustomField:Assignment_History__c.Reason__c | soql-field | Assignment_History__c.Reason__c |
| ApexClass:ManagementEscalationServiceTest | CustomObject:Escalation__c | soql-object | SOQL FROM Escalation__c |
| ApexClass:ManagementEscalationServiceTest | CustomField:Escalation__c.Maintenance_Request__c | soql-field | Escalation__c.Maintenance_Request__c |
| ApexClass:ManagementEscalationServiceTest | CustomField:Escalation__c.Reason__c | soql-field | Escalation__c.Reason__c |
| ApexClass:ManagementEscalationServiceTest | CustomField:Escalation__c.Escalated_To__c | soql-field | Escalation__c.Escalated_To__c |
| ApexClass:ManagementEscalationServiceTest | CustomField:Escalation__c.Priority__c | soql-field | Escalation__c.Priority__c |
| ApexClass:ManagementEscalationServiceTest | CustomField:Escalation__c.Resolved__c | soql-field | Escalation__c.Resolved__c |
| ApexClass:ManagementEscalationServiceTest | CustomField:Escalation__c.Resolution_Notes__c | soql-field | Escalation__c.Resolution_Notes__c |
| ApexClass:ManagementEscalationServiceTest | CustomObject:Audit_Log__c | soql-object | SOQL FROM Audit_Log__c |
| ApexClass:ManagementEscalationServiceTest | CustomField:Audit_Log__c.Message__c | soql-field | Audit_Log__c.Message__c |
| ApexClass:ManagementNotificationServiceTest | CustomObject:User | soql-object | SOQL FROM User |
| ApexClass:ManagementNotificationServiceTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:ManagementNotificationServiceTest | CustomObject:Notification__c | soql-object | SOQL FROM Notification__c |
| ApexClass:ManagementNotificationServiceTest | CustomField:Notification__c.Title__c | soql-field | Notification__c.Title__c |
| ApexClass:ManagementNotificationServiceTest | CustomField:Notification__c.Message__c | soql-field | Notification__c.Message__c |
| ApexClass:ManagementNotificationServiceTest | CustomField:Notification__c.Recipient__c | soql-field | Notification__c.Recipient__c |
| ApexClass:ManagementWorkflowHandlerTest | CustomObject:Maintenance_Request__c | soql-object | SOQL FROM Maintenance_Request__c |
| ApexClass:ManagementWorkflowHandlerTest | CustomField:Maintenance_Request__c.Approval_Status__c | soql-field | Maintenance_Request__c.Approval_Status__c |
| ApexClass:ManagementWorkflowHandlerTest | CustomObject:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:ManagementWorkflowHandlerTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:NotificationCenterControllerTest | CustomObject:Audit_Log__c | soql-object | SOQL FROM Audit_Log__c |
| ApexClass:NotificationSecurityTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:NotificationSecurityTest | CustomObject:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:NotificationSecurityTest | CustomObject:Notification__c | soql-object | SOQL FROM Notification__c |
| ApexClass:NotificationSecurityTest | CustomField:Notification__c.Is_Read__c | soql-field | Notification__c.Is_Read__c |
| ApexClass:NotificationSecurityTriggerTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:NotificationSecurityTriggerTest | CustomObject:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:NotificationSelector | CustomObject:Notification__Share | soql-object | SOQL FROM Notification__Share |
| ApexClass:NotificationServiceTest | CustomObject:Audit_Log__c | soql-object | SOQL FROM Audit_Log__c |
| ApexClass:NotificationSharingServiceTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:NotificationSharingServiceTest | CustomObject:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:NotificationSharingServiceTest | CustomObject:Notification__Share | soql-object | SOQL FROM Notification__Share |
| ApexClass:NotificationSharingTriggerTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:NotificationSharingTriggerTest | CustomObject:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:NotificationSharingTriggerTest | CustomObject:Notification__Share | soql-object | SOQL FROM Notification__Share |
| ApexClass:OperationsHeadDashboardControllerTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:OperationsHeadDashboardControllerTest | CustomObject:Maintenance_Request__c | soql-object | SOQL FROM Maintenance_Request__c |
| ApexClass:SendSMSQueueableTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:SendSMSQueueableTest | CustomObject:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:SendSMSQueueableTest | CustomObject:Audit_Log__c | soql-object | SOQL FROM Audit_Log__c |
| ApexClass:SendSMSQueueableTest | CustomField:Audit_Log__c.Message__c | soql-field | Audit_Log__c.Message__c |
| ApexClass:SLABatch | CustomObject:Maintenance_Request__c | soql-object | SOQL FROM Maintenance_Request__c |
| ApexClass:SLABatch | CustomField:Maintenance_Request__c.Status__c | soql-field | Maintenance_Request__c.Status__c |
| ApexClass:SLABatch | CustomField:Maintenance_Request__c.SLA_Status__c | soql-field | Maintenance_Request__c.SLA_Status__c |
| ApexClass:SLABatch | CustomField:Maintenance_Request__c.Due_Date__c | soql-field | Maintenance_Request__c.Due_Date__c |
| ApexClass:SLABatch | CustomField:Maintenance_Request__c.Priority__c | soql-field | Maintenance_Request__c.Priority__c |
| ApexClass:SLABatchTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:SLABatchTest | CustomObject:Maintenance_Request__c | soql-object | SOQL FROM Maintenance_Request__c |
| ApexClass:SLABatchTest | CustomField:Maintenance_Request__c.SLA_Status__c | soql-field | Maintenance_Request__c.SLA_Status__c |
| ApexClass:SLABatchTest | CustomField:Maintenance_Request__c.Priority__c | soql-field | Maintenance_Request__c.Priority__c |
| ApexClass:SLABatchTest | CustomObject:Audit_Log__c | soql-object | SOQL FROM Audit_Log__c |
| ApexClass:SLABatchTest | CustomField:Audit_Log__c.Message__c | soql-field | Audit_Log__c.Message__c |
| ApexClass:SLABatchTest | CustomObject:CronTrigger | soql-object | SOQL FROM CronTrigger |
| ApexClass:SLABatchTest | CustomObject:SLA | soql-object | SOQL FROM SLA |
| ApexClass:SLASchedulerTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:SLASchedulerTest | CustomObject:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:SLAServiceTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:SLAServiceTest | CustomObject:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:SLAServiceTest | CustomObject:Maintenance_Request__c | soql-object | SOQL FROM Maintenance_Request__c |
| ApexClass:SLAServiceTest | CustomField:Maintenance_Request__c.SLA_Status__c | soql-field | Maintenance_Request__c.SLA_Status__c |
| ApexClass:TelemetryBatchTriggerHandler | CustomObject:event | soql-object | SOQL FROM event |
| ApexClass:TelemetryBatchTriggerTest | CustomObject:Audit_Log__c | soql-object | SOQL FROM Audit_Log__c |
| ApexClass:TelemetryBatchTriggerTest | CustomField:Audit_Log__c.Message__c | soql-field | Audit_Log__c.Message__c |
| ApexClass:TelemetryBatchTriggerTest | CustomField:Audit_Log__c.Record_Id__c | soql-field | Audit_Log__c.Record_Id__c |
| ApexClass:TimelineControllerTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:TimelineControllerTest | CustomObject:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:UserContextResolverTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:UserContextResolverTest | CustomObject:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:UserContextResolverTest | CustomObject:City_Zone__c | soql-object | SOQL FROM City_Zone__c |
| ApexClass:UserSelector | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:UserSelector | CustomObject:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:UserSelector | CustomObject:User | soql-object | SOQL FROM User |
| ApexClass:VendorAssignmentControllerTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:VendorAssignmentControllerTest | CustomObject:Contractor_Assignment__c | soql-object | SOQL FROM Contractor_Assignment__c |
| ApexClass:VendorAssignmentControllerTest | CustomField:Contractor_Assignment__c.Status__c | soql-field | Contractor_Assignment__c.Status__c |
| ApexClass:VendorAssignmentControllerTest | CustomField:Contractor_Assignment__c.Final_Cost__c | soql-field | Contractor_Assignment__c.Final_Cost__c |
| ApexClass:VendorAssignmentControllerTest | CustomField:Contractor_Assignment__c.Cost_Estimate__c | soql-field | Contractor_Assignment__c.Cost_Estimate__c |
| ApexClass:VendorPerformanceControllerTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:VendorPerformanceControllerTest | CustomObject:Vendor__c | soql-object | SOQL FROM Vendor__c |
| ApexClass:VendorSelector | CustomObject:Vendor__c | soql-object | SOQL FROM Vendor__c |
| ApexClass:VendorSelector | CustomField:Vendor__c.Rating__c | soql-field | Vendor__c.Rating__c |
| ApexClass:VendorSelector | CustomField:Vendor__c.Active__c | soql-field | Vendor__c.Active__c |
| ApexClass:VendorSelector | CustomField:Vendor__c.Email__c | soql-field | Vendor__c.Email__c |
| ApexClass:VendorSelector | CustomField:Vendor__c.Phone__c | soql-field | Vendor__c.Phone__c |
| ApexClass:VendorSelector | CustomField:Vendor__c.Specialization__c | soql-field | Vendor__c.Specialization__c |
| ApexClass:VendorSelector | CustomObject:Contractor_Assignments__r | soql-object | SOQL FROM Contractor_Assignments__r |
| ApexClass:ZoneDashboardControllerTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:ZoneDashboardControllerTest | CustomObject:UserRole | soql-object | SOQL FROM UserRole |
| ApexClass:ZoneManagerTriggerTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexClass:ZoneManagerTriggerTest | CustomObject:Maintenance_Request__c | soql-object | SOQL FROM Maintenance_Request__c |
| ApexClass:ZoneManagerTriggerTest | CustomField:Maintenance_Request__c.Approval_Status__c | soql-field | Maintenance_Request__c.Approval_Status__c |
| ApexClass:ZoneSelector | CustomObject:City_Zone__c | soql-object | SOQL FROM City_Zone__c |
| ApexClass:ZoneSelector | CustomField:City_Zone__c.City__c | soql-field | City_Zone__c.City__c |
| ApexClass:ZoneSelector | CustomField:City_Zone__c.Pincode__c | soql-field | City_Zone__c.Pincode__c |
| ApexClass:ZoneSelector | CustomField:City_Zone__c.State__c | soql-field | City_Zone__c.State__c |
| ApexClass:ZoneSelector | CustomField:City_Zone__c.Status__c | soql-field | City_Zone__c.Status__c |
| ApexClass:ZoneSelector | CustomField:City_Zone__c.Ward_Number__c | soql-field | City_Zone__c.Ward_Number__c |
| ApexClass:ZoneUtilTest | CustomObject:Profile | soql-object | SOQL FROM Profile |
| ApexTrigger:AssetTypeTrigger | CustomObject:Asset_Type__c | trigger-object | Trigger AssetTypeTrigger on Asset_Type__c |
| ApexTrigger:BudgetTrigger | CustomObject:Budget__c | trigger-object | Trigger BudgetTrigger on Budget__c |
| ApexTrigger:CitizenRequestTrigger | CustomObject:Citizen_Request__c | trigger-object | Trigger CitizenRequestTrigger on Citizen_Request__c |
| ApexTrigger:CommissionerTrigger | CustomObject:Maintenance_Request__c | trigger-object | Trigger CommissionerTrigger on Maintenance_Request__c |
| ApexTrigger:ContractorAssignmentTrigger | CustomObject:Contractor_Assignment__c | trigger-object | Trigger ContractorAssignmentTrigger on Contractor_Assignment__c |
| ApexTrigger:ExpenseTrigger | CustomObject:Expense_Record__c | trigger-object | Trigger ExpenseTrigger on Expense_Record__c |
| ApexTrigger:InfrastructureAlertTrigger | CustomObject:Infrastructure_Alert__e | trigger-object | Trigger InfrastructureAlertTrigger on Infrastructure_Alert__e |
| ApexTrigger:InspectionTrigger | CustomObject:Inspection__c | trigger-object | Trigger InspectionTrigger on Inspection__c |
| ApexTrigger:MaintenanceRequestTrigger | CustomObject:Maintenance_Request__c | trigger-object | Trigger MaintenanceRequestTrigger on Maintenance_Request__c |
| ApexTrigger:NotificationSecurityTrigger | CustomObject:Notification__c | trigger-object | Trigger NotificationSecurityTrigger on Notification__c |
| ApexTrigger:NotificationSharingTrigger | CustomObject:Notification__c | trigger-object | Trigger NotificationSharingTrigger on Notification__c |
| ApexTrigger:TelemetryBatchTrigger | CustomObject:Telemetry_Batch_Event__e | trigger-object | Trigger TelemetryBatchTrigger on Telemetry_Batch_Event__e |
| ApexTrigger:ZoneManagerTrigger | CustomObject:Maintenance_Request__c | trigger-object | Trigger ZoneManagerTrigger on Maintenance_Request__c |

## Circular Dependencies

### Cycle 1

- ApexClass:TimelineBuilder
- ApexClass:AssetSummaryBuilder
- ApexClass:DashboardContext
- ApexClass:AssetDashboardService

### Cycle 2

- ApexClass:EngineerService
- ApexClass:EngineerController


## High Risk Components

| Component | Type | Fan-In | Fan-Out | Risk | Reasons |
|---|---|---:|---:|---|---|
| InspectionService | ApexClass | 11 | 43 | HIGH | high fan-in, high fan-out, high coupling, unresolved references, direct LWC consumer |
| CitizenRequestController | ApexClass | 8 | 37 | HIGH | high fan-in, high fan-out, high coupling, unresolved references, direct LWC consumer |
| EngineerAssignmentService | ApexClass | 12 | 33 | HIGH | high fan-in, high fan-out, high coupling, unresolved references, direct LWC consumer |
| ZoneUtil | ApexClass | 18 | 12 | HIGH | high fan-in, high fan-out, high coupling, unresolved references, direct LWC consumer |
| VendorAssignmentController | ApexClass | 19 | 12 | HIGH | high fan-in, high fan-out, high coupling, direct LWC consumer |
| AssetSelector | ApexClass | 35 | 29 | HIGH | high fan-in, high fan-out, high coupling, unresolved references |
| EngineerSelector | ApexClass | 30 | 31 | HIGH | high fan-in, high fan-out, high coupling, unresolved references |
| BudgetSelector | ApexClass | 27 | 33 | HIGH | high fan-in, high fan-out, high coupling, unresolved references |
| MaintenanceSelector | ApexClass | 43 | 14 | HIGH | high fan-in, high fan-out, high coupling, unresolved references |
| BudgetService | ApexClass | 12 | 37 | HIGH | high fan-in, high fan-out, high coupling, unresolved references |
| AssetDTOs | ApexClass | 31 | 10 | HIGH | high fan-in, high fan-out, high coupling, unresolved references |
| InspectionSelector | ApexClass | 20 | 18 | HIGH | high fan-in, high fan-out, high coupling, unresolved references |
| CitizenRequestSelector | ApexClass | 20 | 11 | HIGH | high fan-in, high fan-out, high coupling, unresolved references |
| ZoneSelector | ApexClass | 20 | 11 | HIGH | high fan-in, high fan-out, high coupling, unresolved references |
| VendorSelector | ApexClass | 12 | 12 | HIGH | high fan-in, high fan-out, high coupling, unresolved references |
| ContractorAssignmentSelector | ApexClass | 13 | 11 | HIGH | high fan-in, high fan-out, high coupling, unresolved references |
| ExpenseSelector | ApexClass | 8 | 13 | HIGH | high fan-in, high fan-out, high coupling, unresolved references |
| TestDataFactory | ApexClass | 54 | 14 | HIGH | high fan-in, high fan-out, high coupling |
| ContractorAssignmentService | ApexClass | 15 | 16 | HIGH | high fan-in, high fan-out, high coupling |
| DashboardContext | ApexClass | 10 | 11 | HIGH | high fan-in, high fan-out, high coupling |
| ZoneDashboardController | ApexClass | 4 | 14 | HIGH | high fan-out, high coupling, unresolved references, direct LWC consumer |
| ManagementDashboardController | ApexClass | 7 | 16 | HIGH | high fan-out, high coupling, direct LWC consumer |
| AssetExplorerController | ApexClass | 11 | 6 | HIGH | high fan-in, high coupling, direct LWC consumer |
| EngineerService | ApexClass | 1 | 20 | HIGH | high fan-out, high coupling, unresolved references |
| AssetExplorerService | ApexClass | 5 | 15 | HIGH | high fan-out, high coupling, unresolved references |
| UserContextResolver | ApexClass | 6 | 13 | HIGH | high fan-out, high coupling, unresolved references |
| SLABatch | ApexClass | 3 | 13 | HIGH | high fan-out, high coupling, unresolved references |
| AssetDashboardService | ApexClass | 6 | 10 | HIGH | high fan-out, high coupling, unresolved references |
| CitizenRequestService | ApexClass | 6 | 10 | HIGH | high fan-out, high coupling, unresolved references |
| NotificationService | ApexClass | 9 | 6 | HIGH | high fan-in, high coupling, unresolved references |
| Maintenance_Request__c | Object | 148 | 0 | HIGH | high fan-in, high coupling |
| Infrastructure_Asset__c | Object | 98 | 0 | HIGH | high fan-in, high coupling |
| City_Zone__c | Object | 82 | 0 | HIGH | high fan-in, high coupling |
| User | External | 69 | 0 | HIGH | high fan-in, high coupling |
| Budget__c | Object | 47 | 0 | HIGH | high fan-in, high coupling |
| Field_Engineer__c | Object | 38 | 0 | HIGH | high fan-in, high coupling |
| Inspection__c | Object | 38 | 0 | HIGH | high fan-in, high coupling |
| Audit_Log__c | Object | 37 | 0 | HIGH | high fan-in, high coupling |
| Expense_Record__c | Object | 37 | 0 | HIGH | high fan-in, high coupling |
| AssetSelectorTest | ApexClass | 0 | 36 | HIGH | high fan-out, high coupling, unresolved references |
| InspectionServiceTest | ApexClass | 0 | 35 | HIGH | high fan-out, high coupling, unresolved references |
| Citizen_Request__c | Object | 35 | 0 | HIGH | high fan-in, high coupling |
| MaintenanceRequestTriggerHandlerTest | ApexClass | 0 | 33 | HIGH | high fan-out, high coupling, unresolved references |
| Profile | External | 33 | 0 | HIGH | high fan-in, high coupling |
| EngineerAssignmentServiceTest | ApexClass | 0 | 32 | HIGH | high fan-out, high coupling, unresolved references |
| Object:Profile | External | 31 | 0 | HIGH | high fan-in, high coupling |
| Vendor__c | Object | 30 | 0 | HIGH | high fan-in, high coupling |
| Contractor_Assignment__c | Object | 27 | 0 | HIGH | high fan-in, high coupling |
| AssetExplorerServiceTest | ApexClass | 0 | 26 | HIGH | high fan-out, high coupling, unresolved references |
| AssetDTOsTest | ApexClass | 0 | 25 | HIGH | high fan-out, high coupling, unresolved references |
| EngineerControllerTest | ApexClass | 0 | 25 | HIGH | high fan-out, high coupling, unresolved references |
| VendorAssignmentControllerTest | ApexClass | 0 | 25 | HIGH | high fan-out, high coupling, unresolved references |
| BudgetServiceTest | ApexClass | 0 | 24 | HIGH | high fan-out, high coupling, unresolved references |
| ManagementAssignmentServiceTest | ApexClass | 0 | 24 | HIGH | high fan-out, high coupling, unresolved references |
| SLABatchTest | ApexClass | 0 | 23 | HIGH | high fan-out, high coupling, unresolved references |
| CitizenRequestSelectorTest | ApexClass | 0 | 22 | HIGH | high fan-out, high coupling, unresolved references |
| InspectionTriggerHandlerTest | ApexClass | 0 | 22 | HIGH | high fan-out, high coupling, unresolved references |
| ZoneDashboardControllerTest | ApexClass | 0 | 22 | HIGH | high fan-out, high coupling, unresolved references |
| InspectionTriggerHandler | ApexClass | 4 | 18 | HIGH | high fan-out, high coupling |
| Notification__c | Object | 22 | 0 | HIGH | high fan-in, high coupling |
| BuildersTest | ApexClass | 0 | 21 | HIGH | high fan-out, high coupling, unresolved references |
| MaintenanceRequestControllerTest | ApexClass | 0 | 21 | HIGH | high fan-out, high coupling, unresolved references |
| ChecklistSelector | ApexClass | 6 | 15 | HIGH | high fan-out, high coupling |
| MaintenanceServiceTest | ApexClass | 0 | 20 | HIGH | high fan-out, high coupling, unresolved references |
| AuditLogService | ApexClass | 18 | 2 | HIGH | high fan-in, high coupling |
| UserContextResolverTest | ApexClass | 0 | 19 | HIGH | high fan-out, high coupling, unresolved references |
| UserRole | External | 19 | 0 | HIGH | high fan-in, high coupling |
| BudgetSelectorTest | ApexClass | 0 | 18 | HIGH | high fan-out, high coupling, unresolved references |
| DailyInspectionReminderSchedulerTest | ApexClass | 0 | 18 | HIGH | high fan-out, high coupling, unresolved references |
| AssetDashboardServiceTest | ApexClass | 0 | 17 | HIGH | high fan-out, high coupling, unresolved references |
| ManagementEscalationServiceTest | ApexClass | 0 | 17 | HIGH | high fan-out, high coupling, unresolved references |
| OperationsHeadDashboardControllerTest | ApexClass | 0 | 17 | HIGH | high fan-out, high coupling, unresolved references |
| SLAServiceTest | ApexClass | 0 | 17 | HIGH | high fan-out, high coupling, unresolved references |
| VendorPerformanceControllerTest | ApexClass | 0 | 17 | HIGH | high fan-out, high coupling, unresolved references |
| TriggerGuard | ApexClass | 17 | 0 | HIGH | high fan-in, high coupling |
| ApprovalFlowControllerTest | ApexClass | 0 | 16 | HIGH | high fan-out, high coupling, unresolved references |
| NotificationSecurityTest | ApexClass | 0 | 16 | HIGH | high fan-out, high coupling, unresolved references |
| MaintenanceRequestTriggerHandler | ApexClass | 4 | 12 | HIGH | high fan-out, high coupling |
| Object:UserRole | External | 16 | 0 | HIGH | high fan-in, high coupling |
| AssetExplorerControllerTest | ApexClass | 0 | 15 | HIGH | high fan-out, high coupling, unresolved references |
| ManagementApprovalServiceTest | ApexClass | 0 | 15 | HIGH | high fan-out, high coupling, unresolved references |
| ManagementWorkflowHandlerTest | ApexClass | 0 | 15 | HIGH | high fan-out, high coupling, unresolved references |
| ZoneUtilTest | ApexClass | 0 | 15 | HIGH | high fan-out, high coupling, unresolved references |
| TransactionCache | ApexClass | 15 | 0 | HIGH | high fan-in, high coupling |
| VendorPerformanceController | ApexClass | 3 | 11 | HIGH | high fan-out, unresolved references, direct LWC consumer |
| EngineerController | ApexClass | 8 | 5 | HIGH | high fan-in, unresolved references, direct LWC consumer |
