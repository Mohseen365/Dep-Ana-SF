const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');

async function debug() {
  const analyzeManifest = path.join(__dirname, '../analyze/project-manifest.json');
  const publicManifest = path.join(__dirname, '../explorer/public/project-manifest.json');
  fs.copyFileSync(analyzeManifest, publicManifest);

  try {
    execSync('kill $(lsof -t -i :3000) 2>/dev/null || true', { stdio: 'ignore' });
  } catch (_) {}

  const server = spawn('./node_modules/.bin/vite', ['--port', '3000'], {
    cwd: path.join(__dirname, '../explorer'),
    stdio: 'ignore',
    shell: true,
  });

  await new Promise((r) => setTimeout(r, 3500));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('response', (res) => {
    if (res.url().includes('explorer-data.json') || res.url().includes('manifest')) {
      console.log('RESP:', res.status(), res.headers()['content-type'], res.url());
    }
  });

  await page.goto('http://localhost:3000/?project=pbim');
  console.log('Navigated. Waiting for 528 components in status bar...');

  await page.waitForFunction(
    () => document.querySelector('.status-bar')?.textContent.includes('528'),
    { timeout: 15000 }
  );

  const status = await page.evaluate(() => {
    const el = document.querySelector('.status-bar');
    return el ? el.textContent : 'NO STATUS BAR';
  });

  console.log('FINAL STATUS BAR:', status);

  await browser.close();
  server.kill();
}

debug();
