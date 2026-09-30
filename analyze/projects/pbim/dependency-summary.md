# Salesforce Dependency Analysis Summary

Generated: 2026-09-25T04:55:57.655Z

## Inventory

- Source files: 795
- Apex classes: 181
- Apex triggers: 13
- LWC JS: 30
- LWC HTML: 30
- Visualforce: 0
- Flows: 0
- Objects: 25
- Fields: 180
- Graph nodes: 528
- Graph edges: 2063
- Circular groups: 2

## Highest Impact Components

| Component | Type | Fan-In | Fan-Out | Coupling | Risk |
|---|---|---:|---:|---:|---|
| InspectionService | ApexClass | 11 | 43 | 54 | HIGH |
| CitizenRequestController | ApexClass | 8 | 37 | 45 | HIGH |
| EngineerAssignmentService | ApexClass | 12 | 33 | 45 | HIGH |
| ZoneUtil | ApexClass | 18 | 12 | 30 | HIGH |
| VendorAssignmentController | ApexClass | 19 | 12 | 31 | HIGH |
| AssetSelector | ApexClass | 35 | 29 | 64 | HIGH |
| EngineerSelector | ApexClass | 30 | 31 | 61 | HIGH |
| BudgetSelector | ApexClass | 27 | 33 | 60 | HIGH |
| MaintenanceSelector | ApexClass | 43 | 14 | 57 | HIGH |
| BudgetService | ApexClass | 12 | 37 | 49 | HIGH |
| AssetDTOs | ApexClass | 31 | 10 | 41 | HIGH |
| InspectionSelector | ApexClass | 20 | 18 | 38 | HIGH |
| CitizenRequestSelector | ApexClass | 20 | 11 | 31 | HIGH |
| ZoneSelector | ApexClass | 20 | 11 | 31 | HIGH |
| VendorSelector | ApexClass | 12 | 12 | 24 | HIGH |
| ContractorAssignmentSelector | ApexClass | 13 | 11 | 24 | HIGH |
| ExpenseSelector | ApexClass | 8 | 13 | 21 | HIGH |
| TestDataFactory | ApexClass | 54 | 14 | 68 | HIGH |
| ContractorAssignmentService | ApexClass | 15 | 16 | 31 | HIGH |
| DashboardContext | ApexClass | 10 | 11 | 21 | HIGH |
| ZoneDashboardController | ApexClass | 4 | 14 | 18 | HIGH |
| ManagementDashboardController | ApexClass | 7 | 16 | 23 | HIGH |
| AssetExplorerController | ApexClass | 11 | 6 | 17 | HIGH |
| EngineerService | ApexClass | 1 | 20 | 21 | HIGH |
| AssetExplorerService | ApexClass | 5 | 15 | 20 | HIGH |
| UserContextResolver | ApexClass | 6 | 13 | 19 | HIGH |
| SLABatch | ApexClass | 3 | 13 | 16 | HIGH |
| AssetDashboardService | ApexClass | 6 | 10 | 16 | HIGH |
| CitizenRequestService | ApexClass | 6 | 10 | 16 | HIGH |
| NotificationService | ApexClass | 9 | 6 | 15 | HIGH |
| Maintenance_Request__c | Object | 148 | 0 | 148 | HIGH |
| Infrastructure_Asset__c | Object | 98 | 0 | 98 | HIGH |
| City_Zone__c | Object | 82 | 0 | 82 | HIGH |
| User | External | 69 | 0 | 69 | HIGH |
| Budget__c | Object | 47 | 0 | 47 | HIGH |
| Field_Engineer__c | Object | 38 | 0 | 38 | HIGH |
| Inspection__c | Object | 38 | 0 | 38 | HIGH |
| Audit_Log__c | Object | 37 | 0 | 37 | HIGH |
| Expense_Record__c | Object | 37 | 0 | 37 | HIGH |
| AssetSelectorTest | ApexClass | 0 | 36 | 36 | HIGH |

## Interpretation

- High fan-in = many consumers; changing the component has broad impact.
- High fan-out = the component knows/uses many other components.
- High coupling = both inbound and outbound dependency pressure.
- Unresolved references should be checked for dynamic Apex, metadata, managed-package symbols, or parser limitations.
