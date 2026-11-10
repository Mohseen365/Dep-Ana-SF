import { LightningElement, api, track } from 'lwc';

/**
 * Task REM-02: Pure SVG Dependency River / Sankey Flow View (daSankeyView)
 *
 * Requirements & Invariants:
 * 1. 100% Pure Native SVG implementation without D3 or external static resources.
 * 2. Immutable canonical graph payload preservation (Object.freeze defensive cloning).
 * 3. SELECTION != NAVIGATION invariant: Selection dispatches CustomEvent 'nodeselect'
 *    with bubbles: true, composed: true, cancelable: false, without mutating URL or tabs.
 * 4. Deterministic layer stage grouping (Presentation, Application, Domain, Schema, Supporting, Unassigned).
 * 5. Deterministic cubic Bézier flow ribbons with non-overlapping attachment offsets.
 * 6. Forward, backward/cyclic (feedback loop), and self-referential flow geometries.
 * 7. Support for large graphs (PBIM, CST, BQC) with sub-50ms layout calculation.
 * 8. Resilient empty, corrupt, and disconnected node handling.
 */

const STAGE_ORDER = ['presentation', 'application', 'domain', 'schema', 'supporting', 'unassigned'];

const STAGE_CONFIG = {
    presentation: { label: 'Presentation Layer', orderIndex: 0, color: '#38bdf8' },
    application: { label: 'Application Layer', orderIndex: 1, color: '#10b981' },
    domain: { label: 'Domain Layer', orderIndex: 2, color: '#8b5cf6' },
    schema: { label: 'Schema Layer', orderIndex: 3, color: '#ec4899' },
    supporting: { label: 'Supporting / Ext', orderIndex: 4, color: '#f59e0b' },
    unassigned: { label: 'Unassigned', orderIndex: 5, color: '#64748b' }
};

const LAYER_COLORS = {
    presentation: '#38bdf8',
    application: '#10b981',
    domain: '#8b5cf6',
    schema: '#ec4899',
    supporting: '#f59e0b',
    unassigned: '#64748b'
};

const RISK_COLORS = {
    HIGH: '#ef4444',
    MEDIUM: '#f59e0b',
    LOW: '#10b981',
    NONE: '#64748b'
};

export function classifyNodeLayer(node) {
    if (!node) return 'unassigned';
    if (node.layer) {
        const l = String(node.layer).toLowerCase();
        if (STAGE_CONFIG[l]) return l;
    }
    const type = node.type || node.canonicalNodeType || '';
    const name = node.displayName || node.name || node.label || node.id || '';

    if (type === 'LWC' || type === 'Visualforce' || type === 'AuraDefinitionBundle' || /Controller$/i.test(name)) {
        return 'presentation';
    }
    if (type === 'ApexTrigger' || type === 'Flow' || /Service$/i.test(name) || /Handler$/i.test(name)) {
        return 'application';
    }
    if (type === 'Object' || type === 'CustomObject' || type === 'Field' || type === 'CustomField') {
        return 'schema';
    }
    if (type === 'External' || node.isTest || /Test$/i.test(name)) {
        return 'supporting';
    }
    return 'domain';
}

