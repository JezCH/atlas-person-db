import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const html = fs.readFileSync(new URL('../admin.html', import.meta.url), 'utf8');
const identityUi = fs.readFileSync(new URL('../atlas-admin-identity.js', import.meta.url), 'utf8');
const gate = fs.readFileSync(new URL('../atlas-admin-session-gate.js', import.meta.url), 'utf8');
const service = fs.readFileSync(new URL('../server/atlas-identity-service.js', import.meta.url), 'utf8');

test('identity authoring UI is inside the authenticated data boundary', () => {
  const protectedStart = html.indexOf('id="dataProtectedArea"');
  const personForm = html.indexOf('id="createPersonForm"');
  const polityForm = html.indexOf('id="createPolityForm"');
  const roleForm = html.indexOf('id="createRoleForm"');
  assert.ok(protectedStart >= 0 && personForm > protectedStart && polityForm > protectedStart && roleForm > protectedStart);
  assert.match(html, /\.\/atlas-activity-semantics\.js/);
  assert.match(html, /\.\/atlas-admin-identity\.js/);
});

test('browser identity authoring writes only through same-origin server endpoint', () => {
  assert.match(identityUi, /const endpoint = "\/api\/atlas-identity"/);
  assert.match(identityUi, /credentials: "same-origin"/);
  assert.doesNotMatch(identityUi, /supabase|postgres|service_role|ATLAS_MUTATION_TOKEN|ATLAS_ADMIN_PASSWORD/i);
  assert.match(gate, /"\/api\/atlas-identity"/);
});

test('person and polity identity creation requires canonical EN and KO preferred names atomically', () => {
  assert.match(service, /begin isolation level serializable/i);
  assert.match(service, /'en',\$2,'canonical',true/);
  assert.match(service, /'ko',\$3,'display',true/);
  assert.match(service, /PERSON_CANONICAL_NAME_COLLISION/);
  assert.match(service, /POLITY_CANONICAL_NAME_COLLISION/);
  assert.match(service, /DISPLAY_NAME_COLLISION_REVIEW_REQUIRED/);
});

test('role authoring keeps canonical vocabulary unambiguous without treating localized labels as identity', () => {
  assert.match(service, /ROLE_CODE_COLLIDES_WITH_EXISTING_VOCABULARY/);
  assert.match(service, /ROLE_SOURCE_LABEL_COLLISION/);
  assert.doesNotMatch(service, /ROLE_DISPLAY_NAME_COLLISION/);
  assert.match(service, /Localized display labels are presentation vocabulary, not Role identity/);
  assert.match(service, /insert into atlas_v2\.role_names/);
});
