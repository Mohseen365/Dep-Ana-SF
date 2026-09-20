import { describe, test, expect } from 'vitest';
import cloudSpendData from '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json';
import {
  filterGraphByNodeTypes,
  createEmptyFilterState,
} from '../lib/search-filter';
import {
  computeFocusedGraph,
  createEmptyFocusState,
  FocusState,
} from '../lib/focus-graph';
import { ALL_EXPLORER_NODE_TYPES, ExplorerNodeType, ExplorerNode, ExplorerEdge } from '../types/explorer';

const nodes = cloudSpendData.nodes as ExplorerNode[];
const edges = cloudSpendData.edges as ExplorerEdge[];

describe('WAVE 11A Audit Verification Suite on Cloud Spend Tracker', () => {
  test('1. Baseline raw graph dimensions', () => {
    expect(nodes.length).toBe(240);
    expect(edges.length).toBe(1024);
  });

  test('2. Scenario A: Disable Objects & Fields from LWC + Apex + Objects + Fields', () => {
    const fullTypes: ExplorerNodeType[] = [
      'LWC',
      'ApexClass',
      'ApexTrigger',
      'Object',
      'CustomObject',
      'Field',
      'CustomField',
    ];
    const initial = filterGraphByNodeTypes(nodes, edges, fullTypes);

    const filteredTypes: ExplorerNodeType[] = ['LWC', 'ApexClass', 'ApexTrigger'];
    const filtered = filterGraphByNodeTypes(nodes, edges, filteredTypes);

    console.log('Scenario A - Initial (LWC+Apex+Obj+Fields):', initial.nodes.length, 'nodes,', initial.edges.length, 'edges');
    console.log('Scenario A - Filtered (LWC+Apex):', filtered.nodes.length, 'nodes,', filtered.edges.length, 'edges');

    expect(filtered.nodes.every(n => ['LWC', 'ApexClass', 'ApexTrigger'].includes(n.type))).toBe(true);
    // Edge integrity
    const visibleNodeIds = new Set(filtered.nodes.map(n => n.id));
    expect(filtered.edges.every(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))).toBe(true);
  });

  test('3. Scenario B: Focus on node + LWC filter', () => {
    // Pick an ApexClass node to focus on
    const apexNode = nodes.find(n => n.type === 'ApexClass');
    expect(apexNode).toBeDefined();
    const focusNodeId = apexNode!.id;

    const focusState: FocusState = {
      enabled: true,
      focusNodeId,
      direction: 'both',
      depth: 2,
    };

    const focused = computeFocusedGraph(nodes, edges, focusState);
    const visible = filterGraphByNodeTypes(focused.nodes, focused.edges, ['LWC']);

    console.log(`Scenario B - Focus on ${focusNodeId} (depth 2): focused ${focused.nodes.length} nodes, ${focused.edges.length} edges; after LWC filter: ${visible.nodes.length} nodes, ${visible.edges.length} edges`);

    // Edge integrity check
    const visibleIds = new Set(visible.nodes.map(n => n.id));
    expect(visible.edges.every(e => visibleIds.has(e.source) && visibleIds.has(e.target))).toBe(true);
  });

  test('4. Filter + Focus Test Matrix', () => {
    const focusNode = nodes.find(n => n.type === 'ApexClass')!.id;

    const matrixScenarios = [
      { focus: false, depth: 2 as const, types: ['LWC'] as ExplorerNodeType[], name: 'Focus Off - LWC' },
      { focus: false, depth: 2 as const, types: ['ApexClass', 'ApexTrigger'] as ExplorerNodeType[], name: 'Focus Off - Apex' },
      { focus: false, depth: 2 as const, types: ['LWC', 'ApexClass', 'ApexTrigger'] as ExplorerNodeType[], name: 'Focus Off - LWC+Apex' },
      { focus: true, depth: 1 as const, types: ['LWC'] as ExplorerNodeType[], name: 'Focus On Depth 1 - LWC' },
      { focus: true, depth: 2 as const, types: ['LWC'] as ExplorerNodeType[], name: 'Focus On Depth 2 - LWC' },
      { focus: true, depth: 3 as const, types: ['LWC'] as ExplorerNodeType[], name: 'Focus On Depth 3 - LWC' },
      { focus: true, depth: 'ALL' as const, types: ['LWC'] as ExplorerNodeType[], name: 'Focus On Depth ALL - LWC' },
      { focus: true, depth: 2 as const, types: ['LWC', 'ApexClass', 'ApexTrigger'] as ExplorerNodeType[], name: 'Focus On Depth 2 - LWC+Apex' },
      { focus: true, depth: 2 as const, types: ['ApexClass', 'ApexTrigger', 'CustomObject', 'Object'] as ExplorerNodeType[], name: 'Focus On Depth 2 - Apex+Objects' },
      { focus: true, depth: 2 as const, types: ['LWC', 'ApexClass', 'ApexTrigger', 'CustomObject', 'Object'] as ExplorerNodeType[], name: 'Focus On Depth 2 - LWC+Apex+Objects' },
    ];

    console.log('--- FOCUS + FILTER MATRIX RESULTS ---');
    for (const sc of matrixScenarios) {
      const focusState: FocusState = {
        enabled: sc.focus,
        focusNodeId: sc.focus ? focusNode : null,
        direction: 'both',
        depth: sc.depth,
      };

      const focused = computeFocusedGraph(nodes, edges, focusState);
      const graphToFilter = sc.focus ? focused : { nodes, edges };
      const res = filterGraphByNodeTypes(graphToFilter.nodes, graphToFilter.edges, sc.types);

      // Edge integrity check
      const visibleIds = new Set(res.nodes.map(n => n.id));
      const validEdges = res.edges.every(e => visibleIds.has(e.source) && visibleIds.has(e.target));

      console.log(`[${sc.name}] FocusRoot: ${sc.focus ? focusNode : 'N/A'}, Depth: ${sc.depth}, VisibleNodes: ${res.nodes.length}, VisibleEdges: ${res.edges.length}, EdgeIntegrity: ${validEdges}`);
      expect(validEdges).toBe(true);
    }
  });

  test('5. Filter + Direction Test Matrix', () => {
    const focusNode = nodes.find(n => n.type === 'ApexClass')!.id;
    const directions = ['dependencies', 'dependents', 'both'] as const;
    const filterCombos = [
      { name: 'LWC only', types: ['LWC'] as ExplorerNodeType[] },
      { name: 'Apex only', types: ['ApexClass', 'ApexTrigger'] as ExplorerNodeType[] },
      { name: 'LWC + Apex', types: ['LWC', 'ApexClass', 'ApexTrigger'] as ExplorerNodeType[] },
      { name: 'Apex + Objects', types: ['ApexClass', 'ApexTrigger', 'CustomObject', 'Object'] as ExplorerNodeType[] },
    ];

    console.log('--- DIRECTION + FILTER MATRIX RESULTS ---');
    for (const dir of directions) {
      for (const combo of filterCombos) {
        const focusState: FocusState = {
          enabled: true,
          focusNodeId: focusNode,
          direction: dir,
          depth: 2,
        };
        const focused = computeFocusedGraph(nodes, edges, focusState);
        const res = filterGraphByNodeTypes(focused.nodes, focused.edges, combo.types);

        const visibleIds = new Set(res.nodes.map(n => n.id));
        const validEdges = res.edges.every(e => visibleIds.has(e.source) && visibleIds.has(e.target));

        console.log(`[Dir: ${dir} | Filter: ${combo.name}] Focused: ${focused.nodes.length}n, Visible: ${res.nodes.length}n/${res.edges.length}e, ValidEdges: ${validEdges}`);
        expect(validEdges).toBe(true);
      }
    }
  });

  test('6. Empty filter and Restore All', () => {
    const emptyRes = filterGraphByNodeTypes(nodes, edges, []);
    expect(emptyRes.nodes.length).toBe(0);
    expect(emptyRes.edges.length).toBe(0);

    const restoredRes = filterGraphByNodeTypes(nodes, edges, ALL_EXPLORER_NODE_TYPES);
    expect(restoredRes.nodes.length).toBe(240);
    expect(restoredRes.edges.length).toBe(1024);
  });

  test('7. Real-Graph Single-Type Checks', () => {
    console.log('--- SINGLE TYPE COUNTS ---');
    for (const type of ALL_EXPLORER_NODE_TYPES) {
      const res = filterGraphByNodeTypes(nodes, edges, [type]);
      console.log(`Type: ${type.padEnd(12)} -> Nodes: ${res.nodes.length}, Edges: ${res.edges.length}`);
    }
  });
});
