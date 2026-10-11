import { describe, it, expect, vi } from 'vitest';
import { highlightCycle, clearCycleHighlight } from './graph-interactions';

describe('graph-interactions cycle highlighting', () => {
  it('highlights cycle elements and dims others', () => {
    const mockElements = {
      removeClass: vi.fn().mockReturnThis(),
      addClass: vi.fn().mockReturnThis(),
    };

    const cycleNodes = {
      removeClass: vi.fn().mockReturnThis(),
      addClass: vi.fn().mockReturnThis(),
      length: 2
    };

    const cycleEdges = {
      removeClass: vi.fn().mockReturnThis(),
      addClass: vi.fn().mockReturnThis(),
      length: 1
    };

    const mockCy: any = {
      elements: vi.fn().mockReturnValue(mockElements),
      nodes: vi.fn().mockReturnValue({
        filter: vi.fn().mockReturnValue(cycleNodes)
      }),
      edges: vi.fn().mockReturnValue({
        filter: vi.fn().mockReturnValue(cycleEdges)
      }),
      animate: vi.fn()
    };

    highlightCycle(mockCy, ['nodeA', 'nodeB']);

    expect(mockCy.elements).toHaveBeenCalled();
    expect(mockElements.addClass).toHaveBeenCalledWith('dimmed');
    expect(cycleNodes.removeClass).toHaveBeenCalledWith('dimmed');
    expect(cycleNodes.addClass).toHaveBeenCalledWith('highlighted');
    expect(mockCy.animate).toHaveBeenCalled();
  });

  it('clears cycle highlight', () => {
    const mockElements = {
      removeClass: vi.fn().mockReturnThis()
    };
    const mockCy: any = {
      elements: vi.fn().mockReturnValue(mockElements)
    };

    clearCycleHighlight(mockCy);

    expect(mockElements.removeClass).toHaveBeenCalledWith('dimmed highlighted');
  });
});

describe('graph-interactions zoom and pan runtime helpers', () => {
  it('invokes userZoomingEnabled on cytoscape core', async () => {
    const { setMouseWheelZoom } = await import('./graph-interactions');
    const mockCy: any = {
      userZoomingEnabled: vi.fn(),
    };

    setMouseWheelZoom(mockCy, false);
    expect(mockCy.userZoomingEnabled).toHaveBeenCalledWith(false);

    setMouseWheelZoom(mockCy, true);
    expect(mockCy.userZoomingEnabled).toHaveBeenCalledWith(true);
  });

  it('invokes userPanningEnabled on cytoscape core', async () => {
    const { setPanning } = await import('./graph-interactions');
    const mockCy: any = {
      userPanningEnabled: vi.fn(),
    };

    setPanning(mockCy, false);
    expect(mockCy.userPanningEnabled).toHaveBeenCalledWith(false);

    setPanning(mockCy, true);
    expect(mockCy.userPanningEnabled).toHaveBeenCalledWith(true);
  });
});
