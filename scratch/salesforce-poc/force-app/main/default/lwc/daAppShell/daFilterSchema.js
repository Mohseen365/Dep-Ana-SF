/**
 * daFilterSchema.js
 * Authoritative Canonical Filter Schema and Shared Foundation Contract (Lane A)
 *
 * Implements:
 * - DEC-W4-01: Versioned V2 container schema in Filters_JSON__c.
 * - DEC-W4-02: Shared canonical filter model with per-view mapping for Graph, Matrix, and Findings.
 * - DEC-W4-03: Strict project-scoped presets.
 * - DEC-W4-04 (Option C): Minimal functional Matrix and Findings view predicate contracts
 *   using existing graph analytics payload (no new Salesforce metadata or producer fields).
 */

export const SCHEMA_VERSION = 2;
export const MAX_PAYLOAD_SIZE = 131072;

/**
 * The strictly approved canonical evidence states for test coverage.
 * UI filter choices (e.g. 'ALL', 'NO_TESTS') are presentation-level filters, NOT evidence states.
 */
export const CANONICAL_COVERAGE_STATES = Object.freeze([
    'COVERED',
    'UNTESTED',
    'AMBIGUOUS',
    'UNKNOWN'
]);

export const CANONICAL_RISK_LEVELS = Object.freeze([
    'HIGH',
    'MEDIUM',
    'LOW'
]);

export const CANONICAL_FINDINGS_SEVERITIES = Object.freeze([
    'CRITICAL',
    'HIGH',
    'MEDIUM',
    'LOW'
]);

export const CANONICAL_FINDINGS_STATUSES = Object.freeze([
    'OPEN',
    'RESOLVED',
    'WAIVED'
]);

/**
 * Returns a fresh, safe default canonical active filter.
 */
export function getDefaultFilterCriteria() {
    return {
        search: '',
        riskLevels: [],
        nodeTypes: [],
        layers: [],
        testCoverageStatus: 'ALL', // Presentation filter option: 'ALL' or one of CANONICAL_COVERAGE_STATES
        findingsSeverity: [],
        findingsStatus: []
    };
}

/**
 * Returns a fresh, default V2 container structure.
 */
export function getDefaultFilterContainer() {
    return {
        schemaVersion: SCHEMA_VERSION,
        activePresetId: null,
        activeFilter: getDefaultFilterCriteria(),
        presets: []
    };
}

/**
 * Normalizes and validates filter criteria.
 * Ensures arrays and strings are properly typed, eliminating unexpected nulls or malformed entries.
 */
export function normalizeFilterCriteria(rawCriteria = {}) {
    if (!rawCriteria || typeof rawCriteria !== 'object' || Array.isArray(rawCriteria)) {
        return getDefaultFilterCriteria();
    }

    const search = typeof rawCriteria.search === 'string'
        ? rawCriteria.search.trim()
        : (typeof rawCriteria.searchTerm === 'string'
            ? rawCriteria.searchTerm.trim()
            : (typeof rawCriteria.searchQuery === 'string' ? rawCriteria.searchQuery.trim() : ''));

    const normalizeArray = (arr, allowedSet = null) => {
        if (!Array.isArray(arr)) return [];
        return arr
            .filter(item => typeof item === 'string' && item.trim() !== '')
            .map(item => item.trim())
            .filter(item => (allowedSet ? allowedSet.includes(item) : true));
    };

    const riskLevels = normalizeArray(rawCriteria.riskLevels, CANONICAL_RISK_LEVELS);
    const nodeTypes = normalizeArray(rawCriteria.nodeTypes);
    const layers = normalizeArray(rawCriteria.layers);

    let coverageStatus = 'ALL';
    const rawCov = rawCriteria.testCoverageStatus || rawCriteria.coverageStatus;
    if (typeof rawCov === 'string') {
        const trimmed = rawCov.trim().toUpperCase();
        if (CANONICAL_COVERAGE_STATES.includes(trimmed)) {
            coverageStatus = trimmed;
        } else if (trimmed === 'NO_TESTS') {
            // Presentation shortcut mapped to UNTESTED
            coverageStatus = 'UNTESTED';
        } else {
            coverageStatus = 'ALL';
        }
    }

    const findingsSeverity = normalizeArray(rawCriteria.findingsSeverity, CANONICAL_FINDINGS_SEVERITIES);
    const findingsStatus = normalizeArray(rawCriteria.findingsStatus, CANONICAL_FINDINGS_STATUSES);

    return {
        search,
        riskLevels,
        nodeTypes,
        layers,
        testCoverageStatus: coverageStatus,
        findingsSeverity,
        findingsStatus
    };
}

