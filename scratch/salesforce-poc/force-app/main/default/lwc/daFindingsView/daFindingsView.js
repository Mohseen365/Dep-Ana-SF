import { LightningElement, api, track } from 'lwc';
import { matchesFindingItem, isHighCouplingHotspot, normalizeFilterCriteria } from 'c/daFilterSchema';

/**
 * DaFindingsView LWC (Lane F)
 * Minimal functional Findings View per DEC-W4-04 Option C.
 * Derives architectural findings strictly from existing graph analytics payload:
 * A. Circular Dependencies (cycles[], node.refactoringReadiness.hasCycles)
 * B. Untested High-Risk Components (risk === 'HIGH', preserving UNTESTED vs UNKNOWN)
 * C. Unresolved References (unresolvedReferences[])
 * D. High-Coupling Hotspots (metrics.coupling > 15 OR metrics.fanIn > 10)
 *
 * Implements stable identity generation, deduplication, and canonical filter matching.
 */
export default class DaFindingsView extends LightningElement {
    @api projectId = null;

    _graphPayload = null;
    _filterCriteria = null;

    @track isLoading = false;
    @track error = null;

    @track allFindings = [];
    @track filteredFindings = [];

    @api
    get graphPayload() {
        return this._graphPayload;
    }
    set graphPayload(value) {
        this._graphPayload = value;
        this.deriveFindings();
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
                    if (!Array.isArray(cycle) || cycle.length === 0) return;
                    // Stable cycle representation: sort participating node IDs for key
                    const sortedNodes = [...cycle].sort();
                    const cycleKey = `cycle-${sortedNodes.join('->')}`;
                    if (seenFindingKeys.has(cycleKey)) return;
                    seenFindingKeys.add(cycleKey);

                    findings.push({
                        id: `finding-cycle-${idx + 1}`,
                        category: 'cycles',
                        categoryLabel: 'Circular Dependency',
                        severity: 'HIGH',
                        badgeClass: 'slds-badge finding-badge-high',
                        status: 'OPEN',
                        title: `Cycle detected involving ${cycle.length} components`,
                        description: `Circular dependency chain: ${cycle.join(' → ')} → ${cycle[0]}`,
                        componentName: cycle[0],
                        componentType: cycle[0].includes(':') ? cycle[0].split(':')[0] : null,
                        testCoverageStatus: null
                    });
                });
            }

            // Also check nodes with hasCycles flag not covered in cycles[]
            nodes.forEach(node => {
                if (node.refactoringReadiness?.hasCycles) {
                    const cycleNodeKey = `cycle-node-${node.id}`;
                    // Only add if not already captured in a cycle
                    if (!seenFindingKeys.has(cycleNodeKey)) {
                        seenFindingKeys.add(cycleNodeKey);
                        findings.push({
                            id: `finding-cycle-node-${node.id}`,
                            category: 'cycles',
                            categoryLabel: 'Circular Dependency',
                            severity: 'HIGH',
                            badgeClass: 'slds-badge finding-badge-high',
                            status: 'OPEN',
                            title: `Cyclic reference on ${node.displayName || node.name || node.id}`,
                            description: `Component participates in dependency cycle(s).`,
                            componentName: node.displayName || node.name || node.id,
                            componentType: node.type || null,
                            testCoverageStatus: node.refactoringReadiness?.testCoverageStatus || 'UNKNOWN'
                        });
                    }
                }
            });

            // 2. Category B: Untested High-Risk Components
            // risk === 'HIGH' and testCoverageStatus !== 'COVERED'
            // Crucial: Preserves distinction between UNTESTED and UNKNOWN
            nodes.forEach(node => {
                const isHighRisk = (node.risk || '').toUpperCase() === 'HIGH';
                const coverageStatus = node.refactoringReadiness?.testCoverageStatus || 'UNKNOWN';

                if (isHighRisk && coverageStatus !== 'COVERED') {
                    const findingKey = `untested-high-risk-${node.id}`;
                    if (!seenFindingKeys.has(findingKey)) {
                        seenFindingKeys.add(findingKey);
                        const isUntested = coverageStatus === 'UNTESTED';
                        findings.push({
                            id: `finding-risk-${node.id}`,
                            category: 'untested-high-risk',
                            categoryLabel: 'Untested High-Risk Component',
                            severity: 'CRITICAL',
                            badgeClass: 'slds-badge finding-badge-critical',
                            status: 'OPEN',
                            title: `${isUntested ? 'Untested' : 'Unknown Coverage'} High-Risk Component: ${node.displayName || node.name || node.id}`,
                            description: `Component has HIGH architectural risk and coverage status is ${coverageStatus}.`,
                            componentName: node.displayName || node.name || node.id,
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
                        findings.push({
                            id: `finding-unres-${idx + 1}`,
                            category: 'unresolved-references',
                            categoryLabel: 'Unresolved Reference',
                            severity: 'MEDIUM',
                            badgeClass: 'slds-badge finding-badge-medium',
                            status: 'OPEN',
                            title: `Unresolved Reference: ${refSymbol}`,
                            description: `Reference to '${refSymbol}' from '${sourceComp}' cannot be resolved in project scope.`,
                            componentName: sourceComp,
                            componentType: sourceComp.includes(':') ? sourceComp.split(':')[0] : null,
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
                        const coupling = node.metrics?.coupling || 0;
                        const fanIn = node.metrics?.fanIn || 0;
                        findings.push({
                            id: `finding-hotspot-${node.id}`,
                            category: 'coupling-hotspots',
                            categoryLabel: 'High-Coupling Hotspot',
                            severity: 'HIGH',
                            badgeClass: 'slds-badge finding-badge-high',
                            status: 'OPEN',
                            title: `High Coupling Hotspot: ${node.displayName || node.name || node.id}`,
                            description: `Component exceeds architectural coupling thresholds (Coupling: ${coupling}, Fan-In: ${fanIn}).`,
                            componentName: node.displayName || node.name || node.id,
                            componentType: node.type || null,
                            testCoverageStatus: node.refactoringReadiness?.testCoverageStatus || 'UNKNOWN'
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
        this.filteredFindings = this.allFindings.filter(finding =>
            matchesFindingItem(finding, criteria)
        );
    }
}
