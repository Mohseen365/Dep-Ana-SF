/**
 * @description LWC Utility module for reassembling chunked Base64/JSON strings
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