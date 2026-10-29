import { LightningElement, api, track } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import cytoscapeUrl from '@salesforce/resourceUrl/cytoscape';
import getLatestGraphMetadataForProject from '@salesforce/apex/DAGraphController.getLatestGraphMetadataForProject';
import getGraphChunks from '@salesforce/apex/DAGraphController.getGraphChunks';
import getUserPreference from '@salesforce/apex/DAUserPreferenceController.getUserPreference';
import saveUserPreference from '@salesforce/apex/DAUserPreferenceController.saveUserPreference';
import { reassembleChunks, validatePayloadIntegrity, verifyChunkSequence } from 'c/daGraphPayloadLoader';
import { computeArchitectureLayout } from 'c/daLayoutEngine';

export default class DaGraphViewer extends LightningElement {
    _recordId = null;

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
            // 3. Initiate new fetch if component is DOM-attached/initialized and recordId is truthy
            if (this.cyInitialized && this._recordId) {
                this.fetchGraphData();
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
            this.renderGraph(graphData, userPref);
        } catch (err) {
            if (requestId === this.currentRequestId && this.cyInitialized) {
                this.error = 'Error fetching graph data: ' + (err.body ? err.body.message : err.message || err);
                this.isLoading = false;
            }
        }
    }

    renderGraph(graphData, userPref = null) {
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

            const nodes = graphData.nodes || [];
            const edges = graphData.edges || [];

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

            // Compute deterministic architecture layout positions
            const layoutResult = computeArchitectureLayout(nodes, edges);
            const computedPositions = layoutResult.positions || {};

            this.isRestoringState = true;

            const elements = [];
            nodes.forEach(n => {
                let pos = computedPositions[n.id] || { x: 0, y: 0 };
                if (savedPositions && savedPositions[n.id]) {
                    const savedPos = savedPositions[n.id];
                    if (typeof savedPos.x === 'number' && Number.isFinite(savedPos.x) &&
                        typeof savedPos.y === 'number' && Number.isFinite(savedPos.y)) {
                        pos = { x: savedPos.x, y: savedPos.y };
                    }
                }
                elements.push({
                    data: { id: n.id, label: n.displayName || n.name || n.id, layer: n.layer },
                    position: pos
                });
            });

            edges.forEach(e => {
                elements.push({
                    data: { id: e.id || `${e.source}-${e.target}`, source: e.source, target: e.target }
                });
            });

            /* global cytoscape */
            if (typeof cytoscape === 'function') {
                this.cyInstance = cytoscape({
                    container: container,
                    elements: elements.length > 0 ? elements : (graphData.elements || graphData),
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
                    layout: {
                        name: elements.length > 0 ? 'preset' : 'cose',
                        animate: false
                    }
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
                    destroy() {
                        this.destroyed = true;
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

    scheduleSaveState() {
        if (this.isRestoringState || !this._recordId || !this.cyInstance || this.cyInstance.destroyed) {
            return;
        }

        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        const saveProjId = this._recordId;
        const currentReq = this.currentRequestId;

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
                    layoutMode: 'hierarchical',
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
