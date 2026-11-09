export function deepCloneGraph(graph) {
    if (!graph || typeof graph !== 'object') {
        return { schemaVersion: '1.0.0', nodes: [], edges: [], metrics: {} };
    }
    return JSON.parse(JSON.stringify(graph));
}

export function computeTarjanSCC(nodes, edges) {
    const nodeIds = new Set((nodes || []).map(n => n.id));
    const adj = new Map();
    for (const id of nodeIds) {
        adj.set(id, []);
    }

    for (const e of (edges || [])) {
        if (nodeIds.has(e.source) && nodeIds.has(e.target)) {
            adj.get(e.source).push(e.target);
        }
    }

    let index = 0;
    const indices = new Map();
    const lowlink = new Map();
    const onStack = new Map();
    const stack = [];
    const sccs = [];

    function strongConnect(v) {
        indices.set(v, index);
        lowlink.set(v, index);
        index++;
        stack.push(v);
        onStack.set(v, true);

        const neighbors = adj.get(v) || [];
        for (const w of neighbors) {
            if (!indices.has(w)) {
                strongConnect(w);
                lowlink.set(v, Math.min(lowlink.get(v), lowlink.get(w)));
            } else if (onStack.get(w)) {
                lowlink.set(v, Math.min(lowlink.get(v), indices.get(w)));
            }
        }

        if (lowlink.get(v) === indices.get(v)) {
            const scc = [];
            let w = null;
            do {
                w = stack.pop();
                onStack.set(w, false);
                scc.push(w);
            } while (w !== v);
            sccs.push(scc);
        }
    }

    for (const v of nodeIds) {
        if (!indices.has(v)) {
            strongConnect(v);
        }
    }

    return sccs;
}

export function countCyclicSCCs(nodes, edges) {
    const sccs = computeTarjanSCC(nodes, edges);
    const selfLoopNodes = new Set();
    for (const e of (edges || [])) {
        if (e.source === e.target) {
            selfLoopNodes.add(e.source);
        }
    }

    let cyclicCount = 0;
    for (const scc of sccs) {
        if (scc.length > 1) {
            cyclicCount++;
        } else if (scc.length === 1 && selfLoopNodes.has(scc[0])) {
            cyclicCount++;
        }
    }
    return cyclicCount;
}

export function edgeParticipatesInDirectedCycle(edge, edges) {
    if (!edge) return false;
    const u = edge.source;
    const v = edge.target;

    if (u === v) {
        return true;
    }

    const adj = new Map();
    const candidateEdgeId = edge.id || `${u}->${v}`;
    let candidateEdgeMatched = false;

    for (const e of (edges || [])) {
        const eId = e.id || `${e.source}->${e.target}`;
        if (!candidateEdgeMatched && (eId === candidateEdgeId || (e.source === u && e.target === v))) {
            candidateEdgeMatched = true;
            continue;
        }
        if (!adj.has(e.source)) {
            adj.set(e.source, []);
        }
        adj.get(e.source).push(e.target);
    }

    const visited = new Set();
    const queue = [v];
    visited.add(v);

    while (queue.length > 0) {
        const curr = queue.shift();
        if (curr === u) {
            return true;
        }
        const neighbors = adj.get(curr) || [];
        for (const nxt of neighbors) {
            if (!visited.has(nxt)) {
                visited.add(nxt);
                queue.push(nxt);
            }
        }
    }

    return false;
}

