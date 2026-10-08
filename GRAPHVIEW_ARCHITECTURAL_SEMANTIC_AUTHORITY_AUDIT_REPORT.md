GRAPHVIEW — ARCHITECTURAL SEMANTIC AUTHORITY AUDIT
DOMAIN + LAYER TRUTH / HEURISTIC CLASSIFICATION CHALLENGE
FINAL SEMANTIC FOUNDATION GATE — READ ONLY — NO CODE CHANGES
1. ABSOLUTE RULES COMPLIANCE
This audit was conducted strictly under READ ONLY conditions:

Zero code changes were made to explorer/src/ or any other directory.
Zero tests were modified or added.
Zero implementation files or patches were created.
Zero repository state was altered (git status clean).
2. REQUIRED MATERIAL RECONCILIATION
The four required foundational reports were evaluated as prior hypotheses against direct repository evidence:

GRAPHVIEW — ARCHITECTURE ORBIT + COMPONENT CONSTELLATION FUNDAMENTAL PRINCIPLES & MODEL AUDIT REPORT: Identified bypassed global Orbit layout code (architecture-layout.ts:120), dual un-orchestrated Constellation systems, and hardcoded dataset strings.
GRAPHVIEW_SECOND_ORDER_VISUAL_MODEL_VALIDATION_REPORT.md: Disproved radial global architecture (inner-ring capacity choking, false center) and separated single-focal vs multi-sun lenses.
GRAPHVIEW_FINAL_VISUAL_MODEL_CONTRACT_GATE_REPORT.md: Established the 3 non-overlapping visual lenses (Global Flow Map, Focal Dependency Neighborhood, Shared Infrastructure Topology) and 4 pre-implementation freeze conditions.
GRAPHVIEW_FINAL_PRE_IMPLEMENTATION_TRUTH_AUDIT_REPORT.md: Verified that discoverDomains() is a naming-convention heuristic, NOT source-authored domain truth.
3. PRIMARY QUESTION ANSWER
Does the repository contain enough authoritative semantic information to justify placing nodes into architectural layers and subsystem-domain columns as primary spatial encodings?

ANSWER: B — PARTIALLY
Rationale: The repository contains deterministic, highly valuable, and empirically useful derived classifications (discoverDomains() in domains.ts and classifyNodeLayer() in layers.ts). However, these are derived heuristics based on string naming conventions, directory paths, and Salesforce node types—NOT source-authored business domain or architectural layer metadata from developer declarations.

GraphView IS ALLOWED to encode these classifications spatially on $X$ and $Y$ axes, but ONLY AS A DERIVED ARCHITECTURAL INTERPRETATION, and MUST NOT present them as canonical source-authored architecture truth without explicit UI labeling/disclaimers.

4. IMPORTANT SEMANTIC DISTINCTIONS
To prevent semantic conflation, the repository facts are disentangled into distinct tiers:

