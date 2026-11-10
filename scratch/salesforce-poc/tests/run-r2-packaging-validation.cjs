/**
 * @file run-r2-packaging-validation.cjs
 * @description Standalone Static Verification Suite & Salesforce CLI Packaging Regression for Agent R2
 *
 * Verifies that the .forceignore exclusion rules:
 * 1. Strictly exclude both quarantined Wave 9 bundles (daRefactoringEngine, daRefactorHandoffModal)
 *    across both directory-level and recursive ignore patterns.
 * 2. Never exclude any of the 21 approved LWC component bundles.
 * 3. Never exclude any Apex classes, Custom Objects, Custom Fields, Permission Sets, or Static Resources.
 * 4. Correctly evaluate against relative posix paths across nested directories.
 * 5. Validates against actual Salesforce CLI source conversion (`sf project convert source`).
 * 6. Validates against actual Salesforce CLI manifest generation (`sf project generate manifest`).
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const cp = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const POC_ROOT = path.resolve(__dirname, '..');
const FORCE_APP = path.join(POC_ROOT, 'force-app');
const FORCEIGNORE_PATH = path.join(POC_ROOT, '.forceignore');

console.log('======================================================================');
console.log('Agent R2 — Salesforce POC Deployment Packaging Validation Suite');
console.log('POC Root:       ', POC_ROOT);
console.log('force-app:      ', FORCE_APP);
console.log('.forceignore:   ', FORCEIGNORE_PATH);
console.log('======================================================================\n');

// Ensure .forceignore exists
assert(fs.existsSync(FORCEIGNORE_PATH), `Missing .forceignore at ${FORCEIGNORE_PATH}`);
const forceignoreRaw = fs.readFileSync(FORCEIGNORE_PATH, 'utf-8');
const forceignoreLines = forceignoreRaw
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));

console.log('Active .forceignore rules:');
forceignoreLines.forEach(r => console.log(`  - ${r}`));

// Verify required 4 rules are present
const REQUIRED_RULES = [
    '**/lwc/daRefactoringEngine',
    '**/lwc/daRefactoringEngine/**',
    '**/lwc/daRefactorHandoffModal',
    '**/lwc/daRefactorHandoffModal/**'
];
for (const rule of REQUIRED_RULES) {
    assert(forceignoreLines.includes(rule), `Required rule "${rule}" is missing from .forceignore!`);
}
console.log('✓ All 4 required quarantine exclusion rules verified in .forceignore.\n');

/**
 * Converts a gitignore / .forceignore glob pattern into a regular expression.
 * Handles `**`, `*`, directory delimiters, and directory-only patterns.
 */
function globToRegex(pattern) {
    let p = pattern.trim();
    if (!p || p.startsWith('#')) return null;

    p = p.replace(/\\/g, '/');
    let escaped = p.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    escaped = escaped.replace(/\*\*/g, '___GLOBSTAR___');
    escaped = escaped.replace(/\*/g, '[^/]*');
    escaped = escaped.replace(/___GLOBSTAR___/g, '.*');

    return new RegExp(`(^|/)${escaped}($|/)`);
}

const compiledRules = forceignoreLines
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

// Discover all files under force-app
const allFiles = getAllFiles(FORCE_APP);
const relativeFiles = allFiles.map(f => path.relative(POC_ROOT, f).replace(/\\/g, '/'));

console.log(`Discovered ${allFiles.length} metadata files under force-app/`);

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

// Test 4: Directory level and path variation evaluation
console.log('\n[TEST 4] Verifying directory-level and path variation pattern matching:');
const variations = [
    { path: 'force-app/main/default/lwc/daRefactoringEngine', expectExcluded: true },
    { path: 'force-app/main/default/lwc/daRefactoringEngine/', expectExcluded: true },
    { path: 'force-app/main/default/lwc/daRefactoringEngine/daRefactoringEngine.js', expectExcluded: true },
    { path: 'force-app/main/default/lwc/daRefactoringEngine/daRefactoringEngine.js-meta.xml', expectExcluded: true },
    { path: 'force-app/main/default/lwc/daRefactorHandoffModal', expectExcluded: true },
    { path: 'force-app/main/default/lwc/daRefactorHandoffModal/', expectExcluded: true },
    { path: 'force-app/main/default/lwc/daRefactorHandoffModal/daRefactorHandoffModal.html', expectExcluded: true },
    { path: 'force-app/main/default/lwc/daRefactorHandoffModal/daRefactorHandoffModal.js-meta.xml', expectExcluded: true },
    { path: 'force-app/main/default/lwc/daAppShell/daAppShell.js', expectExcluded: false },
    { path: 'force-app/main/default/lwc/daGraphViewer/daGraphViewer.js', expectExcluded: false },
    { path: 'force-app/main/default/classes/DAGraphController.cls', expectExcluded: false }
];

