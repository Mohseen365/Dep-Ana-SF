import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { slugify, exportExplorerData } from '../../../scripts/export-explorer.cjs';

const ROOT_DIR = path.resolve(__dirname, '../../../');
const PUBLIC_DIR = path.resolve(ROOT_DIR, 'explorer/public');

describe('PBIM Dedicated Data Path & Project Resolution Contract', () => {
  it('Requirement 1: Explicit PBIM project ID slugification and resolution path', () => {
    expect(slugify('pbim')).toBe('pbim');
    expect(slugify('PBIM')).toBe('pbim');
    expect(slugify('pbim-project')).toBe('pbim-project');
  });

  it('Requirement 2: PBIM dedicated artifact exists in explorer/public/pbim/explorer-data.json', () => {
    const pbimPublicPath = path.join(PUBLIC_DIR, 'pbim/explorer-data.json');
    expect(fs.existsSync(pbimPublicPath)).toBe(true);

    const rawData = JSON.parse(fs.readFileSync(pbimPublicPath, 'utf8'));
    expect(rawData.project.id).toBe('pbim');
    expect(rawData.project.analysisPath).toBe('/pbim/explorer-data.json');
    expect(rawData.summary.nodeCount).toBe(528);
    expect(rawData.summary.edgeCount).toBe(2063);
  });

  it('Requirement 3: project-manifest.json registers PBIM with analysisPath /pbim/explorer-data.json', () => {
    const manifestPath = path.join(PUBLIC_DIR, 'project-manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const pbimProj = manifest.projects.find((p: any) => p.id === 'pbim');
    expect(pbimProj).toBeDefined();
    expect(pbimProj.analysisPath).toBe('/pbim/explorer-data.json');

    const defaultProj = manifest.projects.find((p: any) => p.id === 'default');
    expect(defaultProj).toBeDefined();
    expect(defaultProj.analysisPath).toBe('/explorer-data.json');
  });

  it('Requirement 4: Exporter script output path and loader path agree', () => {
    const pbimInputPath = path.join(ROOT_DIR, 'analyze/projects/pbim');
    const tempOutputDir = path.join(ROOT_DIR, 'temp-test-export-pbim/explorer-data.json');

    try {
      const res = exportExplorerData(pbimInputPath, tempOutputDir, {
        project: 'pbim',
        projectName: 'PBIM',
        skipManifest: true,
      });

      expect(res.projectMetadata.id).toBe('pbim');
      expect(res.projectMetadata.analysisPath).toBe('/pbim/explorer-data.json');
      expect(res.explorerData.summary.nodeCount).toBe(528);
    } finally {
      const tempParent = path.dirname(tempOutputDir);
      if (fs.existsSync(tempParent)) {
        fs.rmSync(tempParent, { recursive: true, force: true });
      }
    }
  });

  it('Requirement 5: Root default file /explorer-data.json is distinct from PBIM artifact', () => {
    const defaultPublicPath = path.join(PUBLIC_DIR, 'explorer-data.json');
    const pbimPublicPath = path.join(PUBLIC_DIR, 'pbim/explorer-data.json');

    expect(fs.existsSync(defaultPublicPath)).toBe(true);
    expect(fs.existsSync(pbimPublicPath)).toBe(true);

    const defaultData = JSON.parse(fs.readFileSync(defaultPublicPath, 'utf8'));
    const pbimData = JSON.parse(fs.readFileSync(pbimPublicPath, 'utf8'));

    expect(defaultData.project.id).toBe('default');
    expect(pbimData.project.id).toBe('pbim');
    expect(defaultData.summary.nodeCount).not.toBe(pbimData.summary.nodeCount);
    expect(pbimData.summary.nodeCount).toBe(528);
  });
});
