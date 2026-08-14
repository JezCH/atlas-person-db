import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const readiness=fs.readFileSync(new URL('../server/atlas-authoring-readiness.js',import.meta.url),'utf8');

test('authoring readiness never runs core and P9 inspections concurrently on one pg.Client',()=>{
  assert.doesNotMatch(readiness,/Promise\.all\s*\(/);
  assert.match(readiness,/const core = await inspectCoreAuthoringSchema\(client\);\s*const p9 = await inspectP9Cutover\(client\);/s);
});
