import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import pg from 'pg';

const require=createRequire(import.meta.url);
const {applyAuthoringMigrations}=require('../server/atlas-authoring-migrations.js');
const {applyCorrectionMigrations}=require('../server/atlas-correction-migrations.js');
const {readStage2SchemaRelease,applyStage2SchemaRelease}=require('../server/atlas-stage2-schema-release.js');
const {Client}=pg;
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const baseline=fs.readFileSync(path.join(root,'db/schema/atlas_v2.current.sql'),'utf8');
const closure=JSON.parse(fs.readFileSync(path.join(root,'stage2/integration/p6-effective-prebinding-closure.v1.json'),'utf8'));
const databaseUrl=String(process.env.DATABASE_URL||'').trim();
if(!/^postgres(?:ql)?:\/\//.test(databaseUrl)) throw new Error('DATABASE_URL is required');
if(closure.status!=='P6_EFFECTIVE_PREBINDING_CLOSED_BRANCH_ONLY_NO_PRODUCTION_MUTATION'||closure.closure?.completed_effective_prebinding_activity_count!==54||closure.closure?.remaining_effective_prebinding_activity_count!==0) throw new Error('P6 closure prerequisite not satisfied');

const release=readStage2SchemaRelease();
if(release.release.prerequisites?.effective_prebinding_complete!==true||release.release.prerequisites?.effective_activity_count!==54||release.release.safety?.production_apply_authorized!==false||release.release.safety?.non_destructive_schema_only!==true||release.release.safety?.fake_legacy_source_key_for_stage2_native_activity_forbidden!==true) throw new Error('P5 release prerequisite drift');
for(const component of release.components){
  const normalized=component.body.replace(/^\s*--.*$/gm,'');
  if(/\b(?:delete|update)\s+atlas_v2\.person_politics_v2\b/i.test(normalized)||/\btruncate\b/i.test(normalized)||/\bdrop\s+(?:table|schema)\b/i.test(normalized)) throw new Error(`destructive component ${component.id}`);
  if(/territor|geometry/i.test(normalized)) throw new Error(`P14 content leaked into P5 component ${component.id}`);
}

const client=new Client({connectionString:databaseUrl});
await client.connect();
try{
  await client.query('DROP SCHEMA IF EXISTS atlas_v2 CASCADE');
  await client.query(baseline);
  await applyAuthoringMigrations(client);
  await applyCorrectionMigrations(client);

  const first=await applyStage2SchemaRelease(client);
  if(first.applied.length!==6||first.skipped.length!==0) throw new Error(`first release apply drift ${JSON.stringify(first)}`);
  const second=await applyStage2SchemaRelease(client);
  if(second.applied.length!==0||second.skipped.length!==6) throw new Error(`release replay drift ${JSON.stringify(second)}`);

  const requiredTables=['governance_contexts','historical_events','people_groups','person_event_participations','person_people_affiliations','person_polity_relation_types','polity_designations','polity_governance_periods','polity_identity_relations','polity_relation_types','polity_relations','stage2_schema_release_components'];
  const tables=await client.query(`select table_name from information_schema.tables where table_schema='atlas_v2' and table_name=any($1::text[]) order by table_name`,[requiredTables]);
  if(JSON.stringify(tables.rows.map(r=>r.table_name))!==JSON.stringify([...requiredTables].sort())) throw new Error(`Stage2 table set drift ${JSON.stringify(tables.rows)}`);

  const activityColumns=await client.query(`select column_name,is_nullable from information_schema.columns where table_schema='atlas_v2' and table_name='person_politics_v2' and column_name=any($1::text[]) order by column_name`,[['relation_type_id','activity_start_granularity','activity_start_certainty','activity_start_calendar','activity_end_granularity','activity_end_certainty','activity_end_calendar','legacy_source_key']]);
  if(activityColumns.rows.length!==8) throw new Error('Activity Stage2 columns missing');
  if(activityColumns.rows.find(r=>r.column_name==='legacy_source_key')?.is_nullable!=='YES') throw new Error('Stage2-native Activity legacy_source_key must be nullable');
  const sourceColumns=await client.query(`select column_name,is_nullable from information_schema.columns where table_schema='atlas_v2' and table_name='sources' and column_name=any($1::text[]) order by column_name`,[['bytes','canonical_url','citation_text','sha256']]);
  if(sourceColumns.rows.length!==4||sourceColumns.rows.find(r=>r.column_name==='bytes')?.is_nullable!=='YES'||sourceColumns.rows.find(r=>r.column_name==='sha256')?.is_nullable!=='YES') throw new Error('Source model release drift');
  const nameColumn=await client.query(`select 1 from information_schema.columns where table_schema='atlas_v2' and table_name='polity_names' and column_name='semantic_name_kind'`);
  if(nameColumn.rowCount!==1) throw new Error('semantic_name_kind missing');
  const legacyNonblank=await client.query(`select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='atlas_v2' and t.relname='person_politics_v2' and c.conname='person_politics_v2_legacy_source_key_nonblank_check'`);
  if(legacyNonblank.rowCount!==1) throw new Error('legacy_source_key nonblank guard missing');

  const personRelations=await client.query(`select id::text,code from atlas_v2.person_polity_relation_types order by code`);
  const expectedPerson=new Map([
    ['rules','7ca4de8f-01d4-542c-acc1-a06848c6742c'],['governs','67a57b37-1853-5f2a-b7ab-e6b2d32b56b6'],['serves','0fc4827f-8543-52f7-9e9a-3173b0c698a7'],['active_in','f33d2789-2e65-50c1-af3e-91335bcbd3ca'],['opposes','5d2d3af6-6e53-5af1-8423-f76c2263afe4'],['claims_rule','fcc652d6-8cf5-5348-9375-60b35f6e0b8c']]);
  if(personRelations.rowCount!==6||personRelations.rows.some(r=>expectedPerson.get(r.code)!==r.id)) throw new Error('Person relation catalog drift');
  const polityRelations=await client.query(`select id::text,code from atlas_v2.polity_relation_types order by code`);
  const expectedPolity=new Map([['vassal_of','b4982965-848a-5a2b-b690-daba1d092d02'],['nominally_subordinate_to','375da950-65bc-5b81-a338-6c705f515120'],['dominion_of','c56b821b-8b21-580b-b40d-c5c87e5b26d9']]);
  if(polityRelations.rowCount!==3||polityRelations.rows.some(r=>expectedPolity.get(r.code)!==r.id)) throw new Error('Polity relation catalog drift');

  const ledger=await client.query(`select component_id,git_blob_sha from atlas_v2.stage2_schema_release_components where release_id=$1 order by component_id`,[release.release.release_id]);
  if(ledger.rowCount!==6) throw new Error('Stage2 release ledger incomplete');
  for(const row of ledger.rows){const expected=release.release.components.find(c=>c.id===row.component_id);if(!expected||expected.git_blob_sha!==row.git_blob_sha) throw new Error(`Stage2 release ledger SHA drift ${row.component_id}`);}

  console.log(JSON.stringify({marker:'ATLAS_STAGE2_P5_ADDITIVE_SCHEMA_RELEASE_REHEARSAL_OK',release_id:release.release.release_id,components:6,first_apply:6,replay_skipped:6,person_relation_types:6,polity_relation_types:3,stage2_native_activity_legacy_key_nullable:true,fake_legacy_source_key_forbidden:true,production_mutation_authorized:false}));
}finally{await client.end();}
