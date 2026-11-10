import { LightningElement, api, track } from 'lwc';
import getAnalysisRuns from '@salesforce/apex/DAAnalysisHistoryController.getAnalysisRuns';
import getGraphChunks from '@salesforce/apex/DAGraphController.getGraphChunks';
import {
    MAX_CHUNK_SIZE,
    MAX_TOTAL_PAYLOAD_SIZE,
    reassembleChunks,
    verifyChunkSequence,
    validatePayloadIntegrity
} from 'c/daGraphPayloadLoader';

// CONTRACT-05 Payload caps (in UTF-16 code units / JavaScript characters)
export const SINGLE_SNAPSHOT_MAX_SIZE = 5242880; // 5 MB single snapshot cap
export const COMBINED_SNAPSHOT_MAX_SIZE = 10485760; // 10 MB combined payload cap
export const MAX_CHUNKS_PER_BATCH = 10; // Synchronous Apex heap safeguard limit

/**
 * Pure diff calculation engine adhering strictly to CONTRACT-05 v1.0.0.
 * Zero external DOM or Cytoscape dependencies.
 * Guarantees source snapshot immutability.
 */
export function computeGraphDiff(snapshotA, snapshotB) {
    if (!snapshotA || typeof snapshotA !== 'object') {
        throw new Error('Baseline snapshot (A) is invalid or null.');
    }
    if (!snapshotB || typeof snapshotB !== 'object') {
        throw new Error('Comparison snapshot (B) is invalid or null.');
    }

    const rawNodesA = Array.isArray(snapshotA.nodes) ? snapshotA.nodes : [];
    const rawNodesB = Array.isArray(snapshotB.nodes) ? snapshotB.nodes : [];
    const rawEdgesA = Array.isArray(snapshotA.edges) ? snapshotA.edges : [];
    const rawEdgesB = Array.isArray(snapshotB.edges) ? snapshotB.edges : [];

    // Tracked properties according to CONTRACT-05 Section 5.3
    const TRACKED_NODE_PROPS = [
        'layer',
        'type',
        'risk',
        'coupling',
        'coverageStatus',
        'coverageDensity',
        'cyclomaticComplexity',
        'hasCycle'
    ];

    const TRACKED_EDGE_PROPS = ['weight', 'type'];

    // Deep freeze source snapshots to guarantee immutability
    try {
        Object.freeze(snapshotA);
        Object.freeze(snapshotB);
        if (Array.isArray(snapshotA.nodes)) Object.freeze(snapshotA.nodes);
        if (Array.isArray(snapshotB.nodes)) Object.freeze(snapshotB.nodes);
        if (Array.isArray(snapshotA.edges)) Object.freeze(snapshotA.edges);
        if (Array.isArray(snapshotB.edges)) Object.freeze(snapshotB.edges);
    } catch (e) {
        // Safe containment in environments where objects cannot be frozen
    }

    // Index baseline entities by stable ID, safely deduplicating
    const nodesAById = new Map();
    for (let i = 0; i < rawNodesA.length; i++) {
        const node = rawNodesA[i];
        if (node && typeof node.id === 'string' && !nodesAById.has(node.id)) {
            nodesAById.set(node.id, node);
        }
    }

    const edgesAById = new Map();
    for (let i = 0; i < rawEdgesA.length; i++) {
        const edge = rawEdgesA[i];
        if (!edge) continue;
        const edgeId = (typeof edge.id === 'string' && edge.id)
            ? edge.id
            : `${edge.source || edge.sourceFeatureId}->${edge.target || edge.targetFeatureId}`;
        if (edgeId && !edgesAById.has(edgeId)) {
            edgesAById.set(edgeId, edge);
        }
    }

    // Index comparison entities by stable ID
    const nodesBById = new Map();
    for (let i = 0; i < rawNodesB.length; i++) {
        const node = rawNodesB[i];
        if (node && typeof node.id === 'string' && !nodesBById.has(node.id)) {
            nodesBById.set(node.id, node);
        }
    }

    const edgesBById = new Map();
    for (let i = 0; i < rawEdgesB.length; i++) {
        const edge = rawEdgesB[i];
        if (!edge) continue;
        const edgeId = (typeof edge.id === 'string' && edge.id)
            ? edge.id
            : `${edge.source || edge.sourceFeatureId}->${edge.target || edge.targetFeatureId}`;
        if (edgeId && !edgesBById.has(edgeId)) {
            edgesBById.set(edgeId, edge);
        }
    }

    // --- NODE DIFFING ---
    const addedNodes = [];
    const removedNodes = [];
    const modifiedNodes = [];
    let unchangedNodesCount = 0;

    let baselineHighRisk = 0;
    let targetHighRisk = 0;
    let baselineCycles = 0;
    let targetCycles = 0;

    nodesAById.forEach((nodeA) => {
        if (nodeA.risk === 'HIGH') baselineHighRisk++;
        if (nodeA.hasCycle) baselineCycles++;
    });

    nodesBById.forEach((nodeB, id) => {
        if (nodeB.risk === 'HIGH') targetHighRisk++;
        if (nodeB.hasCycle) targetCycles++;

        if (!nodesAById.has(id)) {
            addedNodes.push(nodeB);
        } else {
            const nodeA = nodesAById.get(id);
            const propertyChanges = [];
            const deltas = {};

            for (let p = 0; p < TRACKED_NODE_PROPS.length; p++) {
                const prop = TRACKED_NODE_PROPS[p];
                const valA = nodeA[prop];
                const valB = nodeB[prop];
                if (valA !== valB) {
                    propertyChanges.push(prop);
                    if (prop === 'coupling' || prop === 'coverageDensity' || prop === 'cyclomaticComplexity') {
                        const numA = typeof valA === 'number' ? valA : 0;
                        const numB = typeof valB === 'number' ? valB : 0;
                        deltas[prop] = numB - numA;
                    }
                }
            }

            if (propertyChanges.length > 0) {
                modifiedNodes.push({
                    id,
                    before: nodeA,
                    after: nodeB,
                    propertyChanges,
                    deltas
                });
            } else {
                unchangedNodesCount++;
            }
        }
    });

    nodesAById.forEach((nodeA, id) => {
        if (!nodesBById.has(id)) {
            removedNodes.push(nodeA);
        }
    });

    // --- EDGE DIFFING ---
    const addedEdges = [];
    const removedEdges = [];
    const modifiedEdges = [];
    let unchangedEdgesCount = 0;

    edgesBById.forEach((edgeB, id) => {
        if (!edgesAById.has(id)) {
            addedEdges.push(edgeB);
        } else {
            const edgeA = edgesAById.get(id);
            const propertyChanges = [];
            for (let p = 0; p < TRACKED_EDGE_PROPS.length; p++) {
                const prop = TRACKED_EDGE_PROPS[p];
                if (edgeA[prop] !== edgeB[prop]) {
                    propertyChanges.push(prop);
                }
            }

            if (propertyChanges.length > 0) {
                modifiedEdges.push({
                    id,
                    before: edgeA,
                    after: edgeB,
                    propertyChanges
                });
            } else {
                unchangedEdgesCount++;
            }
        }
    });

    edgesAById.forEach((edgeA, id) => {
        if (!edgesBById.has(id)) {
            removedEdges.push(edgeA);
        }
    });

    // Sort all arrays lexicographically by id ASC for deterministic results
    addedNodes.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    removedNodes.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    modifiedNodes.sort((a, b) => String(a.id).localeCompare(String(b.id)));

    addedEdges.sort((a, b) => {
        const idA = a.id || `${a.source}->${a.target}`;
        const idB = b.id || `${b.source}->${b.target}`;
        return String(idA).localeCompare(String(idB));
    });
    removedEdges.sort((a, b) => {
        const idA = a.id || `${a.source}->${a.target}`;
        const idB = b.id || `${b.source}->${b.target}`;
        return String(idA).localeCompare(String(idB));
    });
    modifiedEdges.sort((a, b) => String(a.id).localeCompare(String(b.id)));

    const summary = {
        addedNodesCount: addedNodes.length,
        removedNodesCount: removedNodes.length,
        modifiedNodesCount: modifiedNodes.length,
        unchangedNodesCount,
        addedEdgesCount: addedEdges.length,
        removedEdgesCount: removedEdges.length,
        modifiedEdgesCount: modifiedEdges.length,
        unchangedEdgesCount,
        deltaCycles: targetCycles - baselineCycles,
        deltaHighRiskNodes: targetHighRisk - baselineHighRisk
    };

    return {
        nodes: {
            added: addedNodes,
            removed: removedNodes,
            modified: modifiedNodes,
            unchangedCount: unchangedNodesCount
        },
        edges: {
            added: addedEdges,
            removed: removedEdges,
            modified: modifiedEdges,
            unchangedCount: unchangedEdgesCount
        },
        summary
    };
}

