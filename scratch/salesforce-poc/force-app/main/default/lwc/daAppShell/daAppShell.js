import { LightningElement, api, track } from 'lwc';
import getUserPreference from '@salesforce/apex/DAUserPreferenceController.getUserPreference';
import saveUserPreference from '@salesforce/apex/DAUserPreferenceController.saveUserPreference';

const DEFAULT_VIEW_MODE = 'graph';
const DEFAULT_LAYOUT_MODE = 'cose'; // Approved fallback layout per DEC-W3-05
const APPROVED_VIEWS = ['graph', 'matrix', 'findings'];
const MAX_PAYLOAD_SIZE = 131072;

// Approved v1 filter preset fallback criteria schema (DEC-W3-01)
const DEFAULT_FILTER_PRESET_CONFIG = {
    $schema: 'https://dependency-analyzer.salesforce.com/schemas/v1/filter-preset.json',
    version: 1,
    activePresetId: 'default-empty',
    presets: [
        {
            id: 'default-empty',
            displayName: 'Default View (All Components)',
            isDefault: true,
            updatedAt: new Date().toISOString(),
            criteria: {
                searchQuery: '',
                nodeTypes: [],
                coverageStatus: [],
                riskLevels: [],
                layers: [],
                includeTestNodes: true,
                includeExternalNodes: true
            }
        }
    ],
    quickFilters: {
        hideTestNodes: false,
        hideIsolatedNodes: false,
        highlightCyclesOnly: false
    }
};

export default class DaAppShell extends LightningElement {
    @api activeProjectId = null;
    @api activeProjectKey = null;

    @track activeView = DEFAULT_VIEW_MODE;
    @track activeLayout = DEFAULT_LAYOUT_MODE;
    @track filtersJson = JSON.stringify(DEFAULT_FILTER_PRESET_CONFIG);
    @track filterConfig = DEFAULT_FILTER_PRESET_CONFIG;
    @track selectedNodeId = null;

    @track isLoadingPreferences = false;
    @track preferenceError = null;

    currentPrefRequestId = 0;
    isInitializingPreferences = false;
    lastSavedPreferences = {
        viewMode: null,
        layoutMode: null,
        filtersJson: null
    };

    connectedCallback() {
        if (this.activeProjectId) {
            this.loadUserPreferences(this.activeProjectId);
        }
    }

    disconnectedCallback() {
        // Discard any in-flight asynchronous operations
        this.currentPrefRequestId++;
    }

    // View Navigation getters (FEAT-SHELL-01)
    get isGraphView() {
        return this.activeView === 'graph';
    }

    get isMatrixView() {
        return this.activeView === 'matrix';
    }

    get isFindingsView() {
        return this.activeView === 'findings';
    }

    get graphTabClass() {
        return `slds-tabs_default__item${this.isGraphView ? ' slds-is-active' : ''}`;
    }

    get matrixTabClass() {
        return `slds-tabs_default__item${this.isMatrixView ? ' slds-is-active' : ''}`;
    }

    get findingsTabClass() {
        return `slds-tabs_default__item${this.isFindingsView ? ' slds-is-active' : ''}`;
    }

    get graphTabIndex() {
        return this.isGraphView ? 0 : -1;
    }

    get matrixTabIndex() {
        return this.isMatrixView ? 0 : -1;
    }

    get findingsTabIndex() {
        return this.isFindingsView ? 0 : -1;
    }

    get activeViewLabel() {
        switch (this.activeView) {
            case 'matrix':
                return 'Dependency Matrix';
            case 'findings':
                return 'Findings & Alerts';
            case 'graph':
            default:
                return 'Graph Viewer';
        }
    }

    get displayLayoutMode() {
        return this.activeLayout || DEFAULT_LAYOUT_MODE;
    }

    // Header & Status Banner getters (FEAT-SHELL-02)
    get displayProjectKey() {
        return this.activeProjectKey || (this.activeProjectId ? this.activeProjectId : 'None Selected');
    }

    get displaySelectedNode() {
        return this.selectedNodeId || 'None';
    }

    get statusText() {
        return this.activeProjectId ? 'Active' : 'No Project';
    }

    get statusBadgeClass() {
        return this.activeProjectId ? 'slds-badge slds-theme_success' : 'slds-badge slds-theme_warning';
    }

