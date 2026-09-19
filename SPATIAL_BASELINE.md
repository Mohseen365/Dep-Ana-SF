# SPATIAL BASELINE REPORT
**Salesforce Dependency Analyzer + Architecture Explorer**
**Audit Status:** EVIDENCE-GATHERING & DIAGNOSIS PASS COMPLETE (0 PRODUCTION FILES MODIFIED)

---

## Overview

This report provides the exact fixture-by-fixture spatial geometry, edge length distribution, empty space, and component separation measurements for all 13 representative benchmark fixtures in the Explorer layout engine (`explorer/src/lib/layout/fixtures/`).

All measurements were calculated deterministically using `computeArchitectureLayout` and `evaluateLayout` with standard default parameters (`nodeWidth = 120`, `nodeHeight = 60`, `layerSpacing = 250`, `domainSpacing = 380`, `componentGap = 450`).

---

## Summary Matrix Across All Benchmark Fixtures

| Fixture Name | Category | Total Nodes (Prim / Sec) | Total Edges | Bounding Box (W x H) | Occupied Area (px²) | Canvas Area (px²) | Empty Space Ratio | Avg Edge Length (px) | Median Edge Length (px) | P90 Edge Length (px) | Max Edge Length (px) | Crossings | Overlaps | Invalid Coords | Runtime (ms) |
|--------------|----------|--------------------------|-------------|----------------------|---------------------|-------------------|-------------------|----------------------|------------------------|----------------------|----------------------|-----------|----------|----------------|--------------|
| Layered Architecture | Medium | 10 (10 / 0) | 9 | 1,109 x 935 | 72,000 | 1,036,915 | 93.1% | 329.3 | 233.7 | 745.6 | 904.5 | 0 | 0 | 0 | 19.96 |
| Two Domain Graph | Small | 8 (8 / 0) | 7 | 1,045 x 435 | 57,600 | 454,575 | 87.3% | 291.4 | 250.0 | 498.4 | 512.0 | 0 | 0 | 0 | 3.12 |
| Food Delivery Architecture | Food Delivery | 26 (24 / 2) | 25 | 3,844 x 1,035 | 187,200 | 3,978,540 | **95.3%** | 743.6 | 250.0 | 2,199.6 | 3,724.0 | 10 | 0 | 0 | 9.15 |
| Hub-Heavy Architecture | Medium | 15 (15 / 0) | 16 | 6,240 x 185 | 108,000 | 1,154,400 | 90.6% | 1,178.6 | 400.0 | 2,742.9 | 2,822.8 | 3 | 0 | 0 | 3.02 |
| Bridge-Heavy Architecture | Bridge-Heavy | 13 (13 / 0) | 15 | 1,268 x 685 | 93,600 | 868,580 | 89.2% | 306.8 | 250.0 | 497.2 | 651.1 | 6 | 0 | 0 | 6.80 |
| Test-Heavy Architecture | Test-Heavy | 14 (2 / 12) | 13 | 760 x 460 | 100,800 | 349,600 | 71.2% | 218.4 | 188.7 | 307.2 | 320.0 | 0 | 0 | 0 | 2.17 |
| Field-Heavy CustomObject | Field-Heavy | 26 (1 / 25) | 25 | 1,080 x 560 | 187,200 | 604,800 | 69.0% | 371.2 | 377.4 | 512.2 | 520.0 | 0 | 0 | 0 | 3.07 |
| Trigger / Handler Microcluster | Small | 7 (7 / 0) | 7 | 792 x 560 | 50,400 | 443,520 | 88.6% | 256.5 | 284.9 | 357.8 | 357.8 | 0 | 0 | 0 | 1.09 |
| Disconnected Components | Disconnected | 20 (20 / 0) | 15 | 4,344 x 685 | 144,000 | 2,975,640 | **95.2%** | 233.7 | 250.0 | 320.0 | 431.5 | 0 | 0 | 0 | 4.01 |
| Long Dependency Chain | Long-Chain | 15 (15 / 0) | 14 | 4,840 x 185 | 108,000 | 895,406 | 87.9% | 350.5 | 377.4 | 379.9 | 380.0 | 0 | 0 | 0 | 2.80 |
| Dense Cross-Domain Graph | Dense Cross-Domain | 9 (9 / 0) | 12 | 1,524 x 310 | 64,800 | 472,440 | 86.3% | 543.2 | 341.4 | 1,162.7 | 1,404.0 | 7 | 0 | 0 | 1.75 |
| Sparse Graph Architecture | Sparse | 32 (32 / 0) | 4 | 11,680 x 185 | 230,400 | 2,160,800 | 89.3% | 125.0 | 125.0 | 125.0 | 125.0 | 0 | 0 | 0 | 3.99 |
| 100+ Node Large Architecture | 100+ Node / Large | 111 (71 / 40) | 120 | 22,424 x 1,135 | 799,200 | 25,451,240 | **96.9%** | 2,951.4 | 932.3 | 8,075.3 | 12,132.4 | 598 | 0 | 0 | 38.01 |