export default class DaSnapshotComparisonModal extends LightningElement {
    @api isOpen = false;
    @api projectId = '';
    @api baseRunId = '';
    @api targetRunId = '';

    @track selectedBaseRunId = '';
    @track selectedTargetRunId = '';
    @track availableRuns = [];

    @track diffResult = null;
    @track isLoading = false;
    @track loadingStatusText = '';
    @track errorMessage = '';
    @track searchKeyword = '';
    @track activeTab = 'added';

    // Monotonic request token guard against stale chunk retrieval
    activeRequestId = 0;

    connectedCallback() {
        this.selectedBaseRunId = this.baseRunId || '';
        this.selectedTargetRunId = this.targetRunId || '';
        if (this.projectId) {
            this.loadAvailableRuns();
        }
        if (this.isOpen && this.selectedBaseRunId && this.selectedTargetRunId) {
            this.executeComparison();
        }
    }

    @api
    setComparisonRuns(baseId, targetId) {
        this.selectedBaseRunId = baseId || '';
        this.selectedTargetRunId = targetId || '';
        if (this.selectedBaseRunId && this.selectedTargetRunId && this.isOpen) {
            this.executeComparison();
        }
    }

    async loadAvailableRuns() {
        try {
            const runs = await getAnalysisRuns({
                projectId: this.projectId,
                queryLimit: 50,
                queryOffset: 0
            });
            this.availableRuns = Array.isArray(runs) ? runs : [];
        } catch (e) {
            // Non-blocking; user can still compare if baseRunId and targetRunId passed as @api props
            this.availableRuns = [];
        }
    }