NAME                     → Raw string identifier (e.g. "BillingService")
TYPE                     → Salesforce metadata type (e.g. ApexClass, CustomObject, LWC)
ROLE                     → Architectural stereotype (e.g. Controller, Service, Selector, DAO)
PATH                     → File system directory location (e.g. "force-app/main/default/classes/")
SUBSYSTEM                → Coarse structural grouping (e.g. "Billing")
DOMAIN                   → Logical business capability boundary
FEATURE                  → Functional user-facing capability cluster
ARCHITECTURAL LAYER      → Call-stack execution tier (Presentation -> Application -> Domain -> Schema)
DEPENDENCY RELATIONSHIP  → Static or dynamic link between components (SOQL, method call, RPC, import)
BUSINESS SEMANTICS       → Authoritative product-defined business intent (NOT present in repo)
5. SEMANTIC AUTHORITY MATRIX
Concept	Current Source	How Derived	Source-Authored?	Stable?	Deterministic?	Semantically Authoritative?	Safe for Spatial Encoding?
Node Identity	node.id	Source metadata parse	YES	YES	YES	YES	YES (Canonical key)
Node Type	node.type	AST / Salesforce file extension	YES	YES	YES	YES	YES (Technical shape)
Node Role	classifyFeatureRole() / layers.ts	Suffix regex & behavior counts	NO	MEDIUM	YES	NO (Heuristic)	YES (Secondary badge)
Subsystem	extractDomainStem()	String suffix stripping	NO	LOW	YES	NO (Heuristic)	DERIVED ONLY
Domain	discoverDomains()	Multi-pass name + path + graph cohesion	NO	MEDIUM	YES	NO (Heuristic)	DERIVED ONLY (With disclaimer)
Feature	discoverFeatures()	Modular community clustering	NO	MEDIUM	YES	NO (Graph topology)	DERIVED ONLY
Architectural Layer	classifyNodeLayer()	Priority rule cascade (Type > Path > Behavior > Suffix)	NO	HIGH	YES	PARTIALLY (Type-bound)	DERIVED ONLY (Y-axis band)
Dependency Direction	edge.source -> edge.target	Static analysis AST parse	YES	YES	YES	YES	YES (Directed edge)
Entry Point	entryPoints / type === LWC | ApexTrigger	AST root inspection	YES	YES	YES	YES	YES (Root anchor)
6. DOMAIN TRUTH AUDIT
6.1 Trace discoverDomains() Algorithm
Source Reference: explorer/src/lib/layout/domains.ts:200-362

raw node (ExplorerNode)
 ↓
Pass 1: Direct Signals
 ├─ Salesforce Object? (Object/CustomObject) → Assign Clean Object Name [HIGH Confidence]
 ├─ Folder Path + Name Stem Match? → Assign Name Stem [HIGH Confidence]
 ├─ Folder Path Signal? (extractDomainFromPath) → Assign Path Domain [HIGH Confidence]
 └─ Name Stem Signal? (extractDomainStem) → Assign Name Stem [MEDIUM Confidence]
 ↓
Pass 2: Field & Test Inheritance
 ├─ Field Node? → Inherit domain from parent Object via findParentObject [HIGH Confidence]
 └─ Test Node? → Inherit domain from production target via findProductionTarget [HIGH Confidence]
 ↓
Pass 3: Graph Neighborhood Cohesion
 ├─ 1 Connected Non-Shared Domain? → Inherit Neighbor Domain [MEDIUM Confidence]
 └─ ≥2 Connected Non-Shared Domains? → Assign 'Shared' [HIGH Confidence]
 ↓
Pass 4: Fallback
 └─ Unassigned Node → Assign 'Shared' [LOW Confidence]
 ↓
Pass 5: Final Assembly
 └─ Sort all domains: 'Shared' first, then alphabetical → Assign X-axis columns
Consumed Inputs: node.displayName, node.id, node.type, node.file, node.behavior, edges. Ignored Inputs: Business domain metadata (does not exist), git commit history, package manifests. Authority Classification: 100% naming-convention and structural heuristic engine. Zero source-authored business domain metadata.

7. DOMAIN HEURISTIC FALSIFICATION
Adversarial testing of discoverDomains() against standard component name structures:

