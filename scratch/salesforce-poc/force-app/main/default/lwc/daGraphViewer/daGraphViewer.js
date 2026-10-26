import { LightningElement, api, track } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import cytoscapeUrl from '@salesforce/resourceUrl/cytoscape';
import getLatestGraphMetadataForProject from '@salesforce/apex/DAGraphController.getLatestGraphMetadataForProject';
import getGraphChunks from '@salesforce/apex/DAGraphController.getGraphChunks';
import { reassembleChunks, validatePayloadIntegrity, verifyChunkSequence } from 'c/daGraphPayloadLoader';
import { computeArchitectureLayout } from 'c/daLayoutEngine';

export default class DaGraphViewer extends LightningElement {
    @api recordId;
    @track isLoading = true;
    @track error;
    @track selectedNodeId = null;
    cyInitialized = false;
    cyInstance = null;
    pageSize = 5;
    currentRequestId = 0;

    renderedCallback() {
        if (this.cyInitialized) {
            return;
        }
        this.cyInitialized = true;

        Promise.all([
            loadScript(this, cytoscapeUrl)
        ]).then(() => {
            this.fetchGraphData();
        }).catch(err => {
            this.error = 'Failed to load Cytoscape static resource: ' + (err.message || err);
            this.isLoading = false;
        });
    }

    async fetchGraphData() {
        if (!this.recordId) {
            this.error = 'No Project ID provided.';
            this.isLoading = false;
            return;
        }

        const requestId = ++this.currentRequestId;
        this.isLoading = true;
        this.error = null;

        try {
            const dto = await getLatestGraphMetadataForProject({ projectId: this.recordId });

            if (requestId !== this.currentRequestId) {
                return; // Stale request, active project changed
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
                    const chunkBatch = await getGraphChunks({
                        runId: dto.runId,
                        startIndex: nextIndex,
                        maxChunks: this.pageSize
                    });

                    if (requestId !== this.currentRequestId) {
                        return; // Stale request interrupted during batch retrieval
                    }

                    if (!chunkBatch || chunkBatch.length === 0) {
                        throw new Error(`Failed to retrieve chunk batch starting at index ${nextIndex}`);
                    }

                    if (!verifyChunkSequence(chunkBatch, nextIndex)) {
                        throw new Error(`Sequence error detected in chunk batch starting at index ${nextIndex}`);
                    }

                    for (const c of chunkBatch) {
                        fetchedChunkStrings.push(c.Payload_Data__c);
                    }

                    nextIndex += chunkBatch.length;
                }

                jsonString = reassembleChunks(fetchedChunkStrings);
            } else if (dto.rawPayload) {
                jsonString = dto.rawPayload;
            }

            if (!jsonString) {
                this.error = 'No graph payload data found for this project.';
                this.isLoading = false;
                return;
            }

            if (!validatePayloadIntegrity(jsonString)) {
                this.error = 'Invalid graph payload structure or corrupted JSON data.';
                this.isLoading = false;
                return;
            }

            if (requestId !== this.currentRequestId) {
                return; // Final stale check before rendering
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
        try {
            if (this.cyInstance) {
                this.cyInstance.destroy();
                this.cyInstance = null;
            }
            const container = this.template.querySelector('.cy-container');

            const nodes = graphData.nodes || [];
            const edges = graphData.edges || [];

            // Compute deterministic architecture layout positions
            const layoutResult = computeArchitectureLayout(nodes, edges);
            const computedPositions = layoutResult.positions || {};

            const elements = [];
            nodes.forEach(n => {
                const pos = computedPositions[n.id] || { x: 0, y: 0 };
                elements.push({
                    data: { id: n.id, label: n.displayName || n.name || n.id, layer: n.layer },
                    position: pos
                });
            });

            edges.forEach(e => {
                elements.push({
                    data: { id: e.id || `${e.source}-${e.target}`, source: e.source, target: e.target }
                });
            });

            /* global cytoscape */
            this.cyInstance = cytoscape({
                container: container,
                elements: elements.length > 0 ? elements : (graphData.elements || graphData),
                style: [
                    {
                        selector: 'node',
                        style: {
                            'label': 'data(label)',
                            'background-color': '#0070d2',
                            'color': '#ffffff'
                        }
                    },
                    {
                        selector: 'node:selected',
                        style: {
                            'background-color': '#f2cf5b',
                            'border-width': 3,
                            'border-color': '#005fb2'
                        }
                    },
                    {
                        selector: 'edge',
                        style: {
                            'width': 2,
                            'line-color': '#b0adab',
                            'target-arrow-color': '#b0adab',
                            'target-arrow-shape': 'triangle',
                            'curve-style': 'bezier'
                        }
                    }
                ],
                layout: {
                    name: elements.length > 0 ? 'preset' : 'cose',
                    animate: false
                }
            });

            // Maintain invariant: SELECTION != NAVIGATION
            // Node tap/click updates selection state only, without triggering URL navigation or re-render
            this.cyInstance.on('tap', 'node', (evt) => {
                const node = evt.target;
                this.selectedNodeId = node.id();
                // Dispatch custom event for selection change if needed without navigating
                this.dispatchEvent(new CustomEvent('nodeselect', { detail: { nodeId: node.id() } }));
            });

            this.isLoading = false;
        } catch (err) {
            this.error = 'Error initializing Cytoscape graph: ' + err.message;
            this.isLoading = false;
        }
    }

    disconnectedCallback() {
        if (this.cyInstance) {
            this.cyInstance.destroy();
            this.cyInstance = null;
        }
    }
}