/**
 * Upgrades a legacy V1 filter payload to a valid V2 container format.
 */
export function migrateV1ToV2Container(v1JsonOrObj, projectId = null) {
    let parsed = v1JsonOrObj;
    if (typeof v1JsonOrObj === 'string') {
        try {
            parsed = JSON.parse(v1JsonOrObj);
        } catch (e) {
            return getDefaultFilterContainer();
        }
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return getDefaultFilterContainer();
    }

    // Already a V2 container
    if (parsed.schemaVersion === SCHEMA_VERSION && parsed.activeFilter && Array.isArray(parsed.presets)) {
        return validateAndNormalizeContainer(parsed, projectId);
    }

    // Legacy V1 preset format: { version: 1, presets: [...], quickFilters: {...} }
    const presets = [];
    if (Array.isArray(parsed.presets)) {
        parsed.presets.forEach((p, idx) => {
            if (p && typeof p === 'object') {
                presets.push({
                    id: p.id || `preset-migrated-${idx + 1}`,
                    name: p.name || `Preset ${idx + 1}`,
                    projectId: projectId || null,
                    criteria: normalizeFilterCriteria(p.criteria || p.filters || {})
                });
            }
        });
    }

    const activeFilter = normalizeFilterCriteria(parsed.activeFilter || parsed.quickFilters || parsed);

    return {
        schemaVersion: SCHEMA_VERSION,
        activePresetId: parsed.activePresetId || null,
        activeFilter,
        presets
    };
}

/**
 * Validates a full V2 container structure, enforcing schema rules, project isolation, and capacity bounds.
 */
export function validateAndNormalizeContainer(container, currentProjectId = null) {
    if (!container || typeof container !== 'object' || Array.isArray(container)) {
        return getDefaultFilterContainer();
    }

    if (container.schemaVersion !== SCHEMA_VERSION) {
        return getDefaultFilterContainer();
    }

    const activeFilter = normalizeFilterCriteria(container.activeFilter);
    const rawPresets = Array.isArray(container.presets) ? container.presets : [];

    // DEC-W4-03: Strict project-scoped presets. Exclude any preset scoped to another project.
    const presets = [];
    rawPresets.forEach((p, idx) => {
        if (p && typeof p === 'object') {
            // If preset has an explicit projectId, it must match currentProjectId
            if (p.projectId && currentProjectId && p.projectId !== currentProjectId) {
                // Cross-project preset rejected
                return;
            }
            presets.push({
                id: p.id || `preset-${idx + 1}`,
                name: p.name || `Preset ${idx + 1}`,
                projectId: currentProjectId || p.projectId || null,
                criteria: normalizeFilterCriteria(p.criteria)
            });
        }
    });

    let activePresetId = container.activePresetId || null;
    if (activePresetId && !presets.some(p => p.id === activePresetId)) {
        activePresetId = null;
    }

    return {
        schemaVersion: SCHEMA_VERSION,
        activePresetId,
        activeFilter,
        presets
    };
}

/**
 * Serializes container to JSON while enforcing the 131,072 character hard boundary.
 * Throws an error if serialized string exceeds 131,072 characters.
 */
export function serializeFilterContainer(container) {
    const jsonStr = JSON.stringify(container);
    if (jsonStr.length > MAX_PAYLOAD_SIZE) {
        throw new Error(`Filters JSON container exceeds maximum capacity of ${MAX_PAYLOAD_SIZE} characters (size: ${jsonStr.length}).`);
    }
    return jsonStr;
}

// =========================================================================
// DEC-W4-02 & DEC-W4-04: Cross-View Predicate Logic (Graph, Matrix, Findings)
// =========================================================================

/**
 * Evaluates whether a graph node matches the active filter criteria.
 * Supported fields: search, riskLevels, nodeTypes, layers, testCoverageStatus.
 * Unsupported fields (findingsSeverity, findingsStatus) are ignored gracefully.
 */