    // Load User Preferences from Apex Controller (FEAT-DATA-03)
    async loadUserPreferences(projectId) {
        if (!projectId) {
            this.resetPreferencesToDefaults();
            return;
        }

        const requestId = ++this.currentPrefRequestId;
        this.isLoadingPreferences = true;
        this.preferenceError = null;
        this.isInitializingPreferences = true;

        try {
            const pref = await getUserPreference({ projectId: projectId });

            // Stale check: reject response if project changed or newer request initiated
            if (requestId !== this.currentPrefRequestId || this.activeProjectId !== projectId) {
                return;
            }

            if (pref) {
                // 1. Active View Mode Restoration
                if (pref.Active_View_Mode__c && APPROVED_VIEWS.includes(pref.Active_View_Mode__c)) {
                    this.activeView = pref.Active_View_Mode__c;
                } else {
                    this.activeView = DEFAULT_VIEW_MODE;
                }

                // 2. Layout Mode Restoration
                if (pref.Active_Layout_Mode__c && typeof pref.Active_Layout_Mode__c === 'string') {
                    this.activeLayout = pref.Active_Layout_Mode__c;
                } else {
                    this.activeLayout = DEFAULT_LAYOUT_MODE;
                }

                // 3. Versioned Filter Preset Schema Restoration (DEC-W3-01)
                if (pref.Filters_JSON__c) {
                    try {
                        const parsed = JSON.parse(pref.Filters_JSON__c);
                        if (parsed && typeof parsed === 'object' && parsed.version === 1) {
                            this.filtersJson = pref.Filters_JSON__c;
                            this.filterConfig = parsed;
                        } else {
                            // Unsupported schema version or structure: apply safe default without overwriting DB
                            this.filtersJson = JSON.stringify(DEFAULT_FILTER_PRESET_CONFIG);
                            this.filterConfig = DEFAULT_FILTER_PRESET_CONFIG;
                        }
                    } catch (e) {
                        // Malformed JSON: apply safe default fallback without crashing app or overwriting DB
                        this.filtersJson = JSON.stringify(DEFAULT_FILTER_PRESET_CONFIG);
                        this.filterConfig = DEFAULT_FILTER_PRESET_CONFIG;
                    }
                } else {
                    this.filtersJson = JSON.stringify(DEFAULT_FILTER_PRESET_CONFIG);
                    this.filterConfig = DEFAULT_FILTER_PRESET_CONFIG;
                }

                // Update baseline for deduplication
                this.lastSavedPreferences = {
                    viewMode: pref.Active_View_Mode__c || null,
                    layoutMode: pref.Active_Layout_Mode__c || null,
                    filtersJson: pref.Filters_JSON__c || null
                };
            } else {
                // No existing preference record: apply safe defaults
                this.resetPreferencesToDefaults();
            }
        } catch (err) {
            if (requestId === this.currentPrefRequestId && this.activeProjectId === projectId) {
                // Non-blocking load error: fallback safely to defaults
                this.preferenceError = 'Failed to load user preferences: ' + (err.body ? err.body.message : err.message || err);
                this.resetPreferencesToDefaults();
            }
        } finally {
            if (requestId === this.currentPrefRequestId) {
                this.isLoadingPreferences = false;
                this.isInitializingPreferences = false;
            }
        }
    }

    resetPreferencesToDefaults() {
        this.activeView = DEFAULT_VIEW_MODE;
        this.activeLayout = DEFAULT_LAYOUT_MODE;
        this.filtersJson = JSON.stringify(DEFAULT_FILTER_PRESET_CONFIG);
        this.filterConfig = DEFAULT_FILTER_PRESET_CONFIG;
        this.lastSavedPreferences = {
            viewMode: null,
            layoutMode: null,
            filtersJson: null
        };
    }

