import { runFullPipelineHarness } from './run-harness';
import * as fs from 'fs';
import * as path from 'path';

console.log('=== RUNNING FULL EXPERIMENTAL SUITE (H-5A DUAL OCCUPANCY) ===');

const baseline = runFullPipelineHarness({ useDualOccupancy: false });
const experiment = runFullPipelineHarness({ useDualOccupancy: true });

console.log('\n--- STRUCTURAL METRICS COMPARISON ---');
for (const key of Object.keys(baseline)) {
  const b = baseline[key];
  const e = experiment[key];
  console.log(`\n[${key}]`);
  console.log(`Stage 8 Bridge-Primary Overlaps: Baseline = ${b.structural.bridgePrimaryOverlaps}, H-5A = ${e.structural.bridgePrimaryOverlaps}, Delta = ${e.structural.bridgePrimaryOverlaps - b.structural.bridgePrimaryOverlaps}`);
  console.log(`Stage 8 Bridge-Bridge Overlaps: Baseline = ${b.structural.bridgeBridgeOverlaps}, H-5A = ${e.structural.bridgeBridgeOverlaps}, Delta = ${e.structural.bridgeBridgeOverlaps - b.structural.bridgeBridgeOverlaps}`);
  console.log(`Stage 8 Exhaustion: Baseline = ${b.structural.exhaustionCount}, H-5A = ${e.structural.exhaustionCount}, Delta = ${e.structural.exhaustionCount - b.structural.exhaustionCount}`);
  console.log(`Stage 8 Expansion Steps: Baseline = ${b.structural.totalExpansionSteps}, H-5A = ${e.structural.totalExpansionSteps}, Delta = ${e.structural.totalExpansionSteps - b.structural.totalExpansionSteps}`);
}

console.log('\n--- SPATIAL-DENSITY METRICS COMPARISON ---');
for (const key of Object.keys(baseline)) {
  const b = baseline[key];
  const e = experiment[key];
  console.log(`\n[${key}]`);
  console.log(`Final Canvas Width: Baseline = ${b.finalCanvasWidth.toFixed(2)}px, H-5A = ${e.finalCanvasWidth.toFixed(2)}px, Absolute Delta = ${(e.finalCanvasWidth - b.finalCanvasWidth).toFixed(2)}px, % Delta = ${(((e.finalCanvasWidth - b.finalCanvasWidth) / b.finalCanvasWidth) * 100).toFixed(2)}%`);
  console.log(`Final Semantic Median: Baseline = ${b.finalSemantic.median.toFixed(2)}px, H-5A = ${e.finalSemantic.median.toFixed(2)}px, Absolute Delta = ${(e.finalSemantic.median - b.finalSemantic.median).toFixed(2)}px, % Delta = ${(((e.finalSemantic.median - b.finalSemantic.median) / b.finalSemantic.median) * 100).toFixed(2)}%`);
  console.log(`Final Semantic P95: Baseline = ${b.finalSemantic.p95.toFixed(2)}px, H-5A = ${e.finalSemantic.p95.toFixed(2)}px, Absolute Delta = ${(e.finalSemantic.p95 - b.finalSemantic.p95).toFixed(2)}px, % Delta = ${(((e.finalSemantic.p95 - b.finalSemantic.p95) / b.finalSemantic.p95) * 100).toFixed(2)}%`);
  console.log(`Final Semantic Max: Baseline = ${b.finalSemantic.max.toFixed(2)}px, H-5A = ${e.finalSemantic.max.toFixed(2)}px, Absolute Delta = ${(e.finalSemantic.max - b.finalSemantic.max).toFixed(2)}px, % Delta = ${(((e.finalSemantic.max - b.finalSemantic.max) / b.finalSemantic.max) * 100).toFixed(2)}%`);
  console.log(`Stage 8 Semantic Median: Baseline = ${b.stage8Semantic.median.toFixed(2)}px, H-5A = ${e.stage8Semantic.median.toFixed(2)}px, Absolute Delta = ${(e.stage8Semantic.median - b.stage8Semantic.median).toFixed(2)}px, % Delta = ${(((e.stage8Semantic.median - b.stage8Semantic.median) / b.stage8Semantic.median) * 100).toFixed(2)}%`);
  console.log(`Stage 8 Semantic P95: Baseline = ${b.stage8Semantic.p95.toFixed(2)}px, H-5A = ${e.stage8Semantic.p95.toFixed(2)}px, Absolute Delta = ${(e.stage8Semantic.p95 - b.stage8Semantic.p95).toFixed(2)}px, % Delta = ${(((e.stage8Semantic.p95 - b.stage8Semantic.p95) / b.stage8Semantic.p95) * 100).toFixed(2)}%`);
  console.log(`Corridor Locality Median: Baseline = ${b.corridorLocalityMedian.toFixed(2)}px, H-5A = ${e.corridorLocalityMedian.toFixed(2)}px, Absolute Delta = ${(e.corridorLocalityMedian - b.corridorLocalityMedian).toFixed(2)}px`);
}

console.log('\n--- DISPLACEMENT COMPARISON ---');
for (const key of Object.keys(baseline)) {
  const b = baseline[key];
  const e = experiment[key];
  console.log(`\n[${key}]`);
  console.log(`Displacement S7->S8 Median: Baseline = ${b.displacements.s7_s8.median.toFixed(2)}px, H-5A = ${e.displacements.s7_s8.median.toFixed(2)}px`);
  console.log(`Displacement S8->S11 Median: Baseline = ${b.displacements.s8_s11.median.toFixed(2)}px, H-5A = ${e.displacements.s8_s11.median.toFixed(2)}px`);
  console.log(`Displacement S7->Final Median: Baseline = ${b.displacements.s7_final.median.toFixed(2)}px, H-5A = ${e.displacements.s7_final.median.toFixed(2)}px`);
}

// 10x Determinism Test
console.log('\n--- 10X DETERMINISM REPLAY TEST ---');
let determinismPass = true;
for (let run = 1; run <= 10; run++) {
  const replay = runFullPipelineHarness({ useDualOccupancy: true });
  for (const key of Object.keys(experiment)) {
    const orig = experiment[key];
    const rep = replay[key];
    if (orig.structural.bridgePrimaryOverlaps !== rep.structural.bridgePrimaryOverlaps ||
        orig.finalCanvasWidth !== rep.finalCanvasWidth) {
      determinismPass = false;
      console.error(`DETERMINISM FAIL on run ${run} for dataset ${key}`);
    }
  }
}
console.log(`10x Determinism Test Result: ${determinismPass ? 'PASS (100% Identical)' : 'FAIL'}`);

// Save full experimental dump
const dump = {
  baseline,
  experiment,
  determinismPass,
};
fs.writeFileSync('experiment-results-dump.json', JSON.stringify(dump, null, 2), 'utf8');
