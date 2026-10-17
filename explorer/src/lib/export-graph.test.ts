import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportGraphAsPNG, exportGraphAsSVG, generateExportFilename } from './export-graph';

describe('export-graph (F6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates sanitized filename with architecture mode and timestamp', () => {
    const filename = generateExportFilename('hierarchical', 'png', 1700000000000);
    expect(filename).toBe('architecture-hierarchical-1700000000000.png');
  });

  it('invokes cy.png with correct scale and background options', () => {
    const pngDataUrl = 'data:image/png;base64,mockData';
    const mockCy: any = {
      png: vi.fn().mockReturnValue(pngDataUrl),
    };

    const linkClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const result = exportGraphAsPNG(mockCy, { architectureMode: 'hybrid', scale: 2 });

    expect(mockCy.png).toHaveBeenCalledWith({ full: true, scale: 2, bg: '#0f172a' });
    expect(result).toBe(pngDataUrl);
    expect(linkClickSpy).toHaveBeenCalled();
  });

  it('handles cy.svg fallback when svg plugin is not installed', () => {
    const mockCy: any = {
      png: vi.fn().mockReturnValue('data:image/png;base64,mockData'),
    };

    const result = exportGraphAsSVG(mockCy, { architectureMode: 'orbit' });

    expect(result).toBeNull(); // Gracefully returns null without throwing
  });
});
