import { LightningElement, api, track } from 'lwc';
import {
    SCHEMA_VERSION,
    MAX_PAYLOAD_SIZE,
    getDefaultFilterCriteria,
    getDefaultFilterContainer,
    normalizeFilterCriteria,
    validateAndNormalizeContainer,
    serializeFilterContainer
} from 'c/daFilterSchema';

/**
 * DaPresetManager LWC (Lane C)
 * Standalone Lightning Web Component for project-scoped filter preset management.
 * Adheres strictly to:
 * - DEC-W4-01: V2 JSON container format
 * - DEC-W4-03: Strict project-scoped preset isolation
 * Emits component events:
 * - 'filterchange': Emitted when a preset is applied or cleared (contains activeFilter, activePresetId)
 * - 'containerchange': Emitted when presets are added, updated, or deleted (contains updated container)
 */
export default class DaPresetManager extends LightningElement {
    @api projectId = null;

    _filterContainer = null;
    _activeFilter = null;

    @track isLoading = false;
    @track errorMessage = null;
    @track showSaveModal = false;
    @track newPresetName = '';

    @api
    get filterContainer() {
        return this._filterContainer || getDefaultFilterContainer();
    }
    set filterContainer(value) {
        if (!value) {
            this._filterContainer = getDefaultFilterContainer();
            return;
        }
        try {
            if (typeof value === 'string') {
                const parsed = JSON.parse(value);
                this._filterContainer = validateAndNormalizeContainer(parsed, this.projectId);
            } else if (typeof value === 'object') {
                this._filterContainer = validateAndNormalizeContainer(value, this.projectId);
            } else {
                this._filterContainer = getDefaultFilterContainer();
            }
            this.errorMessage = null;
        } catch (err) {
            this.errorMessage = 'Failed to load filter presets container.';
            this._filterContainer = getDefaultFilterContainer();
        }
    }

    @api
    get activeFilter() {
        return this._activeFilter || this.filterContainer.activeFilter || getDefaultFilterCriteria();
    }
    set activeFilter(value) {
        this._activeFilter = normalizeFilterCriteria(value);
    }

    get isMissingProject() {
        return !this.projectId;
    }

    get isSaveDisabled() {
        return this.isMissingProject || this.isLoading;
    }

    get isConfirmSaveDisabled() {
        return !this.newPresetName || this.newPresetName.trim() === '';
    }

    get hasPresets() {
        return this.presetList && this.presetList.length > 0;
    }

    get presetList() {
        const container = this.filterContainer;
        const presets = container && Array.isArray(container.presets) ? container.presets : [];
        const activeId = container ? container.activePresetId : null;

        return presets.map(p => {
            const isActive = p.id === activeId;
            return {
                id: p.id,
                name: p.name || 'Unnamed Preset',
                isActive,
                itemClass: `preset-item slds-item ${isActive ? 'is-active' : ''}`,
                criteria: p.criteria
            };
        });
    }

    stopPropagation(event) {
        event.stopPropagation();
    }

    handleOpenSaveModal() {
        this.newPresetName = '';
        this.showSaveModal = true;
    }

    handleCloseSaveModal() {
        this.showSaveModal = false;
        this.newPresetName = '';
    }

    handlePresetNameChange(event) {
        this.newPresetName = event.target.value;
    }

