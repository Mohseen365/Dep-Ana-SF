# Security Middleware Independent Test Report — DA-SEC-001

**Audit Target:** Vite Development Server Middleware (`explorer/vite.config.ts`)
**Target Route:** `/projects/*`
**Authorized Root Directory:** `analyze/projects` (`/app/analyze/projects`)
**Server Endpoint Tested:** `http://localhost:3000` (Vite Dev Server)
**Execution Date:** October 25, 2026
**Final Status:** **PASS (100% Path Containment Verified)**

---

## 1. Objective & Threat Model

The `/projects` route handler in `explorer/vite.config.ts` serves static JSON project artifacts (e.g. `/projects/pbim/explorer-data.json`) during local development.

**Vulnerability DA-SEC-001:** Unchecked path concatenation allowed requests containing directory traversal sequences (`..`) to read arbitrary files outside `analyze/projects` on the local filesystem.

**Security Invariants Verified:**
1. Requests targeting valid files inside `analyze/projects` must return HTTP 200 with JSON contents.
2. Requests attempting to escape `analyze/projects` via relative traversal (`..`), URL-encoded traversal (`%2F`), double-encoded traversal (`%252F`), absolute paths (`/etc/passwd`), mixed separators (`\`), or sentinel file references MUST NOT expose content outside the authorized directory.
3. Requests with malformed percent encoding MUST NOT crash the server or yield unhandled 500 exceptions.
4. Directory requests MUST NOT throw `EISDIR` file read exceptions.

---

## 2. Live HTTP Request Test Matrix

Executed via Node.js HTTP raw request runner (`scripts/test-security-middleware-live.cjs`) against a live Vite dev server process.

| Test ID | Scenario Description | HTTP Request Path | Observed HTTP Status | Security Outcome | Status |
| --- | --- | --- | --- | --- | --- |
| **TC-01** | Valid project artifact | `GET /projects/pbim/explorer-data.json` | `200 OK` | Served valid PBIM schema JSON | **PASS** |
| **TC-02** | Direct traversal (`../`) | `GET /projects/../../package.json` | `403 Forbidden` | Access denied; path traversal blocked | **PASS** |
| **TC-03** | URL-encoded traversal (`%2F`) | `GET /projects/..%2F..%2Fpackage.json` | `403 Forbidden` | Access denied; path traversal blocked | **PASS** |
| **TC-04** | Double-encoded traversal (`%252F`) | `GET /projects/..%252F..%252Fpackage.json` | `403 Forbidden` | Access denied; path traversal blocked | **PASS** |
| **TC-05** | Absolute path traversal | `GET /projects//etc/passwd` | `403 Forbidden` | Access denied; absolute path blocked | **PASS** |
| **TC-06** | Encoded absolute path | `GET /projects/%2Fetc%2Fpasswd` | `403 Forbidden` | Access denied; absolute path blocked | **PASS** |
| **TC-07** | Mixed separator child traversal (valid) | `GET /projects/pbim/../pbim/explorer-data.json` | `200 OK` | Normalized path inside target directory allowed | **PASS** |
| **TC-08** | Mixed separator backslash escape (`\`) | `GET /projects/pbim/..\..\package.json` | `403 Forbidden` | Access denied; backslash escape blocked | **PASS** |
| **TC-09** | Malformed percent encoding | `GET /projects/%E0%A4%A` | `400 Bad Request` | Handled gracefully without 500 crash | **PASS** |
| **TC-10** | Empty subpath request | `GET /projects/` | `403 Forbidden` | Subpath boundary enforced | **PASS** |
| **TC-11** | Bare subpath request | `GET /projects` | `403 Forbidden` | Subpath boundary enforced | **PASS** |
| **TC-12** | Directory request | `GET /projects/pbim` | `200 OK (SPA Fallback)` | Passed to `next()`; zero `EISDIR` crashes | **PASS** |
| **TC-13** | Sentinel file escape attempt | `GET /projects/../../scratch/sentinel_secret.txt` | `403 Forbidden` | Secret sentinel file untouched and unexposed | **PASS** |

---

## 3. Implementation Code Review

The final hardened middleware in `explorer/vite.config.ts`:

```typescript
function isPathContained(parentDir: string, targetPath: string): boolean {
  const normalizedParent = resolve(parentDir);
  // Normalize backslashes to forward slashes for cross-platform path resolution
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
    ...
```

---

## 4. Conclusion

The path-traversal vulnerability DA-SEC-001 in `explorer/vite.config.ts` has been fully remediated and verified against a live dev server. Zero path escape vectors remain.
