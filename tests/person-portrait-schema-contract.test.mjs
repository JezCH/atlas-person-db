import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { CORE_CANONICAL_TABLES, canonicalReplayDmlViolations } = require('../server/atlas-replay-migration-safety.js');

const migration = fs.readFileSync(new URL('../db/migrations/20260920_person_portraits.sql', import.meta.url), 'utf8');

test('Person portrait contract stores only present portraits and reuses canonical Person and Source identities', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS atlas_v2\.person_portraits/i);
  assert.match(migration, /person_id uuid NOT NULL REFERENCES atlas_v2\.persons\(id\) ON DELETE RESTRICT/i);
  assert.match(migration, /CONSTRAINT person_portraits_pkey PRIMARY KEY \(person_id\)/i);
  assert.doesNotMatch(migration, /portrait_status|not_found|status\s+text|DEFAULT\s+'none'/i);

  assert.match(migration, /CREATE TABLE IF NOT EXISTS atlas_v2\.person_portrait_sources/i);
  assert.match(migration, /REFERENCES atlas_v2\.person_portraits\(person_id\)[\s\S]*?ON DELETE CASCADE ON UPDATE CASCADE/i);
  assert.match(migration, /source_id uuid NOT NULL REFERENCES atlas_v2\.sources\(id\) ON DELETE RESTRICT/i);
  assert.match(migration, /PRIMARY KEY \(person_id, source_id, evidence_role\)/i);
});

test('Person portrait asset identity is content-addressed and duplicate-safe without a derived storage path column', () => {
  assert.match(migration, /CONSTRAINT person_portraits_asset_sha256_uq UNIQUE \(asset_sha256\)/i);
  assert.match(migration, /asset_sha256 ~ '\^\[0-9a-f\]\{64\}\$'/i);
  assert.doesNotMatch(migration, /asset_key|storage_key|https?:\/\//i);
});

test('Person portrait semantics are small controlled vocabularies without speculative generation metadata', () => {
  for (const kind of ['archival','artwork','reconstruction','symbolic']) assert.match(migration, new RegExp(`'${kind}'`));
  for (const level of ['direct','strong','contextual','symbolic']) assert.match(migration, new RegExp(`'${level}'`));
  for (const role of ['facial_reference','clothing_reference','iconography_reference','textual_description','context_reference']) {
    assert.match(migration, new RegExp(`'${role}'`));
  }
  assert.doesNotMatch(migration, /prompt|seed|model_name|generation_run|negative_prompt/i);
});

test('portrait migration is seed-free and portrait tables are protected as canonical state', () => {
  assert.deepEqual(canonicalReplayDmlViolations(migration), []);
  assert.equal(CORE_CANONICAL_TABLES.has('person_portraits'), true);
  assert.equal(CORE_CANONICAL_TABLES.has('person_portrait_sources'), true);
  assert.doesNotMatch(migration, /\bINSERT\s+INTO\s+atlas_v2\.person_portraits\b/i);
  assert.doesNotMatch(migration, /\bINSERT\s+INTO\s+atlas_v2\.person_portrait_sources\b/i);
});
