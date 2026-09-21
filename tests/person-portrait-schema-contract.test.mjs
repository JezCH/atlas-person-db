import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { CORE_CANONICAL_TABLES, canonicalReplayDmlViolations } = require('../server/atlas-replay-migration-safety.js');

const migration = fs.readFileSync(new URL('../db/migrations/20260920_person_portraits.sql', import.meta.url), 'utf8');
const historyMigration = fs.readFileSync(new URL('../db/migrations/20260921_person_portrait_history_v2.sql', import.meta.url), 'utf8');

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

test('Person portrait current projection keeps small controlled vocabularies', () => {
  for (const kind of ['archival','artwork','reconstruction','symbolic']) assert.match(migration, new RegExp(`'${kind}'`));
  for (const level of ['direct','strong','contextual','symbolic']) assert.match(migration, new RegExp(`'${level}'`));
  for (const role of ['facial_reference','clothing_reference','iconography_reference','textual_description','context_reference']) {
    assert.match(migration, new RegExp(`'${role}'`));
  }
});

test('portrait history v2 separates immutable assets, generation attempts, approved revisions and revision-scoped evidence', () => {
  for (const table of [
    'person_portrait_assets',
    'person_portrait_generation_runs',
    'person_portrait_revisions',
    'person_portrait_revision_sources'
  ]) assert.match(historyMigration, new RegExp(`CREATE TABLE IF NOT EXISTS atlas_v2\\.${table}`, 'i'));

  for (const method of ['source_asset','human_reconstruction','ai_generated','ai_assisted','symbolic_composite','legacy_unknown']) {
    assert.match(historyMigration, new RegExp(`'${method}'`));
  }
  for (const status of ['generated','accepted','rejected','failed']) assert.match(historyMigration, new RegExp(`'${status}'`));

  assert.match(historyMigration, /prompt_template_version text NOT NULL/i);
  assert.match(historyMigration, /portrait_standard_version text NOT NULL/i);
  assert.match(historyMigration, /generation_spec jsonb NOT NULL DEFAULT '\{\}'::jsonb/i);
  assert.match(historyMigration, /request_sha256 text NOT NULL/i);
  assert.match(historyMigration, /reconstruction_notes text/i);
  assert.match(historyMigration, /supersedes_revision_id uuid REFERENCES atlas_v2\.person_portrait_revisions\(id\) ON DELETE RESTRICT/i);
  assert.match(historyMigration, /FOREIGN KEY \(current_revision_id, person_id\)[\s\S]*?REFERENCES atlas_v2\.person_portrait_revisions\(id, person_id\)[\s\S]*?DEFERRABLE INITIALLY IMMEDIATE/i);
});

test('portrait migration is seed-free and portrait tables are protected as canonical state', () => {
  assert.deepEqual(canonicalReplayDmlViolations(migration), []);
  assert.equal(CORE_CANONICAL_TABLES.has('person_portraits'), true);
  assert.equal(CORE_CANONICAL_TABLES.has('person_portrait_sources'), true);
  for (const table of ['person_portrait_assets','person_portrait_generation_runs','person_portrait_revisions','person_portrait_revision_sources']) {
    assert.equal(CORE_CANONICAL_TABLES.has(table), true);
  }
  assert.deepEqual(canonicalReplayDmlViolations(historyMigration), []);
  assert.doesNotMatch(migration, /\bINSERT\s+INTO\s+atlas_v2\.person_portraits\b/i);
  assert.doesNotMatch(migration, /\bINSERT\s+INTO\s+atlas_v2\.person_portrait_sources\b/i);
});
