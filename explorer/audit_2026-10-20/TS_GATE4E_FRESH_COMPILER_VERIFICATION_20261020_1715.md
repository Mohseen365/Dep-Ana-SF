# TypeScript Fresh Compiler Verification (Gate 4E)

**Timestamp:** 2026-10-20 17:15 (local time)

---

## Repository Baseline

- **Branch:** `main`
- **HEAD:** `413dfcc58027b6c9ceb0d482584836109eabd924`
- **Git status (`git status --short`):**
```
 M explorer/package-lock.json
 M explorer/package.json
 M explorer/src/lib/architecture-layout.ts
 M explorer/src/types/explorer.ts
?? explorer/audit_2026-10-20/
?? explorer/tsconfig.test.json
```

---

## Compilation Command

```powershell
cd C:\Users\User\Downloads\dependency-analyzer\explorer
& .\node_modules\.bin\tsc -p tsconfig.json --noEmit
```

- **Exit code:** `1` (errors reported)

---

## Full TypeScript Diagnostic Output

```text
src/components/graph-internals/EdgeHoverCard.role.test.tsx(1,1): error TS6133: 'React' is declared but its value is never read.
src/components/graph-internals/EdgeHoverCard.role.test.tsx(13,7): error TS2322: Type '"calls"' is not assignable to type 'ExplorerRelationshipType'.
src/components/graph-internals/EdgeHoverCard.vscodeUrl.test.tsx(3,1): error TS6133: 'React' is declared but its value is never read.
src/components/graph-internals/EdgeHoverCard.vscodeUrl.test.tsx(13,7): error TS2322: Type '"calls"' is not assignable to type 'ExplorerRelationshipType'.
src/components/graph-internals/FeatureOverlayCanvas.debouncedHighlight.test.tsx(3,1): error TS6133: 'React' is declared but its value is never read.
src/components/graph-internals/FeatureOverlayCanvas.debouncedHighlight.test.tsx(19,5): error TS2739: Type '{ id: string; displayName: string; type: "ApexClass"; risk: "LOW"; metrics: { fanIn: number; fanOut: number; coupling: number; unresolved: number; score: number; }; }' is missing the following properties from type 'ExplorerNode': file, riskReasons, behavior, refactoringReadiness
src/components/graph-internals/FeatureOverlayCanvas.debouncedHighlight.test.tsx(26,5): error TS2739: Type '{ id: string; displayName: string; type: "ApexClass"; risk: "LOW"; metrics: { fanIn: number; fanOut: number; coupling: number; unresolved: number; score: number; }; }' is missing the following properties from type 'ExplorerNode': file, riskReasons, behavior, refactoringReadiness
src/components/graph-internals/FeatureOverlayCanvas.debouncedHighlight.test.tsx(38,5): error TS2322: Type 'Map<string, { id: string; name: string; primaryNodeIds: Set<string>; supportingNodeIds: Set<string>; sharedNodeIds: Set<string>; }>' is not assignable to type 'Map<string, FeatureCluster>'.
  Type '{ id: string; name: string; primaryNodeIds: Set<string>; supportingNodeIds: Set<string>; sharedNodeIds: Set<string>; }' is missing the following properties from type 'FeatureCluster': anchorNodeId, secondaryNodeIds, roleDistribution, domains, connectedFeatureIds
src/components/graph-internals/FeatureOverlayCanvas.debouncedHighlight.test.tsx(53,5): error TS2322: Type 'Map<string, { featureId: string; isPrimary: boolean; confidence: number; }>' is not assignable to type 'Map<string, FeatureAssignment>'.
  Type '{ featureId: string; isPrimary: boolean; confidence: number; }' is missing the following properties from type 'FeatureAssignment': nodeId, primaryFeatureId, secondaryFeatureIds, featureRole, isShared
src/components/graph-internals/FeatureOverlayCanvas.maxSeverity.test.tsx(3,1): error TS6133: 'React' is declared but its value is never read.
src/components/graph-internals/FeatureOverlayCanvas.maxSeverity.test.tsx(29,5): error TS2739: Type '{ id: string; displayName: string; type: "ApexClass"; risk: "LOW"; metrics: { fanIn: number; fanOut: number; coupling: number; unresolved: number; score: number; }; }' is missing the following properties from type 'ExplorerNode': file, riskReasons, behavior, refactoringReadiness
src/components/graph-internals/FeatureOverlayCanvas.orbitGuides.test.tsx(1,1): error TS6133: 'React' is declared but its value is never read.
src/components/graph-internals/FeatureOverlayCanvas.orbitGuides.test.tsx(38,9): error TS2322: Type '{ rings: { ringIndex: number; radiusPx: number; label: string; }[]; sectors: { sectorId: string; label: string; nodeCount: number; startAngleRad: number; endAngleRad: number; }[]; }' is not assignable to type 'OrbitGuideMetadata'.
  Types of property 'sectors' are incompatible.
    Type '{ sectorId: string; label: string; nodeCount: number; startAngleRad: number; endAngleRad: number; }[]' is not assignable to type 'OrbitGuideSector[]'.
      Type '{ sectorId: string; label: string; nodeCount: number; startAngleRad: number; endAngleRad: number; }' is missing the following properties from type 'OrbitGuideSector': sectorBodyAngleRad, sectorMarginAngleRad, usableStartAngleRad, usableEndAngleRad, usableAngleRad
src/components/graph-internals/FeatureOverlayCanvas.orbitGuides.test.tsx(86,9): error TS2322: Type '{ rings: never[]; sectors: { sectorId: string; label: string; nodeCount: number; startAngleRad: number; endAngleRad: number; }[]; }' is not assignable to type 'OrbitGuideMetadata'.
  Types of property 'sectors' are incompatible.
    Type '{ sectorId: string; label: string; nodeCount: number; startAngleRad: number; endAngleRad: number; }[]' is not assignable to type 'OrbitGuideSector[]'.
      Type '{ sectorId: string; label: string; nodeCount: number; startAngleRad: number; endAngleRad: number; }' is missing the following properties from type 'OrbitGuideSector': sectorBodyAngleRad, sectorMarginAngleRad, usableStartAngleRad, usableEndAngleRad, usableAngleRad
src/components/graph-internals/FeatureOverlayCanvas.vectorBadge.test.tsx(1,1): error TS6133: 'React' is declared but its value is never read.
src/components/graph-internals/FeatureOverlayCanvas.vectorBadge.test.tsx(19,7): error TS2740: Type '{ id: string; displayName: string; type: "ApexClass"; }' is missing the following properties from type 'ExplorerNode': file, metrics, risk, riskReasons, and 2 more.
src/components/graph-internals/FeatureOverlayCanvas.vectorBadge.test.tsx(23,7): error TS2739: Type '{ id: string; title: string; description: string; severity: "HIGH"; nodeIds: string[]; }' is missing the following properties from type 'ArchitectureFinding': type, edgeIds, evidence, provenance, rule
src/components/graph-internals/GraphErrorBoundary.test.tsx(5,7): error TS6133: 'ProblemChild' is declared but its value is never read.
src/components/graph-internals/HoverCardCopyUnmount.test.tsx(1,1): error TS6133: 'React' is declared but its value is never read.
src/components/graph-internals/HoverCardCopyUnmount.test.tsx(26,11): error TS2739: Type '{ id: string; displayName: string; type: "ApexClass"; file: string; }' is missing the following properties from type 'ExplorerNode': metrics, risk, riskReasons, behavior, refactoringReadiness
src/components/graph-internals/HoverCardCopyUnmount.test.tsx(46,72): error TS2322: Type '"calls"' is not assignable to type 'ExplorerRelationshipType'.
src/components/graph-internals/NodeHoverCard.maxSeverity.test.tsx(3,1): error TS6133: 'React' is declared but its value is never read.
src/components/graph-internals/NodeHoverCard.maxSeverity.test.tsx(20,9): error TS2739: Type '{ id: string; displayName: string; type: "ApexClass"; risk: "LOW"; metrics: { fanIn: number; fanOut: number; coupling: number; unresolved: number; score: number; }; }' is missing the following properties from type 'ExplorerNode': file, riskReasons, behavior, refactoringReadiness
src/components/graph-internals/NodeHoverCard.memo.test.tsx(1,1): error TS6133: 'React' is declared but its value is never read.
src/components/graph-internals/NodeHoverCard.memo.test.tsx(10,11): error TS2740: Type '{ id: string; displayName: string; type: "ApexClass"; }' is missing the following properties from type 'ExplorerNode': file, metrics, risk, riskReasons, and 2 more.
src/components/graph-internals/NodeHoverCard.memo.test.tsx(12,7): error TS2739: Type '{ id: string; title: string; description: string; severity: "HIGH"; nodeIds: string[]; }' is missing the following properties from type 'ArchitectureFinding': type, edgeIds, evidence, provenance, rule
src/components/graph-internals/NodeHoverCard.viewportResize.test.tsx(2,18): error TS6133: 'screen' is declared but its value is never read.
src/components/graph-internals/NodeHoverCard.viewportResize.test.tsx(3,1): error TS6133: 'React' is declared but its value is never read.
src/components/graph-internals/NodeHoverCard.viewportResize.test.tsx(28,9): error TS2739: Type '{ id: string; displayName: string; type: "ApexClass"; risk: "LOW"; metrics: { fanIn: number; fanOut: number; coupling: number; unresolved: number; score: number; }; }' is missing the following properties from type 'ExplorerNode': file, riskReasons, behavior, refactoringReadiness
src/components/GraphControls.test.tsx(256,11): error TS6133: 'centerSelected' is declared but its value is never read.
src/components/GraphControls.test.tsx(366,11): error TS6133: 'container' is declared but its value is never read.
src/components/GraphView.closurePolish.test.tsx(394,9): error TS2322: Type '(ExplorerNode | { id: string; displayName: string; type: "ApexClass"; file: string; metrics: { fanIn: number; fanOut: number; coupling: number; unresolved: number; score: number; }; risk: "LOW"; riskReasons: never[]; behavior: { ...; }; refactoringReadiness: { ...; }; })[]' is not assignable to type 'ExplorerNode[]'.
  Type 'ExplorerNode | { id: string; displayName: string; type: "ApexClass"; file: string; metrics: { fanIn: number; fanOut: number; coupling: number; unresolved: number; score: number; }; risk: "LOW"; riskReasons: never[]; behavior: { ...; }; refactoringReadiness: { ...; }; }' is not assignable to type 'ExplorerNode'.
    Types of property 'behavior.sharing' are incompatible.
      Type 'string' is not assignable to type '"with sharing" | "without sharing" | "inherited sharing" | null | undefined'.
src/components/GraphView.debugMemo.test.tsx(1,1): error TS6133: 'React' is declared but its value is never read.
src/components/GraphView.debugMemo.test.tsx(3,32): error TS6133: 'vi' is declared but its value is never read.
src/components/GraphView.debugMemo.test.tsx(34,17): error TS2739: Type '{ id: string; displayName: string; type: string; metrics: { fanIn: number; fanOut: number; coupling: number; instability: number; cyclomaticComplexity: number; }; refactoringReadiness: { hasCycles: boolean; hasUnresolved: boolean; readinessScore: number; }; }' is missing the following properties from type 'ExplorerNode': file, risk, riskReasons, behavior
src/components/GraphView.debugMemo.test.tsx(47,17): error TS2739: Type '{ id: string; displayName: string; type: string; metrics: { fanIn: number; fanOut: number; coupling: number; instability: number; cyclomaticComplexity: number; }; refactoringReadiness: { hasCycles: boolean; hasUnresolved: boolean; readinessScore: number; }; }' is missing the following properties from type 'ExplorerNode': file, risk, riskReasons, behavior
src/components/GraphView.enableOverlay.test.tsx(1,1): error TS6133: 'React' is declared but its value is never read.
src/components/GraphView.enableOverlay.test.tsx(18,17): error TS2739: Type '{ id: string; displayName: string; type: string; metrics: { fanIn: number; fanOut: number; coupling: number; instability: number; cyclomaticComplexity: number; }; refactoringReadiness: { hasCycles: boolean; hasUnresolved: boolean; readinessScore: number; }; }' is missing the following properties from type 'ExplorerNode': file, risk, riskReasons, behavior
src/components/GraphView.enableOverlay.test.tsx(43,17): error TS2739: Type '{ id: string; displayName: string; type: string; metrics: { fanIn: number; fanOut: number; coupling: number; instability: number; cyclomaticComplexity: number; }; refactoringReadiness: { hasCycles: boolean; hasUnresolved: boolean; readinessScore: number; }; }' is missing the following properties from type 'ExplorerNode': file, risk, riskReasons, behavior
src/components/GraphView.fix12.test.tsx(3,1): error TS6133: 'React' is declared but its value is never read.
src/components/GraphView.fix12.test.tsx(8,29): error TS6133: 'mockCy' is declared but its value is never read.
src/components/GraphView.fix12.test.tsx(77,7): error TS2820: Type '"UNCOVERED"' is not assignable to type '"UNTESTED" | "COVERED" | "NO_TESTS" | "AMBIGUOUS" | "FULL_COVERAGE" | "PARTIAL_COVERAGE"'. Did you mean '"COVERED"'?
src/components/GraphView.fix13.test.tsx(3,1): error TS6133: 'React' is declared but its value is never read.
src/components/GraphView.fix13.test.tsx(5,29): error TS6196: 'ExplorerEdge' is declared but never used.
src/components/GraphView.fix13.test.tsx(8,9): error TS6133: 'mockElementsRemove' is declared but its value is never read.
src/components/GraphView.fix13.test.tsx(8,76): error TS6133: 'layoutStopListeners' is declared but its value is never read.
src/components/GraphView.fix13.test.tsx(89,7): error TS2820: Type '"UNCOVERED"' is not assignable to type '"UNTESTED" | "COVERED" | "NO_TESTS" | "AMBIGUOUS" | "FULL_COVERAGE" | "PARTIAL_COVERAGE"'. Did you mean '"COVERED"'?
src/components/GraphView.fix13.test.tsx(105,7): error TS2820: Type '"UNCOVERED"' is not assignable to type '"UNTESTED" | "COVERED" | "NO_TESTS" | "AMBIGUOUS" | "FULL_COVERAGE" | "PARTIAL_COVERAGE"'. Did you mean '"COVERED"'?
src/components/GraphView.fix13.test.tsx(118,7): error TS2820: Type '"UNCOVERED"' is not assignable to type '"UNTESTED" | "COVERED" | "NO_TESTS" | "AMBIGUOUS" | "FULL_COVERAGE" | "PARTIAL_COVERAGE"'. Did you mean '"COVERED"'?
src/components/GraphView.fix14.test.tsx(3,1): error TS6133: 'React' is declared but its value is never read.
src/components/GraphView.fix14.test.tsx(8,9): error TS6133: 'mockCy' is declared but its value is never read.
src/components/GraphView.fix14.test.tsx(76,7): error TS2322: Type '{ id: string; displayName: string; type: "ApexClass"; risk: "LOW"; metrics: { fanIn: number; fanOut: number; coupling: number; unresolved: number; score: number; }; refactoringReadiness: { hasCycles: false; hasUnresolved: false; isHighRisk: false; testCoverageStatus: "UNCOVERED"; }; }[]' is not assignable to type 'ExplorerNode[]'.
  Type '{ id: string; displayName: string; type: "ApexClass"; risk: "LOW"; metrics: { fanIn: number; fanOut: number; coupling: number; unresolved: number; score: number; }; refactoringReadiness: { hasCycles: false; hasUnresolved: false; isHighRisk: false; testCoverageStatus: "UNCOVERED"; }; }' is missing the following properties from type 'ExplorerNode': file, riskReasons, behavior
src/components/GraphView.fix14.test.tsx(90,7): error TS2322: Type '{ id: string; source: string; target: string; relationshipType: "method-call"; }[]' is not assignable to type 'ExplorerEdge[]'.
  Type '{ id: string; source: string; target: string; relationshipType: "method-call"; }' is missing the following properties from type 'ExplorerEdge': method, evidence, unresolved, resolutionClassification, and 7 more.
src/components/GraphView.fix17.test.tsx(3,1): error TS6133: 'React' is declared but its value is never read.
src/components/GraphView.fix17.test.tsx(5,29): error TS6196: 'ExplorerEdge' is declared but never used.
src/components/GraphView.fix17.test.tsx(77,7): error TS2820: Type '"UNCOVERED"' is not assignable to type '"UNTESTED" | "COVERED" | "NO_TESTS" | "AMBIGUOUS" | "FULL_COVERAGE" | "PARTIAL_COVERAGE"'. Did you mean '"COVERED"'?
src/components/GraphView.fix17.test.tsx(90,7): error TS2820: Type '"UNCOVERED"' is not assignable to type '"UNTESTED" | "COVERED" | "NO_TESTS" | "AMBIGUOUS" | "FULL_COVERAGE" | "PARTIAL_COVERAGE"'. Did you mean '"COVERED"'?
src/components/GraphView.hoverCardLiveEntity.test.tsx(2,18): error TS6133: 'screen' is declared but its value is never read.
src/components/GraphView.hoverCardLiveEntity.test.tsx(3,1): error TS6133: 'React' is declared but its value is never read.
src/components/GraphView.hoverCardLiveEntity.test.tsx(61,9): error TS2739: Type '{ id: string; displayName: string; type: "ApexClass"; risk: "LOW"; metrics: { fanIn: number; fanOut: number; coupling: number; unresolved: number; score: number; }; refactoringReadiness: { isHighRisk: false; hasCycles: false; hasUnresolved: false; testCoverageStatus: "COVERED"; }; }' is missing the following properties from type 'ExplorerNode': file, riskReasons, behavior
src/components/GraphView.hoverCardLiveEntity.test.tsx(75,9): error TS2739: Type '{ id: string; displayName: string; type: "ApexClass"; risk: "LOW"; metrics: { fanIn: number; fanOut: number; coupling: number; unresolved: number; score: number; }; refactoringReadiness: { isHighRisk: false; hasCycles: false; hasUnresolved: false; testCoverageStatus: "COVERED"; }; }' is missing the following properties from type 'ExplorerNode': file, riskReasons, behavior
src/components/GraphView.hoverCardLiveEntity.test.tsx(93,5): error TS2322: Type '"calls"' is not assignable to type 'ExplorerRelationshipType'.
src/components/GraphView.hoverCardLiveEntity.test.tsx(134,9): error TS2353: Object literal may only specify known properties, and 'category' does not exist in type 'ArchitectureFinding'.
src/components/GraphView.runtimeIntegration.test.tsx(74,11): error TS2339: Property 'removeClass' does not exist on type 'any[]'.
src/components/GraphView.runtimeIntegration.test.tsx(75,11): error TS2339: Property 'addClass' does not exist on type 'any[]'.
src/components/GraphView.runtimeIntegration.test.tsx(76,11): error TS2339: Property 'toArray' does not exist on type 'any[]'.
src/components/GraphView.runtimeIntegration.test.tsx(77,11): error TS2339: Property 'empty' does not exist on type 'any[]'.
src/components/InvestigationDrawer.tsx(408,16): error TS18048: 'node.behavior.calloutCount' is possibly 'undefined'.
src/components/Phase1C_Accessibility.test.tsx(268,10): error TS2304: Cannot find name 'GraphErrorBoundary'.
src/components/Phase1C_Accessibility.test.tsx(270,11): error TS2304: Cannot find name 'GraphErrorBoundary'.
src/components/Phase1C_Accessibility.test.tsx(288,10): error TS2304: Cannot find name 'GraphErrorBoundary'.
src/components/Phase1C_Accessibility.test.tsx(290,11): error TS2304: Cannot find name 'GraphErrorBoundary'.
src/hooks/useViewState.fix15.test.tsx(14,5): error TS2322: Type 'Location' is not assignable to type 'string & Location'.
  Type 'Location' is not assignable to type 'string'.
src/hooks/useViewState.fix16.test.tsx(13,5): error TS2322: Type 'Location' is not assignable to type 'string & Location'.
  Type 'Location' is not assignable to type 'string'.
src/lib/architecture-layout.ts(116,9): error TS2322: Type '{ metrics: { fanIn: number; fanOut: number; coupling: number; unresolved: number; score: number; }; behavior: { asyncPatterns: string[]; isTest: boolean; sharing?: "with sharing" | "without sharing" | "inherited sharing" | null; ... 4 more ...; calloutCount?: number | undefined; } | { ...; }; ... 8 more ...' is not assignable to type 'ExplorerNode[]'.
  Type '{ metrics: { fanIn: number; fanOut: number; coupling: number; unresolved: number; score: number; }; behavior: { asyncPatterns: string[]; isTest: boolean; sharing?: "with sharing" | "without sharing" | "inherited sharing" | null; ... 4 more ...; calloutCount?: number; } | { ...; }; ... 8 more ...; risk: ExplorerRiskL...' is not assignable to type 'ExplorerNode'.
    Types of property 'refactoringReadiness' are incompatible.
      Type '{ isHighRisk: boolean; hasCycles: boolean; hasUnresolved: boolean; testCoverageStatus: "UNTESTED" | "COVERED" | "NO_TESTS" | "AMBIGUOUS" | "FULL_COVERAGE" | "PARTIAL_COVERAGE"; } | undefined' is not assignable to type '{ isHighRisk: boolean; hasCycles: boolean; hasUnresolved: boolean; testCoverageStatus: "UNTESTED" | "COVERED"; }'.
        Type 'undefined' is not assignable.
src/lib/graph-builder.test.ts(255,94): error TS2322: Type '"NOT_COVERED"' is not assignable to type '"UNTESTED" | "COVERED" | "NO_TESTS" | "AMBU...'
src/lib/graph-builder.test.ts(266,94): error TS2322: Type '"NOT_COVERED"' is not assignable to type '"UNTESTED" | "COVERED" | "...'
src/lib/graph-layout.test.ts(65,7): error TS2322: Type '"dependency"' is not assignable to type 'ExplorerRelationshipType'.
src/lib/graph-layout.test.ts(79,25): error TS2322: Type '"dependency"' is not assignable to type 'ExplorerRelationshipType'.
src/lib/highlight-state.ts(287,22): error TS2339: Property 'isEdge' does not exist on type 'never'.
src/lib/highlight-state.ts(310,22): error TS2339: Property 'isEdge' does not exist on type 'never'.
src/lib/layout/layers.ts(134,9): error TS18048: 'node.behavior.queryCount' is possibly 'undefined'.
src/lib/layout/layers.ts(134,41): error TS18048: 'node.behavior.dmlCount' is possibly 'undefined'.
src/test/_layer_violation_analysis.test.ts(4,10): error TS2459: Module '"../lib/layout/metrics"' declares 'getLayerRank' locally, but it is not exported.
src/test/_layer_violation_diagnostic.test.ts(5,49): error TS2307: Cannot find module '../../types/explorer' or its corresponding type declarations.
src/test/_layer_violation_verification.test.ts(4,10): error TS2459: Module '"../lib/layout/metrics"' declares 'getLayerRank' locally, but it is not exported.
src/test/architecture-layout-remediation.test.ts(38,5): error TS2322: Type '"calls"' is not assignable to type 'ExplorerRelationshipType'.
src/test/layer_violation_test.test.ts(20,7): error TS2740: Type '{ id: string; type: "ApexClass"; displayName: string; }' is missing the following properties from type 'ExplorerNode': file, metrics, risk, riskReasons, and 2 more.
src/test/layer_violation_test.test.ts(21,7): error TS2740: Type '{ id: string; type: "LWC"; displayName: string; }' is missing the following properties from type 'ExplorerNode': file, metrics, risk, riskReasons, and 2 more.
src/test/layer_violation_test.test.ts(23,36): error TS2740: Type '{ source: string; target: string; }' is missing the following properties from type 'ExplorerEdge': id, relationshipType, method, evidence, and 9 more.
src/test/layer_violation_test.test.ts(34,7): error TS2740: Type '{ id: string; type: "ApexClass"; displayName: string; }' is missing the following properties from type 'ExplorerNode': file, metrics, risk, riskReasons, and 2 more.
src/test/layer_violation_test.test.ts(35,7): error TS2740: Type '{ id: string; type: "LWC"; displayName: string; }' is missing the following properties from type 'ExplorerNode': file, metrics, risk, riskReasons, and 2 more.
src/test/layer_violation_test.test.ts(37,36): error TS2740: Type '{ source: string; target: string; }' is missing the following properties from type 'ExplorerEdge': id, relationshipType, method, evidence, and 9 more.
src/test/RegressionAcceptance.test.tsx(19,11): error TS2339: Property 'removeClass' does not exist on type 'any[]'.
src/test/RegressionAcceptance.test.tsx(20,11): error TS2339: Property 'addClass' does not exist on type 'any[]'.
src/test/RegressionAcceptance.test.tsx(21,11): error TS2339: Property 'unselect' does not exist on type 'any[]'.
src/test/RegressionUnexpected.test.tsx(22,11): error TS2339: Property 'remove' does not exist on type 'any[]'.
src/test/RegressionUnexpected.test.tsx(23,11): error TS2339: Property 'toArray' does not exist on type 'any[]'.
src/test/RegressionUnexpected.test.tsx(24,11): error TS2339: Property 'empty' does not exist on type 'any[]'.
src/test/RegressionUnexpected.test.tsx(31,11): error TS2339: Property 'removeClass' does not exist on type 'any[]'.
src/test/RegressionUnexpected.test.tsx(32,11): error TS2339: Property 'addClass' does not exist on type 'any[]'.
src/test/RegressionUnexpected.test.tsx(33,11): error TS2339: Property 'toArray' does not exist on type 'any[]'.
src/test/RegressionUnexpected.test.tsx(34,11): error TS2339: Property 'empty' does not exist on type 'any[]'.
src/test/RegressionUnexpected.test.tsx(39,11): error TS2339: Property 'removeClass' does not exist on type 'any[]'.
src/test/RegressionUnexpected.test.tsx(40,11): error TS9339: Property 'addClass' does not exist on type 'any[]'.
src/test/RegressionUnexpected.test.tsx(41,11): error TS9339: Property 'toArray' does not exist on type 'any[]'.
src/test/RegressionUnexpected.test.tsx(42,11): error TS9339: Property 'empty' does not exist on type 'any[]'.
src/test/stage7-single-pass-x-center-ab.test.ts(1400,33): error TS6133: 'nodeCount' is declared but its value is never read.
src/test/stage7-single-pass-x-center-ab.test.ts(1400,44): error TS6133: 'edgeCount' is declared but its value is never read.
src/test/UrlSyncAndOverlayRegression.test.ts(15,1): error TS6133: 'deriveFeatureCompositionGroups' is declared but its value is never read.
src/test/UrlSyncAndOverlayRegression.test.ts(16,1): error TS6133: 'getSharedHighlightData' is declared but its value is never read.
src/test/UrlSyncAndOverlayRegression.test.ts(38,9): error TS2353: Object literal may only specify known properties, and 'score' does not exist in type '{ isHighRisk: boolean; hasCycles: boolean; hasUnresolved: boolean; testCoverageStatus: "UNTESTED" | "COVERED" | "NO_TESTS" | "AMBIGUOUS" | "FULL_COVERAGE" | "PARTIAL_COVERAGE"; }'.
```

