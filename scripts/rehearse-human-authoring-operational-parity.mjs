import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import pg from 'pg';

const require=createRequire(import.meta.url);
const { applyAuthoringMigrations }=require('../server/atlas-authoring-migrations.js');
const { applyCorrectionMigrations }=require('../server/atlas-correction-migrations.js');
const { applyStage2SchemaRelease }=require('../server/atlas-stage2-schema-release.js');
const { applyP9Cutover }=require('../server/atlas-stage2-p9-db-cutover.js');
const { inspectAuthoringReadiness }=require('../server/atlas-authoring-readiness.js');
const { createPolity, createRole }=require('../server/atlas-identity-service.js');
const { createHumanAuthoringService, loadHumanAuthoringCatalogs }=require('../server/atlas-human-authoring-service.js');
const { loadStage2NativeActivity }=require('../server/atlas-stage2-native-activity-service.js');

const { Client }=pg;
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const databaseUrl=String(process.env.DATABASE_URL||'').trim();
if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) throw new Error('DATABASE_URL is required');
const baseline=fs.readFileSync(path.join(root,'db/schema/atlas_v2.current.sql'),'utf8');
const PERIOD_ID='77777777-7777-4777-8777-777777777777';

function firstRequest() {
  return {
    schema:'atlas-human-authoring/v1',
    request_id:'fixture:human-operational:first',
    person:{canonical_name_en:'Human Authoring Fixture Person',display_name_ko:'휴먼 저작 픽스처 인물'},
    polity:{canonical_name_en:'Human Authoring Fixture Polity',display_name_ko:null},
    activity:{
      relation_type:'active_in',
      period_basis:'fixture_human_period',
      role:'Fixture Scholar',
      role_display_name_ko:null,
      start_year:101,
      start_month:3,
      start_day:null,
      start_certainty:'approximate',
      start_calendar:'julian',
      end_year:103,
      end_month:7,
      end_day:14,
      end_certainty:'uncertain',
      end_calendar:'source_calendar',
      confidence:'well_established',
      chronology_status:'reviewed',
      notes:'Disposable human authoring operational parity fixture.'
    },
    sources:[{
      title:'Fixture web bibliography',
      canonical_url:'https://example.test/human-authoring-fixture',
      citation_text:'Fixture citation, pp. 10-12.'
    }]
  };
}

function urlLessRequest() {
  return {
    schema:'atlas-human-authoring/v1',
    request_id:'fixture:human-operational:url-less',
    person:{canonical_name_en:'Human Authoring Fixture Person',display_name_ko:null},
    polity:{canonical_name_en:'Human Authoring Fixture Polity',display_name_ko:null},
    activity:{
      relation_type:'serves',
      period_basis:'fixture_human_period',
      role:'Fixture Archivist',
      role_display_name_ko:'픽스처 기록관',
      start_year:110,
      start_month:null,
      start_day:null,
      start_certainty:'exact',
      start_calendar:'unspecified_historical',
      end_year:112,
      end_month:6,
      end_day:null,
      end_certainty:'approximate',
      end_calendar:'gregorian',
      confidence:'likely',
      chronology_status:'reviewed'
    },
    sources:[{
      title:'Fixture printed monograph',
      citation_text:'Fixture printed reference, p. 42.'
    }]
  };
}

