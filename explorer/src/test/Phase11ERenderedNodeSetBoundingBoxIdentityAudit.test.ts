import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import cytoscape from 'cytoscape';

import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import { buildGraphElements } from '../lib/graph-builder';
import { discoverFeatures } from '../lib/layout/features';
import { ExplorerNode, ExplorerEdge } from '../types/explorer';

describe('Phase 11E — Rendered Node-Set & Bounding-Box Identity Audit', () => {
  it('performs single-run deterministic forensic audit on pub-infra-mang at targetRowWidth=3200', () => {
    // 1. Dataset Verification
    const pubInfraPathPublic = path.resolve(__dirname, '../../public/projects/pub-infra-mang/explorer-data.json');
    const pubInfraPathAnalyze = path.resolve(__dirname, '../../../analyze/projects/pub-infra-mang/explorer-data.json');

    const publicRaw = fs.readFileSync(pubInfraPathPublic, 'utf-8');
    const analyzeRaw = fs.readFileSync(pubInfraPathAnalyze, 'utf-8');

    const hashPublic = crypto.createHash('sha256').update(publicRaw).digest('hex');
    const hashAnalyze = crypto.createHash('sha256').update(analyzeRaw).digest('hex');

    expect(hashPublic).toBe(hashAnalyze);

    const ds = JSON.parse(publicRaw);
    const nodes: ExplorerNode[] = ds.nodes;
    const edges: ExplorerEdge[] = ds.edges;

    const primaryNodes = nodes.filter(n => !n.behavior?.isTest && n.type !== 'CustomField' && n.type !== 'Field');
    const satelliteNodes = nodes.filter(n => Boolean(n.behavior?.isTest) || n.type === 'CustomField' || n.type === 'Field');
    const discovery = discoverFeatures(nodes, edges);

    console.log('--- DATASET IDENTITY ---');
    console.log(`SHA-256: ${hashPublic}`);
    console.log(`Total Nodes: ${nodes.length}`);
    console.log(`Total Edges: ${edges.length}`);
    console.log(`Primary Nodes: ${primaryNodes.length}`);
    console.log(`Satellite Nodes: ${satelliteNodes.length}`);
    console.log(`Features Count: ${discovery.features.size}`);

    // 2. Stage 12 Position-Map Snapshot (Single Run)
    const options = {
      enableFeatureLayout: true,
    };

    const layoutResult = computeArchitectureLayoutWithMetadata(nodes, edges, options);
    const posMap = layoutResult.positions;
    const posKeys = Object.keys(posMap);

    console.log('\n--- STAGE 12 POSITION MAP SNAPSHOT ---');
    console.log(`Position Map Node Count: ${posKeys.length}`);

    // Calculate Stage 12 Bounds
    const getBounds = (nodeIds: string[]) => {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const id of nodeIds) {
        const p = posMap[id];
        if (!p) continue;
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
      return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
    };

    const s12AllBounds = getBounds(posKeys);
    const s12PrimaryBounds = getBounds(primaryNodes.map(n => n.id));
    const s12SatelliteBounds = getBounds(satelliteNodes.map(n => n.id));

    console.log('Stage 12 All Nodes Bounds:', s12AllBounds);
    console.log('Stage 12 Primary Nodes Bounds:', s12PrimaryBounds);
    console.log('Stage 12 Satellite Nodes Bounds:', s12SatelliteBounds);

    // 3. Node Set Identity
    const S12 = new Set(posKeys);
    const SGV = new Set(nodes.map(n => n.id));

    // Initialize Cytoscape
    const elements = buildGraphElements(nodes, edges);
    const cy = cytoscape({
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'width': 50,
            'height': 50,
          }
        }
      ]
    });

    // Set positions on cy
    cy.nodes().forEach(node => {
      const id = node.id();
      if (posMap[id]) {
        node.position(posMap[id]);
      }
    });

    const SCY = new Set(cy.nodes().map(n => n.id()));
    const SV = new Set(cy.nodes().filter(n => n.visible()).map(n => n.id()));
    const SH = new Set(cy.nodes().filter(n => !n.visible()).map(n => n.id()));

    console.log('\n--- NODE SET IDENTITY ---');
    console.log(`S12 count: ${S12.size}, SGV count: ${SGV.size}, SCY count: ${SCY.size}, SV count: ${SV.size}, SH count: ${SH.size}`);

    // Set Differences
    const diff = (a: Set<string>, b: Set<string>) => Array.from(a).filter(x => !b.has(x));
    console.log('S12 - SGV:', diff(S12, SGV));
    console.log('SGV - S12:', diff(SGV, S12));
    console.log('SGV - SCY:', diff(SGV, SCY));
    console.log('SCY - SGV:', diff(SCY, SGV));
    console.log('SV - SCY:', diff(SV, SCY));
    console.log('SH count:', SH.size);

    // 4. Cytoscape Connected Components
    const components = cy.elements().components();
    console.log(`\n--- CYTOSCAPE CONNECTED COMPONENTS (Total: ${components.length}) ---`);
    components.forEach((comp, idx) => {
      const compNodes = comp.nodes();
      const compNodeIds = compNodes.map(n => n.id());
      const bounds = getBounds(compNodeIds);
      if (idx < 10 || compNodes.length > 1) {
        console.log(`Component ${idx}: ${compNodes.length} nodes, X=[${bounds.minX}, ${bounds.maxX}] (W=${bounds.width}), Y=[${bounds.minY}, ${bounds.maxY}] (H=${bounds.height})`);
      }
    });

    // Aggregate bounds for Component 0 vs Components 1..N
    const comp0NodeIds = components[0].nodes().map(n => n.id());
    const otherCompNodeIds = components.slice(1).flatMap(c => c.nodes().map(n => n.id()));
    console.log('Component 0 Bounds:', getBounds(comp0NodeIds));
    console.log(`Components 1..${components.length - 1} Bounds (${otherCompNodeIds.length} nodes):`, getBounds(otherCompNodeIds));

    // 5. Position Transformation & Delta Test
    console.log('\n--- POSITION TRANSFORMATION TEST (Stage 12 -> Cytoscape) ---');
    let minDx = Infinity, maxDx = -Infinity, minDy = Infinity, maxDy = -Infinity;
    let countDx4920 = 0, countDxOther = 0, countDy300 = 0, countDyOther = 0;

    cy.nodes().forEach(node => {
      const id = node.id();
      const cyPos = node.position();
      const s12Pos = posMap[id];
      const dx = cyPos.x - s12Pos.x;
      const dy = cyPos.y - s12Pos.y;

      if (dx < minDx) minDx = dx;
      if (dx > maxDx) maxDx = dx;
      if (dy < minDy) minDy = dy;
      if (dy > maxDy) maxDy = dy;

      if (Math.abs(dx - 4920) < 0.001) countDx4920++; else countDxOther++;
      if (Math.abs(dy - 300) < 0.001) countDy300++; else countDyOther++;
    });

    console.log(`minDx: ${minDx}, maxDx: ${maxDx}, minDy: ${minDy}, maxDy: ${maxDy}`);
    console.log(`Nodes with ΔX = 0: ${cy.nodes().filter(n => n.position().x === posMap[n.id()].x).length}`);
    console.log(`Nodes with ΔX = +4920: ${countDx4920}, other ΔX: ${countDxOther}`);
    console.log(`Nodes with ΔY = +300: ${countDy300}, other ΔY: ${countDyOther}`);

    // 6. Bounding Box Semantics
    console.log('\n--- BOUNDING BOX SEMANTICS ---');
    const comp0CenterBounds = getBounds(comp0NodeIds);
    console.log('Comp 0 Center Bounds:', comp0CenterBounds);

    const comp0EdgeBounds = {
      minX: comp0CenterBounds.minX - 25,
      maxX: comp0CenterBounds.maxX + 25,
      minY: comp0CenterBounds.minY - 25,
      maxY: comp0CenterBounds.maxY + 25,
      width: (comp0CenterBounds.maxX + 25) - (comp0CenterBounds.minX - 25),
      height: (comp0CenterBounds.maxY + 25) - (comp0CenterBounds.minY - 25),
    };
    console.log('Comp 0 Node-Edge Bounds (width=50, height=50):', comp0EdgeBounds);

    const cyBbAll = cy.nodes().boundingBox({});
    const cyBbComp0 = components[0].nodes().boundingBox({});
    console.log('Cytoscape cy.nodes().boundingBox():', cyBbAll);
    console.log('Cytoscape Component 0 boundingBox():', cyBbComp0);

    // 7. Extremum Node Forensics
    console.log('\n--- EXTREMUM NODE FORENSICS ---');
    const findExtrema = (nodeIds: string[]) => {
      let minXNode = '', maxXNode = '', minYNode = '', maxYNode = '';
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const id of nodeIds) {
        const p = posMap[id];
        if (p.x < minX) { minX = p.x; minXNode = id; }
        if (p.x > maxX) { maxX = p.x; maxXNode = id; }
        if (p.y < minY) { minY = p.y; minYNode = id; }
        if (p.y > maxY) { maxY = p.y; maxYNode = id; }
      }
      return { minXNode, maxXNode, minYNode, maxYNode };
    };

    const s12Extrema = findExtrema(posKeys);
    console.log('Stage 12 All Nodes Extrema:', s12Extrema);
    console.log('minX node:', s12Extrema.minXNode, posMap[s12Extrema.minXNode]);
    console.log('maxX node:', s12Extrema.maxXNode, posMap[s12Extrema.maxXNode]);
    console.log('minY node:', s12Extrema.minYNode, posMap[s12Extrema.minYNode]);
    console.log('maxY node:', s12Extrema.maxYNode, posMap[s12Extrema.maxYNode]);

    const comp0Extrema = findExtrema(comp0NodeIds);
    console.log('Comp 0 Extrema:', comp0Extrema);
    console.log('Comp 0 minX node:', comp0Extrema.minXNode, posMap[comp0Extrema.minXNode]);
    console.log('Comp 0 maxX node:', comp0Extrema.maxXNode, posMap[comp0Extrema.maxXNode]);
    console.log('Comp 0 minY node:', comp0Extrema.minYNode, posMap[comp0Extrema.minYNode]);
    console.log('Comp 0 maxY node:', comp0Extrema.maxYNode, posMap[comp0Extrema.maxYNode]);

    // 8. Mandatory Node Trace
    console.log('\n--- MANDATORY NODE TRACE ---');
    const mandatoryIds = [
      'LWC:citizen-report-portal',
      'External:ZoneOption',
      'ApexClass:TimelineControllerTest',
      'Field:Escalation__c.Reason__c',
      'LWC:vendor-assignment-panel',
      'ApexClass:CitizenRequestService',
      'ApexClass:BudgetDomain',
      'Object:Citizen_Request__c',
      'Trigger:CommissionerTrigger'
    ];

    mandatoryIds.forEach(id => {
      const p12 = posMap[id];
      const cyNode = cy.getElementById(id);
      const pCy = cyNode.length > 0 ? cyNode.position() : null;
      console.log(`${id}: Stage12=(${p12?.x}, ${p12?.y}), Cy=(${pCy?.x}, ${pCy?.y}), dx=${pCy ? pCy.x - p12.x : 'N/A'}, dy=${pCy ? pCy.y - p12.y : 'N/A'}`);
    });

    // 9. Width Sweep
    console.log('\n--- WIDTH SWEEP (Stage 12 All vs Component 0) ---');
    const targetWidths = [3200, 3600, 4000, 5000, 6000, 10000, 20000];
    targetWidths.forEach(w => {
      const res = computeArchitectureLayoutWithMetadata(nodes, edges, { enableFeatureLayout: true });
      const pm = res.positions;

      const bAll = getBounds(Object.keys(pm));

      const cySweep = cytoscape({ elements: buildGraphElements(nodes, edges) });
      cySweep.nodes().forEach(n => { if (pm[n.id()]) n.position(pm[n.id()]); });
      const c0Nodes = cySweep.elements().components()[0].nodes().map(n => n.id());

      let c0MinX = Infinity, c0MaxX = -Infinity, c0MinY = Infinity, c0MaxY = -Infinity;
      for (const id of c0Nodes) {
        const p = pm[id];
        if (!p) continue;
        if (p.x < c0MinX) c0MinX = p.x;
        if (p.x > c0MaxX) c0MaxX = p.x;
        if (p.y < c0MinY) c0MinY = p.y;
        if (p.y > c0MaxY) c0MaxY = p.y;
      }

      console.log(`TargetW: ${w}px | Stage 12 All: ${bAll.width}x${bAll.height} (X:[${bAll.minX},${bAll.maxX}], Y:[${bAll.minY},${bAll.maxY}]) | Comp 0 Center: ${c0MaxX - c0MinX}x${c0MaxY - c0MinY} (X:[${c0MinX},${c0MaxX}], Y:[${c0MinY},${c0MaxY}]) | Comp 0 Node-Edge (+50px): ${(c0MaxX - c0MinX) + 50}x${(c0MaxY - c0MinY) + 50}`);
    });

  }, 300000);
});
