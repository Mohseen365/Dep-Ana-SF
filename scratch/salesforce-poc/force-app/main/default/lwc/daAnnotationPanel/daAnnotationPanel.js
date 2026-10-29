import { LightningElement, api, track } from 'lwc';
import getAnnotations from '@salesforce/apex/DAAnnotationController.getAnnotations';
import createAnnotation from '@salesforce/apex/DAAnnotationController.createAnnotation';
import updateAnnotation from '@salesforce/apex/DAAnnotationController.updateAnnotation';
import deleteAnnotation from '@salesforce/apex/DAAnnotationController.deleteAnnotation';

export default class DaAnnotationPanel extends LightningElement {
    _projectId = null;
    _selectedNodeId = null;

    @api
    get projectId() {
        return this._projectId;
    }
    set projectId(value) {
        if (this._projectId !== value) {
            this._projectId = value;
            this.fetchAnnotations();
        }
    }

    @api
    get selectedNodeId() {
        return this._selectedNodeId;
    }
    set selectedNodeId(value) {
        if (this._selectedNodeId !== value) {
            this._selectedNodeId = value;
            this.fetchAnnotations();
        }
    }

    @track annotations = [];
    @track isLoading = false;
    @track error = null;

    @track newTitle = '';
    @track newText = '';
    currentRequestId = 0;

    get hasAnnotations() {
        return this.annotations && this.annotations.length > 0;
    }

    get isSubmitDisabled() {
        return !this._projectId || !this._selectedNodeId || !this.newText || this.newText.trim() === '' || this.isLoading;
    }

    handleTitleChange(event) {
        this.newTitle = event.target.value;
    }

    handleTextChange(event) {
        this.newText = event.target.value;
    }

    async fetchAnnotations() {
        if (!this._projectId || !this._selectedNodeId) {
            this.annotations = [];
            return;
        }

        const requestId = ++this.currentRequestId;
        this.isLoading = true;
        this.error = null;

        try {
            const result = await getAnnotations({
                projectId: this._projectId,
                nodeId: this._selectedNodeId
            });

            if (requestId !== this.currentRequestId) {
                return; // Ignore stale request responses
            }

            this.annotations = result || [];
        } catch (err) {
            if (requestId === this.currentRequestId) {
                this.error = 'Failed to load annotations: ' + (err.body ? err.body.message : err.message || err);
                this.annotations = [];
            }
        } finally {
            if (requestId === this.currentRequestId) {
                this.isLoading = false;
            }
        }
    }

    async handleCreateAnnotation() {
        if (!this._projectId || !this._selectedNodeId || !this.newText) {
            return;
        }

        this.isLoading = true;
        this.error = null;

        try {
            await createAnnotation({
                projectId: this._projectId,
                nodeId: this._selectedNodeId,
                title: this.newTitle,
                text: this.newText,
                status: 'OPEN',
                findingId: null
            });

            this.newTitle = '';
            this.newText = '';
            await this.fetchAnnotations();
        } catch (err) {
            this.error = 'Failed to create annotation: ' + (err.body ? err.body.message : err.message || err);
        } finally {
            this.isLoading = false;
        }
    }

    async handleResolveAnnotation(event) {
        const annotationId = event.target.dataset.id;
        if (!annotationId) return;

        this.isLoading = true;
        try {
            await updateAnnotation({
                annotationId: annotationId,
                title: null,
                text: null,
                status: 'RESOLVED'
            });
            await this.fetchAnnotations();
        } catch (err) {
            this.error = 'Failed to resolve annotation: ' + (err.body ? err.body.message : err.message || err);
        } finally {
            this.isLoading = false;
        }
    }

    async handleDeleteAnnotation(event) {
        const annotationId = event.target.dataset.id;
        if (!annotationId) return;

        this.isLoading = true;
        try {
            await deleteAnnotation({ annotationId: annotationId });
            await this.fetchAnnotations();
        } catch (err) {
            this.error = 'Failed to delete annotation: ' + (err.body ? err.body.message : err.message || err);
        } finally {
            this.isLoading = false;
        }
    }
}