---

## Detailed Fixture Breakdown

### 1. Small / Two Domain Graph (`two-domain`)
- **Nodes:** 8 Primary, 0 Secondary (Total 8)
- **Edges:** 7
- **Bounding Box:** 1,045 px (W) x 435 px (H)
- **Occupied Area:** 57,600 px² (Canvas Area: 454,575 px²)
- **Empty Space Ratio:** 87.3%
- **Edge Lengths:** Median = 250.0 px, Max = 512.0 px
- **Intra-Domain Median:** 256.9 px
- **Inter-Domain Median:** 250.0 px
- **Crossings / Overlaps:** 0 Crossings, 0 Overlaps
- **Diagnosis:** Baseline small graph displays acceptable local compactness, but inter-domain spacing creates ~87% empty space.

### 2. Medium / Layered Architecture (`layered-architecture`)
- **Nodes:** 10 Primary, 0 Secondary (Total 10)
- **Edges:** 9
- **Bounding Box:** 1,109 px (W) x 935 px (H)
- **Occupied Area:** 72,000 px² (Canvas Area: 1,036,915 px²)
- **Empty Space Ratio:** 93.1%
- **Edge Lengths:** Median = 233.7 px, P90 = 745.6 px, Max = 904.5 px
- **Intra-Domain Median:** 233.7 px
- **Inter-Domain Median:** 205.0 px
- **Crossings / Overlaps:** 0 Crossings, 0 Overlaps
- **Diagnosis:** Fixed layer Y bands (250px gap) force canvas height to 935px despite only 10 nodes, generating >93% whitespace.

### 3. Food Delivery Architecture (`food-delivery`)
- **Nodes:** 24 Primary, 2 Secondary (Total 26)
- **Edges:** 25
- **Bounding Box:** 3,844 px (W) x 1,035 px (H)
- **Occupied Area:** 187,200 px² (Canvas Area: 3,978,540 px²)
- **Empty Space Ratio:** **95.3%**
- **Edge Lengths:** Median = 250.0 px, P90 = 2,199.6 px, Max = 3,724.0 px
- **Intra-Domain Median:** 205.0 px
- **Inter-Domain Median:** 250.0 px
- **Satellite-Anchor Median:** 130.0 px
- **Crossings / Overlaps:** 10 Crossings, 0 Overlaps
- **Diagnosis:** 6 domains cause horizontal region accumulation (`currentX += regionWidth + 160`), stretching bounding box width to 3,844px and creating 95.3% empty space.

### 4. Hub-Heavy Architecture (`hub-heavy`)
- **Nodes:** 15 Primary, 0 Secondary (Total 15)
- **Edges:** 16
- **Bounding Box:** 6,240 px (W) x 185 px (H)
- **Occupied Area:** 108,000 px² (Canvas Area: 1,154,400 px²)
- **Empty Space Ratio:** 90.6%
- **Edge Lengths:** Median = 400.0 px, P90 = 2,742.9 px, Max = 2,822.8 px
- **Inter-Domain Median:** 400.0 px
- **Crossings / Overlaps:** 3 Crossings, 0 Overlaps
- **Diagnosis:** High-degree hub nodes in a single horizontal layer push domain regions apart, producing edge lengths up to 2,822px.

### 5. Bridge-Heavy Architecture (`bridge-heavy`)
- **Nodes:** 13 Primary, 0 Secondary (Total 13)
- **Edges:** 15
- **Bounding Box:** 1,268 px (W) x 685 px (H)
- **Occupied Area:** 93,600 px² (Canvas Area: 868,580 px²)
- **Empty Space Ratio:** 89.2%
- **Edge Lengths:** Median = 250.0 px, P90 = 497.2 px, Max = 651.1 px
- **Intra-Domain Median:** 250.0 px
- **Inter-Domain Median:** 255.6 px
- **Crossings / Overlaps:** 6 Crossings, 0 Overlaps
- **Diagnosis:** Cross-domain bridge corridor displacement shifts bridges into inter-layer Y bands (`baseY - 125px`), creating balanced vertical/horizontal edge distribution.

