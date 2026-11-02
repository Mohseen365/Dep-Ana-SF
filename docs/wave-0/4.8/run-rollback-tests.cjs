const assert = require('assert');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');
const { pathSafeRollback, PatchGateError } = require('./patch-gate.cjs');

console.log('Running Rollback Public Entry Suite (RB-01 to RB-22)...');

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

function createTestRepo() {
  const dir = fs.mkdtempSync(path.join('/tmp', 'rb-test-'));
  return dir;
}

runTest('RB-01', 'Normal restore of modified file', () => {
  const repo = createTestRepo();
  const fileRel = 'file.txt';
  const filePath = path.join(repo, fileRel);
  const origContent = Buffer.from('original content', 'utf8');
  fs.writeFileSync(filePath, origContent);
  const origMode = fs.statSync(filePath).mode;
  const origHash = crypto.createHash('sha256').update(origContent).digest('hex');

  const postContent = Buffer.from('patched content', 'utf8');
  fs.writeFileSync(filePath, postContent);
  const postHash = crypto.createHash('sha256').update(postContent).digest('hex');

  const prov = {
    taskId: 'W5-1',
    touchedPaths: [fileRel],
    preApply: {
      [fileRel]: {
        exists: true,
        hash: origHash,
        byteLength: origContent.length,
        mode: origMode,
        encoding: 'base64',
        dataBase64: origContent.toString('base64')
      }
    },
    postApply: {
      [fileRel]: {
        exists: true,
        hash: postHash,
        byteLength: postContent.length,
        mode: origMode
      }
    }
  };

  const res = pathSafeRollback({ repoDir: repo, provenance: prov });
  assert.strictEqual(res.success, true);
  assert.strictEqual(fs.readFileSync(filePath, 'utf8'), 'original content');
  fs.rmSync(repo, { recursive: true, force: true });
});

runTest('RB-02', 'Removal of file created by patch', () => {
  const repo = createTestRepo();
  const fileRel = 'created.txt';
  const filePath = path.join(repo, fileRel);
  const postContent = Buffer.from('created content', 'utf8');
  fs.writeFileSync(filePath, postContent);
  const postHash = crypto.createHash('sha256').update(postContent).digest('hex');

  const prov = {
    taskId: 'W5-1',
    touchedPaths: [fileRel],
    preApply: {
      [fileRel]: { exists: false, hash: null, byteLength: 0, mode: null, encoding: null, dataBase64: null }
    },
    postApply: {
      [fileRel]: { exists: true, hash: postHash, byteLength: postContent.length, mode: 0o100644 }
    }
  };

  const res = pathSafeRollback({ repoDir: repo, provenance: prov });
  assert.strictEqual(res.success, true);
  assert.strictEqual(fs.existsSync(filePath), false);
  fs.rmSync(repo, { recursive: true, force: true });
});

runTest('RB-03', 'Reject modified post-apply file', () => {
  const repo = createTestRepo();
  const fileRel = 'file.txt';
  const filePath = path.join(repo, fileRel);
  fs.writeFileSync(filePath, 'post-patch modified by user!');
  const prov = {
    taskId: 'W5-1',
    touchedPaths: [fileRel],
    preApply: {
      [fileRel]: { exists: true, hash: '1111', byteLength: 4, mode: 0o100644, encoding: 'base64', dataBase64: 'b2xk' }
    },
    postApply: {
      [fileRel]: { exists: true, hash: '2222', byteLength: 4, mode: 0o100644 }
    }
  };

  assert.throws(() => pathSafeRollback({ repoDir: repo, provenance: prov }), (err) => {
    return err instanceof PatchGateError && err.code === 'POST_APPLY_MUTATION';
  });
  assert.strictEqual(fs.readFileSync(filePath, 'utf8'), 'post-patch modified by user!');
  fs.rmSync(repo, { recursive: true, force: true });
});

runTest('RB-04', 'Reject deleted post-apply file', () => {
  const repo = createTestRepo();
  const fileRel = 'file.txt';
  const prov = {
    taskId: 'W5-1',
    touchedPaths: [fileRel],
    preApply: { [fileRel]: { exists: true, hash: '11', byteLength: 1, mode: 0o100644, encoding: 'base64', dataBase64: 'bw==' } },
    postApply: { [fileRel]: { exists: true, hash: '22', byteLength: 1, mode: 0o100644 } }
  };
  assert.throws(() => pathSafeRollback({ repoDir: repo, provenance: prov }), (err) => {
    return err instanceof PatchGateError && err.code === 'POST_APPLY_MISSING';
  });
  fs.rmSync(repo, { recursive: true, force: true });
});