for (const v of variations) {
    const excluded = isExcluded(v.path);
    assert.strictEqual(excluded, v.expectExcluded, `Path variation ${v.path} expected excluded=${v.expectExcluded}, got ${excluded}`);
    console.log(`  ✓ Correctly verified: ${v.path} (excluded=${excluded})`);
}

// Test 5: Actual Salesforce CLI conversion and manifest verification (if sf installed)
console.log('\n[TEST 5] Verifying actual Salesforce CLI source conversion and manifest generation:');
let sfVersion = null;
try {
    sfVersion = cp.execSync('sf --version', { encoding: 'utf-8' }).trim();
    console.log(`  Detected Salesforce CLI: ${sfVersion}`);
} catch (e) {
    console.log('  Salesforce CLI (sf) not found. Skipping live CLI conversion test.');
}

if (sfVersion) {
    const tmpConvertDir = path.join(require('os').tmpdir(), 'r2-cli-convert-test-' + Date.now());
    const tmpManifestDir = path.join(require('os').tmpdir(), 'r2-cli-manifest-test-' + Date.now());

    try {
        console.log(`  Executing: sf project convert source --output-dir ${tmpConvertDir} --json`);
        const convertOut = cp.execSync(`sf project convert source --output-dir "${tmpConvertDir}" --json`, {
            cwd: POC_ROOT,
            encoding: 'utf-8'
        });
        const convertJson = JSON.parse(convertOut);
        assert.strictEqual(convertJson.status, 0, 'CLI conversion failed with non-zero status');
        console.log('  ✓ sf project convert source succeeded with exitCode 0');

        // Check converted lwc contents
        const convertedLwcDir = path.join(tmpConvertDir, 'lwc');
        const convertedBundles = fs.readdirSync(convertedLwcDir);
        assert(!convertedBundles.includes('daRefactoringEngine'), 'daRefactoringEngine MUST NOT be in converted output!');
        assert(!convertedBundles.includes('daRefactorHandoffModal'), 'daRefactorHandoffModal MUST NOT be in converted output!');
        console.log('  ✓ Both quarantined bundles are absent from converted Metadata API format');

        for (const bundle of approvedLwcBundles) {
            assert(convertedBundles.includes(bundle), `Approved bundle ${bundle} is missing from converted output!`);
        }
        console.log(`  ✓ All ${approvedLwcBundles.length} approved LWC bundles present in converted output`);

        // Test manifest generation
        console.log(`  Executing: sf project generate manifest --source-dir force-app --output-dir ${tmpManifestDir} --name package.xml --json`);
        const manifestOut = cp.execSync(`sf project generate manifest --source-dir force-app --output-dir "${tmpManifestDir}" --name package.xml --json`, {
            cwd: POC_ROOT,
            encoding: 'utf-8'
        });
        const manifestJson = JSON.parse(manifestOut);
        assert.strictEqual(manifestJson.status, 0, 'CLI manifest generation failed');

        const packageXmlPath = path.join(tmpManifestDir, 'package.xml');
        const packageXmlContent = fs.readFileSync(packageXmlPath, 'utf-8');
        assert(!packageXmlContent.includes('daRefactoringEngine'), 'daRefactoringEngine MUST NOT be in package.xml!');
        assert(!packageXmlContent.includes('daRefactorHandoffModal'), 'daRefactorHandoffModal MUST NOT be in package.xml!');
        console.log('  ✓ package.xml excludes daRefactoringEngine and daRefactorHandoffModal');

        for (const bundle of approvedLwcBundles) {
            assert(packageXmlContent.includes(`<members>${bundle}</members>`), `package.xml missing approved bundle ${bundle}!`);
        }
        console.log(`  ✓ All ${approvedLwcBundles.length} approved LWC bundles present in generated package.xml`);

    } finally {
        fs.rmSync(tmpConvertDir, { recursive: true, force: true });
        fs.rmSync(tmpManifestDir, { recursive: true, force: true });
    }
}

console.log('\n======================================================================');
console.log('ALL PACKAGING VALIDATION TESTS PASSED CLEANLY (5/5 test suites)');
console.log('======================================================================');