export function simulateRefactoring(baseGraph, actions) {
    if (!baseGraph || typeof baseGraph !== 'object') {
        throw new Error('Invalid base graph payload.');
    }

    const actionList = Array.isArray(actions) ? actions : [actions];
    const workingGraph = deepCloneGraph(baseGraph);

    const baseNodes = baseGraph.nodes || [];
    const baseEdges = baseGraph.edges || [];
    const baseCyclicSccCount = countCyclicSCCs(baseNodes, baseEdges);
    const baseCoupling = baseEdges.length;

    let appliedActionsCount = 0;
    let breakCycleActionsApplied = 0;
    const errors = [];
    const actionLogs = [];

    for (const action of actionList) {
        if (!action || !action.type) {
            errors.push('Action missing type.');
            continue;
        }

        switch (action.type) {
            case 'MOVE_METHOD': {
                const err = `MOVE_METHOD is unsupported in Salesforce architecture Explorer: method-level AST is absent from canonical graph payload (Action ID: ${action.id || 'unknown'}).`;
                errors.push(err);
                break;
            }

            case 'EXTRACT_CLASS': {
                const sourceNode = workingGraph.nodes.find(n => n.id === action.sourceNodeId);
                if (!sourceNode) {
                    errors.push(`EXTRACT_CLASS failed: Source node '${action.sourceNodeId}' not found.`);
                    break;
                }
                const newId = action.newClassName || `${action.sourceNodeId}_Extracted`;
                if (workingGraph.nodes.some(n => n.id === newId)) {
                    errors.push(`EXTRACT_CLASS failed: Target class '${newId}' already exists.`);
                    break;
                }

                const newNode = {
                    id: newId,
                    label: action.newClassName || newId,
                    displayName: action.newClassName || newId,
                    type: sourceNode.type || 'ApexClass',
                    layer: action.newClassLayer || sourceNode.layer || 'Core',
                    metrics: {
                        fanIn: 1,
                        fanOut: 0,
                        linesOfCode: 50,
                        cyclomaticComplexity: 2
                    },
                    attributes: {
                        extractedFrom: action.sourceNodeId,
                        movedMethods: action.movedMethodList || []
                    }
                };

                workingGraph.nodes.push(newNode);
                workingGraph.edges.push({
                    id: `${action.sourceNodeId}->${newId}`,
                    source: action.sourceNodeId,
                    target: newId,
                    type: 'references',
                    weight: 1
                });

                appliedActionsCount++;
                actionLogs.push({
                    actionId: action.id,
                    type: 'EXTRACT_CLASS',
                    description: `Extracted '${newId}' from '${action.sourceNodeId}'. Informational methods: ${(action.movedMethodList || []).join(', ') || 'none'}.`
                });
                break;
            }

            case 'EXTRACT_INTERFACE': {
                const srcNode = workingGraph.nodes.find(n => n.id === action.sourceNodeId);
                const tgtNode = workingGraph.nodes.find(n => n.id === action.targetNodeId);
                if (!srcNode || !tgtNode) {
                    errors.push(`EXTRACT_INTERFACE failed: Node '${action.sourceNodeId}' or '${action.targetNodeId}' not found.`);
                    break;
                }

                const ifaceId = action.intermediateNodeName || `I${tgtNode.label || tgtNode.id}`;
                if (!workingGraph.nodes.some(n => n.id === ifaceId)) {
                    workingGraph.nodes.push({
                        id: ifaceId,
                        label: ifaceId,
                        displayName: ifaceId,
                        type: 'ApexInterface',
                        layer: tgtNode.layer || 'Core',
                        metrics: { fanIn: 1, fanOut: 0, linesOfCode: 10, cyclomaticComplexity: 1 }
                    });
                }

                workingGraph.edges = workingGraph.edges.filter(
                    e => !(e.source === action.sourceNodeId && e.target === action.targetNodeId)
                );

                workingGraph.edges.push({
                    id: `${action.sourceNodeId}->${ifaceId}`,
                    source: action.sourceNodeId,
                    target: ifaceId,
                    type: 'references',
                    weight: 1
                });
                workingGraph.edges.push({
                    id: `${action.targetNodeId}->${ifaceId}`,
                    source: action.targetNodeId,
                    target: ifaceId,
                    type: 'implements',
                    weight: 1
                });

                appliedActionsCount++;
                breakCycleActionsApplied++;
                actionLogs.push({
                    actionId: action.id,
                    type: 'EXTRACT_INTERFACE',
                    description: `Extracted interface '${ifaceId}' between '${action.sourceNodeId}' and '${action.targetNodeId}'.`
                });
                break;
            }

            case 'BREAK_CYCLE': {
                let edgeIndex = -1;
                if (action.edgeIdToSever) {
                    edgeIndex = workingGraph.edges.findIndex(e => (e.id || `${e.source}->${e.target}`) === action.edgeIdToSever);
                } else if (action.sourceNodeId && action.targetNodeId) {
                    edgeIndex = workingGraph.edges.findIndex(e => e.source === action.sourceNodeId && e.target === action.targetNodeId);
                }

                if (edgeIndex === -1) {
                    errors.push(`BREAK_CYCLE failed: Target edge '${action.edgeIdToSever || (action.sourceNodeId + '->' + action.targetNodeId)}' not found.`);
                    break;
                }

                const candidateEdge = workingGraph.edges[edgeIndex];
                const isCyclic = edgeParticipatesInDirectedCycle(candidateEdge, workingGraph.edges);
                if (!isCyclic) {
                    errors.push(`BREAK_CYCLE rejected: Edge '${candidateEdge.source}->${candidateEdge.target}' does not participate in a directed cycle.`);
                    break;
                }

                workingGraph.edges.splice(edgeIndex, 1);
                appliedActionsCount++;
                breakCycleActionsApplied++;
                actionLogs.push({
                    actionId: action.id,
                    type: 'BREAK_CYCLE',
                    description: `Severed cyclic edge '${candidateEdge.source}->${candidateEdge.target}'.`
                });
                break;
            }

            case 'REMOVE_NODE': {
                const targetId = action.nodeId;
                const nodeIdx = workingGraph.nodes.findIndex(n => n.id === targetId);
                if (nodeIdx === -1) {
                    errors.push(`REMOVE_NODE failed: Node '${targetId}' not found.`);
                    break;
                }

                const beforeEdgeCount = workingGraph.edges.length;
                workingGraph.edges = workingGraph.edges.filter(
                    e => e.source !== targetId && e.target !== targetId
                );
                const removedEdgesCount = beforeEdgeCount - workingGraph.edges.length;

                workingGraph.nodes.splice(nodeIdx, 1);
                appliedActionsCount++;
                actionLogs.push({
                    actionId: action.id,
                    type: 'REMOVE_NODE',
                    description: `Removed node '${targetId}' and cascaded deletion across ${removedEdgesCount} incident edges.`
                });
                break;
            }

            default:
                errors.push(`Unknown refactoring action type '${action.type}'.`);
                break;
        }
    }

    const newNodes = workingGraph.nodes || [];
    const newEdges = workingGraph.edges || [];
    const newCyclicSccCount = countCyclicSCCs(newNodes, newEdges);
    const newCoupling = newEdges.length;

    const cyclicSccCountDelta = newCyclicSccCount - baseCyclicSccCount;
    const cyclicSccReduction = baseCyclicSccCount - newCyclicSccCount;
    const couplingDelta = newCoupling - baseCoupling;

    return {
        success: errors.length === 0,
        appliedActionsCount,
        breakCycleActionsApplied,
        actionLogs,
        errors,
        resultingPayload: workingGraph,
        deltas: {
            baseCyclicSccCount,
            newCyclicSccCount,
            cyclicSccCountDelta,
            cyclicSccReduction,
            breakCycleActionsApplied,
            baseCoupling,
            newCoupling,
            couplingDelta
        }
    };
}