Example A: BillingService, BillingController, BillingSelector
extractDomainStem() strips suffixes Service, Controller, Selector, yielding candidate stem 'Billing'.
Classification: Domain 'Billing' [MEDIUM/HIGH Confidence].
Verdict: PASS (matches developer naming intention).
Example B: CustomerService, CustomerSupportService, CustomerServiceHelper
CustomerService → Stem stripped of Service → Domain 'Customer'.
CustomerSupportService → Stem stripped of Service → Domain 'CustomerSupport'.
CustomerServiceHelper → Suffix Helper stripped → Candidate 'CustomerService'. Non-recursive stripping stops!
Classification: CustomerService maps to 'Customer', while CustomerServiceHelper maps to 'CustomerService'.
Verdict: FAIL (SPLIT REGRESSION). Two tightly bound components in the same feature are artificially split into two separate derived domains purely due to non-recursive suffix stripping.
Example C: SharedService, CommonRepository, PlatformUtils
SharedService → Stem 'Shared' matched in GENERIC_STEMS → Returns null → Pass 4 fallback to 'Shared'.
CommonRepository → Stem 'Common' matched in GENERIC_STEMS → Returns null → Pass 4 fallback to 'Shared'.
PlatformUtils → Stem 'Platform' is NOT in GENERIC_STEMS → Assigned Domain 'Platform'.
Verdict: FAIL (INCONSISTENT FALLBACK). Generic utilities are arbitrarily split between 'Shared' column and a pseudo-domain 'Platform'.
Example D: FooBar, XYZManager, ABCProcessor
FooBar → No architectural suffix → Candidate stem 'FooBar'.
XYZManager → Strips Manager → Candidate stem 'XYZ'.
ABCProcessor → Strips Processor → Candidate stem 'ABC'.
Verdict: FAIL (NOISE GENERATION). Unrelated utility classes spawn 3 separate domain columns ('FooBar', 'XYZ', 'ABC') with zero business domain semantic backing.
Example E: Shared Service with degree Billing=10, Support=9, Inventory=8
discoverDomains() Pass 3 sees neighbors in 3 distinct domains (Billing, Support, Inventory).
Since neighborDomains.size >= 2, Pass 3 assigns domain 'Shared' unconditionally.
Verdict: It does NOT use connection degree to force single-domain ownership. Pass 3 correctly identifies cross-cutting infrastructure, but classifies it coarsely as 'Shared'.
8. DOMAIN COLLISION AUDIT
Abbreviation Collisions: AService, AController, ARepository all produce derived domain 'A'. If 'A' represents Account in one module and Audit or Asset in another, unrelated components collide into column 'A'.
Feature Splitting: As demonstrated in Example B, CustomerService (Domain 'Customer') and CustomerServiceHelper (Domain 'CustomerService') are split into distinct columns despite serving the exact same functional capability.
9. MULTI-DOMAIN COMPONENT AUDIT
Prior audits hypothesized that multi-domain components should be assigned to the domain with the highest degree. Adversarial Challenge: Graph degree measures coupling density, NOT architectural ownership. A generic logging or notification service connected 50 times to Billing and 2 times to Security is not a "Billing component"—it is core infrastructure.

Multi-Domain Placement Contract:

Primary Spatial Rule: Components connected to $\ge 2$ distinct non-Shared domains MUST be placed in an explicit Shared / Infrastructure column.
Secondary Projection (Product Option): Replicated visual ghost nodes or boundary node highlights MAY be toggled on by user presentation controls, but primary spatial coordinates MUST NOT assign shared components to a single domain based on connection count.
10. DOMAIN ORDERING AUDIT
Current implementation orders domains lexicographically: ['Shared', 'A', 'Billing', 'Inventory', 'Support'].

Semantic Fact: Alphabetical order contains ZERO architectural flow meaning.
Spatial Contract: The $X$-axis in the Global Architecture Flow Map is CATEGORICAL, NOT metric or ordinal.
Ordering Policy:
Default: Shared column at $X=0$ (left boundary), followed by alphabetical domain columns.
Presentation Override: User/Product MAY re-order domain columns on $X$, but geometry engine MUST treat $X$-spacing as categorical column slots with fixed padding.
11. ARCHITECTURAL LAYER TRUTH AUDIT
Source Reference: explorer/src/lib/layout/layers.ts:38-142

classifyNodeLayer() evaluates a node through a strict priority cascade:

