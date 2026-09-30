import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { searchNodes, SearchResult } from "../lib/search-filter";
import {
  ExplorerNode,
  ExplorerDataSchema,
  ExplorerCycleGroup,
  ExplorerUnresolvedReference,
  ExplorerRiskLevel,
  ProjectMetadata,
} from "../types/explorer";
import { useProject } from "../context/ProjectContext";
import { SummaryBar } from "./SummaryBar";
import { HotspotPanel } from "./HotspotPanel";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { FindingsPanel } from "./findings/FindingsPanel";
import { ComparePanel } from "./ComparePanel";
import { ArchitectureFinding } from "../lib/intelligence";

export type PalettePanelId =
  | "summary"
  | "hotspots"
  | "diagnostics"
  | "findings"
  | "compare"
  | null;

export interface CommandEntry {
  id: string;
  title: string;
  category: "Panel" | "Action" | "Project";
  panelId?: PalettePanelId;
  action?: () => void;
  description?: string;
  disabled?: boolean;
  projectId?: string;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: ExplorerNode[];
  onSelectNode: (nodeId: string) => void;
  query?: string;
  onQueryChange?: (query: string) => void;

  // Data & Panel Props for relocated panels
  data?: ExplorerDataSchema | null;
  selectedNodeId?: string | null;
  isInvestigating?: boolean;
  findings?: ArchitectureFinding[];
  selectedFindingId?: string | null;
  onSelectFinding?: (finding: ArchitectureFinding) => void;
  onClearFinding?: () => void;
  compareState?: any;
  activeRiskFilter?: ExplorerRiskLevel | "";
  onRiskFilterChange?: (risk: ExplorerRiskLevel) => void;
  diagnosticTab?: "cycles" | "unresolved" | "none";
  onDiagnosticTabChange?: (tab: "cycles" | "unresolved" | "none") => void;
  selectedCycleId?: string | null;
  onSelectCycle?: (cycle: ExplorerCycleGroup | null) => void;
  selectedUnresolvedEdgeId?: string | null;
  onSelectUnresolved?: (ref: ExplorerUnresolvedReference | null) => void;

  // Multi-Project Props (Optional fallback)
  projects?: ProjectMetadata[];
  activeProjectId?: string;
  onSelectProject?: (projectId: string) => void;

  // Action callbacks
  onApplyFocus?: () => void;
  onShowImpact?: () => void;
  onToggleViewMode?: () => void;
  onRequestHandoff?: (nodeId: string) => void;
  onResetView?: () => void;
  onToggleCompare?: () => void;
}

