import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import { discoverFeatures } from './features';
import { computeArchitectureLayout } from '../architecture-layout';
import { deriveFeatureCompositionGroups } from './feature-composition';
import { getSharedHighlightData } from './shared-highlight';

// Load Salesforce Cloud Spend Tracker acceptance dataset
const cloudSpendDataPath = path.resolve(
  __dirname,
  '../../../../audit-fixtures/cloud-spend-tracker/explorer-data.json'
);
const rawData = JSON.parse(fs.readFileSync(cloudSpendDataPath, 'utf8'));
const cloudSpendNodes: ExplorerNode[] = rawData.nodes || [];
const cloudSpendEdges: ExplorerEdge[] = rawData.edges || [];

describe('Wave 12 — Feature Density UX Regression & Restoration Suite', () => {
  it('1. Composition Group Deduplication & Overlap Suppression in Dense Features', () => {
    const discovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges);
    const positions = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, {
      enableFeatureLayout: true,
    });

    const forecastFeature = discovery.features.get('feature_forecast-manager');
    expect(forecastFeature).toBeDefined();

    if (forecastFeature) {
      const groups = deriveFeatureCompositionGroups(
        forecastFeature,
        cloudSpendNodes,
        cloudSpendEdges,
        positions
      );

      // Verify composition group count is strictly capped and non-overlapping
      expect(groups.length).toBeLessThanOrEqual(4);
      expect(groups.length).toBeGreaterThan(0);

      // Verify labels are distinct (no repeated labels)
      const labels = groups.map((g) => g.label);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(labels.length);

      // Verify no high IoU overlaps among derived group bounds
      for (let i = 0; i < groups.length; i++) {
        for (let j = i + 1; j < groups.length; j++) {
          const b1 = groups[i].bounds;
          const b2 = groups[j].bounds;
          if (b1 && b2) {
            const xMin = Math.max(b1.xMin, b2.xMin);
            const xMax = Math.min(b1.xMax, b2.xMax);
            const yMin = Math.max(b1.yMin, b2.yMin);
            const yMax = Math.min(b1.yMax, b2.yMax);
            if (xMax > xMin && yMax > yMin) {
              const intersection = (xMax - xMin) * (yMax - yMin);
              const union = b1.width * b1.height + b2.width * b2.height - intersection;
              const iou = intersection / union;
              expect(iou).toBeLessThan(0.55);
            }
          }
        }
      }
    }
  });

  it('2. Shared Infrastructure Highlighting Remains Default-Hidden and Non-Cluttered', () => {
    const discovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges);

    // Unselected state should produce empty/none highlight
    const emptyHighlight = getSharedHighlightData('', discovery, cloudSpendNodes, cloudSpendEdges);
    expect(emptyHighlight.type).toBe('none');
    expect(emptyHighlight.sharedNodeIds.length).toBe(0);

    // Interactive selection highlights specific connected relationships
    const sharedHighlight = getSharedHighlightData(
      'ApexClass:AuditService',
      discovery,
      cloudSpendNodes,
      cloudSpendEdges
    );

    expect(sharedHighlight.type).toBe('shared_to_features');
    expect(sharedHighlight.sharedNodeIds).toContain('ApexClass:AuditService');
  });

  it('3. Feature Membership, IDs, and Node Coordinates Remain 100% Invariant', () => {
    const discovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges);

    // Feature Count must remain exactly 21
    expect(discovery.featureList.length).toBe(21);

    // Singleton count must remain 14
    const singletons = discovery.featureList.filter((f) => f.primaryNodeIds.length === 1);
    expect(singletons.length).toBe(14);

    // Node coordinates must remain identical (0.00000px drift)
    const pos1 = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, {
      enableFeatureLayout: true,
    });
    const pos2 = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, {
      enableFeatureLayout: true,
    });

    expect(pos1).toEqual(pos2);
  });
});
