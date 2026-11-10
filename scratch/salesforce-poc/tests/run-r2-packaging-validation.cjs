/**
 * @file run-r2-packaging-validation.cjs
 * @description Standalone Static Verification Suite for Agent R2 (.forceignore & Deployment Packaging Simulation)
 *
 * Verifies that the proposed .forceignore exclusion rules:
 * 1. Strictly exclude both quarantined Wave 9 bundles (daRefactoringEngine, daRefactorHandoffModal)
 * 2. Never exclude any of the 21 approved LWC component bundles
 * 3. Never exclude any Apex classes, Custom Objects, Custom Fields, or Static Resources
 * 4. Correctly evaluate against relative posix paths across nested directories
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const POC_ROOT = path.resolve(__dirname, '..');
const FORCE_APP = path.join(POC_ROOT, 'force-app');

console.log('======================================================================');
console.log('Agent R2 — Salesforce POC Deployment Packaging Simulation Suite');
console.log('POC Root:   ', POC_ROOT);
console.log('force-app:  ', FORCE_APP);
console.log('======================================================================\n');

// 1. Proposed .forceignore rules
const PROPOSED_FORCEIGNORE_RULES = [
    '**/lwc/daRefactoringEngine/**',
    '**/lwc/daRefactorHandoffModal/**'
];

/**
 * Converts a gitignore / .forceignore glob pattern into a regular expression.
 * Handles `**`, `*`, and directory delimiters safely.
 */
function globToRegex(pattern) {
    let p = pattern.trim();
    if (!p || p.startsWith('#')) return null;

    // Normalize forward slashes
    p = p.replace(/\\/g, '/');

    // Escape regex special chars except * and ?
    let escaped = p.replace(/[.+^${}()|[\]\\]/g, '\\$&');

    // Replace ** with a placeholder
    escaped = escaped.replace(/\*\*/g, '___GLOBSTAR___');

    // Replace single * with non-slash matcher
    escaped = escaped.replace(/\*/g, '[^/]*');

    // Replace placeholder with anything matcher
    escaped = escaped.replace(/___GLOBSTAR___/g, '.*');

    return new RegExp(`(^|/)${escaped}($|/)`);
}

const compiledRules = PROPOSED_FORCEIGNORE_RULES
    .map(r => ({ rule: r, regex: globToRegex(r) }))
    .filter(x => x.regex !== null);

function isExcluded(filePath) {
    const normalized = filePath.replace(/\\/g, '/');
    for (const { regex } of compiledRules) {
        if (regex.test(normalized)) {
            return true;
        }
    }
    return false;
}

function getAllFiles(dir) {
    let results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results = results.concat(getAllFiles(fullPath));
        } else {
            results.push(fullPath);
        }
    }
    return results;
}

// 2. Discover all files under force-app
const allFiles = getAllFiles(FORCE_APP);
const relativeFiles = allFiles.map(f => path.relative(POC_ROOT, f).replace(/\\/g, '/'));

console.log(`Discovered ${allFiles.length} metadata files under force-app/`);

// 3. Partition into included and excluded
const excludedFiles = [];
const includedFiles = [];

for (const rel of relativeFiles) {
    if (isExcluded(rel)) {
        excludedFiles.push(rel);
    } else {
        includedFiles.push(rel);
    }
}

console.log(`\nPackaging Simulation Results:`);
console.log(`  - Excluded files count: ${excludedFiles.length}`);
console.log(`  - Included files count: ${includedFiles.length}`);
console.log(`  - Total files audited:  ${relativeFiles.length}`);

// Test 1: Quarantined Components are fully excluded
console.log('\n[TEST 1] Verifying all quarantined Wave 9 files are excluded:');
const expectedQuarantinedFiles = [
    'force-app/main/default/lwc/daRefactorHandoffModal/daRefactorHandoffModal.css',
    'force-app/main/default/lwc/daRefactorHandoffModal/daRefactorHandoffModal.html',
    'force-app/main/default/lwc/daRefactorHandoffModal/daRefactorHandoffModal.js',
    'force-app/main/default/lwc/daRefactorHandoffModal/daRefactorHandoffModal.js-meta.xml',
    'force-app/main/default/lwc/daRefactoringEngine/daRefactoringEngine.js',
    'force-app/main/default/lwc/daRefactoringEngine/daRefactoringEngine.js-meta.xml'
];

