/**
 * Offline Verification Suite for TASK-P1-03: daHeader LWC Component Bundle
 */
const assert = require('assert');
const fs = require('fs');

console.log('Running TASK-P1-03 daHeader Offline Verification Suite...');
console.log('===================================================================');

// Test 1: Verify Files
console.log('\n[Suite 1: Static Bundle Presence]');
const requiredFiles = [
    'scratch/salesforce-poc/force-app/main/default/lwc/daHeader/daHeader.js',
    'scratch/salesforce-poc/force-app/main/default/lwc/daHeader/daHeader.html',
    'scratch/salesforce-poc/force-app/main/default/lwc/daHeader/daHeader.css',
    'scratch/salesforce-poc/force-app/main/default/lwc/daHeader/daHeader.js-meta.xml'
];

requiredFiles.forEach((f) => {
    assert.strictEqual(fs.existsSync(f), true, `Missing file: ${f}`);
    const stat = fs.statSync(f);
    assert.ok(stat.size > 0, `File ${f} is empty.`);
    console.log(`  ✓ ${f} verified (${stat.size} bytes)`);
});

// Test 2: Method & Property Signatures
console.log('\n[Suite 2: Component Contract & Methods]');
const jsCode = fs.readFileSync('scratch/salesforce-poc/force-app/main/default/lwc/daHeader/daHeader.js', 'utf8');

assert.ok(jsCode.includes('handleGlobalSearch(event)'), 'Must implement handleGlobalSearch(event)');
assert.ok(jsCode.includes('handleActionTrigger(event)'), 'Must implement handleActionTrigger(event)');
assert.ok(jsCode.includes('handleKeyboardShortcutClick()'), 'Must implement handleKeyboardShortcutClick()');
assert.ok(jsCode.includes('@api projectId'), 'Must accept public @api projectId');
assert.ok(jsCode.includes('@api projectKey'), 'Must accept public @api projectKey');
assert.ok(jsCode.includes('@api activeView'), 'Must accept public @api activeView');
assert.ok(jsCode.includes('@api selectedNodeId'), 'Must accept public @api selectedNodeId');

// Test 3: Event Dispatch Discipline (Bubbles & Composed)
console.log('\n[Suite 3: Event Dispatch Discipline]');
assert.ok(jsCode.includes("new CustomEvent('globalsearch'"), 'Must dispatch globalsearch custom event');
assert.ok(jsCode.includes("new CustomEvent('actiontrigger'"), 'Must dispatch actiontrigger custom event');
assert.ok(jsCode.includes("new CustomEvent('projectchange'"), 'Must dispatch projectchange custom event');
assert.ok(jsCode.includes('bubbles: true'), 'Events must declare bubbles: true');
assert.ok(jsCode.includes('composed: true'), 'Events must declare composed: true');
console.log('  ✓ CustomEvent contracts and bubbles/composed discipline verified.');

// Test 4: Template Markup Verifications
console.log('\n[Suite 4: Template Controls & Integration]');
const htmlCode = fs.readFileSync('scratch/salesforce-poc/force-app/main/default/lwc/daHeader/daHeader.html', 'utf8');
assert.ok(htmlCode.includes('<lightning-input'), 'Template must include search input');
assert.ok(htmlCode.includes('<c-da-project-selector'), 'Template must integrate c-da-project-selector');
assert.ok(htmlCode.includes('data-action="compare"'), 'Template must have compare action');
assert.ok(htmlCode.includes('data-action="history"'), 'Template must have history action');
assert.ok(htmlCode.includes('handleKeyboardShortcutClick'), 'Template must bind keyboard shortcut click');
console.log('  ✓ Template markup and SLDS header controls verified.');

console.log('\n===================================================================');
console.log('TASK-P1-03 daHeader Offline Verification: ALL 4 SUITES PASSED');
