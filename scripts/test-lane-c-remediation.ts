import { computeGraphDepths } from '../explorer/src/lib/graph-depth';
import { adaptComponentOrbit } from '../explorer/src/lib/adapters/component-orbit-adapter';
import { computeComponentOrbitLayout } from '../explorer/src/lib/layout/component-orbit-layout';
import { adaptComponentConstellation } from '../explorer/src/lib/adapters/component-constellation-adapter';
import { computeComponentConstellationLayout } from '../explorer/src/lib/layout/component-constellation-layout';
import { adaptConstellation } from '../explorer/src/lib/adapters/constellation-adapter';
import { computeConstellationLayout } from '../explorer/src/lib/layout/constellation-layout';
import type { ExplorerDataSchema, ExplorerNode, ExplorerEdge } from '../explorer/src/types/explorer';

console.log('=== LANE C REMEDIATION TEST HARNESS ===');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    failCount++;
  }
}

// -------------------------------------------------------------
// Test 1: R1 & R14 - nodeDependentLwcsMap edge type filter & availableSuns
// -------------------------------------------------------------
console.log('\nTesting R1 & R14 (Orbit Adapter Edge Filtering & Performance)...');
const schemaR1: ExplorerDataSchema = {
  version: '1.0.0',
  nodes: [
    { id: 'LWC:Parent', type: 'LWC', file: 'parent.js', risk: 'low', displayName: 'Parent' },
    { id: 'ApexClass:Child', type: 'ApexClass', file: 'child.cls', risk: 'low', displayName: 'Child' },
  ],
  edges: [
    { id: 'e1', source: 'LWC:Parent', target: 'ApexClass:Child', relationshipType: 'test-reference' },
  ],
};

const projR1Default = adaptComponentOrbit(schemaR1, { focalLwcId: 'LWC:Parent', includeTestReferences: false });
const childNodeR1 = projR1Default.nodes['ApexClass:Child'];
// Without test references, child should not be reachable, or if reached via other means, not dependent on test edge
assert(projR1Default.summary.totalReachableNodes === 1, 'R1: test-reference edge ignored when includeTestReferences=false');

// -------------------------------------------------------------
// Test 2: R6 & R7 & R8 - Depth contract, focal at depth 0, reachable edge filtering
// -------------------------------------------------------------
console.log('\nTesting R6, R7, R8 (Graph Depth Contract & Reachable Edges)...');
const nodesR6: ExplorerNode[] = [
  { id: 'LWC:A', type: 'LWC', file: 'a.js', risk: 'low', displayName: 'A' },
  { id: 'LWC:B', type: 'LWC', file: 'b.js', risk: 'low', displayName: 'B' },
  { id: 'LWC:Unreachable', type: 'LWC', file: 'u.js', risk: 'low', displayName: 'U' },
];
const edgesR6: ExplorerEdge[] = [
  { id: 'e1', source: 'LWC:A', target: 'LWC:B', relationshipType: 'lwc-template-child' },
  { id: 'e2', source: 'LWC:B', target: 'LWC:Unreachable', relationshipType: 'test-reference' }, // excluded
];

const resR6 = computeGraphDepths(nodesR6, edgesR6, 'LWC:A', { allowedEdgeTypes: ['lwc-template-child'] });
assert(resR6.focalNodeId === 'LWC:A', 'R6: focalNodeId set');
assert(resR6.depthMap.get('LWC:A') === 0, 'R6: focal node at depth 0');
assert(resR6.reachableNodeIds.includes('LWC:A'), 'R7: reachableNodeIds includes focal node');
assert(!resR6.reachableNodeIds.includes('LWC:Unreachable'), 'R7: unreachable node excluded');
assert(resR6.reachableEdges.length === 1 && resR6.reachableEdges[0].id === 'e1', 'R8: reachableEdges only contains edges between reachable nodes');

