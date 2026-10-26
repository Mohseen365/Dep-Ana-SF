/**
 * @description Reusable LWC Layout Engine for Dependency Analyzer
 * Implements pure JavaScript deterministic layout algorithms for:
 * 1. P0 - Architecture / Hierarchical Layout (computeArchitectureLayout)
 * 2. P1 - Orbit Radial Layout (computeOrbitLayout)
 * 3. P1 - Constellation Polar Layout (computeConstellationLayout)
 * 4. P2 - Sankey / River Flow Layout (computeSankeyLayout)
 */

// --- Helper Functions ---

function stableCompareStrings(a, b) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

function normalizeAngle(rad) {
    if (!Number.isFinite(rad)) return 0;
    const twoPi = 2 * Math.PI;
    let a = rad % twoPi;
    if (a < 0) a += twoPi;
    return a;
}

function checkAABBOverlap(pos1, pos2, effWidth, effHeight, epsilon = 1e-3) {
    const dx = Math.abs(pos1.x - pos2.x);
    const dy = Math.abs(pos1.y - pos2.y);
    return dx < effWidth - epsilon && dy < effHeight - epsilon;
}

function calculateRequiredSectorRadius(n, usableAngle, requiredSeparationPx) {
    if (n <= 1) return 0;
    if (usableAngle <= 0) return Infinity;
    const deltaTheta = usableAngle / (n - 1);
    const sinHalf = Math.sin(deltaTheta / 2);
    if (sinHalf <= 1e-6) return Infinity;
    return requiredSeparationPx / (2 * sinHalf);
}

// --- P0: Architecture / Hierarchical Layout ---

export function classifyNodeLayer(node) {
    if (!node) return 'application';
    const type = node.type || node.canonicalNodeType || '';
    const name = node.name || node.displayName || node.id || '';

    if (type === 'LWC' || type === 'Visualforce' || /Controller$/i.test(name)) {
        return 'presentation';
    }
    if (type === 'ApexTrigger' || type === 'Flow' || /Service$/i.test(name) || /Handler$/i.test(name)) {
        return 'application';
    }
    if (type === 'Object' || type === 'CustomObject' || type === 'Field' || type === 'CustomField') {
        return 'schema';
    }
    if (type === 'External' || node.isTest || /Test$/i.test(name)) {
        return 'supporting';
    }
    return 'domain';
}

export function computeArchitectureLayout(nodes = [], edges = [], options = {}) {
    const layerSpacing = options.layerSpacing ?? 250;
    const domainSpacing = options.domainSpacing ?? 380;
    const nodeWidth = options.nodeWidth ?? 120;
    const nodeHeight = options.nodeHeight ?? 60;
    const horizontalGap = options.horizontalGap ?? 40;

    const safeNodes = Array.isArray(nodes) ? [...nodes] : [];
    safeNodes.sort((a, b) => stableCompareStrings(a.id, b.id));

    const layerOrder = ['presentation', 'application', 'domain', 'schema', 'supporting'];
    const layerYMap = {
        presentation: 0,
        application: layerSpacing,
        domain: layerSpacing * 2,
        schema: layerSpacing * 3,
        supporting: layerSpacing * 4,
    };

    const layerNodesMap = new Map();
    layerOrder.forEach(l => layerNodesMap.set(l, []));

    safeNodes.forEach(node => {
        const layer = node.layer || classifyNodeLayer(node);
        if (!layerNodesMap.has(layer)) {
            layerNodesMap.set(layer, []);
        }
        layerNodesMap.get(layer).push(node);
    });

    const positions = {};

    layerOrder.forEach(layer => {
        const layerNodes = layerNodesMap.get(layer) || [];
        const y = layerYMap[layer] ?? 0;

        // Group by domain if available
        const domainGroups = new Map();
        layerNodes.forEach(node => {
            const domain = node.domain || '_default';
            if (!domainGroups.has(domain)) {
                domainGroups.set(domain, []);
            }
            domainGroups.get(domain).push(node);
        });

        const sortedDomains = Array.from(domainGroups.keys()).sort(stableCompareStrings);
        let currentX = 0;

        sortedDomains.forEach(domain => {
            const domainNodes = domainGroups.get(domain) || [];
            domainNodes.forEach((node, idx) => {
                const x = currentX + idx * (nodeWidth + horizontalGap);
                positions[node.id] = {
                    x: Math.round(x * 100) / 100,
                    y: Math.round(y * 100) / 100,
                };
            });
            currentX += domainNodes.length * (nodeWidth + horizontalGap) + domainSpacing;
        });
    });

    return { positions };
}

