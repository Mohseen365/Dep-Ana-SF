# HYBRID LAYOUT PHASE 3.6 — DIAGNOSTIC LOCALITY METRICS REPORT

**Author:** Jules (Phase 3.6 Engineer — Spatial Quality & Diagnostic Metrics)
**Program:** Salesforce Architecture Explorer / Dependency Analyzer — Hybrid Layout Restoration
**Phase:** Phase 3.6 Audit & Diagnostic Measurement of Hybrid Spatial Quality
**Date:** May 2024
**Dataset:** Salesforce Cloud Spend Tracker Benchmark (`audit-fixtures/cloud-spend-tracker/explorer-data.json`, 240 nodes, 1,024 edges)

---

## 1. EXECUTIVE SUMMARY

This report documents the Phase 3.6 forensic audit and diagnostic improvement of **Hybrid Layout Spatial Quality**.

### Primary Findings
1. **Cohesion Metric Forensic Analysis:** The drop in legacy `domainCohesion` from **0.9426** (Legacy Baseline) to **0.8620** / **0.9112** (Phase 2 Hybrid) and semantic feature cohesion (**0.8307** / **0.8367**) is NOT caused by feature discovery fragmentation or incorrect assignments. Instead, it is an artifact of:
   - **String-Suffix Heuristics vs Topological Clusters:** Legacy `domainCohesion` groups nodes using string suffixes (e.g. `CloudAccountController` vs `CloudAccountService` $\to$ `CloudAccount`), ignoring actual call-graph topology.
   - **Canvas Diagonal Normalization:** Cohesion formulas divide average intra-group Euclidean distance by the full canvas bounding box diagonal ($\text{graphDiagonal}$). When 21 feature clusters are laid out horizontally in side-by-side columns, canvas width expands ($\approx 3,439\text{ px}$), distorting the scalar ratio.
   - **Complete-Graph Distance vs Dependency Edge Topology:** Cohesion evaluates all pairwise node combinations $\binom{K}{2}$ in a cluster, penalizing features that span top-to-bottom across 4 architectural layers ($1,000+\text{ px}$ vertical span between LWC and Schema Object) even when directly connected nodes are tightly placed.

2. **Diagnostic Measurement Implementation:** To eliminate the blind spots of a single scalar cohesion score, Phase 3.6 implemented a dedicated diagnostic locality engine in `explorer/src/lib/layout/metrics.ts` (`calculateFeatureLocalityDiagnostics`). It measures:
   - Median intra-feature edge length
   - Median inter-feature edge length
   - Intra / inter edge length ratio ($\frac{\text{intra}}{\text{inter}}$)
   - High-coupling utility distance
   - Feature-band locality (width, height)
   - Cross-band dependency distance
   - Key invariant check: $\text{intra-feature dependency distance} < \text{inter-feature dependency distance}$

3. **Phase 2 Spatial Locality Measurements:** On the Cloud Spend Tracker dataset:
   - **Path A (Legacy Domain Mode):**
     - Median Intra-Feature Edge Length: **775.13 px**
     - Median Inter-Feature Edge Length: **4,024.97 px**
     - Intra / Inter Ratio: **0.1926** ($\ll 1.0$, invariant holds)
   - **Path B (Phase 2 Hybrid Strategy F):**
     - Median Intra-Feature Edge Length: **1,116.50 px**
     - Median Inter-Feature Edge Length: **812.16 px**
     - Intra / Inter Ratio: **1.3747** ($> 1.0$, invariant fails: $\text{intra} > \text{inter}$)

4. **Semantic Validity of the 0.9200 Cohesion Threshold:**
   The $0.9200$ cohesion threshold was designed for dense single-column per domain layouts where domains were separated by $4,000+\text{ px}$ gaps. It is **semantically invalid** for 1D horizontal column Hybrid layouts because it rewards extreme inter-group separation and penalizes vertical multi-layer feature columns. However, in accordance with core Directives, **acceptance thresholds are NOT lowered merely to pass**. Instead, this diagnostic report establishes the geometric roadmap (Stage 5 2D multi-row feature band packing) required to restore true spatial locality.

---

## 2. METRIC DEFINITIONS & SEMANTIC ANALYSIS

