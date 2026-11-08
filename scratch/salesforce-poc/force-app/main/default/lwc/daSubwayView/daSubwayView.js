import { LightningElement, api, track } from 'lwc';

const LAYER_TRACK_ORDER = [
    'UI',
    'Service',
    'Domain',
    'Selector',
    'Data',
    'Integration',
    'Utility',
    'Unassigned'
];

const TRACK_COLORS = {
    UI: '#38bdf8',
    Service: '#10b981',
    Domain: '#a855f7',
    Selector: '#f59e0b',
    Data: '#ec4899',
    Integration: '#06b6d4',
    Utility: '#94a3b8',
    Unassigned: '#64748b'
};

export default class DaSubwayView extends LightningElement {
    @api projectId;
    @api selectedNodeId;

    @track searchQuery = '';
    @track selectedLayer = '';
    @track errorMessage = '';

    _rawPayload = null;
    _parsedPayload = null;

    @api
    get payload() {
        return this._rawPayload;
    }
    set payload(value) {
        this._rawPayload = value;
        this.processPayload();
    }

    processPayload() {
        this.errorMessage = '';
        if (!this._rawPayload) {
            this._parsedPayload = null;
            return;
        }

        if (typeof this._rawPayload === 'string') {
            try {
                this._parsedPayload = JSON.parse(this._rawPayload);
            } catch (err) {
                this.errorMessage = 'Malformed graph payload JSON';
                this._parsedPayload = null;
                return;
            }
        } else if (typeof this._rawPayload === 'object') {
            this._parsedPayload = this._rawPayload;
        } else {
            this.errorMessage = 'Invalid payload format';
            this._parsedPayload = null;
        }
    }

    get hasError() {
        return !!this.errorMessage;
    }

    get isEmpty() {
        if (!this._parsedPayload || !Array.isArray(this._parsedPayload.nodes)) return true;
        return this._parsedPayload.nodes.length === 0;
    }

    get trackCount() {
        return this.renderedTracks.length;
    }

    get stationCount() {
        return this.renderedStations.length;
    }

    get routeCount() {
        return this.renderedRoutes.length;
    }

    get layerTrackOptions() {
        return LAYER_TRACK_ORDER;
    }

    get renderedTracks() {
        if (this.isEmpty || this.hasError) return [];
        // Map available tracks across 600px height with padding
        const startY = 70;
        const spacingY = 65;

        return LAYER_TRACK_ORDER.map((layer, index) => {
            const y = startY + index * spacingY;
            return {
                name: layer,
                y: y,
                textY: y + 4,
                color: TRACK_COLORS[layer] || '#64748b'
            };
        });
    }

    get renderedStations() {
        if (this.isEmpty || this.hasError) return [];

        const nodes = this._parsedPayload.nodes;
        const tracks = this.renderedTracks;
        const trackYMap = {};
        tracks.forEach(t => { trackYMap[t.name] = t.y; });

        // Group stations by layer
        const layerGroups = {};
        LAYER_TRACK_ORDER.forEach(l => { layerGroups[l] = []; });

        nodes.forEach(node => {
            const layer = node.layer && layerGroups[node.layer] ? node.layer : 'Unassigned';
            layerGroups[layer].push(node);
        });

        const stations = [];
        const startX = 160;
        const endX = 840;

        LAYER_TRACK_ORDER.forEach(layer => {
            const group = layerGroups[layer];
            if (!group || !group.length) return;

            // Sort stations deterministically by ID
            group.sort((a, b) => a.id.localeCompare(b.id));

            const count = group.length;
            const stepX = count > 1 ? (endX - startX) / (count - 1) : 0;

            group.forEach((node, idx) => {
                const x = count === 1 ? (startX + endX) / 2 : startX + idx * stepX;
                const y = trackYMap[layer] || 500;

                // Match filter criteria
                if (this.selectedLayer && node.layer !== this.selectedLayer) return;
                if (this.searchQuery) {
                    const q = this.searchQuery.toLowerCase();
                    const matchId = (node.id || '').toLowerCase().includes(q);
                    const matchLabel = (node.label || '').toLowerCase().includes(q);
                    if (!matchId && !matchLabel) return;
                }

                const isSelected = this.selectedNodeId === node.id;
                const strokeColor = TRACK_COLORS[layer] || '#64748b';
                const label = node.label || node.name || node.id;
                const shortLabel = label.length > 12 ? label.slice(0, 10) + '..' : label;

                stations.push({
                    id: node.id,
                    x: Math.round(x),
                    y: Math.round(y),
                    radius: isSelected ? 8 : 6,
                    labelY: Math.round(y - 10),
                    shortLabel: shortLabel,
                    strokeColor: strokeColor,
                    groupClass: `station-node ${isSelected ? 'selected' : ''}`,
                    tooltip: `${label} (${layer}) | Fan-In: ${node.fanIn || 0} | Fan-Out: ${node.fanOut || 0}`
                });
            });
        });

        return stations;
    }

    get renderedRoutes() {
        if (this.isEmpty || this.hasError) return [];
        if (!Array.isArray(this._parsedPayload.edges)) return [];

        const stations = this.renderedStations;
        const stationMap = {};
        stations.forEach(s => { stationMap[s.id] = s; });

        const routes = [];
        this._parsedPayload.edges.forEach((edge, idx) => {
            const source = stationMap[edge.source];
            const target = stationMap[edge.target];
            if (!source || !target) return; // Only draw route if both stations visible

            const isCrossLine = source.y !== target.y;
            // Cubic Bezier curve connecting source and target
            const midX = (source.x + target.x) / 2;
            const pathD = `M ${source.x} ${source.y} C ${midX} ${source.y}, ${midX} ${target.y}, ${target.x} ${target.y}`;

            routes.push({
                id: edge.id || `edge-${idx}`,
                pathD: pathD,
                color: isCrossLine ? '#ec4899' : '#38bdf8',
                dashArray: isCrossLine ? '4 2' : 'none',
                isCrossLine: isCrossLine
            });
        });

        return routes;
    }

    handleSearchChange(event) {
        this.searchQuery = event.target.value;
    }

    handleLayerFilterChange(event) {
        this.selectedLayer = event.target.value;
    }

    handleStationClick(event) {
        const nodeId = event.currentTarget.dataset.nodeId;
        if (!nodeId) return;

        const node = this._parsedPayload?.nodes?.find(n => n.id === nodeId) || null;

        // Dispatches canonical nodeselect CustomEvent adhering to CONTRACT-06 & SELECTION != NAVIGATION
        this.dispatchEvent(new CustomEvent('nodeselect', {
            detail: {
                nodeId: nodeId,
                node: node,
                sourceView: 'subway'
            },
            bubbles: true,
            composed: true,
            cancelable: false
        }));
    }
}
