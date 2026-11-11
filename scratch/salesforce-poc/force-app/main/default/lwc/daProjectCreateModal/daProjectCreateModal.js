import { LightningElement, api, track } from 'lwc';
import createProjectApex from '@salesforce/apex/DAProjectController.createProject';
import isProjectKeyAvailable from '@salesforce/apex/DAProjectController.isProjectKeyAvailable';
import initiateAnalysisRunApex from '@salesforce/apex/DAProjectController.initiateAnalysisRun';
import uploadChunksApex from '@salesforce/apex/DAProjectController.uploadChunks';
import finalizeRunApex from '@salesforce/apex/DAProjectController.finalizeRun';

const CHUNK_SIZE = 131072; // 131,072 UTF-16 code units (CONTRACT-01 limit)
const BATCH_SIZE = 5; // Safe chunks per Apex call (under governor limits)

export default class DaProjectCreateModal extends LightningElement {
    @api isOpen = false;

    @track projectName = '';
    @track projectKey = '';
    @track repositoryUrl = '';
    @track description = '';

    @track isImporting = false;
    @track uploadProgress = 0;
    @track currentStepText = '';
    @track error = null;
    @track keyAvailable = null;
    @track isCheckingKey = false;

    @track selectedFileName = '';
    manifestPayload = null;
    manifestChecksum = null;
    chunks = [];

    @api
    open() {
        this.resetForm();
        this.isOpen = true;
    }

    @api
    close() {
        if (this.isImporting) {
            return; // Prevent closing while upload in flight
        }
        this.isOpen = false;
        this.dispatchEvent(new CustomEvent('modalclose', {
            bubbles: true,
            composed: true
        }));
    }

    resetForm() {
        this.projectName = '';
        this.projectKey = '';
        this.repositoryUrl = '';
        this.description = '';
        this.isImporting = false;
        this.uploadProgress = 0;
        this.currentStepText = '';
        this.error = null;
        this.keyAvailable = null;
        this.isCheckingKey = false;
        this.selectedFileName = '';
        this.manifestPayload = null;
        this.manifestChecksum = null;
        this.chunks = [];
    }

    handleNameChange(event) {
        this.projectName = event.target.value;
        this.error = null;
        if (!this.projectKey || this.projectKey === this.slugify(this.projectName.slice(0, -1))) {
            this.projectKey = this.slugify(this.projectName);
            this.debounceCheckKeyAvailability();
        }
    }

    handleKeyChange(event) {
        this.projectKey = this.slugify(event.target.value);
        this.error = null;
        this.debounceCheckKeyAvailability();
    }

    handleUrlChange(event) {
        this.repositoryUrl = event.target.value;
    }

    handleDescriptionChange(event) {
        this.description = event.target.value;
    }

    debounceCheckKeyAvailability() {
        if (!this.projectKey) {
            this.keyAvailable = null;
            return;
        }
        if (this._keyCheckTimeout) {
            clearTimeout(this._keyCheckTimeout);
        }
        this._keyCheckTimeout = setTimeout(() => {
            this.checkKey();
        }, 300);
    }

    async checkKey() {
        if (!this.projectKey) return;
        this.isCheckingKey = true;
        try {
            const available = await isProjectKeyAvailable({ projectKey: this.projectKey });
            this.keyAvailable = available;
        } catch (e) {
            this.keyAvailable = true; // Fallback
        } finally {
            this.isCheckingKey = false;
        }
    }

