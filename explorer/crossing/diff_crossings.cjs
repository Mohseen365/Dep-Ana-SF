const fs = require('fs');
const path = require('path');

const candidatePath = path.resolve(__dirname, 'candidate_cross_debug.json');
const oraclePath = path.resolve(__dirname, 'oracle_cross_debug.json');
const outPath = path.resolve(__dirname, 'primary_primary_extra.json');

function load(file) {
  const raw = fs.readFileSync(file, 'utf8');
  let validStr = raw;
  const lastBracket = raw.lastIndexOf(']');
  if (lastBracket !== -1 && lastBracket < raw.length - 1) {
    // Trim trailing garbage if present
    const firstEnd = raw.indexOf(']\n]');
    if (firstEnd !== -1) {
      validStr = raw.substring(0, firstEnd + 1);
    } else {
      validStr = raw.substring(0, raw.lastIndexOf(']\n') !== -1 ? raw.lastIndexOf(']\n') + 1 : raw.lastIndexOf(']') + 1);
    }
  }
  try {
    return JSON.parse(validStr);
  } catch (e) {
    // Fallback: slice at last valid array ending
    const validSub = raw.substring(0, 10411693);
    return JSON.parse(validSub);
  }
}

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

const ora = load(oraclePath);
const oraMap = primaryMap(ora);

let cand = [];
if (fs.existsSync(candidatePath)) {
  try {
    cand = load(candidatePath);
  } catch (e) {
    console.log('Candidate file is not valid JSON array or copy script stub');
  }
}

const candMap = primaryMap(cand);

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
