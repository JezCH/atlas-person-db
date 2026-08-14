import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { inspectAuthoringReadiness } = require('../server/atlas-authoring-readiness.js');
const { OLD_INDEX, NEW_INDEX } = require('../server/atlas-stage2-p9-db-cutover.js');

const NEW_INDEX_DEF = `CREATE UNIQUE INDEX ${NEW_INDEX} ON atlas_v2.person_politics_v2
  (person_id, polity_id, relation_type_id, role_id, period_basis_id,
   activity_start, activity_start_month, activity_start_day, activity_start_granularity, activity_start_calendar,
   activity_end, activity_end_month, activity_end_day, activity_end_granularity, activity_end_calendar)
  NULLS NOT DISTINCT WHERE relation_type_id IS NOT NULL`;

function clientFor({ oldIndex = false, newIndex = true, duplicates = 0, coreReady = true, p5Ready = true } = {}) {
  return {
    async query(sql, params = []) {
      const text = String(sql);
      if (text.includes("to_regclass('atlas_v2.person_polity_relation_types') as relation_catalog")) {
        return { rows: [{
          relation_catalog: p5Ready ? 'atlas_v2.person_polity_relation_types' : null,
          polity_relations: p5Ready ? 'atlas_v2.polity_relations' : null,
          semantic_name_kind: p5Ready,
          source_url: p5Ready
        }] };
      }
      if (text.includes("to_regclass('atlas_v2.persons') as persons")) {
        return { rows: [{
          persons: coreReady ? 'atlas_v2.persons' : null,
          polities: coreReady ? 'atlas_v2.polities' : null,
          roles: coreReady ? 'atlas_v2.roles' : null,
          period_bases: coreReady ? 'atlas_v2.period_bases' : null,
          relation_types: coreReady ? 'atlas_v2.person_polity_relation_types' : null,
          activities: coreReady ? 'atlas_v2.person_politics_v2' : null,
          activity_sources: coreReady ? 'atlas_v2.person_politics_sources' : null,
          authoring_ledger: coreReady ? 'atlas_v2.authoring_manifest_runs' : null,
          ledger_manifest_schema: coreReady,
          ledger_result_snapshot: coreReady,
          relation_type_id: coreReady,
          activity_start_granularity: coreReady,
          activity_end_granularity: coreReady,
          activity_start_calendar: coreReady,
          activity_end_calendar: coreReady
        }] };
      }
      if (text.includes('from pg_indexes')) {
        const name = params[0];
        if (name === OLD_INDEX) return { rows: oldIndex ? [{ indexname: OLD_INDEX, indexdef: 'CREATE UNIQUE INDEX legacy' }] : [] };
        if (name === NEW_INDEX) return { rows: newIndex ? [{ indexname: NEW_INDEX, indexdef: NEW_INDEX_DEF }] : [] };
      }
      if (text.includes('select count(*)::int as count from (')) return { rows: [{ count: duplicates }] };
      throw new Error(`Unexpected readiness query: ${text.slice(0, 80)}`);
    }
  };
}

test('authoring readiness requires P5, core Stage 2 schema, completed P9 and blocked P10', async () => {
  const result = await inspectAuthoringReadiness(clientFor());
  assert.equal(result.ready, true);
  assert.equal(result.p5_ready, true);
  assert.equal(result.core.tables_ready, true);
  assert.equal(result.core.columns_ready, true);
  assert.equal(result.p9.old_index_present, false);
  assert.equal(result.p9.new_index_present, true);
  assert.equal(result.p9.duplicate_groups, 0);
  assert.equal(result.person_merge.allowed, false);
  assert.equal(result.person_merge.person_merge_lifecycle_version, 'pre-p10-blocked');
});

test('authoring readiness fails closed when P9 is not complete', async () => {
  const result = await inspectAuthoringReadiness(clientFor({ oldIndex: true, newIndex: false }));
  assert.equal(result.ready, false);
  assert.equal(result.p9.old_index_present, true);
  assert.equal(result.p9.new_index_present, false);
});

test('authoring readiness fails closed on duplicate semantic groups or missing core schema', async () => {
  const duplicates = await inspectAuthoringReadiness(clientFor({ duplicates: 1 }));
  assert.equal(duplicates.ready, false);
  const missing = await inspectAuthoringReadiness(clientFor({ coreReady: false }));
  assert.equal(missing.ready, false);
});
