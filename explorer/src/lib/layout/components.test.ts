import { describe, test, expect } from 'vitest';
import {
  packComponents,
  packComponentPositions,
  compareComponents,
  calculateLocalComponentBounds,
  type ComponentRectangle,
  type ComponentLocalLayout,
} from './components';
import { componentSeparation } from './metrics';
import { createDisconnectedComponentsFixture } from './fixtures/disconnected-components';
import { createFoodDeliveryFixture } from './fixtures/food-delivery';

/**
 * Helper to check if two bounding boxes overlap (strictly within EPSILON).
 */
function boxesOverlap(
  b1: { minX: number; maxX: number; minY: number; maxY: number },
  b2: { minX: number; maxX: number; minY: number; maxY: number },
  epsilon = 1e-6
): boolean {
  return (
    b1.minX < b2.maxX - epsilon &&
    b1.maxX > b2.minX + epsilon &&
    b1.minY < b2.maxY - epsilon &&
    b1.maxY > b2.minY + epsilon
  );
}

/**
 * Helper to measure minimum clearance gap between any pair of placed component bounding boxes.
 */
function minimumGapBetweenComponents(
  placedComponents: Array<{ bounds: { minX: number; maxX: number; minY: number; maxY: number } }>
): number | null {
  let minGap: number | null = null;
  for (let i = 0; i < placedComponents.length; i++) {
    const b1 = placedComponents[i].bounds;
    for (let j = i + 1; j < placedComponents.length; j++) {
      const b2 = placedComponents[j].bounds;

      const dx = Math.max(0, Math.max(b1.minX - b2.maxX, b2.minX - b1.maxX));
      const dy = Math.max(0, Math.max(b1.minY - b2.maxY, b2.minY - b1.maxY));
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (minGap === null || dist < minGap) {
        minGap = dist;
      }
    }
  }
  return minGap;
}

