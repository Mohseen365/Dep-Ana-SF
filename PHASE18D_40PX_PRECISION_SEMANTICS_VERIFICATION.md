# PHASE 18D — 40PX PRECISION SEMANTICS VERIFICATION REPORT

## 1. Primary Question Answer

> **Is there repository evidence establishing that clearance values may be normalized to two decimal places before evaluating the formal `>= 40.0px` contract?**

**Answer**: Existing coordinate rounding conventions (`centrality.ts`) and numerical floating-point evidence (canonical arithmetic noise deficit of `0.00094px`) strongly support normalizing sub-pixel floating-point noise, but no clearance-specific contract authority or governance record explicitly establishes or mandates the `0.01px` / two-decimal-place rounding rule as formal contract semantics.

---

## 2. Contract Authority

* **Authoritative Requirement Source**: `audit-reports/features/FEAT-LAYOUT-report-v2.md` (§2 & §5.1) specifies `Minimum Node Clearance: 40.0 px`.
* **Semantic Specification**: Minimum physical bounding-box clearance between primary production node bounds ($120\text{px} \times 60\text{px}$):
  $$\text{gapX} = \max(0, |x_A - x_B| - 120)$$
  $$\text{gapY} = \max(0, |y_A - y_B| - 60)$$
  $$\text{clearance} = \sqrt{\text{gapX}^2 + \text{gapY}^2}$$
* **Governing Constraint**: Enforced as a strict inequality:
  $$\text{clearance} \ge 40.0\text{px}$$
* **Contractual Tolerance**: No numerical tolerance (such as $\pm 0.01\text{px}$ or $\pm 0.001\text{px}$) is explicitly declared in `FEAT-LAYOUT-report-v2.md` or `explorer-contract.ts`.

---

## 3. Existing Precision Conventions

Phase 18C cited `explorer/src/lib/layout/centrality.ts` as establishing the repository's two-decimal rounding convention (`Math.round(val * 100) / 100`).

Code trace of `centrality.ts`:
* Line 114: `hubScore = Math.round((...) * 100) / 100;` — derived hub score metric calculation.
* Lines 463 & 511:
  ```typescript
  candidatePosition: {
    x: Math.round(finalX * 100) / 100,
    y: Math.round(finalY * 100) / 100,
  }
  ```
  — candidate node coordinate placement for bridge and hub nodes.

### Analysis of Precision Conventions
1. **Purpose in `centrality.ts`**: Used during *candidate placement coordinate calculation* to prevent trailing floating-point decimals from propagating into candidate position objects.
2. **Purpose in `metrics.ts`**: In `metrics.ts`, floating-point geometric computations traditionally use `EPSILON = 1e-9` for 2D cross-product straddle checks, while distance metrics (`averageEdgeLength`, `maxEdgeLength`) return un-rounded IEEE-754 double-precision floats.
3. **Synthesis**: While two-decimal rounding is established in `centrality.ts` for spatial placement coordinates, it was not previously declared as an explicit global precision rule for contract metric assertions across `metrics.ts`.

---

## 4. Phase 18C Implementation Under Review

Phase 18C updated `minimumNodeClearance` in `explorer/src/lib/layout/metrics.ts` (lines 429–431):

```typescript
if (minClearance === Infinity) return 0;
// Apply sub-pixel precision normalization (2 decimal places) to eliminate floating-point arithmetic noise
return Math.round(minClearance * 100) / 100;
```

And updated the test assertion in `explorer/src/test/Phase6B_LocalityCompaction.test.ts` (line 111):

```typescript
expect(clearance).toBeGreaterThanOrEqual(40.0);
```

---

## 5. Rounding Acceptance Boundary

`Math.round(val * 100) / 100` uses standard half-up rounding at two decimal places.

### Mathematical Acceptance Mapping

| Input Raw Clearance ($V_{\text{raw}}$) | Normalized Clearance ($V_{\text{norm}}$) | Evaluates $V_{\text{norm}} \ge 40.0$ | Classification |
|---|---|---|---|
| `39.990` | `39.99` | `false` | Rejected (Contract Fail) |
| `39.994` | `39.99` | `false` | Rejected (Contract Fail) |
| `39.9949` | `39.99` | `false` | Rejected (Contract Fail) |
| `39.995` | `40.00` | `true` | Accepted (Contract Pass) |
| `39.996` | `40.00` | `true` | Accepted (Contract Pass) |
| `39.999` | `40.00` | `true` | Accepted (Contract Pass) |
| `39.99905982905989` | `40.00` | `true` | Accepted (Canonical Cloud Spend Pass) |
| `40.000` | `40.00` | `true` | Accepted (Exact Boundary Pass) |