Node Type Match:
Object, CustomObject, Field, CustomField, External $\rightarrow$ 'schema' (Confidence 1.0)
LWC, Visualforce $\rightarrow$ 'presentation' (Confidence 1.0)
ApexTrigger, Flow $\rightarrow$ 'application' (Confidence 1.0)
Test Context: Inherits target production node layer (Confidence 0.9–0.95).
File Path: /lwc/, /aura/, /pages/ $\rightarrow$ 'presentation' (Confidence 0.9).
Behavior: asyncPatterns $\rightarrow$ 'application' (0.85); queryCount > 0 \|\| dmlCount > 0 $\rightarrow$ 'domain' (0.80).
Name Suffix Regex: Controller $\rightarrow$ 'application' (0.85); Selector/Repository $\rightarrow$ 'domain' (0.85).
Deterministic Fallback: 'application' (Confidence 0.50).
12. CHALLENGE THE LAYER MAPPING (23 TYPES/ROLES)
Entity Type / Role	Technical Type?	Architectural Role?	Reliable Layer Indicator?	Primary Layer Assignment	Ambiguity Risk
LWC	YES	Presentation	YES (1.0)	presentation	Low
Aura	YES	Presentation	YES (1.0)	presentation	Low
Visualforce	YES	Presentation	YES (1.0)	presentation	Low
Component	NO	Generic UI / Logic	PARTIALLY	presentation	Medium
ApexTrigger	YES	Application Entry	YES (1.0)	application	Low
Flow	YES	Application Process	YES (1.0)	application	Low
Workflow	YES	Application Process	YES (1.0)	application	Low
ApexClass	YES	AMBIGUOUS	NO	application (Fallback)	HIGH
Controller	NO	App UI Bridge	YES (0.85)	application	Low
Service	NO	App Business Logic	YES (0.85)	application	Low
Selector	NO	Domain Data Query	YES (0.85)	domain	Low
Repository	NO	Domain Data Persistence	YES (0.85)	domain	Low
DAO	NO	Domain Data Access	YES (0.85)	domain	Low
Model	NO	Domain Entity	YES (0.85)	domain	Low
DTO / VO	NO	Data Transfer	YES (0.85)	domain	Low
CustomObject	YES	Database Table	YES (1.0)	schema	Low
StandardObject	YES	Database Table	YES (1.0)	schema	Low
CustomField	YES	Database Column	YES (1.0)	schema	Low
External	YES	External Schema	YES (1.0)	schema	Low
Test	NO	Quality Assurance	NO	Excluded / Auxiliary	High if placed in vertical call stack
Utility	NO	Helper	NO	application / Shared	High
Mock	NO	Test Double	NO	Excluded / Auxiliary	High
13. APEX CLASS AMBIGUITY TEST
ApexClass is a generic technical container in Salesforce. It can be a UI Controller, Business Service, Domain Selector, DAO, DTO, Utility, or Test.

If an ApexClass is named TaxCalculator with 0 queries and 0 async patterns:
Priority 1-4 fail to match.
Suffix regex fails to match.
Fallback triggers: assigned to 'application' layer with Confidence 0.50.
Conclusion: ApexClass layer assignment is HEURISTIC AND INCOMPLETE. The system relies on deterministic fallback for non-conventionally named classes.
14. CROSS-LAYER VIOLATION TEST
Inspection of Salesforce dependency graphs reveals frequent "cross-layer" edges:

LWC -> CustomField (via @salesforce/schema/Account.Name static import).
ApexTrigger -> CustomObject (via database event binding).
ApexClass (Service) -> LWC (via Platform Event or Streaming API notification).
Semantic Evaluation:

Direct field imports in LWCs are Salesforce best-practice compile-time schema bindings, NOT architectural layer call-stack violations.
Labeling these edges as "architectural layer violations" in a UI visualization is semantically false.
Edges MUST be categorized by relationshipType before checking layer boundary compliance.
15. CYCLE TEST
Does the canonical graph contain cycles?

