import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { InvestigationDrawer } from './components/InvestigationDrawer';
import type { ExplorerDataSchema, ExplorerNode } from './types/explorer';
import { CHANNEL_NAME } from './lib/detached-drawer';

function DetachedApp() {
  const [data, setData] = useState<ExplorerDataSchema | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [drillPath, setDrillPath] = useState<string[]>([]);

  useEffect(() => {
    fetch('/explorer-data.json')
      .then((res) => res.json())
      .then((jsonData: ExplorerDataSchema) => {
        setData(jsonData);
      })
      .catch((err) => {
        console.error('Failed to load explorer data in detached drawer:', err);
      });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;

    const channel = new BroadcastChannel(CHANNEL_NAME);

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'node-changed' && typeof event.data.nodeId === 'string') {
        const targetId = event.data.nodeId;
        setCurrentNodeId(targetId);
        setDrillPath((prev) => {
          if (prev.length > 0 && prev[prev.length - 1] === targetId) return prev;
          return [targetId];
        });
      }
    };

    channel.addEventListener('message', handleMessage);

    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, []);

  const handleDrill = (nodeId: string) => {
    setCurrentNodeId(nodeId);
    setDrillPath((prev) => [...prev, nodeId]);

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage({ type: 'drill', nodeId });
      channel.close();
    }
  };

  const handleNavigateBreadcrumb = (targetId: string) => {
    setCurrentNodeId(targetId);
    setDrillPath((prev) => {
      const idx = prev.indexOf(targetId);
      if (idx !== -1) return prev.slice(0, idx + 1);
      return [targetId];
    });

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage({ type: 'drill', nodeId: targetId });
      channel.close();
    }
  };

  const selectedNode: ExplorerNode | null =
    data && currentNodeId
      ? data.nodes.find((n) => n.id === currentNodeId) ?? null
      : null;

  if (!data) {
    return (
      <div style={{ padding: '20px', color: '#94a3b8', fontFamily: 'sans-serif' }}>
        Loading detached drawer data…
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', backgroundColor: '#111827' }}>
      <div style={{ flex: 1, height: '100%' }}>
        <InvestigationDrawer
          node={selectedNode}
          open={true}
          onClose={() => {
            if (typeof window !== 'undefined') window.close();
          }}
          onDrill={handleDrill}
          data={data}
          drillPath={drillPath}
          onNavigateBreadcrumb={handleNavigateBreadcrumb}
        />
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<DetachedApp />);
}
