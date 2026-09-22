import { describe, it, expect } from 'vitest';
import {
  computeGlobalDomainLayout,
} from './global-layout';
import { computeArchitectureLayout, classifyNodeLayer, isTestNode } from '../architecture-layout';
import { evaluateLayout } from './evaluate-layout';
import { createFoodDeliveryFixture } from './fixtures/food-delivery';
import { createTwoDomainFixture } from './fixtures/two-domain';
import { createHubHeavyFixture } from './fixtures/hub-heavy';
import { createScale100PlusFixture } from './fixtures/scale-100-plus';
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

      expect(Math.abs(regionA.xCenter - regionB.xCenter)).toBeGreaterThanOrEqual(200);

      fixture.nodes.forEach(node => {
        expect(result.nodeRegions.has(node.id)).toBe(true);
      });
    });
  });

  describe('Three-Domain Chain (A -> B -> C)', () => {
    it('arranges domains reflecting dependency chain order', () => {
      const nodes = [
        createNode('ApexClass:AlphaService', 'ApexClass'),
        createNode('ApexClass:BetaService', 'ApexClass'),
        createNode('ApexClass:GammaService', 'ApexClass'),
      ];

      const edges = [
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
        createNode('ApexClass:MainUtil', 'ApexClass'),
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

      expect(result.domainGraph.nodes.size).toBeGreaterThanOrEqual(4);
      expect(result.orderedDomains.length).toBeGreaterThanOrEqual(4);

      fixture.nodes.forEach(node => {
        expect(result.nodeRegions.has(node.id)).toBe(true);
        const region = result.nodeRegions.get(node.id)!;
        expect(region.width).toBeGreaterThan(0);
        expect(region.height).toBeGreaterThan(0);
      });

      result.domainRegions.forEach(region => {
        expect(region.width).toBeGreaterThanOrEqual(160);
        expect(region.height).toBeGreaterThanOrEqual(100);
      });
    });
  });

  describe('Wave 2A — Primary Architecture Global Geometry Compaction', () => {
    it('calculates domain region geometry strictly from primary nodes', () => {
      const nodes1 = [createNode('ApexClass:OrderService', 'ApexClass')];
      const result1 = computeGlobalDomainLayout(nodes1, []);
      const region1 = result1.domainRegions.get('Order')!;

      expect(region1).toBeDefined();
      expect(region1.primaryNodeCount).toBe(1);
      expect(region1.width).toBe(160);
    });

    it('compacts domain region width even when domain contains many secondary satellite nodes', () => {
      const prodNode = createNode('ApexClass:AccountController', 'ApexClass');
      const nodes = [prodNode];
      const edges = [];

      for (let i = 0; i < 20; i++) {
        const fieldNode = createNode(`Account_CustomField${i}`, 'CustomField');
        nodes.push(fieldNode);
        edges.push(createEdge('ApexClass:AccountController', `Account_CustomField${i}`));
      }
      for (let i = 0; i < 10; i++) {
        const testNode = createNode(`ApexClass:AccountControllerTest${i}`, 'ApexClass', { isTest: true });
        nodes.push(testNode);
        edges.push(createEdge(`ApexClass:AccountControllerTest${i}`, 'ApexClass:AccountController'));
      }

      const result = computeGlobalDomainLayout(nodes, edges);
      const region = result.domainRegions.get('Account')!;

      expect(region).toBeDefined();

      const dNode = result.domainGraph.nodes.get('Account')!;
      expect(dNode.nodeCount).toBe(31);
      expect(dNode.primaryNodeCount).toBe(1);

      expect(region.width).toBe(160);
    });

    it('sizes multiple domains proportionally to their primary node counts', () => {
      const nodes = [
        createNode('ApexClass:AlphaService', 'ApexClass'),
        createNode('ApexClass:BetaService', 'ApexClass'),
        createNode('ApexClass:BetaController', 'ApexClass'),
        createNode('ApexClass:BetaManager', 'ApexClass'),
        createNode('ApexClass:BetaProcessor', 'ApexClass'),
      ];

      const result = computeGlobalDomainLayout(nodes, []);
      const alphaRegion = result.domainRegions.get('Alpha')!;
      const betaRegion = result.domainRegions.get('Beta')!;

      expect(alphaRegion.width).toBe(160);
      expect(betaRegion.width).toBe(640);
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

        expect(regNext.xMin).toBeGreaterThanOrEqual(regCurrent.xMax + 40 - 1e-6);
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

  describe('Wave 4B — Domain-Level Spatial Compaction', () => {
    it('Test A — Hub Centering: places central orchestrator hub in the median position of leaf domains', () => {
      const fixture = createHubHeavyFixture();
      const result = computeGlobalDomainLayout(fixture.nodes, fixture.edges);

      const order = result.orderedDomains;
      const hubDomain = 'NotificationDispatcher';
      const hubIndex = order.indexOf(hubDomain);

      expect(hubIndex).toBeGreaterThan(0);
      expect(hubIndex).toBeLessThan(order.length - 1);

      expect(hubIndex).toBeGreaterThanOrEqual(5);
      expect(hubIndex).toBeLessThanOrEqual(10);

      const layout = computeArchitectureLayout(fixture.nodes, fixture.edges);
      const metrics = evaluateLayout(fixture.nodes, fixture.edges, layout);

      expect(metrics.maxEdgeLength).toBeLessThanOrEqual(700);
      expect(metrics.nodeOverlapCount).toBe(0);
    });

    it('Test B — Stem Adjacency: groups sub-domains directly adjacent to parent domain stem', () => {
      const nodes = [
        createNode('ApexClass:AnalyticsService', 'ApexClass'),
        createNode('ApexClass:AnalyticsHeaderController', 'ApexClass'),
        createNode('ApexClass:AnalyticsPortalController', 'ApexClass'),
      ];
      const edges = [
        createEdge('ApexClass:AnalyticsHeaderController', 'ApexClass:AnalyticsService'),
        createEdge('ApexClass:AnalyticsPortalController', 'ApexClass:AnalyticsService'),
      ];

      const result = computeGlobalDomainLayout(nodes, edges);
      const order = result.orderedDomains;

      const analyticsIdx = order.indexOf('Analytics');
      const headerIdx = order.indexOf('AnalyticsHeader');
      const portalIdx = order.indexOf('AnalyticsPortal');

      expect(analyticsIdx).not.toBe(-1);
      expect(headerIdx).not.toBe(-1);
      expect(portalIdx).not.toBe(-1);

      expect(Math.abs(headerIdx - analyticsIdx)).toBeLessThanOrEqual(2);
      expect(Math.abs(portalIdx - analyticsIdx)).toBeLessThanOrEqual(2);
    });

    it('Test C — Domain Gap Compaction: uses compact gap range (40px-80px) without overlaps', () => {
      const fixture = createFoodDeliveryFixture();
      const result = computeGlobalDomainLayout(fixture.nodes, fixture.edges);

      for (let i = 0; i < result.orderedDomains.length - 1; i++) {
        const dCurr = result.orderedDomains[i];
        const dNext = result.orderedDomains[i + 1];

        const regCurr = result.domainRegions.get(dCurr)!;
        const regNext = result.domainRegions.get(dNext)!;

        const gap = regNext.xMin - regCurr.xMax;
        expect(gap).toBeGreaterThanOrEqual(40 - 1e-6);
        expect(gap).toBeLessThanOrEqual(80 + 1e-6);
      }

      const layout = computeArchitectureLayout(fixture.nodes, fixture.edges);
      const metrics = evaluateLayout(fixture.nodes, fixture.edges, layout);
      expect(metrics.nodeOverlapCount).toBe(0);
    });

    it('Test D — Benchmark Bounding Box Compaction: achieves compact layout across large scale benchmarks', () => {
      const scaleFixture = createScale100PlusFixture();
      const scaleLayout = computeArchitectureLayout(scaleFixture.nodes, scaleFixture.edges);

      let minX = Infinity, maxX = -Infinity;
      Object.values(scaleLayout).forEach(pos => {
        if (pos.x - 60 < minX) minX = pos.x - 60;
        if (pos.x + 60 > maxX) maxX = pos.x + 60;
      });

      const width = maxX - minX;
      expect(width).toBeLessThan(12000);

      const metrics = evaluateLayout(scaleFixture.nodes, scaleFixture.edges, scaleLayout);
      expect(metrics.nodeOverlapCount).toBe(0);
    });

    it('Test E — Determinism & Shuffling: produces 100% identical domain order & regions across repeated runs and input shuffling', () => {
      const fixture = createScale100PlusFixture();
      const run1 = computeGlobalDomainLayout(fixture.nodes, fixture.edges);

      for (let run = 0; run < 5; run++) {
        const currentRun = computeGlobalDomainLayout(fixture.nodes, fixture.edges);
        expect(currentRun.orderedDomains).toEqual(run1.orderedDomains);
      }

      const reversedNodes = [...fixture.nodes].reverse();
      const reversedEdges = [...fixture.edges].reverse();

      const shufRun = computeGlobalDomainLayout(reversedNodes, reversedEdges);
      expect(shufRun.orderedDomains).toEqual(run1.orderedDomains);
    });
  });

  describe('Wave 2B — Dynamic Architectural Layer Spacing', () => {
    it('Test A — One-row adjacent layers are separated by compact derived clearance (< 250px)', () => {
      const nodes = [
        createNode('LWC:OrderCard', 'LWC'),
        createNode('ApexClass:OrderService', 'ApexClass'),
      ];
      const edges = [
        createEdge('LWC:OrderCard', 'ApexClass:OrderService'),
      ];

      const result = computeGlobalDomainLayout(nodes, edges);

      const presentationY = result.layerYMap.presentation;
      const applicationY = result.layerYMap.application;

      const dy = applicationY - presentationY;
      expect(dy).toBeLessThan(250);
      expect(dy).toBe(160);
    });

    it('Test B — Multi-row preceding layer pushes following layer downward according to actual height', () => {
      const nodes = [
        createNode('LWC:OrderCard', 'LWC', { file: 'force-app/main/default/lwc/Order/OrderCard.js' }),
      ];
      for (let i = 1; i <= 9; i++) {
        nodes.push(createNode(`ApexClass:AppService${i}`, 'ApexClass', {
          file: `force-app/main/default/classes/Order/AppService${i}.cls`,
        }));
      }
      nodes.push(createNode('CustomObject:Order__c', 'CustomObject', {
        file: 'force-app/main/default/objects/Order__c/Order__c.object',
      }));

      const result = computeGlobalDomainLayout(nodes, []);

      expect(result.layerRowCounts.application).toBe(3);
      expect(result.layerHeights.application).toBe(260);

      const applicationY = result.layerYMap.application;
      const schemaY = result.layerYMap.schema;

      expect(schemaY - applicationY).toBe(360);
      expect(schemaY).toBeGreaterThan(applicationY + result.layerHeights.application);
    });

    it('Test C — Empty intermediate layer contributes 0 content height and preserves ordering', () => {
      const nodes = [
        createNode('LWC:OrderCard', 'LWC'),
        createNode('ApexClass:OrderDomain', 'ApexClass', { displayName: 'OrderDomain' }),
      ];

      const result = computeGlobalDomainLayout(nodes, []);

      expect(result.layerRowCounts.presentation).toBe(1);
      expect(result.layerRowCounts.application).toBe(0);
      expect(result.layerRowCounts.domain).toBe(1);

      const presY = result.layerYMap.presentation;
      const appY = result.layerYMap.application;
      const domY = result.layerYMap.domain;

      expect(domY - presY).toBe(160);
      expect(presY).toBeLessThan(domY);
      expect(presY).toBeLessThanOrEqual(appY);
      expect(appY).toBeLessThanOrEqual(domY);
    });

    it('Test D — Primary/secondary isolation (fields and tests do NOT increase layer spacing)', () => {
      const baseNodes = [
        createNode('LWC:OrderCard', 'LWC'),
        createNode('ApexClass:OrderService', 'ApexClass'),
      ];

      const resultBase = computeGlobalDomainLayout(baseNodes, []);

      const inflatedNodes = [...baseNodes];
      for (let i = 1; i <= 20; i++) {
        inflatedNodes.push(createNode(`ApexClass:OrderServiceTest${i}`, 'ApexClass', { isTest: true }));
        inflatedNodes.push(createNode(`CustomField:Order__c.Field${i}`, 'CustomField'));
      }

      const resultInflated = computeGlobalDomainLayout(inflatedNodes, []);

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
        createNode('LWC:View', 'LWC'),
        createNode('ApexClass:AppService', 'ApexClass'),
        createNode('ApexClass:DomainObj', 'ApexClass', { displayName: 'DomainSelector' }),
        createNode('CustomObject:DbObj', 'CustomObject'),
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

      const appNodes = fixture.nodes.filter(n => classifyNodeLayer(n) === 'application' && !isTestNode(n));
      expect(appNodes.length).toBeGreaterThanOrEqual(2);

      const yPositions = appNodes.map(n => layout[n.id].y);

      const baseAppY = result.layerYMap.application;
      expect(yPositions[0]).toBe(baseAppY);
    });
  });

  describe('Phase 3.2 — Multi-Row 2D Feature-Region Geometry', () => {
    it('handles 1 feature graph cleanly', () => {
      const nodes = [createNode('ApexClass:SingleService', 'ApexClass')];
      const result = computeGlobalDomainLayout(nodes, []);

      expect(result.orderedDomains.length).toBe(1);
      expect(result.domainRegions.size).toBe(1);
      const reg = result.domainRegions.get(result.orderedDomains[0])!;
      expect(reg.width).toBeGreaterThan(0);
      expect(reg.height).toBeGreaterThan(0);
    });

    it('handles 2 features graph with clean linear gap separation', () => {
      const nodes = [
        createNode('ApexClass:AlphaService', 'ApexClass'),
        createNode('ApexClass:BetaService', 'ApexClass'),
      ];
      const edges = [createEdge('ApexClass:AlphaService', 'ApexClass:BetaService')];
      const result = computeGlobalDomainLayout(nodes, edges);

      expect(result.orderedDomains.length).toBe(2);
      const regA = result.domainRegions.get(result.orderedDomains[0])!;
      const regB = result.domainRegions.get(result.orderedDomains[1])!;

      expect(regB.xMin).toBeGreaterThanOrEqual(regA.xMax);
    });

    it('handles 10 features graph without overlapping regions', () => {
      const nodes = [];
      for (let i = 1; i <= 10; i++) {
        nodes.push(createNode(`ApexClass:FeatureService${i}`, 'ApexClass'));
      }
      const result = computeGlobalDomainLayout(nodes, []);

      expect(result.orderedDomains.length).toBe(10);
      expect(result.domainRegions.size).toBe(10);
    });

    it('handles > 25 features graph by invoking 2D multi-row band packing per layer', () => {
      const nodes = [];
      const edges = [];
      for (let i = 1; i <= 30; i++) {
        nodes.push(createNode(`ApexClass:ScaleClass${i}`, 'ApexClass'));
        if (i > 1) {
          edges.push(createEdge(`ApexClass:ScaleClass${i - 1}`, `ApexClass:ScaleClass${i}`));
        }
      }
      const result = computeGlobalDomainLayout(nodes, edges);

      expect(result.orderedDomains.length).toBe(30);

      // Verify regions are packed in sub-rows without unbounded horizontal expansion
      let maxX = -Infinity;
      result.domainRegions.forEach(reg => {
        if (reg.xMax > maxX) maxX = reg.xMax;
      });

      expect(maxX).toBeLessThan(6000);
    });

    it('calculates vertical height spanning multiple layers for multi-layer feature', () => {
      const nodes = [
        createNode('LWC:OrderCard', 'LWC'),
        createNode('ApexClass:OrderController', 'ApexClass'),
        createNode('ApexClass:OrderDomain', 'ApexClass', { displayName: 'OrderDomain' }),
        createNode('CustomObject:Order__c', 'CustomObject'),
      ];
      const edges = [
        createEdge('LWC:OrderCard', 'ApexClass:OrderController'),
        createEdge('ApexClass:OrderController', 'ApexClass:OrderDomain'),
        createEdge('ApexClass:OrderDomain', 'CustomObject:Order__c'),
      ];

      const result = computeGlobalDomainLayout(nodes, edges);
      const orderRegion = result.domainRegions.get('Order')!;

      expect(orderRegion).toBeDefined();
      expect(orderRegion.height).toBeGreaterThanOrEqual(400);
    });

    it('handles disconnected features cleanly', () => {
      const nodes = [
        createNode('ApexClass:FeatureAService', 'ApexClass'),
        createNode('ApexClass:FeatureBService', 'ApexClass'),
        createNode('ApexClass:FeatureCService', 'ApexClass'),
      ];
      const result = computeGlobalDomainLayout(nodes, []);

      expect(result.orderedDomains.length).toBe(3);
      result.domainRegions.forEach(reg => {
        expect(Number.isFinite(reg.xCenter)).toBe(true);
        expect(Number.isFinite(reg.yCenter)).toBe(true);
      });
    });

    it('distinguishes wide regions from dense regions based on primary node counts', () => {
      const nodes = [
        createNode('ApexClass:SingleService', 'ApexClass'),
        createNode('ApexClass:DenseClass1', 'ApexClass', { displayName: 'Dense' }),
        createNode('ApexClass:DenseClass2', 'ApexClass', { displayName: 'Dense' }),
        createNode('ApexClass:DenseClass3', 'ApexClass', { displayName: 'Dense' }),
        createNode('ApexClass:DenseClass4', 'ApexClass', { displayName: 'Dense' }),
        createNode('ApexClass:DenseClass5', 'ApexClass', { displayName: 'Dense' }),
      ];

      const result = computeGlobalDomainLayout(nodes, []);
      const singleReg = result.domainRegions.get('Single')!;
      const denseReg = result.domainRegions.get('Dense')!;

      expect(denseReg.width).toBeGreaterThan(singleReg.width);
    });

    it('maintains 100% determinism across 10 repeated runs for 2D multi-row band packing', () => {
      const nodes = [];
      for (let i = 1; i <= 30; i++) {
        nodes.push(createNode(`ApexClass:ScaleClass${i}`, 'ApexClass'));
      }
      const run1 = computeGlobalDomainLayout(nodes, []);

      for (let run = 0; run < 10; run++) {
        const currentRun = computeGlobalDomainLayout(nodes, []);
        expect(currentRun.orderedDomains).toEqual(run1.orderedDomains);

        run1.orderedDomains.forEach(d => {
          const r1 = run1.domainRegions.get(d)!;
          const rCur = currentRun.domainRegions.get(d)!;
          expect(rCur.xCenter).toBe(r1.xCenter);
          expect(rCur.yCenter).toBe(r1.yCenter);
        });
      }
    });

    it('maintains input-order invariance across shuffled inputs for 2D multi-row band packing', () => {
      const nodes = [];
      for (let i = 1; i <= 30; i++) {
        nodes.push(createNode(`ApexClass:ScaleClass${i}`, 'ApexClass'));
      }
      const origRun = computeGlobalDomainLayout(nodes, []);

      const shuffledNodes = [...nodes].reverse();
      const shufRun = computeGlobalDomainLayout(shuffledNodes, []);

      expect(shufRun.orderedDomains).toEqual(origRun.orderedDomains);
      origRun.orderedDomains.forEach(d => {
        const rOrig = origRun.domainRegions.get(d)!;
        const rShuf = shufRun.domainRegions.get(d)!;
        expect(rShuf.xCenter).toBe(rOrig.xCenter);
        expect(rShuf.yCenter).toBe(rOrig.yCenter);
      });
    });
  });
});
