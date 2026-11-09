import { LightningElement, api, track } from 'lwc';

/**
 * Pure LWC implementation of the 9-Dimensional Architecture Radar View.
 * Adheres strictly to CONTRACT-01 (Canonical Graph Payload) and CONTRACT-03 (Radar Nine-Dimension Adapter).
 *
 * Rules:
 * 1. Pure SVG rendering without unsafe D3 or external runtime.
 * 2. Does NOT invent synthetic scores. Raw metrics retain native units.
 * 3. CONTRACT-06 node selection event dispatch without page navigation.
 * 4. Input payload immutability preserved.
 */

export function calculateArchitectureHealth(data) {
    if (!data || !data.summary || data.summary.nodeCount === 0) {
        return {
            score: 100,
            level: 'GOOD',
            riskPercent: 0,
            cycleCount: 0,
            unresolvedCount: 0,
            hotspotCount: 0,
            mainConcerns: ['Empty dataset']
        };
    }

    const nodeCount = data.summary.nodeCount;
    const highRisk = data.summary.highRiskCount || 0;
    const mediumRisk = data.summary.mediumRiskCount || 0;
    const cycleCount = data.summary.cycleCount || (Array.isArray(data.cycles) ? data.cycles.length : 0);
    const unresolvedCount = data.summary.unresolvedCount || 0;

    let hotspotCount = 0;
    for (const node of data.nodes || []) {
        if (
            node.risk === 'HIGH' ||
            (node.metrics?.fanIn || 0) >= 8 ||
            (node.metrics?.coupling || 0) >= 15 ||
            (node.refactoringReadiness?.hasCycles)
        ) {
            hotspotCount++;
        }
    }

    const highRiskPenalty = (highRisk / nodeCount) * 40;
    const mediumRiskPenalty = (mediumRisk / nodeCount) * 15;
    const cyclePenalty = Math.min(30, cycleCount * 10);
    const unresolvedPenalty = Math.min(20, unresolvedCount * 3);
    const hotspotPenalty = Math.min(15, hotspotCount * 2);

    const totalPenalties = highRiskPenalty + mediumRiskPenalty + cyclePenalty + unresolvedPenalty + hotspotPenalty;
    const rawScore = Math.max(0, Math.round(100 - totalPenalties));

    let level = 'GOOD';
    if (rawScore < 60) {
        level = 'HIGH CONCERN';
    } else if (rawScore < 85) {
        level = 'CAUTION';
    }

    const riskPercent = Math.round(((highRisk + mediumRisk) / nodeCount) * 100);

    return {
        score: rawScore,
        level,
        riskPercent,
        cycleCount,
        unresolvedCount,
        hotspotCount
    };
}

export function getVisualNormalizedValue(dim, summary) {
    if (dim.unit === 'score' || dim.unit === 'percent') {
        return Math.min(1, Math.max(0, dim.rawValue / 100));
    }
    if (dim.id === 'total_components') {
        return summary.totalComponents > 0 ? 1.0 : 0;
    }
    if (dim.id === 'total_dependencies') {
        return summary.totalDependencies > 0 ? 1.0 : 0;
    }
    if (dim.id === 'high_risk_components' || dim.id === 'medium_risk_components') {
        return summary.totalComponents > 0 ? Math.min(1, dim.rawValue / summary.totalComponents) : 0;
    }
    if (dim.id === 'circular_dependencies') {
        const refMax = Math.max(10, summary.totalComponents * 0.1);
        return Math.min(1, dim.rawValue / refMax);
    }
    if (dim.id === 'unresolved_references' || dim.id === 'architectural_hotspots') {
        const refMax = Math.max(20, summary.totalComponents * 0.2);
        return Math.min(1, dim.rawValue / refMax);
    }
    return Math.min(1, Math.max(0, dim.rawValue / 100));
}

