import { LightningElement, api, track } from 'lwc';
import getUserPreference from '@salesforce/apex/DAUserPreferenceController.getUserPreference';
import saveUserPreference from '@salesforce/apex/DAUserPreferenceController.saveUserPreference';
import getLatestGraphMetadataForProject from '@salesforce/apex/DAGraphController.getLatestGraphMetadataForProject';
import getGraphChunks from '@salesforce/apex/DAGraphController.getGraphChunks';
import {
    reassembleChunks,
    validatePayloadIntegrity,
    verifyChunkSequence
} from 'c/daGraphPayloadLoader';
import {
    SCHEMA_VERSION,
    MAX_PAYLOAD_SIZE,
    getDefaultFilterCriteria,
    getDefaultFilterContainer,
    normalizeFilterCriteria,
    migrateV1ToV2Container,
    validateAndNormalizeContainer,
    serializeFilterContainer
} from './daFilterSchema.js';

const DEFAULT_VIEW_MODE = 'graph';
const DEFAULT_LAYOUT_MODE = 'cose'; // Approved fallback layout per DEC-W3-05
const APPROVED_VIEWS = [
    'graph',
    'matrix',
    'findings',
    'dashboard',
    'history',
    'diagnostics',
    'hotspots',
    'radar',
    'treemap',
    'subway',
    'dna',
    'river'
];

const DEFAULT_FILTER_PRESET_CONFIG = getDefaultFilterContainer();

/**
 * Enforces strict project scoping per DEC-W4-03 at the shell boundary:
 * 1. For a known current project:
 *    - Retain only presets explicitly associated with that project (p.projectId === projectId).
 *    - Exclude presets associated with another project.
 *    - Exclude unscoped presets (!p.projectId).
 *    - Do not silently assign an unscoped preset to the current project.
 *    - Do not leak presets between projects.
 * 2. For missing or invalid project context:
 *    - Expose zero project-scoped presets.
 * 3. Does not mutate the persisted record during read/filtering.
 */
function enforceStrictProjectScoping(container, currentProjectId) {
    if (!container || typeof container !== 'object') {
        return getDefaultFilterContainer();
    }

    const rawPresets = Array.isArray(container.presets) ? container.presets : [];
    const activeFilter = normalizeFilterCriteria(container.activeFilter);

    if (!currentProjectId) {
        return {
            schemaVersion: SCHEMA_VERSION,
            activePresetId: null,
            activeFilter,
            presets: []
        };
    }

    // Filter strictly to presets with explicit matching projectId
    // Presets with missing, empty, or foreign projectId are excluded
    const strictlyScopedPresets = rawPresets.filter(p => {
        return p && typeof p === 'object' && p.projectId && p.projectId === currentProjectId;
    });

    let activePresetId = container.activePresetId || null;
    if (activePresetId && !strictlyScopedPresets.some(p => p.id === activePresetId)) {
        activePresetId = null;
    }

    return {
        schemaVersion: SCHEMA_VERSION,
        activePresetId,
        activeFilter,
        presets: strictlyScopedPresets
    };
}

export default class DaAppShell extends LightningElement {
    @api activeProjectId = null;
    @api activeProjectKey = null;

    @track activeView = DEFAULT_VIEW_MODE;
    @track activeLayout = DEFAULT_LAYOUT_MODE;
    @track filtersJson = JSON.stringify(DEFAULT_FILTER_PRESET_CONFIG);
    @track filterConfig = DEFAULT_FILTER_PRESET_CONFIG;
    @track activeFilterCriteriaState = getDefaultFilterCriteria();
    @track selectedNodeId = null;

    // Supporting Modal & Overlay Surfaces (Non-View Classification)
    @track isComparisonModalOpen = false;
    @track comparisonBaseRunId = '';
    @track comparisonTargetRunId = '';
    @track isPresetManagerVisible = false;

    @track isLoadingPreferences = false;
    @track preferenceError = null;

    // Shared Graph Payload state (Phase 2C Requirement A)
    @track activeGraphPayload = null;
    @track isLoadingGraph = false;
    @track graphError = null;

    currentPrefRequestId = 0;
    currentGraphRequestId = 0;
    isInitializingPreferences = false;
    graphChunkPageSize = 5;

