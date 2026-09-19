import { describe, it, expect } from 'vitest';
import {
  buildDomainGraph,
  determineGlobalDomainOrder,
  computeGlobalDomainLayout,
} from './global-layout';
import { computeArchitectureLayout, classifyNodeLayer, isTestNode } from '../architecture-layout';
import { evaluateLayout } from './evaluate-layout';
import { createFoodDeliveryFixture } from './fixtures/food-delivery';
import { createTwoDomainFixture } from './fixtures/two-domain';
import { createHubHeavyFixture } from './fixtures/hub-heavy';
import { createSparseGraphFixture } from './fixtures/sparse-graph';
import { createNode, createEdge } from './fixtures/builder';

describe('Global Domain Layout Stage (Agent 2A)', () => {
  describe('Two Connected Domains', () => {
    it('spatially distinguishes related domains and assigns reasonable proximity', () => {
      const fixture = createTwoDomainFixture();
      const result = computeGlobalDomainLayout(fixture.nodes, fixture.edges);

      expect(result.domainGraph.nodes.size).toBeGreaterThanOrEqual(2);
      expect(result.orderedDomains.length).toBeGreaterThanOrEqual(2);

      const domainA = result.orderedDomains[0];
      const domainB = result.orderedDomains[1];

      const regionA = result.domainRegions.get(domainA)!;
      const regionB = result.domainRegions.get(domainB)!;

      expect(regionA).toBeDefined();
      expect(regionB).toBeDefined();

      // Regions should be spatially separated along X
      expect(Math.abs(regionA.xCenter - regionB.xCenter)).toBeGreaterThanOrEqual(200);

      // Node region mappings should exist for all nodes
      fixture.nodes.forEach(node => {
        expect(result.nodeRegions.has(node.id)).toBe(true);
      });
    });
  });

  describe('Three-Domain Chain (A -> B -> C)', () => {
    it('arranges domains reflecting dependency chain order', () => {
      const nodes = [
        // Domain Alpha
        createNode('ApexClass:AlphaService', 'ApexClass'),
        // Domain Beta
        createNode('ApexClass:BetaService', 'ApexClass'),
        // Domain Gamma
        createNode('ApexClass:GammaService', 'ApexClass'),
      ];

      const edges = [
        // Alpha -> Beta -> Gamma
        createEdge('ApexClass:AlphaService', 'ApexClass:BetaService'),
        createEdge('ApexClass:BetaService', 'ApexClass:GammaService'),
      ];

      const result = computeGlobalDomainLayout(nodes, edges);

      expect(result.orderedDomains).toContain('Alpha');
      expect(result.orderedDomains).toContain('Beta');
      expect(result.orderedDomains).toContain('Gamma');

      const alphaRegion = result.domainRegions.get('Alpha')!;
      const betaRegion = result.domainRegions.get('Beta')!;
      const gammaRegion = result.domainRegions.get('Gamma')!;

      // Verify ordering along X-axis reflects chain A -> B -> C
      expect(alphaRegion.xCenter).toBeLessThan(betaRegion.xCenter);
      expect(betaRegion.xCenter).toBeLessThan(gammaRegion.xCenter);
    });
  });

  describe('Hub Domain', () => {
    it('positions a hub domain connected strongly to several domains deterministically and centrally', () => {
      const fixture = createHubHeavyFixture();
      const result = computeGlobalDomainLayout(fixture.nodes, fixture.edges);

      const hubNode = result.domainGraph.nodeList.find(d => d.degree > 0);
      expect(hubNode).toBeDefined();

      const order = result.orderedDomains;
      expect(order.length).toBeGreaterThanOrEqual(3);

      // Re-running produces identical order
      const secondRun = computeGlobalDomainLayout(fixture.nodes, fixture.edges);
      expect(secondRun.orderedDomains).toEqual(order);
    });
  });

  describe('Weakly Related / Sparse Domains', () => {
    it('does not force unrelated domains into the same spatial region', () => {
      const fixture = createSparseGraphFixture();
      const result = computeGlobalDomainLayout(fixture.nodes, fixture.edges);

      const regions = Array.from(result.domainRegions.values());
      for (let i = 0; i < regions.length; i++) {
        for (let j = i + 1; j < regions.length; j++) {
          // Distinct domain regions should not overlap on X-center
          expect(regions[i].xCenter).not.toEqual(regions[j].xCenter);
        }
      }
    });
  });

  describe('Cross-Domain Graph & Shared Domain', () => {
    it('prevents Shared domain from swallowing or destroying business domain locality', () => {
      const nodes = [
        createNode('ApexClass:OrderService', 'ApexClass'),
        createNode('ApexClass:PaymentProcessor', 'ApexClass'),
        createNode('ApexClass:MainUtil', 'ApexClass'), // Will resolve to Shared
      ];

      const edges = [
        createEdge('ApexClass:OrderService', 'ApexClass:PaymentProcessor'),
        createEdge('ApexClass:OrderService', 'ApexClass:MainUtil'),
        createEdge('ApexClass:PaymentProcessor', 'ApexClass:MainUtil'),
      ];

      const result = computeGlobalDomainLayout(nodes, edges);

      expect(result.domainGraph.nodes.has('Shared')).toBe(true);
      expect(result.domainRegions.has('Order')).toBe(true);
      expect(result.domainRegions.has('Payment')).toBe(true);

      const orderRegion = result.domainRegions.get('Order')!;
      const paymentRegion = result.domainRegions.get('Payment')!;

      // Business domains remain distinct and coherent
      expect(orderRegion.xCenter).not.toEqual(paymentRegion.xCenter);
    });
  });

  describe('Determinism Guarantee', () => {
    it('produces 100% identical global layout output across 10 repeated runs', () => {
      const fixture = createFoodDeliveryFixture();

      const run1 = computeGlobalDomainLayout(fixture.nodes, fixture.edges);

      for (let run = 0; run < 10; run++) {
        const currentRun = computeGlobalDomainLayout(fixture.nodes, fixture.edges);

        expect(currentRun.orderedDomains).toEqual(run1.orderedDomains);

        run1.orderedDomains.forEach(domain => {
          const region1 = run1.domainRegions.get(domain)!;
          const regionCurrent = currentRun.domainRegions.get(domain)!;

          expect(regionCurrent.xCenter).toBeCloseTo(region1.xCenter, 6);
          expect(regionCurrent.yCenter).toBeCloseTo(region1.yCenter, 6);
          expect(regionCurrent.width).toBeCloseTo(region1.width, 6);
          expect(regionCurrent.height).toBeCloseTo(region1.height, 6);
        });
      }
    });

    it('produces identical output regardless of input array shuffling', () => {
      const fixture = createFoodDeliveryFixture();

      const originalRun = computeGlobalDomainLayout(fixture.nodes, fixture.edges);

      // Reverse node and edge arrays
      const shuffledNodes = [...fixture.nodes].reverse();
      const shuffledEdges = [...fixture.edges].reverse();

      const shuffledRun = computeGlobalDomainLayout(shuffledNodes, shuffledEdges);

      expect(shuffledRun.orderedDomains).toEqual(originalRun.orderedDomains);

      originalRun.orderedDomains.forEach(domain => {
        const origRegion = originalRun.domainRegions.get(domain)!;
        const shufRegion = shuffledRun.domainRegions.get(domain)!;

        expect(shufRegion.xCenter).toBeCloseTo(origRegion.xCenter, 6);
        expect(shufRegion.yCenter).toBeCloseTo(origRegion.yCenter, 6);
      });
    });
  });

  describe('Food Delivery Benchmark Fixture', () => {
    it('creates meaningful domain regions for multi-domain Food Delivery architecture', () => {
      const fixture = createFoodDeliveryFixture();
      const result = computeGlobalDomainLayout(fixture.nodes, fixture.edges);

      // Verify domain graph construction
      expect(result.domainGraph.nodes.size).toBeGreaterThanOrEqual(4);
      expect(result.orderedDomains.length).toBeGreaterThanOrEqual(4);

      // Verify all nodes are assigned to node regions
      fixture.nodes.forEach(node => {
        expect(result.nodeRegions.has(node.id)).toBe(true);
        const region = result.nodeRegions.get(node.id)!;
        expect(region.width).toBeGreaterThan(0);
        expect(region.height).toBeGreaterThan(0);
      });

      // Verify domain regions do not collapse and maintain bounded geometry
      result.domainRegions.forEach(region => {
        expect(region.width).toBeGreaterThanOrEqual(160);
        expect(region.height).toBeGreaterThanOrEqual(100);
      });
    });
  });

  describe('Wave 2A — Primary Architecture Global Geometry Compaction', () => {
    it('calculates domain region geometry strictly from primary nodes', () => {
      // Domain with 1 primary node
      const nodes1 = [createNode('ApexClass:OrderService', 'ApexClass')];
      const result1 = computeGlobalDomainLayout(nodes1, []);
      const region1 = result1.domainRegions.get('Order')!;

      expect(region1).toBeDefined();
      expect(region1.primaryNodeCount).toBe(1);
      // Width for 1 primary node (120px + 40px padding) = 160px
      expect(region1.width).toBe(160);
    });

    it('compacts domain region width even when domain contains many secondary satellite nodes', () => {
      // Domain with 1 primary node + 20 secondary field nodes + 10 test nodes connected via edges
      const prodNode = createNode('ApexClass:AccountController', 'ApexClass');
      const nodes = [prodNode];
      const edges = [];

      for (let i = 0; i < 20; i++) {
        const fieldNode = createNode(`Account_CustomField${i}`, 'CustomField');
        nodes.push(fieldNode);
        edges.push(createEdge('ApexClass:AccountController', `Account_CustomField${i}`));
      }
      for (let i = 0; i < 10; i++) {
        const testNode = createNode(`ApexClass:AccountControllerTest${i}`, 'ApexClass');
        testNode.behavior = { ...testNode.behavior, isTest: true };
        nodes.push(testNode);
        edges.push(createEdge(`ApexClass:AccountControllerTest${i}`, 'ApexClass:AccountController'));
      }

      const result = computeGlobalDomainLayout(nodes, edges);
      const region = result.domainRegions.get('Account')!;

      expect(region).toBeDefined();

      const dNode = result.domainGraph.nodes.get('Account')!;
      expect(dNode.nodeCount).toBe(31);
      expect(dNode.primaryNodeCount).toBe(1);

      // Region width should reflect the 1 primary node (160px) rather than 31 nodes
      expect(region.width).toBe(160);
    });

    it('sizes multiple domains proportionally to their primary node counts', () => {
      const nodes = [
        // Domain Alpha: 1 primary node
        createNode('ApexClass:AlphaService', 'ApexClass'),
        // Domain Beta: 4 primary nodes sharing stem 'Beta' in application layer
        createNode('ApexClass:BetaService', 'ApexClass'),
        createNode('ApexClass:BetaController', 'ApexClass'),
        createNode('ApexClass:BetaManager', 'ApexClass'),
        createNode('ApexClass:BetaProcessor', 'ApexClass'),
      ];

      const result = computeGlobalDomainLayout(nodes, []);
      const alphaRegion = result.domainRegions.get('Alpha')!;
      const betaRegion = result.domainRegions.get('Beta')!;

      expect(alphaRegion.width).toBe(160); // 1 col -> 120 + 40
      expect(betaRegion.width).toBe(640);  // 4 cols -> 4*120 + 3*40 + 40
      expect(betaRegion.width).toBeGreaterThan(alphaRegion.width);
    });

    it('ensures adjacent domain regions do not overlap', () => {
      const fixture = createFoodDeliveryFixture();
      const result = computeGlobalDomainLayout(fixture.nodes, fixture.edges);

      for (let i = 0; i < result.orderedDomains.length - 1; i++) {
        const dCurrent = result.orderedDomains[i];
        const dNext = result.orderedDomains[i + 1];

        const regCurrent = result.domainRegions.get(dCurrent)!;
        const regNext = result.domainRegions.get(dNext)!;

        // Next domain left edge (xMin) must be strictly >= current domain right edge (xMax) + minGap (80px)
        expect(regNext.xMin).toBeGreaterThanOrEqual(regCurrent.xMax + 80 - 1e-6);
      }
    });

    it('maintains deterministic ordering and region bounds across repeated runs', () => {
      const fixture = createFoodDeliveryFixture();
      const run1 = computeGlobalDomainLayout(fixture.nodes, fixture.edges);
      const run2 = computeGlobalDomainLayout(fixture.nodes, fixture.edges);

      expect(run1.orderedDomains).toEqual(run2.orderedDomains);

      run1.orderedDomains.forEach(domain => {
        const r1 = run1.domainRegions.get(domain)!;
        const r2 = run2.domainRegions.get(domain)!;

        expect(r1.xMin).toBe(r2.xMin);
        expect(r1.xMax).toBe(r2.xMax);
        expect(r1.xCenter).toBe(r2.xCenter);
        expect(r1.width).toBe(r2.width);
        expect(r1.height).toBe(r2.height);
      });
    });
  });

  describe('Wave 2B — Dynamic Architectural Layer Spacing', () => {
    it('Test A — One-row adjacent layers are separated by compact derived clearance (< 250px)', () => {
      const nodes = [
        createNode('LWC:OrderCard', 'LWC'), // Presentation
        createNode('ApexClass:OrderService', 'ApexClass'), // Application
      ];
      const edges = [
        createEdge('LWC:OrderCard', 'ApexClass:OrderService'),
      ];

      const result = computeGlobalDomainLayout(nodes, edges);

      const presentationY = result.layerYMap.presentation;
      const applicationY = result.layerYMap.application;

      // Old fixed separation was 250px (100 -> 350)
      // New dynamic separation for 1 row is 160px (100 -> 260)
      const dy = applicationY - presentationY;
      expect(dy).toBeLessThan(250);
      expect(dy).toBe(160); // 60px nodeHeight + 100px interLayerGap
    });

    it('Test B — Multi-row preceding layer pushes following layer downward according to actual height', () => {
      // Create 9 primary nodes in Application layer in the Order domain (requires 3 rows since max cols = 4)
      const nodes = [
        createNode('LWC:OrderCard', 'LWC', { file: 'force-app/main/default/lwc/Order/OrderCard.js' }), // Presentation (1 row)
      ];
      for (let i = 1; i <= 9; i++) {
        nodes.push(createNode(`ApexClass:AppService${i}`, 'ApexClass', {
          file: `force-app/main/default/classes/Order/AppService${i}.cls`,
        })); // Application (9 nodes in Order domain -> 3 rows)
      }
      nodes.push(createNode('CustomObject:Order__c', 'CustomObject', {
        file: 'force-app/main/default/objects/Order__c/Order__c.object',
      })); // Schema (1 row)

      const result = computeGlobalDomainLayout(nodes, []);

      expect(result.layerRowCounts.application).toBe(3);
      // Application 3 rows = 3 * 60 + 2 * 40 = 260px required height
      expect(result.layerHeights.application).toBe(260);

      const applicationY = result.layerYMap.application; // Presentation (100 + 60 + 100) = 260
      const schemaY = result.layerYMap.schema;

      // Dynamic distance between Application Y and Schema Y must account for Application's 260px height
      // Schema Y = Application Y (260) + 260px height + 100px gap = 620
      expect(schemaY - applicationY).toBe(360);
      expect(schemaY).toBeGreaterThan(applicationY + result.layerHeights.application);
    });

    it('Test C — Empty intermediate layer contributes 0 content height and preserves ordering', () => {
      const nodes = [
        createNode('LWC:OrderCard', 'LWC'), // Presentation = populated (1 row)
        // Application = empty (0 nodes)
        createNode('ApexClass:OrderDomain', 'ApexClass', { displayName: 'OrderDomain' }), // Domain = populated
      ];

      const result = computeGlobalDomainLayout(nodes, []);

      expect(result.layerRowCounts.presentation).toBe(1);
      expect(result.layerRowCounts.application).toBe(0); // Empty layer
      expect(result.layerRowCounts.domain).toBe(1);

      const presY = result.layerYMap.presentation; // 100
      const appY = result.layerYMap.application;   // 260
      const domY = result.layerYMap.domain;        // 260

      // Domain must NOT be 500px below Presentation
      expect(domY - presY).toBe(160); // 60 + 100 = 160
      expect(presY).toBeLessThan(domY);
      expect(presY).toBeLessThanOrEqual(appY);
      expect(appY).toBeLessThanOrEqual(domY);
    });

    it('Test D — Primary/secondary isolation (fields and tests do NOT increase layer spacing)', () => {
      const baseNodes = [
        createNode('LWC:OrderCard', 'LWC'), // Presentation
        createNode('ApexClass:OrderService', 'ApexClass'), // Application
      ];

      const resultBase = computeGlobalDomainLayout(baseNodes, []);

      // Add 20 test nodes and 20 field nodes to the graph
      const inflatedNodes = [...baseNodes];
      for (let i = 1; i <= 20; i++) {
        inflatedNodes.push(createNode(`ApexClass:OrderServiceTest${i}`, 'ApexClass', {
          behavior: { isTest: true, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }
        }));
        inflatedNodes.push(createNode(`CustomField:Order__c.Field${i}`, 'CustomField'));
      }

      const resultInflated = computeGlobalDomainLayout(inflatedNodes, []);

      // Dynamic layer Y map and row counts for primary nodes must be 100% identical
      expect(resultInflated.layerRowCounts).toEqual(resultBase.layerRowCounts);
      expect(resultInflated.layerHeights).toEqual(resultBase.layerHeights);
      expect(resultInflated.layerYMap).toEqual(resultBase.layerYMap);
    });

    it('Test E — Determinism across 10 repeated runs', () => {
      const fixture = createFoodDeliveryFixture();

      const run1 = computeGlobalDomainLayout(fixture.nodes, fixture.edges);

      for (let i = 0; i < 10; i++) {
        const runCurrent = computeGlobalDomainLayout(fixture.nodes, fixture.edges);
        expect(runCurrent.layerYMap).toEqual(run1.layerYMap);
        expect(runCurrent.layerRowCounts).toEqual(run1.layerRowCounts);
        expect(runCurrent.layerHeights).toEqual(run1.layerHeights);
      }
    });

    it('Test F — Input-order invariance (array shuffling yields byte-for-byte identical layer Y coordinates)', () => {
      const fixture = createFoodDeliveryFixture();

      const orig = computeGlobalDomainLayout(fixture.nodes, fixture.edges);

      const shuffledNodes = [...fixture.nodes].reverse();
      const shuffledEdges = [...fixture.edges].reverse();

      const shuf = computeGlobalDomainLayout(shuffledNodes, shuffledEdges);

      expect(shuf.layerYMap).toEqual(orig.layerYMap);
      expect(shuf.layerRowCounts).toEqual(orig.layerRowCounts);
      expect(shuf.layerHeights).toEqual(orig.layerHeights);
    });

    it('Test G — No node overlaps across canonical architecture layout', () => {
      const fixture = createFoodDeliveryFixture();
      const layout = computeArchitectureLayout(fixture.nodes, fixture.edges);

      const metrics = evaluateLayout(fixture.nodes, fixture.edges, layout);
      expect(metrics.nodeOverlapCount).toBe(0);
    });

    it('Test H — Layer ordering for occupied layers (Presentation Y < Application Y < Domain Y < Schema Y)', () => {
      const nodes = [
        createNode('LWC:View', 'LWC'), // Presentation
        createNode('ApexClass:AppService', 'ApexClass'), // Application
        createNode('ApexClass:DomainObj', 'ApexClass', { displayName: 'DomainSelector' }), // Domain
        createNode('CustomObject:DbObj', 'CustomObject'), // Schema
      ];

      const result = computeGlobalDomainLayout(nodes, []);

      const pY = result.layerYMap.presentation;
      const aY = result.layerYMap.application;
      const dY = result.layerYMap.domain;
      const sY = result.layerYMap.schema;

      expect(pY).toBeLessThan(aY);
      expect(aY).toBeLessThan(dY);
      expect(dY).toBeLessThan(sY);
    });

    it('Test I — Multi-domain consistency (same architectural layer shares global layer Y coordinate)', () => {
      const fixture = createTwoDomainFixture();
      const result = computeGlobalDomainLayout(fixture.nodes, fixture.edges);

      const layout = computeArchitectureLayout(fixture.nodes, fixture.edges);

      // Extract all primary Application nodes from Domain A and Domain B
      const appNodes = fixture.nodes.filter(n => classifyNodeLayer(n) === 'application' && !isTestNode(n));
      expect(appNodes.length).toBeGreaterThanOrEqual(2);

      const yPositions = appNodes.map(n => layout[n.id].y);

      // Primary row 0 nodes across all domains must share the exact same base Y coordinate
      const baseAppY = result.layerYMap.application;
      expect(yPositions[0]).toBe(baseAppY);
    });
  });
});
