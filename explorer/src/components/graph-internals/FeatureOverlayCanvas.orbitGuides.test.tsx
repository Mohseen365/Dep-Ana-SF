import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FeatureOverlayCanvas } from './FeatureOverlayCanvas';
import type { OrbitGuideMetadata } from '../../lib/orbit-layout';

describe('Fix #19 — Derive orbit guide radii from orbitGuides.rings', () => {
  it('derives sector line endpoints and label positions from maxRingRadius', () => {
    const stubCy = {
      pan: () => ({ x: 0, y: 0 }),
      zoom: () => 1,
      on: () => {},
      off: () => {},
      nodes: () => [],
    } as any;

    const mockOrbitGuides: OrbitGuideMetadata = {
      rings: [
        { ringIndex: 0, radiusPx: 500, label: 'Core' },
        { ringIndex: 1, radiusPx: 1000, label: 'Outer' },
      ],
      sectors: [
        {
          sectorId: 's1',
          label: 'feature_sales',
          nodeCount: 5,
          startAngleRad: 0,
          endAngleRad: Math.PI / 2,
          sectorBodyAngleRad: Math.PI / 2,
          sectorMarginAngleRad: 0.05,
          usableStartAngleRad: 0.05,
          usableEndAngleRad: Math.PI / 2 - 0.05,
          usableAngleRad: Math.PI / 2 - 0.1,
        },
      ],
    };

    const { container } = render(
      <FeatureOverlayCanvas
        cy={stubCy}
        nodes={[]}
        edges={[]}
        architectureMode="orbit"
        orbitGuides={mockOrbitGuides}
        enableOverlay={true}
      />
    );

    const line = container.querySelector('line');
    expect(line).not.toBeNull();
    // maxRingRadius is 1000. guideRadius = 1000 * 1.08 = 1080.
    // startAngleRad = 0 -> x2 = 1080, y2 = 0
    expect(line?.getAttribute('x2')).toBe('1080');
    expect(line?.getAttribute('y2')).toBe('0');

    const text = container.querySelector('.orbit-guides-overlay text[text-anchor="middle"]');
    expect(text).not.toBeNull();
    // midAngle = PI / 4 = 0.785398...
    // labelRadius = 1000 * 1.0 = 1000.
    // labelX = 1000 * cos(PI/4) = 707.11
    expect(text?.getAttribute('x')).toBe('707.11');
  });

  it('falls back to default 2600 / 2400 constants when orbitGuides.rings is empty', () => {
    const stubCy = {
      pan: () => ({ x: 0, y: 0 }),
      zoom: () => 1,
      on: () => {},
      off: () => {},
      nodes: () => [],
    } as any;

    const mockOrbitGuides: OrbitGuideMetadata = {
      rings: [],
      sectors: [
        {
          sectorId: 's1',
          label: 'feature_sales',
          nodeCount: 5,
          startAngleRad: 0,
          endAngleRad: Math.PI / 2,
          sectorBodyAngleRad: Math.PI / 2,
          sectorMarginAngleRad: 0.05,
          usableStartAngleRad: 0.05,
          usableEndAngleRad: Math.PI / 2 - 0.05,
          usableAngleRad: Math.PI / 2 - 0.1,
        },
      ],
    };

    const { container } = render(
      <FeatureOverlayCanvas
        cy={stubCy}
        nodes={[]}
        edges={[]}
        architectureMode="orbit"
        orbitGuides={mockOrbitGuides}
        enableOverlay={true}
      />
    );

    const line = container.querySelector('line');
    expect(line?.getAttribute('x2')).toBe('2600');
  });
});
