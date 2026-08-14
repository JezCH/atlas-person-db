import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const p9=fs.readFileSync(new URL('../server/atlas-stage2-p9-db-cutover.js',import.meta.url),'utf8');

test('P9 inspection does not overlap queries on one pg.Client',()=>{
  const inspect=p9.slice(p9.indexOf('async function inspectP9Cutover'),p9.indexOf('async function applyP9Cutover'));
  assert.doesNotMatch(inspect,/Promise\.all\s*\(/);
  assert.match(inspect,/const oldIndex = await inspectIndex\(client, OLD_INDEX\);\s*const newIndex = await inspectIndex\(client, NEW_INDEX\);\s*const duplicates = await duplicateCount\(client\);/s);
});
