/**
 * @description LWC Utility module for reassembling chunked Base64/JSON strings and validating payload integrity
 */

export const MAX_CHUNK_SIZE = 131072; // Salesforce LongTextArea field limit (128 KB / 131,072 chars)
export const MAX_TOTAL_PAYLOAD_SIZE = 10485760; // 10 MB application-level payload limit

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
 * Validates payload structure and JSON parseability.
 * Confirms that the JSON parses into an object or array and contains non-empty structure.
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
        return typeof parsed === 'object' && parsed !== null;
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
