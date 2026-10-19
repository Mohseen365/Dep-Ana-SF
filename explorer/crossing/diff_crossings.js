const fs = require('fs');
const path = require('path');

const candidatePath = path.resolve('C:/Users/User/.gemini/antigravity/brain/fcb6ffb4-07ae-4aa2-b87e-f838f284d719/candidate_cross_debug.json');
const oraclePath = path.resolve('C:/Users/User/.gemini/antigravity/brain/fcb6ffb4-07ae-4aa2-b87e-f838f284d719/oracle_cross_debug.json');
const outPath = path.resolve('C:/Users/User/.gemini/antigravity/brain/fcb6ffb4-07ae-4aa2-b87e-f838f284d719/primary_primary_extra.json');

function load(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function primaryMap(data) {
  const map = new Map();
  for (const rec of data) {
    if (rec.classification === 'primary-primary') {
      const key = `${rec.edgeA.sourceId}->${rec.edgeA.targetId}|${rec.edgeB.sourceId}->${rec.edgeB.targetId}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
  }
  return map;
}
const cand = load(candidatePath);
const ora = load(oraclePath);
const candMap = primaryMap(cand);
const oraMap = primaryMap(ora);
const extra = [];
for (const [key, cnt] of candMap.entries()) {
  const oraCnt = oraMap.get(key) || 0;
  if (cnt > oraCnt) {
    const diff = cnt - oraCnt;
    const [first, second] = key.split('|');
    const [srcA, tgtA] = first.split('->');
    const [srcB, tgtB] = second.split('->');
    for (let i = 0; i < diff; i++) {
      extra.push({ edgeA: { sourceId: srcA, targetId: tgtA }, edgeB: { sourceId: srcB, targetId: tgtB } });
    }
  }
}
fs.writeFileSync(outPath, JSON.stringify(extra, null, 2), 'utf8');
console.log('Extra primary-primary crossings written, count:', extra.length);
