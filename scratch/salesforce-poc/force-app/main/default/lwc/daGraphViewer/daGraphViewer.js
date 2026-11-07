import { LightningElement, api, track } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import cytoscapeUrl from '@salesforce/resourceUrl/cytoscape';
import getLatestGraphMetadataForProject from '@salesforce/apex/DAGraphController.getLatestGraphMetadataForProject';
import getGraphChunks from '@salesforce/apex/DAGraphController.getGraphChunks';
import getUserPreference from '@salesforce/apex/DAUserPreferenceController.getUserPreference';
import saveUserPreference from '@salesforce/apex/DAUserPreferenceController.saveUserPreference';
import { reassembleChunks, validatePayloadIntegrity, verifyChunkSequence } from 'c/daGraphPayloadLoader';
import { computeArchitectureLayout } from 'c/daLayoutEngine';
import { matchesGraphNode, normalizeFilterCriteria } from 'c/daFilterSchema';

// Standard Cytoscape Layout Configuration Defaults conforming to CONTRACT-02 Section 4.1
const CYTOSCAPE_LAYOUT_DEFAULTS = {
    grid: {
        name: 'grid',
        fit: true,
        padding: 30,
        avoidOverlap: true,
        nodeDimensionsIncludeLabels: true,
        animate: false
    },
    circle: {
        name: 'circle',
        fit: true,
        padding: 30,
        avoidOverlap: true,
        radius: undefined,
        startAngle: (3 / 2) * Math.PI,
        counterclockwise: false,
        animate: false
    },
    breadthfirst: {
        name: 'breadthfirst',
        fit: true,
        directed: true,
        padding: 30,
        spacingFactor: 1.25,
        avoidOverlap: true,
        animate: false
    }
};

export default class DaGraphViewer extends LightningElement {
    _recordId = null;
    _filterCriteria = null;
    _rawGraphData = null;
    _userPref = null;
    _currentLayout = 'breadthfirst'; // Default standard layout

    @api
    get recordId() {
        return this._recordId;
    }
    set recordId(value) {
        const normalized = value || null;
        if (this._recordId !== normalized) {
            this._recordId = normalized;
            // 1. Immediately invalidate in-flight requests for prior project
            this.currentRequestId++;
            // 2. Immediately clear prior canvas, selection, and error state
            this.clearGraphState();
            this._rawGraphData = null;
            this._userPref = null;
            // 3. Initiate new fetch if component is DOM-attached/initialized and recordId is truthy
            if (this.cyInitialized && this._recordId) {
                this.fetchGraphData();
            }
        }
    }

    /**
     * Lane D: Filter criteria input from application shell.
     * Evaluates canonical filter criteria (search, risk, node type, layer, test coverage).
     * Applying filters MUST NOT alter or erase persisted graph positions or view state.
     */
    @api
    get filterCriteria() {
        return this._filterCriteria;
    }
    set filterCriteria(value) {
        this._filterCriteria = normalizeFilterCriteria(value);
        if (this._rawGraphData && this.cyInitialized && !this.isLoading) {
            this.applyFiltersToGraph();
        }
    }

    /**
     * Layout mode property (CONTRACT-02 canonical keys: 'grid', 'circle', 'breadthfirst', 'dagre', 'architecture').
     */
    @api
    get layoutMode() {
        return this._currentLayout;
    }
    set layoutMode(value) {
        const target = this.resolveLayoutMode(value);
        if (this._currentLayout !== target) {
            this._currentLayout = target;
            if (this.cyInstance && !this.isLoading) {
                this.applyLayout(target);
            }
        }
    }

    @track isLoading = true;
    @track error;
    @track selectedNodeId = null;
    cyInitialized = false;
    cyInstance = null;
    pageSize = 5;
    currentRequestId = 0;
    saveTimeout = null;
    isRestoringState = false;

    get gridButtonVariant() {
        return this._currentLayout === 'grid' ? 'brand' : 'neutral';
    }

    get circleButtonVariant() {
        return this._currentLayout === 'circle' ? 'brand' : 'neutral';
    }

    get breadthfirstButtonVariant() {
        return (this._currentLayout === 'breadthfirst' || this._currentLayout === 'architecture') ? 'brand' : 'neutral';
    }