---

## Targeted Diagnostic Summary (six production diagnostics originally highlighted)

| # | File / Location | Diagnostic | Status after Gates 4A‑4D | Notes |
|---|----------------|------------|---------------------------|-------|
| 1 | `src/types/explorer.ts` – TS2304 (`ArchitectureLayer` missing) | Import added (`import type { ArchitectureLayer } from "../lib/layout/types"`) | **Resolved** | ✅ Import now present. |
| 2 | `src/lib/architecture‑layout.ts` – TS2322 (behavior compatibility) | Fallback `{ isTest: false }` only covers one path; other branches still produce `undefined` behavior. | **Unresolved** | ⚠️ Runtime may still receive nodes without required `behavior`. |
| 3 | `src/lib/architecture‑layout.ts` – TS2367 (unresolved‑edge comparison) | Comparison `e.relationshipType === 'unresolved'` still mismatches `ExplorerRelationshipType`. | **Unresolved** | ⚠️ Requires extending `ExplorerRelationshipType` or guarding the value. |
| 4 | `src/lib/highlight-state.ts` – TS2339 (`isEdge` on `never`) | Errors persist on lines 287 and 310. | **Unresolved** | ⚠️ Suggest a Cytoscape type‑guard helper. |
| 5 | `src/components/InvestigationDrawer.tsx` – TS18048 (`node.behavior.calloutCount` possibly undefined) | Warning still present. | **Unresolved** | ⚠️ Guard or make `calloutCount` required. |
| 6 | `src/lib/layout/layers.ts` – TS18048 (`node.behavior.queryCount` / `dmlCount` possibly undefined) | Warnings still present. | **Unresolved** | ⚠️ Guard or provide defaults. |

---

## Recommendations

1. **High‑impact, low‑risk fix**: Introduce a small Cytoscape element type‑guard (e.g., `function isEdge(ele: cytoscape.Element): ele is cytoscape.EdgeSingular { return ele.isEdge?.() ?? false; }`) and replace direct `isEdge` accesses in `highlight-state.ts`. This would eliminate the TS2339 errors.
2. **Behavior contract**: Either make `ExplorerNodeBehavior` required in all production code paths or add explicit runtime checks before using `node.behavior`. This resolves the TS2322 issue.
3. **Unresolved‑edge type**: Extend `ExplorerRelationshipType` to include `'unresolved'` (or guard the comparison). Updating the enum in `src/types/explorer.ts` and related tests will clear TS2367.
4. **Optional behavior fields**: Provide defaults for `calloutCount`, `queryCount`, and `dmlCount` in the node‑creation logic, or add optional chaining (`node.behavior?.calloutCount ?? 0`).
5. **Run a follow‑up verification** after applying any of the above fixes to confirm that the production diagnostics are fully resolved.

---

*This report was generated automatically as part of Gate 4E of the TypeScript remediation audit.*
