import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const script = fs.readFileSync(new URL('../migration/phase-8/scripts/phase8c-c9b-retire-legacy-db.mjs', import.meta.url), 'utf8');
const workflow = fs.readFileSync(new URL('../.github/workflows/phase-8c-c9b-retire-legacy-db.yml', import.meta.url), 'utf8');
const c8 = fs.readFileSync(new URL('./phase8c-c8-runtime-retirement.test.mjs', import.meta.url), 'utf8');

const INVENTORY_SHA = '17f6af54fcb01a884e44b55c4e1ac2cad9d23faa';
const INVENTORY_RUN = '31362547973';
const INVENTORY_ARTIFACT = '9052889263';
const INVENTORY_DIGEST = 'sha256:3c31babe79115cf7f96b62eab1ea2ab5238ba5287beeb07386c65bb237c481a4';

test('C9B is pinned to the reviewed C9A live inventory evidence', () => {
  for (const value of [INVENTORY_SHA, INVENTORY_RUN, INVENTORY_ARTIFACT, INVENTORY_DIGEST]) {
    assert.match(script, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(workflow, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(script, /legacy_rows:\s*319/);
  assert.match(script, /LEGACY_ROW_COUNT_CHANGED_SINCE_C9A/);
});

test('C9B rechecks retirement invariants inside one transactional lock boundary', () => {
  assert.match(script, /BEGIN ISOLATION LEVEL SERIALIZABLE/);
  assert.match(script, /pg_advisory_xact_lock/);
  assert.match(script, /LOCK TABLE public\.person_politics IN ACCESS EXCLUSIVE MODE/);
  assert.match(script, /LOCK TABLE atlas_v2\.person_politics_v2 IN SHARE MODE/);
  assert.match(script, /legacy_rows_missing_from_v2/);
  assert.match(script, /compatibility_rows_missing_from_direct/);
  assert.match(script, /direct_rows_missing_from_compatibility/);
  assert.match(script, /LEGACY_RELATION_DEPENDENTS_PRESENT/);
  assert.match(script, /COMPATIBILITY_RELATION_DEPENDENTS_PRESENT/);
  assert.match(script, /TEXTUAL_FUNCTION_REFERENCES_PRESENT/);
  assert.match(script, /TEXTUAL_VIEW_REFERENCES_PRESENT/);
  assert.match(script, /INBOUND_LEGACY_FOREIGN_KEYS_PRESENT/);
  assert.match(script, /RETIREMENT_TARGET_IN_PUBLICATION/);
  assert.match(script, /if \(before\.blockers\.length\) throw/);
});

test('C9B drops only compatibility then legacy with no CASCADE', () => {
  assert.doesNotMatch(script, /\bCASCADE\b/i);
  assert.doesNotMatch(script, /DROP\s+SCHEMA/i);
  assert.doesNotMatch(script, /DROP\s+TABLE\s+atlas_v2\./i);
  const dropView = script.indexOf("DROP VIEW public.atlas_person_politics_compat_v1");
  const dropLegacy = script.indexOf("DROP TABLE public.person_politics");
  assert.ok(dropView >= 0, 'compatibility DROP missing');
  assert.ok(dropLegacy > dropView, 'legacy table must be dropped after compatibility view');
});

test('C9B captures a legacy snapshot and verifies normalized state before commit', () => {
  const snapshot = script.indexOf("legacy-snapshot.json");
  const dropView = script.indexOf("DROP VIEW public.atlas_person_politics_compat_v1");
  const commit = script.indexOf("client.query('COMMIT')");
  assert.ok(snapshot >= 0 && snapshot < dropView, 'legacy snapshot must precede DROP');
  assert.match(script, /normalized row count changed inside retirement transaction/);
  assert.match(script, /legacy table still exists after DROP/);
  assert.match(script, /compatibility view still exists after DROP/);
  assert.ok(commit > dropView, 'COMMIT must occur after post-DROP verification');
  assert.match(script, /client\.query\('ROLLBACK'\)/);
  assert.match(script, /destructive_action_committed:\s*false/);
});

test('destructive workflow is manual-only, exact-main-SHA guarded and explicitly confirmed', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\n\s*push:/);
  assert.doesNotMatch(workflow, /\n\s*schedule:/);
  assert.match(workflow, /test "\$\{\{ github\.ref \}\}" = "refs\/heads\/main"/);
  assert.match(workflow, /PHASE8C_C9_RETIRE_LEGACY_DB_OBJECTS/);
  assert.match(workflow, /test "\$\{\{ inputs\.approved_sha \}\}" = "\$\{\{ github\.sha \}\}"/);
  assert.match(workflow, /environment:\s*phase-5-shadow/);
  assert.match(workflow, /ZERO_REACHABLE_LEGACY_RUNTIME/);
  assert.match(workflow, /if:\s*github\.event_name == 'workflow_dispatch'/);
});

test('PR validation cannot execute the destructive database job', () => {
  assert.match(workflow, /static-contract:\n\s+if:\s*github\.event_name == 'pull_request'/);
  assert.match(workflow, /protected-retirement:\n\s+if:\s*github\.event_name == 'workflow_dispatch'/);
  assert.doesNotMatch(workflow.split('protected-retirement:')[0], /SUPABASE_DB_URL/);
});

test('C8 successor contract permits the C9B workflow without restoring retired runtime', () => {
  assert.match(c8, /startsWith\('phase-8c-c9-'\)/);
});