YES. Real-world enterprise Salesforce codebases contain cyclic dependencies (e.g., Class A calls Class B, which references Class A; or circular trigger/handler references).
Canonical Graph $G = (V,E)$ is CYCLIC.
Layout Projection is a DAG. The Global Architecture Flow Map applies feedback arc set elimination or layer rank assignment to force a top-to-bottom DAG spatial layout.
Mandatory Distinction: GraphView MUST explicitly maintain: $$\text{Canonical Graph (Cyclic Truth)} \neq \text{Visual Flow Layout (DAG Spatial Projection)}$$
16. SUPPORTING / TEST LAYER AUDIT
The prior contract placed Tests, Mocks, and Utilities into a bottom/top "Supporting" layer.

Adversarial Finding:

Tests and Mocks do NOT execute inside the production runtime call stack ($Presentation \rightarrow Application \rightarrow Domain \rightarrow Schema$).
Placing Test as a vertical layer below Schema or above Presentation corrupts the vertical execution semantics of the Architecture Flow Map.
Contract: Tests and Utilities MUST be managed as Auxiliary Lenses / Overlay Toggles, NOT as primary vertical architectural layer bands.
17. SCHEMA AS A LAYER AUDIT
CustomObject and CustomField are static database metadata definitions, NOT executable call-stack code nodes.

An edge ApexClass -> CustomObject represents a SOQL query or schema dependency.
An edge Controller -> Service represents a dynamic method call execution.
Placing Schema at the bottom of a vertical call-stack hierarchy is a useful spatial convention, but creates false semantic equivalence between static schema declarations and dynamic execution calls. Edge visual styling MUST distinguish schema queries (SOQL/DML) from RPC/method calls (method-call/lwc-apex).
18. EDGE SEMANTICS AUDIT
Source Reference: explorer/src/types/explorer.ts:162-218

ExplorerDataSchema defines 19 distinct relationshipType values:

Relationship Type	Source	Target	Runtime Meaning	Suitable for Flow Arrow?
method-call	ApexClass	ApexClass	Dynamic method call	YES (Direct Call)
lwc-apex	LWC	ApexClass	RPC Controller binding	YES (UI -> Backend Call)
lwc-template-child	LWC	LWC	DOM Component Composition	NO (Structural Containment)
SOQL / soql-object	ApexClass	Object	Database Query	YES (Data Access)
field-reference	LWC / Apex	Field	Schema Dependency	NO (Static Import)
extends / implements	ApexClass	ApexClass	OOP Inheritance	NO (Type Structure)
trigger-on	ApexTrigger	Object	DB Event Binding	NO (Event Registration)
test-reference	ApexClass	ApexClass	Test Execution Target	NO (Validation)
Semantic Loss Warning: Collapsing all 19 relationship types into uniform directed arrows obscures architectural intent. The renderer MUST style/filter edges based on relationship type.

19. GLOBAL FLOW MAP VALIDITY TEST
Evaluating the three candidate structural models:

MODEL A: $Y = \text{Architectural Layer}$, $X = \text{Derived Subsystem Domain}$.
MODEL B: $Y = \text{Technical Type / Role}$, $X = \text{Derived Subsystem Domain}$.
MODEL C: $Y = \text{Dependency Topology / Execution Stage}$, $X = \text{Explicitly Configured Subsystem}$.
VERDICT: MODEL A IS ADOPTED WITH DERIVED CONTRACT. Model A ($Y = \text{Layer}$, $X = \text{Domain}$) is the most intuitive and useful architectural visualization for enterprise codebases, BUT $X$ and $Y$ MUST be explicitly badged in the UI as Derived Architectural Interpretation (Heuristic).

20. VISUAL HONESTY TEST
Every spatial coordinate communicates a factual assertion to the user:

$Y = \text{Application}$: Communicates "This node operates in the Application layer." Honesty State: Derived Fact (High confidence for Triggers/Flows; Medium for Controllers; Heuristic fallback for ApexClass).
$X = \text{Billing}$: Communicates "This node belongs to the Billing domain." Honesty State: Derived Interpretation (Inferred from stem/path/graph cohesion).
$r = k \cdot \Delta R$: Communicates "This node is $k$ transitive dependency hops away from the focal node." Honesty State: Exact Analytical Fact.
Visual Honesty Mandate: The UI MUST render a status header/badge:

