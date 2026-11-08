import { LightningElement, api, track } from 'lwc';

const LAYER_COLORS = {
    UI: { bg: 'rgba(59, 130, 246, 0.35)', border: '#3b82f6', text: '#93c5fd' },
    Service: { bg: 'rgba(16, 185, 129, 0.35)', border: '#10b981', text: '#a7f3d0' },
    Domain: { bg: 'rgba(139, 92, 246, 0.35)', border: '#8b5cf6', text: '#c4b5fd' },
    Selector: { bg: 'rgba(245, 158, 11, 0.35)', border: '#f59e0b', text: '#fde68a' },
    Data: { bg: 'rgba(236, 72, 153, 0.35)', border: '#ec4899', text: '#fbcfe8' },
    Integration: { bg: 'rgba(14, 165, 233, 0.35)', border: '#0ea5e9', text: '#7dd3fc' },
    Utility: { bg: 'rgba(107, 114, 128, 0.35)', border: '#6b7280', text: '#e5e7eb' },
    Unassigned: { bg: 'rgba(75, 85, 99, 0.25)', border: '#4b5563', text: '#9ca3af' }
};

const RISK_COLORS = {
    HIGH: { bg: 'rgba(239, 68, 68, 0.45)', border: '#ef4444', text: '#fca5a5' },
    MEDIUM: { bg: 'rgba(245, 158, 11, 0.40)', border: '#f59e0b', text: '#fde68a' },
    LOW: { bg: 'rgba(16, 185, 129, 0.35)', border: '#10b981', text: '#a7f3d0' },
    NONE: { bg: 'rgba(107, 114, 128, 0.25)', border: '#6b7280', text: '#d1d5db' }
};

export default class DaTreemapView extends LightningElement {
    @api projectId;
    @api selectedNodeId;

    @track metricMode = 'count'; // 'count' | 'loc' | 'coupling' | 'complexity'
    @track colorScheme = 'layer'; // 'layer' | 'risk'
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

    get nodeCount() {
        return this._parsedPayload?.nodes?.length || 0;
    }

    get metricOptions() {
        return [
            { label: 'Equal (Count)', value: 'count', selected: this.metricMode === 'count' },
            { label: 'Lines of Code (LOC)', value: 'loc', selected: this.metricMode === 'loc' },
            { label: 'Coupling', value: 'coupling', selected: this.metricMode === 'coupling' },
            { label: 'Complexity', value: 'complexity', selected: this.metricMode === 'complexity' }
        ];
    }

    get colorOptions() {
        return [
            { label: 'Architectural Layer', value: 'layer', selected: this.colorScheme === 'layer' },
            { label: 'Risk Level', value: 'risk', selected: this.colorScheme === 'risk' }
        ];
    }

    getNodeWeight(node) {
        if (this.metricMode === 'loc') {
            return Math.max(1, Number(node.loc) || 10);
        }
        if (this.metricMode === 'coupling') {
            return Math.max(1, Number(node.coupling) || ((node.fanIn || 0) + (node.fanOut || 0)) || 1);
        }
        if (this.metricMode === 'complexity') {
            return Math.max(1, Number(node.cyclomaticComplexity) || 1);
        }
        return 1;
    }

    get totalMetricValue() {
        if (this.isEmpty) return 0;
        return this._parsedPayload.nodes.reduce((sum, n) => sum + this.getNodeWeight(n), 0);
    }

    get renderedRects() {
        if (this.isEmpty || this.hasError) return [];

        const nodes = [...this._parsedPayload.nodes];
        // Sort deterministically by weight DESC, then ID ASC
        nodes.sort((a, b) => {
            const diff = this.getNodeWeight(b) - this.getNodeWeight(a);
            return diff !== 0 ? diff : a.id.localeCompare(b.id);
        });

        const totalWeight = nodes.reduce((sum, n) => sum + this.getNodeWeight(n), 0);
        if (totalWeight <= 0) return [];

        // Squarified/Slice-and-Dice 2D treemap partitioning within 800x500 viewport
        return this.computeLayoutRects(nodes, 0, 0, 800, 500, totalWeight);
    }

    computeLayoutRects(nodes, x, y, width, height, totalWeight) {
        const rects = [];
        if (!nodes.length) return rects;

        let curX = x;
        let curY = y;
        let remainingWidth = width;
        let remainingHeight = height;
        let remainingWeight = totalWeight;

        // Alternate slicing vertically / horizontally
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const weight = this.getNodeWeight(node);
            const ratio = weight / Math.max(1, remainingWeight);

            let rw, rh, rx, ry;

            if (remainingWidth >= remainingHeight) {
                // Slice vertically along X
                rw = i === nodes.length - 1 ? remainingWidth : Math.max(2, Math.round(remainingWidth * ratio));
                rh = remainingHeight;
                rx = curX;
                ry = curY;

                curX += rw;
                remainingWidth = Math.max(0, remainingWidth - rw);
            } else {
                // Slice horizontally along Y
                rw = remainingWidth;
                rh = i === nodes.length - 1 ? remainingHeight : Math.max(2, Math.round(remainingHeight * ratio));
                rx = curX;
                ry = curY;

                curY += rh;
                remainingHeight = Math.max(0, remainingHeight - rh);
            }

            remainingWeight = Math.max(0, remainingWeight - weight);

            const isSelected = this.selectedNodeId === node.id;
            const colors = this.resolveColors(node);
            const showLabel = rw > 45 && rh > 22;
            const labelText = node.label || node.name || node.id;
            const truncatedLabel = labelText.length > Math.floor(rw / 7) ? labelText.slice(0, Math.max(3, Math.floor(rw / 7) - 2)) + '..' : labelText;

            rects.push({
                id: node.id,
                x: rx,
                y: ry,
                w: rw,
                h: rh,
                bg: colors.bg,
                border: colors.border,
                textColor: colors.text,
                className: `treemap-node-rect ${isSelected ? 'selected' : ''}`,
                showLabel: showLabel,
                displayLabel: truncatedLabel,
                textX: rx + 5,
                textY: ry + Math.min(16, rh / 2 + 5),
                fontSize: Math.max(10, Math.min(13, Math.floor(rh / 3))),
                tooltip: `${labelText} (${node.layer || 'Unassigned'}) | Weight: ${weight} | Risk: ${node.risk || 'NONE'}`
            });
        }

        return rects;
    }

    resolveColors(node) {
        if (this.colorScheme === 'risk') {
            const risk = (node.risk || 'NONE').toUpperCase();
            return RISK_COLORS[risk] || RISK_COLORS.NONE;
        }
        const layer = node.layer || 'Unassigned';
        return LAYER_COLORS[layer] || LAYER_COLORS.Unassigned;
    }

    handleMetricChange(event) {
        this.metricMode = event.target.value;
    }

    handleColorSchemeChange(event) {
        this.colorScheme = event.target.value;
    }

    handleNodeClick(event) {
        const nodeId = event.currentTarget.dataset.nodeId;
        if (!nodeId) return;

        const node = this._parsedPayload?.nodes?.find(n => n.id === nodeId) || null;

        // Dispatches canonical nodeselect CustomEvent adhering to CONTRACT-06 & SELECTION != NAVIGATION
        this.dispatchEvent(new CustomEvent('nodeselect', {
            detail: {
                nodeId: nodeId,
                node: node,
                sourceView: 'treemap'
            },
            bubbles: true,
            composed: true,
            cancelable: false
        }));
    }
}
