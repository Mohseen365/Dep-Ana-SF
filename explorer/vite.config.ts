import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { existsSync, cpSync, mkdirSync, readFileSync } from 'fs';

const ANALYZE_PROJECTS_DIR = resolve(__dirname, '../analyze/projects');
const BUILD_OUT_DIR = resolve(__dirname, 'dist');
const PROJECTS_OUTPUT_DIR = resolve(BUILD_OUT_DIR, 'projects');

function analyzeProjectsPlugin() {
  return {
    name: 'analyze-projects',
    configureServer(server) {
      server.middlewares.use('/projects', (req, res, next) => {
        const projectPath = req.url?.replace(/^\/?/, '') || '';
        const fullPath = resolve(ANALYZE_PROJECTS_DIR, projectPath);
        
        if (existsSync(fullPath)) {
          res.setHeader('Content-Type', 'application/json');
          res.end(readFileSync(fullPath));
        } else {
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
