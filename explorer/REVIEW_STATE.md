# Architecture Review Workflow State & Contract (`REVIEW_STATE.md`)

## Overview

Track B (Findings/Review Engineer) extends existing architectural findings and annotations into a lightweight, deterministic review workflow without rebuilding finding generation rules or modifying core UI/graph traversal modules.

This document describes the review state contract, data models, persistence mechanisms, helper utilities, and UI integration helpers.

---

## 1. Review Status States

Review items (annotations and findings) follow three primary lifecycle states:

- **`OPEN`** *(Default)*: The finding or annotation is active, unaddressed, and awaiting review.
- **`IN_REVIEW`**: The finding or annotation is actively being investigated, discussed, or remediated.
- **`RESOLVED`**: The finding or annotation has been addressed, confirmed, or dismissed by a reviewer.

### State Transitions & Helper Operations

| Action | Transition | Modifies Properties |
| :--- | :--- | :--- |
| `resolve(id)` | `OPEN` / `IN_REVIEW` → `RESOLVED` | `resolved = true`, `resolvedAt = ISO Timestamp`, `status = "RESOLVED"` |
| `reopen(id)` | `RESOLVED` / `IN_REVIEW` → `OPEN` | `resolved = false`, `resolvedAt = undefined`, `status = "OPEN"` |
| `setInReview(id)` | `OPEN` / `RESOLVED` → `IN_REVIEW` | `resolved = false`, `resolvedAt = undefined`, `status = "IN_REVIEW"` |

---

## 2. Extended Annotation Data Contract

The `Annotation` interface in `dependency-analyzer/explorer/src/lib/annotations.ts` has been extended to support review metadata and finding links while maintaining full backward compatibility.

```typescript
export type ReviewStatus = "OPEN" | "IN_REVIEW" | "RESOLVED";

export interface FindingReviewMetadata {
  findingId: string;
  nodeIds: string[];
  severity: FindingSeverity; // "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO"
  evidenceCount: number;
  title?: string;
}

export interface Annotation {
  id: string;                          // Unique stable ID (e.g. "annotation_1712345678_abc12")
  nodeId: string;                      // Primary associated component node ID
  author: string;                      // Author name (defaults safely to "Anonymous")
  text: string;                        // Content / review note text
  createdAt: string;                   // Creation ISO timestamp
  resolved: boolean;                   // Boolean flag (defaults safely to false for legacy records)
  resolvedAt?: string;                 // Timestamp when resolved (optional)
  status: ReviewStatus;                // Review status ("OPEN" | "IN_REVIEW" | "RESOLVED")
  findingId?: string;                  // Optional link to deterministic ArchitectureFinding.id
  findingReviewMetadata?: FindingReviewMetadata; // Summary metadata for finding association
}
```

---

## 3. Storage Compatibility & Safe Parsing

Annotations continue to persist in browser `localStorage` under the key:
`'explorer.annotations.v1'`

### Backward Compatibility & Fault Tolerance
1. **Legacy Record Normalization**: When loading annotations saved before review fields existed:
   - `resolved` defaults safely to `false`.
   - `status` defaults safely to `"OPEN"`.
   - `resolvedAt` remains `undefined`.
2. **Corrupted Storage Recovery**: Malformed JSON or non-array stored data logs an error gracefully and falls back to an empty collection (`[]`), allowing new annotations to be written without crashing the application.

---

## 4. Exported Helper Functions

All helper functions are exported from `dependency-analyzer/explorer/src/lib/annotations.ts`:

- `addAnnotation(nodeId, author, text, options?)`: Creates a new node or finding annotation.
- `resolve(id)`: Resolves an annotation or finding by ID.
- `reopen(id)`: Reopens a resolved annotation or finding by ID.
- `setInReview(id)`: Sets an annotation or finding to `IN_REVIEW`.
- `getUnresolved(nodeId?)`: Returns all unresolved annotations (`resolved === false`).
- `getResolved(nodeId?)`: Returns all resolved annotations (`resolved === true`).
- `resolveFinding(finding, author?, text?)`: Directly resolves a finding review state.
- `setFindingInReview(finding, author?, text?)`: Directly sets a finding to `IN_REVIEW`.
- `formatFindingReviewItem(finding, annotations?)`: Formats finding details into a stable UI-ready `FindingReviewItem`.

---

## 5. UI Integration Contract (`FindingReviewItem`)

To make findings easy for later UI integration, `formatFindingReviewItem` aggregates an `ArchitectureFinding` and its associated review annotations into a lightweight structure:

```typescript
export interface FindingReviewItem {
  id: string;                       // Stable finding ID (e.g., "finding:cycle:cycle-1")
  nodeIds: string[];                // Participating component node IDs
  severity: FindingSeverity;        // Severity level ("CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO")
  status: ReviewStatus;             // Aggregate status ("OPEN" | "IN_REVIEW" | "RESOLVED")
  evidenceCount: number;            // Count of evidence items attached to finding
  title: string;                    // Finding title
  description: string;              // Finding description
  annotations: Annotation[];        // Linked annotations
  resolvedAt?: string;              // Resolution timestamp if resolved
}
```
