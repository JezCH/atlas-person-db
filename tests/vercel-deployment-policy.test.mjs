import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const vercel = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

test('Vercel Git integration builds production only', () => {
  assert.equal(vercel.ignoreCommand, 'test "$VERCEL_ENV" != "production"');
});
