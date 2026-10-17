import type cytoscape from 'cytoscape';

export interface ExportGraphOptions {
  architectureMode?: string;
  bg?: string;
  scale?: number;
  full?: boolean;
}

export function generateExportFilename(
  architectureMode: string = 'hierarchical',
  extension: 'png' | 'svg' = 'png',
  timestamp: number = Date.now()
): string {
  const sanitizedMode = architectureMode.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return `architecture-${sanitizedMode}-${timestamp}.${extension}`;
}

export function exportGraphAsPNG(
  cy: cytoscape.Core,
  options: ExportGraphOptions = {}
): string | null {
  if (!cy || typeof cy.png !== 'function') {
    return null;
  }

  const {
    architectureMode = 'hierarchical',
    bg = '#0f172a',
    scale = 2,
    full = true,
  } = options;

  try {
    const pngDataUrl = cy.png({
      full,
      scale,
      bg,
    });

    const filename = generateExportFilename(architectureMode, 'png');

    if (typeof document !== 'undefined' && document.createElement) {
      const link = document.createElement('a');
      link.href = pngDataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    return pngDataUrl;
  } catch (err) {
    console.error('[ExportGraph] Failed to export PNG:', err);
    return null;
  }
}

export function exportGraphAsSVG(
  cy: cytoscape.Core & { svg?: (options?: any) => string },
  options: ExportGraphOptions = {}
): string | null {
  if (!cy) return null;

  const {
    architectureMode = 'hierarchical',
    bg = '#0f172a',
    full = true,
  } = options;

  if (typeof cy.svg !== 'function') {
    console.warn('[ExportGraph] SVG export is unavailable in current Cytoscape build. Use PNG export instead.');
    return null;
  }

  try {
    const svgData = cy.svg({ full, bg });
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const filename = generateExportFilename(architectureMode, 'svg');

    if (typeof document !== 'undefined' && document.createElement) {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }

    return svgData;
  } catch (err) {
    console.error('[ExportGraph] Failed to export SVG:', err);
    return null;
  }
}