const client=new Client({connectionString:databaseUrl});
await client.connect();
try {
  await client.query('DROP SCHEMA IF EXISTS atlas_v2 CASCADE');
  await client.query(baseline);
  await applyAuthoringMigrations(client);
  await applyCorrectionMigrations(client);
  const p5=await applyStage2SchemaRelease(client);
  assert.equal(p5.applied.length,6,'human operational rehearsal requires complete P5 additive schema');
  const p9=await applyP9Cutover(client);
  assert.equal(p9.after.old_index_present,false);
  assert.equal(p9.after.new_index_present,true);
  assert.equal(p9.after.duplicate_groups,0);

  await client.query('begin');
  const existingPolity=await createPolity(client,{
    canonical_name_en:'Human Authoring Fixture Polity',
    display_name_ko:'휴먼 저작 픽스처 정치체',
    canonical_key:'human-authoring-fixture-polity',
    polity_type:'historical_polity',
    historicity:'historical'
  });
  const existingRole=await createRole(client,{
    code:'fixture_scholar',
    source_label:'Fixture Scholar',
    display_name_ko:'픽스처 학자',
    category:'activity'
  });
  await client.query(`insert into atlas_v2.period_bases(id,code,is_active) values($1::uuid,'fixture_human_period',true)`,[PERIOD_ID]);
  await client.query(`insert into atlas_v2.period_basis_names(id,period_basis_id,locale,name,is_preferred) values(gen_random_uuid(),$1::uuid,'en','Fixture human period',true)`,[PERIOD_ID]);
  await client.query('commit');

  const warnings=[];
  const onWarning=(warning)=>{
    const message=String(warning?.message||warning||'');
    if (message.includes('client.query()') || message.includes('already executing a query')) warnings.push(message);
  };
  process.on('warning',onWarning);
  const readiness=await inspectAuthoringReadiness(client);
  const catalogs=await loadHumanAuthoringCatalogs(client);
  await new Promise((resolve)=>setImmediate(resolve));
  process.off('warning',onWarning);
  assert.equal(readiness.ready,true,'fresh P9 human-authoring database must be ready');
  assert.equal(warnings.length,0,'authoring readiness/catalog reads must not overlap query() calls on one pg.Client');
  assert.ok(catalogs.relation_types.includes('active_in'));
  assert.ok(catalogs.relation_types.includes('serves'));
  assert.ok(catalogs.period_bases.includes('fixture_human_period'));

  const service=createHumanAuthoringService({client});
  const firstRaw=firstRequest();
  const first=await service.apply(firstRaw,{transport:{kind:'fresh_postgres_rehearsal'}});
  assert.equal(first.replay,false);
  assert.equal(first.result.semantic_version,'v2-relation-full-temporal');
  assert.equal(first.result.entities.person.disposition,'created');
  assert.equal(first.result.entities.polity.disposition,'reused');
  assert.equal(first.result.entities.polity.id,String(existingPolity.id).toLowerCase());
  assert.equal(first.result.entities.role.disposition,'reused');
  assert.equal(first.result.entities.role.id,String(existingRole.id).toLowerCase());
  assert.equal(first.result.entities.relation_type.code,'active_in');
  assert.equal(first.result.entities.period_basis.code,'fixture_human_period');

  const firstActivity=await loadStage2NativeActivity(client,first.relationship_id);
  assert.equal(firstActivity.activity_start,101);
  assert.equal(firstActivity.activity_start_month,3);
  assert.equal(firstActivity.activity_start_day,null);
  assert.equal(firstActivity.activity_start_granularity,'month');
  assert.equal(firstActivity.activity_start_certainty,'approximate');
  assert.equal(firstActivity.activity_start_calendar,'julian');
  assert.equal(firstActivity.activity_end,103);
  assert.equal(firstActivity.activity_end_month,7);
  assert.equal(firstActivity.activity_end_day,14);
  assert.equal(firstActivity.activity_end_granularity,'day');
  assert.equal(firstActivity.activity_end_certainty,'uncertain');
  assert.equal(firstActivity.activity_end_calendar,'source_calendar');
  assert.equal(firstActivity.source_links.length,1);

  const firstSource=(await client.query(`select source_type,canonical_url,citation_text from atlas_v2.sources where id=$1::uuid`,[first.source_ids[0]])).rows[0];
  assert.equal(firstSource.source_type,'web_bibliographic_reference');
  assert.equal(firstSource.canonical_url,'https://example.test/human-authoring-fixture');

  const replay=await service.apply(firstRaw,{transport:{kind:'fresh_postgres_rehearsal'}});
  assert.equal(replay.replay,true);
  assert.equal(replay.relationship_id,first.relationship_id);

  const duplicate=structuredClone(firstRaw);
  duplicate.request_id='fixture:human-operational:semantic-duplicate';
  duplicate.sources=[{title:'Different provenance for the same semantic activity',citation_text:'Different source.'}];
  await assert.rejects(()=>service.apply(duplicate),/STAGE2_ACTIVITY_SEMANTIC_DUPLICATE/);

  const urlLess=await service.apply(urlLessRequest(),{transport:{kind:'fresh_postgres_rehearsal'}});
  assert.equal(urlLess.replay,false);
  assert.equal(urlLess.result.entities.person.disposition,'reused');
  assert.equal(urlLess.result.entities.polity.disposition,'reused');
  assert.equal(urlLess.result.entities.role.disposition,'created');
  const urlLessSource=(await client.query(`select source_type,canonical_url,citation_text from atlas_v2.sources where id=$1::uuid`,[urlLess.source_ids[0]])).rows[0];
  assert.equal(urlLessSource.source_type,'bibliographic_reference');
  assert.equal(urlLessSource.canonical_url,null);
  assert.equal(urlLessSource.citation_text,'Fixture printed reference, p. 42.');

  const missingPersonKo=urlLessRequest();
  missingPersonKo.request_id='fixture:human-operational:new-person-no-ko';
  missingPersonKo.person={canonical_name_en:'Brand New Missing KO Person',display_name_ko:null};
  missingPersonKo.activity={...missingPersonKo.activity,start_year:120,end_year:121,role:'Fixture Scholar',role_display_name_ko:null};
  await assert.rejects(()=>service.apply(missingPersonKo),/HUMAN_AUTHORING_NEW_PERSON_KO_REQUIRED/);

  const missingPolityKo=urlLessRequest();
  missingPolityKo.request_id='fixture:human-operational:new-polity-no-ko';
  missingPolityKo.polity={canonical_name_en:'Brand New Missing KO Polity',display_name_ko:null};
  missingPolityKo.activity={...missingPolityKo.activity,start_year:122,end_year:123,role:'Fixture Scholar',role_display_name_ko:null};
  await assert.rejects(()=>service.apply(missingPolityKo),/HUMAN_AUTHORING_NEW_POLITY_KO_REQUIRED/);

  const missingSource=urlLessRequest();
  missingSource.request_id='fixture:human-operational:no-source';
  missingSource.sources=[];
  await assert.rejects(()=>service.apply(missingSource),/HUMAN_AUTHORING_SOURCE_REQUIRED/);

  const unknownRelation=urlLessRequest();
  unknownRelation.request_id='fixture:human-operational:unknown-relation';
  unknownRelation.activity={...unknownRelation.activity,relation_type:'not_in_live_catalog',start_year:124,end_year:125,role:'Fixture Scholar',role_display_name_ko:null};
  await assert.rejects(()=>service.apply(unknownRelation),/HUMAN_AUTHORING_RELATION_TYPE_UNRESOLVED/);

  const counts=(await client.query(`select
    (select count(*)::int from atlas_v2.persons p join atlas_v2.person_names n on n.person_id=p.id where n.locale='en' and n.is_preferred=true and n.name='Human Authoring Fixture Person') as fixture_persons,
    (select count(*)::int from atlas_v2.polities p join atlas_v2.polity_names n on n.polity_id=p.id where n.locale='en' and n.is_preferred=true and n.name='Human Authoring Fixture Polity') as fixture_polities,
    (select count(*)::int from atlas_v2.roles where source_label='Fixture Scholar') as reused_roles,
    (select count(*)::int from atlas_v2.roles where source_label='Fixture Archivist') as created_roles`)).rows[0];
  assert.deepEqual(counts,{fixture_persons:1,fixture_polities:1,reused_roles:1,created_roles:1});

  console.log(JSON.stringify({
    marker:'ATLAS_HUMAN_AUTHORING_OPERATIONAL_PARITY_OK',
    readiness:true,
    same_client_query_warning:false,
    live_relation_catalog:true,
    live_period_basis_catalog:true,
    new_person:true,
    existing_polity_reused:true,
    existing_role_reused:true,
    new_role_created:true,
    full_temporal:true,
    web_source:true,
    url_less_bibliographic_source:true,
    exact_request_replay:true,
    semantic_duplicate_rejected:true,
    missing_new_person_ko_rejected:true,
    missing_new_polity_ko_rejected:true,
    source_less_write_rejected:true,
    unknown_relation_rejected_by_live_catalog:true,
    production_mutation_authorized:false
  },null,2));
} catch (error) {
  try { await client.query('rollback'); } catch {}
  throw error;
} finally {
  try { await client.query('DROP SCHEMA IF EXISTS atlas_v2 CASCADE'); } catch {}
  await client.end();
}