export function matchesGraphNode(node, criteria = {}) {
    if (!node) return false;
    const c = normalizeFilterCriteria(criteria);

    // 1. Search Query (matches id, displayName, name)
    if (c.search) {
        const query = c.search.toLowerCase();
        const idMatch = node.id && node.id.toLowerCase().includes(query);
        const nameMatch = node.name && node.name.toLowerCase().includes(query);
        const dispMatch = node.displayName && node.displayName.toLowerCase().includes(query);
        if (!idMatch && !nameMatch && !dispMatch) {
            return false;
        }
    }

    // 2. Risk Levels
    if (c.riskLevels.length > 0) {
        const nodeRisk = (node.risk || 'LOW').toUpperCase();
        if (!c.riskLevels.includes(nodeRisk)) {
            return false;
        }
    }

    // 3. Node Types
    if (c.nodeTypes.length > 0) {
        const nodeType = node.type || '';
        if (!c.nodeTypes.includes(nodeType)) {
            return false;
        }
    }

    // 4. Layers (if node has layer or category)
    if (c.layers.length > 0) {
        const nodeLayer = node.layer || node.category || '';
        if (!nodeLayer || !c.layers.includes(nodeLayer)) {
            return false;
        }
    }

    // 5. Test Coverage Status
    if (c.testCoverageStatus && c.testCoverageStatus !== 'ALL') {
        const nodeCov = node.refactoringReadiness?.testCoverageStatus || 'UNKNOWN';
        if (nodeCov !== c.testCoverageStatus) {
            return false;
        }
    }

    return true;
}

/**
 * Evaluates whether a graph node is a high-coupling hotspot per DEC-W4-04 Option C.
 * Criteria: node.metrics.coupling > 15 OR node.metrics.fanIn > 10.
 */
export function isHighCouplingHotspot(node) {
    if (!node || !node.metrics) return false;
    const coupling = typeof node.metrics.coupling === 'number' ? node.metrics.coupling : 0;
    const fanIn = typeof node.metrics.fanIn === 'number' ? node.metrics.fanIn : 0;
    return coupling > 15 || fanIn > 10;
}

/**
 * Evaluates whether an edge is included in the Matrix View.
 * Unresolved edges are handled gracefully without assuming target node existence.
 */
export function matchesMatrixEdge(edge, sourceNode, targetNode, criteria = {}) {
    if (!edge) return false;
    const c = normalizeFilterCriteria(criteria);

    // Source node filtering
    if (sourceNode && !matchesGraphNode(sourceNode, c)) {
        return false;
    }

    // Target node filtering (if target node exists)
    if (targetNode && !matchesGraphNode(targetNode, c)) {
        return false;
    }

    // If target node does not exist (unresolved edge), evaluate target type from edge if available
    if (!targetNode && c.nodeTypes.length > 0) {
        const targetType = edge.canonical?.target?.type || (edge.target && edge.target.includes(':') ? edge.target.split(':')[0] : null);
        if (targetType && !c.nodeTypes.includes(targetType)) {
            return false;
        }
    }

    return true;
}

/**
 * Evaluates whether a derived finding item matches the active filter criteria.
 * Supported finding categories:
 * - 'cycles': Circular dependencies
 * - 'untested-high-risk': High-risk components lacking coverage (UNTESTED or UNKNOWN)
 * - 'unresolved-references': Unresolved symbols
 * - 'coupling-hotspots': High coupling (metrics.coupling > 15 or metrics.fanIn > 10)
 */
export function matchesFindingItem(finding, criteria = {}) {
    if (!finding) return false;
    const c = normalizeFilterCriteria(criteria);

    // 1. Search Query
    if (c.search) {
        const query = c.search.toLowerCase();
        const titleMatch = finding.title && finding.title.toLowerCase().includes(query);
        const descMatch = finding.description && finding.description.toLowerCase().includes(query);
        const compMatch = finding.componentName && finding.componentName.toLowerCase().includes(query);
        if (!titleMatch && !descMatch && !compMatch) {
            return false;
        }
    }

    // 2. Findings Severity
    if (c.findingsSeverity.length > 0) {
        const sev = (finding.severity || 'LOW').toUpperCase();
        if (!c.findingsSeverity.includes(sev)) {
            return false;
        }
    }

    // 3. Findings Status
    if (c.findingsStatus.length > 0) {
        const status = (finding.status || 'OPEN').toUpperCase();
        if (!c.findingsStatus.includes(status)) {
            return false;
        }
    }

    // 4. Node Types
    if (c.nodeTypes.length > 0) {
        const compType = finding.componentType || '';
        if (compType && !c.nodeTypes.includes(compType)) {
            return false;
        }
    }

    // 5. Test Coverage Status
    // Explicitly preserves distinction between UNTESTED and UNKNOWN
    if (c.testCoverageStatus && c.testCoverageStatus !== 'ALL') {
        if (finding.testCoverageStatus) {
            if (finding.testCoverageStatus !== c.testCoverageStatus) {
                return false;
            }
        }
    }

    return true;
}