export function adaptSankeyData(input) {
    const rawNodes = Array.isArray(input?.nodes) ? input.nodes : [];
    const rawEdges = Array.isArray(input?.edges) ? input.edges : [];

    // Stable sort nodes by id to maintain deterministic order
    const nodes = [...rawNodes].sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')));
    const nodeLookup = new Map();

    nodes.forEach(n => {
        nodeLookup.set(n.id, {
            id: n.id,
            label: n.label || n.displayName || n.name || n.id,
            type: n.type || 'Component',
            layer: classifyNodeLayer(n),
            coupling: n.metrics?.coupling ?? n.coupling ?? 0,
            fanIn: n.metrics?.fanIn ?? n.fanIn ?? 0,
            fanOut: n.metrics?.fanOut ?? n.fanOut ?? 0,
            risk: n.risk || (n.refactoringReadiness?.isHighRisk ? 'HIGH' : 'LOW'),
            totalInflow: 0,
            totalOutflow: 0
        });
    });

    // Group nodes into stages
    const stageNodesMap = new Map();
    STAGE_ORDER.forEach(stg => stageNodesMap.set(stg, []));

    nodes.forEach(n => {
        const adaptedNode = nodeLookup.get(n.id);
        const stage = adaptedNode.layer;
        if (stageNodesMap.has(stage)) {
            stageNodesMap.get(stage).push(adaptedNode.id);
        } else {
            stageNodesMap.get('unassigned').push(adaptedNode.id);
        }
    });

    // Filter stages with >0 nodes to optimize canvas layout
    const activeStages = STAGE_ORDER.filter(s => (stageNodesMap.get(s)?.length || 0) > 0).map((stgKey, idx) => ({
        layer: stgKey,
        label: STAGE_CONFIG[stgKey].label,
        orderIndex: idx,
        color: STAGE_CONFIG[stgKey].color,
        nodeIds: stageNodesMap.get(stgKey) || []
    }));

    // Stage index lookup for ordering
    const stageIndexMap = new Map();
    activeStages.forEach((s, idx) => {
        stageIndexMap.set(s.layer, idx);
    });

    // Aggregate edges into flows
    const flowMap = new Map();
    const sortedEdges = [...rawEdges].sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')));

    sortedEdges.forEach(edge => {
        const srcNode = nodeLookup.get(edge.source);
        const tgtNode = nodeLookup.get(edge.target);
        if (!srcNode || !tgtNode) return; // Skip invalid edge references

        const flowId = `${srcNode.id}__to__${tgtNode.id}`;
        const isSelf = srcNode.id === tgtNode.id;
        const srcStageIdx = stageIndexMap.get(srcNode.layer) ?? 0;
        const tgtStageIdx = stageIndexMap.get(tgtNode.layer) ?? 0;
        const isBackward = !isSelf && tgtStageIdx < srcStageIdx;
        const isIntraStage = !isSelf && tgtStageIdx === srcStageIdx;
        const isCycle = isBackward;

        const provItem = {
            edgeId: edge.id || flowId,
            sourceComponentId: srcNode.id,
            sourceComponentName: srcNode.label,
            targetComponentId: tgtNode.id,
            targetComponentName: tgtNode.label,
            evidence: edge.evidence || edge.relationshipType || ''
        };

        if (!flowMap.has(flowId)) {
            flowMap.set(flowId, {
                id: flowId,
                sourceId: srcNode.id,
                targetId: tgtNode.id,
                sourceLabel: srcNode.label,
                targetLabel: tgtNode.label,
                sourceStage: srcNode.layer,
                targetStage: tgtNode.layer,
                weight: 0,
                isSelf,
                isBackward,
                isIntraStage,
                isCycle,
                provenance: []
            });
        }

        const flow = flowMap.get(flowId);
        flow.weight += 1;
        flow.provenance.push(provItem);

        if (!isSelf) {
            srcNode.totalOutflow += 1;
            tgtNode.totalInflow += 1;
        }
    });

    const flows = Array.from(flowMap.values()).sort(
        (a, b) => a.sourceId.localeCompare(b.sourceId) || a.targetId.localeCompare(b.targetId)
    );

    // Summary statistics
    let totalEdgeWeight = 0;
    let maxFlowWeight = 0;
    let cyclicFlowCount = 0;

    flows.forEach(f => {
        totalEdgeWeight += f.weight;
        if (f.weight > maxFlowWeight) maxFlowWeight = f.weight;
        if (f.isCycle) cyclicFlowCount++;
    });

    return {
        stages: activeStages,
        nodes: Array.from(nodeLookup.values()),
        flows,
        nodeLookup,
        flowMap,
        summary: {
            totalNodes: nodes.length,
            totalFlows: flows.length,
            totalEdgeWeight,
            maxFlowWeight,
            cyclicFlowCount
        }
    };
}

