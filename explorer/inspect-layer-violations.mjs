import fs from "node:fs";
import path from "node:path";
import { classifyNodeLayer } from "./src/lib/layout/layers";
import { isTestNode } from "./src/lib/layout/analysis";

const fixturePath = path.resolve("../audit-fixtures/cloud-spend-tracker/explorer-data.json");
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const nodes = fixture.nodes;
const edges = fixture.edges;

const order = {
  presentation: 0,
  application: 1,
  domain: 2,
  infrastructure: 3,
};

const nodeMap = new Map(nodes.map(n => [n.id, n]));
const violations = [];

for (const edge of edges) {
  const source = nodeMap.get(edge.source);
  const target = nodeMap.get(edge.target);
  if (!source || !target) continue;
  if (isTestNode(source) || isTestNode(target)) continue;

  const sourceLayer = classifyNodeLayer(source);
  const targetLayer = classifyNodeLayer(target);
  const sourceRank = order[sourceLayer] ?? 1;
  const targetRank = order[targetLayer] ?? 1;

  if (sourceRank > targetRank) {
    violations.push({
      edge: edge.id ?? `${edge.source} -> ${edge.target}`,
      sourceId: source.id,
      sourceName: source.displayName ?? source.name,
      sourceType: source.type,
      sourceFile: source.filePath ?? source.path,
      sourceLayer,
      sourceRank,
      targetId: target.id,
      targetName: target.displayName ?? target.name,
      targetType: target.type,
      targetFile: target.filePath ?? target.path,
      targetLayer,
      targetRank,
    });
  }
}

console.log(JSON.stringify({ count: violations.length, violations }, null, 2));

