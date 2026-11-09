import { createElement } from 'lwc';
import DaHeader from 'c/daHeader';

describe('c-da-header unit tests', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('initializes and renders project context and view status', async () => {
        const element = createElement('c-da-header', { is: DaHeader });
        element.projectId = 'a001234567890ABC';
        element.projectKey = 'CST_PROJ';
        element.projectName = 'Cloud Spend Tracker';
        element.activeView = 'graph';
        document.body.appendChild(element);

        await Promise.resolve();

        expect(element.displayProjectKey).toBe('CST_PROJ');
        expect(element.projectLabel).toBe('Cloud Spend Tracker');
        expect(element.activeViewLabel).toBe('Graph Viewer');
        expect(element.isActionDisabled).toBe(false);
        expect(element.statusText).toBe('Ready');
    });

    it('formats view labels accurately for different modes', () => {
        const element = createElement('c-da-header', { is: DaHeader });
        element.activeView = 'matrix';
        expect(element.activeViewLabel).toBe('Dependency Matrix');

        element.activeView = 'findings';
        expect(element.activeViewLabel).toBe('Findings & Alerts');
    });

    it('dispatches globalsearch event with query detail', () => {
        const element = createElement('c-da-header', { is: DaHeader });
        document.body.appendChild(element);

        const handler = jest.fn();
        element.addEventListener('globalsearch', handler);

        element.handleGlobalSearch({ target: { value: 'PaymentService' } });
        expect(element.searchQuery).toBe('PaymentService');
        expect(handler).toHaveBeenCalled();
        expect(handler.mock.calls[0][0].detail.query).toBe('PaymentService');
    });

    it('dispatches actiontrigger event on action click', () => {
        const element = createElement('c-da-header', { is: DaHeader });
        document.body.appendChild(element);

        const handler = jest.fn();
        element.addEventListener('actiontrigger', handler);

        element.handleActionTrigger({ currentTarget: { dataset: { action: 'compare' } } });
        expect(handler).toHaveBeenCalled();
        expect(handler.mock.calls[0][0].detail.action).toBe('compare');
    });

    it('dispatches keyboard shortcut actiontrigger event', () => {
        const element = createElement('c-da-header', { is: DaHeader });
        document.body.appendChild(element);

        const handler = jest.fn();
        element.addEventListener('actiontrigger', handler);

        element.handleKeyboardShortcutClick();
        expect(handler).toHaveBeenCalled();
        expect(handler.mock.calls[0][0].detail.action).toBe('shortcuts');
    });
});
