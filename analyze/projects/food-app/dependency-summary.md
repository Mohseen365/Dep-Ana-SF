# Salesforce Dependency Analysis Summary

Generated: 2026-09-15T17:24:05.551Z

## Inventory

- Source files: 3
- Apex classes: 2
- Apex triggers: 1
- LWC JS: 0
- LWC HTML: 0
- Visualforce: 0
- Flows: 0
- Objects: 0
- Fields: 0
- Graph nodes: 3
- Graph edges: 2
- Circular groups: 0

## Highest Impact Components

| Component | Type | Fan-In | Fan-Out | Coupling | Risk |
|---|---|---:|---:|---:|---|
| FoodService | ApexClass | 1 | 1 | 2 | LOW |
| FoodTrigger | Trigger | 0 | 1 | 1 | LOW |
| FoodHelper | ApexClass | 1 | 0 | 1 | LOW |

## Interpretation

- High fan-in = many consumers; changing the component has broad impact.
- High fan-out = the component knows/uses many other components.
- High coupling = both inbound and outbound dependency pressure.
- Unresolved references should be checked for dynamic Apex, metadata, managed-package symbols, or parser limitations.
