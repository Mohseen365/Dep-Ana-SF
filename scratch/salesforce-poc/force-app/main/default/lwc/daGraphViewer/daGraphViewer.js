import { LightningElement, api, track } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import cytoscapeUrl from '@salesforce/resourceUrl/cytoscape';
import getLatestGraphForProject from '@salesforce/apex/DAGraphController.getLatestGraphForProject';
import { reassembleChunks } from 'c/daGraphPayloadLoader';

export default class DaGraphViewer extends LightningElement {
    @api recordId;
    @track isLoading = true;
    @track error;
    cyInitialized = false;
    cyInstance = null;

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

    fetchGraphData() {
        if (!this.recordId) {
            this.error = 'No Project ID provided.';
            this.isLoading = false;
            return;
        }

        getLatestGraphForProject({ projectId: this.recordId })
            .then(dto => {
                let jsonString = '';
                if (dto.isChunked && dto.chunks && dto.chunks.length > 0) {
                    jsonString = reassembleChunks(dto.chunks);
                } else {
                    jsonString = dto.rawPayload;
                }

                if (!jsonString) {
                    this.error = 'No graph payload data found for this project.';
                    this.isLoading = false;
                    return;
                }

                const graphData = JSON.parse(jsonString);
                this.renderGraph(graphData);
            })
            .catch(err => {
                this.error = 'Error fetching graph data: ' + (err.body ? err.body.message : err.message || err);
                this.isLoading = false;
            });
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
}