import { LightningElement, api, track } from 'lwc';
import getProjects from '@salesforce/apex/DAGraphController.getProjects';
import getAnalysisRuns from '@salesforce/apex/DAAnalysisHistoryController.getAnalysisRuns';

export default class DaProjectDashboard extends LightningElement {
    @api projectId = null;
    @api projectKey = null;

    @track projects = [];
    @track runs = [];
    @track isLoading = false;
    @track errorMessage = '';
    @track activeRunId = null;

    connectedCallback() {
        this.initializeDashboard();
    }

    @api
    async initializeDashboard() {
        this.isLoading = true;
        this.errorMessage = '';
        try {
            const projectList = await getProjects();
            this.projects = Array.isArray(projectList) ? projectList : [];

            if (!this.projectId && this.projects.length > 0) {
                const first = this.projects[0];
                this.projectId = first.Id;
                this.projectKey = first.Project_Key__c || first.Name;
            }

            if (this.projectId) {
                await this.loadProjectRuns();
            }
        } catch (err) {
            this.errorMessage = err && err.body && err.body.message ? err.body.message : (err.message || 'Error initializing dashboard.');
        } finally {
            this.isLoading = false;
        }
    }

    async loadProjectRuns() {
        if (!this.projectId) {
            this.runs = [];
            return;
        }

        try {
            const runList = await getAnalysisRuns({
                projectId: this.projectId,
                queryLimit: 25,
                queryOffset: 0
            });
            this.runs = Array.isArray(runList) ? runList : [];
            if (this.runs.length > 0 && !this.activeRunId) {
                this.activeRunId = this.runs[0].runId;
            }
        } catch (err) {
            this.errorMessage = err && err.body && err.body.message ? err.body.message : (err.message || 'Error loading project runs.');
            this.runs = [];
        }
    }

    get activeProject() {
        return (this.projects || []).find(p => p.Id === this.projectId || p.Project_Key__c === this.projectId) || null;
    }

    get activeProjectName() {
        const p = this.activeProject;
        return p ? p.Name : (this.projectKey || 'Salesforce DX Architecture Portfolio');
    }

    get activeProjectKey() {
        const p = this.activeProject;
        return p ? (p.Project_Key__c || p.Name) : (this.projectKey || 'N/A');
    }

    get projectStatus() {
        if (!this.projectId) return 'NO_PROJECT';
        if (this.runs.length === 0) return 'NOT_ANALYZED';
        const latest = this.runs[0];
        return latest.status || 'AVAILABLE';
    }

    get projectStatusBadgeClass() {
        const status = this.projectStatus;
        if (status === 'AVAILABLE') return 'slds-badge slds-theme_success';
        if (status === 'FAILED') return 'slds-badge slds-theme_error';
        if (status === 'EMPTY' || status === 'NOT_ANALYZED') return 'slds-badge slds-theme_warning';
        return 'slds-badge slds-theme_shade';
    }

    get isExploreDisabled() {
        return !this.projectId || this.runs.length === 0 || this.isLoading;
    }

    get isEmpty() {
        return !this.isLoading && (!this.runs || this.runs.length === 0);
    }

    get runCount() {
        return this.runs.length;
    }

    get latestRun() {
        return this.runs.length > 0 ? this.runs[0] : null;
    }

    get totalNodes() {
        const latest = this.latestRun;
        return latest && latest.nodeCount != null ? latest.nodeCount : 0;
    }

    get totalEdges() {
        const latest = this.latestRun;
        return latest && latest.edgeCount != null ? latest.edgeCount : 0;
    }

    get totalCycles() {
        const latest = this.latestRun;
        return latest && latest.cyclicSccCount != null ? latest.cyclicSccCount : 0;
    }

    get cyclicSccClass() {
        return this.totalCycles > 0 ? 'metric-value font-mono text-danger' : 'metric-value font-mono text-success';
    }

    get nodeTrendText() {
        const latest = this.latestRun;
        if (!latest || latest.nodeDelta === 0) return 'Stable';
        return latest.nodeDelta > 0 ? `+${latest.nodeDelta} vs previous` : `${latest.nodeDelta} vs previous`;
    }

    get edgeTrendText() {
        const latest = this.latestRun;
        if (!latest || latest.edgeDelta === 0) return 'Stable';
        return latest.edgeDelta > 0 ? `+${latest.edgeDelta} vs previous` : `${latest.edgeDelta} vs previous`;
    }

    get cycleTrendText() {
        const latest = this.latestRun;
        if (!latest || latest.cyclicSccDelta === 0) return 'Zero change';
        return latest.cyclicSccDelta > 0 ? `+${latest.cyclicSccDelta} cycles added` : `${latest.cyclicSccDelta} cycles resolved`;
    }

    get lastAnalyzedFormatted() {
        const latest = this.latestRun;
        if (!latest || !latest.runTimestamp) return 'No runs recorded';
        return new Date(latest.runTimestamp).toLocaleDateString();
    }

    get formattedRuns() {
        return (this.runs || []).map(r => {
            const isActive = r.runId === this.activeRunId;
            const shortCommit = r.commitHash ? r.commitHash.substring(0, 7) : 'n/a';
            const formattedTime = r.runTimestamp ? new Date(r.runTimestamp).toLocaleString() : '';

            const nodeDelta = r.nodeDelta || 0;
            const edgeDelta = r.edgeDelta || 0;
            const cyclesDelta = r.cyclicSccDelta || 0;

            return {
                ...r,
                isActive,
                shortCommit,
                formattedTime,
                rowClass: isActive ? 'slds-is-selected active-row' : '',
                statusBadgeClass: r.status === 'AVAILABLE' ? 'slds-badge slds-theme_success' : (r.status === 'FAILED' ? 'slds-badge slds-theme_error' : 'slds-badge slds-theme_shade'),
                hasNodeDelta: nodeDelta !== 0,
                formattedNodeDelta: nodeDelta > 0 ? `+${nodeDelta}` : `${nodeDelta}`,
                nodeDeltaClass: nodeDelta > 0 ? 'delta-pill delta-positive' : 'delta-pill delta-negative',
                hasEdgeDelta: edgeDelta !== 0,
                formattedEdgeDelta: edgeDelta > 0 ? `+${edgeDelta}` : `${edgeDelta}`,
                edgeDeltaClass: edgeDelta > 0 ? 'delta-pill delta-positive' : 'delta-pill delta-negative',
                hasCyclesDelta: cyclesDelta !== 0,
                formattedCyclesDelta: cyclesDelta > 0 ? `+${cyclesDelta}` : `${cyclesDelta}`,
                cyclesDeltaClass: cyclesDelta > 0 ? 'delta-pill delta-danger' : 'delta-pill delta-success',
                cyclesClass: (r.cyclicSccCount || 0) > 0 ? 'text-danger font-mono font-bold' : 'font-mono'
            };
        });
    }

    handleRefresh() {
        this.initializeDashboard();
    }

    handleExploreGraph() {
        if (!this.projectId) return;
        this.dispatchEvent(new CustomEvent('viewgraph', {
            detail: {
                projectId: this.projectId,
                projectKey: this.activeProjectKey,
                runId: this.activeRunId
            },
            bubbles: true,
            composed: true
        }));
    }

    handleSelectRun(event) {
        const runId = event.currentTarget.dataset.id;
        const commitHash = event.currentTarget.dataset.hash;
        this.activeRunId = runId;

        this.dispatchEvent(new CustomEvent('runselect', {
            detail: {
                runId,
                commitHash,
                projectId: this.projectId
            },
            bubbles: true,
            composed: true
        }));
    }
}
