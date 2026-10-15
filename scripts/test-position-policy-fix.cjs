#!/usr/bin/env node
/**
 * CJS wrapper runner for Phase 2 Targeted Layout Initialization Fix Test Suite
 */

const { execSync } = require('child_process');
const path = require('path');

const scriptPath = path.join(__dirname, 'test-position-policy-fix.mjs');

try {
  execSync(`node --experimental-transform-types "${scriptPath}"`, {
    stdio: 'inherit',
  });
} catch (err) {
  process.exit(err.status || 1);
}
