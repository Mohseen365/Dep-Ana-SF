import { LightningElement, api, track } from 'lwc';

export default class DaDiagnosticsView extends LightningElement {
    @api projectId;
    @api selectedNodeId;

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

    get totalNodes() {
        return this._parsedPayload?.nodes?.length || 0;
    }

    get totalEdges() {
        return this._parsedPayload?.edges?.length || 0;
    }

    get cycleCount() {
        return this._parsedPayload?.cycles?.length || 0;
    }

    get cyclicNodesCount() {
        if (this.isEmpty) return 0;
        const cyclicIds = new Set();
        (this._parsedPayload.cycles || []).forEach(c => {
            if (Array.isArray(c.nodeIds)) c.nodeIds.forEach(id => cyclicIds.add(id));
        });
        this._parsedPayload.nodes.forEach(n => {
            if (n.hasCycle) cyclicIds.add(n.id);
        });
        return cyclicIds.size;
    }

    get unassignedCount() {
        if (this.isEmpty) return 0;
        return this._parsedPayload.nodes.filter(n => !n.layer || n.layer === 'Unassigned').length;
    }

    get unassignedPercent() {
        if (this.totalNodes === 0) return 0;
        return Math.round((this.unassignedCount / this.totalNodes) * 100);
    }

    get coveredNodesCount() {
        if (this.isEmpty) return 0;
        return this._parsedPayload.nodes.filter(n => n.coverageStatus === 'COVERED' || (n.coverageDensity && n.coverageDensity > 0)).length;
    }

    get untestedNodesCount() {
        if (this.isEmpty) return 0;
        return this._parsedPayload.nodes.filter(n => n.coverageStatus === 'UNTESTED' || (!n.coverageStatus && !n.coverageDensity)).length;
    }

    get coverageDensityPercent() {
        if (this.totalNodes === 0) return 0;
        return Math.round((this.coveredNodesCount / this.totalNodes) * 100);
    }

    get highRiskCount() {
        if (this.isEmpty) return 0;
        if (this._parsedPayload.summary?.highRiskCount != null) {
            return this._parsedPayload.summary.highRiskCount;
        }
        return this._parsedPayload.nodes.filter(n => (n.risk || '').toUpperCase() === 'HIGH').length;
    }

    get unresolvedCount() {
        if (this.isEmpty) return 0;
        if (this._parsedPayload.summary?.unresolvedCount != null) {
            return this._parsedPayload.summary.unresolvedCount;
        }
        return (this._parsedPayload.edges || []).filter(e => e.isUnresolved).length;
    }

    /**
     * Heuristic health score (0-100) based on debt penalties:
     * - Circular dependencies: -15 pts per cycle
     * - High risk ratio: -25 pts * (highRisk / total)
     * - Unassigned layer ratio: -20 pts * (unassigned / total)
     * - Test deficit: -25 pts * (untested / total)
     */
    get healthScore() {
        if (this.isEmpty) return 100;
        if (this._parsedPayload.summary?.architectureHealthScore != null) {
            return this._parsedPayload.summary.architectureHealthScore;
        }

        let score = 100;
        score -= Math.min(30, this.cycleCount * 15);
        score -= Math.round(25 * (this.highRiskCount / Math.max(1, this.totalNodes)));
        score -= Math.round(20 * (this.unassignedCount / Math.max(1, this.totalNodes)));
        score -= Math.round(25 * (this.untestedNodesCount / Math.max(1, this.totalNodes)));

        return Math.max(0, Math.min(100, score));
    }

    get healthScoreClass() {
        const s = this.healthScore;
        if (s >= 80) return 'card-value health-good';
        if (s >= 50) return 'card-value health-warning';
        return 'card-value health-danger';
    }

    get layerBreakdowns() {
        if (this.isEmpty) return [];

        const layerMap = {};
        this._parsedPayload.nodes.forEach(node => {
            const layer = node.layer || 'Unassigned';
            if (!layerMap[layer]) {
                layerMap[layer] = { layer: layer, count: 0, covered: 0, untested: 0, highRisk: 0 };
            }
            layerMap[layer].count++;
            if (node.coverageStatus === 'COVERED' || (node.coverageDensity && node.coverageDensity > 0)) {
                layerMap[layer].covered++;
            } else {
                layerMap[layer].untested++;
            }
            if ((node.risk || '').toUpperCase() === 'HIGH') {
                layerMap[layer].highRisk++;
            }
        });

        const list = Object.values(layerMap);
        list.sort((a, b) => b.count - a.count);

        return list.map(item => ({
            ...item,
            percentage: Math.round((item.count / Math.max(1, this.totalNodes)) * 100)
        }));
    }
}
