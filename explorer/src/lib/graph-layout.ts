import type { LayoutOptions } from 'cytoscape';

export interface GraphLayoutOptions {
  nodeCount?: number;
  padding?: number;
  animate?: boolean;
  nodeRepulsion?: number | ((node: any) => number);
  idealEdgeLength?: number | ((edge: any) => number);
  gravity?: number;
  animationDuration?: number;
  packComponents?: boolean;
  [key: string]: any;
}

export function getLayoutOptions(options: GraphLayoutOptions = {}): LayoutOptions {
  const { nodeCount = 0, ...rest } = options;
  const density = Math.max(1, Math.sqrt(nodeCount / 20));
  return {
    name: 'fcose',
    padding: 80 * density,
    idealEdgeLength: 120 * density,
    nodeRepulsion: 8000 * density,
    gravity: 0.15,
    animate: nodeCount < 100,
    animationDuration: 500,
    packComponents: true,
    ...rest,
  } as LayoutOptions;
}

export const LAYOUT_PRESETS = {
  stable: {
    animate: false,
    numIter: 1000,
    initialTemp: 200
  },
  animated: {
    animate: true,
    animationDuration: 500,
    numIter: 1000,
    initialTemp: 200
  },
  fast: {
    animate: false,
    numIter: 250,
    initialTemp: 100
  },
  quality: {
    animate: false,
    numIter: 2500,
    initialTemp: 400
  }
};

export function createLayout(cy: cytoscape.Core, options?: GraphLayoutOptions): cytoscape.Layouts {
  const layoutOptions = getLayoutOptions(options);
  return cy.layout(layoutOptions);
}

export function runLayout(cy: cytoscape.Core, options?: GraphLayoutOptions): void {
  const layout = createLayout(cy, options);
  layout.run();
}
