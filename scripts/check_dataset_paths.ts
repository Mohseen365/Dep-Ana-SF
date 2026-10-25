import * as fs from 'fs';
import * as crypto from 'crypto';

const paths = [
  'explorer/public/projects/pbim/explorer-data.json',
  'analyze/projects/pbim/explorer-data.json'
];

paths.forEach(p => {
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf8');
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    console.log(`Path: ${p} | SHA-256: ${hash}`);
  } else {
    console.log(`Path: ${p} | NOT FOUND`);
  }
});