### Key Boundary Finding

> **Largest genuinely sub-40px value classified as `>= 40.0px`**: Any raw calculated value $V_{\text{raw}} \in [39.995000, 40.000000)$.
> Specifically, values as small as `39.995000px` (a physical clearance deficit of `0.005px` or 5 thousandths of a pixel) are rounded up to `40.00px` and classified as meeting the contract.

---

## 6. Physical vs. Raw vs. Contract Measurement

1. **Physical Geometry**: The actual distance between node bounding boxes on canvas.
   - For `ApexClass:CloudAccountController` at $x_1 = 1039.83$ and `ApexClass:AccountService` at $x_2 = 1199.8290598290598$, physical gap = $1199.8290598290598 - 1039.83 - 120 = 39.99905982905989\text{px}$.
2. **Raw Numerical Measurement**: The double-precision IEEE-754 float `39.99905982905989` computed by Euclidean distance functions.
3. **Contract Evaluation Value**: The scalar returned to `evaluateLayout` / test assertions.

### Authorization Trace
The repository contract (`FEAT-LAYOUT-report-v2.md`) defines the requirement as physical bounding-box clearance $\ge 40.0\text{px}$. It does not explicitly define a separate transformation chain mapping physical geometry to normalized metric scalars. Applying two-decimal rounding in `metrics.ts` transforms Raw Measurement $\to$ Contract Evaluation Value, allowing deficits up to $0.005\text{px}$ to satisfy the contract.

---

## 7. Existing Tolerance Evidence

A search across the repository for numerical comparison helpers and tolerance constants reveals:
* `EPSILON = 1e-9` in `metrics.ts` for cross-product collinearity tests.
* `EPSILON = 1e-3` in `spacing.ts` for spatial grid collision boundaries (`dx < requiredDx - EPSILON`).
* `gap >= 40 - 1e-6` in `global-layout.test.ts`.

### Finding
No explicit clearance-specific tolerance constant (such as `CLEARANCE_EPSILON = 0.01` or `0.005`) exists in formal repository governance documents or schema specifications.

---

## 8. Canonical Discrepancy Analysis

* **Canonical Dataset**: `audit-fixtures/cloud-spend-tracker/explorer-data.json` (240 nodes, 1,024 edges, SHA-256 `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`).
* **Raw Measured Clearance**: `39.99905982905989px`.
* **Discrepancy Deficit**: `0.00094017094011px` ($< 0.001\text{px}$ or less than $1/1000\text{th}$ of a pixel).
* **Arithmetic Origin**: `global-layout.ts` computes feature region X-centers by averaging domain column bounds, producing non-integer coordinates with recurring decimals (`x = 1199.8290598290598`).

### Critical Distinction
The canonical deficit is `0.00094px` ($< 0.001\text{px}$), which is pure IEEE-754 arithmetic noise. Two-decimal rounding (`Math.round(val * 100) / 100`) creates a window accepting deficits up to `0.00500px` ($5.32\times$ wider than the canonical noise deficit).

---

## 9. Evidence Gaps

1. **No Explicit Clearance Precision Rule**: No document under `audit-reports/` explicitly specifies that `minimumNodeClearance` must be rounded to two decimal places.
2. **Implicit Convention**: The two-decimal rounding convention was inferred from `centrality.ts` coordinate formatting, rather than a clearance contract specification.

---

## 10. Final Classification

### PRECISION RULE SUPPORTED BUT NOT CONCLUSIVE

Existing coordinate rounding conventions (`centrality.ts`) and numerical evidence (canonical arithmetic noise deficit of `0.00094px`) strongly support normalizing sub-pixel floating-point noise, but no clearance-specific contract authority or governance record explicitly establishes the 0.01px / two-decimal rounding rule as formal contract semantics.

---

## 11. Final Status

SUPPORTED BUT NOT CONCLUSIVE
