import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

test('Person merge and hard-delete explicitly own normalized external-reference lifecycle', () => {
  const merge = fs.readFileSync(new URL('../server/atlas-person-merge-service.js', import.meta.url), 'utf8');
  const deletion = fs.readFileSync(new URL('../server/atlas-person-delete-service.js', import.meta.url), 'utf8');
  assert.match(merge, /reconcilePersonExternalReferences/);
  assert.match(merge, /external reference count changed outside deterministic reference collapse/);
  assert.match(merge, /person_external_references where person_id=\$1/);
  assert.match(deletion, /deletePersonExternalReferences/);
  assert.match(deletion, /person_external_references where person_id=\$1/);
});
