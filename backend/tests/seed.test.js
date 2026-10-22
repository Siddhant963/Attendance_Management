import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const seedScript = fileURLToPath(new URL('../src/seed/seed.js', import.meta.url));
// Unreachable address: the guard must stop the script before any connection is attempted.
const productionEnv = { ...process.env, NODE_ENV: 'production', JWT_SECRET: 'unused', MONGODB_URI: 'mongodb://127.0.0.1:1/never' };

test('demo seed refuses to run in production by default', async () => {
  delete productionEnv.ALLOW_DEMO_SEED;
  await assert.rejects(run(process.execPath, [seedScript], { env: productionEnv, timeout: 20000 }), (err) => {
    assert.equal(err.code, 1);
    assert.match(err.stderr, /Refusing to seed demo accounts in production/);
    return true;
  });
});

test('demo seed is not unlocked by values other than ALLOW_DEMO_SEED=true', async () => {
  await assert.rejects(
    run(process.execPath, [seedScript], { env: { ...productionEnv, ALLOW_DEMO_SEED: '1' }, timeout: 20000 }),
    (err) => /Refusing to seed demo accounts in production/.test(err.stderr)
  );
});
