/**
 * Annotations Persistence Module
 *
 * Persists user component annotations and finding review states in localStorage
 * under 'explorer.annotations.v1' with multi-node isolation, review workflow support,
 * and safe error handling.
 */

import type { ArchitectureFinding, FindingSeverity } from "./intelligence";

export type ReviewStatus = "OPEN" | "IN_REVIEW" | "RESOLVED";

export interface FindingReviewMetadata {
  findingId: string;
  nodeIds: string[];
  severity: FindingSeverity;
  evidenceCount: number;
  title?: string;
}

export interface Annotation {
  id: string;
  projectId?: string;
  nodeId: string;
  author: string;
  text: string;
  createdAt: string;
  resolved: boolean;
  resolvedAt?: string;
  status: ReviewStatus;
  findingId?: string;
  findingReviewMetadata?: FindingReviewMetadata;
}

export interface FindingReviewItem {
  id: string;
  nodeIds: string[];
  severity: FindingSeverity;
  status: ReviewStatus;
  evidenceCount: number;
  title: string;
  description: string;
  annotations: Annotation[];
  resolvedAt?: string;
}

const STORAGE_KEY = "explorer.annotations.v1";

function normalizeAnnotation(rawItem: any): Annotation {
  const resolved = typeof rawItem.resolved === "boolean" ? rawItem.resolved : false;

  let status: ReviewStatus = "OPEN";
  if (
    rawItem.status &&
    (rawItem.status === "OPEN" || rawItem.status === "IN_REVIEW" || rawItem.status === "RESOLVED")
  ) {
    status = rawItem.status;
  } else if (resolved) {
    status = "RESOLVED";
  }

  return {
    id: String(rawItem.id),
    projectId: rawItem.projectId ? String(rawItem.projectId) : undefined,
    nodeId: String(rawItem.nodeId || ""),
    author: String(rawItem.author || "Anonymous"),
    text: String(rawItem.text || ""),
    createdAt: String(rawItem.createdAt || new Date().toISOString()),
    resolved,
    resolvedAt: rawItem.resolvedAt ? String(rawItem.resolvedAt) : undefined,
    status,
    findingId: rawItem.findingId ? String(rawItem.findingId) : undefined,
    findingReviewMetadata: rawItem.findingReviewMetadata ? {
      findingId: String(rawItem.findingReviewMetadata.findingId),
      nodeIds: Array.isArray(rawItem.findingReviewMetadata.nodeIds)
        ? rawItem.findingReviewMetadata.nodeIds.map(String)
        : [],
      severity: rawItem.findingReviewMetadata.severity as FindingSeverity,
      evidenceCount: Number(rawItem.findingReviewMetadata.evidenceCount) || 0,
      title: rawItem.findingReviewMetadata.title ? String(rawItem.findingReviewMetadata.title) : undefined
    } : undefined
  };
}

function readStorage(): Annotation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter(item => item && typeof item === "object" && typeof item.id === "string" && typeof item.nodeId === "string")
        .map(normalizeAnnotation);
    }
    return [];
  } catch (err) {
    console.error("Failed to parse annotations from localStorage:", err);
    return [];
  }
}

function writeStorage(annotations: Annotation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations));
  } catch (err) {
    console.error("Failed to write annotations to localStorage:", err);
  }
}

export interface AddAnnotationOptions {
  projectId?: string;
  findingId?: string;
  findingReviewMetadata?: FindingReviewMetadata;
  status?: ReviewStatus;
  resolved?: boolean;
}