export function generateHandoffMarkdown(handoffPlan) {
    const {
        projectId = 'PROJ_001',
        projectKey = 'PROJ_ALPHA',
        baseRunId = 'RUN_001',
        author = 'Architect',
        generatedDate = new Date().toISOString(),
        summary = {},
        actions = [],
        deltas = {}
    } = handoffPlan || {};

    const lines = [
        '# Engineering Architecture Refactoring Handoff Plan',
        '',
        '> **DISCLAIMER**: This document contains a *simulated architectural refactoring plan* generated by the Salesforce Architecture Explorer.',
        '> **No source code or repository files were modified**. The metrics and steps below represent prospective topological projections.',
        '',
        '## 1. Context & Metadata',
        `- **Project ID**: \`${projectId}\``,
        `- **Project Key**: \`${projectKey}\``,
        `- **Base Analysis Run**: \`${baseRunId}\``,
        `- **Generated Date**: ${generatedDate}`,
        `- **Author**: ${author}`,
        '',
        '## 2. Projected Simulation Deltas',
        `- **Base Cyclic SCC Count**: ${deltas.baseCyclicSccCount ?? 'N/A'}`,
        `- **Projected Cyclic SCC Count**: ${deltas.newCyclicSccCount ?? 'N/A'}`,
        `- **Cyclic SCC Delta**: ${deltas.cyclicSccCountDelta ?? 0} (Negative indicates fewer cyclic SCCs)`,
        `- **Cyclic SCC Reduction**: ${deltas.cyclicSccReduction ?? 0}`,
        `- **Coupling Delta (Edges)**: ${deltas.couplingDelta ?? 0}`,
        `- **Break Cycle Actions Applied**: ${deltas.breakCycleActionsApplied ?? 0}`,
        '',
        '## 3. Action Sequence',
        ''
    ];

    if (!actions || actions.length === 0) {
        lines.push('*No refactoring actions planned.*');
    } else {
        actions.forEach((act, idx) => {
            lines.push(`### Step ${idx + 1}: ${act.type} (ID: \`${act.id || idx + 1}\`)`);
            if (act.type === 'EXTRACT_CLASS') {
                lines.push(`- **Source Class**: \`${act.sourceNodeId}\``);
                lines.push(`- **Proposed Class**: \`${act.newClassName}\``);
                lines.push(`- **Layer**: \`${act.newClassLayer || 'Same as source'}\``);
                lines.push(`- **Informational Methods**: ${(act.movedMethodList || []).join(', ') || 'None specified'}`);
            } else if (act.type === 'EXTRACT_INTERFACE') {
                lines.push(`- **Source Class**: \`${act.sourceNodeId}\``);
                lines.push(`- **Target Class**: \`${act.targetNodeId}\``);
                lines.push(`- **Intermediate Interface**: \`${act.intermediateNodeName || 'Generated Interface'}\``);
            } else if (act.type === 'BREAK_CYCLE') {
                lines.push(`- **Severed Edge**: \`${act.edgeIdToSever || (act.sourceNodeId + ' -> ' + act.targetNodeId)}\``);
                lines.push(`- **Strategy**: \`${act.substitutionStrategy || 'DECOUPLING'}\``);
            } else if (act.type === 'REMOVE_NODE') {
                lines.push(`- **Target Node**: \`${act.nodeId}\``);
                lines.push('- **Cascade**: All incident edges (fan-in, fan-out, self-loops) atomically removed.');
            }
            lines.push('');
        });
    }

    return lines.join('\n');
}

export function generateHandoffJson(handoffPlan) {
    const markdown = generateHandoffMarkdown(handoffPlan);
    return {
        schemaVersion: '1.0.0',
        planId: handoffPlan.planId || `plan_${Date.now()}`,
        projectId: handoffPlan.projectId || '',
        projectKey: handoffPlan.projectKey || '',
        baseRunId: handoffPlan.baseRunId || '',
        generatedDate: handoffPlan.generatedDate || new Date().toISOString(),
        author: handoffPlan.author || 'Architect',
        summary: {
            totalActions: (handoffPlan.actions || []).length,
            cyclicSccCountDelta: handoffPlan.deltas?.cyclicSccCountDelta ?? 0,
            cyclicSccReduction: handoffPlan.deltas?.cyclicSccReduction ?? 0,
            breakCycleActionsApplied: handoffPlan.deltas?.breakCycleActionsApplied ?? 0,
            projectedCouplingDelta: handoffPlan.deltas?.couplingDelta ?? 0
        },
        actions: handoffPlan.actions || [],
        disclaimer: 'Pure prospective architectural simulation. No physical files modified.',
        markdownSummary: markdown
    };
}
