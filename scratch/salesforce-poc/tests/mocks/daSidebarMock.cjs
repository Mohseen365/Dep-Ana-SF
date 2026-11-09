class DaSidebar {
    constructor() {
        this.projectId = null;
        this.selectedNodeId = null;
        this.nodes = [];
        this.isCollapsed = false;
        this.searchFilter = '';
        this.activeLayers = new Set();
        this.favorites = new Set();
    }

    connectedCallback() {
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
        return layers.map(name => ({
            name,
            count: counts[name] || 0,
            isActive: this.activeLayers.has(name)
        }));
    }

    get filteredInventory() {
        if (!Array.isArray(this.nodes)) return [];
        const term = (this.searchFilter || '').toLowerCase().trim();
        return this.nodes
            .filter(n => {
                const matchesLayer = this.activeLayers.size === 0 || this.activeLayers.has(n.layer);
                const matchesSearch = !term || (n.label && n.label.toLowerCase().includes(term));
                return matchesLayer && matchesSearch;
            })
            .map(n => ({
                id: n.id,
                label: n.label || n.id,
                type: n.type || 'Class',
                layer: n.layer || 'Business'
            }));
    }

    handleSidebarCollapse() {
        this.isCollapsed = !this.isCollapsed;
        this.dispatchEvent({
            type: 'collapsechange',
            detail: { isCollapsed: this.isCollapsed },
            bubbles: true,
            composed: true
        });
    }

    handleSearchChange(event) {
        this.searchFilter = event.target.value;
    }

    handleTreeNodeClick(event) {
        const nodeId = event.currentTarget.dataset.id;
        this.dispatchEvent({
            type: 'nodeselect',
            detail: { nodeId, sourceComponent: 'daSidebar' },
            bubbles: true,
            composed: true
        });
    }
}
module.exports = DaSidebar;
