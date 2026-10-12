import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import {
  computeArchitectureLayoutWithMetadata,
  type ArchitectureLayoutOptions,
  type ArchitectureLayoutResultWithMetadata,
  type FeatureRegion,
} from '../architecture-layout';
import type {
  LayoutWorkerRequest,
  LayoutWorkerResponse,
  FeatureRegionSummary,
} from './layout-worker-types';

export interface LayoutWorkerClientOptions {
  /** Optional custom worker factory (useful for testing or custom worker instantiation) */
  workerFactory?: () => Worker;
  /** Optional logger function for diagnostics */
  logger?: (message: string) => void;
}

export interface CalculateLayoutAsyncParams {
  projectId: string;
  correlationToken?: string;
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  options?: ArchitectureLayoutOptions;
  /** Level 1 active user drag positions */
  userDragPositions?: Record<string, { x: number; y: number }>;
  /** Level 2 persisted project positions */
  persistedPositions?: Record<string, { x: number; y: number }>;
  /** Level 3 existing canvas positions */
  existingCanvasPositions?: Record<string, { x: number; y: number }>;
}

export interface CalculateLayoutAsyncResult extends ArchitectureLayoutResultWithMetadata {
  requestGeneration: number;
  projectId: string;
  correlationToken?: string;
  isOffloaded: boolean;
  computeDurationMs: number;
  ipcDurationMs: number;
  totalDurationMs: number;
}

export class LayoutWorkerClient {
  private worker: Worker | null = null;
  private currentProjectId: string | null = null;
  private latestRequestGeneration = 0;
  private activePendingPromiseReject: ((reason?: any) => void) | null = null;
  private workerFactory?: () => Worker;
  private logger?: (message: string) => void;

  constructor(options?: LayoutWorkerClientOptions) {
    this.workerFactory = options?.workerFactory;
    this.logger = options?.logger;
  }

  /**
   * Sets the current active project ID and resets request generation if project changes.
   * Discards any pending requests for prior projects.
   */
  public setProject(projectId: string): void {
    if (this.currentProjectId !== projectId) {
      this.cancelPendingRequest(`Project changed from ${this.currentProjectId} to ${projectId}`);
      this.currentProjectId = projectId;
      this.latestRequestGeneration = 0;
    }
  }

  public getCurrentProjectId(): string | null {
    return this.currentProjectId;
  }

  public getLatestRequestGeneration(): number {
    return this.latestRequestGeneration;
  }

