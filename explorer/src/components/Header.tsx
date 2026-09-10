import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="header">
      <div className="header-title">
        <span className="icon">⚡</span>
        <h1>Salesforce Architecture & Refactoring Explorer</h1>
      </div>
      <div className="header-badge">
        <span>Read-Only Explorer v1.0</span>
      </div>
    </header>
  );
};
