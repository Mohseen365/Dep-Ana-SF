import { LightningElement, api, track } from 'lwc';
import { generateHandoffMarkdown, generateHandoffJson } from 'c/daRefactoringEngine';

export default class DaRefactorHandoffModal extends LightningElement {
    @api isOpen = false;
    @api handoffPlan = null;

    @track exportFormat = 'markdown';
    @track copyStatus = '';

    get markdownContent() {
        if (!this.handoffPlan) return '# No refactoring handoff plan provided.';
        return generateHandoffMarkdown(this.handoffPlan);
    }

    get jsonContent() {
        if (!this.handoffPlan) return '{}';
        const obj = generateHandoffJson(this.handoffPlan);
        return JSON.stringify(obj, null, 2);
    }

    get actionsCount() {
        return (this.handoffPlan && this.handoffPlan.actions && this.handoffPlan.actions.length) || 0;
    }

    get cyclicSccReduction() {
        return (this.handoffPlan && this.handoffPlan.deltas && this.handoffPlan.deltas.cyclicSccReduction) || 0;
    }

    get breakCyclesCount() {
        return (this.handoffPlan && this.handoffPlan.deltas && this.handoffPlan.deltas.breakCycleActionsApplied) || 0;
    }

    handleClose() {
        this.isOpen = false;
        this.dispatchEvent(new CustomEvent('close', {
            bubbles: true,
            composed: true
        }));
    }

    handleCopyToClipboard() {
        const textToCopy = this.exportFormat === 'markdown' ? this.markdownContent : this.jsonContent;
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy)
                .then(() => {
                    this.copyStatus = 'Copied to clipboard!';
                    setTimeout(() => { this.copyStatus = ''; }, 3000);
                })
                .catch(() => {
                    this.copyStatus = 'Failed to copy.';
                });
        } else {
            this.copyStatus = 'Clipboard API not supported in browser.';
        }
    }

    handleDownload() {
        const isMd = this.exportFormat === 'markdown';
        const content = isMd ? this.markdownContent : this.jsonContent;
        const filename = `refactor-handoff-${this.handoffPlan?.projectKey || 'plan'}.${isMd ? 'md' : 'json'}`;
        const mimeType = isMd ? 'text/markdown;charset=utf-8' : 'application/json;charset=utf-8';

        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
            try {
                const blob = new Blob([content], { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                this.copyStatus = `Downloaded ${filename}`;
            } catch (e) {
                this.copyStatus = 'Download failed.';
            }
        }
    }
}