export function addAnnotation(
  nodeId: string,
  author: string,
  text: string,
  options?: AddAnnotationOptions
): Annotation {
  const annotations = readStorage();
  const id = `annotation_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const resolved = options?.resolved ?? (options?.status === "RESOLVED");
  const status: ReviewStatus = options?.status ?? (resolved ? "RESOLVED" : "OPEN");

  const newAnnotation: Annotation = {
    id,
    projectId: options?.projectId,
    nodeId,
    author: author || "Anonymous",
    text,
    createdAt: new Date().toISOString(),
    resolved,
    resolvedAt: resolved ? new Date().toISOString() : undefined,
    status,
    findingId: options?.findingId,
    findingReviewMetadata: options?.findingReviewMetadata
  };

  annotations.push(newAnnotation);
  writeStorage(annotations);
  return newAnnotation;
}

export function getAnnotationsForNode(nodeId: string, projectId?: string): Annotation[] {
  const annotations = readStorage();
  return annotations.filter(a => a.nodeId === nodeId && (!projectId || !a.projectId || a.projectId === projectId));
}

export function getAllAnnotations(projectId?: string): Annotation[] {
  const annotations = readStorage();
  if (projectId) {
    return annotations.filter(a => !a.projectId || a.projectId === projectId);
  }
  return annotations;
}

export function deleteAnnotation(id: string): void {
  const annotations = readStorage().filter(a => a.id !== id);
  writeStorage(annotations);
}

/**
 * Resolves an annotation or finding by ID.
 * If target ID matches an annotation ID, updates that annotation.
 * If target ID matches a finding ID, updates all matching annotations (or returns null if none found).
 */
export function resolve(id: string): Annotation | null {
  const annotations = readStorage();
  const now = new Date().toISOString();
  let updated: Annotation | null = null;

  const nextAnnotations = annotations.map(a => {
    if (a.id === id || a.findingId === id) {
      const updatedItem: Annotation = {
        ...a,
        resolved: true,
        resolvedAt: now,
        status: "RESOLVED"
      };
      updated = updatedItem;
      return updatedItem;
    }
    return a;
  });

  if (updated) {
    writeStorage(nextAnnotations);
  }
  return updated;
}

/**
 * Reopens a resolved annotation or finding by ID.
 */
export function reopen(id: string): Annotation | null {
  const annotations = readStorage();
  let updated: Annotation | null = null;

  const nextAnnotations = annotations.map(a => {
    if (a.id === id || a.findingId === id) {
      const updatedItem: Annotation = {
        ...a,
        resolved: false,
        resolvedAt: undefined,
        status: "OPEN"
      };
      updated = updatedItem;
      return updatedItem;
    }
    return a;
  });

  if (updated) {
    writeStorage(nextAnnotations);
  }
  return updated;
}

/**
 * Sets an annotation or finding state to IN_REVIEW by ID.
 */
export function setInReview(id: string): Annotation | null {
  const annotations = readStorage();
  let updated: Annotation | null = null;

  const nextAnnotations = annotations.map(a => {
    if (a.id === id || a.findingId === id) {
      const updatedItem: Annotation = {
        ...a,
        resolved: false,
        resolvedAt: undefined,
        status: "IN_REVIEW"
      };
      updated = updatedItem;
      return updatedItem;
    }
    return a;
  });

  if (updated) {
    writeStorage(nextAnnotations);
  }
  return updated;
}

/**
 * Returns all unresolved annotations (resolved === false), optionally filtered by nodeId.
 */
export function getUnresolved(nodeId?: string): Annotation[] {
  const annotations = readStorage().filter(a => !a.resolved);
  if (nodeId) {
    return annotations.filter(a => a.nodeId === nodeId);
  }
  return annotations;
}

/**
 * Returns all resolved annotations (resolved === true), optionally filtered by nodeId.
 */
export function getResolved(nodeId?: string): Annotation[] {
  const annotations = readStorage().filter(a => a.resolved);
  if (nodeId) {
    return annotations.filter(a => a.nodeId === nodeId);
  }
  return annotations;
}

/**
 * Resolves a finding directly by linking or updating finding review state.
 */
export function resolveFinding(
  finding: ArchitectureFinding | string,
  author = "Reviewer",
  text = "Resolved finding review."
): Annotation {
  const findingId = typeof finding === "string" ? finding : finding.id;
  const existing = readStorage().filter(a => a.findingId === findingId || a.id === findingId);

  if (existing.length > 0) {
    resolve(findingId);
    const updated = readStorage().find(a => a.findingId === findingId || a.id === findingId);
    if (updated) return updated;
  }

  const primaryNodeId = typeof finding === "object" && finding.nodeIds.length > 0
    ? finding.nodeIds[0]
    : "finding-review";

  const metadata: FindingReviewMetadata | undefined = typeof finding === "object" ? {
    findingId: finding.id,
    nodeIds: finding.nodeIds,
    severity: finding.severity,
    evidenceCount: finding.evidence.length,
    title: finding.title
  } : undefined;

  return addAnnotation(primaryNodeId, author, text, {
    findingId,
    findingReviewMetadata: metadata,
    status: "RESOLVED",
    resolved: true
  });
}

/**
 * Sets a finding into IN_REVIEW state directly.
 */
export function setFindingInReview(
  finding: ArchitectureFinding | string,
  author = "Reviewer",
  text = "Marked finding as in review."
): Annotation {
  const findingId = typeof finding === "string" ? finding : finding.id;
  const existing = readStorage().filter(a => a.findingId === findingId || a.id === findingId);

  if (existing.length > 0) {
    setInReview(findingId);
    const updated = readStorage().find(a => a.findingId === findingId || a.id === findingId);
    if (updated) return updated;
  }

  const primaryNodeId = typeof finding === "object" && finding.nodeIds.length > 0
    ? finding.nodeIds[0]
    : "finding-review";

  const metadata: FindingReviewMetadata | undefined = typeof finding === "object" ? {
    findingId: finding.id,
    nodeIds: finding.nodeIds,
    severity: finding.severity,
    evidenceCount: finding.evidence.length,
    title: finding.title
  } : undefined;

  return addAnnotation(primaryNodeId, author, text, {
    findingId,
    findingReviewMetadata: metadata,
    status: "IN_REVIEW",
    resolved: false
  });
}

/**
 * Maps an ArchitectureFinding and optional stored annotations into a FindingReviewItem
 * tailored for easy UI consumption.
 */
export function formatFindingReviewItem(
  finding: ArchitectureFinding,
  annotations: Annotation[] = readStorage(),
  projectId?: string
): FindingReviewItem {
  const findingAnnotations = annotations.filter(
    a => a.findingId === finding.id && (!projectId || !a.projectId || a.projectId === projectId)
  );

  let status: ReviewStatus = "OPEN";
  let resolvedAt: string | undefined = undefined;

  if (findingAnnotations.length > 0) {
    const isAllResolved = findingAnnotations.every(a => a.resolved);
    const hasInReview = findingAnnotations.some(a => a.status === "IN_REVIEW");

    if (isAllResolved) {
      status = "RESOLVED";
      resolvedAt = findingAnnotations.find(a => a.resolvedAt)?.resolvedAt;
    } else if (hasInReview) {
      status = "IN_REVIEW";
    }
  }

  return {
    id: finding.id,
    nodeIds: finding.nodeIds,
    severity: finding.severity,
    status,
    evidenceCount: finding.evidence.length,
    title: finding.title,
    description: finding.description,
    annotations: findingAnnotations,
    resolvedAt
  };
}
