#!/usr/bin/env node
/**
 * Regression tests for Explorer CLI argument forwarding.
 *
 * Pins the exact failure from the FOCUSED INVESTIGATION:
 *   npm run explorer -- --project Movie
 * forwarded as:
 *   node scripts/run-explorer.cjs -- Movie
 * and "Movie" was classified as a source path under ROOT_DIR:
 *   Source: C:\Users\User\Downloads\dependency-analyzer\Movie
 *   ENOTDIR: not a directory, scandir '...\dependency-analyzer\Movie'
 */

const assert = require("assert");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const RUN_EXPLORER = path.join(ROOT, "scripts", "run-explorer.cjs");
const { parseArgs } = require(RUN_EXPLORER);

let failures = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (err) {
    failures++;
    console.error(`FAIL: ${name}`);
    console.error(`  ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Unit tests: parseArgs semantics (project name vs source path)
// ---------------------------------------------------------------------------

test("Test 1: parseArgs(['--project','Movie']) => project=movie, no source guessing", () => {
  const out = parseArgs(["node", RUN_EXPLORER, "--project", "Movie"]);
  assert.strictEqual(out.project, "movie", `project=${out.project}`);
  assert.strictEqual(out.explicitSource, false);
  assert.notStrictEqual(
    out.source,
    path.resolve(ROOT, "Movie"),
    `"Movie" was misclassified as source: ${out.source}`,
  );
});

test("Test 2: parseArgs(['--project','Movie','--source',<path>]) keeps source", () => {
  const src = "C:\\Users\\User\\Downloads\\Movie-App\\force-app\\main\\default";
  const out = parseArgs([
    "node",
    RUN_EXPLORER,
    "--project",
    "Movie",
    "--source",
    src,
  ]);
  assert.strictEqual(out.project, "movie");
  assert.strictEqual(out.explicitSource, true);
  assert.strictEqual(out.source, path.resolve(ROOT, src));
});

test("Test 3: parseArgs(['--','Movie']) => project=movie, not ...\\Movie source", () => {
  const out = parseArgs(["node", RUN_EXPLORER, "--", "Movie"]);
  assert.strictEqual(out.project, "movie", `project=${out.project}`);
  assert.strictEqual(out.explicitSource, false);
  assert.notStrictEqual(
    out.source,
    path.resolve(ROOT, "Movie"),
    `"Movie" was misclassified as source: ${out.source}`,
  );
});

test("Test 3b: parseArgs(['Movie']) => project=movie", () => {
  const out = parseArgs(["node", RUN_EXPLORER, "Movie"]);
  assert.strictEqual(out.project, "movie");
  assert.strictEqual(out.explicitSource, false);
});

test("Test 3c: parseArgs(['./force-app/main/default']) => source path preserved", () => {
  const out = parseArgs(["node", RUN_EXPLORER, "./force-app/main/default"]);
  assert.strictEqual(out.explicitSource, true);
  assert.ok(
    out.source.endsWith(path.join("force-app", "main", "default")),
    `source=${out.source}`,
  );
});

test("Test 3d: parseArgs([<windows-absolute-source>]) => source path preserved", () => {
  const src = "C:\\Users\\User\\Downloads\\Movie-App\\force-app\\main\\default";
  const out = parseArgs(["node", RUN_EXPLORER, src]);
  assert.strictEqual(out.explicitSource, true);
  assert.strictEqual(out.source, path.resolve(ROOT, src));
});

// ---------------------------------------------------------------------------
// Integration tests: real npm invocation
// ---------------------------------------------------------------------------

/**
 * Spawn a command, capture stdout/stderr, and kill it once the CLI has
 * printed its "Source:" line (i.e. after parseArgs has run) or after a
 * hard timeout. This avoids leaving the Vite dev server running.
 */
function captureStartup(cmd, args, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: ROOT, shell: true });
    let out = "";
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try {
        child.kill("SIGTERM");
      } catch (_) {}
      setTimeout(() => {
        try {
          child.kill("SIGKILL");
        } catch (_) {}
      }, 500);
      resolve(out);
    };
    const onData = (d) => {
      out += d.toString();
      // Stop as soon as the CLI has classified project and source.
      if (/^Source:\s/m.test(out)) {
        setTimeout(finish, 200);
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("close", () => {
      if (!done) {
        done = true;
        resolve(out);
      }
    });
    setTimeout(finish, timeoutMs);
  });
}

(async () => {
  // Test 4: npm run explorer -- Movie
  {
    const out = await captureStartup("npm", ["run", "explorer", "--", "Movie"]);
    try {
      assert.doesNotMatch(
        out,
        /ENOTDIR[\s\S]*dependency-analyzer[\\/]Movie/i,
        `npm workflow produced ENOTDIR on ROOT\\Movie:\n${out}`,
      );
      assert.doesNotMatch(
        out,
        /Source:\s*.*[\\/]dependency-analyzer[\\/]Movie\b/i,
        `"Movie" was misclassified as source under ROOT:\n${out}`,
      );
      console.log("PASS: Test 4: npm run explorer -- Movie");
    } catch (err) {
      failures++;
      console.error("FAIL: Test 4: npm run explorer -- Movie");
      console.error(`  ${err.message}`);
    }
  }

  // Test 5: npm run explorer -- -- --project Movie
  {
    const out = await captureStartup("npm", [
      "run",
      "explorer",
      "--",
      "--",
      "--project",
      "Movie",
    ]);
    const argvLine = out
      .split(/\r?\n/)
      .find((l) => l.includes("DEBUG RAW ARGV"));
    console.log(`  DEBUG RAW ARGV: ${argvLine || "(not found)"}`);
    const projectOk = /Project:\s*movie\b/i.test(out);
    const argvHasFlag =
      argvLine && /--project/.test(argvLine) && /"Movie"/.test(argvLine);
    try {
      assert.ok(projectOk, `Expected "Project: movie". Got:\n${out}`);
      if (!argvHasFlag) {
        console.log(
          "  NOTE: npm still intercepts --project in this environment; " +
            "only the positional form `npm run explorer -- Movie` is reliable.",
        );
      }
      console.log("PASS: Test 5: npm run explorer -- -- --project Movie");
    } catch (err) {
      failures++;
      console.error("FAIL: Test 5: npm run explorer -- -- --project Movie");
      console.error(`  ${err.message}`);
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} test(s) FAILED.`);
    process.exit(1);
  }
  console.log("\nAll explorer CLI forwarding tests passed.");
})();
