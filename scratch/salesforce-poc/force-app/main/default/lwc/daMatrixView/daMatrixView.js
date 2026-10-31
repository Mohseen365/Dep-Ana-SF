import { LightningElement, api, track } from 'lwc';
import { matchesMatrixEdge, normalizeFilterCriteria } from 'c/daFilterSchema';

/**
 * DaMatrixView LWC (Lane E)
 * Minimal functional Dependency Matrix View per DEC-W4-04 Option C.
 * Derives directed source-to-target dependency counts using the existing graph analytics payload:
 * nodes[], edges[], edge.canonical.source.type, edge.canonical.target.type, edge.unresolved.
 *
 * Unresolved edge handling:
 * 1. Derives target type from edge.canonical.target.type if present.
 * 2. If target is string with format 'Type:Name', derives type from prefix.
 * 3. Falls back to explicit documented category 'Unresolved' rather than discarding or inventing types.
 * 4. Deduplicates edge references to prevent double counting.
 */
export default class DaMatrixView extends LightningElement {
    @api projectId = null;

    _graphPayload = null;
    _filterCriteria = null;

    @track isLoading = false;
    @track error = null;

    @track matrixRows = [];
    @track targetTypes = [];
    @track totalDependencies = 0;

    @api
    get graphPayload() {
        return this._graphPayload;
    }
    set graphPayload(value) {
        this._graphPayload = value;
        this.computeMatrix();
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

    computeMatrix() {
        this.error = null;

        if (!this._graphPayload) {
            this.matrixRows = [];
            this.targetTypes = [];
            this.totalDependencies = 0;
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
                return;
            }

            const rawNodes = Array.isArray(payload.nodes) ? payload.nodes : [];
            const rawEdges = Array.isArray(payload.edges) ? payload.edges : [];

            // Node lookup map
            const nodeMap = new Map();
            rawNodes.forEach(node => {
                if (node && node.id) {
                    nodeMap.set(node.id, node);
                }
            });

            // Map: SourceType -> Map<TargetType, count>
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

                // 1. Determine Source Type
                let sourceType = 'Unknown';
                if (edge.canonical?.source?.type) {
                    sourceType = edge.canonical.source.type;
                } else if (sourceNode?.type) {
                    sourceType = sourceNode.type;
                } else if (typeof edge.source === 'string' && edge.source.includes(':')) {
                    sourceType = edge.source.split(':')[0];
                }

                // 2. Determine Target Type (Mandatory Unresolved-Edge Behavior)
                let targetType = 'Unresolved';
                if (edge.canonical?.target?.type) {
                    targetType = edge.canonical.target.type;
                } else if (targetNode?.type) {
                    targetType = targetNode.type;
                } else if (typeof edge.target === 'string' && edge.target.includes(':')) {
                    targetType = edge.target.split(':')[0];
                } else if (edge.unresolved) {
                    targetType = 'Unresolved';
                }

                if (!aggregation.has(sourceType)) {
                    aggregation.set(sourceType, new Map());
                }

                const targetMap = aggregation.get(sourceType);
                const currentCount = targetMap.get(targetType) || 0;
                targetMap.set(targetType, currentCount + 1);

                allTargetTypesSet.add(targetType);
                total++;
            });

            const sortedTargetTypes = Array.from(allTargetTypesSet).sort();
            const sortedSourceTypes = Array.from(aggregation.keys()).sort();

            const rows = sortedSourceTypes.map(sourceType => {
                const targetMap = aggregation.get(sourceType);
                let rowTotal = 0;

                const cells = sortedTargetTypes.map(targetType => {
                    const count = targetMap.get(targetType) || 0;
                    rowTotal += count;
                    return {
                        targetType,
                        count,
                        cellClass: count > 0 ? 'cell-highlight' : 'cell-zero'
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
}
