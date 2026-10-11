#!/usr/bin/env node
/**
 * Test Suite for PBIM Dedicated Data Path and Project Resolution Contract
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { slugify, exportExplorerData } = require('./export-explorer.cjs');

const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.resolve(ROOT_DIR, 'explorer/public');

function runTests() {
  console.log('Running PBIM Dedicated Data Path Test Suite...');
  console.log('============================================');

  // Test 1: Project ID slugification
  assert.strictEqual(slugify('pbim'), 'pbim');
  assert.strictEqual(slugify('PBIM'), 'pbim');
  console.log('  ✓ Test 1 PASSED: Project ID slugification verified');

  // Test 2: PBIM dedicated artifact existence at explorer/public/pbim/explorer-data.json
  const pbimPublicPath = path.join(PUBLIC_DIR, 'pbim', 'explorer-data.json');
  assert.ok(fs.existsSync(pbimPublicPath), 'explorer/public/pbim/explorer-data.json must exist');

  const pbimData = JSON.parse(fs.readFileSync(pbimPublicPath, 'utf8'));
  assert.strictEqual(pbimData.project.id, 'pbim');
  assert.strictEqual(pbimData.project.analysisPath, '/pbim/explorer-data.json');
  assert.strictEqual(pbimData.summary.nodeCount, 528);
  assert.strictEqual(pbimData.summary.edgeCount, 2063);
  console.log('  ✓ Test 2 PASSED: PBIM dedicated artifact at explorer/public/pbim/explorer-data.json verified (528N / 2063E)');

  // Test 3: project-manifest.json registration
  const manifestPath = path.join(PUBLIC_DIR, 'project-manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'explorer/public/project-manifest.json must exist');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const pbimProj = manifest.projects.find((p) => p.id === 'pbim');
  assert.ok(pbimProj, 'pbim must be registered in project-manifest.json');
  assert.strictEqual(pbimProj.analysisPath, '/pbim/explorer-data.json');

  const defaultProj = manifest.projects.find((p) => p.id === 'default');
  assert.ok(defaultProj, 'default project must be registered');
  assert.strictEqual(defaultProj.analysisPath, '/explorer-data.json');
  console.log('  ✓ Test 3 PASSED: project-manifest.json registration and analysisPath contract verified');

  // Test 4: Exporter script output path and loader path agree
  const pbimInputPath = path.join(ROOT_DIR, 'analyze/projects/pbim');
  const tempOutputDir = path.join(ROOT_DIR, 'temp-test-export-pbim/explorer-data.json');

  try {
    const res = exportExplorerData(pbimInputPath, tempOutputDir, {
      project: 'pbim',
      projectName: 'PBIM',
      skipManifest: true,
    });

    assert.strictEqual(res.projectMetadata.id, 'pbim');
    assert.strictEqual(res.projectMetadata.analysisPath, '/pbim/explorer-data.json');
    assert.strictEqual(res.explorerData.summary.nodeCount, 528);
    console.log('  ✓ Test 4 PASSED: Exporter output path and analysisPath contract agree on /pbim/explorer-data.json');
  } finally {
    const tempParent = path.dirname(tempOutputDir);
    if (fs.existsSync(tempParent)) {
      fs.rmSync(tempParent, { recursive: true, force: true });
    }
  }

  // Test 5: Root default file /explorer-data.json is distinct from PBIM artifact
  const defaultPublicPath = path.join(PUBLIC_DIR, 'explorer-data.json');
  assert.ok(fs.existsSync(defaultPublicPath), 'explorer/public/explorer-data.json must exist');

  const defaultData = JSON.parse(fs.readFileSync(defaultPublicPath, 'utf8'));
  assert.strictEqual(defaultData.project.id, 'default');
  assert.notStrictEqual(defaultData.summary.nodeCount, pbimData.summary.nodeCount);
  console.log('  ✓ Test 5 PASSED: Root default file /explorer-data.json is strictly distinct from PBIM artifact');

  // Test 6: Manifest synchronization across analyze, root, and public manifests
  const analyzeManifestPath = path.join(ROOT_DIR, 'analyze', 'project-manifest.json');
  const rootManifestPath = path.join(ROOT_DIR, 'project-manifest.json');
  assert.ok(fs.existsSync(analyzeManifestPath), 'analyze/project-manifest.json must exist');
  assert.ok(fs.existsSync(rootManifestPath), 'project-manifest.json must exist');

  const analyzeManifest = JSON.parse(fs.readFileSync(analyzeManifestPath, 'utf8'));
  const rootManifest = JSON.parse(fs.readFileSync(rootManifestPath, 'utf8'));

  assert.ok(analyzeManifest.projects.some((p) => p.id === 'pbim'), 'pbim must exist in analyze/project-manifest.json');
  assert.ok(rootManifest.projects.some((p) => p.id === 'pbim'), 'pbim must exist in project-manifest.json');
  console.log('  ✓ Test 6 PASSED: Manifest synchronization verified across public, analyze, and root manifests');

  console.log('============================================');
  console.log('ALL 6 PBIM DEDICATED DATA PATH TESTS PASSED!');
}

if (require.main === module) {
  try {
    runTests();
  } catch (err) {
    console.error(`\nTest failure: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

module.exports = { runTests };