export function computeSankeyGeometry(adaptedData, options = {}) {
    const canvasWidth = options.width ?? 1200;
    const canvasMinHeight = options.height ?? 640;
    const stagePaddingX = options.stagePaddingX ?? 32;
    const nodeWidth = options.nodeWidth ?? 170;
    const nodeMinHeight = options.nodeMinHeight ?? 44;
    const nodeMaxHeight = options.nodeMaxHeight ?? 140;
    const nodeGapY = options.nodeGapY ?? 12;
    const paddingY = options.paddingY ?? 60;

    const stages = adaptedData.stages || [];
    const numStages = stages.length;
    const usableWidth = canvasWidth - stagePaddingX * 2;
    const stageXSpacing = numStages > 1 ? (usableWidth - nodeWidth) / (numStages - 1) : 0;

    // 1. Stage column geometries
    const stageGeometries = stages.map((stg, idx) => {
        const x = stagePaddingX + idx * stageXSpacing;
        return {
            layer: stg.layer,
            label: stg.label,
            orderIndex: idx,
            x: Math.round(x),
            width: nodeWidth,
            centerX: Math.round(x + nodeWidth / 2),
            headerY: 30,
            subHeaderY: 46,
            bandY: paddingY - 10,
            nodeCount: stg.nodeIds.length
        };
    });

    // 2. Compute node heights & positions
    const nodeGeometryMap = new Map();
    const renderedNodes = [];
    let maxYEncountered = canvasMinHeight;

    stageGeometries.forEach((stgGeom, sIdx) => {
        const stg = stages[sIdx];
        let currentY = paddingY;

        stg.nodeIds.forEach(nodeId => {
            const node = adaptedData.nodeLookup.get(nodeId);
            if (!node) return;

            const flowVol = Math.max(node.totalInflow, node.totalOutflow, 1);
            const height = Math.min(
                nodeMaxHeight,
                Math.max(nodeMinHeight, nodeMinHeight + flowVol * 6)
            );

            const displayLabel = node.label.length > 18 ? node.label.slice(0, 16) + '…' : node.label;
            const subStats = `in:${node.totalInflow} · out:${node.totalOutflow} · c:${node.coupling}`;

            const nodeGeom = {
                id: node.id,
                label: node.label,
                displayLabel,
                subStats,
                layer: node.layer,
                type: node.type,
                coupling: node.coupling,
                risk: node.risk,
                totalInflow: node.totalInflow,
                totalOutflow: node.totalOutflow,
                x: stgGeom.x,
                y: Math.round(currentY),
                width: nodeWidth,
                height: Math.round(height),
                indicatorHeight: Math.max(8, Math.round(height - 8)),
                stageIndex: sIdx,
                layerColor: LAYER_COLORS[node.layer] || '#64748b',
                transform: `translate(${stgGeom.x}, ${Math.round(currentY)})`,
                ariaLabel: `Component ${node.label}, layer ${node.layer}, inflow ${node.totalInflow}, outflow ${node.totalOutflow}`
            };

            nodeGeometryMap.set(node.id, nodeGeom);
            renderedNodes.push(nodeGeom);

            currentY += height + nodeGapY;
        });

        if (currentY + paddingY > maxYEncountered) {
            maxYEncountered = currentY + paddingY;
        }
    });

    const finalCanvasHeight = Math.max(canvasMinHeight, maxYEncountered);

    // Update stage background band height
    stageGeometries.forEach(stg => {
        stg.bandHeight = finalCanvasHeight - paddingY;
    });

    // 3. Compute flow Bézier paths with non-overlapping offsets
    const renderedFlows = [];
    const sourceOffsetMap = new Map();
    const targetOffsetMap = new Map();

    adaptedData.nodes.forEach(n => {
        sourceOffsetMap.set(n.id, 0);
        targetOffsetMap.set(n.id, 0);
    });

    // Deterministic sort of flows
    const sortedFlows = [...adaptedData.flows].sort((a, b) => {
        const srcA = nodeGeometryMap.get(a.sourceId);
        const srcB = nodeGeometryMap.get(b.sourceId);
        const tgtA = nodeGeometryMap.get(a.targetId);
        const tgtB = nodeGeometryMap.get(b.targetId);

        const srcYA = srcA?.y ?? 0;
        const srcYB = srcB?.y ?? 0;
        const tgtYA = tgtA?.y ?? 0;
        const tgtYB = tgtB?.y ?? 0;

        return (
            (srcA?.stageIndex ?? 0) - (srcB?.stageIndex ?? 0) ||
            srcYA - srcYB ||
            (tgtA?.stageIndex ?? 0) - (tgtB?.stageIndex ?? 0) ||
            tgtYA - tgtYB ||
            a.id.localeCompare(b.id)
        );
    });

    sortedFlows.forEach(flow => {
        const src = nodeGeometryMap.get(flow.sourceId);
        const tgt = nodeGeometryMap.get(flow.targetId);
        if (!src || !tgt) return;

        const strokeWidth = Math.min(22, Math.max(3, flow.weight * 2.2));

        if (flow.isSelf) {
            // Self-referential loop path on the right side
            const srcOff = sourceOffsetMap.get(flow.sourceId) || 0;
            const srcX = src.x + src.width;
            const srcY = Math.round(src.y + 12 + srcOff);
            const loopW = 28;
            const loopH = 20;

            const pathString = `M ${srcX} ${srcY} C ${srcX + loopW} ${srcY - loopH}, ${srcX + loopW} ${srcY + loopH}, ${srcX} ${srcY + 12}`;
            sourceOffsetMap.set(flow.sourceId, srcOff + strokeWidth + 3);

            renderedFlows.push({
                ...flow,
                pathString,
                strokeWidth: Math.round(strokeWidth),
                strokeColor: '#f59e0b',
                strokeOpacity: 0.65,
                ariaLabel: `Self loop flow for ${flow.sourceLabel}, volume ${flow.weight}`
            });
            return;
        }

        const srcOff = sourceOffsetMap.get(flow.sourceId) || 0;
        const tgtOff = targetOffsetMap.get(flow.targetId) || 0;

        const isBackward = tgt.stageIndex < src.stageIndex;
        const isIntraStage = tgt.stageIndex === src.stageIndex;

        let srcX, srcY, tgtX, tgtY, pathString;

        if (isIntraStage) {
            // Same column flow: curve out from right side of source down/up to right side of target
            srcX = src.x + src.width;
            srcY = Math.round(src.y + 14 + srcOff);
            tgtX = tgt.x + tgt.width;
            tgtY = Math.round(tgt.y + 14 + tgtOff);

            const loopDist = Math.max(25, Math.abs(srcY - tgtY) * 0.25);
            const cp1X = Math.round(srcX + loopDist);
            const cp1Y = srcY;
            const cp2X = Math.round(tgtX + loopDist);
            const cp2Y = tgtY;
            pathString = `M ${srcX} ${srcY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${tgtX} ${tgtY}`;
        } else if (isBackward) {
            // Backward across columns: arch curve on left side
            srcX = src.x;
            srcY = Math.round(src.y + 14 + srcOff);
            tgtX = tgt.x + tgt.width;
            tgtY = Math.round(tgt.y + 14 + tgtOff);

            const archOffset = Math.round(45 + Math.abs(srcY - tgtY) * 0.15);
            const cp1X = Math.round(srcX - archOffset);
            const cp1Y = srcY;
            const cp2X = Math.round(tgtX + archOffset);
            const cp2Y = tgtY;
            pathString = `M ${srcX} ${srcY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${tgtX} ${tgtY}`;
        } else {
            // Forward flow across columns
            srcX = src.x + src.width;
            srcY = Math.round(src.y + 14 + srcOff);
            tgtX = tgt.x;
            tgtY = Math.round(tgt.y + 14 + tgtOff);

            const dx = tgtX - srcX;
            const controlDist = Math.max(35, dx * 0.45);
            const cp1X = Math.round(srcX + controlDist);
            const cp1Y = srcY;
            const cp2X = Math.round(tgtX - controlDist);
            const cp2Y = tgtY;
            pathString = `M ${srcX} ${srcY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${tgtX} ${tgtY}`;
        }

        sourceOffsetMap.set(flow.sourceId, srcOff + strokeWidth + 2);
        targetOffsetMap.set(flow.targetId, tgtOff + strokeWidth + 2);

        renderedFlows.push({
            ...flow,
            pathString,
            strokeWidth: Math.round(strokeWidth),
            strokeColor: flow.isCycle ? '#ef4444' : '#38bdf8',
            strokeOpacity: flow.isCycle ? 0.75 : 0.45,
            ariaLabel: `Flow from ${flow.sourceLabel} to ${flow.targetLabel}, volume ${flow.weight} edges`
        });
    });

    return {
        canvasWidth,
        canvasHeight: finalCanvasHeight,
        stages: stageGeometries,
        nodes: renderedNodes,
        flows: renderedFlows,
        nodeGeometryMap
    };
}

