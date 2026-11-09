class DaHeader {
    constructor() {
        this.projectId = null;
        this.projectKey = null;
        this.projectName = null;
        this.activeView = 'graph';
        this.selectedNodeId = null;
        this.isLoading = false;
        this.error = null;
        this.searchQuery = '';
    }

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
            case 'graph': return 'Graph Viewer';
            case 'matrix': return 'Dependency Matrix';
            case 'findings': return 'Findings & Alerts';
            case 'history': return 'Analysis History';
            case 'compare': return 'Snapshot Compare';
            default: return this.activeView ? this.activeView.toUpperCase() : 'Graph Viewer';
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
        this.dispatchEvent({
            type: 'globalsearch',
            detail: { query: this.searchQuery },
            bubbles: true,
            composed: true
        });
    }

    handleActionTrigger(event) {
        const action = event.currentTarget.dataset.action;
        this.dispatchEvent({
            type: 'actiontrigger',
            detail: { action },
            bubbles: true,
            composed: true
        });
    }

    handleKeyboardShortcutClick() {
        this.dispatchEvent({
            type: 'actiontrigger',
            detail: { action: 'shortcuts' },
            bubbles: true,
            composed: true
        });
    }
}
module.exports = DaHeader;
