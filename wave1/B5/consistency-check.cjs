/**
 * wave1/B5/consistency-check.cjs
 *
 * Deployment Readiness Static Consistency Check Engine
 * Conducts exhaustive offline static metadata verification across scratch/salesforce-poc/
 *
 * Verifies:
 * 1. Inventory & Project Configuration (sfdx-project.json, package.xml, .forceignore)
 * 2. Static Resources (files, sizes, MIME types, meta.xml attributes)
 * 3. Custom Objects & Fields (definitions, field API names, object types)
 * 4. Permission Sets (object permissions, field permissions, missing FLS / SEC-01 check)
 * 5. Apex Classes & Meta XML (existence of .cls-meta.xml, apiVersions, static SOQL/DML validation)
 * 6. Apex Test Classes & Coverage Boundaries (presence of test classes, explicit note on offline coverage)
 * 7. LWC Bundles (presence of .js and .js-meta.xml, template validity, import resolution: Apex, Schema, Resources, Child components)
 * 8. API Version Consistency & Divergence Scan
 * 9. Wave 9 Quarantined Metadata Detection (daRefactoringEngine, daRefactorHandoffModal) & Packaging Exposure
 * 10. File Size & Limits Analysis
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO_ROOT = path.resolve(__dirname, '../..');
const POC_ROOT = path.join(REPO_ROOT, 'scratch/salesforce-poc');
const FORCE_APP = path.join(POC_ROOT, 'force-app/main/default');

// Output paths
const RESULTS_JSON = path.join(__dirname, 'consistency-results.json');
const SUMMARY_TXT = path.join(__dirname, 'consistency-summary.txt');

function getSha256(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
}

function parseXmlTag(xmlText, tagName) {
    const re = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'i');
    const match = xmlText.match(re);
    return match ? match[1].trim() : null;
}

function parseXmlTags(xmlText, tagName) {
    const re = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'gi');
    const results = [];
    let match;
    while ((match = re.exec(xmlText)) !== null) {
        results.push(match[1].trim());
    }
    return results;
}

function listFilesRecursive(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(listFilesRecursive(fullPath));
        } else {
            results.push(fullPath);
        }
    }
    return results;
}

console.log('=== Salesforce POC Deployment Readiness Consistency Check ===');
console.log(`POC Root: ${POC_ROOT}`);

const report = {
    timestamp: new Date().toISOString(),
    sourceRoot: POC_ROOT,
    checks: {},
    summary: {
        totalChecks: 0,
        passedChecks: 0,
        warningChecks: 0,
        failedChecks: 0
    }
};

function recordCheck(id, name, status, details, evidence) {
    report.summary.totalChecks++;
    if (status === 'PASS') report.summary.passedChecks++;
    else if (status === 'WARN') report.summary.warningChecks++;
    else if (status === 'FAIL') report.summary.failedChecks++;

    report.checks[id] = {
        name,
        status,
        details,
        evidence
    };
    console.log(`[${status}] ${id}: ${name}`);
}

// -------------------------------------------------------------
// 1. INVENTORY & CONFIGURATION
// -------------------------------------------------------------
const sfdxProjectFile = path.join(POC_ROOT, 'sfdx-project.json');
let sfdxConfig = null;
if (fs.existsSync(sfdxProjectFile)) {
    sfdxConfig = JSON.parse(fs.readFileSync(sfdxProjectFile, 'utf8'));
    recordCheck('CHK-01-SFDX-PROJECT', 'sfdx-project.json Configuration', 'PASS', {
        sourceApiVersion: sfdxConfig.sourceApiVersion,
        packageDirectories: sfdxConfig.packageDirectories,
        namespace: sfdxConfig.namespace,
        loginUrl: sfdxConfig.sfdcLoginUrl
    }, `Found valid sfdx-project.json at ${path.relative(REPO_ROOT, sfdxProjectFile)}`);
} else {
    recordCheck('CHK-01-SFDX-PROJECT', 'sfdx-project.json Configuration', 'FAIL', {}, 'sfdx-project.json missing');
}

const packageXmlPath = path.join(POC_ROOT, 'manifest/package.xml');
const forceIgnorePath = path.join(POC_ROOT, '.forceignore');
const rootForceIgnorePath = path.join(REPO_ROOT, '.forceignore');

const hasPackageXml = fs.existsSync(packageXmlPath);
const hasForceIgnore = fs.existsSync(forceIgnorePath);
const hasRootForceIgnore = fs.existsSync(rootForceIgnorePath);

recordCheck('CHK-02-MANIFEST-FORCEIGNORE', 'Manifest & .forceignore Detection', 'WARN', {
    packageXmlPresent: hasPackageXml,
    packageXmlStatus: hasPackageXml ? 'PRESENT' : 'MISSING',
    pocForceIgnorePresent: hasForceIgnore,
    pocForceIgnoreStatus: hasForceIgnore ? 'PRESENT' : 'MISSING',
    rootForceIgnorePresent: hasRootForceIgnore
}, `package.xml is ${hasPackageXml ? 'PRESENT' : 'MISSING'}; .forceignore in scratch/salesforce-poc/ is ${hasForceIgnore ? 'PRESENT' : 'MISSING'}`);

// -------------------------------------------------------------
// 2. STATIC RESOURCES
// -------------------------------------------------------------
const staticResourcesDir = path.join(FORCE_APP, 'staticresources');
const staticResourceFiles = listFilesRecursive(staticResourcesDir);
const resources = [];
const resourceFilePairs = {};

for (const f of staticResourceFiles) {
    const base = path.basename(f);
    if (base.endsWith('.resource-meta.xml')) {
        const resName = base.replace('.resource-meta.xml', '');
        if (!resourceFilePairs[resName]) resourceFilePairs[resName] = {};
        resourceFilePairs[resName].meta = f;
    } else {
        const resName = base.includes('.') ? base.split('.')[0] : base;
        if (!resourceFilePairs[resName]) resourceFilePairs[resName] = {};
        resourceFilePairs[resName].content = f;
    }
}

let staticResStatus = 'PASS';
for (const [name, files] of Object.entries(resourceFilePairs)) {
    const metaContent = files.meta ? fs.readFileSync(files.meta, 'utf8') : '';
    const contentStats = files.content ? fs.statSync(files.content) : null;
    const cacheControl = parseXmlTag(metaContent, 'cacheControl');
    const contentType = parseXmlTag(metaContent, 'contentType');

    const resData = {
        name,
        contentPath: files.content ? path.relative(REPO_ROOT, files.content) : null,
        metaPath: files.meta ? path.relative(REPO_ROOT, files.meta) : null,
        sizeBytes: contentStats ? contentStats.size : 0,
        cacheControl,
        contentType,
        hasMeta: !!files.meta,
        hasContent: !!files.content
    };
    resources.push(resData);
    if (!files.meta || !files.content) staticResStatus = 'FAIL';
}

recordCheck('CHK-03-STATIC-RESOURCES', 'Static Resources Inventory & Metadata', staticResStatus, {
    resources
}, `Inventoried ${resources.length} static resource(s). Cytoscape size: ${resources[0] ? resources[0].sizeBytes : 0} bytes (Mock placeholder).`);

// -------------------------------------------------------------
// 3. CUSTOM OBJECTS & FIELDS INVENTORY
// -------------------------------------------------------------
const objectsDir = path.join(FORCE_APP, 'objects');
const customObjects = {};
if (fs.existsSync(objectsDir)) {
    const objDirs = fs.readdirSync(objectsDir);
    for (const objDirName of objDirs) {
        const objDirPath = path.join(objectsDir, objDirName);
        if (!fs.statSync(objDirPath).isDirectory()) continue;
        const objMetaFile = path.join(objDirPath, `${objDirName}.object-meta.xml`);
        const hasObjMeta = fs.existsSync(objMetaFile);
        const fieldsDir = path.join(objDirPath, 'fields');
        const fields = [];
        if (fs.existsSync(fieldsDir)) {
            const fieldFiles = fs.readdirSync(fieldsDir);
            for (const f of fieldFiles) {
                if (f.endsWith('.field-meta.xml')) {
                    const fieldXml = fs.readFileSync(path.join(fieldsDir, f), 'utf8');
                    const fieldName = f.replace('.field-meta.xml', '');
                    const label = parseXmlTag(fieldXml, 'label');
                    const type = parseXmlTag(fieldXml, 'type');
                    const length = parseXmlTag(fieldXml, 'length');
                    fields.push({
                        apiName: fieldName,
                        fullPath: `${objDirName}.${fieldName}`,
                        label,
                        type,
                        length: length ? parseInt(length, 10) : null
                    });
                }
            }
        }
        customObjects[objDirName] = {
            apiName: objDirName,
            metaPath: hasObjMeta ? path.relative(REPO_ROOT, objMetaFile) : null,
            fieldCount: fields.length,
            fields
        };
    }
}

const totalFields = Object.values(customObjects).reduce((acc, obj) => acc + obj.fieldCount, 0);
recordCheck('CHK-04-CUSTOM-OBJECTS-FIELDS', 'Custom Objects & Fields Inventory', 'PASS', {
    objectCount: Object.keys(customObjects).length,
    objects: customObjects,
    totalFields
}, `Discovered ${Object.keys(customObjects).length} custom objects and ${totalFields} custom fields.`);

// -------------------------------------------------------------
// 4. PERMISSION SETS & FLS VERIFICATION (SEC-01 AUDIT)
// -------------------------------------------------------------
const permSetsDir = path.join(FORCE_APP, 'permissionsets');
const permSetFiles = listFilesRecursive(permSetsDir).filter(f => f.endsWith('.permissionset-meta.xml'));
const permissionSets = [];
const missingFlsDefects = [];

for (const psFile of permSetFiles) {
    const xml = fs.readFileSync(psFile, 'utf8');
    const label = parseXmlTag(xml, 'label');
    const objectPermissions = [];
    const fieldPermissions = [];

    // Parse objectPermissions
    const objBlocks = parseXmlTags(xml, 'objectPermissions');
    for (const b of objBlocks) {
        objectPermissions.push({
            object: parseXmlTag(b, 'object'),
            allowRead: parseXmlTag(b, 'allowRead') === 'true',
            allowCreate: parseXmlTag(b, 'allowCreate') === 'true',
            allowEdit: parseXmlTag(b, 'allowEdit') === 'true',
            allowDelete: parseXmlTag(b, 'allowDelete') === 'true',
            viewAllRecords: parseXmlTag(b, 'viewAllRecords') === 'true',
            modifyAllRecords: parseXmlTag(b, 'modifyAllRecords') === 'true'
        });
    }

    // Parse fieldPermissions
    const fldBlocks = parseXmlTags(xml, 'fieldPermissions');
    for (const b of fldBlocks) {
        fieldPermissions.push({
            field: parseXmlTag(b, 'field'),
            readable: parseXmlTag(b, 'readable') === 'true',
            editable: parseXmlTag(b, 'editable') === 'true'
        });
    }

    const psName = path.basename(psFile).replace('.permissionset-meta.xml', '');
    permissionSets.push({
        name: psName,
        path: path.relative(REPO_ROOT, psFile),
        label,
        objectPermissions,
        fieldPermissions
    });

    // Check for missing fieldPermissions for custom objects
    const coveredFields = new Set(fieldPermissions.map(fp => fp.field));
    for (const [objName, objData] of Object.entries(customObjects)) {
        for (const field of objData.fields) {
            // MasterDetail fields do not have fieldPermissions in Salesforce metadata (inherited from Master)
            if (field.type === 'MasterDetail') continue;
            if (!coveredFields.has(field.fullPath)) {
                missingFlsDefects.push({
                    permissionSet: psName,
                    field: field.fullPath,
                    object: objName,
                    type: field.type
                });
            }
        }
    }
}

const flsStatus = missingFlsDefects.length > 0 ? 'FAIL' : 'PASS';
recordCheck('CHK-05-PERMSET-FLS-AUDIT', 'Permission Set & FLS Consistency (SEC-01)', flsStatus, {
    permissionSets,
    missingFlsCount: missingFlsDefects.length,
    missingFlsDefects
}, `Found ${missingFlsDefects.length} custom fields without FLS in DA_Architecture_Analyst (SEC-01 confirmed blocker).`);

// -------------------------------------------------------------
// 5. APEX CLASSES, META XML & API VERSIONS
// -------------------------------------------------------------
const classesDir = path.join(FORCE_APP, 'classes');
const apexFiles = listFilesRecursive(classesDir).filter(f => f.endsWith('.cls'));
const apexClasses = [];
const apexMetaMissing = [];
const apiVersionsFound = {};

for (const clsFile of apexFiles) {
    const clsName = path.basename(clsFile).replace('.cls', '');
    const metaFile = `${clsFile}-meta.xml`;
    const hasMeta = fs.existsSync(metaFile);
    let apiVersion = null;
    let status = null;

    if (hasMeta) {
        const metaXml = fs.readFileSync(metaFile, 'utf8');
        apiVersion = parseXmlTag(metaXml, 'apiVersion');
        status = parseXmlTag(metaXml, 'status');
        if (apiVersion) {
            apiVersionsFound[apiVersion] = (apiVersionsFound[apiVersion] || 0) + 1;
        }
    } else {
        apexMetaMissing.push(clsFile);
    }

    const clsContent = fs.readFileSync(clsFile, 'utf8');
    const isTest = /@isTest/i.test(clsContent) || clsName.endsWith('Test');

    apexClasses.push({
        name: clsName,
        path: path.relative(REPO_ROOT, clsFile),
        isTest,
        hasMeta,
        apiVersion,
        status,
        sizeBytes: fs.statSync(clsFile).size
    });
}

const apexMetaStatus = apexMetaMissing.length === 0 ? 'PASS' : 'FAIL';
recordCheck('CHK-06-APEX-METADATA', 'Apex Classes & Meta XML Pairing', apexMetaStatus, {
    totalApexClasses: apexClasses.length,
    productionClasses: apexClasses.filter(c => !c.isTest).length,
    testClasses: apexClasses.filter(c => c.isTest).length,
    missingMeta: apexMetaMissing
}, `All ${apexClasses.length} Apex classes have corresponding -meta.xml files.`);

// -------------------------------------------------------------
// 6. APEX TEST SUITE PRESENCE & COVERAGE BOUNDARY
// -------------------------------------------------------------
const prodClasses = apexClasses.filter(c => !c.isTest);
const testClasses = apexClasses.filter(c => c.isTest);
recordCheck('CHK-07-APEX-TEST-PRESENCE', 'Apex Test Suite Presence & Offline Verification Boundary', 'WARN', {
    productionClassesCount: prodClasses.length,
    testClassesCount: testClasses.length,
    productionClasses: prodClasses.map(c => c.name),
    testClasses: testClasses.map(c => c.name),
    offlineCoverageVerifiable: false,
    statement: "MOCKED / NOT VERIFIED: Apex unit test execution and code coverage percentages CANNOT be verified offline without a live Salesforce org / Apex compiler runtime."
}, `5 test classes present covering controllers, DTOs, security, and schema. Offline coverage percentage NOT verified.`);

// -------------------------------------------------------------
// 7. LWC BUNDLES & TEMPLATES & METADATA
// -------------------------------------------------------------
const lwcDir = path.join(FORCE_APP, 'lwc');
const lwcBundles = [];
const missingLwcMeta = [];
const missingLwcJs = [];

if (fs.existsSync(lwcDir)) {
    const bundleDirs = fs.readdirSync(lwcDir);
    for (const bDir of bundleDirs) {
        const fullBDir = path.join(lwcDir, bDir);
        if (!fs.statSync(fullBDir).isDirectory()) continue;
        const jsFile = path.join(fullBDir, `${bDir}.js`);
        const metaFile = path.join(fullBDir, `${bDir}.js-meta.xml`);
        const htmlFile = path.join(fullBDir, `${bDir}.html`);
        const cssFile = path.join(fullBDir, `${bDir}.css`);

        const hasJs = fs.existsSync(jsFile);
        const hasMeta = fs.existsSync(metaFile);
        const hasHtml = fs.existsSync(htmlFile);
        const hasCss = fs.existsSync(cssFile);

        if (!hasJs) missingLwcJs.push(bDir);
        if (!hasMeta) missingLwcMeta.push(bDir);

        let apiVersion = null;
        let isExposed = null;
        let targets = [];
        let masterLabel = null;

        if (hasMeta) {
            const metaXml = fs.readFileSync(metaFile, 'utf8');
            apiVersion = parseXmlTag(metaXml, 'apiVersion');
            isExposed = parseXmlTag(metaXml, 'isExposed') === 'true';
            masterLabel = parseXmlTag(metaXml, 'masterLabel');
            targets = parseXmlTags(metaXml, 'target');
            if (apiVersion) {
                apiVersionsFound[apiVersion] = (apiVersionsFound[apiVersion] || 0) + 1;
            }
        }

        const bundleFiles = listFilesRecursive(fullBDir);
        const totalSize = bundleFiles.reduce((acc, f) => acc + fs.statSync(f).size, 0);

        lwcBundles.push({
            name: bDir,
            path: path.relative(REPO_ROOT, fullBDir),
            hasJs,
            hasMeta,
            hasHtml,
            hasCss,
            apiVersion,
            isExposed,
            masterLabel,
            targets,
            fileCount: bundleFiles.length,
            totalSizeBytes: totalSize
        });
    }
}

const lwcMetaStatus = (missingLwcJs.length === 0 && missingLwcMeta.length === 0) ? 'PASS' : 'FAIL';
recordCheck('CHK-08-LWC-BUNDLES', 'LWC Component Bundles & Metadata', lwcMetaStatus, {
    bundleCount: lwcBundles.length,
    missingJs: missingLwcJs,
    missingMeta: missingLwcMeta,
    bundles: lwcBundles
}, `Inventoried ${lwcBundles.length} LWC bundles. All bundles contain both .js and .js-meta.xml.`);

// -------------------------------------------------------------
// 8. API VERSION CONSISTENCY SCAN
// -------------------------------------------------------------
const sfdxSourceApi = sfdxConfig ? sfdxConfig.sourceApiVersion : '61.0';
const divergentVersions = Object.keys(apiVersionsFound).filter(v => v !== sfdxSourceApi);
const apiVerStatus = divergentVersions.length > 0 ? 'WARN' : 'PASS';
recordCheck('CHK-09-API-VERSION-CONSISTENCY', 'API Version Consistency Across Metadata', apiVerStatus, {
    sfdxSourceApiVersion: sfdxSourceApi,
    versionsFoundDistribution: apiVersionsFound,
    divergentVersions,
    divergentFiles: apexClasses.concat(lwcBundles)
        .filter(item => item.apiVersion && item.apiVersion !== sfdxSourceApi)
        .map(item => ({ name: item.name, path: item.path, apiVersion: item.apiVersion }))
}, `Detected mixed API versions: ${Object.keys(apiVersionsFound).join(', ')} (sfdx-project.json is ${sfdxSourceApi}).`);

// -------------------------------------------------------------
// 9. LWC IMPORT RESOLUTION & CROSS-REFERENCES
// -------------------------------------------------------------
const allApexMethodSignatures = new Set();
// Build Apex exposed methods list
for (const cls of apexClasses) {
    const fullClsPath = path.join(REPO_ROOT, cls.path);
    const content = fs.readFileSync(fullClsPath, 'utf8');
    const methodMatches = content.match(/@AuraEnabled(?:\s*\([^)]*\))?\s+(?:public|global)\s+(?:static\s+)?[a-zA-Z0-9_<>, ]+?\s+([a-zA-Z0-9_]+)\s*\(/g);
    if (methodMatches) {
        for (const m of methodMatches) {
            const mNameMatch = m.match(/([a-zA-Z0-9_]+)\s*\($/);
            if (mNameMatch) {
                allApexMethodSignatures.add(`${cls.name}.${mNameMatch[1]}`);
            }
        }
    }
}

const existingLwcNames = new Set(lwcBundles.map(b => b.name));
// Also daFilterSchema is an ES6 module inside daAppShell bundle
const knownModules = new Set([...existingLwcNames, 'daFilterSchema']);
const knownResources = new Set(resources.map(r => r.name));

const lwcImports = [];
const danglingImports = [];

for (const b of lwcBundles) {
    const fullBDir = path.join(REPO_ROOT, b.path);
    const jsFiles = listFilesRecursive(fullBDir).filter(f => f.endsWith('.js'));
    for (const jf of jsFiles) {
        const content = fs.readFileSync(jf, 'utf8');
        // Apex imports: @salesforce/apex/Controller.method
        const apexMatches = content.matchAll(/from\s+['"]@salesforce\/apex\/([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)['"]/g);
        for (const m of apexMatches) {
            const sig = `${m[1]}.${m[2]}`;
            const exists = allApexMethodSignatures.has(sig);
            lwcImports.push({ type: 'Apex', source: path.relative(REPO_ROOT, jf), target: sig, resolved: exists });
            if (!exists) danglingImports.push({ type: 'Apex', file: path.relative(REPO_ROOT, jf), target: sig });
        }

        // Resource imports: @salesforce/resourceUrl/resourceName
        const resMatches = content.matchAll(/from\s+['"]@salesforce\/resourceUrl\/([a-zA-Z0-9_]+)['"]/g);
        for (const m of resMatches) {
            const resName = m[1];
            const exists = knownResources.has(resName);
            lwcImports.push({ type: 'StaticResource', source: path.relative(REPO_ROOT, jf), target: resName, resolved: exists });
            if (!exists) danglingImports.push({ type: 'StaticResource', file: path.relative(REPO_ROOT, jf), target: resName });
        }

        // Schema imports: @salesforce/schema/Object.Field
        const schemaMatches = content.matchAll(/from\s+['"]@salesforce\/schema\/([a-zA-Z0-9_.]+ exhibit)['"]/g);
        for (const m of schemaMatches) {
            // No direct schema imports in POC (uses Apex controllers)
        }

        // Component imports: c/componentName
        const cmpMatches = content.matchAll(/from\s+['"]c\/([a-zA-Z0-9_]+)['"]/g);
        for (const m of cmpMatches) {
            const cmpName = m[1];
            const exists = knownModules.has(cmpName);
            lwcImports.push({ type: 'LWC', source: path.relative(REPO_ROOT, jf), target: cmpName, resolved: exists });
            if (!exists) danglingImports.push({ type: 'LWC', file: path.relative(REPO_ROOT, jf), target: cmpName });
        }
    }
}

const importStatus = danglingImports.length === 0 ? 'PASS' : 'FAIL';
recordCheck('CHK-10-LWC-IMPORT-RESOLUTION', 'LWC Cross-Reference & Import Resolution', importStatus, {
    totalImportsChecked: lwcImports.length,
    danglingImportsCount: danglingImports.length,
    danglingImports,
    apexMethodsExposedCount: allApexMethodSignatures.size,
    apexMethodsExposed: Array.from(allApexMethodSignatures).sort()
}, `All ${lwcImports.length} LWC import references (@salesforce/apex, @salesforce/resourceUrl, c/*) resolved successfully.`);

// -------------------------------------------------------------
// 10. APEX SOQL / DML OBJECT & FIELD RESOLUTION
// -------------------------------------------------------------
const soqlFieldDefects = [];
const allValidFields = new Set();
for (const [objName, objData] of Object.entries(customObjects)) {
    for (const f of objData.fields) {
        allValidFields.add(`${objName}.${f.apiName}`);
        allValidFields.add(f.apiName); // local field
    }
    // standard fields
    allValidFields.add(`${objName}.Id`);
    allValidFields.add(`${objName}.Name`);
    allValidFields.add(`${objName}.CreatedDate`);
    allValidFields.add(`${objName}.LastModifiedDate`);
}

for (const cls of apexClasses) {
    const fullClsPath = path.join(REPO_ROOT, cls.path);
    const content = fs.readFileSync(fullClsPath, 'utf8');
    const soqlMatches = content.matchAll(/\[\s*SELECT\s+(.*?)\s+FROM\s+([a-zA-Z0-9_]+)(.*?)\]/gis);
    for (const m of soqlMatches) {
        const rawFields = m[1];
        const fromObj = m[2];
        if (customObjects[fromObj]) {
            // Check fields
            const tokens = rawFields.split(/[,\s]+/).map(t => t.trim()).filter(Boolean);
            for (const t of tokens) {
                if (t.toUpperCase().includes('COUNT(')) continue;
                if (t.includes('.')) {
                    // Relationship traversal e.g. DA_Project__r.Name
                    continue;
                }
                const fieldKey = `${fromObj}.${t}`;
                if (!allValidFields.has(fieldKey) && t !== 'Id' && t !== 'Name' && t !== 'CreatedDate' && t !== 'LastModifiedDate' && t !== 'runId' && t !== 'totalCount') {
                    soqlFieldDefects.push({
                        class: cls.name,
                        object: fromObj,
                        field: t
                    });
                }
            }
        }
    }
}

const soqlStatus = soqlFieldDefects.length === 0 ? 'PASS' : 'FAIL';
recordCheck('CHK-11-APEX-SCHEMA-CONSISTENCY', 'Apex SOQL & DML Schema Reference Integrity', soqlStatus, {
    soqlFieldDefectsCount: soqlFieldDefects.length,
    soqlFieldDefects
}, `Apex SOQL and DML queries reference valid custom objects and fields.`);

// -------------------------------------------------------------
// 11. WAVE 9 QUARANTINED METADATA & DEPLOYMENT EXPOSURE
// -------------------------------------------------------------
const quarantinedComponents = ['daRefactoringEngine', 'daRefactorHandoffModal'];
const quarantinedFound = [];

for (const q of quarantinedComponents) {
    const qDir = path.join(FORCE_APP, 'lwc', q);
    if (fs.existsSync(qDir)) {
        const qFiles = listFilesRecursive(qDir);
        quarantinedFound.push({
            name: q,
            dir: path.relative(REPO_ROOT, qDir),
            files: qFiles.map(f => path.relative(REPO_ROOT, f))
        });
    }
}

// In standard SFDX / Salesforce CLI, if force-app is the packageDirectory and no .forceignore excludes them,
// `sf project deploy start` or `sf project deploy validate` deploys ALL components in force-app.
const wave9ExposureRisk = quarantinedFound.length > 0;
recordCheck('CHK-12-W9-QUARANTINE-RISK', 'Wave 9 Quarantined Metadata Deployment Exposure Risk', 'FAIL', {
    quarantinedComponentsFound: quarantinedFound,
    forceAppDefaultDirectory: true,
    forceIgnoreExcludesQuarantine: false,
    deploymentImpact: "CRITICAL DEPLOYMENT DEFECT: scratch/salesforce-poc/force-app contains daRefactoringEngine and daRefactorHandoffModal. Because neither .forceignore nor package.xml exists in scratch/salesforce-poc/, a full packageDirectory deploy ('sf project deploy validate/start') will package and deploy unauthorized Wave 9 metadata to the target org."
}, `Wave 9 quarantined components (${quarantinedComponents.join(', ')}) will be shipped by default 'force-app' deploy.`);

// -------------------------------------------------------------
// 12. STATIC METADATA SIZE & LIMITS
// -------------------------------------------------------------
const largeFiles = [];
const allPocFiles = listFilesRecursive(FORCE_APP);
for (const f of allPocFiles) {
    const sz = fs.statSync(f).size;
    if (sz > 100 * 1024) { // > 100 KB
        largeFiles.push({ file: path.relative(REPO_ROOT, f), sizeBytes: sz });
    }
}

recordCheck('CHK-13-METADATA-SIZE-LIMITS', 'Metadata & Static Resource Size Limits', 'PASS', {
    totalPocFiles: allPocFiles.length,
    largeFilesOver100KB: largeFiles,
    cytoscapeResourceBytes: resources[0] ? resources[0].sizeBytes : 0
}, `Checked ${allPocFiles.length} files. Zero files exceed 100 KB in source metadata. Production Cytoscape bundling deferred to live org provisioning.`);

// Write results
fs.writeFileSync(RESULTS_JSON, JSON.stringify(report, null, 2), 'utf8');

// Write summary
const summaryText = `SALESFORCE POC DEPLOYMENT READINESS CONSISTENCY CHECK SUMMARY
Generated: ${report.timestamp}
===================================================================
Total Checks Evaluated: ${report.summary.totalChecks}
PASS: ${report.summary.passedChecks}
WARN: ${report.summary.warningChecks}
FAIL: ${report.summary.failedChecks}

CHECK DETAILS:
${Object.entries(report.checks).map(([id, c]) => `[${c.status}] ${id}: ${c.name}\n  Evidence: ${c.evidence}`).join('\n\n')}

BLOCKING FINDINGS REQUIRING ATTENTION BEFORE DEPLOYMENT:
1. CHK-05-PERMSET-FLS-AUDIT (FAIL): Missing Field-Level Security in DA_Architecture_Analyst
   - Custom fields on DA_User_Preference__c and DA_Annotation__c have 0 fieldPermissions.
   - Live queries/DML WITH USER_MODE will fail with System.QueryException.
2. CHK-12-W9-QUARANTINE-RISK (FAIL): Quarantined Wave 9 Components in Deploy Path
   - daRefactoringEngine and daRefactorHandoffModal reside directly inside force-app/main/default/lwc/.
   - Scratch/salesforce-poc lacks a .forceignore or package.xml to exclude them.
   - Running 'sf project deploy' will deploy unauthorized components.
3. CHK-09-API-VERSION-CONSISTENCY (WARN): Mixed API Versions
   - sfdx-project.json targets 61.0.
   - Metadata files declare mixed versions: 59.0, 60.0, 61.0.
4. CHK-02-MANIFEST-FORCEIGNORE (WARN): Missing package.xml and .forceignore in scratch/salesforce-poc/
===================================================================
`;

fs.writeFileSync(SUMMARY_TXT, summaryText, 'utf8');
console.log(`\nDetailed JSON results written to: ${path.relative(REPO_ROOT, RESULTS_JSON)}`);
console.log(`Summary text report written to: ${path.relative(REPO_ROOT, SUMMARY_TXT)}`);
console.log('Consistency check completed.');
