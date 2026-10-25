import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, relative, isAbsolute } from 'path';
import { existsSync, cpSync, mkdirSync, readFileSync, statSync } from 'fs';

const ANALYZE_PROJECTS_DIR = resolve(__dirname, '../analyze/projects');
const BUILD_OUT_DIR = resolve(__dirname, 'dist');
const PROJECTS_OUTPUT_DIR = resolve(BUILD_OUT_DIR, 'projects');

function isPathContained(parentDir: string, targetPath: string): boolean {
  const normalizedParent = resolve(parentDir);
  const safePath = targetPath.replace(/\\/g, '/');
  const normalizedTarget = resolve(parentDir, safePath);
  const rel = relative(normalizedParent, normalizedTarget);
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
}

function analyzeProjectsPlugin() {
  return {
    name: 'analyze-projects',
    configureServer(server) {
      server.middlewares.use('/projects', (req, res, next) => {
        const rawPath = req.url?.replace(/^\/?/, '') || '';
        let projectPath = rawPath;
        try {
          projectPath = decodeURIComponent(rawPath);
        } catch {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Bad Request: Malformed URI encoding' }));
          return;
        }

        if (!isPathContained(ANALYZE_PROJECTS_DIR, projectPath)) {
          res.statusCode = 403;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Forbidden: Path traversal detected' }));
          return;
        }
        const fullPath = resolve(ANALYZE_PROJECTS_DIR, projectPath);
        
        try {
          if (existsSync(fullPath) && statSync(fullPath).isFile()) {
            res.setHeader('Content-Type', 'application/json');
            res.end(readFileSync(fullPath));
          } else {
            next();
          }
        } catch {
          next();
        }
      });
    },
    closeBundle() {
      if (existsSync(ANALYZE_PROJECTS_DIR)) {
        mkdirSync(PROJECTS_OUTPUT_DIR, { recursive: true });
        cpSync(ANALYZE_PROJECTS_DIR, PROJECTS_OUTPUT_DIR, { recursive: true });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), analyzeProjectsPlugin()],
  server: {
    port: 3000
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        detached: resolve(__dirname, 'public/detached.html'),
      },
    },
  },
});
