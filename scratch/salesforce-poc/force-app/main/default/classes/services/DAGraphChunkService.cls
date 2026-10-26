/**
 * @description Service handling payload chunking and ordering verification for large graphs
 */
public with sharing class DAGraphChunkService {

    public static List<String> chunkPayload(String rawJson, Integer maxChunkSize) {
        List<String> chunks = new List<String>();
        if (String.isBlank(rawJson)) {
            return chunks;
        }

        if (maxChunkSize == null || maxChunkSize <= 0) {
            maxChunkSize = 100000; // Default 100KB per chunk
        }

        Integer length = rawJson.length();
        Integer offset = 0;

        while (offset < length) {
            Integer endIdx = Math.min(offset + maxChunkSize, length);
            chunks.add(rawJson.substring(offset, endIdx));
            offset = endIdx;
        }

        return chunks;
    }

    public static String reassembleChunks(List<String> chunks) {
        if (chunks == null || chunks.isEmpty()) {
            return '';
        }
        return String.join(chunks, '');
    }
}