  /**
   * Cancels any active pending worker computation physically and logically.
   */
  public cancelPendingRequest(reason = 'Request cancelled'): void {
    if (this.activePendingPromiseReject) {
      const reject = this.activePendingPromiseReject;
      this.activePendingPromiseReject = null;
      reject(new Error(reason));
    }
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch (err) {
        // Ignore termination errors
      }
      this.worker = null;
    }
  }

  /**
   * Disposes of worker resources.
   */
  public terminate(): void {
    this.cancelPendingRequest('Client terminated');
  }

  /**
   * Ensures worker instance is initialized and ready.
   */
  private getOrInitWorker(): Worker | null {
    if (this.worker) return this.worker;

    try {
      if (this.workerFactory) {
        this.worker = this.workerFactory();
      } else if (typeof Worker !== 'undefined') {
        // Vite standard worker URL pattern
        this.worker = new Worker(new URL('./layout.worker.ts', import.meta.url), {
          type: 'module',
        });
      }
    } catch (err) {
      if (this.logger) {
        this.logger(`Worker initialization failed: ${err}`);
      }
      this.worker = null;
    }

    return this.worker;
  }

  /**
   * Offloads layout computation to Web Worker asynchronously with fallback to synchronous execution.
   */
  public async calculateLayoutAsync(
    params: CalculateLayoutAsyncParams
  ): Promise<CalculateLayoutAsyncResult> {
    const {
      projectId,
      correlationToken,
      nodes,
      edges,
      options = {},
      userDragPositions = {},
      persistedPositions = {},
      existingCanvasPositions = {},
    } = params;

    const tStart = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // 1. Project & Generation Update
    this.setProject(projectId);
    const requestGen = ++this.latestRequestGeneration;

    // 2. Combine Level 1-3 Position Authority inputs for options.existingPositions if needed
    const combinedExistingPositions: Record<string, { x: number; y: number }> = {
      ...options.existingPositions,
      ...existingCanvasPositions,
      ...persistedPositions,
      ...userDragPositions,
    };

    const workerOptions: ArchitectureLayoutOptions = {
      ...options,
      existingPositions: combinedExistingPositions,
    };

    const nodeIds = nodes.map(n => n.id);

    const worker = this.getOrInitWorker();

    if (!worker) {
      // Fallback: Synchronous execution on main thread
      if (this.logger) {
        this.logger(`Worker unavailable. Executing synchronous layout fallback for generation ${requestGen}.`);
      }
      const syncResult = computeArchitectureLayoutWithMetadata(nodes, edges, workerOptions);
      const finalPositions = this.applyPositionAuthority({
        calculatedPositions: syncResult.positions,
        userDragPositions,
        persistedPositions,
        existingCanvasPositions,
        nodeIds,
      });

      const tEnd = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const totalDurationMs = tEnd - tStart;

      return {
        positions: finalPositions,
        featureRegions: syncResult.featureRegions,
        orbitGuides: syncResult.orbitGuides,
        projectedNodeIds: syncResult.projectedNodeIds,
        requestGeneration: requestGen,
        projectId,
        correlationToken,
        isOffloaded: false,
        computeDurationMs: totalDurationMs,
        ipcDurationMs: 0,
        totalDurationMs,
      };
    }

    // Cancel prior pending worker request before issuing new request
    if (this.activePendingPromiseReject) {
      const priorReject = this.activePendingPromiseReject;
      this.activePendingPromiseReject = null;
      priorReject(new Error(`Superceded by request generation ${requestGen}`));
    }

    return new Promise<CalculateLayoutAsyncResult>((resolve, reject) => {
      this.activePendingPromiseReject = reject;

      const messageHandler = (event: MessageEvent<LayoutWorkerResponse>) => {
        const response = event.data;
        if (!response) return;

        // Validation 1: Request Generation match
        if (response.requestGeneration !== requestGen) {
          if (this.logger) {
            this.logger(`Discarded stale worker response generation ${response.requestGeneration} (latest is ${requestGen})`);
          }
          return;
        }

        // Validation 2: Project ID match
        if (response.projectId !== this.currentProjectId) {
          if (this.logger) {
            this.logger(`Discarded cross-project worker response for project ${response.projectId} (current is ${this.currentProjectId})`);
          }
          return;
        }

        // Cleanup listener and active pending reject
        worker.removeEventListener('message', messageHandler as any);
        worker.removeEventListener('error', errorHandler as any);
        this.activePendingPromiseReject = null;

        const tEnd = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const totalDurationMs = tEnd - tStart;

        if (response.type === 'LAYOUT_ERROR') {
          if (this.logger) {
            this.logger(`Worker calculation failed with error: ${response.error}. Invoking synchronous fallback.`);
          }
          // Fallback to synchronous calculation on worker error
          const syncResult = computeArchitectureLayoutWithMetadata(nodes, edges, workerOptions);
          const finalPositions = this.applyPositionAuthority({
            calculatedPositions: syncResult.positions,
            userDragPositions,
            persistedPositions,
            existingCanvasPositions,
            nodeIds,
          });

          return resolve({
            positions: finalPositions,
            featureRegions: syncResult.featureRegions,
            orbitGuides: syncResult.orbitGuides,
            projectedNodeIds: syncResult.projectedNodeIds,
            requestGeneration: requestGen,
            projectId,
            correlationToken: response.correlationToken ?? correlationToken,
            isOffloaded: false,
            computeDurationMs: totalDurationMs,
            ipcDurationMs: 0,
            totalDurationMs,
          });
        }

        // Success Path
        const ipcDurationMs = Math.max(0, totalDurationMs - response.computeDurationMs);

        // Convert featureRegionsSummary back to Map<string, FeatureRegion>
        let featureRegions: Map<string, FeatureRegion> | undefined;
        if (response.featureRegionsSummary && response.featureRegionsSummary.length > 0) {
          featureRegions = new Map<string, FeatureRegion>();
          response.featureRegionsSummary.forEach(sum => {
            const width = sum.xMax - sum.xMin;
            const height = sum.yMax - sum.yMin;
            const featureRegionObj: FeatureRegion = {
              id: sum.id,
              featureId: sum.id,
              domain: sum.id,
              domainId: sum.domainId,
              xMin: sum.xMin,
              xMax: sum.xMax,
              yMin: sum.yMin,
              yMax: sum.yMax,
              xCenter: sum.xCenter,
              yCenter: sum.yCenter,
              width,
              height,
              nodeCount: sum.nodeCount ?? 0,
              primaryNodeCount: sum.primaryNodeCount ?? 0,
              primaryLayer: sum.primaryLayer || 'application',
              orderIndex: sum.orderIndex ?? 0,
            };
            featureRegions!.set(sum.id, featureRegionObj);
          });
        }

        // Enforce Level 1-5 Position Authority Precedence
        const finalPositions = this.applyPositionAuthority({
          calculatedPositions: response.positions,
          userDragPositions,
          persistedPositions,
          existingCanvasPositions,
          nodeIds,
        });

        resolve({
          positions: finalPositions,
          featureRegions,
          orbitGuides: response.orbitGuides,
          projectedNodeIds: response.projectedNodeIds ? new Set(response.projectedNodeIds) : undefined,
          requestGeneration: requestGen,
          projectId,
          correlationToken: response.correlationToken ?? correlationToken,
          isOffloaded: true,
          computeDurationMs: response.computeDurationMs,
          ipcDurationMs,
          totalDurationMs,
        });
      };

      const errorHandler = (err: ErrorEvent) => {
        worker.removeEventListener('message', messageHandler as any);
        worker.removeEventListener('error', errorHandler as any);
        this.activePendingPromiseReject = null;

        if (this.logger) {
          this.logger(`Worker runtime error: ${err.message}. Invoking synchronous fallback.`);
        }

        // Fallback to synchronous calculation on unhandled worker error
        const syncResult = computeArchitectureLayoutWithMetadata(nodes, edges, workerOptions);
        const finalPositions = this.applyPositionAuthority({
          calculatedPositions: syncResult.positions,
          userDragPositions,
          persistedPositions,
          existingCanvasPositions,
          nodeIds,
        });

        const tEnd = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const totalDurationMs = tEnd - tStart;

        resolve({
          positions: finalPositions,
          featureRegions: syncResult.featureRegions,
          orbitGuides: syncResult.orbitGuides,
          projectedNodeIds: syncResult.projectedNodeIds,
          requestGeneration: requestGen,
          projectId,
          correlationToken,
          isOffloaded: false,
          computeDurationMs: totalDurationMs,
          ipcDurationMs: 0,
          totalDurationMs,
        });
      };

      worker.addEventListener('message', messageHandler as any);
      worker.addEventListener('error', errorHandler as any);

      const requestPayload: LayoutWorkerRequest = {
        type: 'CALCULATE_LAYOUT',
        projectId,
        requestGeneration: requestGen,
        correlationToken,
        nodes,
        edges,
        options: workerOptions,
      };

      try {
        worker.postMessage(requestPayload);
      } catch (postErr: any) {
        worker.removeEventListener('message', messageHandler as any);
        worker.removeEventListener('error', errorHandler as any);
        this.activePendingPromiseReject = null;

        if (this.logger) {
          this.logger(`worker.postMessage failed: ${postErr}. Invoking synchronous fallback.`);
        }

        const syncResult = computeArchitectureLayoutWithMetadata(nodes, edges, workerOptions);
        const finalPositions = this.applyPositionAuthority({
          calculatedPositions: syncResult.positions,
          userDragPositions,
          persistedPositions,
          existingCanvasPositions,
          nodeIds,
        });

        const tEnd = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const totalDurationMs = tEnd - tStart;

        resolve({
          positions: finalPositions,
          featureRegions: syncResult.featureRegions,
          orbitGuides: syncResult.orbitGuides,
          projectedNodeIds: syncResult.projectedNodeIds,
          requestGeneration: requestGen,
          projectId,
          correlationToken,
          isOffloaded: false,
          computeDurationMs: totalDurationMs,
          ipcDurationMs: 0,
          totalDurationMs,
        });
      }
    });
  }

  /**
   * Applies Level 1-5 Position Authority Precedence:
   * Level 1: User Drag
   * Level 2: Persisted Project Position
   * Level 3: Existing Canvas Position
   * Level 4: Calculated Worker Layout Output
   * Level 5: Fallback default position { x: 0, y: 0 }
   */
  public applyPositionAuthority(params: {
    calculatedPositions: Record<string, { x: number; y: number }>;
    userDragPositions?: Record<string, { x: number; y: number }>;
    persistedPositions?: Record<string, { x: number; y: number }>;
    existingCanvasPositions?: Record<string, { x: number; y: number }>;
    nodeIds?: string[];
  }): Record<string, { x: number; y: number }> {
    const {
      calculatedPositions,
      userDragPositions = {},
      persistedPositions = {},
      existingCanvasPositions = {},
      nodeIds = [],
    } = params;

    const result: Record<string, { x: number; y: number }> = {};

    // Get all node IDs from calculated positions, existing authority levels, and requested nodeIds
    const allNodeIds = new Set<string>([
      ...nodeIds,
      ...Object.keys(calculatedPositions),
      ...Object.keys(userDragPositions),
      ...Object.keys(persistedPositions),
      ...Object.keys(existingCanvasPositions),
    ]);

    for (const id of allNodeIds) {
      if (userDragPositions[id]) {
        // Level 1: User Drag
        result[id] = { ...userDragPositions[id] };
      } else if (persistedPositions[id]) {
        // Level 2: Persisted Position
        result[id] = { ...persistedPositions[id] };
      } else if (existingCanvasPositions[id]) {
        // Level 3: Existing Canvas Position
        result[id] = { ...existingCanvasPositions[id] };
      } else if (calculatedPositions[id]) {
        // Level 4: Calculated Layout
        result[id] = { ...calculatedPositions[id] };
      } else {
        // Level 5: Fallback Default Position
        result[id] = { x: 0, y: 0 };
      }
    }

    return result;
  }
}