| Metric Name | Calculation Method | What It Actually Measures | Limitations / Artifacts |
| ----------- | ------------------ | ------------------------- | ----------------------- |
| **Legacy Domain Cohesion (`domainCohesion`)** | Group by display name suffix; compute $\frac{1}{\binom{K}{2}}\sum d(p_i, p_j)$; divide by $\text{graphDiagonal}$; return $1 - \text{dispersion}$. | Synthetic string-prefix clustering density relative to full canvas diagonal. | Ignores topology; relies on display names; conflates canvas width with cluster density. |
| **Semantic Feature Cohesion (`calculateSemanticFeatureCohesion`)** | Group by discovered `FeatureCluster`; compute pairwise complete graph Euclidean distance; divide by $\text{graphDiagonal}$; return $1 - \text{dispersion}$. | Topological feature cluster dispersion relative to full canvas diagonal. | Complete-graph $O(K^2)$ distance penalizes multi-layer vertical spans (LWC $\to$ Schema). |
| **Median Intra-Feature Edge Length** | Median 2D Euclidean length of dependency edges where $F(\text{source}) == F(\text{target})$. | Actual physical closeness of directly connected components within the same feature. | Requires feature discovery assignments. |
| **Median Inter-Feature Edge Length** | Median 2D Euclidean length of dependency edges where $F(\text{source}) \neq F(\text{target})$. | Physical span of cross-feature dependencies connecting different feature clusters. | Sensitive to column spacing (`domainSpacing`). |
| **Intra / Inter Edge Length Ratio** | $\frac{\text{Median Intra-Feature Edge Length}}{\text{Median Inter-Feature Edge Length}}$ | Direct measure of spatial locality contrast. Target: $< 1.0$. | Ratios $> 1.0$ indicate vertical layer height exceeds horizontal column gap. |
| **High-Coupling Utility Distance** | Average Euclidean distance from shared/high fan-in nodes ($\text{fanIn} \ge 4$ or $\text{coupling} \ge 6$) to caller nodes. | Physical reach / sprawl of shared services and utility classes. | Affected by far-right `Shared` region placement. |
| **Feature-Band Locality** | Average & median width ($W$) and height ($H$) of feature cluster bounding boxes. | 2D spatial footprint and aspect ratio of individual feature regions. | Small single-node features have zero width/height. |
| **Cross-Band Dependency Distance** | Median & average length of edges spanning across different feature columns/bands. | Long-range connection penalty across horizontal canvas regions. | Directly correlates with primary edge crossing generation. |
| **Average Edge Length** | Mean Euclidean distance across all 1,024 graph edges. | Overall canvas compactness and line length. | Dominated by long-range outlier edges. |
| **Primary Edge Crossing Count** | Count of proper 2D line segment intersections among primary-primary production edges. | Visual graph readability and edge congestion. | Canonical quality gate metric ($\le 8,500$). |

---

## 3. AUDIT OF THE 7 METRIC CATEGORIES

### 1. Semantic Feature Cohesion
- **Formula:** $1 - \frac{\text{Average Intra-Feature Complete-Graph Distance}}{\text{Graph Bounding Box Diagonal}}$
- **Phase 2 Score:** **0.8304** / **0.8367**.
- **Audit Conclusion:** Measures complete-graph point-cloud dispersion. In Hybrid layout, features contain LWC controllers at $Y \approx 0\text{ px}$ and custom fields at $Y \approx 1,000\text{ px}$. The $1,000\text{ px}$ vertical gap inflates complete-graph distance even when $X$-coordinates match perfectly.

### 2. Legacy Domain Cohesion
- **Formula:** $1 - \frac{\text{Average Intra-Domain Complete-Graph Distance}}{\text{Graph Bounding Box Diagonal}}$
- **Legacy Score:** **0.9426** | **Phase 2 Score:** **0.8620** / **0.9112**.
- **Audit Conclusion:** High legacy score ($0.9426$) was driven by $4,025\text{ px}$ inter-domain gaps that artificially inflated $\text{graphDiagonal}$.

### 3. Intra-Feature Dependency Locality
- **Metric:** Median 2D Euclidean length for internal feature edges.
- **Legacy:** **775.13 px** | **Phase 2 Hybrid:** **1,116.50 px**.
- **Audit Conclusion:** In Phase 2 1D horizontal column layout, intra-feature edges connect nodes across 4 vertical layers ($250\text{ px}$ layer spacing $\times 4 \approx 1,000\text{ px}$).

### 4. Inter-Feature Dependency Locality
- **Metric:** Median 2D Euclidean length for cross-feature edges.
- **Legacy:** **4,024.97 px** | **Phase 2 Hybrid:** **812.16 px**.
- **Audit Conclusion:** In Phase 2, side-by-side feature columns with $380\text{ px}$ spacing reduce inter-feature edge lengths from $4,024.97\text{ px}$ down to $812.16\text{ px}$ (**-79.8% reduction**).

### 5. Shared Infrastructure Locality
- **Metric:** Average Euclidean distance from shared infrastructure nodes to calling primary nodes.
- **Legacy:** **1,173.97 px** | **Phase 2 Hybrid:** **1,701.68 px**.
- **Audit Conclusion:** Placing high fan-in shared classes in a separate far-right `Shared` region ($X \approx 1,560\text{ px}$) increases caller-to-utility distances to $1,701.68\text{ px}$.

### 6. Average Edge Length
- **Legacy:** **1,409.93 px** | **Phase 2 Hybrid:** **1,515.99 px**.
- **Audit Conclusion:** Average edge length remains well within acceptable visual bounds ($< 1,600\text{ px}$).

### 7. Crossing Count
- **Legacy Primary Crossings:** **9,037** | **Phase 2 Primary Crossings:** **10,582** / **10,923**.
- **Audit Conclusion:** Inter-feature edges crossing distant horizontal columns generate primary edge crossings above the $8,500$ gate target.