// --- P1: Orbit Layout Engine ---

export function computeOrbitLayout(input = {}) {
    const options = input.options || {};
    const center = options.center || { x: 0, y: 0 };
    const nodeWidth = options.nodeWidth ?? 120;
    const nodeHeight = options.nodeHeight ?? 60;
    const horizontalGap = options.horizontalGap ?? 40;
    const verticalGap = options.verticalGap ?? 40;
    const trackSpacing = options.trackSpacingPx ?? 200;
    const maxTracksPerRing = options.maxTracksPerRing ?? 10;
    const innerRadius = options.innerRadius ?? 600;
    const ringSpacing = options.ringSpacing ?? 800;
    const maxRepairPasses = options.maxRepairPasses ?? 20;

    const effWidth = nodeWidth + horizontalGap;
    const effHeight = nodeHeight + verticalGap;
    const requiredChordSeparation = Math.sqrt(effWidth * effWidth + effHeight * effHeight);

    const rawNodes = Array.isArray(input.nodes) ? [...input.nodes] : [];
    const nodes = [...rawNodes].sort((a, b) => stableCompareStrings(a.nodeId, b.nodeId));

    const ringNodeCounts = {};
    const sectorNodeCounts = {};
    const trackCounts = {};

    const sectorSet = new Set();
    const nodesBySector = new Map();

    nodes.forEach((node) => {
        const ring = Number.isFinite(node.orbitRingIndex) ? node.orbitRingIndex : 1;
        const sector = node.orbitSectorId || '_unassigned';

        ringNodeCounts[ring] = (ringNodeCounts[ring] || 0) + 1;
        sectorNodeCounts[sector] = (sectorNodeCounts[sector] || 0) + 1;

        sectorSet.add(sector);
        if (!nodesBySector.has(sector)) {
            nodesBySector.set(sector, []);
        }
        nodesBySector.get(sector).push(node);
    });

    const sortedSectorIds = Array.from(sectorSet).sort((a, b) => {
        if (a === '_unassigned') return 1;
        if (b === '_unassigned') return -1;
        return stableCompareStrings(a, b);
    });

    const numSectors = sortedSectorIds.length;
    const totalCircleRad = 2 * Math.PI;
    const sectorAngles = new Map();

    if (numSectors === 1) {
        const secId = sortedSectorIds[0];
        const margin = options.sectorMarginAngleRad ?? 0.05;
        sectorAngles.set(secId, {
            sectorId: secId,
            startAngle: 0,
            endAngle: totalCircleRad,
            sectorBodyAngle: totalCircleRad,
            sectorMargin: margin,
            usableStart: margin,
            usableEnd: totalCircleRad - margin,
            usableAngle: totalCircleRad - 2 * margin,
            nodeCount: nodes.length,
        });
    } else if (numSectors > 1) {
        const margin = (0.05 * totalCircleRad) / (2 * numSectors);
        const thetaMin = (totalCircleRad / numSectors) * 0.20;
        const residualBudget = totalCircleRad - numSectors * thetaMin;
        const totalNodesCount = Math.max(1, nodes.length);

        const bodyAngles = new Map();
        let rawSum = 0;
        sortedSectorIds.forEach((secId) => {
            const pop = sectorNodeCounts[secId] || 1;
            const weight = pop / totalNodesCount;
            const angle = thetaMin + residualBudget * weight;
            bodyAngles.set(secId, angle);
            rawSum += angle;
        });

        let currentAngle = 0;
        sortedSectorIds.forEach((secId, idx) => {
            let bodyAngle = (bodyAngles.get(secId) / rawSum) * totalCircleRad;
            if (idx === numSectors - 1) {
                bodyAngle = totalCircleRad - currentAngle;
            }
            const startAngle = currentAngle;
            const endAngle = currentAngle + bodyAngle;
            const usableStart = startAngle + margin;
            const usableEnd = endAngle - margin;
            const usableAngle = Math.max(1e-6, usableEnd - usableStart);

            sectorAngles.set(secId, {
                sectorId: secId,
                startAngle,
                endAngle,
                sectorBodyAngle: bodyAngle,
                sectorMargin: margin,
                usableStart,
                usableEnd,
                usableAngle,
                nodeCount: sectorNodeCounts[secId] || 0,
            });

            currentAngle = endAngle;
        });
    }

    const positions = {};
    let maxTrackIndex = 0;
    let minRadiusPx = Infinity;
    let maxRadiusPx = 0;

    sortedSectorIds.forEach((secId) => {
        const secNodes = nodesBySector.get(secId) || [];
        const secInfo = sectorAngles.get(secId) || {
            usableStart: 0,
            usableAngle: totalCircleRad,
        };

        const nodesByRingInSector = new Map();
        secNodes.forEach((node) => {
            const ring = Number.isFinite(node.orbitRingIndex) ? node.orbitRingIndex : 1;
            if (!nodesByRingInSector.has(ring)) {
                nodesByRingInSector.set(ring, []);
            }
            nodesByRingInSector.get(ring).push(node);
        });

        Array.from(nodesByRingInSector.keys()).sort((a, b) => a - b).forEach((ring) => {
            const ringNodes = nodesByRingInSector.get(ring);
            ringNodes.sort((a, b) => {
                const keyDiff = stableCompareStrings(a.semanticOrderKey || '', b.semanticOrderKey || '');
                if (keyDiff !== 0) return keyDiff;
                return stableCompareStrings(a.nodeId, b.nodeId);
            });

            const n = ringNodes.length;
            const baseRingRadius = innerRadius + ring * ringSpacing;
            const approxCapacity = Math.max(1, Math.min(8, Math.floor((secInfo.usableAngle * baseRingRadius) / requiredChordSeparation)));
            const tracksNeeded = Math.min(maxTracksPerRing, Math.max(1, Math.ceil(n / approxCapacity)));
            trackCounts[secId] = Math.max(trackCounts[secId] || 0, tracksNeeded);

            const nodesByTrack = new Map();
            ringNodes.forEach((node, nodeIdx) => {
                const trk = Math.floor(nodeIdx / approxCapacity) % tracksNeeded;
                if (!nodesByTrack.has(trk)) {
                    nodesByTrack.set(trk, []);
                }
                nodesByTrack.get(trk).push(node);
            });

            Array.from(nodesByTrack.keys()).sort((a, b) => a - b).forEach((track) => {
                const trackNodes = nodesByTrack.get(track);
                const n_k = trackNodes.length;
                if (track > maxTrackIndex) maxTrackIndex = track;

                const baseTrackRadius = innerRadius + ring * ringSpacing + track * trackSpacing;
                const deltaTheta_k = n_k <= 1 ? secInfo.usableAngle : secInfo.usableAngle / (n_k - 1);
                const reqRadius = calculateRequiredSectorRadius(n_k, secInfo.usableAngle, requiredChordSeparation);
                const trackRadius = Math.max(baseTrackRadius, reqRadius);

                trackNodes.forEach((node, nodeIdxOnTrack) => {
                    const angle = n_k <= 1
                        ? secInfo.usableStart + secInfo.usableAngle / 2
                        : secInfo.usableStart + nodeIdxOnTrack * deltaTheta_k;

                    const normAngle = normalizeAngle(angle);
                    const x = center.x + trackRadius * Math.cos(normAngle);
                    const y = center.y + trackRadius * Math.sin(normAngle);

                    positions[node.nodeId] = {
                        nodeId: node.nodeId,
                        ring,
                        sector: secId,
                        track,
                        angle: normAngle,
                        radius: trackRadius,
                        x: Math.round(x * 1000) / 1000,
                        y: Math.round(y * 1000) / 1000,
                    };

                    if (trackRadius < minRadiusPx) minRadiusPx = trackRadius;
                    if (trackRadius > maxRadiusPx) maxRadiusPx = trackRadius;
                });
            });
        });
    });

    // Collision Repair
    let repairPass = 0;
    const placedPosList = Object.values(positions);
    const totalPlaced = placedPosList.length;

    while (repairPass < maxRepairPasses) {
        repairPass++;
        let repairsInPass = 0;
        for (let i = 0; i < totalPlaced; i++) {
            const posA = placedPosList[i];
            for (let j = i + 1; j < totalPlaced; j++) {
                const posB = placedPosList[j];
                if (checkAABBOverlap(posA, posB, effWidth, effHeight)) {
                    posB.track += 1;
                    posB.radius += trackSpacing;
                    posB.x = Math.round((center.x + posB.radius * Math.cos(posB.angle)) * 1000) / 1000;
                    posB.y = Math.round((center.y + posB.radius * Math.sin(posB.angle)) * 1000) / 1000;
                    repairsInPass++;
                }
            }
        }
        if (repairsInPass === 0) break;
    }

    const guideRings = [];
    for (let r = 0; r <= 5; r++) {
        guideRings.push({
            ringIndex: r,
            radiusPx: innerRadius + r * ringSpacing,
            label: `Ring ${r}`,
        });
    }

    return {
        positions,
        guides: {
            rings: guideRings,
            sectors: [],
        },
        diagnostics: {
            totalNodes: nodes.length,
            minRadiusPx: Number.isFinite(minRadiusPx) ? minRadiusPx : 0,
            maxRadiusPx,
        },
    };
}

