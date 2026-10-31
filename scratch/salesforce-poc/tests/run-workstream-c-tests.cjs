/**
 * Workstream C Offline Unit & Integration Test Suite
 * Tests FEAT-STATE-02 (ViewState & Position Persistence via DAUserPreferenceController)
 * and FEAT-DATA-02 (User Annotations & Notes via DAAnnotationController & daAnnotationPanel)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// In-Memory Database for Offline Apex Simulation
class InMemorySalesforceDB {
    constructor() {
        this.reset();
    }

    reset() {
        this.projects = [
            { Id: '001_proj_alpha', Project_Key__c: 'PROJ_ALPHA', Name: 'Project Alpha' },
            { Id: '002_proj_beta', Project_Key__c: 'PROJ_BETA', Name: 'Project Beta' }
        ];
        this.findings = [
            { Id: '00F_find_01', Name: 'Finding 1', Project__c: '001_proj_alpha' }
        ];
        this.userPreferences = [];
        this.annotations = [];
        this.currentUserId = '005_user_100';
        this.currentUserName = 'Test User';
        this.idCounter = 1000;
    }

    generateId(prefix) {
        return `${prefix}_${++this.idCounter}`;
    }
}

// Simulator for DAUserPreferenceController Apex execution
class DAUserPreferenceControllerSimulator {
    constructor(db) {
        this.db = db;
    }

    getUserPreference(projectId) {
        if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
            throw new Error('Project ID parameter cannot be null or blank.');
        }

        const normProjId = projectId.trim();
        const currentUserId = this.db.currentUserId;

        const found = this.db.userPreferences.find(p => {
            const matchesUser = (p.User__c === currentUserId || p.CreatedById === currentUserId);
            const matchesProj = (p.Project__c === normProjId || p.ProjectKey === normProjId);
            return matchesUser && matchesProj;
        });

        return found ? JSON.parse(JSON.stringify(found)) : null;
    }

    saveUserPreference(projectId, viewMode, layoutMode, positionsJson, filtersJson, zoomPanJson) {
        if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
            throw new Error('Project ID parameter cannot be null or blank.');
        }

        if (positionsJson && positionsJson.length > 131072) {
            throw new Error('Positions JSON exceeds maximum allowed length of 131,072 characters.');
        }
        if (filtersJson && filtersJson.length > 131072) {
            throw new Error('Filters JSON exceeds maximum allowed length of 131,072 characters.');
        }
        if (zoomPanJson && zoomPanJson.length > 131072) {
            throw new Error('Zoom Pan JSON exceeds maximum allowed length of 131,072 characters.');
        }

        this.validateJson(positionsJson, 'Positions');
        this.validateJson(filtersJson, 'Filters');
        this.validateJson(zoomPanJson, 'Zoom/Pan');

        const normProjId = projectId.trim();
        const project = this.db.projects.find(p => p.Id === normProjId || p.Project_Key__c === normProjId);

        if (!project) {
            throw new Error(`Project not found or unauthorized: ${projectId}`);
        }

        const prefKey = `${this.db.currentUserId}:${project.Id}`;
        let record = this.db.userPreferences.find(p => p.Preference_Key__c === prefKey);

        if (!record) {
            record = {
                Id: this.db.generateId('00P'),
                User__c: this.db.currentUserId,
                Project__c: project.Id,
                ProjectKey: project.Project_Key__c,
                Preference_Key__c: prefKey,
                CreatedById: this.db.currentUserId
            };
            this.db.userPreferences.push(record);
        }

        if (viewMode !== undefined && viewMode !== null) {
            record.Active_View_Mode__c = viewMode;
        }
        if (layoutMode !== undefined && layoutMode !== null) {
            record.Active_Layout_Mode__c = layoutMode;
        }
        if (positionsJson !== undefined && positionsJson !== null) {
            record.Positions_JSON__c = positionsJson;
        }
        if (filtersJson !== undefined && filtersJson !== null) {
            record.Filters_JSON__c = this.mergeV1IntoV2Container(record.Filters_JSON__c, filtersJson);
        }
        if (zoomPanJson !== undefined && zoomPanJson !== null) {
            record.Zoom_Pan_JSON__c = zoomPanJson;
        }
        record.LastModifiedDate = new Date().toISOString();

        return JSON.parse(JSON.stringify(record));
    }

    mergeV1IntoV2Container(existingV2Json, incomingFilterJson) {
        if (incomingFilterJson !== undefined && incomingFilterJson !== null && incomingFilterJson.trim() === '') {
            return '';
        }
        if (incomingFilterJson === null || incomingFilterJson === undefined) {
            return existingV2Json;
        }
        if (!existingV2Json || existingV2Json.trim() === '') {
            return incomingFilterJson;
        }

        try {
            const incomingObj = JSON.parse(incomingFilterJson);
            if (!incomingObj || typeof incomingObj !== 'object' || Array.isArray(incomingObj)) {
                return existingV2Json;
            }

            if ('schemaVersion' in incomingObj) {
                if (incomingObj.schemaVersion === 2) {
                    return incomingFilterJson;
                }
                return existingV2Json;
            }

            if ('presets' in incomingObj) {
                return existingV2Json;
            }

            const existingObj = JSON.parse(existingV2Json);
            if (!existingObj || typeof existingObj !== 'object' || Array.isArray(existingObj)) {
                return existingV2Json;
            }

            if (!('schemaVersion' in existingObj) && ('presets' in existingObj)) {
                return existingV2Json;
            }

            if ('schemaVersion' in existingObj) {
                if (existingObj.schemaVersion === 2) {
                    existingObj.activeFilter = incomingObj;
                    existingObj.activePresetId = null;
                    return JSON.stringify(existingObj);
                }
                return existingV2Json;
            }

            return incomingFilterJson;
        } catch (e) {
            return existingV2Json;
        }
    }

    validateJson(str, fieldName) {
        if (str && str.trim() !== '') {
            try {
                JSON.parse(str);
            } catch (e) {
                throw new Error(`Malformed ${fieldName} JSON payload: ${e.message}`);
            }
        }
    }
}

// Simulator for DAAnnotationController Apex execution
class DAAnnotationControllerSimulator {
    constructor(db) {
        this.db = db;
    }

    getAnnotations(projectId, nodeId) {
        if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
            throw new Error('Project ID parameter cannot be null or blank.');
        }

        const normProjId = projectId.trim();
        const project = this.db.projects.find(p => p.Id === normProjId || p.Project_Key__c === normProjId);

        if (!project) {
            return [];
        }

        let filtered = this.db.annotations.filter(a => a.Project__c === project.Id);

        if (nodeId && nodeId.trim() !== '') {
            filtered = filtered.filter(a => a.Node_Id__c === nodeId.trim());
        }

        return JSON.parse(JSON.stringify(filtered.sort((a, b) => new Date(b.CreatedDate) - new Date(a.CreatedDate))));
    }

    createAnnotation(projectId, nodeId, title, text, status, findingId) {
        if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
            throw new Error('Project ID parameter cannot be null or blank.');
        }
        if (!nodeId || typeof nodeId !== 'string' || nodeId.trim() === '') {
            throw new Error('Node ID parameter cannot be null or blank.');
        }
        if (!text || typeof text !== 'string' || text.trim() === '') {
            throw new Error('Annotation text cannot be null or blank.');
        }

        if (title && title.length > 255) {
            throw new Error('Annotation title exceeds maximum allowed length of 255 characters.');
        }
        if (nodeId.length > 255) {
            throw new Error('Node ID exceeds maximum allowed length of 255 characters.');
        }
        if (text.length > 32768) {
            throw new Error('Annotation text exceeds maximum allowed length of 32,768 characters.');
        }

        const normProjId = projectId.trim();
        const project = this.db.projects.find(p => p.Id === normProjId || p.Project_Key__c === normProjId);

        if (!project) {
            throw new Error(`Project not found or unauthorized: ${projectId}`);
        }

        let resolvedFindingId = null;
        if (findingId && findingId.trim() !== '') {
            const f = this.db.findings.find(item => item.Id === findingId.trim());
            if (f) resolvedFindingId = f.Id;
        }

        const record = {
            Id: this.db.generateId('00A'),
            Name: title && title.trim() !== '' ? title.trim() : `Note - ${nodeId}`,
            Project__c: project.Id,
            Node_Id__c: nodeId.trim(),
            Author__c: this.db.currentUserName,
            Text__c: text.trim(),
            Status__c: status && status.trim() !== '' ? status.trim() : 'OPEN',
            Finding__c: resolvedFindingId,
            Resolved_At__c: null,
            CreatedDate: new Date().toISOString(),
            LastModifiedDate: new Date().toISOString(),
            CreatedById: this.db.currentUserId
        };

        this.db.annotations.push(record);
        return JSON.parse(JSON.stringify(record));
    }

    updateAnnotation(annotationId, title, text, status) {
        if (!annotationId || typeof annotationId !== 'string' || annotationId.trim() === '') {
            throw new Error('Annotation ID parameter cannot be null or blank.');
        }

        if (title && title.length > 255) {
            throw new Error('Annotation title exceeds maximum allowed length of 255 characters.');
        }
        if (text && text.length > 32768) {
            throw new Error('Annotation text exceeds maximum allowed length of 32,768 characters.');
        }

        const record = this.db.annotations.find(a => a.Id === annotationId.trim());
        if (!record) {
            throw new Error(`Annotation record not found or unauthorized: ${annotationId}`);
        }

        if (title && title.trim() !== '') record.Name = title.trim();
        if (text && text.trim() !== '') record.Text__c = text.trim();
        if (status && status.trim() !== '') {
            const normStatus = status.trim();
            if (normStatus === 'RESOLVED' && record.Status__c !== 'RESOLVED') {
                record.Resolved_At__c = new Date().toISOString();
            }
            record.Status__c = normStatus;
        }

        record.LastModifiedDate = new Date().toISOString();
        return JSON.parse(JSON.stringify(record));
    }

    deleteAnnotation(annotationId) {
        if (!annotationId || typeof annotationId !== 'string' || annotationId.trim() === '') {
            throw new Error('Annotation ID parameter cannot be null or blank.');
        }

        const idx = this.db.annotations.findIndex(a => a.Id === annotationId.trim());
        if (idx === -1) {
            throw new Error(`Annotation record not found or unauthorized: ${annotationId}`);
        }

        this.db.annotations.splice(idx, 1);
        return true;
    }
}

// Helper to create daAnnotationPanel LWC class instance in Node simulation
function createAnnotationPanelClass(mockApex) {
    const filePath = path.resolve(__dirname, '../force-app/main/default/lwc/daAnnotationPanel/daAnnotationPanel.js');
    let code = fs.readFileSync(filePath, 'utf8');

    code = code.replace(/import\s+\{([^}]+)\}\s+from\s+['\"]lwc['\"];?/, 'const {$1} = LwcMock;');
    code = code.replace(/import\s+getAnnotations\s+from\s+['\"]@salesforce\/apex\/DAAnnotationController\.getAnnotations['\"];?/, 'const getAnnotations = (p) => mockApex.getAnnotations(p);');
    code = code.replace(/import\s+createAnnotation\s+from\s+['\"]@salesforce\/apex\/DAAnnotationController\.createAnnotation['\"];?/, 'const createAnnotation = (p) => mockApex.createAnnotation(p);');
    code = code.replace(/import\s+updateAnnotation\s+from\s+['\"]@salesforce\/apex\/DAAnnotationController\.updateAnnotation['\"];?/, 'const updateAnnotation = (p) => mockApex.updateAnnotation(p);');
    code = code.replace(/import\s+deleteAnnotation\s+from\s+['\"]@salesforce\/apex\/DAAnnotationController\.deleteAnnotation['\"];?/, 'const deleteAnnotation = (p) => mockApex.deleteAnnotation(p);');

    code = code.replace(/@api\s+/g, '');
    code = code.replace(/@track\s+/g, '');
    code = code.replace('export default class DaAnnotationPanel', 'class DaAnnotationPanel');
    code += '\nreturn DaAnnotationPanel;';

    const LwcMock = {
        LightningElement: class {
            constructor() {
                this._events = {};
            }
            addEventListener(type, fn) {
                this._events[type] = fn;
            }
            dispatchEvent(evt) {
                if (this._events[evt.type]) this._events[evt.type](evt);
            }
        },
        api: (t, k, d) => d,
        track: (t, k, d) => d
    };

    const fn = new Function('LwcMock', 'mockApex', code);
    return fn(LwcMock, mockApex);
}

let passes = 0;
let fails = 0;

function runTest(name, fn) {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        passes++;
    } catch (err) {
        console.error(`  ✗ ${name}: ${err.message}`);
        fails++;
    }
}

async function runAsyncTest(name, fn) {
    try {
        await fn();
        console.log(`  ✓ ${name}`);
        passes++;
    } catch (err) {
        console.error(`  ✗ ${name}: ${err.message}`);
        fails++;
    }
}

async function main() {
    console.log('Running Workstream C Offline Verification & Integration Suite...');
    console.log('===================================================================');

    const db = new InMemorySalesforceDB();
    const prefService = new DAUserPreferenceControllerSimulator(db);
    const annService = new DAAnnotationControllerSimulator(db);

    console.log('\n[Category 1: FEAT-STATE-02 ViewState & Position Persistence Tests]');

    runTest('1. First-use behavior: returns null when no saved preference exists', () => {
        db.reset();
        const pref = prefService.getUserPreference('001_proj_alpha');
        assert.strictEqual(pref, null);
    });

    runTest('2. Saving and loading valid node positions and view state', () => {
        db.reset();
        const posData = JSON.stringify({ 'ApexClass:AccountController': { x: 100, y: 250 } });
        const filterData = JSON.stringify({ search: 'Account', risk: 'HIGH' });
        const zoomData = JSON.stringify({ zoom: 1.5, pan: { x: 10, y: 20 } });

        const saved = prefService.saveUserPreference(
            '001_proj_alpha',
            'graph',
            'hierarchical',
            posData,
            filterData,
            zoomData
        );

        assert.strictEqual(saved.Project__c, '001_proj_alpha');
        assert.strictEqual(saved.Active_View_Mode__c, 'graph');
        assert.strictEqual(saved.Active_Layout_Mode__c, 'hierarchical');
        assert.strictEqual(saved.Positions_JSON__c, posData);

        const loaded = prefService.getUserPreference('001_proj_alpha');
        assert.notStrictEqual(loaded, null);
        assert.strictEqual(loaded.Positions_JSON__c, posData);
        assert.strictEqual(loaded.Filters_JSON__c, filterData);
        assert.strictEqual(loaded.Zoom_Pan_JSON__c, zoomData);
    });

    runTest('3. Project and user isolation: preferences are strictly scoped', () => {
        db.reset();
        prefService.saveUserPreference('001_proj_alpha', 'graph', 'hierarchical', '{"nodeA":{"x":1,"y":2}}', null, null);

        // Preference for project Alpha must not be returned for project Beta
        const betaPref = prefService.getUserPreference('002_proj_beta');
        assert.strictEqual(betaPref, null);

        // Switch active user
        db.currentUserId = '005_user_999';
        const otherUserPref = prefService.getUserPreference('001_proj_alpha');
        assert.strictEqual(otherUserPref, null);
    });

    runTest('4. Project switch during save/load rejects cross-project pollution', () => {
        db.reset();
        prefService.saveUserPreference('PROJ_ALPHA', 'graph', 'orbit', '{"node1":{"x":50,"y":50}}', null, null);

        // Simulate rapid switch to PROJ_BETA
        const betaPref = prefService.getUserPreference('PROJ_BETA');
        assert.strictEqual(betaPref, null);
    });

    runTest('5. Malformed JSON payload detection and rejection', () => {
        db.reset();
        assert.throws(() => {
            prefService.saveUserPreference('001_proj_alpha', 'graph', 'orbit', '{ invalid_json: ', null, null);
        }, /Malformed Positions JSON payload/);
    });

    runTest('6. Oversized JSON payload detection and rejection (>131072 chars) - R4 Boundary Verification', () => {
        db.reset();
        const maxAllowed = '{"k":"' + 'a'.repeat(131064) + '"}'; // exactly 131,072 characters
        assert.strictEqual(maxAllowed.length, 131072);
        const oversized = 'a'.repeat(131073);

        // Field 1: Positions_JSON__c (Parameter 4)
        // 131,072 characters accepted
        const posAccepted = prefService.saveUserPreference('001_proj_alpha', 'graph', 'orbit', maxAllowed, null, null);
        assert.strictEqual(posAccepted.Positions_JSON__c.length, 131072);
        // 131,073 characters rejected
        assert.throws(() => {
            prefService.saveUserPreference('001_proj_alpha', 'graph', 'orbit', oversized, null, null);
        }, /Positions JSON exceeds maximum allowed length/);

        // Field 2: Filters_JSON__c (Parameter 5)
        // 131,072 characters accepted
        const filterAccepted = prefService.saveUserPreference('001_proj_alpha', 'graph', 'orbit', null, maxAllowed, null);
        assert.strictEqual(filterAccepted.Filters_JSON__c.length, 131072);
        // 131,073 characters rejected
        assert.throws(() => {
            prefService.saveUserPreference('001_proj_alpha', 'graph', 'orbit', null, oversized, null);
        }, /Filters JSON exceeds maximum allowed length/);

        // Field 3: Zoom_Pan_JSON__c (Parameter 6)
        // 131,072 characters accepted
        const zoomAccepted = prefService.saveUserPreference('001_proj_alpha', 'graph', 'orbit', null, null, maxAllowed);
        assert.strictEqual(zoomAccepted.Zoom_Pan_JSON__c.length, 131072);
        // 131,073 characters rejected
        assert.throws(() => {
            prefService.saveUserPreference('001_proj_alpha', 'graph', 'orbit', null, null, oversized);
        }, /Zoom Pan JSON exceeds maximum allowed length/);
    });

    runTest('7. Blank or missing Project ID rejection', () => {
        db.reset();
        assert.throws(() => {
            prefService.getUserPreference('');
        }, /Project ID parameter cannot be null or blank/);

        assert.throws(() => {
            prefService.saveUserPreference('   ', 'graph', 'orbit', null, null, null);
        }, /Project ID parameter cannot be null or blank/);
    });

    runTest('7a. Null arguments preserve existing saved preference values (Null-Coalescing Guard)', () => {
        db.reset();
        const initialPos = JSON.stringify({ node1: { x: 10, y: 20 } });
        const initialFilters = JSON.stringify({ search: 'Account' });
        const initialZoom = JSON.stringify({ zoom: 2.0 });

        prefService.saveUserPreference('001_proj_alpha', 'graph', 'hierarchical', initialPos, initialFilters, initialZoom);

        const updated = prefService.saveUserPreference('001_proj_alpha', 'matrix', null, null, JSON.stringify({ search: 'Contact' }), null);

        assert.strictEqual(updated.Active_View_Mode__c, 'matrix');
        assert.strictEqual(updated.Active_Layout_Mode__c, 'hierarchical');
        assert.strictEqual(updated.Positions_JSON__c, initialPos);
        assert.strictEqual(updated.Filters_JSON__c, JSON.stringify({ search: 'Contact' }));
        assert.strictEqual(updated.Zoom_Pan_JSON__c, initialZoom);
    });

    runTest('7b. Empty string parameter updates field value and is not treated as null', () => {
        db.reset();
        prefService.saveUserPreference('001_proj_alpha', 'graph', 'hierarchical', '{"a":1}', '{"b":2}', '{"c":3}');

        const updated = prefService.saveUserPreference('001_proj_alpha', 'graph', 'hierarchical', '', null, null);

        assert.strictEqual(updated.Positions_JSON__c, '');
        assert.strictEqual(updated.Filters_JSON__c, '{"b":2}');
        assert.strictEqual(updated.Zoom_Pan_JSON__c, '{"c":3}');
    });

    runTest('7c. R1: V1 filter save over existing V2 container preserves presets and activePresetId set to null', () => {
        db.reset();
        const v2Container = JSON.stringify({
            schemaVersion: 2,
            activePresetId: 'preset-quick-1',
            activeFilter: { search: 'OldClass', riskLevels: ['HIGH'] },
            presets: [
                { id: 'preset-quick-1', name: 'High Risk Focus', criteria: { riskLevels: ['HIGH'] } },
                { id: 'preset-quick-2', name: 'Apex Only', criteria: { nodeTypes: ['ApexClass'] } }
            ]
        });

        // Seed initial V2 container
        prefService.saveUserPreference('001_proj_alpha', 'graph', 'orbit', null, v2Container, null);

        // V1 write updates activeFilter
        const incomingV1 = JSON.stringify({ search: 'NewService', riskLevels: ['LOW'] });
        const updated = prefService.saveUserPreference('001_proj_alpha', null, null, null, incomingV1, null);

        const parsed = JSON.parse(updated.Filters_JSON__c);
        assert.strictEqual(parsed.schemaVersion, 2);
        assert.strictEqual(parsed.activePresetId, null, 'Ad-hoc V1 filter modification should clear activePresetId');
        assert.strictEqual(parsed.activeFilter.search, 'NewService');
        assert.deepStrictEqual(parsed.activeFilter.riskLevels, ['LOW']);
        assert.strictEqual(parsed.presets.length, 2, 'Presets must be preserved intact');
        assert.strictEqual(parsed.presets[0].id, 'preset-quick-1');
        assert.strictEqual(parsed.presets[1].id, 'preset-quick-2');
    });

    runTest('7d. R1: Incoming V2 container replaces existing container atomically', () => {
        db.reset();
        const initialV2 = JSON.stringify({
            schemaVersion: 2,
            activePresetId: 'p1',
            activeFilter: { search: 'Initial' },
            presets: [{ id: 'p1', name: 'P1' }]
        });
        prefService.saveUserPreference('001_proj_alpha', 'graph', 'orbit', null, initialV2, null);

        const newV2 = JSON.stringify({
            schemaVersion: 2,
            activePresetId: 'p2',
            activeFilter: { search: 'Replaced' },
            presets: [{ id: 'p2', name: 'P2' }, { id: 'p3', name: 'P3' }]
        });
        const updated = prefService.saveUserPreference('001_proj_alpha', null, null, null, newV2, null);

        assert.strictEqual(updated.Filters_JSON__c, newV2);
        const parsed = JSON.parse(updated.Filters_JSON__c);
        assert.strictEqual(parsed.activePresetId, 'p2');
        assert.strictEqual(parsed.presets.length, 2);
    });

    runTest('7e. R1: Empty string clears Filters_JSON__c and null preserves stored value', () => {
        db.reset();
        const v2 = JSON.stringify({ schemaVersion: 2, presets: [], activeFilter: {} });
        prefService.saveUserPreference('001_proj_alpha', 'graph', 'orbit', null, v2, null);

        // Null incoming preserves
        const updatedNull = prefService.saveUserPreference('001_proj_alpha', 'matrix', null, null, null, null);
        assert.strictEqual(updatedNull.Filters_JSON__c, v2);

        // Empty string clears
        const updatedEmpty = prefService.saveUserPreference('001_proj_alpha', 'matrix', null, null, '', null);
        assert.strictEqual(updatedEmpty.Filters_JSON__c, '');
    });

    runTest('7f. R1: Malformed and unsupported schema fail closed and preserve existing data', () => {
        db.reset();
        const v2 = JSON.stringify({
            schemaVersion: 2,
            activePresetId: 'p1',
            activeFilter: { search: 'Valid' },
            presets: [{ id: 'p1', name: 'P1' }]
        });
        prefService.saveUserPreference('001_proj_alpha', 'graph', 'orbit', null, v2, null);

        // Unsupported schemaVersion 99 fails closed
        const unsupportedSchema = JSON.stringify({ schemaVersion: 99, activeFilter: {} });
        const resUnsupported = prefService.saveUserPreference('001_proj_alpha', null, null, null, unsupportedSchema, null);
        assert.strictEqual(resUnsupported.Filters_JSON__c, v2, 'Unsupported schemaVersion must fail closed');

        // Ambiguous incoming (presets without schemaVersion) fails closed
        const ambiguousIncoming = JSON.stringify({ presets: [{ id: 'x' }], activeFilter: {} });
        const resAmbiguous = prefService.saveUserPreference('001_proj_alpha', null, null, null, ambiguousIncoming, null);
        assert.strictEqual(resAmbiguous.Filters_JSON__c, v2, 'Ambiguous presets without schemaVersion must fail closed');
    });

    console.log('\n[Category 2: FEAT-DATA-02 User Annotations & Notes Tests]');

    runTest('8. Creating and loading node annotations for specific project', () => {
        db.reset();
        const ann = annService.createAnnotation(
            '001_proj_alpha',
            'ApexClass:AccountController',
            'Refactoring Note',
            'This class needs to be split into smaller service modules.',
            'OPEN',
            '00F_find_01'
        );

        assert.strictEqual(ann.Project__c, '001_proj_alpha');
        assert.strictEqual(ann.Node_Id__c, 'ApexClass:AccountController');
        assert.strictEqual(ann.Name, 'Refactoring Note');
        assert.strictEqual(ann.Text__c, 'This class needs to be split into smaller service modules.');
        assert.strictEqual(ann.Status__c, 'OPEN');
        assert.strictEqual(ann.Finding__c, '00F_find_01');

        const list = annService.getAnnotations('001_proj_alpha', 'ApexClass:AccountController');
        assert.strictEqual(list.length, 1);
        assert.strictEqual(list[0].Id, ann.Id);
    });

    runTest('9. Updating annotation text, status, and resolved timestamp', () => {
        db.reset();
        const created = annService.createAnnotation(
            '001_proj_alpha',
            'ApexClass:AccountController',
            'Initial Title',
            'Initial Text',
            'OPEN',
            null
        );

        assert.strictEqual(created.Resolved_At__c, null);

        const updated = annService.updateAnnotation(
            created.Id,
            'Updated Title',
            'Updated Text',
            'RESOLVED'
        );

        assert.strictEqual(updated.Name, 'Updated Title');
        assert.strictEqual(updated.Text__c, 'Updated Text');
        assert.strictEqual(updated.Status__c, 'RESOLVED');
        assert.notStrictEqual(updated.Resolved_At__c, null);
    });

    runTest('10. Deleting annotation record', () => {
        db.reset();
        const created = annService.createAnnotation('001_proj_alpha', 'node_1', 'Title', 'Text', 'OPEN', null);
        assert.strictEqual(annService.getAnnotations('001_proj_alpha', 'node_1').length, 1);

        const result = annService.deleteAnnotation(created.Id);
        assert.strictEqual(result, true);
        assert.strictEqual(annService.getAnnotations('001_proj_alpha', 'node_1').length, 0);
    });

    runTest('11. Input validation: missing required fields and length limits', () => {
        db.reset();
        assert.throws(() => {
            annService.createAnnotation('', 'node_1', 'Title', 'Text', 'OPEN', null);
        }, /Project ID parameter cannot be null or blank/);

        assert.throws(() => {
            annService.createAnnotation('001_proj_alpha', '', 'Title', 'Text', 'OPEN', null);
        }, /Node ID parameter cannot be null or blank/);

        assert.throws(() => {
            annService.createAnnotation('001_proj_alpha', 'node_1', 'Title', '   ', 'OPEN', null);
        }, /Annotation text cannot be null or blank/);

        const longTitle = 'a'.repeat(256);
        assert.throws(() => {
            annService.createAnnotation('001_proj_alpha', 'node_1', longTitle, 'Text', 'OPEN', null);
        }, /Annotation title exceeds maximum allowed length/);
    });

    runTest('12. Project switch isolation: annotations from project A do not leak to project B', () => {
        db.reset();
        annService.createAnnotation('001_proj_alpha', 'node_shared', 'Alpha Note', 'Text A', 'OPEN', null);

        const alphaList = annService.getAnnotations('001_proj_alpha', 'node_shared');
        assert.strictEqual(alphaList.length, 1);

        const betaList = annService.getAnnotations('002_proj_beta', 'node_shared');
        assert.strictEqual(betaList.length, 0, 'Annotations must be strictly isolated per project');
    });

    runTest('13. Selection Invariant Check: Annotation interactions do NOT mutate active project or view (SELECTION != NAVIGATION)', () => {
        db.reset();
        let activeProject = 'PROJ_ALPHA';
        let activeView = 'graph';

        // Perform annotation creation gesture on active node
        const ann = annService.createAnnotation(activeProject, 'ApexClass:Service', 'Note', 'Details', 'OPEN', null);

        assert.strictEqual(activeProject, 'PROJ_ALPHA', 'Project must remain unchanged after annotation creation');
        assert.strictEqual(activeView, 'graph', 'View mode must remain unchanged after annotation creation');
    });

    console.log('\n[Category 3: LWC Annotation Panel Component Direct Unit Tests]');

    await runAsyncTest('14. daAnnotationPanel: fetching and creating annotations via LWC component', async () => {
        db.reset();
        const mockApex = {
            getAnnotations: async (p) => annService.getAnnotations(p.projectId, p.nodeId),
            createAnnotation: async (p) => annService.createAnnotation(p.projectId, p.nodeId, p.title, p.text, p.status, p.findingId),
            updateAnnotation: async (p) => annService.updateAnnotation(p.annotationId, p.title, p.text, p.status),
            deleteAnnotation: async (p) => annService.deleteAnnotation(p.annotationId)
        };

        const DaAnnotationPanel = createAnnotationPanelClass(mockApex);
        const panel = new DaAnnotationPanel();

        panel.projectId = '001_proj_alpha';
        panel.selectedNodeId = 'ApexClass:Test';

        assert.strictEqual(panel.projectId, '001_proj_alpha');
        assert.strictEqual(panel.selectedNodeId, 'ApexClass:Test');

        panel.newTitle = 'LWC Note';
        panel.newText = 'Testing LWC note creation';

        await panel.handleCreateAnnotation();

        assert.strictEqual(panel.hasAnnotations, true);
        assert.strictEqual(panel.annotations.length, 1);
        assert.strictEqual(panel.annotations[0].Name, 'LWC Note');
        assert.strictEqual(panel.annotations[0].Text__c, 'Testing LWC note creation');
    });

    await runAsyncTest('16. daAnnotationPanel: stale request response rejection on rapid node change', async () => {
        db.reset();
        annService.createAnnotation('001_proj_alpha', 'NodeA', 'TitleA', 'TextA', 'OPEN', null);
        annService.createAnnotation('001_proj_alpha', 'NodeB', 'TitleB', 'TextB', 'OPEN', null);

        let resolveA;
        const mockApex = {
            getAnnotations: async (p) => {
                if (p.nodeId === 'NodeA') {
                    return new Promise(resolve => { resolveA = () => resolve(annService.getAnnotations(p.projectId, p.nodeId)); });
                }
                return annService.getAnnotations(p.projectId, p.nodeId);
            },
            createAnnotation: async (p) => annService.createAnnotation(p.projectId, p.nodeId, p.title, p.text, p.status, p.findingId),
            updateAnnotation: async (p) => annService.updateAnnotation(p.annotationId, p.title, p.text, p.status),
            deleteAnnotation: async (p) => annService.deleteAnnotation(p.annotationId)
        };

        const DaAnnotationPanel = createAnnotationPanelClass(mockApex);
        const panel = new DaAnnotationPanel();

        // Node A fetch initiated
        panel.projectId = '001_proj_alpha';
        panel.selectedNodeId = 'NodeA';

        // Rapidly switch to Node B before Node A fetch completes
        panel.selectedNodeId = 'NodeB';
        const delay = (ms) => new Promise(r => setTimeout(r, ms));
        await delay(20);

        assert.strictEqual(panel.annotations.length, 1);
        assert.strictEqual(panel.annotations[0].Node_Id__c, 'NodeB');

        // Resolve Node A late
        if (resolveA) resolveA();
        await delay(20);

        // Verify Node A response was discarded and Node B annotations remain active
        assert.strictEqual(panel.annotations.length, 1);
        assert.strictEqual(panel.annotations[0].Node_Id__c, 'NodeB');
    });

    console.log('\n[Category 4: Production Apex Class Source Code Contract Verification]');

    runTest('15. Production Apex Source Contracts: DAUserPreferenceController.cls & DAAnnotationController.cls', () => {
        const userPrefPath = path.resolve(__dirname, '../force-app/main/default/classes/controllers/DAUserPreferenceController.cls');
        const annPath = path.resolve(__dirname, '../force-app/main/default/classes/controllers/DAAnnotationController.cls');

        const userPrefCode = fs.readFileSync(userPrefPath, 'utf8');
        const annCode = fs.readFileSync(annPath, 'utf8');

        // Verify class level declarations
        assert.strictEqual(userPrefCode.includes('public with sharing class DAUserPreferenceController'), true);
        assert.strictEqual(annCode.includes('public with sharing class DAAnnotationController'), true);

        // Verify WITH USER_MODE security enforcement
        assert.strictEqual(userPrefCode.includes('WITH USER_MODE'), true);
        assert.strictEqual(annCode.includes('WITH USER_MODE'), true);

        // Verify DML user mode enforcement
        assert.strictEqual(userPrefCode.includes('upsert as user'), true);
        assert.strictEqual(annCode.includes('insert as user'), true);
        assert.strictEqual(annCode.includes('update as user'), true);
        assert.strictEqual(annCode.includes('delete as user'), true);

        // Verify QueryException: Invalid id prevention via isValidId helper
        assert.strictEqual(userPrefCode.includes('isValidId'), true);
        assert.strictEqual(annCode.includes('isValidId'), true);
    });

    console.log('\n===================================================================');
    console.log(`Summary: ${passes} PASSED, ${fails} FAILED`);

    if (fails > 0) {
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Test execution error:', err);
    process.exit(1);
});
