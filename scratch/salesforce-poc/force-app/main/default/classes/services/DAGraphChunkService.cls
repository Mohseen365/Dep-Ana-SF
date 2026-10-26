/**
 * @description Service handling payload chunking, ordering verification, and reassembly for large graphs
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

    public static Boolean verifyChunkSequence(List<DA_Graph_Chunk__c> chunks) {
        if (chunks == null || chunks.isEmpty()) {
            return false;
        }

        for (Integer i = 0; i < chunks.size(); i++) {
            if (chunks[i].Chunk_Index__c == null || chunks[i].Chunk_Index__c != i) {
                return false;
            }
        }

        return true;
    }
}
