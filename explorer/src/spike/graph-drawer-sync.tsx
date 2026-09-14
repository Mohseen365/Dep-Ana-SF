import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';

/**
 * Spike 1: Graph↔Drawer Sync & BroadcastChannel Detached Window.
 * Validates smooth CSS grid transition (100% -> 60%), cy.resize() sync,
 * FPS measurement during transition, and BroadcastChannel event emission.
 */
export function GraphDrawerSyncSpike() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [fps, setFps] = useState<number | null>(null);
  const [fpsLogs, setFpsLogs] = useState<number[]>([]);
  const [detachedWindowRef, setDetachedWindowRef] = useState<Window | null>(null);

  // Initialize BroadcastChannel
  useEffect(() => {
    const channel = new BroadcastChannel('explorer-detached-sync');
    channelRef.current = channel;

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, []);

  // Initialize Cytoscape graph
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [
        { data: { id: 'nodeA', label: 'OrderController' } },
        { data: { id: 'nodeB', label: 'CartService' } },
        { data: { id: 'nodeC', label: 'PaymentGateway' } },
        { data: { id: 'nodeD', label: 'InventoryManager' } },
        { data: { id: 'edge1', source: 'nodeA', target: 'nodeB' } },
        { data: { id: 'edge2', source: 'nodeB', target: 'nodeC' } },
        { data: { id: 'edge3', source: 'nodeA', target: 'nodeD' } },
      ],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#3b82f6',
            label: 'data(label)',
            color: '#f8fafc',
            'font-size': '12px',
            'text-valign': 'center',
            'text-halign': 'center',
            width: 40,
            height: 40,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'background-color': '#f59e0b',
            'border-width': 2,
            'border-color': '#ffffff',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#64748b',
            'target-arrow-color': '#64748b',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
          },
        },
      ],
      layout: {
        name: 'grid',
        cols: 2,
      },
    });

    cyRef.current = cy;

    // Node click handler -> update selection & broadcast via BroadcastChannel
    cy.on('tap', 'node', (evt) => {
      const nodeId = evt.target.id();
      setSelectedNodeId(nodeId);

      if (channelRef.current) {
        channelRef.current.postMessage({
          type: 'NODE_SELECTED',
          nodeId,
          timestamp: Date.now(),
        });
      }
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, []);

  // Measure FPS and call cy.resize() during transition
  const handleToggleDrawer = () => {
    const nextState = !isDrawerOpen;
    setIsDrawerOpen(nextState);

    let startTime: number | null = null;
    let frameCount = 0;
    const transitionDurationMs = 350; // CSS transition time

    const measureAndResize = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      frameCount++;

      // Resize cytoscape canvas continuously during transition frame
      if (cyRef.current) {
        cyRef.current.resize();
      }

      if (elapsed < transitionDurationMs) {
        requestAnimationFrame(measureAndResize);
      } else {
        // Transition complete
        const measuredFps = Math.round((frameCount / (elapsed / 1000)));
        setFps(measuredFps);
        setFpsLogs((prev) => [...prev, measuredFps]);
        if (cyRef.current) {
          cyRef.current.resize();
        }
      }
    };

    requestAnimationFrame(measureAndResize);
  };

  // Open detached window spike
  const handleOpenDetachedWindow = () => {
    const win = window.open(
      '/src/spike/detached-window.html',
      'DetachedDrawerSpike',
      'width=450,height=600,resizable=yes'
    );
    setDetachedWindowRef(win);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#090d16', color: '#f8fafc' }}>
      {/* Controls Bar */}
      <div style={{ height: '50px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid #334155', backgroundColor: '#111827' }}>
        <button
          onClick={handleToggleDrawer}
          style={{ padding: '6px 12px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
        >
          {isDrawerOpen ? 'Close Drawer (100%)' : 'Open Drawer (60%)'}
        </button>

        <button
          onClick={handleOpenDetachedWindow}
          style={{ padding: '6px 12px', backgroundColor: '#1e293b', color: '#38bdf8', border: '1px solid #38bdf8', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
        >
          Open Detached Window
        </button>

        <div style={{ fontSize: '13px' }}>
          Transition FPS: <strong style={{ color: fps !== null && fps >= 55 ? '#10b981' : '#f59e0b' }}>{fps !== null ? `${fps} FPS` : 'Not tested yet'}</strong>
        </div>

        <div style={{ fontSize: '13px', marginLeft: 'auto' }}>
          Selected Node: <strong>{selectedNodeId || 'None (click a node)'}</strong>
        </div>
      </div>

      {/* Grid Layout Container */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: isDrawerOpen ? '60% 40%' : '100% 0%',
          transition: 'grid-template-columns 300ms ease-in-out',
          overflow: 'hidden',
        }}
        onTransitionEnd={() => {
          if (cyRef.current) cyRef.current.resize();
        }}
      >
        {/* Graph Pane */}
        <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#060911' }}>
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Drawer Pane */}
        <div
          style={{
            height: '100%',
            backgroundColor: '#111827',
            borderLeft: '1px solid #334155',
            padding: '16px',
            overflowY: 'auto',
          }}
        >
          <h3>Investigation Drawer Spike</h3>
          <p style={{ marginTop: '8px', color: '#94a3b8', fontSize: '13px' }}>
            When open, the left graph pane resizes smoothly from 100% to 60%.
          </p>

          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#1e293b', borderRadius: '6px' }}>
            <h4>FPS Transition Log:</h4>
            {fpsLogs.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Click toggle button above to measure transition FPS.</p>
            ) : (
              <ul style={{ marginTop: '8px', fontSize: '12px', paddingLeft: '18px' }}>
                {fpsLogs.map((log, index) => (
                  <li key={index}>Run #{index + 1}: {log} FPS</li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#1e293b', borderRadius: '6px' }}>
            <h4>Detached Window Status:</h4>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>
              {detachedWindowRef && !detachedWindowRef.closed ? 'Window open & listening' : 'Window closed / not opened'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GraphDrawerSyncSpike;
