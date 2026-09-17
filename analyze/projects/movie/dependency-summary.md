# Salesforce Dependency Analysis Summary

Generated: 2026-09-17T04:27:33.229Z

## Inventory

- Source files: 29
- Apex classes: 3
- Apex triggers: 0
- LWC JS: 5
- LWC HTML: 5
- Visualforce: 0
- Flows: 0
- Objects: 0
- Fields: 0
- Graph nodes: 9
- Graph edges: 16
- Circular groups: 0

## Highest Impact Components

| Component | Type | Fan-In | Fan-Out | Coupling | Risk |
|---|---|---:|---:|---:|---|
| MovieController | ApexClass | 9 | 0 | 9 | MEDIUM |
| MovieControllerHttpMock | ApexClass | 2 | 1 | 3 | LOW |
| MovieControllerTest | ApexClass | 0 | 6 | 6 | LOW |
| movie-app-container | LWC | 0 | 4 | 4 | LOW |
| movie-list | LWC | 1 | 3 | 4 | LOW |
| banner | LWC | 1 | 1 | 2 | LOW |
| favourites | LWC | 1 | 1 | 2 | LOW |
| navbar | LWC | 1 | 0 | 1 | LOW |
| HttpCalloutMock | External | 1 | 0 | 1 | LOW |

## Interpretation

- High fan-in = many consumers; changing the component has broad impact.
- High fan-out = the component knows/uses many other components.
- High coupling = both inbound and outbound dependency pressure.
- Unresolved references should be checked for dynamic Apex, metadata, managed-package symbols, or parser limitations.
