import { LightningElement, api, track } from 'lwc';

// Canonical Views registered under CONTRACT-08 and daAppShell
const VIEW_COMMANDS = [
    { id: 'view-graph', title: 'Open Graph Explorer', subtitle: 'Interactive 2D force-directed dependency graph', category: 'Navigation', viewMode: 'graph', icon: '🕸️' },
    { id: 'view-matrix', title: 'Open Dependency Matrix', subtitle: 'DSM adjacency matrix view', category: 'Navigation', viewMode: 'matrix', icon: '▦' },
    { id: 'view-findings', title: 'Open Architecture Findings', subtitle: 'Static analysis violations & circular dependencies', category: 'Navigation', viewMode: 'findings', icon: '⚠️' },
    { id: 'view-dashboard', title: 'Open Project Dashboard', subtitle: 'High-level architectural metrics and health cards', category: 'Navigation', viewMode: 'dashboard', icon: '📊' },
    { id: 'view-history', title: 'Open Analysis History', subtitle: 'Historical snapshots and trend evolution', category: 'Navigation', viewMode: 'history', icon: '⏱️' },
    { id: 'view-diagnostics', title: 'Open Diagnostics View', subtitle: 'Cycle detection, unresolved references, and orphan analysis', category: 'Navigation', viewMode: 'diagnostics', icon: '🩺' },
    { id: 'view-hotspots', title: 'Open Hotspots View', subtitle: 'High-churn, high-risk architectural hotspots', category: 'Navigation', viewMode: 'hotspots', icon: '🔥' },
    { id: 'view-radar', title: 'Open Radar View', subtitle: 'Multi-dimensional architectural score radar', category: 'Navigation', viewMode: 'radar', icon: '🎯' },
    { id: 'view-treemap', title: 'Open Treemap View', subtitle: 'Hierarchical containment and LOC breakdown', category: 'Navigation', viewMode: 'treemap', icon: '🗺️' },
    { id: 'view-subway', title: 'Open Subway View', subtitle: 'Component execution line maps and flows', category: 'Navigation', viewMode: 'subway', icon: '🚇' },
    { id: 'view-dna', title: 'Open Architecture DNA Barcode', subtitle: 'Genome barcode strip visualization', category: 'Navigation', viewMode: 'dna', icon: '🧬' }
];

// Global actions supported in workspace
const ACTION_COMMANDS = [
    { id: 'action-reset-viewport', title: 'Reset Viewport', subtitle: 'Center and fit graph visualization to screen', category: 'Action', action: 'reset-viewport', icon: '🔄' },
    { id: 'action-export-png', title: 'Export Graph PNG', subtitle: 'Download raster screenshot of current graph', category: 'Action', action: 'export-png', icon: '🖼️' },
    { id: 'action-export-svg', title: 'Export Graph SVG', subtitle: 'Download scalable vector graphic of current graph', category: 'Action', action: 'export-svg', icon: '📐' },
    { id: 'action-clear-selection', title: 'Clear Selection', subtitle: 'Deselect currently active component or finding', category: 'Action', action: 'clear-selection', icon: '✕' },
    { id: 'action-compare-snapshots', title: 'Compare Snapshots', subtitle: 'Launch dual snapshot structural diff viewer', category: 'Action', action: 'compare', icon: '⚖️' },
    { id: 'action-refactor-handoff', title: 'Hand Off to Refactor', subtitle: 'Send investigated node to refactoring engine', category: 'Action', action: 'handoff-refactor', icon: '🚀', requiresNode: true }
];

export default class DaCommandPalette extends LightningElement {
    @api isOpen = false;
    @api graphPayload = null;
    @api activeView = 'graph';
    @api selectedNodeId = null;

    @track searchQuery = '';
    @track selectedIndex = 0;

    _boundKeyHandler = null;

    connectedCallback() {
        this._boundKeyHandler = this.handleGlobalKeyDown.bind(this);
        if (typeof window !== 'undefined') {
            window.addEventListener('keydown', this._boundKeyHandler);
        }
    }

