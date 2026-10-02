import { runFullPipelineHarness } from './run-harness';
import * as fs from 'fs';
import * as path from 'path';

const exp = runFullPipelineHarness({ useDualOccupancy: true });
const bqc = exp.BQC;

console.log('=== BQC OVERLAP INVESTIGATION ===');
const stage8 = bqc.stage8Positions;
const fullPath = path.resolve(process.cwd(), 'explorer/public/projects/bqc/explorer-data.json');
const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

// find the overlap
for (const [id1, pos1] of Object.entries(stage8)) {
  for (const [id2, pos2] of Object.entries(stage8)) {
    if (id1 >= id2) continue;
    const p1 = pos1 as { x: number; y: number };
    const p2 = pos2 as { x: number; y: number };
    if (Math.abs(p1.x - p2.x) < 160 - 1e-3 && Math.abs(p1.y - p2.y) < 100 - 1e-3) {
      console.log(`Overlap found between ${id1} (${p1.x}, ${p1.y}) and ${id2} (${p2.x}, ${p2.y})`);
      console.log(`dx = Math.abs(${p1.x} - ${p2.x}) = ${Math.abs(p1.x - p2.x)}`);
      console.log(`dy = Math.abs(${p1.y} - ${p2.y}) = ${Math.abs(p1.y - p2.y)}`);
    }
  }
}
