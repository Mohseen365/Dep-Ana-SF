import { LightningElement, api, track } from 'lwc';
import updateFindingStatus from '@salesforce/apex/DAGraphController.updateFindingStatus';
import getFindingReviewStatuses from '@salesforce/apex/DAGraphController.getFindingReviewStatuses';
import {
    matchesFindingItem,
    normalizeFilterCriteria,
    isHighCouplingHotspot
} from 'c/daFilterSchema';

/**
 * DaFindingsView LWC (Workstream 3 / Lane F)
 * High-performance, accessible analytical view for architecture findings and alerts.
 * Derives findings from canonical graph analytics payload across 4 categories:
 * A. Circular Dependencies (payload.cycles[] and refactoringReadiness.hasCycles)
 * B. Untested High-Risk Components (risk === 'HIGH', preserving UNTESTED vs UNKNOWN)
 * C. Unresolved References (unresolvedReferences[])
 * D. High-Coupling Hotspots (metrics.coupling > 15 OR metrics.fanIn > 10)
 *
 * Implements:
 * - Stable deterministic identity generation and deduplication.
 * - Severity filtering & search.
 * - Finding-to-node selection event dispatch (`nodeselect` with bubbles/composed/cancelable: false).
 * - Client-side suppression/resolution review workflow (OPEN, IN_REVIEW, RESOLVED).
 * - CSV and JSON export capability.
 * - Structured guidance (WHAT, WHY IT MATTERS, WHERE, WHAT TO DO NEXT) from React reference.
 * - Compatibility with both @api graphPayload and @api payload properties.
 * - Strict input payload immutability (zero in-place modification).
 */
export default class DaFindingsView extends LightningElement {
    _projectId = null;
    @api selectedNodeId = null;

    _graphPayload = null;
    _filterCriteria = null;

    @track isLoading = false;
    @track error = null;

    @track allFindings = [];
    @track filteredFindings = [];

    // Local and persisted review status tracking: Map<findingId, "OPEN" | "IN_REVIEW" | "RESOLVED" | "WONT_FIX">
    @track reviewStatuses = {};
    // LastModifiedDate tracking for optimistic concurrency conflict prevention
    _findingTimestamps = {};
    // Expanded finding details tracking: Set-like object { findingId: true }
    @track expandedFindingIds = {};
    // Severity toggle filter
    @track activeSeverityFilter = 'ALL'; // 'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
    // Status toggle filter
    @track activeStatusFilter = 'ALL'; // 'ALL' | 'OPEN' | 'IN_REVIEW' | 'RESOLVED'
    // Local search query for standalone filter bar
    @track localSearchQuery = '';

    @api
    get projectId() {
        return this._projectId;
    }
    set projectId(val) {
        this._projectId = val;
        this.fetchPersistedStatuses();
    }

    @api
    get graphPayload() {
        return this._graphPayload;
    }
    set graphPayload(value) {
        this._graphPayload = value;
        this.deriveFindings();
        this.fetchPersistedStatuses();
    }