for (const expected of expectedQuarantinedFiles) {
    assert(excludedFiles.includes(expected), `Quarantined file ${expected} MUST be excluded!`);
    console.log(`  ✓ Correctly excluded: ${expected}`);
}
assert.strictEqual(excludedFiles.length, expectedQuarantinedFiles.length, `Expected exactly ${expectedQuarantinedFiles.length} files excluded, got ${excludedFiles.length}`);

// Test 2: Approved LWC Components remain 100% included
console.log('\n[TEST 2] Verifying approved LWC components remain included:');
const approvedLwcBundles = [
    'daAnalysisHistory',
    'daAnnotationPanel',
    'daAppShell',
    'daArchitectureDnaBarcode',
    'daDiagnosticsView',
    'daFindingsView',
    'daGraphPayloadLoader',
    'daGraphViewer',
    'daHeader',
    'daHotspotsView',
    'daInvestigationDrawer',
    'daLayoutEngine',
    'daMatrixView',
    'daPresetManager',
    'daProjectDashboard',
    'daProjectSelector',
    'daRadarView',
    'daSidebar',
    'daSubwayView',
    'daTreemapView',
    'graphViewer'
];

for (const bundle of approvedLwcBundles) {
    const bundleFiles = includedFiles.filter(f => f.includes(`lwc/${bundle}/`));
    assert(bundleFiles.length > 0, `Approved LWC bundle ${bundle} has no included files!`);
    // Ensure no bundle file leaked into excluded
    const leaked = excludedFiles.filter(f => f.includes(`lwc/${bundle}/`));
    assert.strictEqual(leaked.length, 0, `Approved LWC bundle ${bundle} was accidentally excluded! Leaked: ${leaked.join(', ')}`);
    console.log(`  ✓ Confirmed included: ${bundle} (${bundleFiles.length} files)`);
}

// Test 3: Non-LWC metadata remains 100% included
console.log('\n[TEST 3] Verifying Apex classes, custom objects, and permissions remain included:');
const apexClasses = includedFiles.filter(f => f.includes('/classes/'));
assert(apexClasses.length > 0, 'Apex classes must be included');
console.log(`  ✓ Confirmed included: Apex classes (${apexClasses.length} files)`);

const customObjects = includedFiles.filter(f => f.includes('/objects/'));
assert(customObjects.length > 0, 'Custom objects must be included');
console.log(`  ✓ Confirmed included: Custom objects (${customObjects.length} files)`);

const permissionsets = includedFiles.filter(f => f.includes('/permissionsets/'));
assert(permissionsets.length > 0, 'Permission sets must be included');
console.log(`  ✓ Confirmed included: Permission sets (${permissionsets.length} files)`);

const staticresources = includedFiles.filter(f => f.includes('/staticresources/'));
assert(staticresources.length > 0, 'Static resources must be included');
console.log(`  ✓ Confirmed included: Static resources (${staticresources.length} files)`);

// Test 4: Verify root vs nested relative path matching
console.log('\n[TEST 4] Verifying pattern matching behavior across path variations:');
const variations = [
    { path: 'force-app/main/default/lwc/daRefactoringEngine/daRefactoringEngine.js', expectExcluded: true },
    { path: 'scratch/salesforce-poc/force-app/main/default/lwc/daRefactoringEngine/daRefactoringEngine.js', expectExcluded: true },
    { path: '/app/scratch/salesforce-poc/force-app/main/default/lwc/daRefactoringEngine/daRefactoringEngine.js', expectExcluded: true },
    { path: 'force-app/main/default/lwc/daRefactorHandoffModal/daRefactorHandoffModal.html', expectExcluded: true },
    { path: 'force-app/main/default/lwc/daAppShell/daAppShell.js', expectExcluded: false },
    { path: 'force-app/main/default/lwc/daGraphViewer/daGraphViewer.js', expectExcluded: false }
];

for (const v of variations) {
    const excluded = isExcluded(v.path);
    assert.strictEqual(excluded, v.expectExcluded, `Path variation ${v.path} expected excluded=${v.expectExcluded}, got ${excluded}`);
    console.log(`  ✓ Correctly verified: ${v.path} (excluded=${excluded})`);
}

console.log('\n======================================================================');
console.log('ALL PACKAGING VALIDATION TESTS PASSED CLEANLY (4/4 test suites)');
console.log('======================================================================');
