import { LightningElement, api, track } from 'lwc';
import getProjects from '@salesforce/apex/DAGraphController.getProjects';

export default class DaProjectSelector extends LightningElement {
    @api label = 'Select Project';
    @api selectedProjectId = null;
    @api disabled = false;

    @track projects = [];
    @track isLoading = true;
    @track error = null;

    connectedCallback() {
        this.loadProjects();
    }

    @api
    async loadProjects() {
        this.isLoading = true;
        this.error = null;
        try {
            const data = await getProjects();
            if (data && Array.isArray(data)) {
                this.projects = data;
                // Auto-select first project if none selected and projects exist
                if (!this.selectedProjectId && this.projects.length > 0) {
                    this.notifyProjectChange(this.projects[0].Id, this.projects[0].Project_Key__c || this.projects[0].Name);
                }
            } else {
                this.projects = [];
            }
        } catch (err) {
            this.error = 'Error loading projects: ' + (err.body ? err.body.message : err.message || err);
            this.projects = [];
        } finally {
            this.isLoading = false;
        }
    }

    get isEmpty() {
        return !this.isLoading && !this.error && (!this.projects || this.projects.length === 0);
    }

    get formattedProjects() {
        return (this.projects || []).map(p => {
            const val = p.Id || p.value;
            const key = p.Project_Key__c ? ` (${p.Project_Key__c})` : '';
            const lbl = (p.Name || p.label) + key;
            return {
                label: lbl,
                value: val,
                isSelected: val === this.selectedProjectId
            };
        });
    }

    handleSelectChange(event) {
        const newProjectId = event.target.value;
        if (!newProjectId || newProjectId === this.selectedProjectId) {
            return; // Prevent redundant state changes or empty selections
        }

        const selectedProj = this.projects.find(p => (p.Id || p.value) === newProjectId);
        const projectKey = selectedProj ? (selectedProj.Project_Key__c || selectedProj.Name || selectedProj.label) : newProjectId;

        this.notifyProjectChange(newProjectId, projectKey);
    }

    notifyProjectChange(projectId, projectKey) {
        this.dispatchEvent(new CustomEvent('projectchange', {
            detail: {
                projectId: projectId,
                projectKey: projectKey
            },
            bubbles: true,
            composed: true
        }));
    }
}