    /**
     * Canonical layout resolution with graceful fallback for external/unavailable engines like Dagre.
     */
    resolveLayoutMode(mode) {
        if (!mode) return 'breadthfirst';
        const lower = String(mode).toLowerCase().trim();
        if (lower === 'dagre') {
            // Dagre is not bundled in LWC; fall back gracefully to breadthfirst per CONTRACT-02 §6.4
            return 'breadthfirst';
        }
        if (lower === 'grid' || lower === 'circle' || lower === 'breadthfirst') {
            return lower;
        }
        if (lower === 'architecture') {
            return 'architecture';
        }
        return 'breadthfirst';
    }

    handleLayoutChangeClick(event) {
        const selected = event.target ? event.target.value : null;
        if (!selected) return;
        this.setLayout(selected);
    }

    @api
    setLayout(newLayout) {
        const resolved = this.resolveLayoutMode(newLayout);
        this._currentLayout = resolved;

        if (this.cyInstance) {
            this.applyLayout(resolved);
        }

        // Notify parent without navigating
        this.dispatchEvent(new CustomEvent('layoutchange', {
            detail: { layout: resolved },
            bubbles: true,
            composed: true
        }));

        this.scheduleSaveState();
    }

    applyLayout(mode) {
        if (!this.cyInstance) return;

        if (mode === 'architecture') {
            if (this._rawGraphData && this.cyInstance.nodes) {
                const layoutResult = computeArchitectureLayout(this._rawGraphData.nodes || [], this._rawGraphData.edges || []);
                const posMap = layoutResult.positions || {};
                if (typeof this.cyInstance.batch === 'function') {
                    this.cyInstance.batch(() => {
                        this.cyInstance.nodes().forEach(node => {
                            const p = posMap[node.id()];
                            if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
                                node.position({ x: p.x, y: p.y });
                            }
                        });
                    });
                }
            }
            return;
        }

        const layoutConfig = CYTOSCAPE_LAYOUT_DEFAULTS[mode] || CYTOSCAPE_LAYOUT_DEFAULTS.breadthfirst;

