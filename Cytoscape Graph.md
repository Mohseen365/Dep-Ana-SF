Graph visualization implemented with Cytoscape.js. Here's a summary:

Created modules in src/lib/:

graph-builder.ts - Converts ExplorerNode/ExplorerEdge to Cytoscape elements, handles external nodes for edge targets not in explicit nodes
graph-style.ts - Distinct colors for each Salesforce entity type (ApexClass, LWC, Flow, etc.), risk shown as border width/color
graph-layout.ts - COSE layout configuration with stable preset
graph-interactions.ts - Event handlers for node selection, background tap, fit-to-screen
Features implemented:

Nodes with labels and entity-type-based colors
Edges showing relationships with unresolved edges as dashed orange
Risk as secondary visual (border thickness/color) rather than replacing node type
Zoom, pan, node dragging via Cytoscape defaults
Fit-to-screen on initial load
Node selection syncs with React state
Tests verify:

All valid nodes render (3 explicit + external nodes for unresolved targets)
All valid edges render
Selection works with full node data retrieval
No crashes with cycle data (circular dependencies)
No crashes with unresolved references
Style configurations are correct
Build and tests pass:

npm run build ✓
npm test ✓ (22 tests passed)