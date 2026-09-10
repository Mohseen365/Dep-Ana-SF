import type { LayoutOptions } from 'cytoscape';

export interface GraphLayoutOptions {
  padding?: number;
  animate?: boolean;
  nodeRepulsion?: number | ((node: any) => number);
  nodeOverlap?: number;
  idealEdgeLength?: number | ((edge: any) => number);
  edgeElasticity?: number | ((edge: any) => number);
  nestingFactor?: number;
  gravity?: number;
  numIter?: number;
  initialTemp?: number;
  coolingFactor?: number;
  minTemp?: number;
  nodeCount?: number;
}

export function getLayoutOptions(options: GraphLayoutOptions = {}): LayoutOptions {
  const {
    padding = 50,
    animate = false,
    nodeRepulsion = 4500,
    nodeOverlap = 10,
    idealEdgeLength = 100,
    edgeElasticity = 100,
    nestingFactor = 5,
    gravity = 80,
    numIter = options.nodeCount && options.nodeCount > 200 ? 300 : 1000,
    initialTemp = options.nodeCount && options.nodeCount > 200 ? 100 : 200,
    coolingFactor = 0.95,
    minTemp = 1.0
  } = options;

  return {
    name: 'cose',
    padding: padding,
    animate: animate,
    animationDuration: 500,
    nodeRepulsion: nodeRepulsion,
    nodeOverlap: nodeOverlap,
    idealEdgeLength: idealEdgeLength,
    edgeElasticity: edgeElasticity,
    nestingFactor: nestingFactor,
    gravity: gravity,
    numIter: numIter,
    initialTemp: initialTemp,
    coolingFactor: coolingFactor,
    minTemp: minTemp,
    randomize: true,
    fit: true
  };
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