    handleConfirmSavePreset() {
        const name = this.newPresetName ? this.newPresetName.trim() : '';
        if (!name) {
            return;
        }

        if (this.isMissingProject) {
            this.errorMessage = 'Cannot save preset: active project context is required.';
            this.handleCloseSaveModal();
            return;
        }

        try {
            const container = JSON.parse(JSON.stringify(this.filterContainer));
            const newId = `preset-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const currentCriteria = normalizeFilterCriteria(this.activeFilter);

            const newPreset = {
                id: newId,
                name: name,
                projectId: this.projectId,
                criteria: currentCriteria
            };

            const existingPresets = Array.isArray(container.presets) ? container.presets : [];
            const updatedPresets = [...existingPresets, newPreset];

            const updatedContainer = {
                schemaVersion: SCHEMA_VERSION,
                activePresetId: newId,
                activeFilter: currentCriteria,
                presets: updatedPresets
            };

            // Validate capacity boundary before committing
            serializeFilterContainer(updatedContainer);

            this._filterContainer = validateAndNormalizeContainer(updatedContainer, this.projectId);
            this.handleCloseSaveModal();
            this.errorMessage = null;

            this.dispatchContainerChange(this._filterContainer);
            this.dispatchFilterChange(currentCriteria, newId);
        } catch (err) {
            this.errorMessage = 'Error saving preset: ' + (err.message || err);
            this.handleCloseSaveModal();
        }
    }

    handleSelectPreset(event) {
        const targetId = event.currentTarget ? event.currentTarget.dataset.id : null;
        if (!targetId) return;

        const container = this.filterContainer;
        const presets = container.presets || [];
        const selected = presets.find(p => p.id === targetId);

        if (!selected) {
            this.errorMessage = `Selected preset ${targetId} not found.`;
            return;
        }

        if (selected.projectId && this.projectId && selected.projectId !== this.projectId) {
            this.errorMessage = 'Unauthorized: cannot apply preset belonging to another project.';
            return;
        }

        const updatedCriteria = normalizeFilterCriteria(selected.criteria);

        const updatedContainer = {
            ...container,
            schemaVersion: SCHEMA_VERSION,
            activePresetId: selected.id,
            activeFilter: updatedCriteria
        };

        this._filterContainer = updatedContainer;
        this.errorMessage = null;

        this.dispatchContainerChange(updatedContainer);
        this.dispatchFilterChange(updatedCriteria, selected.id);
    }

    handleUpdatePreset(event) {
        event.stopPropagation();
        const targetId = event.target ? event.target.dataset.id : null;
        if (!targetId) return;

        try {
            const container = JSON.parse(JSON.stringify(this.filterContainer));
            const presets = container.presets || [];
            const idx = presets.findIndex(p => p.id === targetId);

            if (idx === -1) {
                this.errorMessage = `Preset ${targetId} not found for update.`;
                return;
            }

            if (presets[idx].projectId && this.projectId && presets[idx].projectId !== this.projectId) {
                this.errorMessage = 'Unauthorized: cannot update preset from another project.';
                return;
            }

            const currentCriteria = normalizeFilterCriteria(this.activeFilter);
            presets[idx].criteria = currentCriteria;

            const updatedContainer = {
                ...container,
                schemaVersion: SCHEMA_VERSION,
                activePresetId: targetId,
                activeFilter: currentCriteria,
                presets
            };

            serializeFilterContainer(updatedContainer);
            this._filterContainer = validateAndNormalizeContainer(updatedContainer, this.projectId);
            this.errorMessage = null;

            this.dispatchContainerChange(this._filterContainer);
            this.dispatchFilterChange(currentCriteria, targetId);
        } catch (err) {
            this.errorMessage = 'Error updating preset: ' + (err.message || err);
        }
    }

    handleDeletePreset(event) {
        event.stopPropagation();
        const targetId = event.target ? event.target.dataset.id : null;
        if (!targetId) return;

        try {
            const container = JSON.parse(JSON.stringify(this.filterContainer));
            const presets = container.presets || [];
            const filtered = presets.filter(p => p.id !== targetId);

            let activeId = container.activePresetId;
            if (activeId === targetId) {
                activeId = null;
            }

            const updatedContainer = {
                ...container,
                schemaVersion: SCHEMA_VERSION,
                activePresetId: activeId,
                presets: filtered
            };

            this._filterContainer = validateAndNormalizeContainer(updatedContainer, this.projectId);
            this.errorMessage = null;

            this.dispatchContainerChange(this._filterContainer);
            if (container.activePresetId === targetId) {
                this.dispatchFilterChange(this._filterContainer.activeFilter, null);
            }
        } catch (err) {
            this.errorMessage = 'Error deleting preset: ' + (err.message || err);
        }
    }

    dispatchFilterChange(criteria, presetId) {
        this.dispatchEvent(new CustomEvent('filterchange', {
            detail: {
                activeFilter: criteria,
                activePresetId: presetId
            },
            bubbles: true,
            composed: true
        }));
    }

    dispatchContainerChange(container) {
        this.dispatchEvent(new CustomEvent('containerchange', {
            detail: {
                container
            },
            bubbles: true,
            composed: true
        }));
    }
}
