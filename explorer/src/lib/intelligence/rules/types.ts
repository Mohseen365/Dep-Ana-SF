/**
 * Architecture Intelligence Rules - Types
 */

import type { ArchitectureContext, ArchitectureFinding, FindingSeverity } from "../types";

export interface Rule {
  id: string;
  version: string;
  name: string;
  description: string;
  severity: FindingSeverity;
  run(ctx: ArchitectureContext): ArchitectureFinding[];
}