runTest('RB-05', 'Reject directory target', () => {
  const repo = createTestRepo();
  const dirRel = 'somedir/';
  const prov = {
    taskId: 'W5-1',
    touchedPaths: [dirRel],
    preApply: {},
    postApply: {}
  };
  assert.throws(() => pathSafeRollback({ repoDir: repo, provenance: prov }), (err) => {
    return err instanceof PatchGateError && err.code === 'DIRECTORY_PATH';
  });
  fs.rmSync(repo, { recursive: true, force: true });
});

runTest('RB-06', 'Reject symlink target', () => {
  const repo = createTestRepo();
  const fileRel = 'symtarget.txt';
  const realFile = path.join(repo, 'real.txt');
  fs.writeFileSync(realFile, 'real');
  fs.symlinkSync(realFile, path.join(repo, fileRel));

  const prov = {
    taskId: 'W5-1',
    touchedPaths: [fileRel],
    preApply: { [fileRel]: { exists: true, hash: '11', byteLength: 4, mode: 0o100644, encoding: 'base64', dataBase64: 'cmVhbA==' } },
    postApply: { [fileRel]: { exists: true, hash: '11', byteLength: 4, mode: 0o100644 } }
  };
  assert.throws(() => pathSafeRollback({ repoDir: repo, provenance: prov }), (err) => {
    return err instanceof PatchGateError && err.code === 'SYMLINK_TARGET_DETECTED';
  });
  fs.rmSync(repo, { recursive: true, force: true });
});

runTest('RB-07', 'Reject symlinked parent', () => {
  const repo = createTestRepo();
  const realParent = fs.mkdtempSync(path.join('/tmp', 'outside-'));
  fs.symlinkSync(realParent, path.join(repo, 'symdir'));
  const fileRel = 'symdir/child.txt';

  const prov = {
    taskId: 'W5-1',
    touchedPaths: [fileRel],
    preApply: { [fileRel]: { exists: true, hash: '11', byteLength: 1, mode: 0o100644, encoding: 'base64', dataBase64: 'YQ==' } },
    postApply: { [fileRel]: { exists: true, hash: '11', byteLength: 1, mode: 0o100644 } }
  };
  assert.throws(() => pathSafeRollback({ repoDir: repo, provenance: prov }), (err) => {
    return err instanceof PatchGateError && err.code === 'SYMLINK_PARENT_DETECTED';
  });
  fs.rmSync(realParent, { recursive: true, force: true });
  fs.rmSync(repo, { recursive: true, force: true });
});

runTest('RB-08', 'Reject path traversal', () => {
  const repo = createTestRepo();
  const fileRel = '../escaped.txt';
  const prov = {
    taskId: 'W5-1',
    touchedPaths: [fileRel],
    preApply: {},
    postApply: {}
  };
  assert.throws(() => pathSafeRollback({ repoDir: repo, provenance: prov }), (err) => {
    return err instanceof PatchGateError && err.code === 'PATH_TRAVERSAL';
  });
  fs.rmSync(repo, { recursive: true, force: true });
});

runTest('RB-09', 'Reject duplicate touched path', () => {
  const repo = createTestRepo();
  const prov = {
    taskId: 'W5-1',
    touchedPaths: ['a.txt', 'a.txt'],
    preApply: {},
    postApply: {}
  };
  assert.throws(() => pathSafeRollback({ repoDir: repo, provenance: prov }), (err) => {
    return err instanceof PatchGateError && err.code === 'DUPLICATE_TOUCHED_PATH';
  });
  fs.rmSync(repo, { recursive: true, force: true });
});

runTest('RB-10', 'Reject normalized/alias duplicate', () => {
  const repo = createTestRepo();
  const prov = {
    taskId: 'W5-1',
    touchedPaths: ['dir/foo.txt', 'dir/./foo.txt'],
    preApply: {},
    postApply: {}
  };
  assert.throws(() => pathSafeRollback({ repoDir: repo, provenance: prov }), (err) => {
    return err instanceof PatchGateError && err.code === 'DUPLICATE_TOUCHED_PATH';
  });
  fs.rmSync(repo, { recursive: true, force: true });
});