// --- P1: Constellation Layout Engine ---

export function computeConstellationLayout(data = {}, options = {}) {
    const width = options.width ?? 900;
    const height = options.height ?? 900;
    const cx = options.cx ?? width / 2;
    const cy = options.cy ?? height / 2;
    const baseRadius = options.baseRadius ?? 180;
    const interRingGap = options.interRingGap ?? 120;
    const trackSpacing = options.trackSpacing ?? 40;
    const sparseThreshold = options.sparseThreshold ?? 30;
    const maxTrackCount = options.maxTrackCount ?? 4;
    const startAngleRad = options.startAngleRad ?? -Math.PI / 2;

    if (!data.focalNode) {
        return {
            focalPosition: null,
            nodePositions: {},
            edgePaths: [],
            ringGeometries: [],
            viewport: { width, height, cx, cy, baseRadius, interRingGap, trackSpacing, sparseThreshold },
        };
    }

    const focalPosition = {
        nodeId: data.focalNode.id,
        x: cx,
        y: cy,
        radius: 0,
        angleRad: 0,
        angleDeg: 0,
        hopDistance: 0,
        ringIndex: 0,
        trackIndex: 0,
        label: data.focalNode.displayName || data.focalNode.name || data.focalNode.id,
    };

    const nodePositions = {};
    nodePositions[data.focalNode.id] = focalPosition;
    const ringGeometries = [];
    let currentBaseRadius = baseRadius;

    const rings = Array.isArray(data.rings) ? data.rings : [];
    rings.forEach((ring, ringIdx) => {
        const hop = ring.hopDistance ?? (ringIdx + 1);
        const items = Array.isArray(ring.items) ? ring.items : [];
        const itemCount = items.length;

        const effectiveT = itemCount <= sparseThreshold ? 1 : maxTrackCount;
        const maxTrackNodes = Math.ceil(itemCount / effectiveT);
        let requiredMinRadius = currentBaseRadius;

        if (maxTrackNodes > 1) {
            const minChord = 34;
            const sinVal = Math.sin(Math.PI / maxTrackNodes);
            if (sinVal > 0) {
                requiredMinRadius = Math.max(currentBaseRadius, Math.ceil(minChord / (2 * sinVal)));
            }
        }
        currentBaseRadius = requiredMinRadius;

        if (ringIdx > 0) {
            const prevRing = rings[ringIdx - 1];
            const prevCount = (prevRing.items || []).length;
            const prevT = prevCount <= sparseThreshold ? 1 : maxTrackCount;
            const prevOuterRadius = currentBaseRadius + (prevT - 1) * trackSpacing;
            currentBaseRadius = Math.max(prevOuterRadius + interRingGap, requiredMinRadius);
        }

        for (let t = 0; t < effectiveT; t++) {
            ringGeometries.push({
                ringIndex: ring.ringIndex ?? (ringIdx + 1),
                hopDistance: hop,
                trackIndex: t,
                radius: currentBaseRadius + t * trackSpacing,
                cx,
                cy,
                label: t === 0 ? (ring.label || `Hop ${hop}`) : '',
            });
        }

        if (itemCount === 0) return;

        items.forEach((item, i) => {
            const t = i % effectiveT;
            const trackCount = Math.ceil(itemCount / effectiveT);
            const subTrackRadius = currentBaseRadius + t * trackSpacing;
            const angleStep = (2 * Math.PI) / trackCount;
            const indexInTrack = Math.floor(i / effectiveT);
            const angleRad = startAngleRad + indexInTrack * angleStep;
            let angleDeg = (angleRad * 180) / Math.PI;
            while (angleDeg < 0) angleDeg += 360;
            angleDeg = angleDeg % 360;

            const x = cx + subTrackRadius * Math.cos(angleRad);
            const y = cy + subTrackRadius * Math.sin(angleRad);

            nodePositions[item.nodeId] = {
                nodeId: item.nodeId,
                x: Number.isFinite(x) ? Math.round(x * 100) / 100 : cx,
                y: Number.isFinite(y) ? Math.round(y * 100) / 100 : cy,
                radius: subTrackRadius,
                angleRad,
                angleDeg,
                hopDistance: hop,
                ringIndex: ring.ringIndex ?? (ringIdx + 1),
                trackIndex: t,
                label: item.displayName || item.nodeId,
            };
        });
    });

    const edgePaths = [];
    const edges = Array.isArray(data.edges) ? data.edges : [];

    edges.forEach((edge) => {
        const sPos = nodePositions[edge.source];
        const tPos = nodePositions[edge.target];
        if (!sPos || !tPos) return;

        const sourceX = sPos.x;
        const sourceY = sPos.y;
        const targetX = tPos.x;
        const targetY = tPos.y;

        const midX = (sourceX + targetX) / 2;
        const midY = (sourceY + targetY) / 2;

        const pathSvg = `M ${sourceX.toFixed(2)} ${sourceY.toFixed(2)} Q ${midX.toFixed(2)} ${midY.toFixed(2)} ${targetX.toFixed(2)} ${targetY.toFixed(2)}`;

        edgePaths.push({
            edgeId: edge.edgeId || `${edge.source}-${edge.target}`,
            source: edge.source,
            target: edge.target,
            sourceX,
            sourceY,
            targetX,
            targetY,
            pathSvg,
        });
    });

    return {
        focalPosition,
        nodePositions,
        edgePaths,
        ringGeometries,
        viewport: { width, height, cx, cy, baseRadius, interRingGap, trackSpacing, sparseThreshold },
    };
}

