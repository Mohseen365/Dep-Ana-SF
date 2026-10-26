import { LightningElement, track, api } from 'lwc';
import { loadScript, loadStyle } from 'lightning/platformResourceLoader';

export default class GraphViewer extends LightningElement {
    @api projectId = 'pbim';
    @track isLoading = true;
    @track errorMessage = '';

    cytoscapeInitialized = false;
    cyInstance = null;

    renderedCallback() {
        if (this.cytoscapeInitialized) {
            return;
        }
        this.cytoscapeInitialized = true;

        // In a deployed SF org, cytoscape would be loaded from Static Resources:
        // Promise.all([
        //     loadScript(this, CYTOSCAPE_JS),
        // ]).then(() => this.initGraph()).catch(error => ...);

        // Local simulation / initialization log for feasibility assessment
        this.isLoading = false;
    }

    initGraph() {
        const container = this.template.querySelector('.graph-container');
        if (!container) return;

        try {
            // Cytoscape initialization prototype inside LWS wrapper
            if (window.cytoscape) {
                this.cyInstance = window.cytoscape({
                    container: container,
                    elements: [
                        { data: { id: 'a', label: 'ApexClass: AccountController' } },
                        { data: { id: 'b', label: 'CustomObject: Account' } },
                        { data: { id: 'ab', source: 'a', target: 'b', label: 'SOQL' } }
                    ],
                    style: [
                        {
                            selector: 'node',
                            style: {
                                'background-color': '#0176D3',
                                'label': 'data(label)',
                                'color': '#181818',
                                'font-size': '12px'
                            }
                        },
                        {
                            selector: 'edge',
                            style: {
                                'width': 2,
                                'line-color': '#747474',
                                'target-arrow-color': '#747474',
                                'target-arrow-shape': 'triangle',
                                'curve-style': 'bezier'
                            }
                        }
                    ],
                    layout: {
                        name: 'grid',
                        rows: 1
                    }
                });
            }
        } catch (err) {
            this.errorMessage = 'Failed to initialize Cytoscape under LWS: ' + err.message;
        }
    }

    handleResetView() {
        if (this.cyInstance) {
            this.cyInstance.fit();
        }
    }

    handleRunLayout() {
        if (this.cyInstance) {
            this.cyInstance.layout({ name: 'cose', animate: true }).run();
        }
    }

    disconnectedCallback() {
        if (this.cyInstance) {
            this.cyInstance.destroy();
            this.cyInstance = null;
        }
    }
}