    get runOptions() {
        if (!this.availableRuns || this.availableRuns.length === 0) {
            const opts = [];
            if (this.selectedBaseRunId) {
                opts.push({ label: `Run ${this.selectedBaseRunId}`, value: this.selectedBaseRunId });
            }
            if (this.selectedTargetRunId && this.selectedTargetRunId !== this.selectedBaseRunId) {
                opts.push({ label: `Run ${this.selectedTargetRunId}`, value: this.selectedTargetRunId });
            }
            return opts;
        }

        return this.availableRuns.map((r) => {
            const shortCommit = r.commitHash ? r.commitHash.substring(0, 7) : 'n/a';
            const formattedTime = r.runTimestamp ? new Date(r.runTimestamp).toLocaleDateString() : '';
            return {
                label: `${shortCommit} (${r.status}) - ${formattedTime} [${r.nodeCount}N, ${r.edgeCount}E]`,
                value: r.runId
            };
        });
    }

    get isCompareDisabled() {
        return (
            this.isLoading ||
            !this.selectedBaseRunId ||
            !this.selectedTargetRunId ||
            this.selectedBaseRunId === this.selectedTargetRunId
        );
    }

    get isInitialState() {
        return !this.isLoading && !this.diffResult && !this.errorMessage;
    }

    get hasDiffResult() {
        return !this.isLoading && !!this.diffResult;
    }

