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
const APPROVED_VIEWS = ['graph', 'matrix', 'findings'];

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

    connectedCallback() {
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
        }
    }

    // Node Selection Handler (Preserves invariant SELECTION ≠ NAVIGATION)
    handleNodeSelect(event) {
        const detail = event.detail || {};
        this.selectedNodeId = detail.nodeId || null;
        // Node selection does NOT alter activeProjectId, activeView, or trigger preference save
    }
}