    disconnectedCallback() {
        if (typeof window !== 'undefined' && this._boundKeyHandler) {
            window.removeEventListener('keydown', this._boundKeyHandler);
            this._boundKeyHandler = null;
        }
    }

    @api
    open() {
        this.isOpen = true;
        this.searchQuery = '';
        this.selectedIndex = 0;
        this.dispatchEvent(new CustomEvent('open', {
            bubbles: true,
            composed: true
        }));
        // Auto-focus input on next microtask
        setTimeout(() => {
            this.focusInput();
        }, 10);
    }

    @api
    close() {
        if (this.isOpen) {
            this.isOpen = false;
            this.searchQuery = '';
            this.selectedIndex = 0;
            this.dispatchEvent(new CustomEvent('close', {
                bubbles: true,
                composed: true
            }));
        }
    }

    @api
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    focusInput() {
        if (this.template) {
            const input = this.template.querySelector('.command-palette-input');
            if (input && typeof input.focus === 'function') {
                input.focus();
            }
        }
    }

    handleGlobalKeyDown(event) {
        if (!event) return;
        const key = event.key ? event.key.toLowerCase() : '';
        const isModifier = event.metaKey || event.ctrlKey;

        // Toggle on Cmd+K or Ctrl+K
        if (isModifier && key === 'k') {
            event.preventDefault();
            this.toggle();
            return;
        }

        // Close on Escape if open
        if (this.isOpen && (key === 'escape' || key === 'esc')) {
            event.preventDefault();
            this.close();
        }
    }

    handleInputKeyDown(event) {
        if (!event) return;
        const key = event.key;
        const items = this.filteredItems;

        if (key === 'ArrowDown') {
            event.preventDefault();
            if (items.length > 0) {
                this.selectedIndex = (this.selectedIndex + 1) % items.length;
                this.scrollActiveIntoView();
            }
        } else if (key === 'ArrowUp') {
            event.preventDefault();
            if (items.length > 0) {
                this.selectedIndex = (this.selectedIndex - 1 + items.length) % items.length;
                this.scrollActiveIntoView();
            }
        } else if (key === 'Enter') {
            event.preventDefault();
            if (items.length > 0 && this.selectedIndex >= 0 && this.selectedIndex < items.length) {
                this.executeItem(items[this.selectedIndex]);
            }
        } else if (key === 'Escape') {
            event.preventDefault();
            this.close();
        }
    }

    handleSearchInput(event) {
        this.searchQuery = event.target ? event.target.value : '';
        this.selectedIndex = 0;
    }

    handleBackdropClick(event) {
        if (event.target === event.currentTarget) {
            this.close();
        }
    }

    handleContainerClick(event) {
        // Prevent dismissal when clicking inside modal container
        event.stopPropagation();
    }

    handleItemClick(event) {
        const id = event.currentTarget ? event.currentTarget.dataset.id : null;
        if (!id) return;
        const item = this.filteredItems.find(i => i.id === id);
        if (item) {
            this.executeItem(item);
        }
    }

    handleItemMouseEnter(event) {
        const id = event.currentTarget ? event.currentTarget.dataset.id : null;
        if (!id) return;
        const idx = this.filteredItems.findIndex(i => i.id === id);
        if (idx >= 0) {
            this.selectedIndex = idx;
        }
    }

    executeItem(item) {
        if (!item || item.disabled) return;

        if (item.kind === 'navigation') {
            // Navigation command MUST NOT select nodes (Preserve SELECTION != NAVIGATION)
            this.dispatchEvent(new CustomEvent('viewchange', {
                detail: {
                    viewMode: item.viewMode,
                    source: 'commandPalette'
                },
                bubbles: true,
                composed: true
            }));
            this.close();
        } else if (item.kind === 'action') {
            this.dispatchEvent(new CustomEvent('action', {
                detail: {
                    action: item.action,
                    source: 'commandPalette'
                },
                bubbles: true,
                composed: true
            }));
            this.close();
        } else if (item.kind === 'node') {
            // Node selection command MUST NOT alter active view mode (Preserve SELECTION != NAVIGATION)
            this.dispatchEvent(new CustomEvent('nodeselect', {
                detail: {
                    nodeId: item.nodeId,
                    node: item.node,
                    sourceView: 'commandPalette'
                },
                bubbles: true,
                composed: true
            }));
            this.close();
        }
    }

