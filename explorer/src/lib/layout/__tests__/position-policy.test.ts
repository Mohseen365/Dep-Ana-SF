import { describe, it, expect } from 'vitest';
import { shouldAutoLayout, LayoutTrigger } from '../../position-policy';
import { resolvePosition } from '../positions';

describe('shouldAutoLayout Table Test Suite', () => {
  it('evaluates reset-layout as true in both static and interactive modes regardless of positions', () => {
    expect(shouldAutoLayout('static', 'reset-layout')).toBe(true);
    expect(shouldAutoLayout('interactive', 'reset-layout')).toBe(true);
  });

  describe('Static Mode Layout Policy Table', () => {
    it('initial trigger runs layout only if no authoritative positions exist', () => {
      expect(shouldAutoLayout('static', 'initial', { hasAuthoritativePositions: false })).toBe(true);
      expect(shouldAutoLayout('static', 'initial', { hasAuthoritativePositions: true })).toBe(false);
    });

    it('blocks automatic layout on graph-update, filter-change, focus-change, investigation, mode-switch', () => {
      const blockedTriggers: LayoutTrigger[] = ['graph-update', 'filter-change', 'focus-change', 'investigation', 'mode-switch'];
      blockedTriggers.forEach((trigger) => {
        expect(shouldAutoLayout('static', trigger, { hasAuthoritativePositions: true })).toBe(false);
        expect(shouldAutoLayout('static', trigger, { hasAuthoritativePositions: false })).toBe(false);
      });
    });

    it('architecture-mode-switch always triggers auto-layout in static mode', () => {
      expect(shouldAutoLayout('static', 'architecture-mode-switch', { hasAuthoritativePositions: true })).toBe(true);
      expect(shouldAutoLayout('static', 'architecture-mode-switch', { hasAuthoritativePositions: false })).toBe(true);
    });

    it('new-nodes trigger returns place-new-only if positions exist, or true if none exist', () => {
      expect(shouldAutoLayout('static', 'new-nodes', { hasAuthoritativePositions: true })).toBe('place-new-only');
      expect(shouldAutoLayout('static', 'new-nodes', { hasAuthoritativePositions: false })).toBe(true);
    });
  });

  describe('Interactive Mode Layout Policy Table', () => {
    it('initial trigger runs layout only if no authoritative positions exist', () => {
      expect(shouldAutoLayout('interactive', 'initial', { hasAuthoritativePositions: false })).toBe(true);
      expect(shouldAutoLayout('interactive', 'initial', { hasAuthoritativePositions: true })).toBe(false);
    });

    it('graph-update trigger runs layout when no authoritative positions exist, blocks when they do', () => {
      expect(shouldAutoLayout('interactive', 'graph-update', { hasAuthoritativePositions: false })).toBe(true);
      expect(shouldAutoLayout('interactive', 'graph-update', { hasAuthoritativePositions: true })).toBe(false);
    });

    it('architecture-mode-switch always triggers auto-layout in interactive mode', () => {
      expect(shouldAutoLayout('interactive', 'architecture-mode-switch', { hasAuthoritativePositions: true })).toBe(true);
      expect(shouldAutoLayout('interactive', 'architecture-mode-switch', { hasAuthoritativePositions: false })).toBe(true);
    });

    it('filter-change, focus-change, investigation, mode-switch do NOT trigger auto-layout', () => {
      const noLayoutTriggers: LayoutTrigger[] = ['filter-change', 'focus-change', 'investigation', 'mode-switch'];
      noLayoutTriggers.forEach((trigger) => {
        expect(shouldAutoLayout('interactive', trigger, { hasAuthoritativePositions: true })).toBe(false);
        expect(shouldAutoLayout('interactive', trigger, { hasAuthoritativePositions: false })).toBe(false);
      });
    });

    it('new-nodes trigger returns place-new-only if positions exist, or true if none exist', () => {
      expect(shouldAutoLayout('interactive', 'new-nodes', { hasAuthoritativePositions: true })).toBe('place-new-only');
      expect(shouldAutoLayout('interactive', 'new-nodes', { hasAuthoritativePositions: false })).toBe(true);
    });
  });
});

describe('resolvePosition Precedence Table Test Suite', () => {
  it('Level 1: Explicit session drag position takes highest precedence', () => {
    const sessionMap = new Map([['node-1', { x: 100, y: 100 }]]);
    const persisted = { 'node-1': { x: 200, y: 200 } };
    const cy = { x: 300, y: 300 };

    const resolved = resolvePosition('node-1', {
      session: sessionMap,
      persisted,
      cy,
      hasAuth: true,
    });

    expect(resolved).toEqual({
      position: { x: 100, y: 100 },
      level: 1,
    });
  });

  it('Level 2: Persisted project position overrides canvas position when hasAuth is true', () => {
    const persisted = { 'node-1': { x: 200, y: 200 } };
    const cy = { x: 300, y: 300 };

    const resolved = resolvePosition('node-1', {
      persisted,
      cy,
      hasAuth: true,
    });

    expect(resolved).toEqual({
      position: { x: 200, y: 200 },
      level: 2,
    });
  });

  it('Level 3: Canvas position used when hasAuth is true and no session or persisted position exists', () => {
    const cy = { x: 300, y: 300 };

    const resolved = resolvePosition('node-1', {
      cy,
      hasAuth: true,
    });

    expect(resolved).toEqual({
      position: { x: 300, y: 300 },
      level: 3,
    });
  });

  it('Ignores persisted and canvas positions when hasAuth is false', () => {
    const persisted = { 'node-1': { x: 200, y: 200 } };
    const cy = { x: 300, y: 300 };

    const resolved = resolvePosition('node-1', {
      persisted,
      cy,
      hasAuth: false,
    });

    expect(resolved).toBeNull();
  });

  it('Returns null when no position sources contain valid coordinates for nodeId', () => {
    const resolved = resolvePosition('node-unknown', {
      persisted: { 'other-node': { x: 10, y: 20 } },
      hasAuth: true,
    });

    expect(resolved).toBeNull();
  });
});
