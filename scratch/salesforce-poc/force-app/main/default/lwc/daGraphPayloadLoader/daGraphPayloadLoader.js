/**
 * @description LWC Utility module for reassembling chunked Base64/JSON strings and validating payload integrity
 */

export const MAX_CHUNK_SIZE = 131072; // Salesforce LongTextArea field limit (128 KB / 131,072 chars)
export const MAX_TOTAL_PAYLOAD_SIZE = 10485760; // 10 MB application-level payload limit

/**
 * Chunks a raw JSON string into surrogate-pair safe chunks.
 * Ensures no UTF-16 surrogate pair is split across chunk boundaries.
 */
export function chunkPayload(rawJson, maxChunkSize = MAX_CHUNK_SIZE) {
    const chunks = [];
    if (!rawJson || typeof rawJson !== 'string' || rawJson.length === 0) {
        return chunks;
    }
    let limit = Number(maxChunkSize);
    if (isNaN(limit) || limit <= 0) {
        limit = 100000;
    } else if (limit > MAX_CHUNK_SIZE) {
        limit = MAX_CHUNK_SIZE;
    }

    let offset = 0;
    const len = rawJson.length;
    while (offset < len) {
        let end = Math.min(offset + limit, len);
        if (end < len && end > offset + 1) {
            const lastCode = rawJson.charCodeAt(end - 1);
            if (lastCode >= 0xD800 && lastCode <= 0xDBFF) {
                end--; // Prevent splitting UTF-16 surrogate pair across chunk boundaries
            }
        }
        chunks.push(rawJson.substring(offset, end));
        offset = end;
    }
    return chunks;
}

/**
 * Reassembles an array of string chunks into a single concatenated JSON string.
 * Guarded against null, non-array, and non-string elements.
 */
export function reassembleChunks(chunks) {
    if (!Array.isArray(chunks) || chunks.length === 0) {
        return '';
    }
    let result = '';
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (typeof chunk === 'string') {
            result += chunk;
        }
    }
    return result;
}

/**
 * Validates payload structure, JSON parseability, and graph schema invariants.
 * Checks that rawJson parses into a valid graph envelope (object) containing required
 * node and edge arrays, valid node/edge records, and valid edge endpoints.
 */
export function validatePayloadIntegrity(rawJson) {
    if (!rawJson || typeof rawJson !== 'string' || rawJson.trim() === '') {
        return false;
    }
    if (rawJson.length > MAX_TOTAL_PAYLOAD_SIZE) {
        return false; // Exceeds 10 MB overall payload limit
    }
    try {
        const parsed = JSON.parse(rawJson);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return false;
        }

        // Validate canonical graph schema envelope (nodes & optional edges)
        if (Array.isArray(parsed.nodes) && (parsed.edges === undefined || Array.isArray(parsed.edges))) {
            const nodeIds = new Set();
            for (let i = 0; i < parsed.nodes.length; i++) {
                const node = parsed.nodes[i];
                if (!node || typeof node !== 'object' || typeof node.id !== 'string' || node.id.trim() === '') {
                    return false;
                }
                nodeIds.add(node.id);
            }

            const edgesList = Array.isArray(parsed.edges) ? parsed.edges : [];
            for (let i = 0; i < edgesList.length; i++) {
                const edge = edgesList[i];
                if (!edge || typeof edge !== 'object') {
                    return false;
                }
                const source = edge.source || edge.sourceFeatureId;
                const target = edge.target || edge.targetFeatureId;
                if (typeof source !== 'string' || typeof target !== 'string' || source.trim() === '' || target.trim() === '') {
                    return false;
                }
                // Enforce edge endpoint validity when nodes are present
                if (nodeIds.size > 0) {
                    if (!nodeIds.has(source) || !nodeIds.has(target)) {
                        return false; // Edge references non-existent node
                    }
                }
            }
            return true;
        }

        // Validate Cytoscape elements structure
        if (Array.isArray(parsed.elements)) {
            return true;
        }

        // Validate Sankey structure (stages & flows)
        if (Array.isArray(parsed.stages) && Array.isArray(parsed.flows)) {
            return true;
        }

        // Validate Constellation structure (focalNode & rings)
        if (parsed.focalNode && typeof parsed.focalNode === 'object' && Array.isArray(parsed.rings)) {
            return true;
        }

        return false;
    } catch (e) {
        return false;
    }
}

/**
 * Verifies that a batch of chunk records contains contiguous, ordered chunk indices starting at expectedStartIndex.
 * Rejects gaps, duplicates, missing indices, negative indices, and non-numeric offset values.
 */
export function verifyChunkSequence(chunks, expectedStartIndex = 0) {
    if (!Array.isArray(chunks) || chunks.length === 0) {
        return false;
    }
    const startIdx = Number(expectedStartIndex);
    if (isNaN(startIdx) || !Number.isFinite(startIdx) || startIdx < 0) {
        return false;
    }
    for (let i = 0; i < chunks.length; i++) {
        const expectedIndex = startIdx + i;
        const record = chunks[i];
        if (!record || typeof record !== 'object') {
            return false;
        }
        if (record.Chunk_Index__c === undefined || record.Chunk_Index__c === null) {
            return false;
        }
        const actualIndex = Number(record.Chunk_Index__c);
        if (isNaN(actualIndex) || !Number.isFinite(actualIndex) || actualIndex !== expectedIndex) {
            return false;
        }
    }
    return true;
}

/**
 * Validates that no individual chunk exceeds the max allowed character limit (default 131,072).
 */
export function validateChunkLimits(chunks, maxChunkSize = MAX_CHUNK_SIZE) {
    if (!Array.isArray(chunks)) {
        return false;
    }
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (typeof chunk === 'string' && chunk.length > maxChunkSize) {
            return false;
        }
        if (chunk && typeof chunk === 'object' && typeof chunk.Payload_Data__c === 'string') {
            if (chunk.Payload_Data__c.length > maxChunkSize) {
                return false;
            }
        }
    }
    return true;
}

/**
 * Validates total reassembled string payload size against max allowed limit (default 10 MB).
 */
export function validatePayloadSize(rawJson, maxTotalSize = MAX_TOTAL_PAYLOAD_SIZE) {
    if (typeof rawJson !== 'string') {
        return false;
    }
    return rawJson.length <= maxTotalSize;
}
