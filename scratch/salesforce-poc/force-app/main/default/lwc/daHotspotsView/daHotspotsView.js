import { LightningElement, api, track } from 'lwc';

/**
 * DaHotspotsView LWC (Workstream 3 / Task W6-4)
 * Architectural Hotspots and Risk Assessment.
 *
 * Capabilities:
 * - Detects and ranks hotspots via composite formula (churn, complexity, fan-in, fan-out, coupling, cycles).
 * - Interactive category, risk, and search filtering.
 * - Deterministic sorting (Score DESC, then ID ASC).
 * - Node selection CustomEvent emission (`nodeselect` with bubbles/composed/cancelable: false per CONTRACT-06).
 * - Invariant SELECTION != NAVIGATION preserved.
 * - Input payload immutability preserved.
 * - CSV and JSON table export.
 * - Supports both @api payload and @api graphPayload properties.
 */
export default class DaHotspotsView extends LightningElement {
    @api projectId = null;
    @api selectedNodeId = null;

    @track searchQuery = '';
    @track selectedRisk = '';
    @track selectedCategory = 'all'; // 'all' | 'coupling' | 'fanIn' | 'cycles'
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
        return this.hotspots.length === 0;
    }

    get hotspotCount() {
        return this.filteredHotspots.length;
    }

    /**
     * Derives architectural hotspots using canonical thresholds:
     * - coupling > 15
     * - fanIn > 10
     * - hasCycle === true (or present in cycles[])
     * - risk === 'HIGH'
     */
    get hotspots() {
        if (!this._parsedPayload || !Array.isArray(this._parsedPayload.nodes)) return [];

        const nodes = this._parsedPayload.nodes;
        const cycles = Array.isArray(this._parsedPayload.cycles) ? this._parsedPayload.cycles : [];
        const cyclicNodeIds = new Set();
        cycles.forEach(c => {
            if (Array.isArray(c)) {
                c.forEach(id => cyclicNodeIds.add(id));
            } else if (Array.isArray(c?.nodeIds)) {
                c.nodeIds.forEach(id => cyclicNodeIds.add(id));
            }
        });

        const list = [];
        nodes.forEach(node => {
            const coupling = Number(node.coupling) || (node.metrics && Number(node.metrics.coupling)) || ((node.fanIn || 0) + (node.fanOut || 0)) || 0;
            const fanIn = Number(node.fanIn) || (node.metrics && Number(node.metrics.fanIn)) || 0;
            const fanOut = Number(node.fanOut) || (node.metrics && Number(node.metrics.fanOut)) || 0;
            const isCyclic = !!node.hasCycle || !!node.refactoringReadiness?.hasCycles || cyclicNodeIds.has(node.id);
            const risk = (node.risk || 'NONE').toUpperCase();

            const isHighCoupling = coupling > 15;
            const isHighFanIn = fanIn > 10;
            const isHighRisk = risk === 'HIGH';

            // Hotspot qualification rule
            if (isHighCoupling || isHighFanIn || isCyclic || isHighRisk) {
                // Composite Hotspot Severity Score
                let score = 0;
                if (isHighRisk) score += 40;
                if (isCyclic) score += 30;
                if (isHighCoupling) score += Math.min(25, coupling);
                if (isHighFanIn) score += Math.min(20, fanIn);

                const churn = node.churnRate != null ? node.churnRate : (node.metrics?.churnRate != null ? node.metrics.churnRate : (node.churn != null ? node.churn : '-'));
                const complexity = node.cyclomaticComplexity != null ? node.cyclomaticComplexity : (node.metrics?.cyclomaticComplexity != null ? node.metrics.cyclomaticComplexity : (node.complexity != null ? node.complexity : '-'));

                list.push({
                    id: node.id,
                    label: node.label || node.name || node.displayName || node.id,
                    type: node.type || 'Unknown',
                    layer: node.layer || 'Unassigned',
                    coupling: coupling,
                    fanIn: fanIn,
                    fanOut: fanOut,
                    cyclomaticComplexity: complexity,
                    churnRate: churn,
                    loc: node.loc != null ? node.loc : (node.metrics?.linesOfCode != null ? node.metrics.linesOfCode : '-'),
                    isCyclic: isCyclic,
                    cycleBadge: isCyclic ? 'YES' : 'NO',
                    risk: risk,
                    score: score
                });
            }
        });

        // Deterministic sort: Severity Score DESC, then ID ASC
        list.sort((a, b) => {
            const diff = b.score - a.score;
            return diff !== 0 ? diff : a.id.localeCompare(b.id);
        });

        return list;
    }

    get filteredHotspots() {
        const items = this.hotspots;
        const result = [];
        let rank = 1;

        items.forEach(item => {
            // Category filter
            if (this.selectedCategory === 'coupling' && item.coupling <= 15) return;
            if (this.selectedCategory === 'fanIn' && item.fanIn <= 10) return;
            if (this.selectedCategory === 'cycles' && !item.isCyclic) return;

            // Risk filter
            if (this.selectedRisk && item.risk !== this.selectedRisk) return;

            // Search query
            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase();
                const matchId = (item.id || '').toLowerCase().includes(q);
                const matchLabel = (item.label || '').toLowerCase().includes(q);
                if (!matchId && !matchLabel) return;
            }

            const isSelected = this.selectedNodeId === item.id;
            let riskClass = 'risk-badge';
            if (item.risk === 'HIGH') riskClass += ' risk-high';
            else if (item.risk === 'MEDIUM') riskClass += ' risk-medium';
            else riskClass += ' risk-low';

            result.push({
                ...item,
                rank: rank++,
                rowClass: `hotspot-row ${isSelected ? 'selected' : ''}`,
                riskClass: riskClass
            });
        });

        return result;
    }

    handleSearchChange(event) {
        this.searchQuery = event.target.value;
    }

    handleRiskFilterChange(event) {
        this.selectedRisk = event.target.value;
    }

    handleCategoryFilterChange(event) {
        this.selectedCategory = event.target.value;
    }

    handleRowClick(event) {
        const nodeId = event.currentTarget.dataset.nodeId;
        if (!nodeId) return;

        const node = this._parsedPayload?.nodes?.find(n => n.id === nodeId) || null;

        // Dispatches canonical nodeselect CustomEvent adhering to CONTRACT-06 & SELECTION != NAVIGATION
        this.dispatchEvent(new CustomEvent('nodeselect', {
            detail: {
                nodeId: nodeId,
                node: node,
                sourceView: 'hotspots',
                sourceComponent: 'daHotspotsView',
                timestamp: Date.now()
            },
            bubbles: true,
            composed: true,
            cancelable: false
        }));
    }

    handleExportJSON() {
        if (this.isEmpty) return;

        const dataToExport = {
            exportTimestamp: new Date().toISOString(),
            projectId: this.projectId,
            totalHotspots: this.hotspots.length,
            hotspots: this.hotspots.map((h, idx) => ({
                rank: idx + 1,
                id: h.id,
                label: h.label,
                type: h.type,
                layer: h.layer,
                score: h.score,
                risk: h.risk,
                coupling: h.coupling,
                fanIn: h.fanIn,
                fanOut: h.fanOut,
                cyclomaticComplexity: h.cyclomaticComplexity,
                churnRate: h.churnRate,
                isCyclic: h.isCyclic
            }))
        };

        const jsonStr = JSON.stringify(dataToExport, null, 2);
        this.triggerDownload(`hotspots-report-${this.projectId || 'project'}-${Date.now()}.json`, 'application/json', jsonStr);
    }

    handleExportCSV() {
        if (this.isEmpty) return;

        const headers = ['Rank', 'ID', 'Label', 'Type', 'Layer', 'Score', 'Risk', 'Coupling', 'Fan-In', 'Fan-Out', 'Complexity', 'Cyclic'];
        const rows = this.hotspots.map((h, idx) => [
            idx + 1,
            `"${(h.id || '').replace(/"/g, '""')}"`,
            `"${(h.label || '').replace(/"/g, '""')}"`,
            `"${(h.type || '').replace(/"/g, '""')}"`,
            `"${(h.layer || '').replace(/"/g, '""')}"`,
            h.score,
            `"${h.risk}"`,
            h.coupling,
            h.fanIn,
            h.fanOut,
            `"${h.cyclomaticComplexity}"`,
            h.isCyclic ? 'YES' : 'NO'
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
        this.triggerDownload(`hotspots-report-${this.projectId || 'project'}-${Date.now()}.csv`, 'text/csv;charset=utf-8;', csvContent);
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