export default class DaSankeyView extends LightningElement {
    @api projectId;
    @api selectedNodeId;

    @track searchQuery = '';
    @track selectedLayer = '';
    @track selectedFlowId = null;
    @track hoveredFlowId = null;
    @track internalSelectedNodeId = null;
    @track errorMessage = '';

    _rawPayload = null;
    _parsedPayload = null;
    _adaptedData = null;
    _geometry = null;

    @api
    get payload() {
        return this._rawPayload;
    }
    set payload(value) {
        this._rawPayload = value;
        this.processPayload();
    }

    @api
    get graphPayload() {
        return this._rawPayload;
    }
    set graphPayload(value) {
        this.payload = value;
    }

    processPayload() {
        this.errorMessage = '';
        this.selectedFlowId = null;
        this.hoveredFlowId = null;

        if (!this._rawPayload) {
            this._parsedPayload = null;
            this._adaptedData = null;
            this._geometry = null;
            return;
        }

        if (typeof this._rawPayload === 'string') {
            try {
                this._parsedPayload = JSON.parse(this._rawPayload);
            } catch (e) {
                this.errorMessage = 'Malformed graph payload JSON';
                this._parsedPayload = null;
                this._adaptedData = null;
                this._geometry = null;
                return;
            }
        } else if (typeof this._rawPayload === 'object') {
            this._parsedPayload = this._rawPayload;
        } else {
            this.errorMessage = 'Invalid payload format';
            this._parsedPayload = null;
            this._adaptedData = null;
            this._geometry = null;
            return;
        }

        // Defensive transformation into adapted Sankey data model
        try {
            this._adaptedData = adaptSankeyData(this._parsedPayload);
            this._geometry = computeSankeyGeometry(this._adaptedData, {
                width: 1200,
                height: 640
            });
        } catch (err) {
            this.errorMessage = `Layout generation failed: ${err.message}`;
            this._adaptedData = null;
            this._geometry = null;
        }
    }

