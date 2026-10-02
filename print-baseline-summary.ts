import { runFullPipelineHarness } from './run-harness';

const baseline = runFullPipelineHarness();

console.log('=== BASELINE MEASUREMENTS (SB-1C CURRENT STATE) ===');
for (const [key, res] of Object.entries(baseline)) {
  console.log(`\n--- ${key} ---`);
  console.log(`Bridge count: ${res.bridgeCount}`);
  console.log(`Stage 8 Bridge-Primary Overlaps: ${res.structural.bridgePrimaryOverlaps}`);
  console.log(`Stage 8 Bridge-Bridge Overlaps: ${res.structural.bridgeBridgeOverlaps}`);
  console.log(`Stage 8 Exhaustion: ${res.structural.exhaustionCount}`);
  console.log(`Stage 8 Canvas Width: ${res.stage8CanvasWidth.toFixed(2)}px`);
  console.log(`Final Canvas Width: ${res.finalCanvasWidth.toFixed(2)}px`);
  console.log(`Stage 8 Semantic Median: ${res.stage8Semantic.median.toFixed(2)}px`);
  console.log(`Stage 8 Semantic P95: ${res.stage8Semantic.p95.toFixed(2)}px`);
  console.log(`Stage 8 Semantic Max: ${res.stage8Semantic.max.toFixed(2)}px`);
  console.log(`Final Semantic Median: ${res.finalSemantic.median.toFixed(2)}px`);
  console.log(`Final Semantic P95: ${res.finalSemantic.p95.toFixed(2)}px`);
  console.log(`Final Semantic Max: ${res.finalSemantic.max.toFixed(2)}px`);
  console.log(`Stage 8 Corridor Locality Median: ${res.corridorLocalityMedian.toFixed(2)}px`);
  console.log(`Displacement S7->S8 Median: ${res.displacements.s7_s8.median.toFixed(2)}px`);
  console.log(`Displacement S8->S11 Median: ${res.displacements.s8_s11.median.toFixed(2)}px`);
  console.log(`Displacement S7->Final Median: ${res.displacements.s7_final.median.toFixed(2)}px`);
}
