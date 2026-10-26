import { LightningElement, api, track } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import cytoscapeUrl from '@salesforce/resourceUrl/cytoscape';
import getLatestGraphMetadataForProject from '@salesforce/apex/DAGraphController.getLatestGraphMetadataForProject';
import getGraphChunks from '@salesforce/apex/DAGraphController.getGraphChunks';
import { reassembleChunks, validatePayloadIntegrity, verifyChunkSequence } from 'c/daGraphPayloadLoader';

export default class DaGraphViewer extends LightningElement {
    @api recordId;
    @track isLoading = true;
    @track error;
    cyInitialized = false;
    cyInstance = null;
    pageSize = 5;

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

        try {
            const dto = await getLatestGraphMetadataForProject({ projectId: this.recordId });

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

            const graphData = JSON.parse(jsonString);
            this.renderGraph(graphData);
        } catch (err) {
            this.error = 'Error fetching graph data: ' + (err.body ? err.body.message : err.message || err);
            this.isLoading = false;
        }
    }

    renderGraph(graphData) {
        try {
            const container = this.template.querySelector('.cy-container');
            /* global cytoscape */
            this.cyInstance = cytoscape({
                container: container,
                elements: graphData.elements || graphData,
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
                    name: 'cose',
                    animate: false
                }
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