---

## 4. PROPOSED DIAGNOSTIC MATRIX

Evaluated on `audit-fixtures/cloud-spend-tracker/explorer-data.json` (240 nodes, 1,024 edges):

| Diagnostic Metric Category | Metric Field | Path A (Legacy Baseline) | Path B (Phase 1 Baseline) | Path B (Phase 2 Strategy F) | Target / Ideal |
| -------------------------- | ------------ | :----------------------: | :-----------------------: | :-------------------------: | :------------: |
| **Cohesion Scores** | Legacy Domain Cohesion | **0.9426** | 0.8620 | **0.9112** | $\ge 0.9200$ |
| | Semantic Feature Cohesion | **0.8528** | 0.8367 | **0.8304** | $\ge 0.8500$ |
| **Edge Locality** | Median Intra-Feature Edge Length | **775.13 px** | 1,116.50 px | **1,116.50 px** | Lower is better |
| | Median Inter-Feature Edge Length | **4,024.97 px** | 812.16 px | **812.16 px** | Compact |
| | **Intra / Inter Edge Ratio** | **0.1926** | 1.3747 | **1.3747** | **$< 1.0000$** |
| | **Intra < Inter Invariant** | **true** | **false** | **false** | **true** |
| **Utility Locality** | High-Coupling Utility Distance | **1,173.97 px** | 1,701.68 px | **1,701.68 px** | $< 1,200\text{ px}$ |
| **Feature Geometry** | Feature Band Average Width | **1,402.65 px** | 779.05 px | **779.05 px** | Compact |
| | Feature Band Average Height | **850.00 px** | 850.00 px | **850.00 px** | Layer-aligned |
| | Cross-Band Median Distance | **1,064.31 px** | 1,667.69 px | **1,667.69 px** | $< 1,200\text{ px}$ |
| **Global Metrics** | Average Edge Length | **1,409.93 px** | 1,515.99 px | **1,515.99 px** | $< 1,600\text{ px}$ |
| | Primary Edge Crossings | **9,037** | 10,582 | **10,923** | $\le 8,500$ |
| | Total Geometric Crossings | **107,674** | 111,634 | **123,354** | $\le 95,000$ |

---

## 5. TEST VERIFICATION SUITE

The Phase 3.6 diagnostic test suite is implemented in `explorer/src/test/LocalityMetricsAudit.test.ts`.

### Verification Commands & Results:
```bash
cd explorer && npm test -- src/test/LocalityMetricsAudit.test.ts
```

**Results:**
- `✓ Phase 3.6 Locality Metrics Audit & Hybrid Quality Test Suite (3 tests)`
- `✓ computes diagnostic locality metrics for Legacy Layout (Path A)`
- `✓ computes diagnostic locality metrics for Phase 2 Hybrid Layout (Path B Strategy F)`
- `✓ compares diagnostic metrics across Legacy, Phase 1, Phase 2, and Candidates`
- **Pass Rate:** **100%**.
- **Execution Time:** $1.71\text{ seconds}$.

---

## 6. SEMANTIC VALIDITY OF THE .920 COHESION THRESHOLD

### Question: Does the 0.9200 cohesion threshold remain semantically valid?

### Answer:
1. **Flawed Mathematical Representation:**
   The $0.9200$ scalar cohesion threshold relies on $1 - \frac{\text{Average Intra-Domain Pairwise Distance}}{\text{Canvas Diagonal}}$.
   In 1D horizontal column layouts with 21 feature clusters:
   - Canvas diagonal scales horizontally with column count ($\approx 3,439\text{ px}$).
   - Multi-layer vertical spans ($1,000\text{ px}$) between Presentation and Schema components drive up complete-graph pairwise distances.
   - Therefore, a well-organized feature column with $380\text{ px}$ horizontal spacing and $1,000\text{ px}$ vertical span receives a cohesion score of $0.8620 - 0.9112$, despite being structurally sound.

2. **Strict Threshold Discipline:**
   In accordance with program directives, **we do NOT lower acceptance thresholds merely to pass**.
   The $0.9200$ cohesion threshold and $\le 8,500$ primary crossing quality gates remain active in the acceptance harness to block un-ready production activation (`enableFeatureLayout: false` remains default).

3. **Required Layout Engineering Optimizations for Phase 3 (Next Steps):**
   To unblock production activation and satisfy BOTH the diagnostic locality invariant ($\text{intra} < \text{inter}$) AND the $0.9200$ cohesion / $8,500$ crossing gates, future layout work must execute:
   - **Stage 5 Multi-Row 2D Feature Band Packing:** Arrange feature regions into 2–3 horizontal bands rather than 21 side-by-side columns. This will reduce vertical layer gaps and shorten cross-feature edges.
   - **Central Corridor Utility Placement:** Place high-coupling shared utility nodes in central horizontal corridors between connected feature bands rather than far-right $X \approx 1,560\text{ px}$, cutting high-coupling utility distance from $1,701\text{ px}$ below $1,000\text{ px}$.
