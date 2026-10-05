import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const readiness=fs.readFileSync(new URL('../server/atlas-authoring-readiness.js',import.meta.url),'utf8');

test('authoring readiness keeps core, Person Domain v2 and P9 inspections strictly sequential on one pg.Client',()=>{
  assert.doesNotMatch(readiness,/Promise\.all\s*\(/);
  assert.match(readiness,/const core = await inspectCoreAuthoringSchema\(client\);\s*const personDomainV2 = await inspectPersonDomainV2Readiness\(client\);\s*const p9 = await inspectP9Cutover\(client\);/s);
});