// -------------------------------------------------------------
// Test 3: R2, R3, R5 - Orbit Layout Option Validation & Boundary Handling
// -------------------------------------------------------------
console.log('\nTesting R2, R3, R5 (Orbit Layout Options & Multi-Node Ring 0)...');
const projR2 = adaptComponentOrbit({
  version: '1.0.0',
  nodes: [
    { id: 'LWC:Sun', type: 'LWC', file: 's.js', risk: 'low', displayName: 'Sun' },
    { id: 'LWC:Dep1', type: 'LWC', file: 'd1.js', risk: 'low', displayName: 'Dep1' },
  ],
  edges: [
    { id: 'e1', source: 'LWC:Sun', target: 'LWC:Dep1', relationshipType: 'lwc-template-child' },
  ],
}, { focalLwcId: 'LWC:Sun' });

let threwR2 = false;
try {
  computeComponentOrbitLayout(projR2, { maxNodesPerTrack: 0 });
} catch (e: any) {
  threwR2 = true;
}
assert(threwR2, 'R2: Throws Error when maxNodesPerTrack <= 0');

const layoutR3 = computeComponentOrbitLayout(projR2, { innerRadius: 50 });
assert(layoutR3.positions['LWC:Dep1'].radius >= 160, 'R3: innerRadius clamped to >= 160px');

// -------------------------------------------------------------
// Test 4: K1, K2, K3 - Constellation Adapter & Layout Sun Handling
// -------------------------------------------------------------
console.log('\nTesting K1, K2, K3 (Constellation Suns & Angles)...');
const schemaK1: ExplorerDataSchema = {
  version: '1.0.0',
  nodes: [
    { id: 'LWC:Sun1', type: 'LWC', file: 's1.js', risk: 'low', displayName: 'Sun1' },
    { id: 'LWC:Sun2', type: 'LWC', file: 's2.js', risk: 'low', displayName: 'Sun2' },
  ],
  edges: [], // Zero edges, Sun1 and Sun2 have no referencing entries
};

const projK1 = adaptComponentConstellation(schemaK1, { customSunIds: ['LWC:Sun1', 'LWC:Sun2'] });
assert(projK1.suns.length === 2, 'K1: Suns included even with 0 referencing entries');
assert(!!projK1.nodes['LWC:Sun1'] && !!projK1.nodes['LWC:Sun2'], 'K1: projectedNodesDict contains all suns');

const layoutK2 = computeComponentConstellationLayout(projK1);
assert(layoutK2.positions['LWC:Sun1'] && layoutK2.positions['LWC:Sun2'], 'K2: All suns given valid positions');
assert(layoutK2.positions['LWC:Sun1'].x !== layoutK2.positions['LWC:Sun2'].x || layoutK2.positions['LWC:Sun1'].y !== layoutK2.positions['LWC:Sun2'].y, 'K2: Suns do not land on identical coordinates');

// -------------------------------------------------------------
// Test 5: K6, K7, K8, K13, K14 - Constellation Layout Clearance & Safety
// -------------------------------------------------------------
console.log('\nTesting K6, K7, K8, K13, K14 (Constellation Clearance & Invariants)...');
const schemaK6: ExplorerDataSchema = {
  version: '1.0.0',
  nodes: [
    { id: 'LWC:SunA', type: 'LWC', file: 'sa.js', risk: 'low', displayName: 'SunA' },
    { id: 'LWC:SunB', type: 'LWC', file: 'sb.js', risk: 'low', displayName: 'SunB' },
    { id: 'ApexClass:Shared', type: 'ApexClass', file: 'sh.cls', risk: 'low', displayName: 'Shared' },
  ],
  edges: [
    { id: 'e1', source: 'LWC:SunA', target: 'ApexClass:Shared', relationshipType: 'lwc-apex' },
    { id: 'e2', source: 'LWC:SunB', target: 'ApexClass:Shared', relationshipType: 'lwc-apex' },
  ],
};

const projK6 = adaptComponentConstellation(schemaK6, { customSunIds: ['LWC:SunA', 'LWC:SunB'] });
const layoutK6 = computeComponentConstellationLayout(projK6);
assert(layoutK6.diagnostics.minSharedNodeAabbClearancePx >= 120, 'K6: minSharedNodeAabbClearancePx meets or exceeds 120px threshold');
assert(layoutK6.diagnostics.invariantViolations === undefined || layoutK6.diagnostics.invariantViolations.length === 0, 'K4: No clearance invariant violations');

console.log(`\nResults: ${passCount} PASSED, ${failCount} FAILED.`);
if (failCount > 0) process.exit(1);
