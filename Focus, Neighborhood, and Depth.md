Done. Focused graph exploration implemented:

Direction options:

Both — show dependencies and dependents
Dependencies — what the node depends on (outgoing edges)
Dependents — what depends on this node (incoming edges)
Depth options:

1 — focus node + direct neighbors
2 — + neighbors' neighbors
3 — + third level
ALL — entire reachable subgraph
UI:

Focus button activates when a node is selected
Direction and depth dropdowns appear when focus is active
Graph updates to show only the focused neighborhood
Tests (79 passing):

Depth behavior (1, 2, 3, ALL)
Direction behavior (dependencies, dependents, both)
Edge handling for each direction
Edge case handling
Build and tests pass.