function useProjectSafe() {
  try {
    return useProject();
  } catch (_) {
    return null;
  }
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  nodes,
  onSelectNode,
  query = "",
  onQueryChange,
  data = null,
  selectedNodeId = null,
  findings = [],
  selectedFindingId = null,
  onSelectFinding,
  onClearFinding,
  compareState,
  activeRiskFilter = "",
  onRiskFilterChange,
  diagnosticTab = "cycles",
  onDiagnosticTabChange,
  selectedCycleId = null,
  onSelectCycle,
  selectedUnresolvedEdgeId = null,
  onSelectUnresolved,
  isInvestigating,
  projects: propProjects,
  activeProjectId: propActiveProjectId,
  onSelectProject: propSelectProject,
  onApplyFocus,
  onShowImpact,
  onToggleViewMode,
  onRequestHandoff,
  onResetView,
  onToggleCompare,
}) => {
  const [inputVal, setInputVal] = useState(query);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activePanel, setActivePanel] = useState<PalettePanelId>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const projectContext = useProjectSafe();
  const availableProjects = projectContext?.projects || propProjects || [];
  const currentProjectId =
    projectContext?.activeProjectId || propActiveProjectId;
  const handleSelectProject =
    projectContext?.selectProject || propSelectProject;

  const isNodeInvestigated =
    Boolean(selectedNodeId) && (isInvestigating ?? true);

  // Command entries definition
  const commandEntries: CommandEntry[] = useMemo(() => {
    const entries: CommandEntry[] = [
      {
        id: "cmd-summary",
        title: "Open Summary",
        category: "Panel",
        panelId: "summary",
        description: "View architecture summary & health metrics",
      },
      {
        id: "cmd-hotspots",
        title: "Open Hotspots",
        category: "Panel",
        panelId: "hotspots",
        description: "View architectural hotspots and refactoring readiness",
      },
      {
        id: "cmd-diagnostics",
        title: "Open Diagnostics",
        category: "Panel",
        panelId: "diagnostics",
        description: "View circular dependencies & unresolved references",
      },
      {
        id: "cmd-cycles",
        title: "Find cycles",
        category: "Panel",
        panelId: "diagnostics",
        action: () => {
          onDiagnosticTabChange?.("cycles");
        },
        description:
          "Find circular dependencies and risk cycles in the active project",
      },
      {
        id: "cmd-findings",
        title: "Open Findings",
        category: "Panel",
        panelId: "findings",
        description: "View architecture rule findings & violations",
      },
      {
        id: "cmd-compare",
        title: "Compare snapshots",
        category: "Panel",
        panelId: "compare",
        action: () => {
          onToggleCompare?.();
        },
        description: "Compare current architecture with previous snapshot",
      },
      {
        id: "cmd-reset-graph",
        title: "Reset graph",
        category: "Action",
        action: () => {
          onResetView?.();
        },
        description: "Reset active graph filters, selection, and zoom level",
      },
      {
        id: "handoff-to-refactor",
        title: "Hand off to refactor",
        category: "Action",
        disabled: !isNodeInvestigated,
        action: () => {
          if (selectedNodeId && onRequestHandoff) {
            onRequestHandoff(selectedNodeId);
          }
        },
        description:
          "Open the refactor handoff confirmation for the currently investigated node.",
      },
      {
        id: "cmd-focus",
        title: "Focus on selected node",
        category: "Action",
        action: () => {
          onApplyFocus?.();
        },
        description: "Isolate neighborhood around selected component",
      },
      {
        id: "cmd-impact",
        title: "Show impact of selected node",
        category: "Action",
        action: () => {
          onShowImpact?.();
        },
        description: "Highlight blast radius for selected component",
      },
      {
        id: "cmd-toggle-view",
        title: "Toggle view mode",
        category: "Action",
        action: () => {
          onToggleViewMode?.();
        },
        description: "Switch between Graph and Findings view modes",
      },
    ];

    // Add project entries if available
    availableProjects.forEach((proj) => {
      entries.push({
        id: `cmd-project-${proj.id}`,
        title: `Switch project: ${proj.name}`,
        category: "Project",
        projectId: proj.id,
        disabled: proj.id === currentProjectId,
        action: () => {
          handleSelectProject?.(proj.id);
        },
        description: `Open/Switch to project dataset (${proj.id})`,
      });
    });

    return entries;
  }, [
    isNodeInvestigated,
    selectedNodeId,
    onRequestHandoff,
    onApplyFocus,
    onShowImpact,
    onToggleViewMode,
    onResetView,
    onToggleCompare,
    onDiagnosticTabChange,
    availableProjects,
    currentProjectId,
    handleSelectProject,
  ]);

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setInputVal(query);
      setDebouncedQuery(query);
      setSelectedIndex(0);
      setActivePanel(null);
    }
  }, [isOpen, query]);

  // Focus input when in list mode
  useEffect(() => {
    if (isOpen && activePanel === null) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activePanel]);

  const onQueryChangeRef = useRef(onQueryChange);
  onQueryChangeRef.current = onQueryChange;
  // Debounce input at 100ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(inputVal);
      if (onQueryChangeRef.current) {
        onQueryChangeRef.current(inputVal);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [inputVal]);

  // Filter matching commands
  const matchingCommands = useMemo(() => {
    if (!debouncedQuery.trim()) return commandEntries;
    const q = debouncedQuery.trim().toLowerCase();
    return commandEntries.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(q) ||
        (cmd.description && cmd.description.toLowerCase().includes(q)),
    );
  }, [commandEntries, debouncedQuery]);

  // Filter matching nodes using searchNodes
  const matchingNodes: SearchResult[] = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return nodes.map((node) => ({
        node,
        matchField: "displayName",
        matchValue: "",
      }));
    }
    return searchNodes(nodes, debouncedQuery);
  }, [nodes, debouncedQuery]);

  // Combined selectable list: matching commands first, then matching nodes
  const combinedList = useMemo(() => {
    const items: Array<
      | { kind: "command"; item: CommandEntry }
      | { kind: "node"; item: SearchResult }
    > = [];
    matchingCommands.forEach((cmd) =>
      items.push({ kind: "command", item: cmd }),
    );
    matchingNodes.forEach((nodeResult) =>
      items.push({ kind: "node", item: nodeResult }),
    );
    return items;
  }, [matchingCommands, matchingNodes]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [combinedList]);

  // Scroll selected item into view
  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView?.({
        block: "nearest",
      });
    }
  }, [selectedIndex]);

  const handleSelectNode = useCallback(
    (nodeId: string) => {
      onSelectNode(nodeId);
      onClose();
    },
    [onSelectNode, onClose],
  );

  const handleSelectCommand = useCallback(
    (cmd: CommandEntry) => {
      if (cmd.disabled) return;
      if (cmd.action) {
        cmd.action();
      }
      if (cmd.category === "Panel" && cmd.panelId) {
        setActivePanel(cmd.panelId);
      } else {
        onClose();
      }
    },
    [onClose],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (combinedList.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % combinedList.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (combinedList.length > 0) {
        setSelectedIndex(
          (prev) => (prev - 1 + combinedList.length) % combinedList.length,
        );
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (combinedList.length > 0 && combinedList[selectedIndex]) {
        const selected = combinedList[selectedIndex];
        if (selected.kind === "command") {
          handleSelectCommand(selected.item);
        } else {
          handleSelectNode(selected.item.node.id);
        }
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  // Global escape key listener inside modal container if panel active
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isOpen, onClose]);

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
        {activePanel !== null ? (
          /* Panel Mode View */
          <div
            className="command-palette-panel-view"
            data-testid="command-palette-panel-view"
          >
            <div className="command-palette-panel-header">
              <button
                className="command-palette-back-btn"
                onClick={() => setActivePanel(null)}
                data-testid="command-palette-back-btn"
              >
                ← Back
              </button>
              <span className="command-palette-panel-title">
                {commandEntries.find((c) => c.panelId === activePanel)?.title}
              </span>
              <kbd className="command-palette-shortcut-hint">ESC to close</kbd>
            </div>
            <div
              className="command-palette-panel-content"
              data-testid={`command-palette-panel-content-${activePanel}`}
            >
              {activePanel === "summary" && (
                <SummaryBar
                  summary={
                    data?.summary ?? {
                      nodeCount: nodes.length,
                      edgeCount: data?.edges?.length ?? 0,
                      highRiskCount: nodes.filter((n) => n.risk === "HIGH")
                        .length,
                      mediumRiskCount: nodes.filter((n) => n.risk === "MEDIUM")
                        .length,
                      lowRiskCount: nodes.filter((n) => n.risk === "LOW")
                        .length,
                      cycleCount: data?.cycles?.length ?? 0,
                      unresolvedCount: data?.unresolvedReferences?.length ?? 0,
                      inventory: {
                        files: 0,
                        apexClasses: 0,
                        apexTriggers: 0,
                        lwcJs: 0,
                        lwcHtml: 0,
                        visualforce: 0,
                        flows: 0,
                        objects: 0,
                        fields: 0,
                      },
                    }
                  }
                  data={data}
                  activeRiskFilter={activeRiskFilter}
                  onRiskFilterChange={onRiskFilterChange}
                  sidebarCollapsed={true}
                />
              )}
              {activePanel === "hotspots" && (
                <HotspotPanel
                  nodes={nodes}
                  cycles={data?.cycles ?? []}
                  impactSummaries={data?.impactSummaries ?? {}}
                  selectedNodeId={selectedNodeId}
                  onSelectHotspot={(node) => {
                    handleSelectNode(node.id);
                  }}
                />
              )}
              {activePanel === "diagnostics" && (
                <DiagnosticsPanel
                  cycles={data?.cycles ?? []}
                  unresolvedReferences={data?.unresolvedReferences ?? []}
                  nodes={nodes}
                  activeTab={diagnosticTab}
                  selectedCycleId={selectedCycleId}
                  selectedUnresolvedEdgeId={selectedUnresolvedEdgeId}
                  onSelectCycle={onSelectCycle ?? (() => {})}
                  onSelectUnresolved={onSelectUnresolved ?? (() => {})}
                  onTabChange={onDiagnosticTabChange ?? (() => {})}
                />
              )}
              {activePanel === "findings" && (
                <FindingsPanel
                  findings={findings}
                  selectedFindingId={selectedFindingId}
                  onSelectFinding={(f) => {
                    onSelectFinding?.(f);
                    if (f.nodeIds && f.nodeIds.length > 0) {
                      handleSelectNode(f.nodeIds[0]);
                    }
                  }}
                  onClearSelection={onClearFinding ?? (() => {})}
                />
              )}
              {activePanel === "compare" && (
                <ComparePanel
                  compareState={
                    compareState ?? {
                      isActive: true,
                      leftSnapshot: null,
                      rightSnapshot: null,
                      diff: null,
                      focusedEntityId: null,
                      filterType: "ALL",
                    }
                  }
                  onClose={() => setActivePanel(null)}
                />
              )}
            </div>
          </div>
        ) : (
          /* List Mode View */
          <>
            <div className="command-palette-header">
              <span className="command-palette-search-icon">🔍</span>
              <input
                ref={inputRef}
                type="text"
                className="command-palette-input"
                placeholder="Type a command or search components..."
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Search commands or components"
                data-testid="command-palette-input"
              />
              <kbd className="command-palette-shortcut-hint">ESC to close</kbd>
            </div>

            <div
              className="command-palette-results"
              role="listbox"
              data-testid="command-palette-results"
            >
              {combinedList.length === 0 ? (
                <div
                  className="command-palette-empty"
                  data-testid="command-palette-empty"
                >
                  No matches
                </div>
              ) : (
                combinedList.map((entry, index) => {
                  const isSelected = index === selectedIndex;
                  if (entry.kind === "command") {
                    const cmd = entry.item;
                    return (
                      <div
                        key={cmd.id}
                        ref={(el) => {
                          itemRefs.current[index] = el;
                        }}
                        className={`command-palette-item command-palette-command-item ${
                          isSelected ? "selected" : ""
                        } ${cmd.disabled ? "disabled" : ""}`}
                        style={
                          cmd.disabled
                            ? { opacity: 0.5, cursor: "not-allowed" }
                            : undefined
                        }
                        onClick={() =>
                          !cmd.disabled && handleSelectCommand(cmd)
                        }
                        onMouseEnter={() => setSelectedIndex(index)}
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={cmd.disabled}
                        data-testid={`command-palette-item-${cmd.id}`}
                      >
                        <div className="command-palette-item-main">
                          <span className="command-palette-item-name">
                            ⚡ {cmd.title}
                          </span>
                          <span className="command-palette-item-id">
                            {cmd.description}
                          </span>
                        </div>
                        <div className="command-palette-item-meta">
                          <span className="command-palette-item-type">
                            {cmd.category}
                          </span>
                        </div>
                      </div>
                    );
                  } else {
                    const result = entry.item;
                    return (
                      <div
                        key={result.node.id}
                        ref={(el) => {
                          itemRefs.current[index] = el;
                        }}
                        className={`command-palette-item ${isSelected ? "selected" : ""}`}
                        onClick={() => handleSelectNode(result.node.id)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        role="option"
                        aria-selected={isSelected}
                        data-testid={`command-palette-item-${result.node.id}`}
                      >
                        <div className="command-palette-item-main">
                          <span className="command-palette-item-name">
                            {result.node.displayName}
                          </span>
                          <span className="command-palette-item-id">
                            {result.node.id}
                          </span>
                        </div>
                        <div className="command-palette-item-meta">
                          <span className="command-palette-item-type">
                            {result.node.type}
                          </span>
                          <span
                            className={`result-risk risk-${result.node.risk.toLowerCase()}`}
                          >
                            {result.node.risk}
                          </span>
                        </div>
                      </div>
                    );
                  }
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
          </>
        )}
      </div>
    </div>
  );
};

export default CommandPalette;
