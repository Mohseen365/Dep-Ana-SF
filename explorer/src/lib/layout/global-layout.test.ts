import { describe, it, expect } from 'vitest';
import {
  buildDomainGraph,
  determineGlobalDomainOrder,
  computeGlobalDomainLayout,
} from './global-layout';
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
});
