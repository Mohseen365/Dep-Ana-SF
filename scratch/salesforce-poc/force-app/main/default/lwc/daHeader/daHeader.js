import { LightningElement, api, track } from 'lwc';

export default class DaHeader extends LightningElement {
    @api projectId;
    @api projectKey;
    @api projectName;
    @api activeView = 'graph';
    @api selectedNodeId;
    @api isLoading = false;
    @api error;

    @track searchQuery = '';

    get displayProjectKey() {
        return this.projectKey || (this.projectId ? this.projectId.substring(0, 15) : 'None');
    }

    get projectLabel() {
        if (this.projectName) return this.projectName;
        if (this.projectKey) return `Project: ${this.projectKey}`;
        return 'No Project Active';
    }

    get displaySelectedNode() {
        return this.selectedNodeId || 'None (Canvas Overview)';
    }

    get activeViewLabel() {
        switch (this.activeView) {
            case 'graph':
                return 'Graph Viewer';
            case 'matrix':
                return 'Dependency Matrix';
            case 'findings':
                return 'Findings & Alerts';
            case 'history':
                return 'Analysis History';
            case 'compare':
                return 'Snapshot Compare';
            default:
                return this.activeView ? this.activeView.toUpperCase() : 'Graph Viewer';
        }
    }

    get isActionDisabled() {
        return !this.projectId;
    }

    get statusBadgeClass() {
        if (this.error) return 'slds-badge slds-theme_error';
        if (this.isLoading) return 'slds-badge slds-theme_warning';
        if (this.projectId) return 'slds-badge slds-theme_success';
        return 'slds-badge slds-theme_shade';
    }

    get statusText() {
        if (this.error) return 'Error';
        if (this.isLoading) return 'Loading...';
        if (this.projectId) return 'Ready';
        return 'Awaiting Selection';
    }

    handleGlobalSearch(event) {
        this.searchQuery = event.target.value;
        this.dispatchEvent(new CustomEvent('globalsearch', {
            detail: { query: this.searchQuery },
            bubbles: true,
            composed: true
        }));
    }

    handleProjectChange(event) {
        this.dispatchEvent(new CustomEvent('projectchange', {
            detail: event.detail,
            bubbles: true,
            composed: true
        }));
    }

    handleActionTrigger(event) {
        const action = event.currentTarget.dataset.action;
        this.dispatchEvent(new CustomEvent('actiontrigger', {
            detail: { action },
            bubbles: true,
            composed: true
        }));
    }

    handleKeyboardShortcutClick() {
        this.dispatchEvent(new CustomEvent('actiontrigger', {
            detail: { action: 'shortcuts' },
            bubbles: true,
            composed: true
        }));
    }
}
