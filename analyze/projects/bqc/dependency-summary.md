# Salesforce Dependency Analysis Summary

Generated: 2026-09-24T06:50:53.248Z

## Inventory

- Source files: 329
- Apex classes: 78
- Apex triggers: 3
- LWC JS: 17
- LWC HTML: 17
- Visualforce: 0
- Flows: 0
- Objects: 18
- Fields: 107
- Graph nodes: 274
- Graph edges: 603
- Circular groups: 0

## Highest Impact Components

| Component | Type | Fan-In | Fan-Out | Coupling | Risk |
|---|---|---:|---:|---:|---|
| BouquetOrderController | ApexClass | 9 | 13 | 22 | HIGH |
| BouquetScheduler | ApexClass | 9 | 41 | 50 | HIGH |
| BouquetOrderSelector | ApexClass | 13 | 16 | 29 | HIGH |
| BouquetLogger | ApexClass | 19 | 9 | 28 | HIGH |
| BouquetCapacityController | ApexClass | 7 | 20 | 27 | HIGH |
| BouquetCapacityService | ApexClass | 2 | 19 | 21 | HIGH |
| BouquetOrderRepository | ApexClass | 1 | 16 | 17 | HIGH |
| BouquetOrderFormTestFactory | ApexClass | 5 | 12 | 17 | HIGH |
| Bouquet_Order__c | Object | 66 | 0 | 66 | HIGH |
| Contact | External | 39 | 0 | 39 | HIGH |
| Product2 | External | 27 | 0 | 27 | HIGH |
| BouquetOrderControllerTest | ApexClass | 0 | 23 | 23 | HIGH |
| BouquetOrderFormControllerTest | ApexClass | 0 | 22 | 22 | HIGH |
| BouquetCapacityControllerTest | ApexClass | 0 | 21 | 21 | HIGH |
| BouquetOrderFormServiceTest | ApexClass | 0 | 21 | 21 | HIGH |
| BouquetPaymentControllerTest | ApexClass | 0 | 21 | 21 | HIGH |
| BouquetOrderServiceTest | ApexClass | 0 | 17 | 17 | HIGH |
| BouquetTrackingControllerTest | ApexClass | 0 | 17 | 17 | HIGH |
| BouquetOrderRequestDTO | ApexClass | 16 | 0 | 16 | HIGH |
| Bouquet_Capacity__c | Object | 16 | 0 | 16 | HIGH |
| BouquetUserController | ApexClass | 3 | 10 | 13 | HIGH |
| BouquetTrackingController | ApexClass | 8 | 1 | 9 | MEDIUM |
| BouquetOrderFormServiceImpl | ApexClass | 1 | 13 | 14 | MEDIUM |
| BouquetUserService | ApexClass | 2 | 12 | 14 | MEDIUM |
| BouquetException | ApexClass | 13 | 1 | 14 | MEDIUM |
| BouquetOrderDomainHelper | ApexClass | 1 | 11 | 12 | MEDIUM |
| BouquetValidator | ApexClass | 1 | 11 | 12 | MEDIUM |
| BouquetOrderListControllerTest | ApexClass | 0 | 14 | 14 | MEDIUM |
| Bouquet_Capacity_Reservation__c | Object | 14 | 0 | 14 | MEDIUM |
| BouquetRegistrationHandlerTest | ApexClass | 0 | 13 | 13 | MEDIUM |
| BouquetOrderService | ApexClass | 3 | 10 | 13 | MEDIUM |
| BouquetEmailServiceTest | ApexClass | 0 | 12 | 12 | MEDIUM |
| BouquetTriggerTest | ApexClass | 0 | 11 | 11 | MEDIUM |
| BouquetCapacityRepository | ApexClass | 1 | 10 | 11 | MEDIUM |
| Bouquet_Order_Item__c | Object | 11 | 0 | 11 | MEDIUM |
| BouquetPaymentServiceTest | ApexClass | 0 | 10 | 10 | MEDIUM |
| BouquetSchedulerStressTest | ApexClass | 0 | 10 | 10 | MEDIUM |
| BouquetProductController | ApexClass | 6 | 4 | 10 | MEDIUM |
| ContentVersion | External | 10 | 0 | 10 | MEDIUM |
| Object:Contact | External | 8 | 0 | 8 | MEDIUM |

## Interpretation

- High fan-in = many consumers; changing the component has broad impact.
- High fan-out = the component knows/uses many other components.
- High coupling = both inbound and outbound dependency pressure.
- Unresolved references should be checked for dynamic Apex, metadata, managed-package symbols, or parser limitations.
