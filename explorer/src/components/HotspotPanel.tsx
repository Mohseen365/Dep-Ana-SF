import React, { useState, useMemo } from 'react';
import { ExplorerNode, ExplorerCycleGroup, ExplorerComponentImpactSummary } from '../types/explorer';
import { getArchitecturalHotspots, CategorizedHotspots } from '../lib/hotspots';

interface HotspotPanelProps {
  nodes: ExplorerNode[];
  cycles: ExplorerCycleGroup[];
  impactSummaries: Record<string, ExplorerComponentImpactSummary>;
  onSelectHotspot: (node: ExplorerNode) => void;
  selectedNodeId: string | null;
}

type TabType = 'ranked' | 'highRisk' | 'highFanIn' | 'highCoupling' | 'circular' | 'unresolved';

export const HotspotPanel: React.FC<HotspotPanelProps> = ({
  nodes,
  cycles,
  impactSummaries,
  onSelectHotspot,
  selectedNodeId
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('ranked');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const hotspots: CategorizedHotspots = useMemo(() => {
    return getArchitecturalHotspots(nodes, cycles, impactSummaries);
  }, [nodes, cycles, impactSummaries]);

  const totalHotspots = hotspots.topRanked.length;

  return (
    <div className="hotspot-panel">
      <div className="hotspot-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="hotspot-header-title">
          <span className="hotspot-icon">🔥</span>
          <h3>Architectural Hotspots</h3>
          <span className="hotspot-badge">{totalHotspots}</span>
        </div>
        <button className="collapse-toggle" title={isCollapsed ? 'Expand Hotspots' : 'Collapse Hotspots'}>
          {isCollapsed ? '▲' : '▼'}
        </button>
      </div>

      {!isCollapsed && (
        <div className="hotspot-body">
          <div className="hotspot-tabs">
            <button
              className={`hotspot-tab ${activeTab === 'ranked' ? 'active' : ''}`}
              onClick={() => setActiveTab('ranked')}
            >
              Top ({hotspots.topRanked.length})
            </button>
            <button
              className={`hotspot-tab ${activeTab === 'highRisk' ? 'active' : ''}`}
              onClick={() => setActiveTab('highRisk')}
            >
              High Risk ({hotspots.highRisk.length})
            </button>
            <button
              className={`hotspot-tab ${activeTab === 'highFanIn' ? 'active' : ''}`}
              onClick={() => setActiveTab('highFanIn')}
            >
              Fan-In ({hotspots.highFanIn.length})
            </button>
            <button
              className={`hotspot-tab ${activeTab === 'highCoupling' ? 'active' : ''}`}
              onClick={() => setActiveTab('highCoupling')}
            >
              Coupling ({hotspots.highCoupling.length})
            </button>
            <button
              className={`hotspot-tab ${activeTab === 'circular' ? 'active' : ''}`}
              onClick={() => setActiveTab('circular')}
            >
              Cycles ({hotspots.circular.length})
            </button>
            <button
              className={`hotspot-tab ${activeTab === 'unresolved' ? 'active' : ''}`}
              onClick={() => setActiveTab('unresolved')}
            >
              Unresolved ({hotspots.unresolved.length})
            </button>
          </div>

          <div className="hotspot-list">
            {activeTab === 'ranked' && (
              hotspots.topRanked.length === 0 ? (
                <div className="hotspot-empty">No architectural hotspots identified.</div>
              ) : (
                hotspots.topRanked.map((item, idx) => (
                  <div
                    key={item.node.id}
                    className={`hotspot-item ${selectedNodeId === item.node.id ? 'selected' : ''}`}
                    onClick={() => onSelectHotspot(item.node)}
                  >
                    <div className="hotspot-item-header">
                      <span className="hotspot-rank">{idx + 1}.</span>
                      <span className="hotspot-name">{item.node.displayName}</span>
                      <span className={`badge risk-badge risk-${item.node.risk.toLowerCase()}`}>
                        {item.node.risk}
                      </span>
                    </div>
                    <div className="hotspot-item-details">{item.details}</div>
                  </div>
                ))
              )
            )}

            {activeTab !== 'ranked' && (
              hotspots[activeTab].length === 0 ? (
                <div className="hotspot-empty">No components in this category.</div>
              ) : (
                hotspots[activeTab].map((node, idx) => (
                  <div
                    key={node.id}
                    className={`hotspot-item ${selectedNodeId === node.id ? 'selected' : ''}`}
                    onClick={() => onSelectHotspot(node)}
                  >
                    <div className="hotspot-item-header">
                      <span className="hotspot-rank">{idx + 1}.</span>
                      <span className="hotspot-name">{node.displayName}</span>
                      <span className={`badge risk-badge risk-${node.risk.toLowerCase()}`}>
                        {node.risk}
                      </span>
                    </div>
                    <div className="hotspot-item-details">
                      Fan-In: {node.metrics.fanIn} | Fan-Out: {node.metrics.fanOut} | Coupling: {node.metrics.coupling}
                      {node.refactoringReadiness?.hasCycles ? ' | Cycle: Yes' : ''}
                      {(node.metrics.unresolved > 0) ? ` | Unresolved: ${node.metrics.unresolved}` : ''}
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};
