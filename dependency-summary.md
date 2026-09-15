# Salesforce Dependency Analysis Summary

Generated: 2026-09-15T07:17:31.224Z

## Inventory

- Source files: 9
- Apex classes: 9
- Apex triggers: 0
- LWC JS: 0
- LWC HTML: 0
- Visualforce: 0
- Flows: 0
- Objects: 0
- Fields: 0
- Graph nodes: 14
- Graph edges: 16
- Circular groups: 1

## Highest Impact Components

| Component | Type | Fan-In | Fan-Out | Coupling | Risk |
|---|---|---:|---:|---:|---|
| BouquetOrderSelector | ApexClass | 1 | 6 | 7 | LOW |
| BouquetOrderFormService | ApexClass | 2 | 4 | 6 | LOW |
| BouquetOrderController | ApexClass | 2 | 2 | 4 | LOW |
| BouquetOrderPageHandler | ApexClass | 0 | 2 | 2 | LOW |
| CircularA | ApexClass | 1 | 1 | 2 | LOW |
| CircularB | ApexClass | 1 | 1 | 2 | LOW |
| HelperService | ApexClass | 2 | 0 | 2 | LOW |
| MultiCallService | ApexClass | 2 | 0 | 2 | LOW |
| Account | External | 1 | 0 | 1 | LOW |
| Contact | External | 1 | 0 | 1 | LOW |
| Object:Account | External | 1 | 0 | 1 | LOW |
| Object:Contact | External | 1 | 0 | 1 | LOW |
| Object:Case | External | 1 | 0 | 1 | LOW |
| UnrelatedService | ApexClass | 0 | 0 | 0 | LOW |

## Interpretation

- High fan-in = many consumers; changing the component has broad impact.
- High fan-out = the component knows/uses many other components.
- High coupling = both inbound and outbound dependency pressure.
- Unresolved references should be checked for dynamic Apex, metadata, managed-package symbols, or parser limitations.
