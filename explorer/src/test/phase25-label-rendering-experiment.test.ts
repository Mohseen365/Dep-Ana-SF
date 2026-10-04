import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';

describe('Phase 25 — Unit Tests for Label Rendering Contract & Forensics', () => {
  it('Verifies label length distribution across PBIM dataset', () => {
    const pbimPath = path.resolve(__dirname, '../../../explorer/public/projects/pbim/explorer-data.json');
    const pbim = JSON.parse(fs.readFileSync(pbimPath, 'utf-8'));
    expect(pbim.nodes.length).toBe(528);

    const labels = pbim.nodes.map((n: any) => n.displayName || n.id);
    const maxLen = Math.max(...labels.map((l: string) => l.length));
    expect(maxLen).toBe(47); // Contractor_Assignment__c.Maintenance_Request__c
  });
});
