/**
 * @description Data Transfer Objects for Dependency Analyzer Apex REST Ingestion API.
 * Defines request and response structures for /da/v1/ingest/init, /chunks, and /finalize.
 * Adheres strictly to STAGE_J_AGENT_3_FINAL_REST_CONTRACT.md (v1.0.0-FINAL-RATIFIED).
 */
public inherited sharing class DAGraphIngestionDTO {

    // -------------------------------------------------------------
    // 1. /init Endpoint DTOs
    // -------------------------------------------------------------

    public class InitRunRequest {
        public String projectId;
        public String runName;
        public String commitHash;
        public Integer expectedChunks;
        public Long expectedTotalBytes;
        public String expectedChecksum;
    }

    public class InitRunResponse {
        public String runId;
        public String status;
        public Integer chunkSizeLimit;
        public Long totalPayloadCap;
        public Integer maxBatchChunks;
        public Long maxRequestBytes;

        public InitRunResponse() {}

        public InitRunResponse(String runId, String status) {
            this.runId = runId;
            this.status = status;
            this.chunkSizeLimit = DAGraphIngestionService.MAX_CHUNK_SIZE;
            this.totalPayloadCap = DAGraphIngestionService.MAX_TOTAL_PAYLOAD_CHARS;
            this.maxBatchChunks = DAGraphIngestionService.MAX_BATCH_CHUNKS;
            this.maxRequestBytes = DAGraphIngestionService.MAX_HTTP_REQUEST_BYTES;
        }
    }

    // -------------------------------------------------------------
    // 2. /chunks Endpoint DTOs
    // -------------------------------------------------------------

    public class ChunkItem {
        public Integer chunkIndex;
        public String payloadData;
    }

    public class BatchChunkUploadRequest {
        public String runId;
        public List<ChunkItem> chunks;
    }

    public class BatchChunkUploadResponse {
        public String runId;
        public List<Integer> persistedChunks;
        public Integer totalPersisted;
        public String status;
        public Boolean isComplete;

        public BatchChunkUploadResponse() {
            this.persistedChunks = new List<Integer>();
            this.totalPersisted = 0;
            this.status = DAGraphIngestionService.STATUS_IN_PROGRESS;
            this.isComplete = false;
        }
    }

    // -------------------------------------------------------------
    // 3. /finalize Endpoint DTOs
    // -------------------------------------------------------------

    public class FinalizeRunRequest {
        public String runId;
        public Integer expectedChunks;
        public String expectedChecksum;
    }

    public class FinalizeRunResponse {
        public String runId;
        public String status;
        public Boolean success;
        public Integer nodeCount;
        public Integer edgeCount;
        public Integer cyclicSccCount;
        public String errorMessage;

        public FinalizeRunResponse() {
            this.success = false;
            this.nodeCount = 0;
            this.edgeCount = 0;
            this.cyclicSccCount = 0;
        }
    }
}
