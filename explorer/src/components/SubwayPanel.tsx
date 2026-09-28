import React, { useState, useMemo } from 'react';
import { SubwayMapData, SubwayStation } from '../lib/adapters/subway-adapter';

export interface SubwayPanelProps {
  data: SubwayMapData;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
  onExploreInGraph?: (nodeId: string) => void;
}

export const SubwayPanel: React.FC<SubwayPanelProps> = ({
  data,
  selectedNodeId,
  onSelectNode,
  onExploreInGraph,
}) => {
  const [selectedStation, setSelectedStation] = useState<SubwayStation | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCrossLineTracks, setShowCrossLineTracks] = useState<boolean>(true);

  const filteredStations = useMemo(() => {
    return data.stations.filter(s => {
      if (selectedFeatureId && s.featureId !== selectedFeatureId) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          s.displayName.toLowerCase().includes(query) ||
          s.nodeId.toLowerCase().includes(query) ||
          s.file.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [data.stations, selectedFeatureId, searchQuery]);

  const filteredRoutes = useMemo(() => {
    return data.routes.filter(r => {
      if (!showCrossLineTracks && r.isCrossLine) return false;
      if (selectedFeatureId) {
        return r.sourceFeatureId === selectedFeatureId || r.targetFeatureId === selectedFeatureId;
      }
      return true;
    });
  }, [data.routes, showCrossLineTracks, selectedFeatureId]);

  const handleStationClick = (station: SubwayStation) => {
    setSelectedStation(station);
    if (onSelectNode) {
      onSelectNode(station.nodeId);
    }
  };

  const handleExploreClick = (nodeId: string) => {
    if (onExploreInGraph) {
      onExploreInGraph(nodeId);
    }
  };

  if (!data || data.lines.length === 0) {
    return (
      <div className="subway-panel empty-state" data-testid="subway-panel">
        <div className="subway-empty-message">
          <h3>No Subway Map Data Available</h3>
          <p>Load an architecture project dataset to view the module subway map.</p>
        </div>
      </div>
    );
  }

  const canvasWidth = Math.max(
    1000,
    ...data.stations.map(s => s.x + 200)
  );
  const canvasHeight = Math.max(
    600,
    ...data.lines.map(l => l.y + 120)
  );

  return (
    <div className="subway-panel" data-testid="subway-panel">
      {/* Header Controls */}
      <div className="subway-toolbar">
        <div className="subway-search-box">
          <input
            type="text"
            placeholder="Search station / component..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            data-testid="subway-search-input"
          />
        </div>

        <div className="subway-filter-chips">
          <button
            className={`subway-chip ${selectedFeatureId === null ? 'active' : ''}`}
            onClick={() => setSelectedFeatureId(null)}
          >
            All Lines ({data.lines.length})
          </button>
          {data.availableFeatures.map(feat => (
            <button
              key={feat.id}
              className={`subway-chip ${selectedFeatureId === feat.id ? 'active' : ''}`}
              style={{ borderLeftColor: feat.color }}
              onClick={() => setSelectedFeatureId(feat.id === selectedFeatureId ? null : feat.id)}
            >
              {feat.name} ({feat.count})
            </button>
          ))}
        </div>

        <div className="subway-toggle-box">
          <label className="subway-toggle-label">
            <input
              type="checkbox"
              checked={showCrossLineTracks}
              onChange={e => setShowCrossLineTracks(e.target.checked)}
            />
            Show Cross-Feature Tracks
          </label>
        </div>
      </div>

      {/* Main SVG Schematic Canvas */}
      <div className="subway-canvas-container">
        <svg
          className="subway-svg-canvas"
          width={canvasWidth}
          height={canvasHeight}
          data-testid="subway-svg-canvas"
        >
          {/* Feature Track Background Lines */}
          {data.lines.map(line => (
            <g key={line.lineId} className="subway-line-group">
              <line
                x1={60}
                y1={line.y}
                x2={canvasWidth - 60}
                y2={line.y}
                stroke={line.color}
                strokeWidth={8}
                strokeOpacity={0.8}
                strokeLinecap="round"
              />
              <text
                x={70}
                y={line.y - 12}
                fill={line.color}
                fontSize={13}
                fontWeight="bold"
                className="subway-line-label"
              >
                {line.name} Line
              </text>
            </g>
          ))}

          {/* Connection Route Tracks */}
          {filteredRoutes.map(route => (
            <path
              key={route.edgeId}
              d={route.pathSvg}
              stroke={route.color}
              strokeWidth={route.isCrossLine ? 2 : 4}
              strokeDasharray={route.isCrossLine ? '4 4' : 'none'}
              strokeOpacity={route.isCrossLine ? 0.6 : 0.9}
              fill="none"
              className="subway-route-track"
            />
          ))}

          {/* Station Nodes */}
          {filteredStations.map(station => {
            const isCanonicalSelected = selectedNodeId ? station.nodeId === selectedNodeId : false;
            const isSelected = selectedStation?.nodeId === station.nodeId || isCanonicalSelected;
            const isDimmed = !!selectedNodeId && !isCanonicalSelected;
            const line = data.lines[station.lineIndex];
            const stationColor = line?.color || '#3b82f6';

            return (
              <g
                key={station.nodeId}
                transform={`translate(${station.x}, ${station.y})`}
                className={`subway-station-node ${station.isTransfer ? 'transfer-hub' : ''} ${isSelected ? 'selected' : ''} ${isDimmed ? 'dimmed' : ''}`}
                style={{ opacity: isDimmed ? 0.25 : 1.0, transition: 'opacity 0.15s ease' }}
                onClick={() => handleStationClick(station)}
                cursor="pointer"
              >
                {/* Station Marker Outer Ring */}
                <circle
                  r={station.isTransfer ? 10 : 7}
                  fill="#ffffff"
                  stroke={stationColor}
                  strokeWidth={station.isTransfer ? 4 : 3}
                />

                {/* Transfer Station Inner Core */}
                {station.isTransfer && (
                  <circle r={4} fill={stationColor} />
                )}

                {/* Station Label */}
                <text
                  x={0}
                  y={station.isTransfer ? 22 : 18}
                  textAnchor="middle"
                  fontSize={11}
                  fill="#334155"
                  className="subway-station-label"
                >
                  {station.displayName}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Station Inspector Drawer */}
      {selectedStation && (
        <div className="subway-inspector" data-testid="subway-inspector">
          <div className="subway-inspector-header">
            <h4>{selectedStation.displayName}</h4>
            <button
              className="subway-close-btn"
              onClick={() => setSelectedStation(null)}
            >
              ✕
            </button>
          </div>
          <div className="subway-inspector-body">
            <div className="subway-metric-row">
              <span className="label">Type:</span>
              <span className="value">{selectedStation.type}</span>
            </div>
            <div className="subway-metric-row">
              <span className="label">Line / Feature:</span>
              <span className="value">{selectedStation.featureName}</span>
            </div>
            <div className="subway-metric-row">
              <span className="label">Layer:</span>
              <span className="value">{selectedStation.layerName}</span>
            </div>
            <div className="subway-metric-row">
              <span className="label">Fan In / Fan Out:</span>
              <span className="value">{selectedStation.fanIn} / {selectedStation.fanOut}</span>
            </div>
            {selectedStation.isTransfer && (
              <div className="subway-transfer-badge">
                🚇 Transfer Station (Cross-Feature Hub)
              </div>
            )}
            <div className="subway-inspector-actions">
              <button
                className="subway-action-btn"
                onClick={() => handleExploreClick(selectedStation.nodeId)}
              >
                Explore in Graph
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