    lastSavedPreferences = {
        viewMode: null,
        layoutMode: null,
        filtersJson: null
    };

    // Deep-Link URL State Synchronization (REM-04)
    _urlStateVersion = 0;
    _isSynchronizingUrl = false;
    _currentUrlState = {};
    _currentPageReference = null;

    connectedCallback() {
        // Inspect window.location if present for cold start deep-linking
        if (typeof window !== 'undefined' && window.location && window.location.search) {
            try {
                const params = new URLSearchParams(window.location.search);
                const rawState = {};
                for (const [k, v] of params.entries()) {
                    if (k.startsWith('c__')) rawState[k] = v;
                }
                if (Object.keys(rawState).length > 0) {
                    this.restoreStateFromUrl(rawState, 1);
                }
            } catch (e) {}
        }
        if (this.activeProjectId) {
            this.loadUserPreferences(this.activeProjectId);
            this.loadGraphPayload(this.activeProjectId);
        }
    }

    disconnectedCallback() {
        // Discard any in-flight asynchronous operations
        this.currentPrefRequestId++;
        this.currentGraphRequestId++;
    }

    // View Navigation getters (FEAT-SHELL-01 & FEAT-SHELL-02)
    get activeViewMode() {
        return this.activeView;
    }

    get isGraphView() {
        return this.activeView === 'graph';
    }

    get isMatrixView() {
        return this.activeView === 'matrix';
    }

    get isFindingsView() {
        return this.activeView === 'findings';
    }

    get isDashboardView() {
        return this.activeView === 'dashboard';
    }

    get isHistoryView() {
        return this.activeView === 'history';
    }

    get isDiagnosticsView() {
        return this.activeView === 'diagnostics';
    }

    get isHotspotsView() {
        return this.activeView === 'hotspots';
    }

    get isRadarView() {
        return this.activeView === 'radar';
    }

    get isTreemapView() {
        return this.activeView === 'treemap';
    }

    get isSubwayView() {
        return this.activeView === 'subway';
    }

    get isDnaView() {
        return this.activeView === 'dna';
    }

