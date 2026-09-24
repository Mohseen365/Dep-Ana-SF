# Salesforce Dependency Analysis Summary

Generated: 2026-09-24T06:56:49.975Z

## Inventory

- Source files: 398
- Apex classes: 79
- Apex triggers: 3
- LWC JS: 26
- LWC HTML: 26
- Visualforce: 0
- Flows: 0
- Objects: 10
- Fields: 63
- Graph nodes: 240
- Graph edges: 1024
- Circular groups: 0

## Highest Impact Components

| Component | Type | Fan-In | Fan-Out | Coupling | Risk |
|---|---|---:|---:|---:|---|
| OrganizationService | ApexClass | 10 | 17 | 27 | HIGH |
| UserService | ApexClass | 19 | 20 | 39 | HIGH |
| SpendTrackerAuthorizationService | ApexClass | 18 | 17 | 35 | HIGH |
| AccountService | ApexClass | 11 | 11 | 22 | HIGH |
| AdminDataExplorerController | ApexClass | 3 | 36 | 39 | HIGH |
| AdminOverviewController | ApexClass | 3 | 21 | 24 | HIGH |
| UserController | ApexClass | 15 | 6 | 21 | HIGH |
| AdminSpendController | ApexClass | 5 | 12 | 17 | HIGH |
| create_users | ApexClass | 0 | 63 | 63 | HIGH |
| UserContactMappingService | ApexClass | 4 | 21 | 25 | HIGH |
| UserOrganizationRoleTriggerHandler | ApexClass | 7 | 14 | 21 | HIGH |
| BudgetService | ApexClass | 12 | 8 | 20 | HIGH |
| CloudSpendSelector | ApexClass | 7 | 12 | 19 | HIGH |
| ForecastService | ApexClass | 9 | 9 | 18 | HIGH |
| UserOrganizationRoleSelector | ApexClass | 9 | 7 | 16 | HIGH |
| SpendService | ApexClass | 11 | 5 | 16 | HIGH |
| Organization_Hierarchy__c | Object | 80 | 0 | 80 | HIGH |
| SelectorsTest | ApexClass | 0 | 64 | 64 | HIGH |
| Assert | External | 63 | 0 | 63 | HIGH |
| SpendTrackerTest | ApexClass | 0 | 54 | 54 | HIGH |
| ControllersTest | ApexClass | 0 | 52 | 52 | HIGH |
| Cloud_Spend__c | Object | 52 | 0 | 52 | HIGH |
| Cloud_Account__c | Object | 48 | 0 | 48 | HIGH |
| User_Organization_Role__c | Object | 46 | 0 | 46 | HIGH |
| AuthorizationServiceTest | ApexClass | 0 | 45 | 45 | HIGH |
| CloudSpendOrganizationRefactorTest | ApexClass | 0 | 42 | 42 | HIGH |
| UserContactMappingServiceTest | ApexClass | 0 | 35 | 35 | HIGH |
| User | External | 31 | 0 | 31 | HIGH |
| create_usersTest | ApexClass | 0 | 30 | 30 | HIGH |
| AdminAccessServiceTest | ApexClass | 0 | 26 | 26 | HIGH |
| UserOrganizationRoleTriggerTest | ApexClass | 0 | 25 | 25 | HIGH |
| UserServiceTest | ApexClass | 0 | 23 | 23 | HIGH |
| Account | External | 23 | 0 | 23 | HIGH |
| OrganizationServiceTest | ApexClass | 0 | 22 | 22 | HIGH |
| Organization_Budget__c | Object | 21 | 0 | 21 | HIGH |
| AuditService | ApexClass | 13 | 7 | 20 | HIGH |
| AccountServiceTest | ApexClass | 0 | 16 | 16 | HIGH |
| Cloud_Service__c | Object | 16 | 0 | 16 | HIGH |
| Contact | External | 16 | 0 | 16 | HIGH |
| BudgetAlertServiceTest | ApexClass | 0 | 15 | 15 | HIGH |

## Interpretation

- High fan-in = many consumers; changing the component has broad impact.
- High fan-out = the component knows/uses many other components.
- High coupling = both inbound and outbound dependency pressure.
- Unresolved references should be checked for dynamic Apex, metadata, managed-package symbols, or parser limitations.