export function adaptRadarDimensions(input) {
    const nodes = Array.isArray(input?.nodes) ? input.nodes : [];
    const edges = Array.isArray(input?.edges) ? input.edges : [];
    const cycles = Array.isArray(input?.cycles) ? input.cycles : [];

    const sortedNodes = [...nodes].sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    const sortedEdges = [...edges].sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    const sortedCycles = [...cycles].sort((a, b) => (a.id || '').localeCompare(b.id || ''));

    const summaryInput = {
        summary: {
            nodeCount: sortedNodes.length,
            edgeCount: sortedEdges.length,
            highRiskCount: input?.summary?.highRiskCount ?? sortedNodes.filter(n => n.risk === 'HIGH' || n.refactoringReadiness?.isHighRisk).length,
            mediumRiskCount: input?.summary?.mediumRiskCount ?? sortedNodes.filter(n => n.risk === 'MEDIUM').length,
            cycleCount: sortedCycles.length,
            unresolvedCount: input?.summary?.unresolvedCount ?? 0
        },
        nodes: sortedNodes,
        edges: sortedEdges,
        cycles: sortedCycles
    };

    const health = calculateArchitectureHealth(summaryInput);

    let hotspotCount = 0;
    sortedNodes.forEach(node => {
        if (
            node.risk === 'HIGH' ||
            (node.metrics?.fanIn || 0) >= 8 ||
            (node.metrics?.coupling || 0) >= 15 ||
            (node.refactoringReadiness?.hasCycles)
        ) {
            hotspotCount++;
        }
    });

    const totalNodes = sortedNodes.length;
    const totalEdges = sortedEdges.length;
    const cycleCount = sortedCycles.length;
    const unresolvedCount = summaryInput.summary.unresolvedCount;
    const highRiskCount = summaryInput.summary.highRiskCount;
    const mediumRiskCount = summaryInput.summary.mediumRiskCount;

    const dimensions = [
        {
            id: 'architecture_health',
            label: 'Architecture Health',
            value: health.score,
            rawValue: health.score,
            unit: 'score',
            sourceMetric: 'calculateArchitectureHealth().score',
            hasAuthoritativeScore: true,
            description: 'Overall architectural health score out of 100 calculated by health heuristic'
        },
        {
            id: 'risk_exposure',
            label: 'Risk Exposure',
            value: health.riskPercent,
            rawValue: health.riskPercent,
            unit: 'percent',
            sourceMetric: 'calculateArchitectureHealth().riskPercent',
            hasAuthoritativeScore: true,
            description: 'Percentage of components classified as HIGH or MEDIUM risk'
        },
        {
            id: 'circular_dependencies',
            label: 'Circular Dependencies',
            value: cycleCount,
            rawValue: cycleCount,
            unit: 'count',
            sourceMetric: 'input.cycles.length / input.summary.cycleCount',
            hasAuthoritativeScore: false,
            description: 'Total number of circular dependency groups in the project'
        },
        {
            id: 'unresolved_references',
            label: 'Unresolved References',
            value: unresolvedCount,
            rawValue: unresolvedCount,
            unit: 'count',
            sourceMetric: 'input.summary.unresolvedCount',
            hasAuthoritativeScore: false,
            description: 'Total count of unresolved external or missing component references'
        },
        {
            id: 'architectural_hotspots',
            label: 'Architectural Hotspots',
            value: hotspotCount,
            rawValue: hotspotCount,
            unit: 'count',
            sourceMetric: 'getArchitecturalHotspots().topRanked.length',
            hasAuthoritativeScore: false,
            description: 'Total count of components exceeding fan-in, coupling, or risk hotspot thresholds'
        },
        {
            id: 'high_risk_components',
            label: 'High Risk Components',
            value: highRiskCount,
            rawValue: highRiskCount,
            unit: 'count',
            sourceMetric: 'input.summary.highRiskCount',
            hasAuthoritativeScore: false,
            description: 'Total count of components classified as HIGH risk'
        },
        {
            id: 'medium_risk_components',
            label: 'Medium Risk Components',
            value: mediumRiskCount,
            rawValue: mediumRiskCount,
            unit: 'count',
            sourceMetric: 'input.summary.mediumRiskCount',
            hasAuthoritativeScore: false,
            description: 'Total count of components classified as MEDIUM risk'
        },
        {
            id: 'total_components',
            label: 'Total Components',
            value: totalNodes,
            rawValue: totalNodes,
            unit: 'count',
            sourceMetric: 'input.nodes.length / input.summary.nodeCount',
            hasAuthoritativeScore: false,
            description: 'Total count of architectural components in the project'
        },
        {
            id: 'total_dependencies',
            label: 'Total Dependencies',
            value: totalEdges,
            rawValue: totalEdges,
            unit: 'count',
            sourceMetric: 'input.edges.length / input.summary.edgeCount',
            hasAuthoritativeScore: false,
            description: 'Total count of directed dependency relationships in the project'
        }
    ];

    const missingPrimitives = [
        {
            dimension: 'Layer Purity Score',
            reason: 'No authoritative 0-100 layer purity or illegal layer dependency scoring model exists in the project.'
        },
        {
            dimension: 'Dependency Health Index',
            reason: 'No authoritative normalized dependency health or fan-in/fan-out balance metric exists in the project.'
        },
        {
            dimension: 'Test Coverage Score',
            reason: 'Node testCoverageStatus is categorical (COVERED, UNTESTED), not a percentage or aggregate score.'
        }
    ];

    const summary = {
        architectureHealthScore: health.score,
        healthLevel: health.level,
        riskPercent: health.riskPercent,
        totalComponents: totalNodes,
        totalDependencies: totalEdges,
        cycleCount,
        unresolvedCount,
        hotspotCount,
        highRiskCount,
        mediumRiskCount
    };

    return {
        dimensions,
        summary,
        missingPrimitives
    };
}

