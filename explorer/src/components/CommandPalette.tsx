import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { searchNodes, SearchResult } from '../lib/search-filter';
import { ExplorerNode } from '../types/explorer';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: ExplorerNode[];
  onSelectNode: (nodeId: string) => void;
  query?: string;
  onQueryChange?: (query: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  nodes,
  onSelectNode,
  query = '',
  onQueryChange,
}) => {
  const [inputVal, setInputVal] = useState(query);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Keep inputVal in sync with external query prop if provided
  useEffect(() => {
    if (isOpen) {
      setInputVal(query);
      setDebouncedQuery(query);
      setSelectedIndex(0);
    }
  }, [isOpen, query]);

  // Focus input when palette opens
  useEffect(() => {
    if (isOpen) {
      // Small timeout ensures element is mounted and rendered before focusing
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Debounce query updates at 100ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(inputVal);
      if (onQueryChange) {
        onQueryChange(inputVal);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [inputVal, onQueryChange]);

  // Filter nodes using searchNodes from lib/search-filter.ts
  const results: SearchResult[] = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return nodes.map((node) => ({
        node,
        matchField: 'displayName',
        matchValue: '',
      }));
    }
    return searchNodes(nodes, debouncedQuery);
  }, [nodes, debouncedQuery]);

  // Reset selectedIndex when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Scroll selected item into view
  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView?.({
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (nodeId: string) => {
      onSelectNode(nodeId);
      onClose();
    },
    [onSelectNode, onClose]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (results.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % results.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results.length > 0 && results[selectedIndex]) {
        handleSelect(results[selectedIndex].node.id);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="command-palette-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      data-testid="command-palette-overlay"
    >
      <div
        className="command-palette-container"
        onClick={(e) => e.stopPropagation()}
        data-testid="command-palette-container"
      >
        <div className="command-palette-header">
          <span className="command-palette-search-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Type a component name or ID to search..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Search components"
            data-testid="command-palette-input"
          />
          <kbd className="command-palette-shortcut-hint">ESC to close</kbd>
        </div>

        <div className="command-palette-results" role="listbox" data-testid="command-palette-results">
          {results.length === 0 ? (
            <div className="command-palette-empty" data-testid="command-palette-empty">
              No matches
            </div>
          ) : (
            results.map((result, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={result.node.id}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  className={`command-palette-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelect(result.node.id)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  role="option"
                  aria-selected={isSelected}
                  data-testid={`command-palette-item-${result.node.id}`}
                >
                  <div className="command-palette-item-main">
                    <span className="command-palette-item-name">{result.node.displayName}</span>
                    <span className="command-palette-item-id">{result.node.id}</span>
                  </div>
                  <div className="command-palette-item-meta">
                    <span className="command-palette-item-type">{result.node.type}</span>
                    <span className={`result-risk risk-${result.node.risk.toLowerCase()}`}>
                      {result.node.risk}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="command-palette-footer">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> to navigate
          </span>
          <span>
            <kbd>↵</kbd> to select
          </span>
          <span>
            <kbd>esc</kbd> to dismiss
          </span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
