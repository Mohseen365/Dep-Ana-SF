import { LightningElement, api, track } from 'lwc';

export default class DaInvestigationDrawer extends LightningElement {
    _selectedNodeId = null;
    _graphPayload = null;
    _projectId = null;
    _findings = [];
    _isPinned = false;
    _isDetached = false;

    @track drillPath = [];
    @track activeTab = 'overview';

    _broadcastChannel = null;

    connectedCallback() {
        this.initBroadcastChannel();
    }

    disconnectedCallback() {
        if (this._broadcastChannel) {
            try {
                this._broadcastChannel.close();
            } catch (e) {
                // Ignore channel close errors
            }
            this._broadcastChannel = null;
        }
    }

    initBroadcastChannel() {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            try {
                this._broadcastChannel = new BroadcastChannel('da_investigation_channel');
                this._broadcastChannel.onmessage = (event) => {
                    this.handleBroadcastMessage(event.data);
                };
            } catch (e) {
                this._broadcastChannel = null;
            }
        }
    }

    handleBroadcastMessage(data) {
        if (!data || typeof data !== 'object') return;
        if (data.type === 'DRAWER_SELECT_NODE' && data.nodeId) {
            this.handleNeighborSelection(data.nodeId);
        } else if (data.type === 'DRAWER_TOGGLE_PIN') {
            this.handleTogglePin();
        }
    }

    @api
    get selectedNodeId() {
        return this._selectedNodeId;
    }
    set selectedNodeId(val) {
        const normalized = val && String(val).trim() !== '' ? String(val).trim() : null;
        if (this._selectedNodeId !== normalized) {
            this._selectedNodeId = normalized;
            this.syncBreadcrumbTrail(normalized);
            this.notifyDetachedWindow();
        }
    }

    @api
    get graphPayload() {
        return this._graphPayload;
    }
    set graphPayload(val) {
        this._graphPayload = val;
        if (this._selectedNodeId && !this.selectedNode) {
            this._selectedNodeId = null;
            this.drillPath = [];
            this.notifyDetachedWindow();
        }
    }

    @api
    get projectId() {
        return this._projectId;
    }
    set projectId(val) {
        const normalized = val && String(val).trim() !== '' ? String(val).trim() : null;
        if (this._projectId !== normalized) {
            this._projectId = normalized;
            if (!this._isPinned) {
                this.drillPath = [];
            }
        }
    }

    @api
    get findings() {
        return this._findings;
    }
    set findings(val) {
        this._findings = Array.isArray(val) ? val : [];
    }

    @api
    get isPinned() {
        return this._isPinned;
    }
    set isPinned(val) {
        this._isPinned = Boolean(val);
    }

    @api
    get isDetached() {
        return this._isDetached;
    }
    set isDetached(val) {
        this._isDetached = Boolean(val);
    }

    get selectedNode() {
        if (!this._selectedNodeId || !this._graphPayload || !Array.isArray(this._graphPayload.nodes)) {
            return null;
        }
        return this._graphPayload.nodes.find(n => n.id === this._selectedNodeId) || null;
    }

    get hasSelectedNode() {
        return this.selectedNode !== null;
    }

    get panelTitle() {
        if (!this.selectedNode) return 'Node Investigation';
        return this.selectedNode.label || this.selectedNode.displayName || this.selectedNode.id;
    }

    get pinIconName() {
        return this._isPinned ? 'utility:pinned' : 'utility:pin';
    }

    get pinButtonTitle() {
        return this._isPinned ? 'Unpin Selection' : 'Pin Selection';
    }

    get hasBreadcrumbs() {
        return this.drillPath && this.drillPath.length > 1;
    }

    get nodeType() {
        return (this.selectedNode && this.selectedNode.type) || 'Component';
    }

    get nodeLayer() {
        return (this.selectedNode && this.selectedNode.layer) || 'Unassigned';
    }

    get nodeRisk() {
        const risk = this.selectedNode && (this.selectedNode.risk || (this.selectedNode.metrics && this.selectedNode.metrics.risk));
        return risk || 'LOW';
    }

    get riskBadgeClass() {
        const r = (this.nodeRisk || '').toUpperCase();
        if (r === 'HIGH' || r === 'CRITICAL') return 'slds-badge badge-risk-high';
        if (r === 'MEDIUM') return 'slds-badge badge-risk-medium';
        if (r === 'LOW') return 'slds-badge badge-risk-low';
        return 'slds-badge badge-risk-unknown';
    }

    get fanInCount() {
        if (!this.selectedNode) return 0;
        if (this.selectedNode.metrics && typeof this.selectedNode.metrics.fanIn === 'number') {
            return this.selectedNode.metrics.fanIn;
        }
        return this.inboundEdges.length;
    }

    get fanOutCount() {
        if (!this.selectedNode) return 0;
        if (this.selectedNode.metrics && typeof this.selectedNode.metrics.fanOut === 'number') {
            return this.selectedNode.metrics.fanOut;
        }
        return this.outboundEdges.length;
    }

    get linesOfCode() {
        if (!this.selectedNode) return '-';
        if (this.selectedNode.metrics && typeof this.selectedNode.metrics.linesOfCode === 'number') {
            return this.selectedNode.metrics.linesOfCode;
        }
        if (this.selectedNode.metrics && typeof this.selectedNode.metrics.loc === 'number') {
            return this.selectedNode.metrics.loc;
        }
        return '-';
    }

    get cyclomaticComplexity() {
        if (!this.selectedNode) return '-';
        if (this.selectedNode.metrics && typeof this.selectedNode.metrics.cyclomaticComplexity === 'number') {
            return this.selectedNode.metrics.cyclomaticComplexity;
        }
        if (this.selectedNode.metrics && typeof this.selectedNode.metrics.complexity === 'number') {
            return this.selectedNode.metrics.complexity;
        }
        return '-';
    }

    get inboundEdges() {
        if (!this._selectedNodeId || !this._graphPayload || !Array.isArray(this._graphPayload.edges)) {
            return [];
        }
        const nodeMap = new Map();
        if (Array.isArray(this._graphPayload.nodes)) {
            for (const n of this._graphPayload.nodes) {
                nodeMap.set(n.id, n.label || n.displayName || n.name || n.id);
            }
        }

        return this._graphPayload.edges
            .filter(e => e.target === this._selectedNodeId)
            .map(e => ({
                id: e.id || `${e.source}->${e.target}`,
                source: e.source,
                target: e.target,
                type: e.type || 'references',
                sourceLabel: nodeMap.get(e.source) || e.source
            }));
    }

    get outboundEdges() {
        if (!this._selectedNodeId || !this._graphPayload || !Array.isArray(this._graphPayload.edges)) {
            return [];
        }
        const nodeMap = new Map();
        if (Array.isArray(this._graphPayload.nodes)) {
            for (const n of this._graphPayload.nodes) {
                nodeMap.set(n.id, n.label || n.displayName || n.name || n.id);
            }
        }

        return this._graphPayload.edges
            .filter(e => e.source === this._selectedNodeId)
            .map(e => ({
                id: e.id || `${e.source}->${e.target}`,
                source: e.source,
                target: e.target,
                type: e.type || 'references',
                targetLabel: nodeMap.get(e.target) || e.target
            }));
    }

    get hasInboundEdges() {
        return this.inboundEdges.length > 0;
    }

    get hasOutboundEdges() {
        return this.outboundEdges.length > 0;
    }

    get dependencyTabLabel() {
        const total = this.inboundEdges.length + this.outboundEdges.length;
        return `Dependencies (${total})`;
    }

    get nodeFindings() {
        if (!this._selectedNodeId || !Array.isArray(this._findings)) {
            return [];
        }
        return this._findings.filter(f => f.targetNodeId === this._selectedNodeId || f.nodeId === this._selectedNodeId);
    }

    get hasNodeFindings() {
        return this.nodeFindings.length > 0;
    }

    get findingsTabLabel() {
        return `Findings (${this.nodeFindings.length})`;
    }

    syncBreadcrumbTrail(nodeId) {
        if (!nodeId) {
            if (!this._isPinned) {
                this.drillPath = [];
            }
            return;
        }

        const node = this.selectedNode;
        const label = node ? (node.label || node.displayName || node.name || node.id) : nodeId;

        const existingIdx = this.drillPath.findIndex(item => item.id === nodeId);
        if (existingIdx !== -1) {
            this.drillPath = this.drillPath.slice(0, existingIdx + 1);
        } else {
            this.drillPath.push({ id: nodeId, label: label });
        }
    }

    handleBreadcrumbClick(event) {
        const targetId = event.currentTarget.dataset.id;
        if (targetId && targetId !== this._selectedNodeId) {
            this.handleNeighborSelection(targetId);
        }
    }

    handleNeighborClick(event) {
        const targetId = event.currentTarget.dataset.id;
        if (targetId) {
            this.handleNeighborSelection(targetId);
        }
    }

    handleNeighborSelection(targetNodeId) {
        const targetNode = this._graphPayload && Array.isArray(this._graphPayload.nodes)
            ? this._graphPayload.nodes.find(n => n.id === targetNodeId) || null
            : null;

        this.dispatchEvent(new CustomEvent('nodeselect', {
            detail: {
                nodeId: targetNodeId,
                node: targetNode,
                sourceView: 'investigationDrawer',
                meta: {
                    isDrillDown: true,
                    isPinned: this._isPinned
                }
            },
            bubbles: true,
            composed: true,
            cancelable: false
        }));

        this.selectedNodeId = targetNodeId;
    }

    handleTogglePin() {
        this.isPinned = !this.isPinned;
        this.dispatchEvent(new CustomEvent('pintoggle', {
            detail: {
                isPinned: this.isPinned,
                nodeId: this.selectedNodeId
            },
            bubbles: true,
            composed: true
        }));
    }

    handleClose() {
        this.dispatchEvent(new CustomEvent('close', {
            bubbles: true,
            composed: true
        }));
    }

    handleDetach() {
        this.isDetached = true;
        if (this._broadcastChannel) {
            try {
                this._broadcastChannel.postMessage({
                    type: 'DRAWER_DETACHED',
                    projectId: this.projectId,
                    selectedNodeId: this.selectedNodeId,
                    isPinned: this.isPinned
                });
            } catch (e) {
                // Ignore channel errors
            }
        }

        if (typeof window !== 'undefined' && window.open) {
            try {
                window.open('', 'da_investigation_drawer_window', 'width=480,height=800,resizable=yes');
            } catch (e) {
                // Popup blocker
            }
        }

        this.dispatchEvent(new CustomEvent('detach', {
            detail: {
                selectedNodeId: this.selectedNodeId,
                projectId: this.projectId
            },
            bubbles: true,
            composed: true
        }));
    }

    notifyDetachedWindow() {
        if (this._broadcastChannel) {
            try {
                this._broadcastChannel.postMessage({
                    type: 'DRAWER_SYNC',
                    projectId: this.projectId,
                    selectedNodeId: this.selectedNodeId,
                    isPinned: this.isPinned
                });
            } catch (e) {
                // Ignore channel errors
            }
        }
    }
}
