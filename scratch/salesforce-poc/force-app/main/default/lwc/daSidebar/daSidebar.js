import { LightningElement, api, track } from 'lwc';
import saveUserPreference from '@salesforce/apex/DAUserPreferenceController.saveUserPreference';

export default class DaSidebar extends LightningElement {
    @api projectId;
    @api selectedNodeId;
    @api nodes = [];

    @track isCollapsed = false;
    @track searchFilter = '';
    @track activeLayers = new Set();
    @track favorites = new Set();

    connectedCallback() {
        // Load default active layers
        this.activeLayers = new Set(['Presentation', 'Business', 'Data', 'Utility']);
    }

    get isExpanded() {
        return !this.isCollapsed;
    }

    get sidebarContainerClass() {
        return `sidebar-container ${this.isCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`;
    }

    get layerFiltersList() {
        const layers = ['Presentation', 'Business', 'Data', 'Utility'];
        const counts = {};
        layers.forEach(l => { counts[l] = 0; });

        if (Array.isArray(this.nodes)) {
            this.nodes.forEach(n => {
                const l = n.layer || 'Utility';
                counts[l] = (counts[l] || 0) + 1;
            });
        }

        return layers.map(name => {
            const isActive = this.activeLayers.has(name);
            return {
                name,
                count: counts[name] || 0,
                isActive,
                badgeClass: `slds-badge layer-badge ${isActive ? 'layer-badge-active' : 'layer-badge-inactive'}`
            };
        });
    }

    get hasFavorites() {
        return this.favoriteNodesList.length > 0;
    }

    get favoriteNodesList() {
        if (!Array.isArray(this.nodes)) return [];
        return this.nodes.filter(n => this.favorites.has(n.id));
    }

    get hasInventory() {
        return this.filteredInventory.length > 0;
    }

    get filteredInventory() {
        if (!Array.isArray(this.nodes)) return [];
        const term = (this.searchFilter || '').toLowerCase().trim();

        return this.nodes
            .filter(n => {
                const matchesLayer = this.activeLayers.size === 0 || this.activeLayers.has(n.layer);
                const matchesSearch = !term ||
                    (n.label && n.label.toLowerCase().includes(term)) ||
                    (n.id && n.id.toLowerCase().includes(term)) ||
                    (n.type && n.type.toLowerCase().includes(term));
                return matchesLayer && matchesSearch;
            })
            .map(n => {
                const isSelected = n.id === this.selectedNodeId;
                const isFav = this.favorites.has(n.id);
                return {
                    id: n.id,
                    label: n.label || n.id,
                    type: n.type || 'Class',
                    layer: n.layer || 'Business',
                    itemClass: `inventory-item ${isSelected ? 'inventory-item-selected' : ''}`,
                    iconName: n.type === 'ApexTrigger' ? 'utility:rules' : 'utility:apex',
                    starIcon: isFav ? 'utility:favorite' : 'utility:favorite_alt'
                };
            });
    }

    handleSidebarCollapse() {
        this.isCollapsed = !this.isCollapsed;
        this.persistSidebarState();
        this.dispatchEvent(new CustomEvent('collapsechange', {
            detail: { isCollapsed: this.isCollapsed },
            bubbles: true,
            composed: true
        }));
    }

    handleSearchChange(event) {
        this.searchFilter = event.target.value;
    }

    handleQuickFilterToggle(event) {
        const layer = event.currentTarget.dataset.layer;
        if (this.activeLayers.has(layer)) {
            this.activeLayers.delete(layer);
        } else {
            this.activeLayers.add(layer);
        }
        this.activeLayers = new Set(this.activeLayers);

        this.dispatchEvent(new CustomEvent('layerfilterchange', {
            detail: { activeLayers: Array.from(this.activeLayers) },
            bubbles: true,
            composed: true
        }));
    }

    handleTreeNodeClick(event) {
        const nodeId = event.currentTarget.dataset.id;
        this.dispatchEvent(new CustomEvent('nodeselect', {
            detail: { nodeId, sourceComponent: 'daSidebar' },
            bubbles: true,
            composed: true
        }));
    }

    handleToggleFavorite(event) {
        event.stopPropagation();
        const nodeId = event.currentTarget.dataset.id;
        if (this.favorites.has(nodeId)) {
            this.favorites.delete(nodeId);
        } else {
            this.favorites.add(nodeId);
        }
        this.favorites = new Set(this.favorites);
    }

    async persistSidebarState() {
        if (!this.projectId) return;
        try {
            await saveUserPreference({
                projectId: this.projectId,
                preferencePayload: JSON.stringify({ sidebarCollapsed: this.isCollapsed })
            });
        } catch (e) {
            // Non-blocking preference persistence error
        }
    }
}