    scrollActiveIntoView() {
        if (this.template) {
            const activeEl = this.template.querySelector('.command-palette-item.selected');
            if (activeEl && typeof activeEl.scrollIntoView === 'function') {
                activeEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
        }
    }

    get hasResults() {
        return this.filteredItems.length > 0;
    }

    get filteredItems() {
        const query = (this.searchQuery || '').trim().toLowerCase();
        const results = [];

        // 1. Navigation Commands
        for (const nav of VIEW_COMMANDS) {
            if (!query || nav.title.toLowerCase().includes(query) || nav.subtitle.toLowerCase().includes(query) || nav.viewMode.toLowerCase().includes(query)) {
                results.push({
                    id: nav.id,
                    title: nav.title,
                    subtitle: nav.subtitle,
                    icon: nav.icon,
                    kind: 'navigation',
                    viewMode: nav.viewMode,
                    badge: 'VIEW',
                    badgeClass: 'command-palette-badge badge-navigation',
                    disabled: false,
                    testId: `command-palette-item-${nav.id}`
                });
            }
        }

        // 2. Action Commands
        for (const act of ACTION_COMMANDS) {
            const disabled = act.requiresNode && !this.selectedNodeId;
            const subtitle = disabled ? `${act.subtitle} (requires selected node)` : act.subtitle;
            if (!query || act.title.toLowerCase().includes(query) || act.subtitle.toLowerCase().includes(query) || act.action.toLowerCase().includes(query)) {
                results.push({
                    id: act.id,
                    title: act.title,
                    subtitle: subtitle,
                    icon: act.icon,
                    kind: 'action',
                    action: act.action,
                    badge: 'ACTION',
                    badgeClass: 'command-palette-badge badge-action',
                    disabled: disabled,
                    testId: `command-palette-item-${act.id}`
                });
            }
        }

        // 3. Node / Component Search from graphPayload
        if (this.graphPayload && Array.isArray(this.graphPayload.nodes)) {
            const nodes = this.graphPayload.nodes;
            let nodeMatches = 0;
            const maxNodeMatches = query ? 25 : 10;

            for (const n of nodes) {
                if (nodeMatches >= maxNodeMatches) break;
                const id = n.id || '';
                const label = n.displayName || n.label || id;
                const type = n.type || 'Component';
                const file = n.file || '';
                const layer = n.layer || '';
                const risk = (n.risk || 'LOW').toUpperCase();

                const isMatch = !query ||
                    label.toLowerCase().includes(query) ||
                    id.toLowerCase().includes(query) ||
                    type.toLowerCase().includes(query) ||
                    file.toLowerCase().includes(query) ||
                    layer.toLowerCase().includes(query);

                if (isMatch) {
                    const badgeClass = `command-palette-badge badge-risk-${risk.toLowerCase()}`;
                    results.push({
                        id: `node-${id}`,
                        title: label,
                        subtitle: file || `${type} • ${layer || 'Unassigned'}`,
                        icon: '📦',
                        kind: 'node',
                        nodeId: id,
                        node: n,
                        badge: risk,
                        badgeClass: badgeClass,
                        disabled: false,
                        testId: `command-palette-item-node-${id}`
                    });
                    nodeMatches++;
                }
            }
        }

        // Map selection state & CSS classes
        return results.map((item, index) => {
            const isSelected = index === this.selectedIndex;
            let cssClass = 'command-palette-item';
            if (isSelected) cssClass += ' selected';
            if (item.disabled) cssClass += ' disabled';

            return {
                ...item,
                isSelected,
                cssClass
            };
        });
    }
}