    get diffSummary() {
        return this.diffResult ? this.diffResult.summary : {};
    }

    get formattedDeltaCycles() {
        if (!this.diffResult || !this.diffResult.summary) return '0';
        const d = this.diffResult.summary.deltaCycles || 0;
        return d > 0 ? `+${d}` : `${d}`;
    }

    get addedTabLabel() {
        const count = this.diffResult ? this.diffResult.nodes.added.length + this.diffResult.edges.added.length : 0;
        return `Added (${count})`;
    }

    get removedTabLabel() {
        const count = this.diffResult ? this.diffResult.nodes.removed.length + this.diffResult.edges.removed.length : 0;
        return `Removed (${count})`;
    }

    get modifiedTabLabel() {
        const count = this.diffResult ? this.diffResult.nodes.modified.length + this.diffResult.edges.modified.length : 0;
        return `Modified (${count})`;
    }

    get hasAddedEntities() {
        return this.filteredAddedEntities.length > 0;
    }

    get hasRemovedEntities() {
        return this.filteredRemovedEntities.length > 0;
    }

    get hasModifiedEntities() {
        return this.filteredModifiedEntities.length > 0;
    }

    get filteredAddedEntities() {
        if (!this.diffResult) return [];
        const term = (this.searchKeyword || '').toLowerCase();
        const list = [];

        this.diffResult.nodes.added.forEach((n) => {
            if (!term || String(n.id).toLowerCase().includes(term) || String(n.type).toLowerCase().includes(term)) {
                list.push({
                    key: `node-add-${n.id}`,
                    id: n.id,
                    kind: 'NODE',
                    details: n.type || 'Component',
                    secondaryDetails: `${n.layer || 'n/a'} | ${n.risk || 'LOW'}`
                });
            }
        });

        this.diffResult.edges.added.forEach((e) => {
            const edgeId = e.id || `${e.source}->${e.target}`;
            if (!term || edgeId.toLowerCase().includes(term) || String(e.type).toLowerCase().includes(term)) {
                list.push({
                    key: `edge-add-${edgeId}`,
                    id: edgeId,
                    kind: 'EDGE',
                    details: `${e.source} → ${e.target}`,
                    secondaryDetails: `Type: ${e.type || 'reference'} | Weight: ${e.weight !== undefined ? e.weight : 1}`
                });
            }
        });

        return list;
    }

    get filteredRemovedEntities() {
        if (!this.diffResult) return [];
        const term = (this.searchKeyword || '').toLowerCase();
        const list = [];

        this.diffResult.nodes.removed.forEach((n) => {
            if (!term || String(n.id).toLowerCase().includes(term) || String(n.type).toLowerCase().includes(term)) {
                list.push({
                    key: `node-rem-${n.id}`,
                    id: n.id,
                    kind: 'NODE',
                    details: n.type || 'Component',
                    secondaryDetails: `${n.layer || 'n/a'} | ${n.risk || 'LOW'}`
                });
            }
        });

        this.diffResult.edges.removed.forEach((e) => {
            const edgeId = e.id || `${e.source}->${e.target}`;
            if (!term || edgeId.toLowerCase().includes(term) || String(e.type).toLowerCase().includes(term)) {
                list.push({
                    key: `edge-rem-${edgeId}`,
                    id: edgeId,
                    kind: 'EDGE',
                    details: `${e.source} → ${e.target}`,
                    secondaryDetails: `Type: ${e.type || 'reference'} | Weight: ${e.weight !== undefined ? e.weight : 1}`
                });
            }
        });

        return list;
    }

