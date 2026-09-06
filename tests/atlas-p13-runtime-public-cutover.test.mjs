import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const normalized = require('../server/atlas-normalized-read-service.js');
const semantic = require('../server/atlas-person-list-semantic-service.js');
const runtimeRead = require('../server/atlas-runtime-person-read-service.js');

function assertRuntimeOnly(sql, label) {
  assert.match(sql, /atlas_v2\.runtime_person_politics_v1/, `${label} must read Runtime projection`);
  assert.doesNotMatch(sql, /atlas_v2\.person_politics_v2/, `${label} must not bypass Runtime through raw Authoring Activity`);
  assert.doesNotMatch(sql, /public\.person_politics(?:\s|$)/, `${label} must not revive legacy runtime`);
}

test('all public Activity read surfaces use the sealed Runtime projection', () => {
  assertRuntimeOnly(normalized.DIRECT_READ_SQL, 'normalized read');
  assertRuntimeOnly(semantic.PERSON_LIST_SEMANTIC_SQL, 'Person list semantic enrichment');
  assertRuntimeOnly(runtimeRead.PERSON_READ_SQL, 'Person list counts');
  assertRuntimeOnly(runtimeRead.PERSON_DETAIL_SQL, 'Person detail counts');
  assertRuntimeOnly(runtimeRead.ACTIVITY_DETAIL_SQL, 'Person detail Activity');
  assertRuntimeOnly(runtimeRead.ACTIVITY_SOURCE_SQL, 'Person detail Activity provenance');
});

test('public Person handler is wired to Runtime reader, not Authoring Activity reader', () => {
  const source = fs.readFileSync(new URL('../server/atlas-person-read-handler.js', import.meta.url), 'utf8');
  assert.match(source, /require\("\.\/atlas-runtime-person-read-service\.js"\)/);
  assert.doesNotMatch(source, /require\("\.\/atlas-person-read-service\.js"\)/);
  assert.match(source, /source:\s*"runtime-person-politics-v1"/);
});

test('normalized public handler identifies the Runtime projection explicitly', () => {
  const source = fs.readFileSync(new URL('../server/atlas-normalized-read-handler.js', import.meta.url), 'utf8');
  assert.match(source, /source:\s*"runtime-person-politics-v1"/);
  assert.doesNotMatch(source, /source:\s*"v2-direct"/);
});
