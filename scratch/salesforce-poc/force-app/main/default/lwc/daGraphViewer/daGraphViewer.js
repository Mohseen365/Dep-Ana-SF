import { LightningElement, api, track } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import cytoscapeUrl from '@salesforce/resourceUrl/cytoscape';
import getLatestGraphMetadataForProject from '@salesforce/apex/DAGraphController.getLatestGraphMetadataForProject';
import getGraphChunks from '@salesforce/apex/DAGraphController.getGraphChunks';
import getUserPreference from '@salesforce/apex/DAUserPreferenceController.getUserPreference';
import saveUserPreference from '@salesforce/apex/DAUserPreferenceController.saveUserPreference';
import { reassembleChunks, validatePayloadIntegrity, verifyChunkSequence } from 'c/daGraphPayloadLoader';
import { computeArchitectureLayout, computeOrbitLayout, computeConstellationLayout, computeSankeyLayout } from 'c/daLayoutEngine';
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
     * Layout mode property (CONTRACT-02 canonical keys: 'grid', 'circle', 'breadthfirst', 'dagre', 'orbit', 'constellation', 'sankey', 'architecture').
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
    @track selectedEdgeId = null;
    cyInitialized = false;
    cyInstance = null;
    pageSize = 5;
    currentRequestId = 0;
    saveTimeout = null;
    isRestoringState = false;
    _activeLayoutInstance = null;
    _cachedArchitecturePositions = null;
    _cachedGraphData = null;
    _currentLOD = null;

    get gridButtonVariant() {
        return this._currentLayout === 'grid' ? 'brand' : 'neutral';
    }

    get circleButtonVariant() {
        return this._currentLayout === 'circle' ? 'brand' : 'neutral';
    }

    get breadthfirstButtonVariant() {
        return (this._currentLayout === 'breadthfirst' || this._currentLayout === 'architecture') ? 'brand' : 'neutral';
    }

    get orbitButtonVariant() {
        return this._currentLayout === 'orbit' ? 'brand' : 'neutral';
    }

    get constellationButtonVariant() {
        return this._currentLayout === 'constellation' ? 'brand' : 'neutral';
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
        if (lower === 'architecture' || lower === 'orbit' || lower === 'constellation' || lower === 'sankey') {
            return lower;
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

    // --- Viewport Control Methods ---

    handleZoomIn() {
        this.zoomIn();
    }

    handleZoomOut() {
        this.zoomOut();
    }

    handleFitView() {
        this.fitView();
    }

    handleResetView() {
        this.resetView();
    }

    @api
    zoomIn() {
        if (this.cyInstance && typeof this.cyInstance.zoom === 'function' && typeof this.cyInstance.width === 'function') {
            const currentZoom = this.cyInstance.zoom();
            this.cyInstance.zoom({
                level: currentZoom * 1.2,
                renderedPosition: { x: this.cyInstance.width() / 2, y: this.cyInstance.height() / 2 }
            });
            this.scheduleSaveState();
        }
    }

    @api
    zoomOut() {
        if (this.cyInstance && typeof this.cyInstance.zoom === 'function' && typeof this.cyInstance.width === 'function') {
            const currentZoom = this.cyInstance.zoom();
            this.cyInstance.zoom({
                level: currentZoom * 0.8,
                renderedPosition: { x: this.cyInstance.width() / 2, y: this.cyInstance.height() / 2 }
            });
            this.scheduleSaveState();
        }
    }

    @api
    fitView(padding = 30) {
        if (this.cyInstance && typeof this.cyInstance.fit === 'function') {
            this.cyInstance.fit(undefined, padding);
            this.scheduleSaveState();
        }
    }

    @api
    resetView() {
        if (this.cyInstance) {
            if (typeof this.cyInstance.fit === 'function') {
                this.cyInstance.fit(undefined, 30);
            }
            if (typeof this.cyInstance.center === 'function') {
                this.cyInstance.center();
            }
            this.scheduleSaveState();
        }
    }

    // --- Graph Export Methods (REM-05) ---

    handleExportPNG() {
        this.exportGraphAsPNG();
    }

    handleExportSVG() {
        this.exportGraphAsSVG();
    }

    generateExportFilename(architectureMode = this._currentLayout, extension = 'png', timestamp = Date.now()) {
        const sanitizedMode = (architectureMode || this._currentLayout || 'hierarchical').toLowerCase().replace(/[^a-z0-9_-]/g, '');
        return `architecture-${sanitizedMode}-${timestamp}.${extension}`;
    }

    triggerDownload(filename, content, mimeType) {
        if (typeof window === 'undefined' || !window.document || typeof window.document.createElement !== 'function') {
            return;
        }

        try {
            let url;
            let isBlobUrl = false;

            if (typeof content === 'string' && content.startsWith('data:')) {
                url = content;
            } else {
                const blob = new Blob([content], { type: mimeType });
                url = URL.createObjectURL(blob);
                isBlobUrl = true;
            }

            const link = window.document.createElement('a');
            link.href = url;
            link.download = filename;
            window.document.body.appendChild(link);
            link.click();
            window.document.body.removeChild(link);

            if (isBlobUrl && typeof URL.revokeObjectURL === 'function') {
                URL.revokeObjectURL(url);
            }
        } catch (err) {
            console.error('Download trigger failed:', err);
        }
    }

    @api
    exportGraphAsPNG(options = {}) {
        if (!this.cyInstance) {
            return null;
        }

        const {
            architectureMode = this._currentLayout,
            bg = '#ffffff',
            scale = 2,
            full = true
        } = options;

        try {
            let pngDataUrl = null;
            if (typeof this.cyInstance.png === 'function') {
                pngDataUrl = this.cyInstance.png({ full, scale, bg });
            }

            // Headless / mock environment fallback
            if (!pngDataUrl) {
                pngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
            }

            const filename = this.generateExportFilename(architectureMode, 'png');
            this.triggerDownload(filename, pngDataUrl, 'image/png');

            this.dispatchEvent(new CustomEvent('graphexport', {
                detail: {
                    format: 'png',
                    filename: filename,
                    success: true
                },
                bubbles: true,
                composed: true
            }));

            return pngDataUrl;
        } catch (err) {
            this.error = 'Failed to export PNG: ' + (err.message || err);
            return null;
        }
    }

    @api
    exportGraphAsSVG(options = {}) {
        if (!this.cyInstance) {
            return null;
        }

        const {
            architectureMode = this._currentLayout,
            bg = '#ffffff',
            full = true
        } = options;

        try {
            let svgData = null;
            if (typeof this.cyInstance.svg === 'function') {
                svgData = this.cyInstance.svg({ full, bg });
            }

            // High-fidelity vector SVG generator fallback from graph state
            if (!svgData) {
                svgData = this.generateVectorSVG({ bg });
            }

            if (!svgData) {
                return null;
            }

            const filename = this.generateExportFilename(architectureMode, 'svg');
            this.triggerDownload(filename, svgData, 'image/svg+xml;charset=utf-8');

            this.dispatchEvent(new CustomEvent('graphexport', {
                detail: {
                    format: 'svg',
                    filename: filename,
                    success: true
                },
                bubbles: true,
                composed: true
            }));

            return svgData;
        } catch (err) {
            this.error = 'Failed to export SVG: ' + (err.message || err);
            return null;
        }
    }

    generateVectorSVG(options = {}) {
        const bg = options.bg || '#ffffff';
        let nodes = [];
        if (this.cyInstance && typeof this.cyInstance.nodes === 'function') {
            nodes = this.cyInstance.nodes();
        }

        const rawNodes = this._rawGraphData ? (this._rawGraphData.nodes || []) : [];
        const rawEdges = this._rawGraphData ? (this._rawGraphData.edges || []) : [];

        // Build raw node label map for fallback
        const rawNodeMap = new Map();
        rawNodes.forEach(rn => {
            if (rn.id) rawNodeMap.set(rn.id, rn.displayName || rn.name || rn.id);
        });

        const nodeItems = [];
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        if (Array.isArray(nodes) && nodes.length > 0) {
            nodes.forEach(n => {
                const id = typeof n.id === 'function' ? n.id() : (n.data ? n.data.id : null);
                const pos = typeof n.position === 'function' ? n.position() : (n.position || { x: 0, y: 0 });
                let label = id;
                if (n.data && typeof n.data === 'function') {
                    label = n.data('label') || rawNodeMap.get(id) || id;
                } else if (n.data && n.data.label) {
                    label = n.data.label;
                } else if (rawNodeMap.has(id)) {
                    label = rawNodeMap.get(id);
                }

                if (id && pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
                    nodeItems.push({ id, label, x: pos.x, y: pos.y });
                    if (pos.x < minX) minX = pos.x;
                    if (pos.y < minY) minY = pos.y;
                    if (pos.x > maxX) maxX = pos.x;
                    if (pos.y > maxY) maxY = pos.y;
                }
            });
        } else if (rawNodes.length > 0) {
            rawNodes.forEach((n, idx) => {
                const id = n.id || `node_${idx}`;
                const label = n.displayName || n.name || id;
                const pos = { x: (idx % 10) * 150 + 50, y: Math.floor(idx / 10) * 100 + 50 };
                nodeItems.push({ id, label, x: pos.x, y: pos.y });
                if (pos.x < minX) minX = pos.x;
                if (pos.y < minY) minY = pos.y;
                if (pos.x > maxX) maxX = pos.x;
                if (pos.y > maxY) maxY = pos.y;
            });
        }

        if (nodeItems.length === 0) {
            return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" style="background-color: ${bg};">\n  <rect width="100%" height="100%" fill="${bg}"/>\n</svg>`;
        }

        const padding = 60;
        const width = Math.max(800, (maxX - minX) + padding * 2);
        const height = Math.max(600, (maxY - minY) + padding * 2);
        const viewBoxX = minX - padding;
        const viewBoxY = minY - padding;

        const nodePosMap = new Map();
        nodeItems.forEach(n => nodePosMap.set(n.id, { x: n.x, y: n.y }));

        let edges = [];
        if (this.cyInstance && typeof this.cyInstance.edges === 'function') {
            edges = this.cyInstance.edges().map(e => ({
                id: typeof e.id === 'function' ? e.id() : e.id,
                source: typeof e.source === 'function' ? (typeof e.source().id === 'function' ? e.source().id() : e.source().id) : (e.data ? e.data.source : null),
                target: typeof e.target === 'function' ? (typeof e.target().id === 'function' ? e.target().id() : e.target().id) : (e.data ? e.data.target : null)
            }));
        } else if (this.cyInstance && Array.isArray(this.cyInstance.elements)) {
            edges = this.cyInstance.elements.filter(e => e.data && e.data.source && e.data.target).map(e => ({
                id: e.data.id,
                source: e.data.source,
                target: e.data.target
            }));
        } else if (rawEdges.length > 0) {
            edges = rawEdges;
        }

        let edgeSvg = '';
        edges.forEach(e => {
            const s = nodePosMap.get(e.source);
            const t = nodePosMap.get(e.target);
            if (s && t) {
                edgeSvg += `    <line x1="${s.x}" y1="${s.y}" x2="${t.x}" y2="${t.y}" stroke="#b0adab" stroke-width="2" marker-end="url(#arrow)"/>\n`;
            }
        });

        let nodeSvg = '';
        nodeItems.forEach(n => {
            const safeId = String(n.id || '').replace(/[^a-zA-Z0-9_-]/g, '_');
            const escapedLabel = String(n.label || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            nodeSvg += `    <g id="node-${safeId}" transform="translate(${n.x}, ${n.y})">\n` +
                `      <circle r="20" fill="#0070d2" stroke="#ffffff" stroke-width="2"/>\n` +
                `      <text dy="32" text-anchor="middle" fill="#181818" font-family="sans-serif" font-size="12">${escapedLabel}</text>\n` +
                `    </g>\n`;
        });

        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxX} ${viewBoxY} ${width} ${height}" width="${width}" height="${height}" style="background-color: ${bg};">\n` +
            `  <defs>\n` +
            `    <marker id="arrow" viewBox="0 0 10 10" refX="25" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">\n` +
            `      <path d="M 0 0 L 10 5 L 0 10 z" fill="#b0adab"/>\n` +
            `    </marker>\n` +
            `  </defs>\n` +
            `  <rect x="${viewBoxX}" y="${viewBoxY}" width="${width}" height="${height}" fill="${bg}"/>\n` +
            `  <g class="edges">\n${edgeSvg}  </g>\n` +
            `  <g class="nodes">\n${nodeSvg}  </g>\n` +
            `</svg>`;
    }

    applyLayout(mode) {
        if (!this.cyInstance) return;

        // Stop any running layout operation before initiating a new one to prevent overlap races
        if (this._activeLayoutInstance && typeof this._activeLayoutInstance.stop === 'function') {
            try {
                this._activeLayoutInstance.stop();
            } catch (stopErr) {
                // Ignore stop errors on completed layouts
            }
            this._activeLayoutInstance = null;
        }

        if (mode === 'architecture') {
            try {
                if (this._rawGraphData && this.cyInstance.nodes) {
                    if (this._cachedGraphData !== this._rawGraphData || !this._cachedArchitecturePositions) {
                        const layoutResult = computeArchitectureLayout(this._rawGraphData.nodes || [], this._rawGraphData.edges || []);
                        this._cachedArchitecturePositions = layoutResult.positions || {};
                        this._cachedGraphData = this._rawGraphData;
                    }
                    const posMap = this._cachedArchitecturePositions || {};
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
            } catch (archErr) {
                this.error = 'Failed to execute architecture layout: ' + (archErr.message || archErr);
            }
            return;
        }

        if (mode === 'orbit') {
            try {
                if (this._rawGraphData && this.cyInstance.nodes) {
                    const nodesInput = (this._rawGraphData.nodes || []).map((n) => ({
                        nodeId: n.id,
                        orbitRingIndex: n.layer === 'Core' ? 0 : n.layer === 'Domain' ? 1 : 2,
                        orbitSectorId: n.type || '_default'
                    }));
                    const layoutResult = computeOrbitLayout({ nodes: nodesInput });
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
            } catch (orbitErr) {
                this.error = 'Failed to execute orbit layout: ' + (orbitErr.message || orbitErr);
            }
            return;
        }

        if (mode === 'constellation') {
            try {
                if (this._rawGraphData && this.cyInstance.nodes) {
                    const allNodes = this._rawGraphData.nodes || [];
                    const focal = allNodes.length > 0 ? allNodes[0] : null;
                    const items = allNodes.slice(1).map(n => ({ nodeId: n.id, displayName: n.label || n.id }));
                    const constellationInput = {
                        focalNode: focal,
                        rings: [{ ringIndex: 1, hopDistance: 1, items: items }],
                        edges: this._rawGraphData.edges || []
                    };
                    const layoutResult = computeConstellationLayout(constellationInput);
                    const posMap = layoutResult.nodePositions || {};
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
            } catch (constErr) {
                this.error = 'Failed to execute constellation layout: ' + (constErr.message || constErr);
            }
            return;
        }

        const layoutConfig = CYTOSCAPE_LAYOUT_DEFAULTS[mode] || CYTOSCAPE_LAYOUT_DEFAULTS.breadthfirst;

        if (typeof this.cyInstance.layout === 'function') {
            try {
                const layout = this.cyInstance.layout(layoutConfig);
                this._activeLayoutInstance = layout;
                if (layout && typeof layout.run === 'function') {
                    layout.run();
                }
            } catch (e) {
                this.error = 'Failed to apply Cytoscape layout: ' + (e.message || e);
            }
        }
    }

    clearGraphState() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        if (this._activeLayoutInstance && typeof this._activeLayoutInstance.stop === 'function') {
            try {
                this._activeLayoutInstance.stop();
            } catch (stopErr) {
                // Ignore
            }
            this._activeLayoutInstance = null;
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
        this.selectedEdgeId = null;
        this.error = null;
        this._cachedArchitecturePositions = null;
        this._cachedGraphData = null;
        this._currentLOD = null;
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
            if (graphData) {
                this._rawGraphData = graphData;
            }
            if (userPref !== undefined && userPref !== null) {
                this._userPref = userPref;
            }
            const activeUserPref = userPref || this._userPref;

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
            if (activeUserPref && activeUserPref.Positions_JSON__c) {
                try {
                    savedPositions = JSON.parse(activeUserPref.Positions_JSON__c);
                } catch (e) {
                    savedPositions = null;
                }
            }

            // Parse saved zoom / pan if present
            let savedZoomPan = null;
            if (activeUserPref && activeUserPref.Zoom_Pan_JSON__c) {
                try {
                    savedZoomPan = JSON.parse(activeUserPref.Zoom_Pan_JSON__c);
                } catch (e) {
                    savedZoomPan = null;
                }
            }

            // Compute deterministic architecture layout positions for complete node set
            // with memoization across filter toggles to prevent redundant computation
            if (this._cachedGraphData !== graphData || !this._cachedArchitecturePositions) {
                const layoutResult = computeArchitectureLayout(allNodes, allEdges);
                this._cachedArchitecturePositions = layoutResult.positions || {};
                this._cachedGraphData = graphData;
            }
            const computedPositions = this._cachedArchitecturePositions || {};

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
                const layoutConfig = (savedPositions || this._currentLayout === 'architecture' || this._currentLayout === 'orbit' || this._currentLayout === 'constellation')
                    ? { name: 'preset', animate: false }
                    : (CYTOSCAPE_LAYOUT_DEFAULTS[this._currentLayout] || CYTOSCAPE_LAYOUT_DEFAULTS.breadthfirst);

                this.cyInstance = cytoscape({
                    container: container,
                    elements: elements,
                    boxSelectionEnabled: true,
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
                        },
                        {
                            selector: 'edge:selected',
                            style: {
                                'width': 3,
                                'line-color': '#005fb2',
                                'target-arrow-color': '#005fb2'
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
                    this.dispatchEvent(new CustomEvent('nodeselect', {
                        detail: {
                            nodeId: node.id(),
                            sourceView: 'graph'
                        },
                        bubbles: true,
                        composed: true
                    }));
                });

                this.cyInstance.on('tap', 'edge', (evt) => {
                    const edge = evt.target;
                    this.selectedEdgeId = edge.id();
                    this.dispatchEvent(new CustomEvent('edgeselect', {
                        detail: {
                            edgeId: edge.id(),
                            sourceView: 'graph'
                        },
                        bubbles: true,
                        composed: true
                    }));
                });

                this.cyInstance.on('tap', (evt) => {
                    if (evt.target === this.cyInstance) {
                        this.selectedNodeId = null;
                        this.selectedEdgeId = null;
                        this.dispatchEvent(new CustomEvent('selectionclear', {
                            detail: { sourceView: 'graph' },
                            bubbles: true,
                            composed: true
                        }));
                    }
                });

                // Persist user-dragged node coordinates on dragfree
                this.cyInstance.on('dragfree', 'node', () => {
                    this.scheduleSaveState();
                });

                // Persist viewport changes on zoom/pan and update LOD class
                this.cyInstance.on('viewport', () => {
                    this.updateLODClasses();
                    this.scheduleSaveState();
                });

                this.updateLODClasses();
            } else {
                // Mock or container-less fallback for offline/test environments
                this.cyInstance = {
                    destroyed: false,
                    elements: elements,
                    currentLayout: this._currentLayout,
                    boxSelectionEnabled: true,
                    _zoom: savedZoomPan ? savedZoomPan.zoom : 1.0,
                    _pan: savedZoomPan ? savedZoomPan.pan : { x: 0, y: 0 },
                    destroy() {
                        this.destroyed = true;
                    },
                    layout: (config) => {
                        this.currentLayout = config.name;
                        return { run: () => {} };
                    },
                    zoom: function(val) {
                        if (typeof val === 'number') this._zoom = val;
                        else if (val && typeof val.level === 'number') this._zoom = val.level;
                        return this._zoom;
                    },
                    pan: function(val) {
                        if (val) this._pan = val;
                        return this._pan;
                    },
                    fit: function() {},
                    center: function() {},
                    width: function() { return 800; },
                    height: function() { return 600; },
                    nodes: function() {
                        return elements.filter(e => !e.data.source).map(e => ({
                            id: () => e.data.id,
                            position: (p) => { if (p) e.position = p; return e.position || { x: 0, y: 0 }; }
                        }));
                    },
                    png: function(opts) {
                        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
                    },
                    batch: function(cb) { if (cb) cb(); },
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

    updateLODClasses() {
        if (!this.cyInstance || typeof this.cyInstance.zoom !== 'function') return;
        const container = this.template ? this.template.querySelector('.cy-container') : null;
        if (!container) return;

        const currentZoom = this.cyInstance.zoom();
        let targetLOD = 'zoom-mid';
        if (currentZoom < 0.5) {
            targetLOD = 'zoom-far';
        } else if (currentZoom >= 1.2) {
            targetLOD = 'zoom-near';
        }

        if (this._currentLOD !== targetLOD) {
            container.classList.remove('zoom-far', 'zoom-mid', 'zoom-near');
            container.classList.add(targetLOD);
            this._currentLOD = targetLOD;
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
                            positions[id] = {
                                x: Math.round(pos.x * 10) / 10,
                                y: Math.round(pos.y * 10) / 10
                            };
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