Global Architecture Flow Map (Derived Classification Engine v1.0)

21. CANONICAL GRAPH VS SEMANTIC PROJECTION TEST
The architecture pipeline MUST strictly preserve separation:

Canonical Graph Truth (G)
        ↓
Heuristic Classification Engine (domains.ts / layers.ts)
        ↓
ArchitectureProjection (Immutable Metadata Layer)
        ↓
Canonical Layout Engine (Layered Flow / Radial Lens / Centroid Lens)
        ↓
Presentation Overrides (User Drag / Viewport Zoom)
        ↓
Rendering (Cytoscape Canvas)
Canonical Graph $G$ remains 100% immutable and unpolluted by visual or layout transformations.

22. REQUIRED PRODUCT-SEMANTICS GAP ANALYSIS
Missing Semantic Fact	Why Needed	Current Proxy	Risk	Requires Product Decision?
Authoritative Business Domain	Group components by real business domain	Naming stem & folder path heuristic	Collisions, splits, false domains	YES (Config/Metadata schema)
Explicit Architectural Layer	Place nodes in true layer	Suffix regex & type mapping	Ambiguous ApexClass fallback (50%)	YES (Layer annotation support)
Component Ownership	Team/Service boundary definition	None	Unassigned ownership	YES (CODEOWNERS / Metadata)
Shared Infrastructure Intent	Distinguish core utils from accidental coupling	Connection degree $\ge 2$	False coupling claims	YES (Explicit tagging)
Root Entry-Point Registration	Anchor macro views	LWC / ApexTrigger type check	Missed entry points (Batch/Queueable)	YES
23. FUNDAMENTAL PRINCIPLE CHALLENGE
Principle 1 (Heuristic Architecture): GraphView CAN claim to visualize architecture, provided it explicitly labels the view as a Derived Architectural Interpretation.
Principle 2 (Heuristic Domains): GraphView CAN claim to visualize subsystem domains, provided it communicates that domain boundaries are inferred from naming and path patterns.
Principle 3 (Determinism vs Truth): A deterministic heuristic is NOT source truth; it is a Deterministic Derived Model.
Principle 4 (Analytical Truth): Derived classification becomes legitimate analytical truth when its rules are transparent, repeatable, and non-destructive to raw data.
Principle 5 (Visibility of Uncertainty): Uncertainty MUST be visible (e.g., confidence badges or visual styling for low-confidence fallback classifications).
Principle 6 (Canonical Fact vs Derived Interpretation): GraphView MUST strictly distinguish Canonical Source Facts from Derived Interpretations in the UI.
Principle 7 (Architecture Visualization without Metadata): Yes, heuristic projection provides immense value for legacy/unannotated codebases, as long as it does not pretend to be human-authored declaration.
24. REQUIRED FINAL VERDICT
============================================================
REQUIRED FINAL VERDICT:
B — DERIVED SEMANTICS ACCEPTABLE WITH EXPLICIT CONTRACT
============================================================
Verdict Rationale: The repository lacks source-authored business domain and architectural layer annotations. However, the deterministic derived classification pipelines (discoverDomains() and classifyNodeLayer()) are highly effective, reproducible, and valuable for spatial encoding, provided GraphView explicitly presents them as Derived Architectural Interpretations with clear UI disclaimers.

