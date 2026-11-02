const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  verifyFilesystemContainment,
  normalizeSafePath,
  pathSafeRollback,
  PatchGateError
} = require('./patch-gate.cjs');

console.log('Running Filesystem Containment & Deterministic Race Harness (CONT-01 to CONT-16)...');

let passed = 0;
let total = 0;

function runTest(id, name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ [${id}] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ [${id}] ${name} FAILED:`, err.message);
    throw err;
  }
}

function createTempRoot() {
  return fs.mkdtempSync(path.join('/tmp', 'cont-root-'));
}

runTest('CONT-01', 'Valid relative path inside root passes', () => {
  const root = createTempRoot();
  const filePath = path.join(root, 'foo/bar.txt');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, 'hello');
  const res = verifyFilesystemContainment(root, 'foo/bar.txt');
  assert.strictEqual(res.normRel, 'foo/bar.txt');
  fs.rmSync(root, { recursive: true, force: true });
});

runTest('CONT-02', 'Normalization eliminates . and redundant slashes', () => {
  assert.strictEqual(normalizeSafePath('foo/./bar//baz.txt'), 'foo/bar/baz.txt');
});

runTest('CONT-03', 'Path traversal .. inside root normalizes safely', () => {
  assert.strictEqual(normalizeSafePath('foo/bar/../baz.txt'), 'foo/baz.txt');
});

runTest('CONT-04', 'Path traversal .. attempting escape throws PATH_TRAVERSAL', () => {
  assert.throws(() => normalizeSafePath('../escape.txt'), (err) => {
    return err instanceof PatchGateError && err.code === 'PATH_TRAVERSAL';
  });
});

runTest('CONT-05', 'Leading slash / throws ABSOLUTE_PATH', () => {
  assert.throws(() => normalizeSafePath('/etc/passwd'), (err) => {
    return err instanceof PatchGateError && err.code === 'ABSOLUTE_PATH';
  });
});

runTest('CONT-06', 'Windows drive letter throws ABSOLUTE_PATH', () => {
  assert.throws(() => normalizeSafePath('C:/Windows/System32'), (err) => {
    return err instanceof PatchGateError && err.code === 'ABSOLUTE_PATH';
  });
});

runTest('CONT-07', 'UNC network path throws ABSOLUTE_PATH', () => {
  assert.throws(() => normalizeSafePath('\\\\server\\share\\file'), (err) => {
    return err instanceof PatchGateError && err.code === 'ABSOLUTE_PATH';
  });
});

runTest('CONT-08', 'NUL byte throws NUL_BYTE_PATH', () => {
  assert.throws(() => normalizeSafePath('file\0.txt'), (err) => {
    return err instanceof PatchGateError && err.code === 'NUL_BYTE_PATH';
  });
});

runTest('CONT-09', 'Bare directory throws DIRECTORY_PATH', () => {
  assert.throws(() => normalizeSafePath('somedir/'), (err) => {
    return err instanceof PatchGateError && err.code === 'DIRECTORY_PATH';
  });
});

runTest('CONT-10', 'Existing directory target throws DIRECTORY_TARGET_DETECTED', () => {
  const root = createTempRoot();
  const dirPath = path.join(root, 'mydir');
  fs.mkdirSync(dirPath);
  assert.throws(() => verifyFilesystemContainment(root, 'mydir'), (err) => {
    return err instanceof PatchGateError && err.code === 'DIRECTORY_TARGET_DETECTED';
  });
  fs.rmSync(root, { recursive: true, force: true });
});

runTest('CONT-11', 'Symlink target detected and rejected', () => {
  const root = createTempRoot();
  const realFile = path.join(root, 'real.txt');
  fs.writeFileSync(realFile, 'real content');
  const symlinkPath = path.join(root, 'sym.txt');
  fs.symlinkSync(realFile, symlinkPath);
  assert.throws(() => verifyFilesystemContainment(root, 'sym.txt'), (err) => {
    return err instanceof PatchGateError && err.code === 'SYMLINK_TARGET_DETECTED';
  });
  fs.rmSync(root, { recursive: true, force: true });
});

runTest('CONT-12', 'Symlink pointing outside root detected and rejected', () => {
  const root = createTempRoot();
  const extFile = fs.mkdtempSync(path.join('/tmp', 'outside-'));
  const extTarget = path.join(extFile, 'secret.txt');
  fs.writeFileSync(extTarget, 'secret');
  fs.symlinkSync(extTarget, path.join(root, 'link.txt'));
  assert.throws(() => verifyFilesystemContainment(root, 'link.txt'), (err) => {
    return err instanceof PatchGateError && (err.code === 'SYMLINK_TARGET_DETECTED' || err.code === 'SYMLINK_ESCAPE');
  });
  fs.rmSync(extFile, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

runTest('CONT-13', 'Symlinked parent directory detected and rejected', () => {
  const root = createTempRoot();
  const extDir = fs.mkdtempSync(path.join('/tmp', 'outside-dir-'));
  fs.symlinkSync(extDir, path.join(root, 'symparent'));
  assert.throws(() => verifyFilesystemContainment(root, 'symparent/child.txt'), (err) => {
    return err instanceof PatchGateError && err.code === 'SYMLINK_PARENT_DETECTED';
  });
  fs.rmSync(extDir, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

runTest('CONT-14', 'Symlinked grandparent directory detected and rejected', () => {
  const root = createTempRoot();
  const extDir = fs.mkdtempSync(path.join('/tmp', 'outside-gp-'));
  fs.symlinkSync(extDir, path.join(root, 'symgrandparent'));
  assert.throws(() => verifyFilesystemContainment(root, 'symgrandparent/parent/child.txt'), (err) => {
    return err instanceof PatchGateError && err.code === 'SYMLINK_PARENT_DETECTED';
  });
  fs.rmSync(extDir, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

runTest('CONT-15', 'Deterministic parent-symlink replacement attempt after preflight hook', () => {
  const root = createTempRoot();
  const sentinelOutside = path.join('/tmp', `sentinel-cont15-${Date.now()}.txt`);
  fs.writeFileSync(sentinelOutside, 'IMMUTABLE_SENTINEL_OUTSIDE_ROOT');
  const sentinelHashBefore = crypto.createHash('sha256').update(fs.readFileSync(sentinelOutside)).digest('hex');

  const fileRel = 'nested/dir/target.txt';
  const fullTarget = path.join(root, fileRel);
  fs.mkdirSync(path.dirname(fullTarget), { recursive: true });
  fs.writeFileSync(fullTarget, 'original_target_content');
  const targetHash = crypto.createHash('sha256').update('original_target_content').digest('hex');

  const prov = {
    taskId: 'W5-1',
    touchedPaths: [fileRel],
    preApply: {
      [fileRel]: { exists: true, hash: targetHash, byteLength: 23, mode: 0o100644, encoding: 'base64', dataBase64: Buffer.from('original_target_content').toString('base64') }
    },
    postApply: {
      [fileRel]: { exists: true, hash: targetHash, byteLength: 23, mode: 0o100644 }
    }
  };

  const raceHook = (event, context) => {
    if (event === 'BEFORE_CONTAINMENT_INSPECTION') {
      const parentToSwap = path.join(root, 'nested');
      fs.rmSync(parentToSwap, { recursive: true, force: true });
      fs.symlinkSync('/tmp', parentToSwap);
    }
  };

  assert.throws(() => pathSafeRollback({ repoDir: root, provenance: prov, raceHook }), (err) => {
    return err instanceof PatchGateError && (err.code === 'SYMLINK_PARENT_DETECTED' || err.code === 'SYMLINK_ESCAPE');
  });

  const sentinelHashAfter = crypto.createHash('sha256').update(fs.readFileSync(sentinelOutside)).digest('hex');
  assert.strictEqual(sentinelHashAfter, sentinelHashBefore);

  fs.unlinkSync(sentinelOutside);
  fs.rmSync(root, { recursive: true, force: true });
});

runTest('CONT-16', 'Deterministic target replacement attempt after preflight hook', () => {
  const root = createTempRoot();
  const sentinelOutside = path.join('/tmp', `sentinel-cont16-${Date.now()}.txt`);
  fs.writeFileSync(sentinelOutside, 'IMMUTABLE_SENTINEL_OUTSIDE_ROOT');
  const sentinelHashBefore = crypto.createHash('sha256').update(fs.readFileSync(sentinelOutside)).digest('hex');

  const fileRel = 'direct_target.txt';
  const fullTarget = path.join(root, fileRel);
  fs.writeFileSync(fullTarget, 'target_content');
  const targetHash = crypto.createHash('sha256').update('target_content').digest('hex');

  const prov = {
    taskId: 'W5-1',
    touchedPaths: [fileRel],
    preApply: {
      [fileRel]: { exists: true, hash: targetHash, byteLength: 14, mode: 0o100644, encoding: 'base64', dataBase64: Buffer.from('target_content').toString('base64') }
    },
    postApply: {
      [fileRel]: { exists: true, hash: targetHash, byteLength: 14, mode: 0o100644 }
    }
  };

  const raceHook = (event, context) => {
    if (event === 'BEFORE_CONTAINMENT_INSPECTION') {
      fs.unlinkSync(fullTarget);
      fs.symlinkSync(sentinelOutside, fullTarget);
    }
  };

  assert.throws(() => pathSafeRollback({ repoDir: root, provenance: prov, raceHook }), (err) => {
    return err instanceof PatchGateError && (err.code === 'SYMLINK_TARGET_DETECTED' || err.code === 'SYMLINK_ESCAPE');
  });

  const sentinelHashAfter = crypto.createHash('sha256').update(fs.readFileSync(sentinelOutside)).digest('hex');
  assert.strictEqual(sentinelHashAfter, sentinelHashBefore);

  fs.unlinkSync(sentinelOutside);
  fs.rmSync(root, { recursive: true, force: true });
});

console.log(`\nContainment & Deterministic Race Harness Suite: ${passed}/${total} PASSED\n`);