    get isRiverView() {
        return this.activeView === 'river';
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

    get dashboardTabClass() {
        return `slds-tabs_default__item${this.isDashboardView ? ' slds-is-active' : ''}`;
    }

    get historyTabClass() {
        return `slds-tabs_default__item${this.isHistoryView ? ' slds-is-active' : ''}`;
    }

    get diagnosticsTabClass() {
        return `slds-tabs_default__item${this.isDiagnosticsView ? ' slds-is-active' : ''}`;
    }

    get hotspotsTabClass() {
        return `slds-tabs_default__item${this.isHotspotsView ? ' slds-is-active' : ''}`;
    }

    get radarTabClass() {
        return `slds-tabs_default__item${this.isRadarView ? ' slds-is-active' : ''}`;
    }

    get treemapTabClass() {
        return `slds-tabs_default__item${this.isTreemapView ? ' slds-is-active' : ''}`;
    }

    get subwayTabClass() {
        return `slds-tabs_default__item${this.isSubwayView ? ' slds-is-active' : ''}`;
    }

    get dnaTabClass() {
        return `slds-tabs_default__item${this.isDnaView ? ' slds-is-active' : ''}`;
    }

    get riverTabClass() {
        return `slds-tabs_default__item${this.isRiverView ? ' slds-is-active' : ''}`;
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

    get dashboardTabIndex() {
        return this.isDashboardView ? 0 : -1;
    }

    get historyTabIndex() {
        return this.isHistoryView ? 0 : -1;
    }

    get diagnosticsTabIndex() {
        return this.isDiagnosticsView ? 0 : -1;
    }

    get hotspotsTabIndex() {
        return this.isHotspotsView ? 0 : -1;
    }

    get radarTabIndex() {
        return this.isRadarView ? 0 : -1;
    }

    get treemapTabIndex() {
        return this.isTreemapView ? 0 : -1;
    }

    get subwayTabIndex() {
        return this.isSubwayView ? 0 : -1;
    }

    get dnaTabIndex() {
        return this.isDnaView ? 0 : -1;
    }

    get riverTabIndex() {
        return this.isRiverView ? 0 : -1;
    }

    get activeViewLabel() {
        switch (this.activeView) {
            case 'matrix':
                return 'Dependency Matrix';
            case 'findings':
                return 'Findings & Alerts';
            case 'dashboard':
                return 'Executive Dashboard';
            case 'history':
                return 'Analysis History';
            case 'diagnostics':
                return 'Architecture Diagnostics';
            case 'hotspots':
                return 'Hotspots & Risk';
            case 'radar':
                return 'Architecture Radar';
            case 'treemap':
                return 'Treemap View';
            case 'subway':
                return 'Subway Transit Map';
            case 'dna':
                return 'Architecture DNA Barcode';
            case 'river':
                return 'Dependency River';
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

    // =========================================================================
    // Shared Graph Payload Loading & Lifecycle (Phase 2C Requirement A)
    // =========================================================================
    async loadGraphPayload(projectId) {
        if (!projectId) {
            this.activeGraphPayload = null;
            this.isLoadingGraph = false;
            this.graphError = null;
            return;
        }

        const requestId = ++this.currentGraphRequestId;
        this.isLoadingGraph = true;
        this.graphError = null;

        try {
            const dto = await getLatestGraphMetadataForProject({ projectId: projectId });

            // Stale check: reject response if project changed or newer graph request initiated
            if (requestId !== this.currentGraphRequestId || this.activeProjectId !== projectId) {
                return;
            }

            if (!dto || !dto.runId) {
                this.graphError = 'No graph payload metadata found for this project.';
                this.activeGraphPayload = null;
                this.isLoadingGraph = false;
                return;
            }

            let jsonString = '';

            if (dto.isChunked && dto.totalChunks > 0) {
                const fetchedChunkStrings = [];
                let nextIndex = 0;

                while (nextIndex < dto.totalChunks) {
                    const chunkBatch = await getGraphChunks({
                        runId: dto.runId,
                        startIndex: nextIndex,
                        maxChunks: this.graphChunkPageSize,
                        projectId: projectId
                    });

                    if (requestId !== this.currentGraphRequestId || this.activeProjectId !== projectId) {
                        return; // Stale check during batch retrieval
                    }

                    if (!chunkBatch || chunkBatch.length === 0) {
                        throw new Error(`Failed to retrieve chunk batch starting at index ${nextIndex}`);
                    }

                    if (!verifyChunkSequence(chunkBatch, nextIndex)) {
                        throw new Error(`Sequence error detected in chunk batch starting at index ${nextIndex}`);
                    }

                    for (const c of chunkBatch) {
                        fetchedChunkStrings.push(c.Payload_Data__c);
                    }

                    nextIndex += chunkBatch.length;
                }

                jsonString = reassembleChunks(fetchedChunkStrings);
            } else if (dto.rawPayload) {
                jsonString = dto.rawPayload;
            }

            if (!jsonString) {
                this.graphError = 'No graph payload data found for this project.';
                this.activeGraphPayload = null;
                this.isLoadingGraph = false;
                return;
            }

            if (!validatePayloadIntegrity(jsonString)) {
                this.graphError = 'Invalid graph payload structure or corrupted JSON data.';
                this.activeGraphPayload = null;
                this.isLoadingGraph = false;
                return;
            }

            if (requestId !== this.currentGraphRequestId || this.activeProjectId !== projectId) {
                return; // Final stale check
            }

            const parsedGraph = JSON.parse(jsonString);
            this.activeGraphPayload = parsedGraph;
            this.graphError = null;
        } catch (err) {
            if (requestId === this.currentGraphRequestId && this.activeProjectId === projectId) {
                this.graphError = 'Failed to load graph payload: ' + (err.body ? err.body.message : err.message || err);
                this.activeGraphPayload = null;
            }
        } finally {
            if (requestId === this.currentGraphRequestId) {
                this.isLoadingGraph = false;
            }
        }
    }

    // =========================================================================
    // User Preference Lifecycle & Persistence (DEC-W4-01, DEC-W4-03)
    // =========================================================================
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

                // 3. Canonical V2 Filter Preset Schema Restoration (DEC-W4-01, DEC-W4-03)
                if (pref.Filters_JSON__c) {
                    try {
                        const parsed = JSON.parse(pref.Filters_JSON__c);
                        if (parsed && typeof parsed === 'object') {
                            // Enforce strict project scoping prior to storing in filterConfig
                            const strictlyScoped = enforceStrictProjectScoping(parsed, projectId);
                            const normalized = validateAndNormalizeContainer(strictlyScoped, projectId);
                            this.filtersJson = pref.Filters_JSON__c;
                            this.filterConfig = normalized;
                            this.activeFilterCriteriaState = normalized.activeFilter;
                        } else {
                            this.filtersJson = JSON.stringify(DEFAULT_FILTER_PRESET_CONFIG);
                            this.filterConfig = DEFAULT_FILTER_PRESET_CONFIG;
                            this.activeFilterCriteriaState = getDefaultFilterCriteria();
                        }
                    } catch (e) {
                        // Malformed JSON: apply safe default fallback without crashing app or overwriting DB
                        this.filtersJson = JSON.stringify(DEFAULT_FILTER_PRESET_CONFIG);
                        this.filterConfig = DEFAULT_FILTER_PRESET_CONFIG;
                        this.activeFilterCriteriaState = getDefaultFilterCriteria();
                    }
                } else {
                    this.filtersJson = JSON.stringify(DEFAULT_FILTER_PRESET_CONFIG);
                    this.filterConfig = DEFAULT_FILTER_PRESET_CONFIG;
                    this.activeFilterCriteriaState = getDefaultFilterCriteria();
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
        this.activeFilterCriteriaState = getDefaultFilterCriteria();
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
            // Null-coalescing semantics:
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

    selectDashboardView() {
        this.switchView('dashboard');
    }

    selectHistoryView() {
        this.switchView('history');
    }

    selectDiagnosticsView() {
        this.switchView('diagnostics');
    }

    selectHotspotsView() {
        this.switchView('hotspots');
    }

    selectRadarView() {
        this.switchView('radar');
    }

    selectTreemapView() {
        this.switchView('treemap');
    }

    selectSubwayView() {
        this.switchView('subway');
    }

    selectDnaView() {
        this.switchView('dna');
    }

    selectRiverView() {
        this.switchView('river');
    }

    handleViewChange(event) {
        const detail = event.detail || {};
        const targetView = detail.viewMode || detail.view;
        if (targetView && APPROVED_VIEWS.includes(targetView)) {
            this.switchView(targetView);
        }
    }

    switchView(targetView) {
        if (this.activeView !== targetView && APPROVED_VIEWS.includes(targetView)) {
            this.activeView = targetView;
            // Switching views preserves activeProjectId and selectedNodeId context
            this.savePreferenceChange({ viewMode: targetView });
            this.syncStateToUrl();
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

    // =========================================================================
    // Preset Manager Event Handlers (Phase 2C Requirement B & C)
    // =========================================================================

    /**
     * Event: 'filterchange' ({ activeFilter, activePresetId })
     * Responsibilities:
     * - Update shell active filter criteria state.
     * - Broadcast new criteria to Graph Viewer, Matrix, and Findings.
     * - Update activePresetId in in-memory filterConfig.
     * - MUST NOT persist the filter container to Apex merely because the active filter changed.
     */
    handleFilterChange(event) {
        const detail = event.detail || {};
        if (detail.activeFilter) {
            const normalized = normalizeFilterCriteria(detail.activeFilter);
            this.activeFilterCriteriaState = normalized;

            // Update in-memory container state to reflect activePresetId & activeFilter
            const currentContainer = this.filterConfig || getDefaultFilterContainer();
            const updated = {
                ...currentContainer,
                activePresetId: detail.activePresetId !== undefined ? detail.activePresetId : currentContainer.activePresetId,
                activeFilter: normalized
            };
            this.filterConfig = updated;
            this.syncStateToUrl();
            // Do NOT save preference here (filter broadcast only)
        }
    }

    /**
     * Event: 'containerchange' ({ container })
     * Responsibilities:
     * - Receive updated canonical V2 filter container.
     * - Validate and normalize via daFilterSchema & enforce strict project scoping.
     * - Update shell-owned filterConfig and filtersJson state.
     * - Persist updated container to Apex Filters_JSON__c.
     * - Preserve unrelated preference fields.
     */
    handleContainerChange(event) {
        const detail = event.detail || {};
        const incomingContainer = detail.container;
        if (!incomingContainer || typeof incomingContainer !== 'object') {
            return;
        }

        try {
            // First strictly scope presets to current project, excluding unscoped or foreign presets
            const strictlyScoped = enforceStrictProjectScoping(incomingContainer, this.activeProjectId);
            // Then validate and normalize container schema
            const validated = validateAndNormalizeContainer(strictlyScoped, this.activeProjectId);
            const serialized = serializeFilterContainer(validated);

            this.filterConfig = validated;
            this.filtersJson = serialized;
            if (validated.activeFilter) {
                this.activeFilterCriteriaState = validated.activeFilter;
            }

            // Persist the updated container
            this.savePreferenceChange({ filtersJson: serialized });
            this.syncStateToUrl();
        } catch (err) {
            this.preferenceError = 'Failed to persist filter container: ' + (err.message || err);
        }
    }

    // Active canonical filter criteria getter for child views
    get activeFilterCriteria() {
        return this.activeFilterCriteriaState || this.filterConfig?.activeFilter || getDefaultFilterCriteria();
    }

    // Strictly project-scoped filter container for Preset Manager
    get scopedFilterContainer() {
        return enforceStrictProjectScoping(this.filterConfig, this.activeProjectId);
    }

    // Active presets list scoped to the current project
    get activePresets() {
        return this.scopedFilterContainer?.presets || [];
    }

    // Active preset ID if one is currently active
    get activePresetId() {
        return this.scopedFilterContainer?.activePresetId || null;
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
            this.graphError = null;
            this.activeGraphPayload = null;

            // Load preferences and shared graph payload for newly selected project
            if (this.activeProjectId) {
                this.loadUserPreferences(this.activeProjectId);
                this.loadGraphPayload(this.activeProjectId);
            } else {
                this.resetPreferencesToDefaults();
                this.loadGraphPayload(null);
            }
            this.syncStateToUrl();
        }
    }

    get activeGraphNodes() {
        if (!this.activeGraphPayload || !Array.isArray(this.activeGraphPayload.nodes)) {
            return [];
        }
        return this.activeGraphPayload.nodes;
    }

    get activeFindings() {
        if (!this.activeGraphPayload || !Array.isArray(this.activeGraphPayload.findings)) {
            return [];
        }
        return this.activeGraphPayload.findings;
    }

    handleHeaderActionTrigger(event) {
        const action = event.detail?.action;
        if (action === 'history') {
            this.switchView('history');
        } else if (action === 'dashboard') {
            this.switchView('dashboard');
        } else if (action === 'compare') {
            // Compare action: preserve active project, route to history/compare and open comparison modal
            this.switchView('history');
            this.openComparisonModal();
        } else if (action === 'presets') {
            this.togglePresetManager();
        }
    }

    // =========================================================================
    // Supporting Modal & Overlay Surface Handlers (Non-View Classification)
    // =========================================================================

    openComparisonModal(baseRunId = '', targetRunId = '') {
        this.comparisonBaseRunId = baseRunId || '';
        this.comparisonTargetRunId = targetRunId || '';
        this.isComparisonModalOpen = true;
    }

    closeComparisonModal() {
        this.isComparisonModalOpen = false;
        this.comparisonBaseRunId = '';
        this.comparisonTargetRunId = '';
    }

    togglePresetManager() {
        this.isPresetManagerVisible = !this.isPresetManagerVisible;
    }

    closePresetManager() {
        this.isPresetManagerVisible = false;
    }

    handleComparisonEntitySelect(event) {
        const detail = event.detail || {};
        if (detail.entityId) {
            // Enforce SELECTION != NAVIGATION: select entity without navigating view
            this.selectedNodeId = detail.entityId;
        }
    }

    handleRunSelect(event) {
        const detail = event.detail || {};
        const runId = detail.runId || detail.analysisRunId;
        if (runId && this.activeProjectId) {
            // Reload graph payload for selected historical run if provided
            this.loadGraphPayload(this.activeProjectId);
        }
    }

    handleHeaderGlobalSearch(event) {
        const query = (event.detail?.query || '').toLowerCase().trim();
        if (query && this.activeGraphPayload?.nodes) {
            const match = this.activeGraphPayload.nodes.find(n =>
                (n.label && n.label.toLowerCase().includes(query)) ||
                (n.id && n.id.toLowerCase().includes(query))
            );
            if (match) {
                this.selectedNodeId = match.id;
            }
        }
    }

    handleLayerFilterChange(event) {
        const activeLayers = event.detail?.activeLayers;
        if (Array.isArray(activeLayers)) {
            this.handleFilterChange({
                detail: {
                    filterCriteria: {
                        ...this.activeFilterCriteria,
                        layers: activeLayers
                    }
                }
            });
        }
    }

    // Node Selection Handler (Preserves invariant SELECTION ≠ NAVIGATION)
    handleNodeSelect(event) {
        const detail = event.detail || {};
        this.selectedNodeId = detail.nodeId || null;
        this.syncStateToUrl();
        // Node selection does NOT alter activeProjectId, activeView, or trigger preference save
    }

    // =========================================================================
    // Deep-Link URL State Synchronization Methods (REM-04)
    // =========================================================================

    /**
     * Serializes shell state into a Lightning PageReference state dictionary.
     */
    serializeUrlState(options = {}) {
        const projId = options.projectId !== undefined ? options.projectId : this.activeProjectId;
        const vMode = options.viewMode !== undefined ? options.viewMode : this.activeView;
        const nId = options.nodeId !== undefined ? options.nodeId : this.selectedNodeId;
        const fCrit = options.filterCriteria !== undefined ? options.filterCriteria : this.activeFilterCriteria;

        const state = {};

        if (projId && typeof projId === 'string') {
            state.c__projectId = projId.trim();
        }

        if (vMode && APPROVED_VIEWS.includes(vMode)) {
            state.c__viewMode = vMode;
        } else {
            state.c__viewMode = DEFAULT_VIEW_MODE;
        }

        if (nId && typeof nId === 'string' && nId.trim() !== '') {
            state.c__nodeId = nId.trim();
        }

        if (fCrit && typeof fCrit === 'object') {
            if (fCrit.search && typeof fCrit.search === 'string' && fCrit.search.trim() !== '') {
                state.c__search = fCrit.search.trim();
            }
            if (Array.isArray(fCrit.layers) && fCrit.layers.length > 0) {
                state.c__layers = fCrit.layers.join(',');
            }
            if (Array.isArray(fCrit.riskLevels) && fCrit.riskLevels.length > 0) {
                state.c__risk = fCrit.riskLevels.join(',');
            }
            if (fCrit.testCoverageStatus && fCrit.testCoverageStatus !== 'ALL') {
                state.c__coverage = fCrit.testCoverageStatus;
            }
        }

        return state;
    }

    /**
     * Deserializes and validates a PageReference state dictionary.
     */
    deserializeUrlState(rawState = {}, currentVersion = 0) {
        if (currentVersion < this._urlStateVersion) {
            return { isStale: true };
        }
        this._urlStateVersion = currentVersion;

        const result = {
            isStale: false,
            projectId: null,
            viewMode: DEFAULT_VIEW_MODE,
            nodeId: null,
            filterCriteria: getDefaultFilterCriteria()
        };

        if (!rawState || typeof rawState !== 'object') {
            return result;
        }

        // 1. Project ID Sanitization
        if (rawState.c__projectId && typeof rawState.c__projectId === 'string') {
            const sanitized = rawState.c__projectId.trim();
            if (/^[a-zA-Z0-9_\\-]{3,50}$/.test(sanitized)) {
                result.projectId = sanitized;
            }
        }

        // 2. View Mode Sanitization
        if (rawState.c__viewMode && typeof rawState.c__viewMode === 'string') {
            const v = rawState.c__viewMode.trim().toLowerCase();
            if (APPROVED_VIEWS.includes(v)) {
                result.viewMode = v;
            } else {
                result.viewMode = DEFAULT_VIEW_MODE;
            }
        }

        // 3. Node ID Sanitization
        if (rawState.c__nodeId && typeof rawState.c__nodeId === 'string') {
            const n = rawState.c__nodeId.trim();
            if (n.length > 0 && n.length <= 255 && !/[<>"']/.test(n)) {
                result.nodeId = n;
            }
        }

        // 4. Filter Criteria Sanitization
        const criteria = { ...result.filterCriteria };
        if (rawState.c__search && typeof rawState.c__search === 'string') {
            criteria.search = rawState.c__search.replace(/[<>"']/g, '').trim();
        }
        if (rawState.c__layers && typeof rawState.c__layers === 'string') {
            criteria.layers = rawState.c__layers.split(',').map(s => s.trim()).filter(Boolean);
        }
        if (rawState.c__risk && typeof rawState.c__risk === 'string') {
            const risks = rawState.c__risk.split(',').map(s => s.trim().toUpperCase());
            criteria.riskLevels = risks.filter(r => ['HIGH', 'MEDIUM', 'LOW'].includes(r));
        }
        if (rawState.c__coverage && typeof rawState.c__coverage === 'string') {
            const cov = rawState.c__coverage.trim().toUpperCase();
            if (['COVERED', 'UNTESTED', 'AMBIGUOUS', 'UNKNOWN'].includes(cov)) {
                criteria.testCoverageStatus = cov;
            }
        }

        result.filterCriteria = normalizeFilterCriteria(criteria);
        return result;
    }

    /**
     * Restores application state from a URL PageReference state dictionary.
     */
    restoreStateFromUrl(state, incomingVersion = 0) {
        const deserialized = this.deserializeUrlState(state, incomingVersion);
        if (deserialized.isStale) {
            return;
        }

        // 1. Project Restoration
        if (deserialized.projectId && deserialized.projectId !== this.activeProjectId) {
            this.handleProjectChange({
                detail: {
                    projectId: deserialized.projectId,
                    projectKey: deserialized.projectId
                }
            });
        }

        // 2. View Mode Restoration
        if (deserialized.viewMode && APPROVED_VIEWS.includes(deserialized.viewMode)) {
            if (this.activeView !== deserialized.viewMode) {
                this.activeView = deserialized.viewMode;
            }
        }

        // 3. Node Selection Restoration (SELECTION != NAVIGATION)
        if (deserialized.nodeId !== undefined) {
            this.selectedNodeId = deserialized.nodeId;
        }

        // 4. Filter Restoration
        if (deserialized.filterCriteria) {
            this.activeFilterCriteriaState = deserialized.filterCriteria;
        }

        this._currentUrlState = { ...(state || {}) };
    }

    /**
     * Checks if current URL state is equal to proposed state to avoid redundant history entries.
     */
    isEqualUrlState(stateA, stateB) {
        if (!stateA || !stateB) return false;
        const keysA = Object.keys(stateA).filter(k => k.startsWith('c__'));
        const keysB = Object.keys(stateB).filter(k => k.startsWith('c__'));
        if (keysA.length !== keysB.length) return false;
        for (const k of keysA) {
            if (stateA[k] !== stateB[k]) return false;
        }
        return true;
    }

    /**
     * Synchronizes internal shell state to the URL.
     */
    syncStateToUrl() {
        const newState = this.serializeUrlState();
        if (this.isEqualUrlState(this._currentUrlState, newState)) {
            return;
        }

        this._isSynchronizingUrl = true;
        this._currentUrlState = newState;

        // In browser environments with window.history, use replaceState to prevent history clutter
        if (typeof window !== 'undefined' && window.history && typeof window.history.replaceState === 'function') {
            try {
                const url = new URL(window.location.href);
                // Clear existing c__ params
                Array.from(url.searchParams.keys()).forEach(key => {
                    if (key.startsWith('c__')) {
                        url.searchParams.delete(key);
                    }
                });
                // Set new c__ params
                Object.keys(newState).forEach(key => {
                    url.searchParams.set(key, newState[key]);
                });
                window.history.replaceState({ ...window.history.state, ...newState }, '', url.toString());
            } catch (e) {
                // Ignore URL parsing errors in restricted environments
            }
        }

        this._isSynchronizingUrl = false;
    }

}
