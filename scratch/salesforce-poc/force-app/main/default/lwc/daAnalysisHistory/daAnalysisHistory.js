import { LightningElement, api, track } from 'lwc';
import getAnalysisRuns from '@salesforce/apex/DAAnalysisHistoryController.getAnalysisRuns';

export default class DaAnalysisHistory extends LightningElement {
    @api projectId;
    @api activeRunId;

    @track runs = [];
    @track selectedRunIds = new Set();
    isLoading = false;
    errorMessage = '';

    connectedCallback() {
        if (this.projectId) {
            this.loadHistory();
        }
    }

    @api
    refresh() {
        this.loadHistory();
    }

    async loadHistory() {
        this.isLoading = true;
        this.errorMessage = '';
        try {
            const data = await getAnalysisRuns({
                projectId: this.projectId,
                queryLimit: 50,
                queryOffset: 0
            });
            this.runs = Array.isArray(data) ? data : [];
        } catch (error) {
            this.errorMessage = error && error.body && error.body.message ? error.body.message : 'Error retrieving analysis history.';
            this.runs = [];
        } finally {
            this.isLoading = false;
        }
    }

    get hasRuns() {
        return this.runs && this.runs.length > 0;
    }

    get isEmpty() {
        return !this.isLoading && (!this.runs || this.runs.length === 0);
    }

    get isCompareDisabled() {
        return this.selectedRunIds.size !== 2;
    }

    get formattedRuns() {
        return this.runs.map((r) => {
            const isActive = r.runId === this.activeRunId;
            const isSelected = this.selectedRunIds.has(r.runId);
            const shortCommit = r.commitHash ? r.commitHash.substring(0, 7) : 'n/a';
            const formattedTime = r.runTimestamp ? new Date(r.runTimestamp).toLocaleString() : '';

            const nodeDelta = r.nodeDelta || 0;
            const edgeDelta = r.edgeDelta || 0;
            const cyclesDelta = r.cyclicSccDelta || 0;

            return {
                ...r,
                isActive,
                isSelectedForCompare: isSelected,
                shortCommit,
                formattedTime,
                rowClass: isActive ? 'active-run-row' : '',
                statusBadgeClass: r.status === 'AVAILABLE' ? 'slds-theme_success' : 'slds-theme_shade',
                hasNodeDelta: nodeDelta !== 0,
                formattedNodeDelta: nodeDelta > 0 ? `+${nodeDelta}` : `${nodeDelta}`,
                nodeDeltaClass: nodeDelta > 0 ? 'delta-positive' : 'delta-negative',
                hasEdgeDelta: edgeDelta !== 0,
                formattedEdgeDelta: edgeDelta > 0 ? `+${edgeDelta}` : `${edgeDelta}`,
                edgeDeltaClass: edgeDelta > 0 ? 'delta-positive' : 'delta-negative',
                hasCyclesDelta: cyclesDelta !== 0,
                formattedCyclesDelta: cyclesDelta > 0 ? `+${cyclesDelta}` : `${cyclesDelta}`,
                cyclesDeltaClass: cyclesDelta > 0 ? 'delta-negative' : 'delta-positive',
                cyclesClass: r.cyclicSccCount > 0 ? 'slds-text-color_error font-mono' : 'font-mono'
            };
        });
    }

    handleRefresh() {
        this.loadHistory();
    }

    handleCheckboxChange(event) {
        const runId = event.target.dataset.id;
        const checked = event.target.checked;
        if (checked) {
            this.selectedRunIds.add(runId);
        } else {
            this.selectedRunIds.delete(runId);
        }
        // Force reactivity
        this.selectedRunIds = new Set(this.selectedRunIds);
    }

    handleLoadRun(event) {
        const runId = event.currentTarget.dataset.id;
        const commitHash = event.currentTarget.dataset.hash;
        this.dispatchEvent(new CustomEvent('runselect', {
            detail: { runId, commitHash },
            bubbles: true,
            composed: true
        }));
    }

    handleCompareSelected() {
        if (this.selectedRunIds.size !== 2) return;
        const [baseRunId, targetRunId] = Array.from(this.selectedRunIds);
        this.dispatchEvent(new CustomEvent('comparelaunch', {
            detail: { baseRunId, targetRunId },
            bubbles: true,
            composed: true
        }));
    }
}
