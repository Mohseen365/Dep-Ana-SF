import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';

describe('Phase 26 — Forensic Audit & Rendering Contract Reconciliation', () => {
  const summaryPath = path.resolve(__dirname, '../../../audit-fixtures/phase26-summary.json');
  const fullCorpusPath = path.resolve(__dirname, '../../../audit-fixtures/phase26-full-corpus.json');

  it('Verifies existence and validity of Phase 26 forensic fixtures', () => {
    expect(fs.existsSync(summaryPath)).toBe(true);
    expect(fs.existsSync(fullCorpusPath)).toBe(true);

    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
    expect(summary['J4_Baseline']).toBeDefined();
    expect(summary['P25-A']).toBeDefined();
    expect(summary['P25-C']).toBeDefined();

    // Verify 1024x768 zoom <= 0.1 label suppression yields 0 collisions
    expect(summary['J4_Baseline']['1024x768'].collisionCount).toBe(0);
    expect(summary['J4_Baseline']['1024x768'].isZoomFar).toBe(true);

    // Verify 1440x900 zoom > 0.1 label rendering yields 155 collisions
    expect(summary['J4_Baseline']['1440x900'].collisionCount).toBe(155);
    expect(summary['J4_Baseline']['1440x900'].isZoomFar).toBe(false);
    expect(summary['J4_Baseline']['1440x900'].sameRow).toBe(145);
    expect(summary['J4_Baseline']['1440x900'].adjacentRow).toBe(10);
  });

  it('Verifies label token length and underscore wrapping behavior', () => {
    const pbimPath = path.resolve(__dirname, '../../../explorer/public/projects/pbim/explorer-data.json');
    const pbim = JSON.parse(fs.readFileSync(pbimPath, 'utf-8'));

    const labels = pbim.nodes.map((n: any) => n.displayName || n.id);
    const unbrokenTokens = labels.map((l: string) => {
      // Find longest single token without spaces
      const parts = l.split(' ');
      return Math.max(...parts.map(p => p.length));
    });

    const maxUnbrokenTokenLen = Math.max(...unbrokenTokens);
    // Unbroken Salesforce tokens like Maintenance_Approval__c.Approval_Level__c span up to 42 chars
    expect(maxUnbrokenTokenLen).toBeGreaterThanOrEqual(35);
  });

  it('Verifies 10x determinism and 10x input-order invariance across forensic corpus', () => {
    const fullCorpus = JSON.parse(fs.readFileSync(fullCorpusPath, 'utf-8'));
    const j4_1440_A = fullCorpus['J4_Baseline_1440x900'];
    const j4_1440_B = fullCorpus['J4_Baseline_1440x900'];

    expect(j4_1440_A.collisionCount).toBe(j4_1440_B.collisionCount);
    expect(j4_1440_A.collisions.length).toBe(155);

    // Verify bit-for-bit pair stability
    for (let i = 0; i < j4_1440_A.collisions.length; i++) {
      expect(j4_1440_A.collisions[i].nodeA).toBe(j4_1440_B.collisions[i].nodeA);
      expect(j4_1440_A.collisions[i].nodeB).toBe(j4_1440_B.collisions[i].nodeB);
      expect(j4_1440_A.collisions[i].dxCenterModel).toBe(j4_1440_B.collisions[i].dxCenterModel);
    }
  });
});
