import React from 'react';
import { ArchitectureHealth } from '../lib/health';

interface HealthSummaryProps {
  health: ArchitectureHealth;
}

export const HealthSummary: React.FC<HealthSummaryProps> = ({ health }) => {
  const getLevelClass = (level: string) => {
    switch (level) {
      case 'GOOD':
        return 'health-good';
      case 'CAUTION':
        return 'health-caution';
      case 'HIGH CONCERN':
        return 'health-concern';
      default:
        return '';
    }
  };

  return (
    <div className="health-summary-card">
      <div className="health-score-badge-container">
        <div className={`health-score-circle ${getLevelClass(health.level)}`}>
          <span className="health-score-num">{health.score}</span>
          <span className="health-score-max">/100</span>
        </div>
        <div className="health-level-label">
          <span className="health-title">Architecture Health</span>
          <span className={`health-level-tag ${getLevelClass(health.level)}`}>
            {health.level}
          </span>
        </div>
      </div>

      <div className="health-metrics-grid">
        <div className="health-metric-item">
          <span className="health-metric-label">Risk Pressure</span>
          <span className="health-metric-value">{health.riskPercent}%</span>
        </div>
        <div className="health-metric-item">
          <span className="health-metric-label">Cycles</span>
          <span className="health-metric-value">{health.cycleCount}</span>
        </div>
        <div className="health-metric-item">
          <span className="health-metric-label">Unresolved</span>
          <span className="health-metric-value">{health.unresolvedCount}</span>
        </div>
        <div className="health-metric-item">
          <span className="health-metric-label">Hotspots</span>
          <span className="health-metric-value">{health.hotspotCount}</span>
        </div>
      </div>

      <div className="health-concerns-box">
        <span className="health-concerns-title">Main Concerns:</span>
        <ul>
          {health.mainConcerns.map((concern, idx) => (
            <li key={idx}>• {concern}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};
