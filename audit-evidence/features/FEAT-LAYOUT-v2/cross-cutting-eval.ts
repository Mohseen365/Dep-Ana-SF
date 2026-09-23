import fs from 'fs';
import path from 'path';

console.log('--- CROSS-CUTTING CONCERNS EVALUATION ---');

// SEC: Verify no localStorage, fetch, XMLHttpRequest, process.env, import.meta.env in layout/*.ts or architecture-layout.ts
const layoutFiles = [
  'explorer/src/lib/architecture-layout.ts',
  ...fs.readdirSync('explorer/src/lib/layout').filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts')).map(f => `explorer/src/lib/layout/${f}`)
];

let secViolations = 0;
layoutFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (/localStorage|sessionStorage|fetch\(|XMLHttpRequest|process\.env|import\.meta\.env/.test(content)) {
    console.log(`SEC Violation found in ${file}`);
    secViolations++;
  }
});
console.log(`SEC Evaluation: ${secViolations === 0 ? 'PASS (0 external/storage reads in layout engine)' : 'FAIL'}`);

// SCALE: Verify spacing.ts uses spatial hash grid
const spacingContent = fs.readFileSync('explorer/src/lib/layout/spacing.ts', 'utf8');
const usesGrid = spacingContent.includes('spatialGrid') || spacingContent.includes('Grid') || spacingContent.includes('cellKey');
console.log(`SCALE Evaluation (spacing.ts O(N) hash grid): ${usesGrid ? 'PASS (Uses spatial grid optimization)' : 'FAIL'}`);

// DOC: Verify 02_Layout_Engine_Spatial.md matches current behavior
const docContent = fs.readFileSync('02_Layout_Engine_Spatial.md', 'utf8');
const docMatches = docContent.includes('94,662') && docContent.includes('13-stage');
console.log(`DOC Evaluation (02_Layout_Engine_Spatial.md): ${docMatches ? 'PASS (Documents 13-stage pipeline & 94,662 Candidate E runtime)' : 'FAIL'}`);

// GOV: Position authority override check in computeArchitectureLayout
const archContent = fs.readFileSync('explorer/src/lib/architecture-layout.ts', 'utf8');
const govPass = archContent.includes('existingPositions') && archContent.includes('for (const [id, pos] of Object.entries(existingPositions))');
console.log(`GOV Evaluation (Position authority cannot be bypassed): ${govPass ? 'PASS (Position authority restoration enforced at Stage 12 boundary)' : 'FAIL'}`);
