import { LightningElement, api, track } from 'lwc';

/**
 * DaDiagnosticsView LWC (Workstream 3 / Task W7-1)
 * Hardened Architectural Health & Diagnostics Dashboard.
 *
 * Capabilities:
 * - Architectural health score (0-100) with heuristic debt penalties.
 * - Cyclic SCC counts & cyclic participating nodes.
 * - Layer distribution breakdown and high-risk component ratio.
 * - Zero-denominator and empty-data defensive mathematical guards.
 * - CSV and JSON report export.
 * - Supports both @api payload and @api graphPayload properties.
 * - Preserves SELECTION != NAVIGATION (read-only view with zero unintended side effects).
 * - Preserves input payload immutability.
 */
export default class DaDiagnosticsView extends LightningElement {
    @api projectId = null;
    @api selectedNodeId = null;

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

    // Property alias for compatibility with daAppShell
    @api
    get graphPayload() {
        return this.payload;
    }
    set graphPayload(value) {
        this.payload = value;
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
            if (Array.isArray(c)) {
                c.forEach(id => cyclicIds.add(id));
            } else if (Array.isArray(c?.nodeIds)) {
                c.nodeIds.forEach(id => cyclicIds.add(id));
            }
        });
        (this._parsedPayload.nodes || []).forEach(n => {
            if (n.hasCycle || n.refactoringReadiness?.hasCycles) cyclicIds.add(n.id);
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
        return this._parsedPayload.nodes.filter(n =>
            n.coverageStatus === 'COVERED' ||
            n.refactoringReadiness?.testCoverageStatus === 'COVERED' ||
            (n.coverageDensity && n.coverageDensity > 0)
        ).length;
    }

    get untestedNodesCount() {
        if (this.isEmpty) return 0;
        return this._parsedPayload.nodes.filter(n =>
            n.coverageStatus === 'UNTESTED' ||
            n.refactoringReadiness?.testCoverageStatus === 'UNTESTED' ||
            (!n.coverageStatus && !n.coverageDensity && (!n.refactoringReadiness || !n.refactoringReadiness.testCoverageStatus))
        ).length;
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
        const unresolvedEdges = (this._parsedPayload.edges || []).filter(e => e.isUnresolved || e.unresolved).length;
        const unresolvedRefs = Array.isArray(this._parsedPayload.unresolvedReferences) ? this._parsedPayload.unresolvedReferences.length : 0;
        return unresolvedEdges + unresolvedRefs;
    }

    /**
     * Defensive health score (0-100) based on debt penalties:
     * - Circular dependencies: -15 pts per cycle (capped at -30)
     * - High risk ratio: -25 pts * (highRisk / total)
     * - Unassigned layer ratio: -20 pts * (unassigned / total)
     * - Test deficit: -25 pts * (untested / total)
     * Safe against zero denominator.
     */
    get healthScore() {
        if (this.isEmpty) return 100;
        if (this._parsedPayload.summary?.architectureHealthScore != null) {
            return this._parsedPayload.summary.architectureHealthScore;
        }

        const denom = Math.max(1, this.totalNodes);
        let score = 100;
        score -= Math.min(30, this.cycleCount * 15);
        score -= Math.round(25 * (this.highRiskCount / denom));
        score -= Math.round(20 * (this.unassignedCount / denom));
        score -= Math.round(25 * (this.untestedNodesCount / denom));

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
            if (node.coverageStatus === 'COVERED' || (node.coverageDensity && node.coverageDensity > 0) || node.refactoringReadiness?.testCoverageStatus === 'COVERED') {
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

        const denom = Math.max(1, this.totalNodes);
        return list.map(item => ({
            ...item,
            percentage: Math.round((item.count / denom) * 100)
        }));
    }

    handleExportJSON() {
        if (this.isEmpty) return;

        const report = {
            exportTimestamp: new Date().toISOString(),
            projectId: this.projectId,
            metrics: {
                healthScore: this.healthScore,
                totalNodes: this.totalNodes,
                totalEdges: this.totalEdges,
                cycleCount: this.cycleCount,
                cyclicNodesCount: this.cyclicNodesCount,
                highRiskCount: this.highRiskCount,
                unresolvedCount: this.unresolvedCount,
                coverageDensityPercent: this.coverageDensityPercent,
                unassignedPercent: this.unassignedPercent
            },
            layers: this.layerBreakdowns
        };

        const jsonStr = JSON.stringify(report, null, 2);
        this.triggerDownload(`diagnostics-report-${this.projectId || 'project'}-${Date.now()}.json`, 'application/json', jsonStr);
    }

    handleExportCSV() {
        if (this.isEmpty) return;

        const headers = ['Layer', 'Component Count', 'Percentage', 'Covered', 'Untested', 'High Risk'];
        const rows = this.layerBreakdowns.map(l => [
            `"${l.layer}"`,
            l.count,
            `${l.percentage}%`,
            l.covered,
            l.untested,
            l.highRisk
        ]);

        const summaryRow = [
            '"SUMMARY"',
            `"Total Nodes: ${this.totalNodes}"`,
            `"Health Score: ${this.healthScore}"`,
            `"Cycles: ${this.cycleCount}"`,
            `"High Risk: ${this.highRiskCount}"`,
            `"Unresolved: ${this.unresolvedCount}"`
        ];

        const csvContent = [headers.join(','), ...rows.map(r => r.join(',')), summaryRow.join(',')].join('\r\n');
        this.triggerDownload(`diagnostics-layers-${this.projectId || 'project'}-${Date.now()}.csv`, 'text/csv;charset=utf-8;', csvContent);
    }

    triggerDownload(filename, mimeType, content) {
        if (typeof window === 'undefined' || !window.document) return;

        try {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = window.document.createElement('a');
            a.href = url;
            a.download = filename;
            window.document.body.appendChild(a);
            a.click();
            window.document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Failed to trigger file download:', e);
        }
    }
}