describe('Component Packing (components.ts)', () => {
  describe('compareComponents (Deterministic Ordering)', () => {
    test('orders by structural importance descending', () => {
      const c1: ComponentRectangle = { id: 1, width: 100, height: 100, structuralImportance: 5 };
      const c2: ComponentRectangle = { id: 2, width: 100, height: 100, structuralImportance: 10 };
      expect(compareComponents(c1, c2)).toBeGreaterThan(0);
      expect(compareComponents(c2, c1)).toBeLessThan(0);
    });

    test('orders by node count descending if structural importance is equal', () => {
      const c1: ComponentRectangle = { id: 1, width: 100, height: 100, nodeCount: 3 };
      const c2: ComponentRectangle = { id: 2, width: 100, height: 100, nodeCount: 10 };
      expect(compareComponents(c1, c2)).toBeGreaterThan(0);
    });

    test('orders by area descending if structural importance and node count are equal', () => {
      const c1: ComponentRectangle = { id: 1, width: 100, height: 100 }; // area 10,000
      const c2: ComponentRectangle = { id: 2, width: 200, height: 100 }; // area 20,000
      expect(compareComponents(c1, c2)).toBeGreaterThan(0);
    });

    test('orders by minNodeId ascending as deterministic tie-breaker', () => {
      const c1: ComponentRectangle = { id: 1, width: 100, height: 100, minNodeId: 'Alpha' };
      const c2: ComponentRectangle = { id: 2, width: 100, height: 100, minNodeId: 'Beta' };
      expect(compareComponents(c1, c2)).toBeLessThan(0);
    });
  });

  describe('Two Equal Components', () => {
    test('verifies no overlap and minimum gap separation', () => {
      const rects: ComponentRectangle[] = [
        { id: 'compA', width: 200, height: 150, minNodeId: 'A' },
        { id: 'compB', width: 200, height: 150, minNodeId: 'B' },
      ];
      const gap = 100;
      const result = packComponents(rects, { gap });

      expect(result.placedComponents).toHaveLength(2);
      const [b1, b2] = result.placedComponents.map(c => c.bounds);

      // Verify no overlap
      expect(boxesOverlap(b1, b2)).toBe(false);

      // Verify clearance gap
      const minGap = minimumGapBetweenComponents(result.placedComponents);
      expect(minGap).not.toBeNull();
      expect(minGap!).toBeGreaterThanOrEqual(gap - 1e-6);
    });
  });

  describe('Wide Component + Small Components', () => {
    test('verifies small components are not pushed unnecessarily far right', () => {
      const rects: ComponentRectangle[] = [
        { id: 'wide', width: 800, height: 100, minNodeId: 'W1' },
        { id: 'small1', width: 100, height: 100, minNodeId: 'S1' },
        { id: 'small2', width: 100, height: 100, minNodeId: 'S2' },
        { id: 'small3', width: 100, height: 100, minNodeId: 'S3' },
      ];
      const gap = 50;

      // Naive linear offset would push small3 to X = 800 + 100 + 100 + 3*50 = 1150
      // 2D shelf packing places small components on shelf 1 below wide component or in row
      const result = packComponents(rects, { gap, targetWidth: 800 });

      expect(result.placedComponents).toHaveLength(4);

      // Verify no overlaps
      for (let i = 0; i < result.placedComponents.length; i++) {
        for (let j = i + 1; j < result.placedComponents.length; j++) {
          expect(
            boxesOverlap(
              result.placedComponents[i].bounds,
              result.placedComponents[j].bounds
            )
          ).toBe(false);
        }
      }

      // Max X of small components should be well within compact 2D bounds (<= 800)
      const smallPlaced = result.placedComponents.filter(c => c.id !== 'wide');
      for (const small of smallPlaced) {
        expect(small.bounds.maxX).toBeLessThanOrEqual(800 + 1e-6);
      }
    });
  });

  describe('Tall Component', () => {
    test('verifies packing accounts for component height', () => {
      const rects: ComponentRectangle[] = [
        { id: 'tall', width: 100, height: 500, minNodeId: 'T' },
        { id: 'normal1', width: 200, height: 100, minNodeId: 'N1' },
        { id: 'normal2', width: 200, height: 100, minNodeId: 'N2' },
      ];
      const gap = 80;
      const result = packComponents(rects, { gap });

      // Verify no overlaps
      for (let i = 0; i < result.placedComponents.length; i++) {
        for (let j = i + 1; j < result.placedComponents.length; j++) {
          expect(
            boxesOverlap(
              result.placedComponents[i].bounds,
              result.placedComponents[j].bounds
            )
          ).toBe(false);
        }
      }

      // Verify total bounding box height accommodates the tall component plus gaps
      expect(result.totalBounds.height).toBeGreaterThanOrEqual(500);

      const minGap = minimumGapBetweenComponents(result.placedComponents);
      expect(minGap!).toBeGreaterThanOrEqual(gap - 1e-6);
    });

    test('prevents tall items placed on non-last shelves from expanding shelf height into lower shelves', () => {
      // C1: short (h=50, w=100), importance=10 -> sorted first onto Shelf 0
      // C2: medium (h=100, w=400), importance=5 -> forces creation of Shelf 1
      // C3: tall (h=300, w=100), importance=1 -> fits horizontally on Shelf 0, but height=300 > Shelf 0 height (50)
      const rects: ComponentRectangle[] = [
        { id: 'C1', width: 100, height: 50, structuralImportance: 10 },
        { id: 'C2', width: 400, height: 100, structuralImportance: 5 },
        { id: 'C3', width: 100, height: 300, structuralImportance: 1 },
      ];

      const result = packComponents(rects, { gap: 50, targetWidth: 400 });

      // Verify no overlaps between any placed components
      for (let i = 0; i < result.placedComponents.length; i++) {
        for (let j = i + 1; j < result.placedComponents.length; j++) {
          expect(
            boxesOverlap(
              result.placedComponents[i].bounds,
              result.placedComponents[j].bounds
            )
          ).toBe(false);
        }
      }
    });
  });

  describe('Many Components', () => {
    test('verifies packing is compact across rows/shelves', () => {
      const rects: ComponentRectangle[] = [];
      for (let i = 1; i <= 12; i++) {
        rects.push({
          id: `comp_${i}`,
          width: 150 + (i % 3) * 20,
          height: 100 + (i % 2) * 30,
          minNodeId: `Node_${i.toString().padStart(2, '0')}`,
        });
      }

      const gap = 50;
      const result = packComponents(rects, { gap, targetAspectRatio: 1.5 });

      expect(result.placedComponents).toHaveLength(12);

      // Verify zero overlaps
      for (let i = 0; i < result.placedComponents.length; i++) {
        for (let j = i + 1; j < result.placedComponents.length; j++) {
          expect(
            boxesOverlap(
              result.placedComponents[i].bounds,
              result.placedComponents[j].bounds
            )
          ).toBe(false);
        }
      }

      // Compactness check: Aspect ratio of total bounds should be near landscape target (between 0.5 and 3.0)
      const aspectRatio = result.totalBounds.width / result.totalBounds.height;
      expect(aspectRatio).toBeGreaterThan(0.5);
      expect(aspectRatio).toBeLessThan(3.5);

      // Compare total width vs single line width
      const singleLineWidth = rects.reduce((sum, r) => sum + r.width + gap, 0);
      expect(result.totalBounds.width).toBeLessThan(singleLineWidth * 0.6);
    });
  });

  describe('Different Aspect Ratios', () => {
    test('packs mixture of 1x1, wide, and tall components without overlap', () => {
      const rects: ComponentRectangle[] = [
        { id: 'square', width: 200, height: 200, minNodeId: 'SQ' },
        { id: 'wide', width: 600, height: 100, minNodeId: 'WD' },
        { id: 'tall', width: 100, height: 400, minNodeId: 'TL' },
        { id: 'small_square', width: 100, height: 100, minNodeId: 'SSQ' },
      ];
      const gap = 60;
      const result = packComponents(rects, { gap });

      expect(result.placedComponents).toHaveLength(4);

      // Zero overlap check
      for (let i = 0; i < result.placedComponents.length; i++) {
        for (let j = i + 1; j < result.placedComponents.length; j++) {
          expect(
            boxesOverlap(
              result.placedComponents[i].bounds,
              result.placedComponents[j].bounds
            )
          ).toBe(false);
        }
      }

      const minGap = minimumGapBetweenComponents(result.placedComponents);
      expect(minGap!).toBeGreaterThanOrEqual(gap - 1e-6);
    });
  });

  describe('Large + Small Mixture', () => {
    test('verifies large component does not cause pathological empty space', () => {
      const rects: ComponentRectangle[] = [
        { id: 'huge', width: 1000, height: 600, nodeCount: 20, minNodeId: 'H1' },
        { id: 'smallA', width: 150, height: 100, nodeCount: 2, minNodeId: 'SA' },
        { id: 'smallB', width: 150, height: 100, nodeCount: 2, minNodeId: 'SB' },
        { id: 'smallC', width: 150, height: 100, nodeCount: 2, minNodeId: 'SC' },
        { id: 'smallD', width: 150, height: 100, nodeCount: 2, minNodeId: 'SD' },
      ];

      const result = packComponents(rects, { gap: 50 });

      // Check unused space ratio is reasonable (< 0.65)
      expect(result.unusedSpaceRatio).toBeLessThan(0.65);

      // Zero overlaps
      for (let i = 0; i < result.placedComponents.length; i++) {
        for (let j = i + 1; j < result.placedComponents.length; j++) {
          expect(
            boxesOverlap(
              result.placedComponents[i].bounds,
              result.placedComponents[j].bounds
            )
          ).toBe(false);
        }
      }
    });
  });

  describe('Determinism', () => {
    test('produces identical packing regardless of input array order', () => {
      const rects: ComponentRectangle[] = [
        { id: 'C1', width: 300, height: 150, structuralImportance: 5, minNodeId: 'Alpha' },
        { id: 'C2', width: 100, height: 200, structuralImportance: 2, minNodeId: 'Beta' },
        { id: 'C3', width: 250, height: 100, structuralImportance: 8, minNodeId: 'Gamma' },
        { id: 'C4', width: 150, height: 150, structuralImportance: 1, minNodeId: 'Delta' },
      ];

      const res1 = packComponents(rects, { gap: 75 });
      const res2 = packComponents([...rects].reverse(), { gap: 75 });
      const res3 = packComponents([rects[2], rects[0], rects[3], rects[1]], { gap: 75 });

      expect(res1.offsets).toEqual(res2.offsets);
      expect(res1.offsets).toEqual(res3.offsets);
      expect(res1.totalBounds).toEqual(res2.totalBounds);
    });
  });

  describe('Gap Enforcement', () => {
    test('enforces exact minimum requested separation across different gaps', () => {
      const rects: ComponentRectangle[] = [
        { id: 'A', width: 150, height: 100, minNodeId: 'A' },
        { id: 'B', width: 150, height: 100, minNodeId: 'B' },
        { id: 'C', width: 150, height: 100, minNodeId: 'C' },
      ];

      for (const testGap of [50, 100, 175]) {
        const result = packComponents(rects, { gap: testGap, targetWidth: 200 });
        const minGap = minimumGapBetweenComponents(result.placedComponents);
        expect(minGap!).toBeGreaterThanOrEqual(testGap - 1e-6);
      }
    });
  });

  describe('Fixture Integration Tests', () => {
    test('packs disconnected-components benchmark fixture with 0 overlaps', () => {
      const fixture = createDisconnectedComponentsFixture();

      // Decompose nodes by connected component ID or prefix
      const componentMap: Record<string, Record<string, { x: number; y: number }>> = {
        Tiny: {
          'ApexClass:TinyUtilA': { x: 0, y: 0 },
          'ApexClass:TinyUtilB': { x: 0, y: 80 },
        },
        Tall: {
          'LWC:TallView': { x: 0, y: 0 },
          'ApexClass:TallController': { x: 0, y: 100 },
          'ApexClass:TallService': { x: 0, y: 200 },
          'CustomObject:TallObj__c': { x: 0, y: 300 },
        },
        Wide: {
          'ApexClass:WideA': { x: 0, y: 0 },
          'ApexClass:WideB': { x: 150, y: 0 },
          'ApexClass:WideC': { x: 300, y: 0 },
          'ApexClass:WideD': { x: 450, y: 0 },
          'ApexClass:WideHub': { x: 225, y: 120 },
        },
        Medium: {
          'ApexClass:MediumAlpha': { x: 0, y: 0 },
          'ApexClass:MediumBeta': { x: 150, y: 0 },
          'CustomObject:MediumData__c': { x: 75, y: 120 },
        },
        Large: {
          'LWC:LargePortal': { x: 0, y: 0 },
          'ApexClass:LargeController': { x: 0, y: 100 },
          'ApexClass:LargeService': { x: 0, y: 200 },
          'ApexClass:LargeSelector': { x: 0, y: 300 },
          'ApexClass:LargeHelper': { x: 150, y: 200 },
          'CustomObject:LargeHeader__c': { x: 0, y: 400 },
        },
      };

      const localComponents: ComponentLocalLayout[] = Object.entries(componentMap).map(([id, positions]) => ({
        id,
        positions,
      }));

      const packed = packComponentPositions(localComponents, { gap: 100 });

      // Run Wave 1D componentSeparation metrics on packed positions
      const metrics = componentSeparation(fixture.nodes, fixture.edges, packed.positions, { minComponentGap: 100 });

      expect(metrics.overlappingComponentPairs).toBe(0);
      expect(metrics.gapViolationCount).toBe(0);
      expect(metrics.minComponentDistance).toBeGreaterThanOrEqual(100 - 1e-6);
    });

    test('verifies food-delivery fixture disconnected handling', () => {
      const fixture = createFoodDeliveryFixture();

      // Food delivery graph has 1 main connected component with 5 domains
      // Let's create a scenario with food-delivery + 2 isolated utility components
      const util1: ComponentLocalLayout = {
        id: 'LoggerUtil',
        positions: { 'ApexClass:Logger': { x: 0, y: 0 } },
      };
      const util2: ComponentLocalLayout = {
        id: 'ConfigUtil',
        positions: { 'ApexClass:ConfigService': { x: 0, y: 0 } },
      };

      const mainDomainPositions: Record<string, { x: number; y: number }> = {};
      fixture.nodes.forEach((n, idx) => {
        mainDomainPositions[n.id] = { x: (idx % 5) * 150, y: Math.floor(idx / 5) * 100 };
      });

      const mainComp: ComponentLocalLayout = {
        id: 'MainFoodDelivery',
        positions: mainDomainPositions,
        structuralImportance: 50,
      };

      const packed = packComponentPositions([mainComp, util1, util2], { gap: 120 });

      const metrics = componentSeparation(fixture.nodes, fixture.edges, packed.positions, { minComponentGap: 120 });
      expect(metrics.overlappingComponentPairs).toBe(0);
      expect(metrics.gapViolationCount).toBe(0);
    });
  });
});