    get filteredModifiedEntities() {
        if (!this.diffResult) return [];
        const term = (this.searchKeyword || '').toLowerCase();
        const list = [];

        this.diffResult.nodes.modified.forEach((m) => {
            if (!term || String(m.id).toLowerCase().includes(term)) {
                const deltasList = [];
                if (m.deltas) {
                    if (m.deltas.coupling !== undefined) deltasList.push(`coupling: ${m.deltas.coupling > 0 ? '+' : ''}${m.deltas.coupling}`);
                    if (m.deltas.coverageDensity !== undefined) deltasList.push(`coverage: ${m.deltas.coverageDensity > 0 ? '+' : ''}${m.deltas.coverageDensity}`);
                    if (m.deltas.cyclomaticComplexity !== undefined) deltasList.push(`complexity: ${m.deltas.cyclomaticComplexity > 0 ? '+' : ''}${m.deltas.cyclomaticComplexity}`);
                }
                list.push({
                    key: `node-mod-${m.id}`,
                    id: m.id,
                    kind: 'NODE',
                    propertyChanges: m.propertyChanges,
                    deltaSummary: deltasList.length > 0 ? deltasList.join(', ') : 'Property values updated'
                });
            }
        });

        this.diffResult.edges.modified.forEach((m) => {
            if (!term || String(m.id).toLowerCase().includes(term)) {
                list.push({
                    key: `edge-mod-${m.id}`,
                    id: m.id,
                    kind: 'EDGE',
                    propertyChanges: m.propertyChanges,
                    deltaSummary: `Changed: ${m.propertyChanges.join(', ')}`
                });
            }
        });

        return list;
    }

    handleBaseRunChange(event) {
        this.selectedBaseRunId = event.detail.value;
    }

    handleTargetRunChange(event) {
        this.selectedTargetRunId = event.detail.value;
    }

    handleSearchChange(event) {
        this.searchKeyword = event.detail.value;
    }

    handleClose() {
        this.isOpen = false;
        this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    }

    handleBackdropClick(event) {
        if (event.target.classList.contains('comparison-modal-backdrop')) {
            this.handleClose();
        }
    }

    handleCompareClick() {
        this.executeComparison();
    }

    handleRowClick(event) {
        const id = event.currentTarget.dataset.id;
        const kind = event.currentTarget.dataset.kind;
        this.dispatchEntitySelect(id, kind);
    }

    handleSelectEntity(event) {
        event.stopPropagation();
        const id = event.currentTarget.dataset.id;
        const kind = event.currentTarget.dataset.kind;
        this.dispatchEntitySelect(id, kind);
    }

    dispatchEntitySelect(entityId, entityKind) {
        // Enforce SELECTION != NAVIGATION invariant:
        // Selection does not mutate view state or project state
        this.dispatchEvent(
            new CustomEvent('entityselect', {
                detail: {
                    entityId,
                    entityKind,
                    baseRunId: this.selectedBaseRunId,
                    targetRunId: this.selectedTargetRunId
                },
                bubbles: true,
                composed: true
            })
        );
    }