export default class DaRadarView extends LightningElement {
    @api projectId;
    @api selectedNodeId;

    @track selectedDimId = null;
    @track errorMessage = '';

    _rawPayload = null;
    _parsedPayload = null;
    _radarData = null;

    width = 560;
    height = 440;
    centerX = 280;
    centerY = 220;
    radius = 125;

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
            this._radarData = null;
            return;
        }

        if (typeof this._rawPayload === 'string') {
            try {
                this._parsedPayload = JSON.parse(this._rawPayload);
            } catch (err) {
                this.errorMessage = 'Malformed graph payload JSON';
                this._parsedPayload = null;
                this._radarData = null;
                return;
            }
        } else if (typeof this._rawPayload === 'object') {
            this._parsedPayload = this._rawPayload;
        } else {
            this.errorMessage = 'Invalid payload format';
            this._parsedPayload = null;
            this._radarData = null;
            return;
        }

        try {
            this._radarData = adaptRadarDimensions(this._parsedPayload);
        } catch (e) {
            this.errorMessage = 'Failed to calculate radar dimensions';
            this._radarData = null;
        }
    }

    get hasError() {
        return !!this.errorMessage;
    }

    get isEmpty() {
        if (!this._parsedPayload || !Array.isArray(this._parsedPayload.nodes)) return true;
        return this._parsedPayload.nodes.length === 0;
    }

    get summary() {
        return this._radarData?.summary || null;
    }

    get healthBadgeClass() {
        if (!this.summary) return 'health-badge';
        if (this.summary.healthLevel === 'GOOD') return 'health-badge health-good';
        if (this.summary.healthLevel === 'CAUTION') return 'health-badge health-caution';
        return 'health-badge health-concern';
    }

    get renderedRings() {
        if (this.isEmpty || this.hasError || !this._radarData) return [];
        const dims = this._radarData.dimensions;
        const count = dims.length;
        const angleStep = (2 * Math.PI) / count;
        const ringLevels = [0.25, 0.5, 0.75, 1.0];

        return ringLevels.map(level => {
            const ringRadius = this.radius * level;
            const pts = dims.map((_, idx) => {
                const angle = idx * angleStep - Math.PI / 2;
                const x = this.centerX + ringRadius * Math.cos(angle);
                const y = this.centerY + ringRadius * Math.sin(angle);
                return `${x.toFixed(1)},${y.toFixed(1)}`;
            }).join(' ');

            return {
                level,
                points: pts
            };
        });
    }

    get renderedAxes() {
        if (this.isEmpty || this.hasError || !this._radarData) return [];
        const dims = this._radarData.dimensions;
        const count = dims.length;
        const angleStep = (2 * Math.PI) / count;
        const summary = this._radarData.summary;

        return dims.map((dim, idx) => {
            const angle = idx * angleStep - Math.PI / 2;
            const xEnd = this.centerX + this.radius * Math.cos(angle);
            const yEnd = this.centerY + this.radius * Math.sin(angle);

            const normVal = getVisualNormalizedValue(dim, summary);
            const xVal = this.centerX + this.radius * normVal * Math.cos(angle);
            const yVal = this.centerY + this.radius * normVal * Math.sin(angle);

            const labelRadius = this.radius + 18;
            const xLabel = this.centerX + labelRadius * Math.cos(angle);
            const yLabel = this.centerY + labelRadius * Math.sin(angle);

            const isSelected = this.selectedDimId === dim.id;

            let textAnchor = 'middle';
            if (xLabel > this.centerX + 15) textAnchor = 'start';
            else if (xLabel < this.centerX - 15) textAnchor = 'end';

            return {
                id: dim.id,
                label: dim.label,
                xEnd: xEnd.toFixed(1),
                yEnd: yEnd.toFixed(1),
                xVal: xVal.toFixed(1),
                yVal: yVal.toFixed(1),
                xLabel: xLabel.toFixed(1),
                yLabel: yLabel.toFixed(1),
                textAnchor: textAnchor,
                groupClass: `axis-group ${isSelected ? 'highlighted' : ''}`,
                labelColor: isSelected ? '#38bdf8' : '#cbd5e1',
                fontSize: isSelected ? '11' : '10',
                fontWeight: isSelected ? '700' : '500',
                pointRadius: isSelected ? 6 : 4,
                pointFill: isSelected ? '#60a5fa' : '#3b82f6',
                pointStrokeWidth: isSelected ? 2 : 1,
                tooltip: `${dim.label}: ${dim.rawValue} (${dim.unit})`,
                testId: `radar-axis-${dim.id}`
            };
        });
    }

    get polygonPointsString() {
        const axes = this.renderedAxes;
        if (!axes.length) return '';
        return axes.map(a => `${a.xVal},${a.yVal}`).join(' ');
    }

    get activeDimension() {
        if (!this._radarData) return null;
        const targetId = this.selectedDimId || 'architecture_health';
        const dim = this._radarData.dimensions.find(d => d.id === targetId);
        if (!dim) return null;

        let unitSuffix = 'items';
        if (dim.unit === 'score') unitSuffix = '/ 100 points';
        else if (dim.unit === 'percent') unitSuffix = '%';

        let badgeClass = 'unit-badge unit-count';
        if (dim.unit === 'score') badgeClass = 'unit-badge unit-score';
        else if (dim.unit === 'percent') badgeClass = 'unit-badge unit-percent';

        return {
            ...dim,
            unitSuffix,
            unitBadgeClass: badgeClass
        };
    }

    get renderedDimensionsTable() {
        if (!this._radarData) return [];
        return this._radarData.dimensions.map(dim => {
            const isSelected = this.selectedDimId === dim.id;
            let badgeClass = 'unit-badge unit-count';
            if (dim.unit === 'score') badgeClass = 'unit-badge unit-score';
            else if (dim.unit === 'percent') badgeClass = 'unit-badge unit-percent';

            return {
                id: dim.id,
                label: dim.label,
                rawValue: dim.rawValue,
                unit: dim.unit,
                rowClass: `dim-row ${isSelected ? 'selected' : ''}`,
                unitBadgeClass: badgeClass
            };
        });
    }

    get missingPrimitivesList() {
        return this._radarData?.missingPrimitives || [];
    }

    handleAxisClick(event) {
        const dimId = event.currentTarget.dataset.dimId;
        if (dimId) {
            this.selectedDimId = this.selectedDimId === dimId ? null : dimId;
        }
    }

    handleRowClick(event) {
        const dimId = event.currentTarget.dataset.dimId;
        if (dimId) {
            this.selectedDimId = this.selectedDimId === dimId ? null : dimId;
        }
    }

    // Handles component node selection event emission adhering to CONTRACT-06 & SELECTION != NAVIGATION
    @api
    selectNode(nodeId) {
        if (!nodeId) return;
        const node = this._parsedPayload?.nodes?.find(n => n.id === nodeId) || null;

        this.dispatchEvent(new CustomEvent('nodeselect', {
            detail: {
                nodeId: nodeId,
                node: node,
                sourceView: 'radar'
            },
            bubbles: true,
            composed: true,
            cancelable: false
        }));
    }
}
