const path = require("path");
const fs = require("fs");

async function verifyPbimDataAndWorkerContracts() {
  console.log("================================================================");
  console.log("PBIM EXPORTED DATA & WORKER PATCH VERIFICATION");
  console.log("================================================ blow\n");

  // 1. Inspect PBIM export data
  const analyzeDataPath = path.join(__dirname, "analyze/projects/pbim/explorer-data.json");
  const publicDataPath = path.join(__dirname, "explorer/public/projects/pbim/explorer-data.json");

  console.log("[1] Export Artifact Checks:");
  console.log(`    analyze dataset exists: ${fs.existsSync(analyzeDataPath)}`);
  console.log(`    explorer/public dataset exists: ${fs.existsSync(publicDataPath)}`);

  const pbimJson = JSON.parse(fs.readFileSync(publicDataPath, "utf8"));
  console.log(`    Project ID: ${pbimJson.project?.id}`);
  console.log(`    Project Name: ${pbimJson.project?.name}`);
  console.log(`    Nodes: ${pbimJson.summary?.nodeCount} (Expected: 528)`);
  console.log(`    Edges: ${pbimJson.summary?.edgeCount} (Expected: 2063)`);

  const sampleNodes = pbimJson.nodes.slice(0, 5).map(n => n.id);
  console.log(`    Sample Node IDs: ${sampleNodes.join(", ")}`);

  // 2. Trace Worker Patch Source Code Integration
  console.log("\n[2] Worker Patch Source Code Audit:");
  const graphLayoutCode = fs.readFileSync(path.join(__dirname, "explorer/src/lib/graph-layout.ts"), "utf8");
  const workerClientCode = fs.readFileSync(path.join(__dirname, "explorer/src/lib/workers/layout-worker-client.ts"), "utf8");
  const workerCode = fs.readFileSync(path.join(__dirname, "explorer/src/lib/workers/layout.worker.ts"), "utf8");

  const hasWorkerConstellationFilter = graphLayoutCode.includes("options?.architectureMode === 'orbit' || options?.architectureMode === 'constellation'");
  const passesProjectedNodes = workerCode.includes("projectedNodeIds: result.projectedNodeIds ? Array.from(result.projectedNodeIds) : undefined");
  const reconstructsSet = workerClientCode.includes("projectedNodeIds: response.projectedNodeIds ? new Set(response.projectedNodeIds) : undefined");

  console.log(`    Graph Layout Worker Constellation Filter: ${hasWorkerConstellationFilter ? "PASS" : "FAIL"}`);
  console.log(`    Worker projectedNodeIds Serialization: ${passesProjectedNodes ? "PASS" : "FAIL"}`);
  console.log(`    Worker Client Set Reconstruction: ${reconstructsSet ? "PASS" : "FAIL"}`);

  console.log("\n================================================================");
}

verifyPbimDataAndWorkerContracts().catch(err => {
  console.error(err);
  process.exit(1);
});
