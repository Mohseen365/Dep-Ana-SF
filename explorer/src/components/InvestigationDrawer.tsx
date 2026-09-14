import React from 'react';
import type { ExplorerNode } from '../types/explorer';

export interface InvestigationDrawerProps {
  node: ExplorerNode | null;
  open: boolean;
  onClose: () => void;
  onDrill?: (id: string) => void;
}

export const InvestigationDrawer: React.FC<InvestigationDrawerProps> = ({
  node,
  open,
  onClose,
  onDrill,
}) => {
  void onDrill;
  if (!open) {
    return null;
  }

  return (
    <aside
      className="investigation-drawer"
      data-testid="investigation-drawer"
      aria-label="Investigation Drawer"
    >
      <header className="investigation-drawer-header">
        <div className="drawer-title-group">
          <h2>{node ? node.displayName : 'No Component Selected'}</h2>
          {node && <span className="drawer-node-type">{node.type}</span>}
        </div>
        <button
          className="drawer-close-btn"
          onClick={onClose}
          aria-label="Close Investigation Drawer"
          title="Close Investigation Drawer"
        >
          ×
        </button>
      </header>
      <div className="investigation-drawer-body">
        <p className="drawer-placeholder">Drilling content coming in UX-4</p>
      </div>
    </aside>
  );
};
