/**
 * test-component-provenance.cjs
 * Wave 0.4.7 Verification Harness for Component API Provenance:
 * Extracts lines, properties, methods, inbound handlers, and dispatched events
 * from scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const repoRoot = process.cwd();
const targetFile = path.resolve(repoRoot, 'scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js');
const logDir = path.resolve(__dirname, 'evidence/raw');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

function runProvenanceAudit() {
  console.log('=== WAVE 0.4.7 COMPONENT API SOURCE PROVENANCE AUDIT ===');
  const t0 = new Date().toISOString();

  const fileBytes = fs.readFileSync(targetFile);
  const fileSha = crypto.createHash('sha256').update(fileBytes).digest('hex');
  const content = fileBytes.toString('utf8');
  const lines = content.split('\n');

  // Find line indices
  let activeProjectIdLine = -1;
  let activeProjectKeyLine = -1;
  let handleFilterChangeStart = -1;
  let handleFilterChangeEnd = -1;
  let handleContainerChangeStart = -1;
  let handleContainerChangeEnd = -1;
  let handleProjectChangeStart = -1;
  let handleProjectChangeEnd = -1;
  let handleNodeSelectStart = -1;
  let handleNodeSelectEnd = -1;

  const dispatchedEvents = [];

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.includes('@api activeProjectId')) activeProjectIdLine = i + 1;
    if (l.includes('@api activeProjectKey')) activeProjectKeyLine = i + 1;
    if (l.includes('handleFilterChange(')) handleFilterChangeStart = i + 1;
    if (handleFilterChangeStart !== -1 && handleFilterChangeEnd === -1 && l.includes('handleContainerChange(')) handleFilterChangeEnd = i;
    if (l.includes('handleContainerChange(')) handleContainerChangeStart = i + 1;
    if (handleContainerChangeStart !== -1 && handleContainerChangeEnd === -1 && l.includes('handleProjectChange(')) handleContainerChangeEnd = i;
    if (l.includes('handleProjectChange(')) handleProjectChangeStart = i + 1;
    if (handleProjectChangeStart !== -1 && handleProjectChangeEnd === -1 && l.includes('handleNodeSelect(')) handleProjectChangeEnd = i;
    if (l.includes('handleNodeSelect(')) {
      handleNodeSelectStart = i + 1;
      // handleNodeSelect is the final method before the closing brace at line 593
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() === '}') {
          handleNodeSelectEnd = j + 1;
          break;
        }
      }
    }

    if (l.includes('dispatchEvent') || l.includes('CustomEvent')) {
      dispatchedEvents.push({ line: i + 1, content: l.trim() });
    }
  }

  const t1 = new Date().toISOString();
  const logContent = `COMPONENT: daAppShell.js\nPATH: scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js\nSHA256: ${fileSha}\nLINE_COUNT: ${lines.length}\nACTIVE_PROJECT_ID_LINE: ${activeProjectIdLine}\nACTIVE_PROJECT_KEY_LINE: ${activeProjectKeyLine}\nDISPATCHED_EVENTS_COUNT: ${dispatchedEvents.length}\nSTART: ${t0}\nEND: ${t1}\n`;
  const logFileName = 'component-api-provenance.log';
  fs.writeFileSync(path.join(logDir, logFileName), logContent, 'utf8');

  console.log(`Provenance Audit complete: ${lines.length} lines, SHA: ${fileSha}, Dispatched events: ${dispatchedEvents.length}`);
  return {
    fileSha,
    lineCount: lines.length,
    activeProjectIdLine,
    activeProjectKeyLine,
    handleFilterChangeRange: `${handleFilterChangeStart}-${handleFilterChangeEnd}`,
    handleContainerChangeRange: `${handleContainerChangeStart}-${handleContainerChangeEnd}`,
    handleProjectChangeRange: `${handleProjectChangeStart}-${handleProjectChangeEnd}`,
    handleNodeSelectRange: `${handleNodeSelectStart}-${handleNodeSelectEnd}`,
    dispatchedEvents
  };
}

module.exports = { runProvenanceAudit };
if (require.main === module) {
  runProvenanceAudit();
}
