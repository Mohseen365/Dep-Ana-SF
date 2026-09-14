import { describe, it, expect, beforeEach } from "vitest";
import {
  addAnnotation,
  getAnnotationsForNode,
  getAllAnnotations,
  deleteAnnotation,
  resolve,
  reopen,
  setInReview,
  getUnresolved,
  getResolved,
  resolveFinding,
  setFindingInReview,
  formatFindingReviewItem
} from "./annotations";
import type { ArchitectureFinding } from "./intelligence";

describe("Annotations Library & Review Workflow", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("adds and retrieves annotations with node isolation", () => {
    addAnnotation("ApexClass:NodeA", "Alice", "Refactor this method.");
    addAnnotation("ApexClass:NodeA", "Bob", "LGTM.");
    addAnnotation("ApexClass:NodeB", "Charlie", "Check security signals.");

    expect(getAllAnnotations().length).toBe(3);

    const nodeAAnnotations = getAnnotationsForNode("ApexClass:NodeA");
    expect(nodeAAnnotations.length).toBe(2);
    expect(nodeAAnnotations.map(a => a.author)).toEqual(["Alice", "Bob"]);

    const nodeBAnnotations = getAnnotationsForNode("ApexClass:NodeB");
    expect(nodeBAnnotations.length).toBe(1);
    expect(nodeBAnnotations[0].text).toBe("Check security signals.");
  });

  it("deletes an annotation", () => {
    const a1 = addAnnotation("ApexClass:NodeA", "Alice", "Note 1");
    const a2 = addAnnotation("ApexClass:NodeA", "Bob", "Note 2");

    expect(getAnnotationsForNode("ApexClass:NodeA").length).toBe(2);

    deleteAnnotation(a1.id);

    const remaining = getAnnotationsForNode("ApexClass:NodeA");
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe(a2.id);
  });

  it("handles old annotation format compatibility cleanly", () => {
    // Legacy storage item missing resolved, status, resolvedAt
    const oldAnnotations = [
      {
        id: "annotation_old_1",
        nodeId: "ApexClass:OldNode",
        author: "LegacyUser",
        text: "Old note without review fields",
        createdAt: "2024-01-01T00:00:00.000Z"
      }
    ];
    localStorage.setItem("explorer.annotations.v1", JSON.stringify(oldAnnotations));

    const loaded = getAllAnnotations();
    expect(loaded.length).toBe(1);
    expect(loaded[0].resolved).toBe(false);
    expect(loaded[0].status).toBe("OPEN");
    expect(loaded[0].resolvedAt).toBeUndefined();
  });

  it("handles corrupted storage gracefully", () => {
    localStorage.setItem("explorer.annotations.v1", "corrupted json {");

    expect(getAllAnnotations()).toEqual([]);
    expect(getAnnotationsForNode("ApexClass:NodeA")).toEqual([]);

    addAnnotation("ApexClass:NodeA", "Alice", "New note");
    expect(getAnnotationsForNode("ApexClass:NodeA").length).toBe(1);
  });

  it("supports resolve, reopen, and setInReview actions", () => {
    const a1 = addAnnotation("ApexClass:NodeA", "Alice", "Investigate high fan-in.");
    expect(a1.resolved).toBe(false);
    expect(a1.status).toBe("OPEN");

    // setInReview
    const inReviewItem = setInReview(a1.id);
    expect(inReviewItem).not.toBeNull();
    expect(inReviewItem?.status).toBe("IN_REVIEW");
    expect(inReviewItem?.resolved).toBe(false);

    // resolve
    const resolvedItem = resolve(a1.id);
    expect(resolvedItem).not.toBeNull();
    expect(resolvedItem?.resolved).toBe(true);
    expect(resolvedItem?.status).toBe("RESOLVED");
    expect(resolvedItem?.resolvedAt).toBeDefined();

    // reopen
    const reopenedItem = reopen(a1.id);
    expect(reopenedItem).not.toBeNull();
    expect(reopenedItem?.resolved).toBe(false);
    expect(reopenedItem?.status).toBe("OPEN");
    expect(reopenedItem?.resolvedAt).toBeUndefined();
  });

  it("filters unresolved and resolved annotations accurately", () => {
    addAnnotation("ApexClass:NodeA", "Alice", "Unresolved 1");
    addAnnotation("ApexClass:NodeA", "Bob", "Unresolved 2");
    const a3 = addAnnotation("ApexClass:NodeB", "Charlie", "Resolved 1");

    resolve(a3.id);

    expect(getUnresolved().length).toBe(2);
    expect(getResolved().length).toBe(1);
    expect(getUnresolved("ApexClass:NodeA").length).toBe(2);
    expect(getResolved("ApexClass:NodeB").length).toBe(1);
  });

  it("handles finding review state and multiple findings/annotations", () => {
    const mockFinding: ArchitectureFinding = {
      id: "finding:cycle:cycle-1",
      type: "CIRCULAR_DEPENDENCY",
      severity: "CRITICAL",
      title: "Circular Dependency Detected",
      description: "ClassA and ClassB form a cycle",
      nodeIds: ["ApexClass:ClassA", "ApexClass:ClassB"],
      edgeIds: ["ApexClass:ClassA->ApexClass:ClassB"],
      evidence: [
        { file: "ClassA.cls", line: 10, snippet: "ClassB.doSomething();", description: "Call to ClassB" }
      ],
      provenance: { origin: "DERIVED_RULE", source: "cycle-rule", facts: {} },
      rule: { ruleId: "cycle-detected", ruleVersion: "1.0.0", name: "Cycle Detector" }
    };

    // Initially OPEN finding item
    let item = formatFindingReviewItem(mockFinding);
    expect(item.id).toBe("finding:cycle:cycle-1");
    expect(item.nodeIds).toEqual(["ApexClass:ClassA", "ApexClass:ClassB"]);
    expect(item.severity).toBe("CRITICAL");
    expect(item.status).toBe("OPEN");
    expect(item.evidenceCount).toBe(1);
    expect(item.annotations.length).toBe(0);

    // Mark finding as IN_REVIEW
    setFindingInReview(mockFinding, "Alice", "Looking into cycle refactor.");
    item = formatFindingReviewItem(mockFinding);
    expect(item.status).toBe("IN_REVIEW");

    // Resolve finding
    resolveFinding(mockFinding, "Bob", "Cycle resolved via interfaces.");
    item = formatFindingReviewItem(mockFinding);
    expect(item.status).toBe("RESOLVED");
    expect(item.resolvedAt).toBeDefined();
  });
});