runTest('RB-11', 'Reject post-state says absent but file now exists', () => {
  const repo = createTestRepo();
  const fileRel = 'deleted_by_patch.txt';
  const filePath = path.join(repo, fileRel);
  fs.writeFileSync(filePath, 'recreated after patch!');

  const prov = {
    taskId: 'W5-1',
    touchedPaths: [fileRel],
    preApply: {
      [fileRel]: { exists: true, hash: '11', byteLength: 1, mode: 0o100644, encoding: 'base64', dataBase64: 'YQ==' }
    },
    postApply: {
      [fileRel]: { exists: false, hash: null, byteLength: 0, mode: null }
    }
  };

  assert.throws(() => pathSafeRollback({ repoDir: repo, provenance: prov }), (err) => {
    return err instanceof PatchGateError && err.code === 'POST_APPLY_RECREATED';
  });
  assert.strictEqual(fs.readFileSync(filePath, 'utf8'), 'recreated after patch!');
  fs.rmSync(repo, { recursive: true, force: true });
});

runTest('RB-12', 'Reject post-state says present but file is now absent', () => {
  const repo = createTestRepo();
  const fileRel = 'should_exist.txt';
  const prov = {
    taskId: 'W5-1',
    touchedPaths: [fileRel],
    preApply: { [fileRel]: { exists: false, hash: null, byteLength: 0, mode: null, encoding: null, dataBase64: null } },
    postApply: { [fileRel]: { exists: true, hash: '22', byteLength: 2, mode: 0o100644 } }
  };
  assert.throws(() => pathSafeRollback({ repoDir: repo, provenance: prov }), (err) => {
    return err instanceof PatchGateError && err.code === 'POST_APPLY_MISSING';
  });
  fs.rmSync(repo, { recursive: true, force: true });
});

runTest('RB-13', 'Reject malformed pre-state', () => {
  const repo = createTestRepo();
  const fileRel = 'f.txt';
  fs.writeFileSync(path.join(repo, fileRel), 'foo');
  const h = crypto.createHash('sha256').update('foo').digest('hex');
  const prov = {
    taskId: 'W5-1',
    touchedPaths: [fileRel],
    preApply: { [fileRel]: null },
    postApply: { [fileRel]: { exists: true, hash: h, byteLength: 3, mode: 0o100644 } }
  };
  assert.throws(() => pathSafeRollback({ repoDir: repo, provenance: prov }), (err) => {
    return err instanceof PatchGateError && err.code === 'MALFORMED_PRE_STATE';
  });
  fs.rmSync(repo, { recursive: true, force: true });
});

runTest('RB-14', 'Reject malformed post-state', () => {
  const repo = createTestRepo();
  const fileRel = 'f.txt';
  fs.writeFileSync(path.join(repo, fileRel), 'foo');
  const prov = {
    taskId: 'W5-1',
    touchedPaths: [fileRel],
    preApply: { [fileRel]: { exists: true, hash: '1', byteLength: 1, mode: 0o100644, encoding: 'base64', dataBase64: 'YQ==' } },
    postApply: { [fileRel]: 'not an object' }
  };
  assert.throws(() => pathSafeRollback({ repoDir: repo, provenance: prov }), (err) => {
    return err instanceof PatchGateError && err.code === 'MALFORMED_POST_STATE';
  });
  fs.rmSync(repo, { recursive: true, force: true });
});

runTest('RB-15', 'Reject missing/null restore payload', () => {
  const repo = createTestRepo();
  const fileRel = 'f.txt';
  fs.writeFileSync(path.join(repo, fileRel), 'foo');
  const h = crypto.createHash('sha256').update('foo').digest('hex');
  const prov = {
    taskId: 'W5-1',
    touchedPaths: [fileRel],
    preApply: { [fileRel]: { exists: true, hash: h, byteLength: 3, mode: 0o100644, encoding: 'base64', dataBase64: null } },
    postApply: { [fileRel]: { exists: true, hash: h, byteLength: 3, mode: 0o100644 } }
  };
  assert.throws(() => pathSafeRollback({ repoDir: repo, provenance: prov }), (err) => {
    return err instanceof PatchGateError && err.code === 'MISSING_RESTORE_PAYLOAD';
  });
  fs.rmSync(repo, { recursive: true, force: true });
});

