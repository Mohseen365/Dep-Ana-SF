#!/usr/bin/env node
'use strict';

/**
 * Read-only, compact repository evidence snapshot for context/repository audits.
 * Run from the repository root: node /path/to/repository-evidence-snapshot.cjs
 * It does NOT run tests, modify files, install dependencies, or print large JSON payloads.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const ROOT = process.cwd();
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
function git(args) {
  try { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return null; }
}
function tracked(file) {
  const result = git(['ls-files', '--error-unmatch', '--', file]);
  return result === file ? true : (result ? true : null);
}
function fileEvidence(relativePath) {
  const abs = path.resolve(ROOT, relativePath);
  const exists = fs.existsSync(abs);
  const item = { path: relativePath, exists, tracked: tracked(relativePath) };
  if (!exists) return item;
  try {
    const stat = fs.statSync(abs);
    item.type = stat.isFile() ? 'file' : stat.isDirectory() ? 'directory' : 'other';
    if (stat.isFile()) {
      const buf = fs.readFileSync(abs);
      item.sizeBytes = stat.size;
      item.sha256 = sha256(buf);
      if (relativePath.endsWith('.json')) {
        try {
          const json = JSON.parse(buf.toString('utf8'));
          item.json = { valid: true, topLevelKeys: Object.keys(json) };
          if (json.project && typeof json.project === 'object') {
            item.json.project = {
              id: json.project.id ?? null,
              name: json.project.name ?? null,
              sourcePath: json.project.sourcePath ?? null,
              analysisPath: json.project.analysisPath ?? null,
              analysisStatus: json.project.analysisStatus ?? null,
              componentCount: json.project.componentCount ?? null,
              dependencyCount: json.project.dependencyCount ?? null
            };
          }
          if (json.summary && typeof json.summary === 'object') {
            item.json.summary = {
              nodeCount: json.summary.nodeCount ?? null,
              edgeCount: json.summary.edgeCount ?? null,
              highRiskCount: json.summary.highRiskCount ?? null,
              mediumRiskCount: json.summary.mediumRiskCount ?? null,
              lowRiskCount: json.summary.lowRiskCount ?? null,
              cycleCount: json.summary.cycleCount ?? null,
              unresolvedCount: json.summary.unresolvedCount ?? null
            };
          }
          if (Array.isArray(json.projects)) {
            item.json.projects = json.projects.map(p => ({
              id: p.id ?? null,
              analysisPath: p.analysisPath ?? null,
              sourcePath: p.sourcePath ?? null,
              name: p.name ?? null
            }));
          }
        } catch (e) { item.json = { valid: false, parseError: e.message }; }
      }
    }
  } catch (e) { item.readError = e.message; }
  return item;
}

const candidateFiles = [
  'package.json', '.gitignore', 'AGENT.md', 'CONTEXT-RETRIEVAL-PROTOCOL.md',
  'analyze/project-manifest.json', 'project-manifest.json', 'analyze/project-metadata.json',
  'analyze/explorer-data.json', 'analyze/projects/pbim/explorer-data.json',
  'analyze/projects/pbim/project-metadata.json', 'analyze/projects/movie/explorer-data.json',
  'analyze/projects/movie/project-metadata.json',
  'explorer/public/explorer-data.json', 'explorer/public/pbim/explorer-data.json',
  'explorer/public/projects/pbim/explorer-data.json',
  'explorer/public/projects/movie/explorer-data.json',
  'scripts/export-explorer.cjs', 'scripts/test-export-explorer.cjs',
  'scripts/test-pbim-dedicated-data-path.cjs', 'scripts/test-multi-project.cjs',
  'scripts/test-source-resolution.cjs'
];

const manifestSummaries = {};
for (const manifestPath of ['analyze/project-manifest.json', 'project-manifest.json']) {
  const abs = path.join(ROOT, manifestPath);
  if (!fs.existsSync(abs)) continue;
  try {
    const data = JSON.parse(fs.readFileSync(abs, 'utf8'));
    manifestSummaries[manifestPath] = (data.projects || []).map(p => ({
      id: p.id ?? null, analysisPath: p.analysisPath ?? null, sourcePath: p.sourcePath ?? null,
      name: p.name ?? null, aliasOf: p.aliasOf ?? null
    }));
  } catch (e) { manifestSummaries[manifestPath] = { parseError: e.message }; }
}

let packageScripts = null;
try { packageScripts = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts || {}; } catch {}
const deps = {};
for (const name of ['vite', 'playwright', '@playwright/test']) {
  try { deps[name] = require.resolve(name + '/package.json', { paths: [ROOT] }); }
  catch { deps[name] = null; }
}

const output = {
  reportType: 'read-only-repository-evidence-snapshot',
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  root: ROOT,
  git: {
    available: git(['rev-parse', '--is-inside-work-tree']) === 'true',
    branch: git(['branch', '--show-current']),
    head: git(['rev-parse', 'HEAD']),
    statusShort: git(['status', '--short']),
    statusPorcelainV1: git(['status', '--porcelain=v1', '--untracked-files=all'])
  },
  dependencies: deps,
  packageScripts,
  manifests: manifestSummaries,
  files: candidateFiles.map(fileEvidence)
};
process.stdout.write(JSON.stringify(output, null, 2) + '\n');