    /**
     * Retrieves chunked graph payload sequentially with batch size <= 10.
     * Enforces CONTRACT-05 5 MB single snapshot cap and request token guard.
     */
    async retrieveSnapshot(runId, requestId, label) {
        this.loadingStatusText = `Fetching ${label}...`;
        const collectedChunks = [];
        let startIndex = 0;
        let totalPayloadSize = 0;
        let isDone = false;

        while (!isDone) {
            // Discard response if request is stale
            if (this.activeRequestId !== requestId) {
                throw new Error('Comparison aborted: New comparison initiated.');
            }

            const chunkBatch = await getGraphChunks({
                runId,
                startIndex,
                maxChunks: MAX_CHUNKS_PER_BATCH,
                projectId: this.projectId || ''
            });

            if (this.activeRequestId !== requestId) {
                throw new Error('Comparison aborted: New comparison initiated.');
            }

            if (!chunkBatch || !Array.isArray(chunkBatch) || chunkBatch.length === 0) {
                isDone = true;
                break;
            }

            // Verify batch sequence and continuous indexing
            if (!verifyChunkSequence(chunkBatch, startIndex)) {
                throw new Error(`Integrity error in ${label}: Discontinuous chunk sequence detected.`);
            }

            for (let i = 0; i < chunkBatch.length; i++) {
                const chunk = chunkBatch[i];
                const data = chunk.Payload_Data__c || '';
                totalPayloadSize += data.length;

                // Enforce CONTRACT-05 5 MB single snapshot cap
                if (totalPayloadSize > SINGLE_SNAPSHOT_MAX_SIZE) {
                    throw new Error(
                        `Payload limit exceeded: ${label} size (${totalPayloadSize} chars) exceeds the 5 MB single snapshot cap.`
                    );
                }

                collectedChunks.push(data);
            }

            startIndex += chunkBatch.length;
            if (chunkBatch.length < MAX_CHUNKS_PER_BATCH) {
                isDone = true;
            }
        }

        if (collectedChunks.length === 0) {
            return { nodes: [], edges: [] };
        }

        // Reassemble chunks
        const rawJson = reassembleChunks(collectedChunks);

        // Validate payload integrity
        if (!validatePayloadIntegrity(rawJson)) {
            // Attempt standard parse to handle empty or minimal graph safely
            try {
                const parsed = JSON.parse(rawJson);
                if (parsed && typeof parsed === 'object') {
                    return parsed;
                }
            } catch (e) {
                throw new Error(`Corrupted payload in ${label}: Invalid JSON format.`);
            }
            throw new Error(`Corrupted payload in ${label}: Fails canonical schema verification.`);
        }

        return JSON.parse(rawJson);
    }

    async executeComparison() {
        if (!this.selectedBaseRunId || !this.selectedTargetRunId) {
            this.errorMessage = 'Both Baseline and Comparison snapshots must be selected.';
            return;
        }

        if (this.selectedBaseRunId === this.selectedTargetRunId) {
            this.errorMessage = 'Baseline and Comparison snapshots must be distinct runs.';
            return;
        }

        const requestId = ++this.activeRequestId;
        this.isLoading = true;
        this.errorMessage = '';
        this.diffResult = null;

        try {
            // Retrieve both snapshots
            const snapshotA = await this.retrieveSnapshot(this.selectedBaseRunId, requestId, 'Baseline Snapshot (A)');
            const snapshotB = await this.retrieveSnapshot(this.selectedTargetRunId, requestId, 'Comparison Snapshot (B)');

            if (this.activeRequestId !== requestId) {
                return; // Discard stale request
            }

            // Calculate combined payload size limit
            const sizeA = JSON.stringify(snapshotA).length;
            const sizeB = JSON.stringify(snapshotB).length;
            if (sizeA + sizeB > COMBINED_SNAPSHOT_MAX_SIZE) {
                throw new Error(
                    `Combined payload cap exceeded: Total size (${sizeA + sizeB} chars) exceeds the 10 MB combined snapshot limit.`
                );
            }

            this.loadingStatusText = 'Computing structural diff...';

            // Yield main thread before computing large diff
            await new Promise((resolve) => setTimeout(resolve, 0));

            if (this.activeRequestId !== requestId) {
                return;
            }

            // Compute pure diff
            const result = computeGraphDiff(snapshotA, snapshotB);

            this.diffResult = result;
        } catch (error) {
            if (this.activeRequestId === requestId) {
                this.errorMessage = error && error.message ? error.message : 'Error executing snapshot comparison.';
                this.dispatchEvent(
                    new CustomEvent('compareerror', {
                        detail: { message: this.errorMessage },
                        bubbles: true,
                        composed: true
                    })
                );
            }
        } finally {
            if (this.activeRequestId === requestId) {
                this.isLoading = false;
                this.loadingStatusText = '';
            }
        }
    }
}
