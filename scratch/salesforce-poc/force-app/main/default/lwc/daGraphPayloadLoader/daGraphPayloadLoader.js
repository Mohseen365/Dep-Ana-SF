/**
 * @description LWC Utility module for reassembling chunked Base64/JSON strings and validating payload integrity
 */
export function reassembleChunks(chunks) {
    if (!Array.isArray(chunks) || chunks.length === 0) {
        return '';
    }
    return chunks.join('');
}

export function validatePayloadIntegrity(rawJson) {
    if (!rawJson || typeof rawJson !== 'string') {
        return false;
    }
    try {
        const parsed = JSON.parse(rawJson);
        return typeof parsed === 'object' && parsed !== null;
    } catch (e) {
        return false;
    }
}

export function verifyChunkSequence(chunks, expectedStartIndex = 0) {
    if (!Array.isArray(chunks) || chunks.length === 0) {
        return false;
    }
    const startIdx = Number(expectedStartIndex);
    if (isNaN(startIdx) || startIdx < 0) {
        return false;
    }
    for (let i = 0; i < chunks.length; i++) {
        const expectedIndex = startIdx + i;
        if (!chunks[i] || chunks[i].Chunk_Index__c === undefined || chunks[i].Chunk_Index__c === null || Number(chunks[i].Chunk_Index__c) !== expectedIndex) {
            return false;
        }
    }
    return true;
}
