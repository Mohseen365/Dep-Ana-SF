# Salesforce Dependency Analysis Summary

Generated: 2026-09-15T16:57:24.963Z

## Inventory

- Source files: 64
- Apex classes: 8
- Apex triggers: 1
- LWC JS: 7
- LWC HTML: 7
- Visualforce: 0
- Flows: 0
- Objects: 3
- Fields: 12
- Graph nodes: 31
- Graph edges: 84
- Circular groups: 0

## Highest Impact Components

| Component | Type | Fan-In | Fan-Out | Coupling | Risk |
|---|---|---:|---:|---:|---|
| PlanController | ApexClass | 14 | 7 | 21 | HIGH |
| ReviewController | ApexClass | 11 | 6 | 17 | HIGH |
| Plan__c | Object | 18 | 0 | 18 | HIGH |
| ReviewControllerTest | ApexClass | 0 | 15 | 15 | MEDIUM |
| Review__c | Object | 12 | 0 | 12 | MEDIUM |
| BookingController | ApexClass | 7 | 6 | 13 | LOW |
| BookingControllerTest | ApexClass | 0 | 12 | 12 | LOW |
| PlanControllerTest | ApexClass | 0 | 12 | 12 | LOW |
| Booking__c | Object | 7 | 0 | 7 | LOW |
| ReviewTriggerHandlerTest | ApexClass | 0 | 6 | 6 | LOW |
| ReviewTriggerHandler | ApexClass | 1 | 5 | 6 | LOW |
| plan-admin | LWC | 0 | 4 | 4 | LOW |
| plan-detail | LWC | 0 | 4 | 4 | LOW |
| ReviewTrigger | Trigger | 0 | 2 | 2 | LOW |
| booking-list | LWC | 0 | 2 | 2 | LOW |
| food-landing-page | LWC | 0 | 2 | 2 | LOW |
| Plan__c.Price__c | Field | 2 | 0 | 2 | LOW |
| Plan__c.RatingsAverage__c | Field | 2 | 0 | 2 | LOW |
| Review__c.Plan__c | Field | 2 | 0 | 2 | LOW |
| Review__c.Rating__c | Field | 2 | 0 | 2 | LOW |
| plan-list | LWC | 0 | 1 | 1 | LOW |
| Booking__c.Plan__c | Field | 1 | 0 | 1 | LOW |
| Booking__c.Price__c | Field | 1 | 0 | 1 | LOW |
| Booking__c.Status__c | Field | 1 | 0 | 1 | LOW |
| Plan__c.Discount__c | Field | 1 | 0 | 1 | LOW |
| Plan__c.Duration__c | Field | 1 | 0 | 1 | LOW |
| Review__c.Review__c | Field | 1 | 0 | 1 | LOW |
| user-auth | LWC | 0 | 0 | 0 | LOW |
| user-profile | LWC | 0 | 0 | 0 | LOW |
| Booking__c.User__c | Field | 0 | 0 | 0 | LOW |
| Review__c.User__c | Field | 0 | 0 | 0 | LOW |

## Interpretation

- High fan-in = many consumers; changing the component has broad impact.
- High fan-out = the component knows/uses many other components.
- High coupling = both inbound and outbound dependency pressure.
- Unresolved references should be checked for dynamic Apex, metadata, managed-package symbols, or parser limitations.