    // Persist User Changes via Apex Controller with Null Partial-Update Semantics (FEAT-DATA-03)
    async savePreferenceChange(changes = {}) {
        if (!this.activeProjectId || this.isInitializingPreferences) {
            return;
        }

        const viewMode = changes.viewMode !== undefined ? changes.viewMode : null;
        const layoutMode = changes.layoutMode !== undefined ? changes.layoutMode : null;
        const filtersJson = changes.filtersJson !== undefined ? changes.filtersJson : null;

        // Save Deduplication: suppress saving if changed values match last saved baseline
        if (
            (viewMode === null || viewMode === this.lastSavedPreferences.viewMode) &&
            (layoutMode === null || layoutMode === this.lastSavedPreferences.layoutMode) &&
            (filtersJson === null || filtersJson === this.lastSavedPreferences.filtersJson)
        ) {
            return;
        }

        // Validate payload length bounds if filtersJson is present
        if (filtersJson !== null && filtersJson.length > MAX_PAYLOAD_SIZE) {
            this.preferenceError = 'Filters JSON payload exceeds maximum allowed length of 131,072 characters.';
            return;
        }

        const saveProjId = this.activeProjectId;

        try {
            // Respect Prompt 3A null-coalescing semantics:
            // Explicitly pass `null` for unchanged optional fields (including positionsJson and zoomPanJson)
            const result = await saveUserPreference({
                projectId: saveProjId,
                viewMode: viewMode,
                layoutMode: layoutMode,
                positionsJson: null,
                filtersJson: filtersJson,
                zoomPanJson: null
            });

            // Update save baseline if active project has not switched during async save
            if (this.activeProjectId === saveProjId && result) {
                if (viewMode !== null) this.lastSavedPreferences.viewMode = result.Active_View_Mode__c;
                if (layoutMode !== null) this.lastSavedPreferences.layoutMode = result.Active_Layout_Mode__c;
                if (filtersJson !== null) this.lastSavedPreferences.filtersJson = result.Filters_JSON__c;
                this.preferenceError = null;
            }
        } catch (err) {
            if (this.activeProjectId === saveProjId) {
                this.preferenceError = 'Failed to save preference: ' + (err.body ? err.body.message : err.message || err);
            }
        }
    }

    // View Switching Handlers (FEAT-SHELL-01 & FEAT-DATA-03)
    selectGraphView() {
        this.switchView('graph');
    }

    selectMatrixView() {
        this.switchView('matrix');
    }

    selectFindingsView() {
        this.switchView('findings');
    }

    switchView(targetView) {
        if (this.activeView !== targetView && APPROVED_VIEWS.includes(targetView)) {
            this.activeView = targetView;
            // Switching views preserves activeProjectId and selectedNodeId context
            this.savePreferenceChange({ viewMode: targetView });
        }
    }

    // Layout Change Handler (FEAT-DATA-03)
    handleLayoutSelect(event) {
        const selectedLayout = (event.detail && event.detail.layoutMode) || event.target.value;
        if (selectedLayout && this.activeLayout !== selectedLayout) {
            this.activeLayout = selectedLayout;
            this.savePreferenceChange({ layoutMode: selectedLayout });
        }
    }

    // Filter Change Handler (FEAT-DATA-03)
    handleFilterChange(event) {
        const newFiltersJson = event.detail ? event.detail.filtersJson : null;
        if (newFiltersJson && this.filtersJson !== newFiltersJson) {
            try {
                const parsed = JSON.parse(newFiltersJson);
                if (parsed && typeof parsed === 'object' && parsed.version === 1) {
                    this.filtersJson = newFiltersJson;
                    this.filterConfig = parsed;
                    this.savePreferenceChange({ filtersJson: newFiltersJson });
                }
            } catch (e) {
                // Invalid JSON criteria update rejected
                this.preferenceError = 'Invalid filter JSON criteria format.';
            }
        }
    }

    // Project Context Handler (FEAT-SHELL-03 & FEAT-DATA-03)
    handleProjectChange(event) {
        const detail = event.detail || {};
        const newProjectId = detail.projectId || null;
        const newProjectKey = detail.projectKey || null;

        if (this.activeProjectId !== newProjectId) {
            this.activeProjectId = newProjectId;
            this.activeProjectKey = newProjectKey;
            // Clear node selection when changing projects
            this.selectedNodeId = null;
            this.preferenceError = null;

            // Load preferences for newly selected project
            if (this.activeProjectId) {
                this.loadUserPreferences(this.activeProjectId);
            } else {
                this.resetPreferencesToDefaults();
            }
        }
    }

    // Node Selection Handler (Preserves invariant SELECTION ≠ NAVIGATION)
    handleNodeSelect(event) {
        const detail = event.detail || {};
        this.selectedNodeId = detail.nodeId || null;
        // Node selection does NOT alter activeProjectId, activeView, or trigger preference save
    }
}