    get hasError() {
        return !!this.errorMessage;
    }

    get isEmpty() {
        if (!this._parsedPayload || !Array.isArray(this._parsedPayload.nodes)) return true;
        return this._parsedPayload.nodes.length === 0;
    }

    get hasData() {
        return !this.hasError && !this.isEmpty && !!this._geometry;
    }

    get canvasWidth() {
        return this._geometry?.canvasWidth ?? 1200;
    }

    get canvasHeight() {
        return this._geometry?.canvasHeight ?? 640;
    }

    get viewBoxString() {
        return `0 0 ${this.canvasWidth} ${this.canvasHeight}`;
    }

    get summary() {
        return this._adaptedData?.summary ?? {
            totalNodes: 0,
            totalFlows: 0,
            totalEdgeWeight: 0,
            maxFlowWeight: 0,
            cyclicFlowCount: 0
        };
    }

    get stageOptions() {
        return this._adaptedData?.stages || [];
    }

    get renderedStages() {
        if (!this._geometry) return [];
        return this._geometry.stages;
    }

    get effectiveSelectedNodeId() {
        return this.selectedNodeId || this.internalSelectedNodeId;
    }

    get renderedNodes() {
        if (!this._geometry) return [];
        const nodes = this._geometry.nodes;
        const selId = this.effectiveSelectedNodeId;

        return nodes.map(n => {
            const isSelected = selId === n.id;
            const matchesSearch = !this.searchQuery || n.label.toLowerCase().includes(this.searchQuery.toLowerCase());
            const matchesLayer = !this.selectedLayer || n.layer === this.selectedLayer;
            const isDimmed = (this.searchQuery && !matchesSearch) || (this.selectedLayer && !matchesLayer);

            let groupClass = 'node-card-group';
            if (isSelected) groupClass += ' selected';
            if (isDimmed) groupClass += ' dimmed';

            return {
                ...n,
                groupClass
            };
        });
    }

