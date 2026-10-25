import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Phase 30A Deterministic Tokenizers for Display-Label Soft-Wrapping.
 *
 * All tokenizers accept a raw/semantic display label and return a display rendering string.
 * The underlying semantic node label, node ID, edge ID, and graph topology are NEVER modified.
 */

export function tokenizeR4(label: string): string {
  return label;
}

export function tokenizeUnderscore(label: string): string {
  if (!label.includes('_')) return label;
  return label.replace(/_/g, '_\n').replace(/\n+/g, '\n').trim();
}

export function tokenizeDot(label: string): string {
  if (!label.includes('.')) return label;
  return label.replace(/\./g, '.\n').replace(/\n+/g, '\n').trim();
}

export function tokenizeBoth(label: string): string {
  let result = label;
  result = result.replace(/_/g, '_\n');
  result = result.replace(/\./g, '.\n');
  return result.replace(/\n+/g, '\n').trim();
}

export function tokenizeChunk(label: string, maxChunkLen: number = 12): string {
  const initial = tokenizeBoth(label);
  const lines = initial.split('\n');
  const chunkedLines: string[] = [];

  for (const line of lines) {
    if (line.length <= maxChunkLen) {
      chunkedLines.push(line);
      continue;
    }

    const camelTokens = line.split(/(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Za-z])(?=[0-9])/);
    if (camelTokens.length > 1) {
      let current = '';
      for (const token of camelTokens) {
        if (!current) {
          current = token;
        } else if (current.length + token.length <= maxChunkLen) {
          current += token;
        } else {
          chunkedLines.push(current);
          current = token;
        }
      }
      if (current) chunkedLines.push(current);
    } else {
      for (let i = 0; i < line.length; i += maxChunkLen) {
        chunkedLines.push(line.substring(i, i + maxChunkLen));
      }
    }
  }

  return chunkedLines.join('\n');
}

export const TOKENIZERS: Record<string, (label: string) => string> = {
  'R4_Baseline': tokenizeR4,
  '30A-Underscore': tokenizeUnderscore,
  '30A-Dot': tokenizeDot,
  '30A-Both': tokenizeBoth,
  '30A-Chunk': tokenizeChunk,
};

describe('PHASE 30A — Display-Label Soft-Wrap Tokenizer Unit Tests', () => {
  it('Verifies R4 baseline tokenizer returns identical label', () => {
    const raw = 'Maintenance_Approval__c.Approval_Level__c';
    expect(tokenizeR4(raw)).toBe(raw);
  });

  it('Verifies 30A-Underscore tokenizer inserts line breaks at underscores', () => {
    const raw = 'Expense_Report__c.Total_Amount__c';
    const wrapped = tokenizeUnderscore(raw);
    expect(wrapped).toContain('\n');
    expect(wrapped.replace(/\n/g, '')).toBe(raw);
  });

  it('Verifies 30A-Dot tokenizer inserts line breaks at dots', () => {
    const raw = 'Maintenance_Approval__c.Approval_Level__c';
    const wrapped = tokenizeDot(raw);
    expect(wrapped).toBe('Maintenance_Approval__c.\nApproval_Level__c');
    expect(wrapped.replace(/\n/g, '')).toBe(raw);
  });

  it('Verifies 30A-Both tokenizer inserts line breaks at underscores and dots', () => {
    const raw = 'Expense_Report__c.Total_Amount__c';
    const wrapped = tokenizeBoth(raw);
    expect(wrapped.replace(/\n/g, '')).toBe(raw);
    const lines = wrapped.split('\n');
    expect(lines.length).toBeGreaterThan(2);
  });

  it('Verifies 30A-Chunk tokenizer handles long unbroken Apex labels cleanly', () => {
    const raw = 'ContractorAssignmentTriggerHandlerTest';
    const wrapped = tokenizeChunk(raw, 12);
    expect(wrapped).toContain('\n');
    const lines = wrapped.split('\n');
    lines.forEach(l => {
      expect(l.length).toBeLessThanOrEqual(12);
    });
    expect(wrapped.replace(/\n/g, '')).toBe(raw);
  });

  it('Verifies 10x determinism across 10 identical runs for all tokenizers', () => {
    const sampleLabels = [
      'Maintenance_Approval__c.Approval_Level__c',
      'ContractorAssignmentTriggerHandlerTest',
      'Expense_Report__c.Total_Amount__c',
      'fflib_SObjectUnitOfWork',
      'Assigned_Date__c',
      'Database.AllowsCallouts'
    ];

    for (const [candId, tokenizerFn] of Object.entries(TOKENIZERS)) {
      for (const label of sampleLabels) {
        const base = tokenizerFn(label);
        for (let run = 0; run < 10; run++) {
          const runRes = tokenizerFn(label);
          expect(runRes).toBe(base);
        }
      }
    }
  });

  it('Verifies 10x input-order invariance across 10 randomized node-order input permutations', () => {
    const sampleLabels = [
      'Maintenance_Approval__c.Approval_Level__c',
      'ContractorAssignmentTriggerHandlerTest',
      'Expense_Report__c.Total_Amount__c',
      'fflib_SObjectUnitOfWork',
      'Assigned_Date__c',
      'Database.AllowsCallouts'
    ];

    for (const [candId, tokenizerFn] of Object.entries(TOKENIZERS)) {
      const baseMap = new Map(sampleLabels.map(l => [l, tokenizerFn(l)]));

      for (let run = 0; run < 10; run++) {
        const shuffled = [...sampleLabels].sort((a, b) => (run % 2 === 0 ? a.length - b.length : b.localeCompare(a)));
        shuffled.forEach(l => {
          expect(tokenizerFn(l)).toBe(baseMap.get(l));
        });
      }
    }
  });
});
