import fs from 'fs';
import path from 'path';

// Helper to count cyclomatic complexity heuristically by counting decision keywords/operators
function measureFileComplexity(filepath: string) {
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split('\n');

  let currentFn = '';
  let fnComplexity = 0;
  const fnComplexities: { name: string; complexity: number; line: number }[] = [];

  lines.forEach((line, idx) => {
    // Detect function declarations
    const fnMatch = line.match(/(?:function\s+([a-zA-Z0-9_]+)|const\s+([a-zA-Z0-9_]+)\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>)/);
    if (fnMatch) {
      if (currentFn) {
        fnComplexities.push({ name: currentFn, complexity: fnComplexity, line: idx });
      }
      currentFn = fnMatch[1] || fnMatch[2] || 'anonymous';
      fnComplexity = 1; // Base complexity
    }

    if (currentFn) {
      // Count decisions: if, else if, case, for, while, catch, &&, ||, ?
      const decisions = (line.match(/\b(if|else\s+if|case|for|while|catch)\b|&&|\|\||\?/g) || []).length;
      fnComplexity += decisions;
    }
  });

  if (currentFn) {
    fnComplexities.push({ name: currentFn, complexity: fnComplexity, line: lines.length });
  }

  return fnComplexities;
}

console.log('--- M-05 CYCLOMATIC COMPLEXITY AUDIT ---');
const file = 'explorer/src/lib/architecture-layout.ts';
const res = measureFileComplexity(file);
console.log(`File: ${file}`);
res.forEach(f => {
  const flag = f.complexity > 15 ? ' [HIGH COMPLEXITY > 15]' : '';
  console.log(`- Function: ${f.name.padEnd(30)} | Complexity: ${f.complexity.toString().padStart(3)}${flag}`);
});