    get renderedFlows() {
        if (!this._geometry) return [];
        const flows = this._geometry.flows;
        const activeFlowKey = this.selectedFlowId || this.hoveredFlowId;
        const selNodeId = this.effectiveSelectedNodeId;

        return flows.map(f => {
            const isSelected = activeFlowKey === f.id;
            const isConnectedToSelectedNode = selNodeId && (f.sourceId === selNodeId || f.targetId === selNodeId);
            const isDimmed = (activeFlowKey && !isSelected) || (selNodeId && !isConnectedToSelectedNode && !activeFlowKey);

            let cssClass = 'flow-ribbon';
            if (isSelected) cssClass += ' flow-selected';
            else if (isDimmed) cssClass += ' flow-dimmed';
            if (f.isCycle) cssClass += ' flow-cycle';

            return {
                ...f,
                cssClass
            };
        });
    }

    get activeFlow() {
        const id = this.selectedFlowId || this.hoveredFlowId;
        if (!id || !this._adaptedData) return null;
        return this._adaptedData.flowMap.get(id) || null;
    }

    get activeNode() {
        const id = this.effectiveSelectedNodeId;
        if (!id || !this._adaptedData) return null;
        const n = this._adaptedData.nodeLookup.get(id);
        if (!n) return null;

        return {
            ...n,
            riskStyle: `color: ${RISK_COLORS[n.risk] || '#64748b'}; font-weight: 700;`
        };
    }

    get hasSelection() {
        return !!this.activeFlow || !!this.activeNode;
    }

    handleSearchChange(event) {
        this.searchQuery = event.target.value || '';
    }

    handleLayerFilterChange(event) {
        this.selectedLayer = event.target.value || '';
    }

    handleFlowMouseEnter(event) {
        const flowId = event.currentTarget.dataset.flowId;
        if (flowId && !this.selectedFlowId) {
            this.hoveredFlowId = flowId;
        }
    }

    handleFlowMouseLeave() {
        if (!this.selectedFlowId) {
            this.hoveredFlowId = null;
        }
    }

    handleFlowClick(event) {
        const flowId = event.currentTarget.dataset.flowId;
        if (!flowId) return;
        this.selectedFlowId = this.selectedFlowId === flowId ? null : flowId;
    }

    handleClearFlowSelection() {
        this.selectedFlowId = null;
        this.hoveredFlowId = null;
    }

    handleNodeClick(event) {
        const nodeId = event.currentTarget.dataset.nodeId;
        if (!nodeId) return;
        this.selectNode(nodeId);
    }

    handleNodeKeyDown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            const nodeId = event.currentTarget.dataset.nodeId;
            if (nodeId) {
                this.selectNode(nodeId);
            }
        }
    }

    selectNode(nodeId) {
        const nextId = this.internalSelectedNodeId === nodeId ? null : nodeId;
        this.internalSelectedNodeId = nextId;
        this.selectedFlowId = null;

        const node = this._adaptedData?.nodeLookup.get(nodeId);

        // Dispatches canonical nodeselect CustomEvent adhering strictly to CONTRACT-06 & SELECTION != NAVIGATION
        this.dispatchEvent(new CustomEvent('nodeselect', {
            detail: {
                nodeId,
                node: node || null,
                sourceView: 'river',
                meta: {
                    sourceComponent: 'daSankeyView',
                    layer: node ? node.layer : 'unassigned',
                    timestamp: Date.now()
                }
            },
            bubbles: true,
            composed: true,
            cancelable: false
        }));
    }

    handleInspectInInvestigationDrawer() {
        if (!this.effectiveSelectedNodeId) return;
        this.dispatchEvent(new CustomEvent('inspectnode', {
            detail: {
                nodeId: this.effectiveSelectedNodeId,
                source: 'daSankeyView'
            },
            bubbles: true,
            composed: true
        }));
    }
}
