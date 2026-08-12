import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const vercel = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

test('Vercel Git integration delegates build admission to the fail-safe release classifier', () => {
  assert.equal(vercel.ignoreCommand, 'node scripts/vercel-ignore-build.mjs');
  assert.equal(fs.existsSync(new URL('../scripts/vercel-ignore-build.mjs', import.meta.url)), true);
});
