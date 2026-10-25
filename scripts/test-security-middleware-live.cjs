/**
 * Independent Live Verification Script for DA-SEC-001 (/projects Middleware Path Containment)
 *
 * Starts Vite dev server, runs HTTP request test matrix against live endpoint sending RAW HTTP paths,
 * verifies security invariants, and terminates server process.
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = 3000;

function makeRawRequest(requestPath) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: requestPath,
      method: 'GET',
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error(`Request timeout for ${requestPath}`));
    });
    req.end();
  });
}

function waitForServer(maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await makeRawRequest('/');
        if (res.statusCode < 500) {
          clearInterval(interval);
          return resolve(true);
        }
      } catch (err) {
        // server not ready yet
      }
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        reject(new Error(`Server failed to start on http://localhost:${PORT} after ${maxAttempts} attempts`));
      }
    }, 500);
  });
}

async function runTestMatrix() {
  console.log('======================================================================');
  console.log('Executing Live Security Middleware Matrix (DA-SEC-001)...');
  console.log('======================================================================');

  // Ensure sentinel file exists in workspace scratch directory outside analyze/projects
  const scratchDir = path.resolve(__dirname, '../scratch');
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }
  const sentinelPath = path.resolve(scratchDir, 'sentinel_secret.txt');
  fs.writeFileSync(sentinelPath, 'SENTINEL_SECRET_DATA_DO_NOT_EXPOSE');

  const matrix = [
    {
      id: 'TC-01',
      name: 'Valid project artifact path',
      path: '/projects/pbim/explorer-data.json',
      expectedStatuses: [200],
      validate: (res) => res.body.includes('"schemaVersion"') || res.body.includes('summary'),
    },
    {
      id: 'TC-02',
      name: 'Direct traversal using ../',
      path: '/projects/../../package.json',
      expectedStatuses: [403, 404],
      validate: (res) => !res.body.includes('"salesforce-architecture-explorer"'),
    },
    {
      id: 'TC-03',
      name: 'URL-encoded traversal (%2F)',
      path: '/projects/..%2F..%2Fpackage.json',
      expectedStatuses: [403],
      validate: (res) => res.body.includes('Path traversal detected'),
    },
    {
      id: 'TC-04',
      name: 'Double-encoded traversal (%252F)',
      path: '/projects/..%252F..%252Fpackage.json',
      expectedStatuses: [403],
      validate: (res) => res.body.includes('Path traversal detected'),
    },
    {
      id: 'TC-05',
      name: 'Absolute path traversal (/etc/passwd)',
      path: '/projects//etc/passwd',
      expectedStatuses: [403],
      validate: (res) => res.body.includes('Path traversal detected'),
    },
    {
      id: 'TC-06',
      name: 'Encoded absolute path (%2Fetc%2Fpasswd)',
      path: '/projects/%2Fetc%2Fpasswd',
      expectedStatuses: [403],
      validate: (res) => res.body.includes('Path traversal detected'),
    },
    {
      id: 'TC-07',
      name: 'Mixed separator child traversal (normalized valid)',
      path: '/projects/pbim/../pbim/explorer-data.json',
      expectedStatuses: [200],
      validate: (res) => res.body.includes('schemaVersion') || res.body.includes('summary'),
    },
    {
      id: 'TC-08',
      name: 'Mixed separator escape attempt',
      path: '/projects/pbim/..\\..\\package.json',
      expectedStatuses: [403],
      validate: (res) => res.body.includes('Path traversal detected'),
    },
    {
      id: 'TC-09',
      name: 'Malformed percent encoding',
      path: '/projects/%E0%A4%A',
      expectedStatuses: [400, 403],
      validate: (res) => res.body.includes('Malformed URI encoding') || res.body.includes('Bad Request') || res.body.includes('Forbidden'),
    },
    {
      id: 'TC-10',
      name: 'Empty subpath request (/projects/)',
      path: '/projects/',
      expectedStatuses: [403],
      validate: (res) => res.body.includes('Path traversal detected'),
    },
    {
      id: 'TC-11',
      name: 'Bare subpath request (/projects)',
      path: '/projects',
      expectedStatuses: [403],
      validate: (res) => res.body.includes('Path traversal detected'),
    },
    {
      id: 'TC-12',
      name: 'Directory request (/projects/pbim)',
      path: '/projects/pbim',
      expectedStatuses: [200, 404], // 200 via Vite HTML SPA fallback or 404
      validate: (res) => !res.body.includes('"schemaVersion"') && !res.body.includes('index.ts'),
    },
    {
      id: 'TC-13',
      name: 'Sentinel file escape attempt',
      path: '/projects/../../scratch/sentinel_secret.txt',
      expectedStatuses: [403, 404],
      validate: (res) => !res.body.includes('SENTINEL_SECRET_DATA'),
    },
  ];

  const results = [];
  let passedCount = 0;
  let failedCount = 0;

  for (const tc of matrix) {
    try {
      const res = await makeRawRequest(tc.path);
      const statusMatches = tc.expectedStatuses.includes(res.statusCode);
      const contentValid = tc.validate(res);
      const passed = statusMatches && contentValid;

      if (passed) passedCount++; else failedCount++;

      results.push({
        id: tc.id,
        name: tc.name,
        path: tc.path,
        observedStatus: res.statusCode,
        expectedStatuses: tc.expectedStatuses,
        passed,
        bodySnippet: res.body.slice(0, 100).replace(/\n/g, ' '),
      });

      console.log(`[${passed ? 'PASS' : 'FAIL'}] ${tc.id}: ${tc.name}`);
      console.log(`       Request: GET ${tc.path}`);
      console.log(`       Status: ${res.statusCode} (Expected ${tc.expectedStatuses.join(' or ')})`);
      if (!passed) {
        console.log(`       Body: ${res.body.slice(0, 200)}`);
      }
    } catch (err) {
      failedCount++;
      results.push({
        id: tc.id,
        name: tc.name,
        path: tc.path,
        error: err.message,
        passed: false,
      });
      console.log(`[FAIL] ${tc.id}: ${tc.name} - Error: ${err.message}`);
    }
  }

  // Cleanup sentinel
  if (fs.existsSync(sentinelPath)) {
    fs.unlinkSync(sentinelPath);
  }

  console.log('----------------------------------------------------------------------');
  console.log(`Live Security Test Summary: ${passedCount} PASSED, ${failedCount} FAILED out of ${matrix.length} tests.`);
  console.log('======================================================================');

  return { results, passedCount, failedCount, total: matrix.length };
}

async function main() {
  console.log('Starting Vite dev server for live security middleware testing...');
  const explorerDir = path.resolve(__dirname, '../explorer');
  const serverProc = spawn('npm', ['run', 'dev'], {
    cwd: explorerDir,
    stdio: 'ignore',
    env: { ...process.env, PORT: '3000' }
  });

  try {
    await waitForServer();
    console.log('Vite dev server ready on http://localhost:3000');
    const summary = await runTestMatrix();

    // Kill server process
    serverProc.kill('SIGTERM');

    if (summary.failedCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal error during live security verification:', err);
    serverProc.kill('SIGKILL');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