runTest('RB-16', 'Reject restore payload with wrong hash', () => {
  const repo = createTestRepo();
  const fileRel = 'f.txt';
  fs.writeFileSync(path.join(repo, fileRel), 'foo');
  const h = crypto.createHash('sha256').update('foo').digest('hex');
  const prov = {
    taskId: 'W5-1',
    touchedPaths: [fileRel],
    preApply: { [fileRel]: { exists: true, hash: 'badhash', byteLength: 3, mode: 0o100644, encoding: 'base64', dataBase64: Buffer.from('foo').toString('base64') } },
    postApply: { [fileRel]: { exists: true, hash: h, byteLength: 3, mode: 0o100644 } }
  };
  assert.throws(() => pathSafeRollback({ repoDir: repo, provenance: prov }), (err) => {
    return err instanceof PatchGateError && err.code === 'RESTORE_PAYLOAD_HASH_MISMATCH';
  });
  fs.rmSync(repo, { recursive: true, force: true });
});

runTest('RB-17', 'Reject invalid mode metadata', () => {
  const repo = createTestRepo();
  const fileRel = 'f.txt';
  fs.writeFileSync(path.join(repo, fileRel), 'foo');
  const h = crypto.createHash('sha256').update('foo').digest('hex');
  const prov = {
    taskId: 'W5-1',
    touchedPaths: [fileRel],
    preApply: { [fileRel]: { exists: true, hash: h, byteLength: 3, mode: null, encoding: 'base64', dataBase64: Buffer.from('foo').toString('base64') } },
    postApply: { [fileRel]: { exists: true, hash: h, byteLength: 3, mode: 0o100644 } }
  };
  assert.throws(() => pathSafeRollback({ repoDir: repo, provenance: prov }), (err) => {
    return err instanceof PatchGateError && err.code === 'INVALID_MODE_METADATA';
  });
  fs.rmSync(repo, { recursive: true, force: true });
});

runTest('RB-18', 'Preserve binary file bytes exactly', () => {
  const repo = createTestRepo();
  const fileRel = 'binary.bin';
  const filePath = path.join(repo, fileRel);
  const origBuf = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) origBuf[i] = i;
  fs.writeFileSync(filePath, origBuf);
  const origHash = crypto.createHash('sha256').update(origBuf).digest('hex');

  const postBuf = Buffer.from('corrupted binary', 'utf8');
  fs.writeFileSync(filePath, postBuf);
  const postHash = crypto.createHash('sha256').update(postBuf).digest('hex');

  const prov = {
    taskId: 'W5-1',
    touchedPaths: [fileRel],
    preApply: {
      [fileRel]: { exists: true, hash: origHash, byteLength: origBuf.length, mode: 0o100644, encoding: 'base64', dataBase64: origBuf.toString('base64') }
    },
    postApply: {
      [fileRel]: { exists: true, hash: postHash, byteLength: postBuf.length, mode: 0o100644 }
    }
  };

  const res = pathSafeRollback({ repoDir: repo, provenance: prov });
  assert.strictEqual(res.success, true);
  const restored = fs.readFileSync(filePath);
  assert.strictEqual(origBuf.equals(restored), true);
  fs.rmSync(repo, { recursive: true, force: true });
});

runTest('RB-19', 'Restore original file mode', () => {
  const repo = createTestRepo();
  const fileRel = 'script.sh';
  const filePath = path.join(repo, fileRel);
  fs.writeFileSync(filePath, '#!/bin/sh\n', { mode: 0o755 });
  const origMode = fs.statSync(filePath).mode;
  const origBuf = fs.readFileSync(filePath);
  const origHash = crypto.createHash('sha256').update(origBuf).digest('hex');

  fs.chmodSync(filePath, 0o644);
  const postMode = fs.statSync(filePath).mode;
  const prov = {
    taskId: 'W5-1',
    touchedPaths: [fileRel],
    preApply: {
      [fileRel]: { exists: true, hash: origHash, byteLength: origBuf.length, mode: origMode, encoding: 'base64', dataBase64: origBuf.toString('base64') }
    },
    postApply: {
      [fileRel]: { exists: true, hash: origHash, byteLength: origBuf.length, mode: postMode }
    }
  };

  const res = pathSafeRollback({ repoDir: repo, provenance: prov });
  assert.strictEqual(res.success, true);
  assert.strictEqual(fs.statSync(filePath).mode, origMode);
  fs.rmSync(repo, { recursive: true, force: true });
});