    handleFileChange(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        this.selectedFileName = file.name;
        this.error = null;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target.result;
                const parsed = JSON.parse(text);
                if (!parsed || (!parsed.nodes && !parsed.elements)) {
                    throw new Error('Invalid graph manifest: JSON must contain "nodes" array or "elements" graph structure.');
                }
                this.manifestPayload = text;
                this.currentStepText = `Manifest loaded (${(text.length / 1024).toFixed(1)} KB)`;
            } catch (err) {
                this.error = 'Invalid graph file: ' + err.message;
                this.manifestPayload = null;
                this.selectedFileName = '';
            }
        };
        reader.readAsText(file);
    }

    slugify(str) {
        if (!str) return '';
        return str
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }

    partitionPayloadIntoChunks(rawJson) {
        const chunks = [];
        let index = 0;
        for (let i = 0; i < rawJson.length; i += CHUNK_SIZE) {
            chunks.push({
                chunkIndex: index++,
                payloadData: rawJson.slice(i, i + CHUNK_SIZE)
            });
        }
        return chunks;
    }

    async computeSha256(text) {
        if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
            const encoder = new TextEncoder();
            const data = encoder.encode(text);
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }
        return null;
    }

    get isImportDisabled() {
        return this.isImporting || !this.projectName || !this.projectKey || this.keyAvailable === false;
    }

    get progressBarStyle() {
        return `width: ${this.uploadProgress}%;`;
    }

    async handleSaveAndImport() {
        if (!this.projectName.trim()) {
            this.error = 'Project Name is required.';
            return;
        }
        if (!this.projectKey.trim()) {
            this.error = 'Project Key is required.';
            return;
        }
        if (this.keyAvailable === false) {
            this.error = 'Project Key already in use. Please choose a different key.';
            return;
        }

        this.isImporting = true;
        this.error = null;
        this.uploadProgress = 10;
        this.currentStepText = 'Creating project record...';

        try {
            // Step 1: Create Project
            const projectRes = await createProjectApex({
                name: this.projectName.trim(),
                projectKey: this.projectKey.trim(),
                repositoryUrl: this.repositoryUrl ? this.repositoryUrl.trim() : null,
                description: this.description ? this.description.trim() : null
            });

            if (!projectRes || !projectRes.isSuccess) {
                throw new Error(projectRes?.errorMessage || 'Failed to register project.');
            }

            const projectId = projectRes.projectId;
            const projectKey = projectRes.projectKey;
            this.uploadProgress = 25;

            let runId = null;

            // Step 2: Upload Manifest if provided
            if (this.manifestPayload) {
                this.currentStepText = 'Preparing graph payload chunks...';
                this.chunks = this.partitionPayloadIntoChunks(this.manifestPayload);
                const checksum = await this.computeSha256(this.manifestPayload);

                this.currentStepText = 'Initiating analysis run...';
                const initRes = await initiateAnalysisRunApex({
                    projectId: projectId,
                    runName: 'Initial Import - ' + this.projectName,
                    expectedChunks: this.chunks.length,
                    expectedTotalBytes: this.manifestPayload.length,
                    commitHash: 'initial-import',
                    expectedSha256Checksum: checksum
                });

                if (!initRes || !initRes.isSuccess) {
                    throw new Error(initRes?.errorMessage || 'Failed to initiate analysis run.');
                }
                runId = initRes.runId;
                this.uploadProgress = 40;

                // Upload chunks in batches
                const totalChunks = this.chunks.length;
                let uploadedCount = 0;

                for (let i = 0; i < totalChunks; i += BATCH_SIZE) {
                    const batch = this.chunks.slice(i, i + BATCH_SIZE);
                    this.currentStepText = `Uploading chunks ${i + 1} to ${Math.min(i + BATCH_SIZE, totalChunks)} of ${totalChunks}...`;

                    await uploadChunksApex({
                        runId: runId,
                        chunkList: batch
                    });

                    uploadedCount += batch.length;
                    const chunkProgress = 40 + Math.floor((uploadedCount / totalChunks) * 45);
                    this.uploadProgress = Math.min(85, chunkProgress);
                }

                // Finalize run
                this.currentStepText = 'Verifying and finalizing analysis run...';
                this.uploadProgress = 90;
                const finalRes = await finalizeRunApex({
                    runId: runId,
                    expectedChunks: totalChunks,
                    expectedChecksum: checksum
                });

                if (!finalRes || !finalRes.isSuccess) {
                    throw new Error(finalRes?.errorMessage || 'Analysis run finalization failed.');
                }
            }

            this.uploadProgress = 100;
            this.currentStepText = 'Project successfully created and initialized!';

            // Step 3: Dispatch completion events
            this.dispatchEvent(new CustomEvent('projectcreated', {
                detail: {
                    projectId: projectId,
                    projectKey: projectKey,
                    projectName: this.projectName,
                    runId: runId
                },
                bubbles: true,
                composed: true
            }));

            if (runId) {
                this.dispatchEvent(new CustomEvent('importcomplete', {
                    detail: {
                        projectId: projectId,
                        projectKey: projectKey,
                        runId: runId
                    },
                    bubbles: true,
                    composed: true
                }));
            }

            setTimeout(() => {
                this.close();
            }, 800);

        } catch (err) {
            this.error = 'Creation failed: ' + (err.body ? err.body.message : err.message || err);
            this.uploadProgress = 0;
            this.currentStepText = '';
        } finally {
            this.isImporting = false;
        }
    }

    handleRetry() {
        this.error = null;
        this.handleSaveAndImport();
    }
}
