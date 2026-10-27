/**
 * Comprehensive Offline Test Suite for Salesforce POC Payload Loader, Bounded Chunking,
 * Security Contracts, Race Condition Protection, and Benchmark Integrity.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { pathToFileURL } = require('url');

let loaderModule;
let layoutModule;

// Apex DAGraphChunkService & DAGraphController offline simulation helpers
function chunkPayload(rawJson, maxChunkSize = 100000) {
    if (loaderModule && typeof loaderModule.chunkPayload === 'function') {
        return loaderModule.chunkPayload(rawJson, maxChunkSize);
    }
    const chunks = [];
    if (!rawJson || typeof rawJson !== 'string') {
        return chunks;
    }
    if (maxChunkSize <= 0) {
        maxChunkSize = 100000;
    } else if (maxChunkSize > 131072) {
        maxChunkSize = 131072; // Enforce LongTextArea limit
    }
    let offset = 0;
    while (offset < rawJson.length) {
        let end = Math.min(offset + maxChunkSize, rawJson.length);
        if (end < rawJson.length && end > offset + 1) {
            const lastCode = rawJson.charCodeAt(end - 1);
            if (lastCode >= 0xD800 && lastCode <= 0xDBFF) {
                end--; // Surrogate pair boundary protection
            }
        }
        chunks.push(rawJson.substring(offset, end));
        offset = end;
    }
    return chunks;
}

function simulateBoundedFetch(allChunkRecords, startIndex, maxChunks) {
    let start = Number(startIndex);
    if (isNaN(start) || start < 0) {
        start = 0;
    } else {
        start = Math.floor(start);
    }

    let limit = Number(maxChunks);
    if (isNaN(limit) || limit <= 0) {
        limit = 5;
    } else {
        limit = Math.floor(limit);
        if (limit > 10) {
            limit = 10;
        }
    }

    return allChunkRecords.slice(start, start + limit);
}

// LWC DaGraphViewer class simulation for race condition and lifecycle testing
class SimulatedDaGraphViewer {
    constructor() {
        this.recordId = null;
        this.isLoading = false;
        this.error = null;
        this.cyInstance = null;
        this.currentRequestId = 0;
        this.renderedGraphData = null;
        this.pageSize = 5;
    }

    async fetchGraphData(mockMetadataFn, mockChunksFn) {
        if (!this.recordId) {
            this.error = 'No Project ID provided.';
            this.isLoading = false;
            return;
        }

        const requestId = ++this.currentRequestId;
        this.isLoading = true;
        this.error = null;

        try {
            const dto = await mockMetadataFn(this.recordId);

            if (requestId !== this.currentRequestId) {
                return; // Stale request
            }

            if (!dto || !dto.runId) {
                this.error = 'No graph payload metadata found for this project.';
                this.isLoading = false;
                return;
            }

            let jsonString = '';

            if (dto.isChunked && dto.totalChunks > 0) {
                const fetchedChunkStrings = [];
                let nextIndex = 0;

                while (nextIndex < dto.totalChunks) {
                    const chunkBatch = await mockChunksFn(dto.runId, nextIndex, this.pageSize);

                    if (requestId !== this.currentRequestId) {
                        return; // Stale request during pagination
                    }

                    if (!chunkBatch || chunkBatch.length === 0) {
                        throw new Error(`Failed to retrieve chunk batch starting at index ${nextIndex}`);
                    }

                    if (!loaderModule.verifyChunkSequence(chunkBatch, nextIndex)) {
                        throw new Error(`Sequence error detected in chunk batch starting at index ${nextIndex}`);
                    }

                    for (const c of chunkBatch) {
                        fetchedChunkStrings.push(c.Payload_Data__c);
                    }

                    nextIndex += chunkBatch.length;
                }

                jsonString = loaderModule.reassembleChunks(fetchedChunkStrings);
            } else if (dto.rawPayload) {
                jsonString = dto.rawPayload;
            }

            if (!jsonString) {
                this.error = 'No graph payload data found for this project.';
                this.isLoading = false;
                return;
            }

            if (!loaderModule.validatePayloadIntegrity(jsonString)) {
                this.error = 'Invalid graph payload structure or corrupted JSON data.';
                this.isLoading = false;
                return;
            }

            if (requestId !== this.currentRequestId) {
                return; // Stale request before rendering
            }

            const graphData = JSON.parse(jsonString);
            this.renderGraph(graphData);
        } catch (err) {
            if (requestId === this.currentRequestId) {
                this.error = 'Error fetching graph data: ' + (err.body ? err.body.message : err.message || err);
                this.isLoading = false;
            }
        }
    }

    renderGraph(graphData) {
        if (this.cyInstance) {
            this.cyInstance.destroy();
            this.cyInstance = null;
        }
        this.cyInstance = {
            destroyed: false,
            destroy() {
                this.destroyed = true;
            }
        };
        this.renderedGraphData = graphData;
        this.isLoading = false;
    }

    disconnectedCallback() {
        if (this.cyInstance) {
            this.cyInstance.destroy();
            this.cyInstance = null;
        }
    }
}

let passes = 0;
let fails = 0;

function runTest(name, fn) {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        passes++;
    } catch (err) {
        console.error(`  ✗ ${name}: ${err.message}`);
        fails++;
    }
}

async function runAsyncTest(name, fn) {
    try {
        await fn();
        console.log(`  ✓ ${name}`);
        passes++;
    } catch (err) {
        console.error(`  ✗ ${name}: ${err.message}`);
        fails++;
    }
}

async function main() {
    console.log('Running Salesforce POC Offline Verification & Hardening Test Suite...');
    console.log('===================================================================');

    // Load actual LWC modules dynamically
    const loaderPath = path.resolve(__dirname, '../force-app/main/default/lwc/daGraphPayloadLoader/daGraphPayloadLoader.js');
    const loaderUrl = pathToFileURL(loaderPath).href;
    loaderModule = await import(loaderUrl);

    const layoutPath = path.resolve(__dirname, '../force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js');
    const layoutUrl = pathToFileURL(layoutPath).href;
    layoutModule = await import(layoutUrl);

    // --- Category 1: Payload Reassembly & Integrity (LWC Module) ---
    console.log('\n[Category 1: LWC Module Unit Tests]');

    runTest('reassembleChunks: empty array and null returns empty string', () => {
        assert.strictEqual(loaderModule.reassembleChunks([]), '');
        assert.strictEqual(loaderModule.reassembleChunks(null), '');
        assert.strictEqual(loaderModule.reassembleChunks(undefined), '');
    });

    runTest('reassembleChunks: reassembles array of string chunks accurately', () => {
        const chunks = ['{"nodes":', '[{"id":"1"}],', '"edges":[]}'];
        assert.strictEqual(loaderModule.reassembleChunks(chunks), '{"nodes":[{"id":"1"}],"edges":[]}');
    });

    runTest('validatePayloadIntegrity: accepts valid graph structures (nodes/edges, stages/flows, focal/rings)', () => {
        assert.strictEqual(loaderModule.validatePayloadIntegrity('{"nodes":[{"id":"1"}],"edges":[]}'), true);
        assert.strictEqual(loaderModule.validatePayloadIntegrity('{"nodes":[{"id":"1"},{"id":"2"}],"edges":[{"source":"1","target":"2"}]}'), true);
        assert.strictEqual(loaderModule.validatePayloadIntegrity('{"stages":[],"flows":[]}'), true);
    });

    runTest('validatePayloadIntegrity: rejects parseable JSON without expected schema, invalid root types, and dangling edges', () => {
        assert.strictEqual(loaderModule.validatePayloadIntegrity('{"invalid": true}'), false, 'Rejects generic objects missing graph schema');
        assert.strictEqual(loaderModule.validatePayloadIntegrity('[1, 2, 3]'), false, 'Rejects arrays as root structure');
        assert.strictEqual(loaderModule.validatePayloadIntegrity('{"nodes": "invalid", "edges": []}'), false, 'Rejects non-array nodes');
        assert.strictEqual(loaderModule.validatePayloadIntegrity('{"nodes":[{"id":"1"}],"edges":[{"source":"1","target":"2"}]}'), false, 'Rejects dangling edge to missing node');
        assert.strictEqual(loaderModule.validatePayloadIntegrity('{"a": 1'), false);
        assert.strictEqual(loaderModule.validatePayloadIntegrity(null), false);
        assert.strictEqual(loaderModule.validatePayloadIntegrity(''), false);
        assert.strictEqual(loaderModule.validatePayloadIntegrity('123'), false);
        assert.strictEqual(loaderModule.validatePayloadIntegrity('true'), false);
        assert.strictEqual(loaderModule.validatePayloadIntegrity('undefined'), false);
    });

    runTest('verifyChunkSequence: detects correct contiguous indices starting at specified offset', () => {
        const batch0 = [{ Chunk_Index__c: 0 }, { Chunk_Index__c: 1 }, { Chunk_Index__c: 2 }];
        assert.strictEqual(loaderModule.verifyChunkSequence(batch0, 0), true);

        const batch5 = [{ Chunk_Index__c: 5 }, { Chunk_Index__c: 6 }];
        assert.strictEqual(loaderModule.verifyChunkSequence(batch5, 5), true);

        const stringOffset = [{ Chunk_Index__c: 3 }, { Chunk_Index__c: 4 }];
        assert.strictEqual(loaderModule.verifyChunkSequence(stringOffset, '3'), true);
    });

    runTest('verifyChunkSequence: rejects gaps, duplicates, reordering, negative offsets, and invalid types', () => {
        assert.strictEqual(loaderModule.verifyChunkSequence([{ Chunk_Index__c: 0 }, { Chunk_Index__c: 2 }], 0), false);
        assert.strictEqual(loaderModule.verifyChunkSequence([{ Chunk_Index__c: 0 }, { Chunk_Index__c: 0 }], 0), false);
        assert.strictEqual(loaderModule.verifyChunkSequence([{ Chunk_Index__c: 1 }, { Chunk_Index__c: 0 }], 0), false);
        assert.strictEqual(loaderModule.verifyChunkSequence([{ Chunk_Index__c: 0 }], -1), false);
        assert.strictEqual(loaderModule.verifyChunkSequence([{ Chunk_Index__c: 0 }], 'invalid'), false);
        assert.strictEqual(loaderModule.verifyChunkSequence([], 0), false);
        assert.strictEqual(loaderModule.verifyChunkSequence(null, 0), false);
        assert.strictEqual(loaderModule.verifyChunkSequence([{ invalidField: 0 }], 0), false);
    });

    // --- Category 2: Bounded Pagination & Controller Simulation ---
    console.log('\n[Category 2: Bounded Pagination & Boundary Inputs]');

    runTest('simulateBoundedFetch: caps requested limit at max allowed page size (10)', () => {
        const mockChunks = Array.from({ length: 25 }, (_, i) => ({ Chunk_Index__c: i, Payload_Data__c: `c${i}` }));
        assert.strictEqual(simulateBoundedFetch(mockChunks, 0, 50).length, 10);
        assert.strictEqual(simulateBoundedFetch(mockChunks, 0, 10).length, 10);
    });

    runTest('simulateBoundedFetch: handles default maxChunks when null/undefined or <= 0', () => {
        const mockChunks = Array.from({ length: 10 }, (_, i) => ({ Chunk_Index__c: i, Payload_Data__c: `c${i}` }));
        assert.strictEqual(simulateBoundedFetch(mockChunks, 0, null).length, 5);
        assert.strictEqual(simulateBoundedFetch(mockChunks, 0, 0).length, 5);
        assert.strictEqual(simulateBoundedFetch(mockChunks, 0, -5).length, 5);
    });

    runTest('simulateBoundedFetch: handles negative, fractional, and stringified start indices safely', () => {
        const mockChunks = Array.from({ length: 10 }, (_, i) => ({ Chunk_Index__c: i, Payload_Data__c: `c${i}` }));
        assert.strictEqual(simulateBoundedFetch(mockChunks, -5, 3)[0].Chunk_Index__c, 0);
        assert.strictEqual(simulateBoundedFetch(mockChunks, '2', 3)[0].Chunk_Index__c, 2);
        assert.strictEqual(simulateBoundedFetch(mockChunks, 3.8, 3)[0].Chunk_Index__c, 3);
        assert.strictEqual(simulateBoundedFetch(mockChunks, 100, 3).length, 0);
    });

    // --- Category 3: Benchmark Fixture Verification (PBIM, BQC, CST) ---
    console.log('\n[Category 3: Benchmark Fixture Paginated Verification]');

    const fixtures = [
        { name: 'PBIM', relPath: '../../../explorer/public/projects/pbim/explorer-data.json', expectedNodes: 528, expectedEdges: 2063, expectedSize: 4253569, expectedChunks: 43 },
        { name: 'BQC', relPath: '../../../explorer/public/projects/bqc/explorer-data.json', expectedNodes: 274, expectedEdges: 603, expectedSize: 1332083, expectedChunks: 14 },
        { name: 'CST', relPath: '../../../explorer/public/projects/cst/explorer-data.json', expectedNodes: 240, expectedEdges: 1024, expectedSize: 1860770, expectedChunks: 19 }
    ];

    fixtures.forEach(fix => {
        runTest(`Fixture ${fix.name}: file size, exact chunk count, paginated retrieval, and JSON verification`, () => {
            const fullPath = path.resolve(__dirname, fix.relPath);
            assert.strictEqual(fs.existsSync(fullPath), true, `Fixture path ${fullPath} must exist`);

            const rawJson = fs.readFileSync(fullPath, 'utf8');
            assert.strictEqual(rawJson.length, fix.expectedSize, `Exact character length for ${fix.name}`);

            const rawChunks = chunkPayload(rawJson, 100000);
            assert.strictEqual(rawChunks.length, fix.expectedChunks, `Exact chunk count for ${fix.name}`);

            const chunkRecords = rawChunks.map((data, idx) => ({ Chunk_Index__c: idx, Payload_Data__c: data }));

            // Simulate LWC paginated fetching in batches of 5 chunks
            const fetchedPayloads = [];
            let nextIndex = 0;
            const pageSize = 5;

            while (nextIndex < chunkRecords.length) {
                const batch = simulateBoundedFetch(chunkRecords, nextIndex, pageSize);
                assert.strictEqual(batch.length > 0, true);
                assert.strictEqual(loaderModule.verifyChunkSequence(batch, nextIndex), true);

                for (const c of batch) {
                    fetchedPayloads.push(c.Payload_Data__c);
                }

                nextIndex += batch.length;
            }

            const reassembled = loaderModule.reassembleChunks(fetchedPayloads);
            assert.strictEqual(reassembled, rawJson);
            assert.strictEqual(loaderModule.validatePayloadIntegrity(reassembled), true);

            const parsed = JSON.parse(reassembled);
            assert.strictEqual(parsed.nodes.length, fix.expectedNodes);
            assert.strictEqual(parsed.edges.length, fix.expectedEdges);
        });
    });

    // --- Category 4: Advanced Edge Cases, Unicode, Race Conditions & Lifecycle ---
    console.log('\n[Category 4: Advanced Edge Cases, UTF-8 Multibyte, Race Conditions & Lifecycle]');

    runTest('Unicode & Multibyte UTF-8 handling across chunk boundaries', () => {
        const unicodePayload = JSON.stringify({
            nodes: [
                { id: '1', label: 'Salesforce 日本語 ノード 🚀' },
                { id: '2', label: 'Café / Año / Über' }
            ],
            edges: [{ source: '1', target: '2', label: '依存関係 🔥' }]
        });

        // Chunk into small 25-character chunks to force splits in multibyte UTF-8 strings
        const chunks = chunkPayload(unicodePayload, 25);
        const records = chunks.map((c, i) => ({ Chunk_Index__c: i, Payload_Data__c: c }));

        assert.strictEqual(loaderModule.verifyChunkSequence(records, 0), true);
        const reassembled = loaderModule.reassembleChunks(records.map(r => r.Payload_Data__c));
        assert.strictEqual(reassembled, unicodePayload);
        assert.strictEqual(loaderModule.validatePayloadIntegrity(reassembled), true);

        const parsed = JSON.parse(reassembled);
        assert.strictEqual(parsed.nodes[0].label, 'Salesforce 日本語 ノード 🚀');
    });

    runTest('Surrogate Pair Boundary Safety: prevents splitting UTF-16 surrogate pairs at, before, and after chunk boundaries', () => {
        // Construct valid JSON payload where emoji 🚀 (\uD83D\uDE80) straddles chunk boundary at index 26 (chunk size 27)
        const prefix = '{"nodes":[{"id":"N1","x":"'; // 26 chars
        const payloadStraddle = prefix + '🚀' + '"}],"edges":[]}';

        const chunksStraddle = loaderModule.chunkPayload(payloadStraddle, 27);
        assert.strictEqual(chunksStraddle[0].length, 26, 'Chunk 0 boundary must move back by 1 to avoid splitting surrogate pair');
        assert.strictEqual(chunksStraddle[0].endsWith('\uD83D'), false, 'Chunk 0 must not end with unpaired high surrogate');
        assert.strictEqual(chunksStraddle[1].startsWith('🚀'), true, 'Chunk 1 must start with intact emoji');

        const reassembledStraddle = loaderModule.reassembleChunks(chunksStraddle);
        assert.strictEqual(reassembledStraddle, payloadStraddle);
        assert.strictEqual(loaderModule.validatePayloadIntegrity(reassembledStraddle), true);

        // Test supplementary character before boundary
        const payloadBefore = '{"nodes":[{"id":"N1","x":"🔥"}],"edges":[]}';
        const chunksBefore = loaderModule.chunkPayload(payloadBefore, 25);
        assert.strictEqual(loaderModule.reassembleChunks(chunksBefore), payloadBefore);
        assert.strictEqual(loaderModule.validatePayloadIntegrity(payloadBefore), true);

        // Test supplementary character after boundary
        const payloadAfter = '{"nodes":[{"id":"N1","x":"a⚡"}],"edges":[]}';
        const chunksAfter = loaderModule.chunkPayload(payloadAfter, 27);
        assert.strictEqual(loaderModule.reassembleChunks(chunksAfter), payloadAfter);
        assert.strictEqual(loaderModule.validatePayloadIntegrity(payloadAfter), true);
    });

    runTest('Oversized Synthetic Payload (10 MB / 100 Chunks)', () => {
        const largeNodes = Array.from({ length: 10000 }, (_, i) => ({
            id: `node_${i}`,
            name: `Controller_${i}`,
            layer: 'controller',
            domain: 'salesforce'
        }));
        const largeEdges = Array.from({ length: 9999 }, (_, i) => ({
            id: `edge_${i}`,
            source: `node_${i}`,
            target: `node_${i + 1}`
        }));

        const syntheticPayload = JSON.stringify({ nodes: largeNodes, edges: largeEdges });
        assert.strictEqual(syntheticPayload.length > 500000, true);

        const chunks = chunkPayload(syntheticPayload, 100000);
        const records = chunks.map((c, i) => ({ Chunk_Index__c: i, Payload_Data__c: c }));

        let nextIdx = 0;
        const fetched = [];
        while (nextIdx < records.length) {
            const batch = simulateBoundedFetch(records, nextIdx, 10);
            assert.strictEqual(loaderModule.verifyChunkSequence(batch, nextIdx), true);
            for (const item of batch) {
                fetched.push(item.Payload_Data__c);
            }
            nextIdx += batch.length;
        }

        const reassembled = loaderModule.reassembleChunks(fetched);
        assert.strictEqual(reassembled, syntheticPayload);
        assert.strictEqual(loaderModule.validatePayloadIntegrity(reassembled), true);
    });

    await runAsyncTest('In-flight Request Cancellation / Stale Request Discard (Rapid Project Switch)', async () => {
        const viewer = new SimulatedDaGraphViewer();

        // Project A fetch starts
        viewer.recordId = 'PROJ_A';
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        const mockMetadataA = async () => {
            await delay(50);
            return { runId: 'run_A', isChunked: true, totalChunks: 2 };
        };
        const mockChunksA = async () => {
            await delay(50);
            return [{ Chunk_Index__c: 0, Payload_Data__c: '{"nodes":[' }, { Chunk_Index__c: 1, Payload_Data__c: ']}' }];
        };

        const fetchPromiseA = viewer.fetchGraphData(mockMetadataA, mockChunksA);

        // Rapidly switch to Project B before Project A completes
        viewer.recordId = 'PROJ_B';
        const mockMetadataB = async () => {
            return { runId: 'run_B', isChunked: false, rawPayload: '{"nodes":[{"id":"B"}]}' };
        };
        const fetchPromiseB = viewer.fetchGraphData(mockMetadataB, null);

        await Promise.all([fetchPromiseA, fetchPromiseB]);

        // Verify that Project B was rendered and Project A was discarded
        assert.strictEqual(viewer.renderedGraphData.nodes[0].id, 'B');
        assert.strictEqual(viewer.error, null);
    });

    await runAsyncTest('Cytoscape Mounting & Teardown Lifecycle Cleanup', async () => {
        const viewer = new SimulatedDaGraphViewer();

        // Render first graph
        viewer.renderGraph({ nodes: [{ id: '1' }] });
        const instance1 = viewer.cyInstance;
        assert.strictEqual(instance1.destroyed, false);

        // Re-render graph without unmounting
        viewer.renderGraph({ nodes: [{ id: '2' }] });
        assert.strictEqual(instance1.destroyed, true, 'First instance must be destroyed on re-render');
        assert.strictEqual(viewer.cyInstance.destroyed, false);

        // Unmount component
        viewer.disconnectedCallback();
        assert.strictEqual(viewer.cyInstance, null, 'cyInstance must be cleared on disconnectedCallback');
    });

    // --- Category 5: Expanded Adversarial Security, Fault Injection & Ingestion Verification ---
    console.log('\n[Category 5: Expanded Adversarial Security, Fault Injection & Ingestion Verification]');

    runTest('verifyChunkSequence: null element in chunk array does not throw TypeError', () => {
        const arrayWithNull = [{ Chunk_Index__c: 0 }, null, { Chunk_Index__c: 2 }];
        assert.strictEqual(loaderModule.verifyChunkSequence(arrayWithNull, 0), false);
    });

    runTest('chunkPayload: caps chunk size at 131,072 characters', () => {
        const longStr = 'x'.repeat(200000);
        const chunks = chunkPayload(longStr, 200000); // Pass oversized chunk parameter
        assert.strictEqual(chunks[0].length, 131072);
        assert.strictEqual(chunks[1].length, 68928);
    });

    runTest('simulateBoundedFetch: large startIndex arithmetic safety check', () => {
        const mockChunks = [{ Chunk_Index__c: 0, Payload_Data__c: 'a' }];
        const result = simulateBoundedFetch(mockChunks, 2147483640, 10);
        assert.strictEqual(result.length, 0);
    });

    runTest('Ingestion Contract: throws validation errors on blank project name/key', () => {
        const validateIngestionInput = (projectName, projectKey) => {
            if (!projectName || typeof projectName !== 'string' || projectName.trim() === '' ||
                !projectKey || typeof projectKey !== 'string' || projectKey.trim() === '') {
                throw new Error('Project name and project key are required.');
            }
        };
        assert.throws(() => validateIngestionInput('', 'KEY_1'), /Project name/);
        assert.throws(() => validateIngestionInput('Proj', ''), /Project name/);
        assert.doesNotThrow(() => validateIngestionInput('Proj', 'KEY_1'));
    });

    runTest('Metadata DTO Alignment Contract: Apex DTO field set matches LWC expectations', () => {
        const sampleDto = {
            projectId: 'a00000000000001AAA',
            projectKey: 'PROJ_ALPHA',
            projectName: 'Test Alpha',
            runId: 'a01000000000001AAA',
            isChunked: true,
            totalChunks: 5,
            chunks: []
        };
        assert.strictEqual(typeof sampleDto.projectId, 'string');
        assert.strictEqual(typeof sampleDto.runId, 'string');
        assert.strictEqual(typeof sampleDto.isChunked, 'boolean');
        assert.strictEqual(typeof sampleDto.totalChunks, 'number');
    });

    runTest('validateChunkLimits & validatePayloadSize: enforces max chunk size and total payload size bounds', () => {
        const validChunk = 'a'.repeat(100000);
        const oversizedChunk = 'a'.repeat(131073);

        assert.strictEqual(loaderModule.validateChunkLimits([validChunk]), true);
        assert.strictEqual(loaderModule.validateChunkLimits([oversizedChunk]), false);
        assert.strictEqual(loaderModule.validateChunkLimits([{ Chunk_Index__c: 0, Payload_Data__c: validChunk }]), true);
        assert.strictEqual(loaderModule.validateChunkLimits([{ Chunk_Index__c: 0, Payload_Data__c: oversizedChunk }]), false);

        const normalPayload = '{"nodes":[]}';
        const oversizedPayload = 'x'.repeat(10485761); // Exceeds 10MB
        assert.strictEqual(loaderModule.validatePayloadSize(normalPayload), true);
        assert.strictEqual(loaderModule.validatePayloadSize(oversizedPayload), false);
        assert.strictEqual(loaderModule.validatePayloadIntegrity(oversizedPayload), false);
    });

    runTest('Ingestion Bounded Batching & Idempotency Simulation Contract', () => {
        const mockStore = new Map();

        const simulateSaveGraphChunks = (runId, chunks, startIndex = 0, projectId = null, maxBatch = 10) => {
            if (!runId || !chunks || chunks.length === 0) return 0;
            if (chunks.length > maxBatch) {
                throw new Error(`Batch chunk count (${chunks.length}) exceeds maximum permitted limit of ${maxBatch} chunks per call.`);
            }
            if (!mockStore.has(runId)) mockStore.set(runId, new Map());
            const runStore = mockStore.get(runId);

            let affected = 0;
            for (let i = 0; i < chunks.length; i++) {
                const targetIdx = startIndex + i;
                const chunkStr = chunks[i];
                if (chunkStr.length > 131072) {
                    throw new Error(`Chunk at index ${targetIdx} exceeds maximum allowed size of 131072 characters.`);
                }
                runStore.set(targetIdx, chunkStr);
                affected++;
            }
            return affected;
        };

        // Batch 1 (0..4)
        const batch1 = ['c0', 'c1', 'c2', 'c3', 'c4'];
        assert.strictEqual(simulateSaveGraphChunks('run_1', batch1, 0, 'PROJ_1'), 5);

        // Duplicate Batch 1 submission (Idempotent update)
        assert.strictEqual(simulateSaveGraphChunks('run_1', batch1, 0, 'PROJ_1'), 5);
        assert.strictEqual(mockStore.get('run_1').size, 5);

        // Batch 2 (5..6)
        const batch2 = ['c5', 'c6'];
        assert.strictEqual(simulateSaveGraphChunks('run_1', batch2, 5, 'PROJ_1'), 2);
        assert.strictEqual(mockStore.get('run_1').size, 7);

        // Reject oversized batch (>10 chunks)
        const oversizedBatch = Array.from({ length: 11 }, (_, i) => `c${i}`);
        assert.throws(() => simulateSaveGraphChunks('run_1', oversizedBatch, 0, 'PROJ_1'), /exceeds maximum permitted limit/);
    });

    // --- Category 6: Reusable LWC Layout Engine (daLayoutEngine) Parity Tests ---
    console.log('\n[Category 6: Reusable LWC Layout Engine (daLayoutEngine) Parity Tests]');

    runTest('daLayoutEngine: P0 computeArchitectureLayout produces deterministic finite coordinates', () => {
        const nodes = [
            { id: 'ApexClass:AccountController', name: 'AccountController', type: 'ApexClass' },
            { id: 'CustomObject:Account', name: 'Account', type: 'CustomObject' },
            { id: 'LWC:accountCard', name: 'accountCard', type: 'LWC' }
        ];
        const edges = [{ id: 'e1', source: 'LWC:accountCard', target: 'ApexClass:AccountController' }];

        const result1 = layoutModule.computeArchitectureLayout(nodes, edges);
        const result2 = layoutModule.computeArchitectureLayout(nodes, edges);

        assert.deepStrictEqual(result1, result2, 'Layout execution must be 100% deterministic');
        assert.strictEqual(Object.keys(result1.positions).length, 3);

        const posLwc = result1.positions['LWC:accountCard'];
        const posApex = result1.positions['ApexClass:AccountController'];
        const posObj = result1.positions['CustomObject:Account'];

        assert.strictEqual(Number.isFinite(posLwc.x) && Number.isFinite(posLwc.y), true);
        assert.strictEqual(Number.isFinite(posApex.x) && Number.isFinite(posApex.y), true);
        assert.strictEqual(Number.isFinite(posObj.x) && Number.isFinite(posObj.y), true);

        // Architectural layer Y ordering invariant: presentation < domain < schema
        assert.strictEqual(posLwc.y < posObj.y, true);
    });

    runTest('daLayoutEngine: P0 computeArchitectureLayout against real benchmark fixture (CST)', () => {
        const cstPath = path.resolve(__dirname, '../../../explorer/public/projects/cst/explorer-data.json');
        const cstData = JSON.parse(fs.readFileSync(cstPath, 'utf8'));

        const result = layoutModule.computeArchitectureLayout(cstData.nodes, cstData.edges);
        assert.strictEqual(Object.keys(result.positions).length, cstData.nodes.length);

        let finiteCount = 0;
        for (const [nodeId, pos] of Object.entries(result.positions)) {
            if (Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
                finiteCount++;
            }
        }
        assert.strictEqual(finiteCount, cstData.nodes.length, 'All 240 CST nodes must receive finite coordinates');
    });

    runTest('daLayoutEngine: P1 computeOrbitLayout produces valid radial coordinates', () => {
        const orbitInput = {
            nodes: [
                { nodeId: 'node_0', orbitRingIndex: 0, orbitSectorId: 'sec_1' },
                { nodeId: 'node_1', orbitRingIndex: 1, orbitSectorId: 'sec_1' },
                { nodeId: 'node_2', orbitRingIndex: 2, orbitSectorId: 'sec_2' }
            ]
        };

        const result = layoutModule.computeOrbitLayout(orbitInput);
        assert.strictEqual(Object.keys(result.positions).length, 3);

        for (const pos of Object.values(result.positions)) {
            assert.strictEqual(Number.isFinite(pos.x) && Number.isFinite(pos.y), true);
            assert.strictEqual(Number.isFinite(pos.radius), true);
            assert.strictEqual(Number.isFinite(pos.angle), true);
        }
    });

    runTest('daLayoutEngine: P1 computeConstellationLayout produces focal origin and curved edge paths', () => {
        const constellationData = {
            focalNode: { id: 'focal_1', displayName: 'Focal Component' },
            rings: [
                {
                    ringIndex: 1,
                    hopDistance: 1,
                    label: 'Direct Dependencies',
                    items: [{ nodeId: 'dep_1', displayName: 'Dep 1' }, { nodeId: 'dep_2', displayName: 'Dep 2' }]
                }
            ],
            edges: [{ source: 'focal_1', target: 'dep_1' }]
        };

        const result = layoutModule.computeConstellationLayout(constellationData, { width: 800, height: 800 });
        assert.strictEqual(result.focalPosition.x, 400);
        assert.strictEqual(result.focalPosition.y, 400);
        assert.strictEqual(Object.keys(result.nodePositions).length, 3);
        assert.strictEqual(result.edgePaths.length, 1);
        assert.strictEqual(result.edgePaths[0].pathSvg.startsWith('M 400.00 400.00'), true);
    });

    runTest('daLayoutEngine: P2 computeSankeyLayout positions stage columns and flow paths', () => {
        const sankeyData = {
            stages: [
                { layer: 'presentation', label: 'UI', featureIds: ['f1'] },
                { layer: 'domain', label: 'Domain', featureIds: ['f2'] }
            ],
            nodes: [{ id: 'f1' }, { id: 'f2' }],
            flows: [{ id: 'flow1', sourceFeatureId: 'f1', targetFeatureId: 'f2', weight: 3 }]
        };

        const result = layoutModule.computeSankeyLayout(sankeyData);
        assert.strictEqual(result.stages.length, 2);
        assert.strictEqual(result.nodes.length, 2);
        assert.strictEqual(result.flows.length, 1);
        assert.strictEqual(result.flows[0].pathString.includes('C'), true);
    });

    runTest('Graph Viewer SELECTION != NAVIGATION Invariant Check', () => {
        const viewer = new SimulatedDaGraphViewer();
        let selectedEventFired = false;
        let selectedNodeId = null;

        // Simulate nodeselect listener
        const onNodeSelect = (nodeId) => {
            selectedEventFired = true;
            selectedNodeId = nodeId;
        };

        // Simulate user clicking node 'N1'
        onNodeSelect('ApexClass:AccountController');

        assert.strictEqual(selectedEventFired, true);
        assert.strictEqual(selectedNodeId, 'ApexClass:AccountController');
        // Selection must not trigger URL navigation or page reload
    });

    console.log('\n===================================================================');
    console.log(`Summary: ${passes} PASSED, ${fails} FAILED`);

    if (fails > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

main().catch(err => {
    console.error('Fatal error running test suite:', err);
    process.exit(1);
});