// --- P2: Sankey / Dependency River Flow Layout Engine ---

export function computeSankeyLayout(data = {}, options = {}) {
    const canvasWidth = options.width ?? 1200;
    const canvasMinHeight = options.height ?? 700;
    const stagePaddingX = options.stagePaddingX ?? 40;
    const nodeWidth = options.nodeWidth ?? 180;
    const nodeMinHeight = options.nodeMinHeight ?? 48;
    const nodeMaxHeight = options.nodeMaxHeight ?? 180;
    const nodeGapY = options.nodeGapY ?? 16;
    const paddingY = options.paddingY ?? 60;

    const stages = Array.isArray(data.stages) ? data.stages : [];
    const numStages = stages.length;
    const usableWidth = canvasWidth - stagePaddingX * 2;
    const stageXSpacing = numStages > 1 ? (usableWidth - nodeWidth) / (numStages - 1) : 0;

    const stageGeometries = stages.map((stage, idx) => ({
        layer: stage.layer,
        label: stage.label || stage.layer,
        orderIndex: stage.orderIndex ?? idx,
        x: stagePaddingX + idx * stageXSpacing,
        width: nodeWidth,
    }));

    const nodeGeometryMap = new Map();
    const nodesGeometryList = [];
    const nodeMap = data.nodeMap instanceof Map ? data.nodeMap : new Map();

    let maxYEncountered = canvasMinHeight;

    stageGeometries.forEach((stageGeom, stageIdx) => {
        const stageInfo = stages[stageIdx];
        const featureIdsInStage = stageInfo.featureIds || [];
        let currentY = paddingY;

        featureIdsInStage.forEach(nodeId => {
            const node = nodeMap.get(nodeId) || { id: nodeId, totalInflow: 1, totalOutflow: 1 };
            const flowVolume = Math.max(node.totalInflow || 0, node.totalOutflow || 0, 1);
            const computedHeight = Math.min(
                nodeMaxHeight,
                Math.max(nodeMinHeight, nodeMinHeight + flowVolume * 8)
            );

            const nodeGeom = {
                nodeId: node.id,
                stageIndex: stageIdx,
                x: stageGeom.x,
                y: currentY,
                width: nodeWidth,
                height: computedHeight,
                flowVolume,
            };

            nodeGeometryMap.set(node.id, nodeGeom);
            nodesGeometryList.push(nodeGeom);
            currentY += computedHeight + nodeGapY;
        });

        if (currentY + paddingY > maxYEncountered) {
            maxYEncountered = currentY + paddingY;
        }
    });

    const flowsGeometryList = [];
    const flows = Array.isArray(data.flows) ? data.flows : [];

    flows.forEach((flow) => {
        const srcGeom = nodeGeometryMap.get(flow.sourceFeatureId);
        const tgtGeom = nodeGeometryMap.get(flow.targetFeatureId);
        if (!srcGeom || !tgtGeom) return;

        const strokeWidth = Math.min(24, Math.max(3, (flow.weight || 1) * 2.5));
        const srcX = srcGeom.x + srcGeom.width;
        const srcY = srcGeom.y + srcGeom.height / 2;
        const tgtX = tgtGeom.x;
        const tgtY = tgtGeom.y + tgtGeom.height / 2;

        const dx = tgtX - srcX;
        const controlDist = Math.max(40, dx * 0.45);
        const pathString = `M ${srcX} ${srcY} C ${srcX + controlDist} ${srcY}, ${tgtX - controlDist} ${tgtY}, ${tgtX} ${tgtY}`;

        flowsGeometryList.push({
            flowId: flow.id || `${flow.sourceFeatureId}-${flow.targetFeatureId}`,
            sourceFeatureId: flow.sourceFeatureId,
            targetFeatureId: flow.targetFeatureId,
            weight: flow.weight || 1,
            strokeWidth,
            sourceX: srcX,
            sourceY: srcY,
            targetX: tgtX,
            targetY: tgtY,
            pathString,
        });
    });

    return {
        width: canvasWidth,
        height: Math.max(canvasMinHeight, maxYEncountered),
        stages: stageGeometries,
        nodes: nodesGeometryList,
        flows: flowsGeometryList,
        nodeGeometryMap,
    };
}
