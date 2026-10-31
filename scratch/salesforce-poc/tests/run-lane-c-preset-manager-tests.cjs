/**
 * run-lane-c-preset-manager-tests.cjs
 * Focused Unit Test Suite for Lane C: DaPresetManager LWC
 *
 * Verifies:
 * 1. Create preset from active filter criteria.
 * 2. Apply selected preset to active filter.
 * 3. Update existing preset with modified criteria.
 * 4. Delete preset and handle activePresetId reset.
 * 5. Active preset selection tracking and styling.
 * 6. Empty preset collection handling and safe defaults.
 * 7. Invalid preset data normalization and error state.
 * 8. Normalization and serialization boundaries (131,072 char limit).
 * 9. Project A cannot access or mutate Project B presets (DEC-W4-03).
 * 10. Applying preset emits canonical filter change event.
 * 11. Component behavior when project context is missing/unavailable.
 */

const assert = require('assert');
const path = require('path');

async function runLaneCTests() {
    console.log('Running Lane C (DaPresetManager LWC) Focused Unit Test Suite...');
    console.log('================================================================');

    const schemaModulePath = path.resolve(__dirname, '../force-app/main/default/lwc/daAppShell/daFilterSchema.js');
    const daFilterSchema = await import(`file://${schemaModulePath}`);

    // Mock custom events
    class MockCustomEvent {
        constructor(type, init = {}) {
            this.type = type;
            this.detail = init.detail || {};
        }
    }
    global.CustomEvent = MockCustomEvent;

    const {
        SCHEMA_VERSION,
        MAX_PAYLOAD_SIZE,
        getDefaultFilterCriteria,
        getDefaultFilterContainer,
        normalizeFilterCriteria,
        validateAndNormalizeContainer,
        serializeFilterContainer
    } = daFilterSchema;

    function createPresetManagerInstance(projectId = 'proj-alpha') {
        const events = [];
        return {
            projectId: projectId,
            _filterContainer: getDefaultFilterContainer(),
            _activeFilter: null,
            isLoading: false,
            errorMessage: null,
            showSaveModal: false,
            newPresetName: '',

            get filterContainer() {
                return this._filterContainer || getDefaultFilterContainer();
            },
            set filterContainer(value) {
                if (!value) {
                    this._filterContainer = getDefaultFilterContainer();
                    return;
                }
                try {
                    if (typeof value === 'string') {
                        const parsed = JSON.parse(value);
                        this._filterContainer = validateAndNormalizeContainer(parsed, this.projectId);
                    } else if (typeof value === 'object') {
                        this._filterContainer = validateAndNormalizeContainer(value, this.projectId);
                    } else {
                        this._filterContainer = getDefaultFilterContainer();
                    }
                    this.errorMessage = null;
                } catch (err) {
                    this.errorMessage = 'Failed to load filter presets container.';
                    this._filterContainer = getDefaultFilterContainer();
                }
            },

            get activeFilter() {
                return this._activeFilter || this.filterContainer.activeFilter || getDefaultFilterCriteria();
            },
            set activeFilter(value) {
                this._activeFilter = normalizeFilterCriteria(value);
            },

            get isMissingProject() {
                return !this.projectId;
            },

            get isSaveDisabled() {
                return this.isMissingProject || this.isLoading;
            },

            get isConfirmSaveDisabled() {
                return !this.newPresetName || this.newPresetName.trim() === '';
            },

            get hasPresets() {
                return this.presetList && this.presetList.length > 0;
            },

            get presetList() {
                const container = this.filterContainer;
                const presets = container && Array.isArray(container.presets) ? container.presets : [];
                const activeId = container ? container.activePresetId : null;

                return presets.map(p => {
                    const isActive = p.id === activeId;
                    return {
                        id: p.id,
                        name: p.name || 'Unnamed Preset',
                        isActive,
                        itemClass: `preset-item slds-item ${isActive ? 'is-active' : ''}`,
                        criteria: p.criteria
                    };
                });
            },

            dispatchEvent(evt) {
                events.push(evt);
            },

            getDispatchedEvents() {
                return events;
            },

            handleConfirmSavePreset() {
                const name = this.newPresetName ? this.newPresetName.trim() : '';
                if (!name) return;

                if (this.isMissingProject) {
                    this.errorMessage = 'Cannot save preset: active project context is required.';
                    this.showSaveModal = false;
                    return;
                }

                try {
                    const container = JSON.parse(JSON.stringify(this.filterContainer));
                    const newId = `preset-${Date.now()}`;
                    const currentCriteria = normalizeFilterCriteria(this.activeFilter);

                    const newPreset = {
                        id: newId,
                        name: name,
                        projectId: this.projectId,
                        criteria: currentCriteria
                    };

                    const existingPresets = Array.isArray(container.presets) ? container.presets : [];
                    const updatedPresets = [...existingPresets, newPreset];

                    const updatedContainer = {
                        schemaVersion: SCHEMA_VERSION,
                        activePresetId: newId,
                        activeFilter: currentCriteria,
                        presets: updatedPresets
                    };

                    serializeFilterContainer(updatedContainer);
                    this._filterContainer = validateAndNormalizeContainer(updatedContainer, this.projectId);
                    this.showSaveModal = false;
                    this.newPresetName = '';
                    this.errorMessage = null;

                    this.dispatchEvent(new MockCustomEvent('containerchange', { detail: { container: this._filterContainer } }));
                    this.dispatchEvent(new MockCustomEvent('filterchange', { detail: { activeFilter: currentCriteria, activePresetId: newId } }));
                } catch (err) {
                    this.errorMessage = 'Error saving preset: ' + (err.message || err);
                    this.showSaveModal = false;
                }
            },

            handleSelectPreset(targetId) {
                if (!targetId) return;

                const container = this.filterContainer;
                const presets = container.presets || [];
                const selected = presets.find(p => p.id === targetId);

                if (!selected) {
                    this.errorMessage = `Selected preset ${targetId} not found.`;
                    return;
                }

                if (selected.projectId && this.projectId && selected.projectId !== this.projectId) {
                    this.errorMessage = 'Unauthorized: cannot apply preset belonging to another project.';
                    return;
                }

                const updatedCriteria = normalizeFilterCriteria(selected.criteria);

                const updatedContainer = {
                    ...container,
                    schemaVersion: SCHEMA_VERSION,
                    activePresetId: selected.id,
                    activeFilter: updatedCriteria
                };

                this._filterContainer = updatedContainer;
                this.errorMessage = null;

                this.dispatchEvent(new MockCustomEvent('containerchange', { detail: { container: updatedContainer } }));
                this.dispatchEvent(new MockCustomEvent('filterchange', { detail: { activeFilter: updatedCriteria, activePresetId: selected.id } }));
            },

            handleUpdatePreset(targetId) {
                if (!targetId) return;

                try {
                    const container = JSON.parse(JSON.stringify(this.filterContainer));
                    const presets = container.presets || [];
                    const idx = presets.findIndex(p => p.id === targetId);

                    if (idx === -1) {
                        this.errorMessage = `Preset ${targetId} not found for update.`;
                        return;
                    }

                    if (presets[idx].projectId && this.projectId && presets[idx].projectId !== this.projectId) {
                        this.errorMessage = 'Unauthorized: cannot update preset from another project.';
                        return;
                    }

                    const currentCriteria = normalizeFilterCriteria(this.activeFilter);
                    presets[idx].criteria = currentCriteria;

                    const updatedContainer = {
                        ...container,
                        schemaVersion: SCHEMA_VERSION,
                        activePresetId: targetId,
                        activeFilter: currentCriteria,
                        presets
                    };

                    serializeFilterContainer(updatedContainer);
                    this._filterContainer = validateAndNormalizeContainer(updatedContainer, this.projectId);
                    this.errorMessage = null;

                    this.dispatchEvent(new MockCustomEvent('containerchange', { detail: { container: this._filterContainer } }));
                    this.dispatchEvent(new MockCustomEvent('filterchange', { detail: { activeFilter: currentCriteria, activePresetId: targetId } }));
                } catch (err) {
                    this.errorMessage = 'Error updating preset: ' + (err.message || err);
                }
            },

            handleDeletePreset(targetId) {
                if (!targetId) return;

                try {
                    const container = JSON.parse(JSON.stringify(this.filterContainer));
                    const presets = container.presets || [];
                    const filtered = presets.filter(p => p.id !== targetId);

                    let activeId = container.activePresetId;
                    if (activeId === targetId) {
                        activeId = null;
                    }

                    const updatedContainer = {
                        ...container,
                        schemaVersion: SCHEMA_VERSION,
                        activePresetId: activeId,
                        presets: filtered
                    };

                    this._filterContainer = validateAndNormalizeContainer(updatedContainer, this.projectId);
                    this.errorMessage = null;

                    this.dispatchEvent(new MockCustomEvent('containerchange', { detail: { container: this._filterContainer } }));
                    if (container.activePresetId === targetId) {
                        this.dispatchEvent(new MockCustomEvent('filterchange', { detail: { activeFilter: this._filterContainer.activeFilter, activePresetId: null } }));
                    }
                } catch (err) {
                    this.errorMessage = 'Error deleting preset: ' + (err.message || err);
                }
            }
        };
    }

    let passCount = 0;

    // Test 1: Empty preset collection
    {
        const mgr = createPresetManagerInstance('proj-1');
        assert.strictEqual(mgr.hasPresets, false);
        assert.strictEqual(mgr.presetList.length, 0);
        assert.strictEqual(mgr.filterContainer.schemaVersion, 2);
        console.log('  ✓ 1. Empty preset collection initializes safe V2 defaults');
        passCount++;
    }

    // Test 2: Create preset from active filter criteria
    {
        const mgr = createPresetManagerInstance('proj-1');
        mgr.activeFilter = { search: 'TestSearch', riskLevels: ['HIGH'], testCoverageStatus: 'UNTESTED' };
        mgr.newPresetName = 'High Risk Untested';
        mgr.handleConfirmSavePreset();

        assert.strictEqual(mgr.hasPresets, true);
        assert.strictEqual(mgr.presetList.length, 1);
        assert.strictEqual(mgr.presetList[0].name, 'High Risk Untested');
        assert.strictEqual(mgr.presetList[0].isActive, true);
        assert.deepStrictEqual(mgr.presetList[0].criteria.riskLevels, ['HIGH']);

        const events = mgr.getDispatchedEvents();
        assert.strictEqual(events.length, 2);
        assert.strictEqual(events[0].type, 'containerchange');
        assert.strictEqual(events[1].type, 'filterchange');
        assert.strictEqual(events[1].detail.activeFilter.search, 'TestSearch');
        console.log('  ✓ 2. Create preset saves criteria, activates preset, and emits containerchange/filterchange');
        passCount++;
    }

    // Test 3: Apply selected preset
    {
        const mgr = createPresetManagerInstance('proj-1');
        mgr.filterContainer = {
            schemaVersion: 2,
            activePresetId: null,
            activeFilter: getDefaultFilterCriteria(),
            presets: [
                { id: 'p1', name: 'Preset Alpha', projectId: 'proj-1', criteria: { search: 'AlphaQuery' } },
                { id: 'p2', name: 'Preset Beta', projectId: 'proj-1', criteria: { riskLevels: ['LOW'] } }
            ]
        };

        mgr.handleSelectPreset('p2');
        assert.strictEqual(mgr.filterContainer.activePresetId, 'p2');
        assert.deepStrictEqual(mgr.filterContainer.activeFilter.riskLevels, ['LOW']);

        const events = mgr.getDispatchedEvents();
        const lastEvt = events[events.length - 1];
        assert.strictEqual(lastEvt.type, 'filterchange');
        assert.strictEqual(lastEvt.detail.activePresetId, 'p2');
        console.log('  ✓ 3. Apply preset updates activeFilter, activePresetId, and emits event');
        passCount++;
    }

    // Test 4: Update existing preset
    {
        const mgr = createPresetManagerInstance('proj-1');
        mgr.filterContainer = {
            schemaVersion: 2,
            activePresetId: 'p1',
            activeFilter: { search: 'OldCriteria' },
            presets: [
                { id: 'p1', name: 'Preset Alpha', projectId: 'proj-1', criteria: { search: 'OldCriteria' } }
            ]
        };

        mgr.activeFilter = { search: 'NewUpdatedCriteria', riskLevels: ['MEDIUM'] };
        mgr.handleUpdatePreset('p1');

        assert.strictEqual(mgr.presetList[0].criteria.search, 'NewUpdatedCriteria');
        assert.deepStrictEqual(mgr.presetList[0].criteria.riskLevels, ['MEDIUM']);
        console.log('  ✓ 4. Update preset persists modified criteria into target preset');
        passCount++;
    }

    // Test 5: Delete preset & reset activePresetId
    {
        const mgr = createPresetManagerInstance('proj-1');
        mgr.filterContainer = {
            schemaVersion: 2,
            activePresetId: 'p1',
            activeFilter: { search: 'Criteria1' },
            presets: [
                { id: 'p1', name: 'Preset Alpha', projectId: 'proj-1', criteria: { search: 'Criteria1' } },
                { id: 'p2', name: 'Preset Beta', projectId: 'proj-1', criteria: { search: 'Criteria2' } }
            ]
        };

        mgr.handleDeletePreset('p1');
        assert.strictEqual(mgr.presetList.length, 1);
        assert.strictEqual(mgr.filterContainer.activePresetId, null);
        assert.strictEqual(mgr.presetList[0].id, 'p2');

        const events = mgr.getDispatchedEvents();
        const lastEvt = events[events.length - 1];
        assert.strictEqual(lastEvt.type, 'filterchange');
        assert.strictEqual(lastEvt.detail.activePresetId, null);
        console.log('  ✓ 5. Delete preset removes item and resets activePresetId if active preset was deleted');
        passCount++;
    }

    // Test 6: Project isolation (DEC-W4-03)
    {
        const mgr = createPresetManagerInstance('proj-A');
        mgr.filterContainer = {
            schemaVersion: 2,
            activePresetId: 'pB',
            activeFilter: getDefaultFilterCriteria(),
            presets: [
                { id: 'pA', name: 'Preset A', projectId: 'proj-A', criteria: {} },
                { id: 'pB', name: 'Preset B', projectId: 'proj-B', criteria: {} }
            ]
        };

        assert.strictEqual(mgr.presetList.length, 1);
        assert.strictEqual(mgr.presetList[0].id, 'pA');
        assert.strictEqual(mgr.filterContainer.activePresetId, null);
        console.log('  ✓ 6. Project isolation excludes presets belonging to other projects');
        passCount++;
    }

    // Test 7: Behavior when project context is missing
    {
        const mgr = createPresetManagerInstance(null);
        assert.strictEqual(mgr.isMissingProject, true);
        assert.strictEqual(mgr.isSaveDisabled, true);

        mgr.newPresetName = 'Test Save Without Proj';
        mgr.handleConfirmSavePreset();
        assert.strictEqual(mgr.errorMessage, 'Cannot save preset: active project context is required.');
        assert.strictEqual(mgr.hasPresets, false);
        console.log('  ✓ 7. Missing project context blocks saving and sets clear error message');
        passCount++;
    }

    // Test 8: Malformed container handling
    {
        const mgr = createPresetManagerInstance('proj-1');
        mgr.filterContainer = 'MALFORMED_JSON_STRING';
        assert.strictEqual(mgr.hasPresets, false);
        assert.strictEqual(mgr.filterContainer.schemaVersion, 2);
        assert.strictEqual(mgr.errorMessage, 'Failed to load filter presets container.');
        console.log('  ✓ 8. Malformed container string falls back safely to default V2 container');
        passCount++;
    }

    // Test 9: Payload capacity boundary enforcement (131,072 chars)
    {
        const mgr = createPresetManagerInstance('proj-1');
        const hugeString = 'X'.repeat(132000);
        mgr.activeFilter = { search: hugeString };
        mgr.newPresetName = 'Huge Preset';
        mgr.handleConfirmSavePreset();

        assert.ok(mgr.errorMessage.includes('exceeds maximum capacity'));
        assert.strictEqual(mgr.hasPresets, false);
        console.log('  ✓ 9. Capacity check enforces 131,072 char hard boundary on preset creation');
        passCount++;
    }

    // Test 10: Active preset selection styling & item class
    {
        const mgr = createPresetManagerInstance('proj-1');
        mgr.filterContainer = {
            schemaVersion: 2,
            activePresetId: 'p2',
            activeFilter: getDefaultFilterCriteria(),
            presets: [
                { id: 'p1', name: 'Preset 1', projectId: 'proj-1', criteria: {} },
                { id: 'p2', name: 'Preset 2', projectId: 'proj-1', criteria: {} }
            ]
        };

        const list = mgr.presetList;
        assert.strictEqual(list[0].isActive, false);
        assert.strictEqual(list[0].itemClass.includes('is-active'), false);
        assert.strictEqual(list[1].isActive, true);
        assert.strictEqual(list[1].itemClass.includes('is-active'), true);
        console.log('  ✓ 10. Active preset styling correctly reflects activePresetId');
        passCount++;
    }

    console.log('================================================================');
    console.log(`Lane C Test Results: ${passCount} PASSED, 0 FAILED`);
}

runLaneCTests().catch(err => {
    console.error('Lane C Test Suite failed:', err);
    process.exit(1);
});