25. REQUIRED FINAL CONTRACT TABLE
Semantic Dimension	Actual Repository Authority	Current GraphView Interpretation	Truth Level	Safe Visual Encoding?	Required Change
Node Identity	Source AST / File parse	Unique node key	CANONICAL	YES	None
Node Type	File extension / AST	Salesforce metadata type	CANONICAL	YES	None
Node Role	Suffix regex & behavior	Architectural stereotype	HEURISTIC	YES (Secondary badge)	Display confidence score
Architectural Layer	Priority rule cascade	Y-axis vertical band	DERIVED	YES (Spatial Y-axis)	Label Y-axis as Derived Layer
Subsystem Domain	Multi-pass stem/path parse	X-axis horizontal column	DERIVED	YES (Spatial X-axis)	Label X-axis as Derived Domain
Feature	Community graph clustering	Spatial cluster / overlay	DERIVED	YES (Overlay view)	Keep uncoupled from Domain
Dependency Edge	AST static reference parse	Directed connection arrow	CANONICAL	YES (Filtered by type)	Style by relationshipType
Entry Point	AST type check	Root anchor / Sun hub	CANONICAL	YES	None
Shared Infrastructure	Graph connection count $\ge 2$	Shared column / Centroid hub	DERIVED	YES	Dedicated Shared column
26. REQUIRED FINAL VISUAL CONTRACT
1. GLOBAL ARCHITECTURE FLOW MAP
Y-axis: Derived Architectural Layer (presentation $\rightarrow$ application $\rightarrow$ domain $\rightarrow$ schema). Top-to-bottom vertical execution band.
X-axis: Derived Subsystem Domain (Shared column at $X=0$, followed by derived domain columns). Categorical spatial ordering.
Edges: Directed dependency links, filtered/styled by relationshipType (Call vs Query vs Import).
Geometry Communicates: Layer band hierarchy, subsystem grouping, cross-domain coupling, cross-layer dependency flow.
Geometry DOES NOT Communicate: Source-authored business intent, developer team ownership, metric physical distance.
2. FOCAL DEPENDENCY NEIGHBORHOOD
Radial Distance ($r_k$): $r_k = k \cdot \Delta R$. Transitive BFS graph hop distance from focal node ($k=0, 1, 2, \dots$).
Angle ($\theta$): Intra-hop angular distribution for AABB non-overlap clearance.
Geometry Communicates: Exact analytical dependency impact radius and transitive fan-in/fan-out.
Geometry DOES NOT Communicate: Global architectural layer bands or business subsystem columns.
3. SHARED INFRASTRUCTURE TOPOLOGY
Center / Hubs: Centroid positions of shared controllers and sObjects referenced by multiple entry-point containers.
Macro Rings: Concentric tiers of root entry points (LWCs / Triggers).
Geometry Communicates: Multi-root shared dependency fan-in and structural coupling bottlenecks.
Geometry DOES NOT Communicate: Layer call-stack ordering.
27. REQUIRED IMPLEMENTATION STATUS
============================================================
SEMANTIC FOUNDATION STATUS

Domain Authority:
DERIVED

Layer Authority:
DERIVED

Edge Authority:
CONFIRMED

Overall:
READY WITH CONDITIONS
============================================================
28. REQUIRED "DO NOT IMPLEMENT" LIST
Implementation MUST REMAIN BLOCKED for the following specific subsystems until frozen contracts are met:

DO NOT IMPLEMENT Global Radial Orbit Layout (computeOrbitLayout in orbit-layout.ts). Global architecture MUST use orthogonal Layered Flow Map ($Y=\text{Layer}, X=\text{Domain}$).
DO NOT IMPLEMENT Unlabeled Architecture Flow Maps. The UI MUST render explicit "Derived Interpretation" disclaimers on layer and domain axes.
DO NOT IMPLEMENT Single-column forced domain assignment for multi-domain components. Components connected to $\ge 2$ domains MUST be placed in the Shared column.
DO NOT IMPLEMENT Uniform edge rendering. Edges MUST be visually differentiated by relationshipType (Method Call vs SOQL vs Template Import).
DO NOT IMPLEMENT Vertical layer placement for Test and Mock nodes in the production call stack. Tests MUST be managed as overlay toggles.
DO NOT IMPLEMENT Cross-mode position state leakage. UserDragMap(mode, nodeId) MUST be strictly key-isolated per layout mode.
29. FINAL FUNDAMENTAL QUESTION
If discoverDomains() and classifyNodeLayer() were deleted tomorrow, what semantic information would still exist in the canonical graph that proves where every node belongs architecturally and functionally?

