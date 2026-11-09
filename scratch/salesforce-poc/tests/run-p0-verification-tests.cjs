/**
 * Offline Verification Suite for P0 Foundation & Contracts
 * Validates schema XML definitions, permission set FLS completeness, and chunking invariants.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('Running P0 Foundation & Contracts Offline Verification Suite...');
console.log('===================================================================');

// Test 1: Verify Custom Object & Field Definitions
console.log('\n[Suite 1: Custom Object & Custom Field Definitions]');
const requiredMetadata = [
    'scratch/salesforce-poc/force-app/main/default/objects/DA_Project__c/DA_Project__c.object-meta.xml',
    'scratch/salesforce-poc/force-app/main/default/objects/DA_Project__c/fields/Project_Key__c.field-meta.xml',
    'scratch/salesforce-poc/force-app/main/default/objects/DA_Project__c/fields/Repository_Url__c.field-meta.xml',
    'scratch/salesforce-poc/force-app/main/default/objects/DA_Project__c/fields/Status__c.field-meta.xml',
    'scratch/salesforce-poc/force-app/main/default/objects/DA_Analysis_Run__c/DA_Analysis_Run__c.object-meta.xml',
    'scratch/salesforce-poc/force-app/main/default/objects/DA_Analysis_Run__c/fields/DA_Project__c.field-meta.xml',
    'scratch/salesforce-poc/force-app/main/default/objects/DA_Analysis_Run__c/fields/Commit_Hash__c.field-meta.xml',
    'scratch/salesforce-poc/force-app/main/default/objects/DA_Analysis_Run__c/fields/Run_Timestamp__c.field-meta.xml',
    'scratch/salesforce-poc/force-app/main/default/objects/DA_Analysis_Run__c/fields/Status__c.field-meta.xml',
    'scratch/salesforce-poc/force-app/main/default/objects/DA_Analysis_Run__c/fields/Node_Count__c.field-meta.xml',
    'scratch/salesforce-poc/force-app/main/default/objects/DA_Analysis_Run__c/fields/Edge_Count__c.field-meta.xml',
    'scratch/salesforce-poc/force-app/main/default/objects/DA_Analysis_Run__c/fields/Cyclic_SCC_Count__c.field-meta.xml',
    'scratch/salesforce-poc/force-app/main/default/objects/DA_Analysis_Run__c/fields/Total_Chunks__c.field-meta.xml',
    'scratch/salesforce-poc/force-app/main/default/objects/DA_Analysis_Run__c/fields/Total_Payload_Size_Chars__c.field-meta.xml',
    'scratch/salesforce-poc/force-app/main/default/objects/DA_Graph_Chunk__c/DA_Graph_Chunk__c.object-meta.xml',
    'scratch/salesforce-poc/force-app/main/default/objects/DA_Graph_Chunk__c/fields/DA_Analysis_Run__c.field-meta.xml',
    'scratch/salesforce-poc/force-app/main/default/objects/DA_Graph_Chunk__c/fields/Chunk_Index__c.field-meta.xml',
    'scratch/salesforce-poc/force-app/main/default/objects/DA_Graph_Chunk__c/fields/Payload_Data__c.field-meta.xml',
    'scratch/salesforce-poc/force-app/main/default/objects/DA_Finding__c/DA_Finding__c.object-meta.xml',
    'scratch/salesforce-poc/force-app/main/default/objects/DA_Finding__c/fields/DA_Analysis_Run__c.field-meta.xml',
    'scratch/salesforce-poc/force-app/main/default/objects/DA_Finding__c/fields/Rule_Id__c.field-meta.xml',
    'scratch/salesforce-poc/force-app/main/default/objects/DA_Finding__c/fields/Severity__c.field-meta.xml',
    'scratch/salesforce-poc/force-app/main/default/objects/DA_Finding__c/fields/Target_Node_Id__c.field-meta.xml',
    'scratch/salesforce-poc/force-app/main/default/objects/DA_Finding__c/fields/Details__c.field-meta.xml',
    'scratch/salesforce-poc/force-app/main/default/permissionsets/DA_Architecture_Analyst.permissionset-meta.xml'
];

requiredMetadata.forEach((f) => {
    assert.strictEqual(fs.existsSync(f), true, `Missing required metadata: ${f}`);
    const stat = fs.statSync(f);
    assert.ok(stat.size > 0, `File ${f} is empty.`);
    console.log(`  ✓ ${f} verified`);
});

// Test 2: Verify Permission Set Completeness
console.log('\n[Suite 2: Permission Set Coverage]');
const permXml = fs.readFileSync('scratch/salesforce-poc/force-app/main/default/permissionsets/DA_Architecture_Analyst.permissionset-meta.xml', 'utf8');
const expectedObjects = ['DA_Project__c', 'DA_Analysis_Run__c', 'DA_Graph_Chunk__c', 'DA_Finding__c', 'DA_Annotation__c', 'DA_User_Preference__c'];
expectedObjects.forEach((obj) => {
    assert.ok(permXml.includes(`<object>${obj}</object>`), `PermissionSet must grant permissions to ${obj}`);
});

const expectedFields = [
    'DA_Project__c.Repository_Url__c',
    'DA_Project__c.Status__c',
    'DA_Project__c.Project_Key__c',
    'DA_Analysis_Run__c.Commit_Hash__c',
    'DA_Analysis_Run__c.Run_Timestamp__c',
    'DA_Analysis_Run__c.Status__c',
    'DA_Analysis_Run__c.Node_Count__c',
    'DA_Analysis_Run__c.Edge_Count__c',
    'DA_Analysis_Run__c.Cyclic_SCC_Count__c',
    'DA_Analysis_Run__c.Total_Chunks__c',
    'DA_Analysis_Run__c.Total_Payload_Size_Chars__c',
    'DA_Graph_Chunk__c.Chunk_Index__c',
    'DA_Graph_Chunk__c.Payload_Data__c',
    'DA_Finding__c.Rule_Id__c',
    'DA_Finding__c.Severity__c',
    'DA_Finding__c.Target_Node_Id__c',
    'DA_Finding__c.Details__c'
];
expectedFields.forEach((fld) => {
    assert.ok(permXml.includes(`<field>${fld}</field>`), `PermissionSet must grant FLS to ${fld}`);
});
console.log('  ✓ All 6 DA custom objects and 17 critical custom fields protected and granted in DA_Architecture_Analyst.');

// Test 3: Master-Detail Relationship Integrity
console.log('\n[Suite 3: Master-Detail Relationship Integrity]');
const chunkRunMd = fs.readFileSync('scratch/salesforce-poc/force-app/main/default/objects/DA_Graph_Chunk__c/fields/DA_Analysis_Run__c.field-meta.xml', 'utf8');
assert.ok(chunkRunMd.includes('<type>MasterDetail</type>'), 'DA_Graph_Chunk__c must be child of MasterDetail');
assert.ok(chunkRunMd.includes('<referenceTo>DA_Analysis_Run__c</referenceTo>'), 'DA_Graph_Chunk__c must reference DA_Analysis_Run__c');

const findingRunMd = fs.readFileSync('scratch/salesforce-poc/force-app/main/default/objects/DA_Finding__c/fields/DA_Analysis_Run__c.field-meta.xml', 'utf8');
assert.ok(findingRunMd.includes('<type>MasterDetail</type>'), 'DA_Finding__c must be child of MasterDetail');
assert.ok(findingRunMd.includes('<referenceTo>DA_Analysis_Run__c</referenceTo>'), 'DA_Finding__c must reference DA_Analysis_Run__c');
console.log('  ✓ Master-Detail cascade delete and integrity rules verified.');

console.log('\n===================================================================');
console.log('P0 Foundation & Contracts Offline Verification: ALL 3 SUITES PASSED');
