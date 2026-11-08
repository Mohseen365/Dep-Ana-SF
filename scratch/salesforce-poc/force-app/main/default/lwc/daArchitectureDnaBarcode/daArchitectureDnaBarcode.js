import { LightningElement, api, track } from 'lwc';

const LAYER_COLORS = {
    UI: '#38bdf8',
    Service: '#10b981',
    Domain: '#a855f7',
    Selector: '#f59e0b',
    Data: '#ec4899',
    Integration: '#06b6d4',
    Utility: '#94a3b8',
    Unassigned: '#64748b'
};

const RISK_COLORS = {
    HIGH: '#ef4444',
    MEDIUM: '#f59e0b',
    LOW: '#10b981',
    NONE: '#64748b'
};

const COVERAGE_COLORS = {
    COVERED: '#10b981',
    UNTESTED: '#ef4444',
    AMBIGUOUS: '#f59e0b',
    UNKNOWN: '#64748b'
};

export default class DaArchitectureDnaBarcode extends LightningElement {
    @api projectId;
    @api selectedNodeId;

    @track selectedDimension = 'layer'; // 'layer' | 'risk' | 'coverage' | 'coupling'
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

    get dimensionOptions() {
        return [
            { label: 'Layer Composition', value: 'layer', selected: this.selectedDimension === 'layer' },
            { label: 'Risk Distribution', value: 'risk', selected: this.selectedDimension === 'risk' },
            { label: 'Test Coverage State', value: 'coverage', selected: this.selectedDimension === 'coverage' },
            { label: 'Coupling Density', value: 'coupling', selected: this.selectedDimension === 'coupling' }
        ];
    }

    get activeNode() {
        if (this.isEmpty) return null;
        if (this.selectedNodeId) {
            const found = this._parsedPayload.nodes.find(n => n.id === this.selectedNodeId);
            if (found) return found;
        }
        return this._parsedPayload.nodes[0] || null;
    }

    get renderedBands() {
        if (this.isEmpty || this.hasError) return [];

        const nodes = [...this._parsedPayload.nodes];
        // Sort deterministically by layer ASC, then ID ASC
        nodes.sort((a, b) => {
            const lA = a.layer || 'Unassigned';
            const lB = b.layer || 'Unassigned';
            const layerDiff = lA.localeCompare(lB);
            return layerDiff !== 0 ? layerDiff : a.id.localeCompare(b.id);
        });

        const total = nodes.length;
        const totalWidth = 1000;
        const bandWidth = Math.max(1, totalWidth / total);

        return nodes.map((node, index) => {
            const isSelected = this.selectedNodeId === node.id;
            const fill = this.resolveColor(node);
            const x = index * bandWidth;

            return {
                id: node.id,
                x: x,
                w: bandWidth,
                fill: fill,
                stroke: isSelected ? '#38bdf8' : 'rgba(0,0,0,0.4)',
                className: `dna-band ${isSelected ? 'selected' : ''}`,
                tooltip: `${node.label || node.id} | Layer: ${node.layer || 'Unassigned'} | Risk: ${node.risk || 'NONE'} | Coverage: ${node.coverageStatus || 'UNKNOWN'}`
            };
        });
    }

    resolveColor(node) {
        if (this.selectedDimension === 'risk') {
            const r = (node.risk || 'NONE').toUpperCase();
            return RISK_COLORS[r] || RISK_COLORS.NONE;
        }
        if (this.selectedDimension === 'coverage') {
            const c = (node.coverageStatus || 'UNKNOWN').toUpperCase();
            return COVERAGE_COLORS[c] || COVERAGE_COLORS.UNKNOWN;
        }
        if (this.selectedDimension === 'coupling') {
            const coupling = Number(node.coupling) || ((node.fanIn || 0) + (node.fanOut || 0)) || 0;
            if (coupling > 15) return '#ef4444'; // Red (hotspot)
            if (coupling > 8) return '#f59e0b'; // Amber
            if (coupling > 0) return '#38bdf8'; // Blue
            return '#64748b'; // Grey
        }
        // Default: Layer
        const layer = node.layer || 'Unassigned';
        return LAYER_COLORS[layer] || LAYER_COLORS.Unassigned;
    }

    handleDimensionChange(event) {
        this.selectedDimension = event.target.value;
    }

    handleBandClick(event) {
        const nodeId = event.currentTarget.dataset.nodeId;
        if (!nodeId) return;

        const node = this._parsedPayload?.nodes?.find(n => n.id === nodeId) || null;

        // Dispatches canonical nodeselect CustomEvent adhering to CONTRACT-06 & SELECTION != NAVIGATION
        this.dispatchEvent(new CustomEvent('nodeselect', {
            detail: {
                nodeId: nodeId,
                node: node,
                sourceView: 'barcode'
            },
            bubbles: true,
            composed: true,
            cancelable: false
        }));
    }
}
