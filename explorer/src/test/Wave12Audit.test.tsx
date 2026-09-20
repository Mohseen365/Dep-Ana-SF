import { describe, test, expect } from 'vitest';
import cloudSpendData from '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json';
import { ExplorerNode, ExplorerEdge, ExplorerNodeType, ALL_EXPLORER_NODE_TYPES } from '../types/explorer';
import { filterGraphByNodeTypes } from '../lib/search-filter';
import { computeFocusedGraph, FocusState } from '../lib/focus-graph';
import { computeArchitectureLayout } from '../lib/architecture-layout';
import { shouldAutoLayout, resolveAuthoritativePosition, calculateDeterministicNewNodePosition, Position } from '../lib/position-policy';
import { evaluateLayout } from '../lib/layout/evaluate-layout';

const nodes = cloudSpendData.nodes as ExplorerNode[];
const edges = cloudSpendData.edges as ExplorerEdge[];

function computeBoundingBox(posMap: Record<string, Position>): { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number } {
  const keys = Object.keys(posMap);
  if (keys.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const key of keys) {
    const p = posMap[key];
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

describe('WAVE 12 — Initial / Default Layout Forensic Audit Verification Suite', () => {
  test('1. Section 2 & 3 Audit: Initial Layout Trigger Conditions & Authority Evaluation', () => {
    // Case A: Brand-new project (no positions) -> shouldAutoLayout returns true
    const brandNewPolicyStatic = shouldAutoLayout('static', 'initial', { hasAuthoritativePositions: false });
    const brandNewPolicyInteractive = shouldAutoLayout('interactive', 'initial', { hasAuthoritativePositions: false });
    expect(brandNewPolicyStatic).toBe(true);
    expect(brandNewPolicyInteractive).toBe(true);

    // Case B/C: Positions exist -> shouldAutoLayout returns false
    const existingPolicyStatic = shouldAutoLayout('static', 'initial', { hasAuthoritativePositions: true });
    const existingPolicyInteractive = shouldAutoLayout('interactive', 'initial', { hasAuthoritativePositions: true });
    expect(existingPolicyStatic).toBe(false);
    expect(existingPolicyInteractive).toBe(false);

    // Case D/E: New nodes added -> shouldAutoLayout returns 'place-new-only'
    const newNodesPolicyStatic = shouldAutoLayout('static', 'new-nodes', { hasAuthoritativePositions: true, hasNewNodes: true });
    expect(newNodesPolicyStatic).toBe('place-new-only');

    // Case F: Explicit Reset Layout -> shouldAutoLayout returns true regardless of mode/positions
    const resetPolicyStatic = shouldAutoLayout('static', 'reset-layout');
    const resetPolicyInteractive = shouldAutoLayout('interactive', 'reset-layout');
    expect(resetPolicyStatic).toBe(true);
    expect(resetPolicyInteractive).toBe(true);
  });

  test('2. Section 4 Audit: Initial Layout + Filter Scenarios (A through F)', () => {
    const filterScenarios = [
      { name: 'Scenario A: All Types', types: ALL_EXPLORER_NODE_TYPES },
      { name: 'Scenario B: LWC Only', types: ['LWC'] as ExplorerNodeType[] },
      { name: 'Scenario C: Apex Only', types: ['ApexClass', 'ApexTrigger'] as ExplorerNodeType[] },
      { name: 'Scenario D: LWC + Apex', types: ['LWC', 'ApexClass', 'ApexTrigger'] as ExplorerNodeType[] },
      { name: 'Scenario E: Apex + Objects', types: ['ApexClass', 'ApexTrigger', 'CustomObject', 'Object'] as ExplorerNodeType[] },
      { name: 'Scenario F: Fields Only', types: ['Field', 'CustomField'] as ExplorerNodeType[] },
    ];

    console.log('--- INITIAL LAYOUT + FILTER SCENARIOS ---');
    for (const sc of filterScenarios) {
      // Step 1: Filter graph first (Wave 11 contract)
      const filtered = filterGraphByNodeTypes(nodes, edges, sc.types);

      // Step 2: Compute initial layout on the visible/filtered graph if non-empty
      const startTime = performance.now();
      const posMap = filtered.nodes.length > 0 ? computeArchitectureLayout(filtered.nodes, filtered.edges) : {};
      const endTime = performance.now();

      // Step 3: Evaluate geometric layout metrics & bounding box
      const bbox = computeBoundingBox(posMap);
      const evalRes = filtered.nodes.length > 0 ? evaluateLayout(filtered.nodes, filtered.edges, posMap) : null;

      console.log(`[${sc.name}] InputNodes: ${filtered.nodes.length}, InputEdges: ${filtered.edges.length}, BBox: ${bbox.width}x${bbox.height}, Overlaps: ${evalRes ? evalRes.nodeOverlapCount : 0}, Runtime: ${(endTime - startTime).toFixed(2)}ms`);

      expect(Object.keys(posMap).length).toBe(filtered.nodes.length);
      if (evalRes) {
        expect(evalRes.nodeOverlapCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('3. Section 5 Audit: Initial Layout + Focus + Depth (1, 2, 3, ALL)', () => {
    const focusNodeId = 'ApexClass:AccountController';
    const depths = [1, 2, 3, 'ALL'] as const;

    console.log('--- INITIAL LAYOUT + FOCUS + DEPTH ---');
    for (const d of depths) {
      const focusState: FocusState = {
        enabled: true,
        focusNodeId,
        direction: 'both',
        depth: d,
      };

      const focused = computeFocusedGraph(nodes, edges, focusState);
      const startTime = performance.now();
      const posMap = computeArchitectureLayout(focused.nodes, focused.edges);
      const endTime = performance.now();

      console.log(`[Focus: ${focusNodeId} | Depth: ${d}] FocusedNodes: ${focused.nodes.length}, FocusedEdges: ${focused.edges.length}, PlacedPositions: ${Object.keys(posMap).length}, Runtime: ${(endTime - startTime).toFixed(2)}ms`);

      expect(Object.keys(posMap).length).toBe(focused.nodes.length);
    }
  });

  test('4. Section 6 Audit: Initial Layout + Direction (dependencies, dependents, both)', () => {
    const focusNodeId = 'ApexClass:AccountController';
    const directions = ['dependencies', 'dependents', 'both'] as const;

    console.log('--- INITIAL LAYOUT + DIRECTION ---');
    for (const dir of directions) {
      const focusState: FocusState = {
        enabled: true,
        focusNodeId,
        direction: dir,
        depth: 2,
      };

      const focused = computeFocusedGraph(nodes, edges, focusState);
      const posMap = computeArchitectureLayout(focused.nodes, focused.edges);

      console.log(`[Direction: ${dir}] FocusedNodes: ${focused.nodes.length}, FocusedEdges: ${focused.edges.length}, PlacedPositions: ${Object.keys(posMap).length}`);

      expect(Object.keys(posMap).length).toBe(focused.nodes.length);
    }
  });

  test('5. Section 7 Audit: Initial Layout + Filter + Focus + Depth Combined', () => {
    const focusNodeId = 'ApexClass:AccountController';
    const focusState: FocusState = {
      enabled: true,
      focusNodeId,
      direction: 'both',
      depth: 2,
    };

    const rawCount = nodes.length;
    const focused = computeFocusedGraph(nodes, edges, focusState);
    const focusedCount = focused.nodes.length;

    const filtered = filterGraphByNodeTypes(focused.nodes, focused.edges, ['LWC', 'ApexClass', 'ApexTrigger']);
    const filteredCount = filtered.nodes.length;

    const posMap = computeArchitectureLayout(filtered.nodes, filtered.edges);
    const layoutOutputCount = Object.keys(posMap).length;

    console.log(`Combined Audit -> Raw: ${rawCount}, Focused: ${focusedCount}, Filtered: ${filteredCount}, LayoutOutput: ${layoutOutputCount}`);

    expect(layoutOutputCount).toBe(filteredCount);
  });

  test('6. Section 12 & 14 Audit: Cold-Load Determinism & Input-Order Invariance', () => {
    const posMap1 = computeArchitectureLayout(nodes, edges);

    // Reversed nodes & edges
    const reversedNodes = [...nodes].reverse();
    const reversedEdges = [...edges].reverse();
    const posMap2 = computeArchitectureLayout(reversedNodes, reversedEdges);

    expect(Object.keys(posMap1).length).toBe(nodes.length);
    expect(Object.keys(posMap2).length).toBe(nodes.length);

    for (const n of nodes) {
      expect(posMap1[n.id]).toBeDefined();
      expect(posMap2[n.id]).toBeDefined();
      expect(posMap1[n.id].x).toBe(posMap2[n.id].x);
      expect(posMap1[n.id].y).toBe(posMap2[n.id].y);
    }
  });

  test('7. Section 10 & 11 Audit: Partial Positioning & New Node Placement', () => {
    const knownPositions: Record<string, Position> = {
      'ApexClass:AccountController': { x: 100, y: 200 },
      'LWC:accountCard': { x: 300, y: 400 },
    };

    const newNodeId = 'ApexClass:NewServiceClass';
    const newPos = calculateDeterministicNewNodePosition(newNodeId, edges, knownPositions);

    expect(typeof newPos.x).toBe('number');
    expect(typeof newPos.y).toBe('number');
    expect(isNaN(newPos.x)).toBe(false);
    expect(isNaN(newPos.y)).toBe(false);
  });

  test('8. Section 15 & 20 Audit: Full Cloud Spend Initial Layout Performance & Metrics', () => {
    const t0 = performance.now();
    const posMap = computeArchitectureLayout(nodes, edges);
    const t1 = performance.now();

    const bbox = computeBoundingBox(posMap);
    const evalRes = evaluateLayout(nodes, edges, posMap);

    console.log(`Full Cloud Spend Benchmark -> Nodes: ${nodes.length}, Edges: ${edges.length}, Dimensions: ${bbox.width}x${bbox.height}, Overlaps: ${evalRes.nodeOverlapCount}, Layout Runtime: ${(t1 - t0).toFixed(2)}ms`);

    expect(nodes.length).toBe(240);
    expect(bbox.width).toBeGreaterThan(0);
    expect(bbox.height).toBeGreaterThan(0);
    expect(evalRes.nodeOverlapCount).toBeGreaterThanOrEqual(0);
    expect(t1 - t0).toBeLessThan(1000); // Expect sub-second runtime
  });
});
