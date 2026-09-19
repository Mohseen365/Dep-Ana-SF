import { describe, it, expect } from 'vitest';
import {
  ALL_BENCHMARK_FIXTURES,
  createLayeredArchitectureFixture,
  createTwoDomainFixture,
  createFoodDeliveryFixture,
  createHubHeavyFixture,
  createBridgeHeavyFixture,
  createTestHeavyFixture,
  createFieldHeavyFixture,
  createTriggerHandlerFixture,
  createDisconnectedComponentsFixture,
  createLongChainFixture,
  createDenseCrossDomainFixture,
  createSparseGraphFixture,
  createScale100PlusFixture,
} from './index';

describe('Deterministic Benchmark Fixtures Suite (Wave 1E)', () => {

  it('contains exactly 13 required benchmark fixtures', () => {
    expect(ALL_BENCHMARK_FIXTURES.length).toBe(13);
    const fixtureIds = ALL_BENCHMARK_FIXTURES.map(f => f.id);
    expect(new Set(fixtureIds).size).toBe(13);
  });

  ALL_BENCHMARK_FIXTURES.forEach(fixture => {
    describe(`Fixture: ${fixture.id} (${fixture.name})`, () => {

      it('is strictly deterministic across multiple invocations', () => {
        let reCreated;
        switch (fixture.id) {
          case 'layered-architecture': reCreated = createLayeredArchitectureFixture(); break;
          case 'two-domain': reCreated = createTwoDomainFixture(); break;
          case 'food-delivery': reCreated = createFoodDeliveryFixture(); break;
          case 'hub-heavy': reCreated = createHubHeavyFixture(); break;
          case 'bridge-heavy': reCreated = createBridgeHeavyFixture(); break;
          case 'test-heavy': reCreated = createTestHeavyFixture(); break;
          case 'field-heavy': reCreated = createFieldHeavyFixture(); break;
          case 'trigger-handler': reCreated = createTriggerHandlerFixture(); break;
          case 'disconnected-components': reCreated = createDisconnectedComponentsFixture(); break;
          case 'long-chain': reCreated = createLongChainFixture(); break;
          case 'dense-cross-domain': reCreated = createDenseCrossDomainFixture(); break;
          case 'sparse-graph': reCreated = createSparseGraphFixture(); break;
          case 'scale-100-plus': reCreated = createScale100PlusFixture(); break;
          default: throw new Error(`Unknown fixture ID: ${fixture.id}`);
        }

        expect(reCreated).toEqual(fixture);
      });

      it('has complete metadata and purpose description', () => {
        expect(fixture.id).toBeTruthy();
        expect(fixture.name).toBeTruthy();
        expect(fixture.description).toBeTruthy();
        expect(fixture.purpose).toBeTruthy();
        expect(fixture.targetFailures.length).toBeGreaterThan(0);
        expect(fixture.metadata.nodeCount).toBe(fixture.nodes.length);
        expect(fixture.metadata.edgeCount).toBe(fixture.edges.length);
      });

      it('has valid node and edge structural integrity', () => {
        const nodeIds = new Set<string>();

        fixture.nodes.forEach(node => {
          expect(node.id).toBeTruthy();
          expect(node.type).toBeTruthy();
          expect(node.metrics).toBeDefined();
          expect(node.behavior).toBeDefined();

          expect(nodeIds.has(node.id)).toBe(false);
          nodeIds.add(node.id);
        });

        fixture.edges.forEach(edge => {
          expect(edge.id).toBeTruthy();
          expect(nodeIds.has(edge.source)).toBe(true);
          expect(nodeIds.has(edge.target)).toBe(true);
        });
      });

      it('has sorted node IDs and edge IDs', () => {
        const nodeIds = fixture.nodes.map(n => n.id);
        const sortedNodeIds = [...nodeIds].sort((a, b) => a.localeCompare(b));
        expect(nodeIds).toEqual(sortedNodeIds);

        const edgeIds = fixture.edges.map(e => e.id);
        const sortedEdgeIds = [...edgeIds].sort((a, b) => a.localeCompare(b));
        expect(edgeIds).toEqual(sortedEdgeIds);
      });

    });
  });

  it('verifies scale-100-plus contains at least 100 nodes', () => {
    const scaleFixture = createScale100PlusFixture();
    expect(scaleFixture.nodes.length).toBeGreaterThanOrEqual(100);
  });

});