        if (typeof this.cyInstance.layout === 'function') {
            try {
                const layout = this.cyInstance.layout(layoutConfig);
                if (layout && typeof layout.run === 'function') {
                    layout.run();
                }
            } catch (e) {
                // Graceful fallback to breadthfirst or preset if layout execution encounters error
            }
        }
    }

    clearGraphState() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        if (this.cyInstance) {
            try {
                this.cyInstance.destroy();
            } catch (e) {
                // Ignore destruction errors on unmounted containers
            }
            this.cyInstance = null;
        }
        this.selectedNodeId = null;
        this.error = null;
    }

    renderedCallback() {
        if (this.cyInitialized) {
            return;
        }
        this.cyInitialized = true;

        Promise.all([
            loadScript(this, cytoscapeUrl)
        ]).then(() => {
            if (this._recordId) {
                this.fetchGraphData();
            } else {
                this.isLoading = false;
            }
        }).catch(err => {
            this.error = 'Failed to load Cytoscape static resource: ' + (err.message || err);
            this.isLoading = false;
        });
    }

    async fetchGraphData() {
        if (!this._recordId) {
            this.error = 'No Project ID provided.';
            this.isLoading = false;
            return;
        }

        const requestId = ++this.currentRequestId;
        this.isLoading = true;
        this.error = null;

        try {
            const dto = await getLatestGraphMetadataForProject({ projectId: this._recordId });

            if (requestId !== this.currentRequestId || !this.cyInitialized) {
                return; // Stale request or component disconnected during fetch
            }

            if (!dto || !dto.runId) {
                this.error = 'No graph payload metadata found for this project.';
                this.isLoading = false;
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
                        maxChunks: this.pageSize,
                        projectId: this._recordId
                    });

                    if (requestId !== this.currentRequestId || !this.cyInitialized) {
                        return; // Stale request or component disconnected during batch retrieval
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
                this.error = 'No graph payload data found for this project.';
                this.isLoading = false;
                return;
            }

            if (!validatePayloadIntegrity(jsonString)) {
                this.error = 'Invalid graph payload structure or corrupted JSON data.';
                this.isLoading = false;
                return;
            }

            if (requestId !== this.currentRequestId || !this.cyInitialized) {
                return; // Final stale check before rendering
            }

            // Load saved user preference for active project (non-blocking)
            let userPref = null;
            try {
                userPref = await getUserPreference({ projectId: this._recordId });
            } catch (prefErr) {
                // Non-blocking fallback to default computed layout
            }

            if (requestId !== this.currentRequestId || !this.cyInitialized) {
                return; // Stale check post user preference retrieval
            }

            const graphData = JSON.parse(jsonString);
            this._rawGraphData = graphData;
            this._userPref = userPref;

            if (userPref && userPref.Active_Layout_Mode__c) {
                this._currentLayout = this.resolveLayoutMode(userPref.Active_Layout_Mode__c);
            }

            this.renderGraph(graphData, userPref);
        } catch (err) {
            if (requestId === this.currentRequestId && this.cyInitialized) {
                this.error = 'Error fetching graph data: ' + (err.body ? err.body.message : err.message || err);
                this.isLoading = false;
            }
        }
    }

    renderGraph(graphData, userPref) {
        try {
            if (this.cyInstance) {
                try {
                    this.cyInstance.destroy();
                } catch (e) {
                   // Ignore destruction errors
                }
                this.cyInstance = null;
            }
            const container = this.template ? this.template.querySelector('.cy-container') : null;

            const allNodes = graphData.nodes || [];
            const allEdges = graphData.edges || [];

            // Filter nodes based on active filter criteria if provided
            const matchingNodes = this._filterCriteria
                ? allNodes.filter(n => matchesGraphNode(n, this._filterCriteria))
                : allNodes;

            const matchingNodeIds = new Set(matchingNodes.map(n => n.id));

            // Only include edges whose both source and target match active node set
            const matchingEdges = allEdges.filter(e =>
                matchingNodeIds.has(e.source) && matchingNodeIds.has(e.target)
            );

            // Parse saved node positions if present
            let savedPositions = null;
            if (userPref && userPref.Positions_JSON__c) {
                try {
                    savedPositions = JSON.parse(userPref.Positions_JSON__c);
                } catch (e) {
                    savedPositions = null;
                }
            }

            // Parse saved zoom / pan if present
            let savedZoomPan = null;
            if (userPref && userPref.Zoom_Pan_JSON__c) {
                try {
                    savedZoomPan = JSON.parse(userPref.Zoom_Pan_JSON__c);
                } catch (e) {
                    savedZoomPan = null;
                }
            }

            // Compute deterministic architecture layout positions for complete node set
            // to ensure layout coordinate stability across filter toggles
            const layoutResult = computeArchitectureLayout(allNodes, allEdges);
            const computedPositions = layoutResult.positions || {};

            this.isRestoringState = true;

            const elements = [];
            matchingNodes.forEach(n => {
                let pos = computedPositions[n.id] || { x: 0, y: 0 };
                if (savedPositions && savedPositions[n.id]) {
                    const savedPos = savedPositions[n.id];
                    if (typeof savedPos.x === 'number' && Number.isFinite(savedPos.x) &&
                        typeof savedPos.y === 'number' && Number.isFinite(savedPos.y)) {
                        pos = { x: savedPos.x, y: savedPos.y };
                    }
                }
                elements.push({
                    data: {
                        id: n.id,
                        label: n.displayName || n.name || n.id,
                        layer: n.layer,
                        type: n.type,
                        risk: n.risk,
                        coverage: n.refactoringReadiness?.testCoverageStatus || 'UNKNOWN'
                    },
                    position: pos
                });
            });

            matchingEdges.forEach(e => {
                elements.push({
                    data: { id: e.id || `${e.source}-${e.target}`, source: e.source, target: e.target }
                });
            });

            /* global cytoscape */
            if (typeof cytoscape === 'function') {
                const layoutConfig = (savedPositions || this._currentLayout === 'architecture')
                    ? { name: 'preset', animate: false }
                    : (CYTOSCAPE_LAYOUT_DEFAULTS[this._currentLayout] || CYTOSCAPE_LAYOUT_DEFAULTS.breadthfirst);

                this.cyInstance = cytoscape({
                    container: container,
                    elements: elements,
                    style: [
                        {
                            selector: 'node',
                            style: {
                                'label': 'data(label)',
                                'background-color': '#0070d2',
                                'color': '#ffffff'
                            }
                        },
                        {
                            selector: 'node:selected',
                            style: {
                                'background-color': '#f2cf5b',
                                'border-width': 3,
                                'border-color': '#005fb2'
                            }
                        },
                        {
                            selector: 'edge',
                            style: {
                                'width': 2,
                                'line-color': '#b0adab',
                                'target-arrow-color': '#b0adab',
                                'target-arrow-shape': 'triangle',
                                'curve-style': 'bezier'
                            }
                        }
                    ],
                    layout: layoutConfig
                });

                // Restore saved viewport zoom and pan if present
                if (savedZoomPan) {
                    if (typeof savedZoomPan.zoom === 'number' && Number.isFinite(savedZoomPan.zoom) && typeof this.cyInstance.zoom === 'function') {
                        this.cyInstance.zoom(savedZoomPan.zoom);
                    }
                    if (savedZoomPan.pan && Number.isFinite(savedZoomPan.pan.x) && Number.isFinite(savedZoomPan.pan.y) && typeof this.cyInstance.pan === 'function') {
                        this.cyInstance.pan({ x: savedZoomPan.pan.x, y: savedZoomPan.pan.y });
                    }
                }

                // Maintain invariant: SELECTION != NAVIGATION
                // Node tap/click updates selection state only, without triggering URL navigation or re-render
                this.cyInstance.on('tap', 'node', (evt) => {
                    const node = evt.target;
                    this.selectedNodeId = node.id();
                    // Dispatch custom event for selection change if needed without navigating
                    this.dispatchEvent(new CustomEvent('nodeselect', { detail: { nodeId: node.id() } }));
                });

                // Persist user-dragged node coordinates on dragfree
                this.cyInstance.on('dragfree', 'node', () => {
                    this.scheduleSaveState();
                });

                // Persist viewport changes on zoom/pan
                this.cyInstance.on('viewport', () => {
                    this.scheduleSaveState();
                });
            } else {
                // Mock or container-less fallback for offline/test environments
                this.cyInstance = {
                    destroyed: false,
                    elements: elements,
                    currentLayout: this._currentLayout,
                    destroy() {
                        this.destroyed = true;
                    },
                    layout: (config) => {
                        this.currentLayout = config.name;
                        return { run: () => {} };
                    },
                    on: (event, selector, handler) => {}
                };
            }

            this.isRestoringState = false;
            this.isLoading = false;
        } catch (err) {
            this.error = 'Error initializing Cytoscape graph: ' + err.message;
            this.isLoading = false;
        }
    }

    /**
     * Re-renders or filters graph elements in-place when filterCriteria changes
     * without resetting positions or issuing a background save.
     */
    applyFiltersToGraph() {
        if (!this._rawGraphData) return;
        this.renderGraph(this._rawGraphData, this._userPref);
    }

    scheduleSaveState() {
        if (this.isRestoringState || !this._recordId || !this.cyInstance || this.cyInstance.destroyed) {
            return;
        }

        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        const saveProjId = this._recordId;
        const currentReq = this.currentRequestId;
        const activeLayout = this._currentLayout;

        this.saveTimeout = setTimeout(async () => {
            this.saveTimeout = null;

            if (currentReq !== this.currentRequestId || !this.cyInitialized || !this.cyInstance || saveProjId !== this._recordId) {
                return; // Stale request or project switched
            }

            try {
                const positions = {};
                if (typeof this.cyInstance.nodes === 'function') {
                    const cyNodes = this.cyInstance.nodes();
                    cyNodes.forEach(node => {
                        const id = node.id ? node.id() : null;
                        const pos = node.position ? node.position() : null;
                        if (id && pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
                            positions[id] = { x: pos.x, y: pos.y };
                        }
                    });
                }

                const positionsJson = Object.keys(positions).length > 0 ? JSON.stringify(positions) : null;

                let zoomPanJson = null;
                if (typeof this.cyInstance.zoom === 'function' && typeof this.cyInstance.pan === 'function') {
                    const z = this.cyInstance.zoom();
                    const p = this.cyInstance.pan();
                    if (Number.isFinite(z) && p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
                        zoomPanJson = JSON.stringify({ zoom: z, pan: { x: p.x, y: p.y } });
                    }
                }

                if (positionsJson && positionsJson.length > 131072) {
                    return;
                }
                if (zoomPanJson && zoomPanJson.length > 131072) {
                    return;
                }

                await saveUserPreference({
                    projectId: saveProjId,
                    viewMode: 'graph',
                    layoutMode: activeLayout,
                    positionsJson: positionsJson,
                    filtersJson: null,
                    zoomPanJson: zoomPanJson
                });
            } catch (err) {
                // Non-fatal background save error
            }
        }, 800);
    }

    disconnectedCallback() {
        this.currentRequestId++; // Invalidate pending requests immediately on disconnect
        this.cyInitialized = false; // Allow safe re-initialization on reconnect
        this.clearGraphState();
    }
}