    // Property alias for compatibility
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
        this.applyFilter();
    }

    get hasFindings() {
        return this.filteredFindings && this.filteredFindings.length > 0;
    }

    get totalFindings() {
        return this.filteredFindings ? this.filteredFindings.length : 0;
    }

    get isAllSeverity() {
        return this.activeSeverityFilter === 'ALL';
    }

    get isCriticalSeverity() {
        return this.activeSeverityFilter === 'CRITICAL';
    }

    get isHighSeverity() {
        return this.activeSeverityFilter === 'HIGH';
    }

    get isMediumSeverity() {
        return this.activeSeverityFilter === 'MEDIUM';
    }

    get isAllStatus() {
        return this.activeStatusFilter === 'ALL';
    }

    get isOpenStatus() {
        return this.activeStatusFilter === 'OPEN';
    }

    get isInReviewStatus() {
        return this.activeStatusFilter === 'IN_REVIEW';
    }

    get isResolvedStatus() {
        return this.activeStatusFilter === 'RESOLVED';
    }

    get isAllStatusClass() {
        return this.isAllStatus ? 'is-active' : '';
    }

    get isOpenStatusClass() {
        return this.isOpenStatus ? 'is-active' : '';
    }

    get isInReviewStatusClass() {
        return this.isInReviewStatus ? 'is-active' : '';
    }

    get isResolvedStatusClass() {
        return this.isResolvedStatus ? 'is-active' : '';
    }

    get isAllSeverityClass() {
        return this.isAllSeverity ? 'is-active' : '';
    }

    get isCriticalSeverityClass() {
        return this.isCriticalSeverity ? 'is-active' : '';
    }

    get isHighSeverityClass() {
        return this.isHighSeverity ? 'is-active' : '';
    }

    get isMediumSeverityClass() {
        return this.isMediumSeverity ? 'is-active' : '';
    }

    deriveFindings() {
        this.error = null;

        if (!this._graphPayload) {
            this.allFindings = [];
            this.filteredFindings = [];
            return;
        }

        try {
            let payload = this._graphPayload;
            if (typeof payload === 'string') {
                payload = JSON.parse(payload);
            }

            if (!payload || typeof payload !== 'object') {
                this.allFindings = [];
                this.filteredFindings = [];
                return;
            }

            const findings = [];
            const seenFindingKeys = new Set();

            const nodes = Array.isArray(payload.nodes) ? payload.nodes : [];

            // 1. Category A: Circular Dependencies
            // From payload.cycles[] if available
            if (Array.isArray(payload.cycles)) {
                payload.cycles.forEach((cycle, idx) => {
                    if (!Array.isArray(cycle) && typeof cycle === 'object' && Array.isArray(cycle.nodeIds)) {
                        cycle = cycle.nodeIds;
                    }
                    if (!Array.isArray(cycle) || cycle.length === 0) return;
                    // Stable cycle representation: sort participating node IDs for key
                    const sortedNodes = [...cycle].sort();
                    const cycleKey = `cycle-${sortedNodes.join('->')}`;
                    if (seenFindingKeys.has(cycleKey)) return;
                    seenFindingKeys.add(cycleKey);

                    const rootNodeId = cycle[0];
                    findings.push({
                        id: `finding-cycle-${idx + 1}`,
                        category: 'cycles',
                        categoryLabel: 'Circular Dependency',
                        severity: 'HIGH',
                        badgeClass: 'slds-badge finding-badge-high',
                        status: this.reviewStatuses[`finding-cycle-${idx + 1}`] || 'OPEN',
                        title: `Cycle detected involving ${cycle.length} components`,
                        description: `Circular dependency chain: ${cycle.join(' → ')} → ${cycle[0]}`,
                        whyItMatters: 'Cyclic dependencies introduce tight coupling, prevent modular testing, and cause unpredictable initialization cycles.',
                        whatToDoNext: 'Apply Dependency Inversion or introduce an abstraction layer to decouple the circular reference chain.',
                        componentName: rootNodeId,
                        targetNodeId: rootNodeId,
                        nodeIds: [...cycle],
                        componentType: rootNodeId.includes(':') ? rootNodeId.split(':')[0] : (rootNodeId.includes('.') ? rootNodeId.split('.')[0] : null),
                        testCoverageStatus: null
                    });
                });
            }

            // Also check nodes with hasCycles / hasCycle flag not covered in cycles[]
            nodes.forEach(node => {
                if (node.refactoringReadiness?.hasCycles || node.hasCycle) {
                    const cycleNodeKey = `cycle-node-${node.id}`;
                    if (!seenFindingKeys.has(cycleNodeKey)) {
                        seenFindingKeys.add(cycleNodeKey);
                        const id = `finding-cycle-node-${node.id}`;
                        findings.push({
                            id: id,
                            category: 'cycles',
                            categoryLabel: 'Circular Dependency',
                            severity: 'HIGH',
                            badgeClass: 'slds-badge finding-badge-high',
                            status: this.reviewStatuses[id] || 'OPEN',
                            title: `Cyclic reference on ${node.displayName || node.name || node.label || node.id}`,
                            description: `Component participates in dependency cycle(s).`,
                            whyItMatters: 'Circular dependencies prevent isolated deployment, complicate automated testing, and increase ripple effects.',
                            whatToDoNext: 'Extract shared interfaces or break the circular link using asynchronous messaging or mediator patterns.',
                            componentName: node.displayName || node.name || node.label || node.id,
                            targetNodeId: node.id,
                            nodeIds: [node.id],
                            componentType: node.type || null,
                            testCoverageStatus: node.refactoringReadiness?.testCoverageStatus || node.coverageStatus || 'UNKNOWN'
                        });
                    }
                }
            });

            // 2. Category B: Untested High-Risk Components
            // risk === 'HIGH' and testCoverageStatus !== 'COVERED'
            // Preserves distinction between UNTESTED and UNKNOWN
            nodes.forEach(node => {
                const isHighRisk = (node.risk || '').toUpperCase() === 'HIGH';
                const coverageStatus = node.refactoringReadiness?.testCoverageStatus || node.coverageStatus || 'UNKNOWN';

                if (isHighRisk && coverageStatus !== 'COVERED') {
                    const findingKey = `untested-high-risk-${node.id}`;
                    if (!seenFindingKeys.has(findingKey)) {
                        seenFindingKeys.add(findingKey);
                        const isUntested = coverageStatus === 'UNTESTED';
                        const id = `finding-risk-${node.id}`;
                        findings.push({
                            id: id,
                            category: 'untested-high-risk',
                            categoryLabel: 'Untested High-Risk Component',
                            severity: 'CRITICAL',
                            badgeClass: 'slds-badge finding-badge-critical',
                            status: this.reviewStatuses[id] || 'OPEN',
                            title: `${isUntested ? 'Untested' : 'Unknown Coverage'} High-Risk Component: ${node.displayName || node.name || node.label || node.id}`,
                            description: `Component has HIGH architectural risk and coverage status is ${coverageStatus}.`,
                            whyItMatters: 'High-risk components lacking automated test suites present high regression hazards during architectural change.',
                            whatToDoNext: 'Construct unit test fixtures and achieve baseline test assertions before proceeding with refactoring.',
                            componentName: node.displayName || node.name || node.label || node.id,
                            targetNodeId: node.id,
                            nodeIds: [node.id],
                            componentType: node.type || null,
                            testCoverageStatus: coverageStatus
                        });
                    }
                }
            });

            // 3. Category C: Unresolved References
            if (Array.isArray(payload.unresolvedReferences)) {
                payload.unresolvedReferences.forEach((unres, idx) => {
                    if (!unres) return;
                    const refSymbol = unres.symbol || unres.target || unres.name || `ref-${idx}`;
                    const sourceComp = unres.source || unres.caller || 'Unknown Source';
                    const findingKey = `unres-ref-${sourceComp}-${refSymbol}`;

                    if (!seenFindingKeys.has(findingKey)) {
                        seenFindingKeys.add(findingKey);
                        const id = `finding-unres-${idx + 1}`;
                        findings.push({
                            id: id,
                            category: 'unresolved-references',
                            categoryLabel: 'Unresolved Reference',
                            severity: 'MEDIUM',
                            badgeClass: 'slds-badge finding-badge-medium',
                            status: this.reviewStatuses[id] || 'OPEN',
                            title: `Unresolved Reference: ${refSymbol}`,
                            description: `Reference to '${refSymbol}' from '${sourceComp}' cannot be resolved in project scope.`,
                            whyItMatters: 'Unresolved symbols indicate incomplete metadata exports, missing installed packages, or phantom dependencies.',
                            whatToDoNext: 'Verify declaration files, installed package dependencies, or register target external boundaries.',
                            componentName: sourceComp,
                            targetNodeId: sourceComp,
                            nodeIds: [sourceComp],
                            componentType: sourceComp.includes(':') ? sourceComp.split(':')[0] : (sourceComp.includes('.') ? sourceComp.split('.')[0] : null),
                            testCoverageStatus: null
                        });
                    }
                });
            }

            // 4. Category D: High-Coupling Hotspots
            // Metrics rule: coupling > 15 OR fanIn > 10
            nodes.forEach(node => {
                if (isHighCouplingHotspot(node)) {
                    const findingKey = `coupling-hotspot-${node.id}`;
                    if (!seenFindingKeys.has(findingKey)) {
                        seenFindingKeys.add(findingKey);
                        const coupling = node.metrics?.coupling || (node.coupling != null ? node.coupling : 0);
                        const fanIn = node.metrics?.fanIn || (node.fanIn != null ? node.fanIn : 0);
                        const id = `finding-hotspot-${node.id}`;
                        findings.push({
                            id: id,
                            category: 'coupling-hotspots',
                            categoryLabel: 'High-Coupling Hotspot',
                            severity: 'HIGH',
                            badgeClass: 'slds-badge finding-badge-high',
                            status: this.reviewStatuses[id] || 'OPEN',
                            title: `High Coupling Hotspot: ${node.displayName || node.name || node.label || node.id}`,
                            description: `Component exceeds architectural coupling thresholds (Coupling: ${coupling}, Fan-In: ${fanIn}).`,
                            whyItMatters: 'Excessive inter-module coupling creates fragile architecture where changes ripple across unintended boundaries.',
                            whatToDoNext: 'Extract shared interfaces or delegate responsibilities to reduce direct dependent coupling.',
                            componentName: node.displayName || node.name || node.label || node.id,
                            targetNodeId: node.id,
                            nodeIds: [node.id],
                            componentType: node.type || null,
                            testCoverageStatus: node.refactoringReadiness?.testCoverageStatus || node.coverageStatus || 'UNKNOWN'
                        });
                    }
                }
            });

            this.allFindings = findings;
            this.applyFilter();
        } catch (err) {
            this.error = 'Failed to derive architectural findings: ' + (err.message || err);
            this.allFindings = [];
            this.filteredFindings = [];
        }
    }

    applyFilter() {
        if (!this.allFindings) {
            this.filteredFindings = [];
            return;
        }

        const criteria = this._filterCriteria || {};
        const localSearch = (this.localSearchQuery || '').trim().toLowerCase();

        this.filteredFindings = this.allFindings
            .filter(finding => {
                // Status in finding is tracked reactively
                finding.status = this.reviewStatuses[finding.id] || 'OPEN';

                // Evaluate canonical filter predicate
                if (!matchesFindingItem(finding, criteria)) {
                    return false;
                }

                // Local severity filter
                if (this.activeSeverityFilter !== 'ALL' && finding.severity !== this.activeSeverityFilter) {
                    return false;
                }

                // Local status filter
                if (this.activeStatusFilter !== 'ALL' && finding.status !== this.activeStatusFilter) {
                    return false;
                }

                // Local search bar filter
                if (localSearch) {
                    const matchTitle = (finding.title || '').toLowerCase().includes(localSearch);
                    const matchDesc = (finding.description || '').toLowerCase().includes(localSearch);
                    const matchComp = (finding.componentName || '').toLowerCase().includes(localSearch);
                    if (!matchTitle && !matchDesc && !matchComp) {
                        return false;
                    }
                }

                return true;
            })
            .map(finding => {
                const isSelected = this.selectedNodeId && (this.selectedNodeId === finding.targetNodeId || (finding.nodeIds && finding.nodeIds.includes(this.selectedNodeId)));
                const isExpanded = !!this.expandedFindingIds[finding.id];
                const status = finding.status;

                let statusBadgeClass = 'slds-badge status-badge-open';
                if (status === 'IN_REVIEW') statusBadgeClass = 'slds-badge status-badge-review';
                else if (status === 'RESOLVED') statusBadgeClass = 'slds-badge status-badge-resolved';

                return {
                    ...finding,
                    cardClass: `slds-m-bottom_small slds-p-around_small finding-card ${isSelected ? 'is-selected' : ''}`,
                    statusBadgeClass,
                    isExpanded,
                    isOpen: status === 'OPEN',
                    isInReview: status === 'IN_REVIEW',
                    isResolved: status === 'RESOLVED'
                };
            });
    }

    handleLocalSearchChange(event) {
        this.localSearchQuery = event.target.value;
        this.applyFilter();
    }

    handleSeverityFilterClick(event) {
        this.activeSeverityFilter = event.currentTarget.dataset.severity;
        this.applyFilter();
    }

    handleStatusFilterClick(event) {
        this.activeStatusFilter = event.currentTarget.dataset.status;
        this.applyFilter();
    }

    handleToggleDetails(event) {
        event.stopPropagation();
        const findingId = event.currentTarget.dataset.id;
        if (!findingId) return;

        this.expandedFindingIds = {
            ...this.expandedFindingIds,
            [findingId]: !this.expandedFindingIds[findingId]
        };
        this.applyFilter();
    }

    /**
     * Finding-to-node selection event dispatch adhering to CONTRACT-06 & SELECTION != NAVIGATION.
     */
    handleSelectNode(event) {
        const nodeId = event.currentTarget.dataset.nodeId;
        if (!nodeId) return;

        this.selectedNodeId = nodeId;

        this.dispatchEvent(new CustomEvent('nodeselect', {
            detail: {
                nodeId: nodeId,
                sourceView: 'findings',
                sourceComponent: 'daFindingsView',
                timestamp: Date.now()
            },
            bubbles: true,
            composed: true,
            cancelable: false
        }));

        this.applyFilter();
    }

    /**
     * Fetches persisted review statuses from Salesforce for the active project
     */
    fetchPersistedStatuses() {
        if (!this._projectId) return;

        try {
            if (typeof getFindingReviewStatuses === 'function') {
                getFindingReviewStatuses({ projectId: this._projectId, pageSize: 500, offset: 0 })
                    .then(res => {
                        if (res && res.statuses && typeof res.statuses === 'object') {
                            const newStatuses = { ...this.reviewStatuses };
                            Object.keys(res.statuses).forEach(key => {
                                const entry = res.statuses[key];
                                if (entry && entry.status) {
                                    newStatuses[key] = entry.status;
                                    if (entry.lastModifiedDate) {
                                        this._findingTimestamps[key] = entry.lastModifiedDate;
                                    }
                                }
                            });
                            this.reviewStatuses = newStatuses;
                            this.applyFilter();
                        }
                    })
                    .catch(err => {
                        console.warn('Could not fetch persisted finding statuses (offline or unauthorized):', err);
                    });
            }
        } catch (e) {
            // Graceful offline fallback
        }
    }

    /**
     * Persists review status update to Salesforce with optimistic UI update and failure rollback
     */
    persistStatusChange(findingId, newStatus, reviewNotes) {
        const previousStatus = this.reviewStatuses[findingId] || 'OPEN';
        const expectedLastMod = this._findingTimestamps[findingId] || null;

        // 1. Optimistic UI update
        this.reviewStatuses = {
            ...this.reviewStatuses,
            [findingId]: newStatus
        };
        this.applyFilter();

        if (!this._projectId || typeof updateFindingStatus !== 'function') {
            return; // In-memory only fallback when no project or offline
        }

        // 2. Dispatch persistent Apex call
        updateFindingStatus({
            projectId: this._projectId,
            findingIdOrKey: findingId,
            newStatus: newStatus,
            reviewNotes: reviewNotes || null,
            expectedLastModified: expectedLastMod ? new Date(expectedLastMod).toISOString() : null
        })
            .then(updatedRecord => {
                if (updatedRecord) {
                    if (updatedRecord.LastModifiedDate) {
                        this._findingTimestamps[findingId] = new Date(updatedRecord.LastModifiedDate).getTime();
                    }
                }
            })
            .catch(err => {
                console.error('Failed to persist finding status change:', err);
                // Rollback optimistic update
                this.reviewStatuses = {
                    ...this.reviewStatuses,
                    [findingId]: previousStatus
                };
                this.error = 'Failed to persist status change: ' + (err.body ? err.body.message : err.message || err);
                this.applyFilter();
            });
    }

    /**
     * Suppression / Resolution local workflow actions
     */
    handleMarkInReview(event) {
        event.stopPropagation();
        const findingId = event.currentTarget.dataset.id;
        if (!findingId) return;
        this.persistStatusChange(findingId, 'IN_REVIEW');
    }

    handleResolveFinding(event) {
        event.stopPropagation();
        const findingId = event.currentTarget.dataset.id;
        if (!findingId) return;
        this.persistStatusChange(findingId, 'RESOLVED');
    }

    handleReopenFinding(event) {
        event.stopPropagation();
        const findingId = event.currentTarget.dataset.id;
        if (!findingId) return;
        this.persistStatusChange(findingId, 'OPEN');
    }

    /**
     * JSON Export for Findings
     */
    handleExportJSON() {
        if (!this.allFindings || this.allFindings.length === 0) return;

        const dataToExport = {
            exportTimestamp: new Date().toISOString(),
            projectId: this.projectId,
            totalFindings: this.allFindings.length,
            findings: this.allFindings.map(f => ({
                id: f.id,
                category: f.category,
                categoryLabel: f.categoryLabel,
                severity: f.severity,
                status: this.reviewStatuses[f.id] || 'OPEN',
                title: f.title,
                description: f.description,
                componentName: f.componentName,
                targetNodeId: f.targetNodeId,
                nodeIds: f.nodeIds,
                testCoverageStatus: f.testCoverageStatus
            }))
        };

        const jsonStr = JSON.stringify(dataToExport, null, 2);
        this.triggerDownload(`findings-report-${this.projectId || 'project'}-${Date.now()}.json`, 'application/json', jsonStr);
    }

    /**
     * CSV Export for Findings
     */
    handleExportCSV() {
        if (!this.allFindings || this.allFindings.length === 0) return;

        const headers = ['ID', 'Category', 'Severity', 'Status', 'Component', 'Coverage', 'Title', 'Description'];
        const rows = this.allFindings.map(f => [
            `"${(f.id || '').replace(/"/g, '""')}"`,
            `"${(f.categoryLabel || f.category || '').replace(/"/g, '""')}"`,
            `"${(f.severity || '').replace(/"/g, '""')}"`,
            `"${(this.reviewStatuses[f.id] || 'OPEN').replace(/"/g, '""')}"`,
            `"${(f.componentName || '').replace(/"/g, '""')}"`,
            `"${(f.testCoverageStatus || 'N/A').replace(/"/g, '""')}"`,
            `"${(f.title || '').replace(/"/g, '""')}"`,
            `"${(f.description || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
        this.triggerDownload(`findings-report-${this.projectId || 'project'}-${Date.now()}.csv`, 'text/csv;charset=utf-8;', csvContent);
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