### 6. Test-Heavy Architecture (`test-heavy`)
- **Nodes:** 2 Primary, 12 Secondary (Total 14)
- **Edges:** 13
- **Bounding Box:** 760 px (W) x 460 px (H)
- **Occupied Area:** 100,800 px² (Canvas Area: 349,600 px²)
- **Empty Space Ratio:** 71.2%
- **Edge Lengths:** Median = 188.7 px, Max = 320.0 px
- **Satellite-Anchor Median:** 222.4 px
- **Crossings / Overlaps:** 0 Crossings, 0 Overlaps
- **Diagnosis:** Compact layout locally. Test satellites form tight ring clusters around the 2 production targets within `maxSatelliteDistance = 280px`.

### 7. Field-Heavy CustomObject (`field-heavy`)
- **Nodes:** 1 Primary, 25 Secondary (Total 26)
- **Edges:** 25
- **Bounding Box:** 1,080 px (W) x 560 px (H)
- **Occupied Area:** 187,200 px² (Canvas Area: 604,800 px²)
- **Empty Space Ratio:** 69.0%
- **Edge Lengths:** Median = 377.4 px, Max = 520.0 px
- **Satellite-Anchor Median:** 377.4 px
- **Crossings / Overlaps:** 0 Crossings, 0 Overlaps
- **Diagnosis:** Field satellites form a dense grid below the CustomObject anchor. Achieves the lowest empty-space ratio (69.0%) because node density is high around a single anchor.

### 8. Disconnected Components Benchmark (`disconnected-components`)
- **Nodes:** 20 Primary, 0 Secondary (Total 20)
- **Edges:** 15
- **Bounding Box:** 4,344 px (W) x 685 px (H)
- **Occupied Area:** 144,000 px² (Canvas Area: 2,975,640 px²)
- **Empty Space Ratio:** **95.2%**
- **Edge Lengths:** Median = 250.0 px, Max = 431.5 px
- **Min Component Separation:** 353.0 px
- **Crossings / Overlaps:** 0 Crossings, 0 Overlaps
- **Diagnosis:** Demonstrates **Root Cause #2**: Disconnected components are placed in a 1D horizontal chain (`componentGap = 450px`), stretching canvas width to 4,344px instead of packing into a compact 2D grid.

### 9. Sparse Graph Architecture (`sparse-graph`)
- **Nodes:** 32 Primary, 0 Secondary (Total 32)
- **Edges:** 4
- **Bounding Box:** 11,680 px (W) x 185 px (H)
- **Occupied Area:** 230,400 px² (Canvas Area: 2,160,800 px²)
- **Empty Space Ratio:** 89.3%
- **Edge Lengths:** Median = 125.0 px, Max = 125.0 px
- **Min Component Separation:** 260.0 px
- **Crossings / Overlaps:** 0 Crossings, 0 Overlaps
- **Diagnosis:** Extreme example of 1D horizontal component chaining. 32 mostly disconnected nodes stretch across an 11,680px horizontal line while canvas height is only 185px (aspect ratio 63:1!).

### 10. 100+ Node Large Architecture Benchmark (`scale-100-plus`)
- **Nodes:** 71 Primary, 40 Secondary (Total 111)
- **Edges:** 120
- **Bounding Box:** 22,424 px (W) x 1,135 px (H)
- **Occupied Area:** 799,200 px² (Canvas Area: 25,451,240 px²)
- **Empty Space Ratio:** **96.9%**
- **Edge Lengths:** Avg = 2,951.4 px, Median = 932.3 px, P90 = 8,075.3 px, P95 = 10,064.4 px, Max = 12,132.4 px
- **Intra-Domain Median:** 188.7 px
- **Inter-Domain Median:** 4,071.9 px
- **Crossings / Overlaps:** 598 Crossings, 0 Overlaps
- **Runtime:** 38.01 ms
- **Diagnosis:** Demonstrates the combined compounding effect of **Root Cause #1** (secondary satellite domain region inflation) and **Root Cause #2** (horizontal component shift). Total width reaches 22,424px, empty space reaches **96.9%**, and inter-domain edges stretch up to **12,132px**.
