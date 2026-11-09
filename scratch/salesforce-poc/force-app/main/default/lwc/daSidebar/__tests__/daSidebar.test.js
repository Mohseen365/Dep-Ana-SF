import { createElement } from 'lwc';
import DaSidebar from 'c/daSidebar';

describe('c-da-sidebar unit tests', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('initializes with default expanded state', () => {
        const element = createElement('c-da-sidebar', { is: DaSidebar });
        document.body.appendChild(element);

        expect(element.isCollapsed).toBe(false);
        expect(element.isExpanded).toBe(true);
        expect(element.sidebarContainerClass).toContain('sidebar-expanded');
    });

    it('toggles collapse state and emits collapsechange event', () => {
        const element = createElement('c-da-sidebar', { is: DaSidebar });
        document.body.appendChild(element);

        const handler = jest.fn();
        element.addEventListener('collapsechange', handler);

        element.handleSidebarCollapse();
        expect(element.isCollapsed).toBe(true);
        expect(element.isExpanded).toBe(false);
        expect(element.sidebarContainerClass).toContain('sidebar-collapsed');
        expect(handler).toHaveBeenCalled();
        expect(handler.mock.calls[0][0].detail.isCollapsed).toBe(true);
    });

    it('computes layer filter counts from input nodes', () => {
        const element = createElement('c-da-sidebar', { is: DaSidebar });
        element.nodes = [
            { id: '1', label: 'OrderController', layer: 'Presentation', type: 'ApexClass' },
            { id: '2', label: 'OrderService', layer: 'Business', type: 'ApexClass' },
            { id: '3', label: 'OrderTrigger', layer: 'Business', type: 'ApexTrigger' },
            { id: '4', label: 'AccountSelector', layer: 'Data', type: 'ApexClass' }
        ];
        document.body.appendChild(element);

        const layersList = element.layerFiltersList;
        expect(layersList.length).toBe(4);
        const biz = layersList.find(l => l.name === 'Business');
        expect(biz.count).toBe(2);
    });

    it('dispatches nodeselect event when a tree node is clicked', () => {
        const element = createElement('c-da-sidebar', { is: DaSidebar });
        document.body.appendChild(element);

        const handler = jest.fn();
        element.addEventListener('nodeselect', handler);

        element.handleTreeNodeClick({ currentTarget: { dataset: { id: 'node-99' } } });
        expect(handler).toHaveBeenCalled();
        expect(handler.mock.calls[0][0].detail.nodeId).toBe('node-99');
        expect(handler.mock.calls[0][0].detail.sourceComponent).toBe('daSidebar');
    });
});
