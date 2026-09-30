# Salesforce Dependency Analysis Summary

Generated: 2026-09-30T05:54:58.137Z

## Inventory

- Source files: 2
- Apex classes: 2
- Apex triggers: 0
- LWC JS: 0
- LWC HTML: 0
- Visualforce: 0
- Flows: 0
- Objects: 0
- Fields: 0
- Graph nodes: 2
- Graph edges: 2
- Circular groups: 1

## Highest Impact Components

| Component | Type | Fan-In | Fan-Out | Coupling | Risk |
|---|---|---:|---:|---:|---|
| ClassA | ApexClass | 1 | 1 | 2 | LOW |
| ClassB | ApexClass | 1 | 1 | 2 | LOW |

## Interpretation

- High fan-in = many consumers; changing the component has broad impact.
- High fan-out = the component knows/uses many other components.
- High coupling = both inbound and outbound dependency pressure.
- Unresolved references should be checked for dynamic Apex, metadata, managed-package symbols, or parser limitations.
