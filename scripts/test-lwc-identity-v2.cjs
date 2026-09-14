const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const { analyze, normalizeLwcName } = require('../dependency-analyzer.cjs');

console.log('Running LWC Component Identity Test Suite (V2)...');

// Helper to create temp directory structure
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lwc-test-v2-'));
const lwcDir = path.join(tempDir, 'force-app', 'main', 'default', 'lwc');

// Fixture: movie-list
const movieListDir = path.join(lwcDir, 'movie-list');
fs.mkdirSync(movieListDir, { recursive: true });
fs.writeFileSync(
  path.join(movieListDir, 'movie-list.js'),
  `import { LightningElement } from 'lwc';
   import getPopularMovies from '@salesforce/apex/MovieController.getPopularMovies';
   export default class MovieList extends LightningElement {}`
);
fs.writeFileSync(
  path.join(movieListDir, 'movie-list.html'),
  `<template>
     <c-movie-details></c-movie-details>
   </template>`
);

// Fixture: movie-details
const movieDetailsDir = path.join(lwcDir, 'movie-details');
fs.mkdirSync(movieDetailsDir, { recursive: true });
fs.writeFileSync(
  path.join(movieDetailsDir, 'movie-details.js'),
  `import { LightningElement } from 'lwc';
   export default class MovieDetails extends LightningElement {}`
);
fs.writeFileSync(
  path.join(movieDetailsDir, 'movie-details.html'),
  `<template><div>Details</div></template>`
);

// Run analyzer on temporary fixture directory
const analysisResult = analyze(tempDir, {}, false);
const graph = analysisResult.graph;

// Test 1: Case 1 & 2 Normalization Helper Unit Test
assert.strictEqual(normalizeLwcName('MovieList'), 'movie-list');
assert.strictEqual(normalizeLwcName('c-movie-list'), 'movie-list');
assert.strictEqual(normalizeLwcName('AccountCard'), 'account-card');
assert.strictEqual(normalizeLwcName('c-account-card'), 'account-card');
assert.strictEqual(normalizeLwcName('c/account-card'), 'account-card');
console.log('✓ Unit Test: normalizeLwcName handles JS class names, HTML kebab tags, and c- prefixes');

// Test 2: Exactly one logical component node for movie-list and movie-details
const lwcNodes = graph.nodes.filter(n => n.type === 'LWC');
assert.strictEqual(lwcNodes.length, 2, 'Should create exactly 2 LWC component nodes');
const movieListNodes = lwcNodes.filter(n => n.id === 'LWC:movie-list');
const movieDetailsNodes = lwcNodes.filter(n => n.id === 'LWC:movie-details');
assert.strictEqual(movieListNodes.length, 1, 'Should have exactly 1 node for LWC:movie-list');
assert.strictEqual(movieDetailsNodes.length, 1, 'Should have exactly 1 node for LWC:movie-details');
console.log('✓ Graph Test: Single logical node created for JS class + HTML component');

// Test 3: Dependency edge from LWC:movie-list to LWC:movie-details
const templateEdge = graph.edges.find(e => e.from === 'LWC:movie-list' && e.to === 'LWC:movie-details');
assert.ok(templateEdge, 'HTML reference <c-movie-details> must link LWC:movie-list -> LWC:movie-details');
assert.strictEqual(templateEdge.type, 'lwc-template-child');
console.log('✓ Edge Test: HTML template reference resolves to target LWC node');

// Test 4: Genuinely different components remain distinct
assert.notStrictEqual(movieListNodes[0].id, movieDetailsNodes[0].id);
console.log('✓ Distinctness Test: Different LWC components remain separate');

// Cleanup temp dir
fs.rmSync(tempDir, { recursive: true, force: true });
console.log('ALL LWC IDENTITY V2 TESTS PASSED SUCCESSFULLY!');