ANSWER:
Nothing authoritative regarding business domains or architectural layers.

Without discoverDomains() and classifyNodeLayer(), the canonical graph contains ONLY:

Raw node IDs and display names (strings).
Salesforce technical metadata types (ApexClass, CustomObject, LWC, ApexTrigger, Flow).
Raw file path strings (file).
Behavioral counts (queryCount, dmlCount, asyncPatterns).
Directed typed dependency edges (source, target, relationshipType).
There is ZERO source-authored business domain metadata or explicit architectural layer declaration in the raw repository schema.

What minimum additional semantic authority would GraphView need before an Architecture Flow Map could honestly call itself an architectural visualization rather than a heuristic projection?

MINIMUM SEMANTIC AUTHORITY REQUIREMENTS:
Source Domain Annotation / Config Schema: A lightweight project configuration file (e.g. graphview.config.json or .sfdx package directory manifests) mapping directory folders or namespace prefixes to authoritative business domains (e.g., "force-app/main/default/classes/billing/*": "Billing").
Architectural Layer Annotations / Stereotypes: Formal support for Apex doc annotations or interface markers (e.g. @IsService, @IsSelector, @IsController) or explicit type overrides in project config.
Explicit Boundary / Shared Infrastructure Declarations: Ability for developers to mark utility classes as explicit shared infrastructure.
30. FINAL GATE
============================================================
GRAPHVIEW SEMANTIC FOUNDATION GATE
============================================================

DOMAIN AUTHORITY:
DERIVED (Naming stem + path + graph cohesion heuristic)

LAYER AUTHORITY:
DERIVED (Type priority + path + behavior + suffix heuristic)

EDGE AUTHORITY:
CONFIRMED (19 canonical AST relationship types)

GLOBAL ARCHITECTURE VISUALIZATION:
DERIVED (Model A: Y = Derived Layer, X = Derived Domain)

FOCAL DEPENDENCY VISUALIZATION:
TRUTHFUL (Exact k-hop transitive BFS radial projection)

SHARED INFRASTRUCTURE VISUALIZATION:
TRUTHFUL (Multi-root centroid topology projection)

------------------------------------------------------------

FINAL DESIGN GATE:
B — DERIVED SEMANTICS ACCEPTABLE WITH EXPLICIT CONTRACT

IMPLEMENTATION:
READY WITH CONDITIONS

------------------------------------------------------------

TOP 5 SEMANTIC RISKS:

1. Presenting derived heuristic domains as canonical business truth to users without explicit UI disclaimers.
2. Non-recursive suffix stripping in discoverDomains() splitting tightly bound feature components (e.g. CustomerService vs CustomerServiceHelper).
3. Ambiguous ApexClass components lacking naming conventions defaulting to Application layer with low confidence (0.50).
4. Conflating static schema query dependencies (SOQL) with dynamic call-stack execution (method-call/RPC) on the Global Flow Map.
5. Cross-mode position leakage mutating canonical layout positions when switching between layout modes.

------------------------------------------------------------

DEEPEST PRINCIPLE:

Architecture visualization in unannotated enterprise codebases is inherently an act of analytical interpretation. Deterministic heuristic engines like discoverDomains() and classifyNodeLayer() provide immense value by deriving structure from legacy code conventions, but they must never usurp the authority of canonical truth. GraphView achieves mathematical and semantic integrity by maintaining an absolute, unbreachable boundary between Canonical Source Facts (G), Derived Analytical Interpretations (Projections), and Presentation Overrides (Interaction).

------------------------------------------------------------

NO CODE WAS CHANGED.
NO IMPLEMENTATION WAS PERFORMED.
THIS REPORT IS THE SEMANTIC FOUNDATION GATE.
============================================================
