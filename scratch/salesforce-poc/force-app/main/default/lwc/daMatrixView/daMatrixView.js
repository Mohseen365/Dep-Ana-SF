import { LightningElement, api, track } from 'lwc';
import { matchesMatrixEdge, normalizeFilterCriteria } from 'c/daFilterSchema';

/**
 * DaMatrixView LWC (Workstream 3 / Lane E)
 * High-performance dependency matrix view per DEC-W4-04 Option C.
 * Derives directed source-to-target dependency counts using canonical graph analytics payload.
 *
 * Capabilities:
 * - Directed source-to-target dependency aggregation.
 * - Layer filtering & search.
 * - Interactive cell hover/selection with detailed directional flow inspector.
 * - Node selection dispatch (`nodeselect` with bubbles/composed/cancelable: false) adhering to SELECTION != NAVIGATION.
 * - CSV and JSON export of the complete dependency matrix.
 * - Strict input immutability.
 * - Supports both @api graphPayload and @api payload properties.
 */
export default class DaMatrixView extends LightningElement {
    @api projectId = null;
    @api selectedNodeId = null;

    _graphPayload = null;
    _filterCriteria = null;

    @track isLoading = false;
    @track error = null;

    @track matrixRows = [];
    @track targetTypes = [];
    @track totalDependencies = 0;

    // Layer filtering
    @track availableLayers = [];
    @track selectedLayer = 'ALL';

    // Cell interaction inspector
    @track selectedCell = null; // { sourceType, targetType, count, sampleEdges: [] }
    @track hoveredCell = null;

    @api
    get graphPayload() {
        return this._graphPayload;
    }
    set graphPayload(value) {
        this._graphPayload = value;
        this.computeMatrix();
    }

    @api
    get payload() {
        return this.graphPayload;
    }
    set payload(value) {
        this.graphPayload = value;
    }

    @api
    get filterCriteria() {
        return this._filterCriteria;
    }
    set filterCriteria(value) {
        this._filterCriteria = normalizeFilterCriteria(value);
        this.computeMatrix();
    }

    get hasData() {
        return this.matrixRows && this.matrixRows.length > 0 && this.totalDependencies > 0;
    }

    get hasSelectedCell() {
        return !!this.selectedCell;
    }

    computeMatrix() {
        this.error = null;

        if (!this._graphPayload) {
            this.matrixRows = [];
            this.targetTypes = [];
            this.totalDependencies = 0;
            this.availableLayers = [];
            return;
        }

        try {
            let payload = this._graphPayload;
            if (typeof payload === 'string') {
                payload = JSON.parse(payload);
            }

            if (!payload || typeof payload !== 'object') {
                this.matrixRows = [];
                this.targetTypes = [];
                this.totalDependencies = 0;
                this.availableLayers = [];
                return;
            }

            const rawNodes = Array.isArray(payload.nodes) ? payload.nodes : [];
            const rawEdges = Array.isArray(payload.edges) ? payload.edges : [];

            // Node lookup map & collect layers
            const nodeMap = new Map();
            const layersSet = new Set();

            rawNodes.forEach(node => {
                if (node && node.id) {
                    nodeMap.set(node.id, node);
                    if (node.layer) layersSet.add(node.layer);
                }
            });

            this.availableLayers = ['ALL', ...Array.from(layersSet).sort()];

            // Map: SourceType -> Map<TargetType, { count, edges: [] }>
            const aggregation = new Map();
            const allTargetTypesSet = new Set();
            const seenEdgeIds = new Set();
            let total = 0;

            const criteria = this._filterCriteria || {};

            rawEdges.forEach((edge, idx) => {
                if (!edge || !edge.source) {
                    return; // Corrupt edge ignored
                }

                // Prevent double-counting if edge has unique id
                const edgeKey = edge.id || `${edge.source}->${edge.target || 'unresolved'}-${idx}`;
                if (seenEdgeIds.has(edgeKey)) {
                    return;
                }
                seenEdgeIds.add(edgeKey);

                const sourceNode = nodeMap.get(edge.source) || null;
                const targetNode = edge.target ? nodeMap.get(edge.target) : null;

                // Evaluate canonical filter predicate
                if (!matchesMatrixEdge(edge, sourceNode, targetNode, criteria)) {
                    return;
                }

                // Layer filter check (if specific layer selected)
                if (this.selectedLayer !== 'ALL') {
                    const sourceLayer = sourceNode?.layer || 'Unassigned';
                    const targetLayer = targetNode?.layer || 'Unassigned';
                    if (sourceLayer !== this.selectedLayer && targetLayer !== this.selectedLayer) {
                        return;
                    }
                }

                // 1. Determine Source Type
                let sourceType = 'Unknown';
                if (edge.canonical?.source?.type) {
                    sourceType = edge.canonical.source.type;
                } else if (sourceNode?.type) {
                    sourceType = sourceNode.type;
                } else if (typeof edge.source === 'string' && edge.source.includes(':')) {
                    sourceType = edge.source.split(':')[0];
                } else if (typeof edge.source === 'string' && edge.source.includes('.')) {
                    sourceType = edge.source.split('.')[0];
                }

                // 2. Determine Target Type (Mandatory Unresolved-Edge Behavior)
                let targetType = 'Unresolved';
                if (edge.canonical?.target?.type) {
                    targetType = edge.canonical.target.type;
                } else if (targetNode?.type) {
                    targetType = targetNode.type;
                } else if (typeof edge.target === 'string' && edge.target.includes(':')) {
                    targetType = edge.target.split(':')[0];
                } else if (typeof edge.target === 'string' && edge.target.includes('.')) {
                    targetType = edge.target.split('.')[0];
                } else if (edge.unresolved) {
                    targetType = 'Unresolved';
                }

                if (!aggregation.has(sourceType)) {
                    aggregation.set(sourceType, new Map());
                }

                const targetMap = aggregation.get(sourceType);
                if (!targetMap.has(targetType)) {
                    targetMap.set(targetType, { count: 0, sampleEdges: [] });
                }

                const cellData = targetMap.get(targetType);
                cellData.count++;
                if (cellData.sampleEdges.length < 5) {
                    cellData.sampleEdges.push({
                        source: edge.source,
                        target: edge.target || 'Unresolved'
                    });
                }

                allTargetTypesSet.add(targetType);
                total++;
            });

            const sortedTargetTypes = Array.from(allTargetTypesSet).sort();
            const sortedSourceTypes = Array.from(aggregation.keys()).sort();

            const rows = sortedSourceTypes.map(sourceType => {
                const targetMap = aggregation.get(sourceType);
                let rowTotal = 0;

                const cells = sortedTargetTypes.map(targetType => {
                    const data = targetMap ? targetMap.get(targetType) : null;
                    const count = data ? data.count : 0;
                    rowTotal += count;

                    const isCellSelected = this.selectedCell &&
                        this.selectedCell.sourceType === sourceType &&
                        this.selectedCell.targetType === targetType;

                    let cellClass = count > 0 ? 'cell-highlight' : 'cell-zero';
                    if (isCellSelected) cellClass += ' cell-selected';

                    return {
                        sourceType,
                        targetType,
                        count,
                        cellClass,
                        sampleEdges: data ? data.sampleEdges : []
                    };
                });

                return {
                    sourceType,
                    cells,
                    total: rowTotal
                };
            });

            this.targetTypes = sortedTargetTypes;
            this.matrixRows = rows;
            this.totalDependencies = total;
        } catch (err) {
            this.error = 'Failed to calculate dependency matrix: ' + (err.message || err);
            this.matrixRows = [];
            this.targetTypes = [];
            this.totalDependencies = 0;
        }
    }