runTest('RB-20', 'All-target preflight catches bad second target before first target changes', () => {
  const repo = createTestRepo();
  const file1 = 'file1.txt';
  const file2 = 'file2.txt';
  fs.writeFileSync(path.join(repo, file1), 'patched1');
  fs.writeFileSync(path.join(repo, file2), 'patched2_MODIFIED_BY_USER');

  const h1_post = crypto.createHash('sha256').update('patched1').digest('hex');
  const h2_post_expected = 'expected_post_hash';

  const prov = {
    taskId: 'W5-1',
    touchedPaths: [file1, file2],
    preApply: {
      [file1]: { exists: true, hash: crypto.createHash('sha256').update('orig1').digest('hex'), byteLength: 5, mode: 0o100644, encoding: 'base64', dataBase64: Buffer.from('orig1').toString('base64') },
      [file2]: { exists: true, hash: crypto.createHash('sha256').update('orig2').digest('hex'), byteLength: 5, mode: 0o100644, encoding: 'base64', dataBase64: Buffer.from('orig2').toString('base64') }
    },
    postApply: {
      [file1]: { exists: true, hash: h1_post, byteLength: 8, mode: 0o100644 },
      [file2]: { exists: true, hash: h2_post_expected, byteLength: 8, mode: 0o100644 }
    }
  };

  assert.throws(() => pathSafeRollback({ repoDir: repo, provenance: prov }), (err) => {
    return err instanceof PatchGateError && err.code === 'POST_APPLY_MUTATION';
  });

  assert.strictEqual(fs.readFileSync(path.join(repo, file1), 'utf8'), 'patched1');
  assert.strictEqual(fs.readFileSync(path.join(repo, file2), 'utf8'), 'patched2_MODIFIED_BY_USER');
  fs.rmSync(repo, { recursive: true, force: true });
});

runTest('RB-21', 'Post-apply recreated file is never overwritten or deleted', () => {
  const repo = createTestRepo();
  const fileRel = 'recreated.txt';
  fs.writeFileSync(path.join(repo, fileRel), 'user valuable data');

  const prov = {
    taskId: 'W5-1',
    touchedPaths: [fileRel],
    preApply: {
      [fileRel]: { exists: false, hash: null, byteLength: 0, mode: null, encoding: null, dataBase64: null }
    },
    postApply: {
      [fileRel]: { exists: false, hash: null, byteLength: 0, mode: null }
    }
  };

  assert.throws(() => pathSafeRollback({ repoDir: repo, provenance: prov }), (err) => {
    return err instanceof PatchGateError && err.code === 'POST_APPLY_RECREATED';
  });

  assert.strictEqual(fs.readFileSync(path.join(repo, fileRel), 'utf8'), 'user valuable data');
  fs.rmSync(repo, { recursive: true, force: true });
});

runTest('RB-22', 'Guarded restoration failure reports partial-state inventory', () => {
  const repo = createTestRepo();
  const fileRel = 'f.txt';
  fs.writeFileSync(path.join(repo, fileRel), 'patched');
  const postHash = crypto.createHash('sha256').update('patched').digest('hex');

  const prov = {
    taskId: 'W5-1',
    touchedPaths: [fileRel],
    preApply: {
      [fileRel]: {
        exists: true,
        hash: '0000000000000000000000000000000000000000000000000000000000000000',
        byteLength: 4,
        mode: 0o100644,
        encoding: 'base64',
        dataBase64: Buffer.from('orig').toString('base64')
      }
    },
    postApply: {
      [fileRel]: { exists: true, hash: postHash, byteLength: 7, mode: 0o100644 }
    }
  };

  assert.throws(() => pathSafeRollback({ repoDir: repo, provenance: prov }), (err) => {
    return err instanceof PatchGateError && err.code === 'RESTORE_PAYLOAD_HASH_MISMATCH';
  });

  fs.rmSync(repo, { recursive: true, force: true });
});

console.log(`\nRollback Public Entry Suite: ${passed}/${total} PASSED\n`);
