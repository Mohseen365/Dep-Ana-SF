import { describe, it, expect } from 'vitest';
import { evaluateRefactoringReadiness, READINESS_DISCLAIMER } from './readiness';
import { createSampleNode } from '../test/fixtures/sample-nodes';
import { createSampleImpactSummary } from '../test/fixtures/sample-impact-summaries';
import type { ExplorerNode, ExplorerComponentImpactSummary } from '../types/explorer';

describe('evaluateRefactoringReadiness', () => {
  const baseNode: ExplorerNode = createSampleNode({
    id: 'ApexClass:SampleService',
    displayName: 'SampleService',
    risk: 'LOW',
    metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 1 },
    refactoringReadiness: {
      isHighRisk: false,
      hasCycles: false,
      hasUnresolved: false,
      testCoverageStatus: 'COVERED',
    },
  });

  const baseImpact: ExplorerComponentImpactSummary = createSampleImpactSummary('ApexClass:SampleService', {
    impactedTests: ['ApexClass:SampleServiceTest'],
    totalImpactCount: 2,
  });

  it('classifies a low-risk, well-tested, low-impact component as GOOD CANDIDATE', () => {
    const res = evaluateRefactoringReadiness(baseNode, baseImpact);
    expect(res.classification).toBe('GOOD CANDIDATE');
    expect(res.reasons).toContain('Low risk, no cycles, no unresolved references, tests identified, limited impact');
    expect(res.disclaimer).toBe(READINESS_DISCLAIMER);
  });

  it('classifies a medium risk component as CAUTION', () => {
    const node: ExplorerNode = {
      ...baseNode,
      risk: 'MEDIUM',
      metrics: { ...baseNode.metrics, fanIn: 4, coupling: 5 }
    };
    const res = evaluateRefactoringReadiness(node, baseImpact);
    expect(res.classification).toBe('CAUTION');
    expect(res.reasons).toContain('Moderate risk evaluation from analyzer');
  });

  it('classifies high-risk components as HIGH CAUTION', () => {
    const node: ExplorerNode = {
      ...baseNode,
      risk: 'HIGH',
      refactoringReadiness: { ...baseNode.refactoringReadiness, isHighRisk: true }
    };
    const res = evaluateRefactoringReadiness(node, baseImpact);
    expect(res.classification).toBe('HIGH CAUTION');
    expect(res.reasons).toContain('High component risk score from analyzer');
  });

  it('flags circular dependency participation as HIGH CAUTION', () => {
    const node: ExplorerNode = {
      ...baseNode,
      refactoringReadiness: { ...baseNode.refactoringReadiness, hasCycles: true }
    };
    const res = evaluateRefactoringReadiness(node, baseImpact);
    expect(res.classification).toBe('HIGH CAUTION');
    expect(res.reasons).toContain('Participates in circular dependency');
  });

  it('flags unresolved references as HIGH CAUTION', () => {
    const node: ExplorerNode = {
      ...baseNode,
      metrics: { ...baseNode.metrics, unresolved: 1 },
      refactoringReadiness: { ...baseNode.refactoringReadiness, hasUnresolved: true }
    };
    const res = evaluateRefactoringReadiness(node, baseImpact);
    expect(res.classification).toBe('HIGH CAUTION');
    expect(res.reasons).toContain('Contains unresolved external or missing references');
  });

  it('flags missing test coverage as HIGH CAUTION', () => {
    const nodeUntested: ExplorerNode = {
      ...baseNode,
      refactoringReadiness: { ...baseNode.refactoringReadiness, testCoverageStatus: 'UNTESTED' }
    };
    const resUntested = evaluateRefactoringReadiness(nodeUntested, baseImpact);
    expect(resUntested.classification).toBe('HIGH CAUTION');
    expect(resUntested.reasons).toContain('Untested component (no covering tests identified)');

    const nodeNoTests: ExplorerNode = {
      ...baseNode,
      refactoringReadiness: { ...baseNode.refactoringReadiness, testCoverageStatus: 'NO_TESTS' }
    };
    const resNoTests = evaluateRefactoringReadiness(nodeNoTests, baseImpact);
    expect(resNoTests.classification).toBe('HIGH CAUTION');
    expect(resNoTests.reasons).toContain('No tests identified for this component');
  });

  it('flags large architectural impact surface as HIGH CAUTION', () => {
    const largeImpact: ExplorerComponentImpactSummary = {
      ...baseImpact,
      totalImpactCount: 15
    };
    const res = evaluateRefactoringReadiness(baseNode, largeImpact);
    expect(res.classification).toBe('HIGH CAUTION');
    expect(res.reasons).toContain('Large architectural impact surface (15 affected components)');
  });
});