    handleLayerChange(event) {
        this.selectedLayer = event.target.value;
        this.computeMatrix();
    }

    handleCellClick(event) {
        const sourceType = event.currentTarget.dataset.source;
        const targetType = event.currentTarget.dataset.target;
        const count = parseInt(event.currentTarget.dataset.count, 10) || 0;

        if (count === 0) {
            this.selectedCell = null;
            this.computeMatrix();
            return;
        }

        const row = this.matrixRows.find(r => r.sourceType === sourceType);
        const cell = row?.cells?.find(c => c.targetType === targetType);

        this.selectedCell = {
            sourceType,
            targetType,
            count,
            sampleEdges: cell?.sampleEdges || []
        };

        this.computeMatrix();
    }

    handleSelectAnchor(event) {
        event.stopPropagation();
        const nodeId = event.currentTarget.dataset.nodeId;
        if (!nodeId) return;

        this.selectedNodeId = nodeId;

        // CONTRACT-06 & SELECTION != NAVIGATION
        this.dispatchEvent(new CustomEvent('nodeselect', {
            detail: {
                nodeId: nodeId,
                sourceView: 'matrix',
                sourceComponent: 'daMatrixView',
                timestamp: Date.now()
            },
            bubbles: true,
            composed: true,
            cancelable: false
        }));
    }

    handleCloseInspector() {
        this.selectedCell = null;
        this.computeMatrix();
    }

    handleExportJSON() {
        if (!this.matrixRows || this.matrixRows.length === 0) return;

        const dataToExport = {
            exportTimestamp: new Date().toISOString(),
            projectId: this.projectId,
            totalDependencies: this.totalDependencies,
            targetTypes: this.targetTypes,
            matrix: this.matrixRows.map(row => ({
                sourceType: row.sourceType,
                total: row.total,
                dependencies: row.cells.map(c => ({
                    targetType: c.targetType,
                    count: c.count
                }))
            }))
        };

        const jsonStr = JSON.stringify(dataToExport, null, 2);
        this.triggerDownload(`dependency-matrix-${this.projectId || 'project'}-${Date.now()}.json`, 'application/json', jsonStr);
    }

    handleExportCSV() {
        if (!this.matrixRows || this.matrixRows.length === 0) return;

        const headers = ['Source \\ Target', ...this.targetTypes, 'Total'];
        const rows = this.matrixRows.map(row => {
            const cellCounts = row.cells.map(c => c.count);
            return [`"${row.sourceType}"`, ...cellCounts, row.total];
        });

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
        this.triggerDownload(`dependency-matrix-${this.projectId || 'project'}-${Date.now()}.csv`, 'text/csv;charset=utf-8;', csvContent);
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
