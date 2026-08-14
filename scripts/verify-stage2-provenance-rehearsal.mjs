import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceProposalPath = path.join(root, 'db/proposals/stage2_source_model.rehearsal.sql');
const provenanceProposalPath = path.join(root, 'db/proposals/stage2_provenance.rehearsal.sql');
const sourceContractPath = path.join(root, 'stage2/contracts/source-current.v1.json');
const sourcePackagePath = path.join(root, 'stage2/authoring/p5-polity-relation-sources.v1.json');
const intakePath = path.join(root, 'artifacts/stage2-baseline-a-intake.json');
const manifestPath = path.join(root, 'artifacts/stage2-baseline-a-p5p6-execution-manifest.json');
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) throw new Error('DATABASE_URL is required for Stage 2 provenance rehearsal');

const sourceDdl = fs.readFileSync(sourceProposalPath, 'utf8');
const provenanceDdl = fs.readFileSync(provenanceProposalPath, 'utf8');
const sourceContract = JSON.parse(fs.readFileSync(sourceContractPath, 'utf8'));
const sourcePackage = JSON.parse(fs.readFileSync(sourcePackagePath, 'utf8'));
const intake = JSON.parse(fs.readFileSync(intakePath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

if (!/REHEARSAL ONLY/i.test(sourceDdl) || !/REHEARSAL ONLY/i.test(provenanceDdl)) throw new Error('Stage 2 Source/provenance proposals must remain rehearsal-only');
if (/CREATE\s+TABLE\s+atlas_v2\.sources/i.test(sourceDdl + provenanceDdl)) throw new Error('Stage 2 Source/provenance must extend and reuse atlas_v2.sources');
if (sourceContract?.schema !== 'atlas-stage2-source-contract/v1') throw new Error('Source contract schema drift');
if (sourceContract.identity?.uuid_is_identity !== true || sourceContract.identity?.canonical_url_is_identity !== false || sourceContract.materialization?.fake_sha256_for_web_reference_forbidden !== true || sourceContract.materialization?.fake_bytes_for_web_reference_forbidden !== true || sourceContract.authoring?.production_mutation_authorized !== false) throw new Error('Source contract safety rules missing');
if (sourcePackage?.schema !== 'atlas-stage2-p5-polity-relation-source-authoring-package/v1' || sourcePackage.status !== 'REVIEWED_SOURCE_PREP_NO_UUID_NO_PRODUCTION_MUTATION') throw new Error('Source authoring package schema/status drift');
if (sourcePackage.source_contract !== 'stage2/contracts/source-current.v1.json') throw new Error('Source package contract linkage drift');
if (sourcePackage.rules?.source_uuid_must_remain_null_until_authoring !== true || sourcePackage.rules?.fake_sha256_for_web_reference_forbidden !== true || sourcePackage.rules?.fake_bytes_for_web_reference_forbidden !== true || sourcePackage.rules?.production_mutation_authorized !== false) throw new Error('Source package safety rules missing');

const baselineSources = intake.identity_catalogs?.sources || [];
if (baselineSources.length !== 20 || Number(intake.counts?.sources) !== 20) throw new Error('Baseline A Source count drift');
if (baselineSources.some((source) => source.source_type !== 'repository_dataset' || !source.sha256 || !Number.isInteger(source.bytes))) throw new Error('Baseline A sources are not the expected materialized repository datasets');
const baselineSourceIds = new Set(baselineSources.map((source) => source.id));
const baselineSourceKeys = new Set(baselineSources.map((source) => source.source_key));
if (baselineSourceIds.size !== 20 || baselineSourceKeys.size !== 20) throw new Error('Baseline A Source identity/key duplicate drift');

const approvedUrls = new Map([
  ['bibliographic:ctext:shiji-qing-bu-liezhuan','https://ctext.org/shiji/qing-bu-lie-zhuan/zh'],
  ['bibliographic:ctext:hou-hanshu-liu-yan-yuan-shu-lu-bu','https://ctext.org/hou-han-shu/liu-yan-yuan-shu-lv-bu/zh'],
  ['bibliographic:ctext:hou-hanshu-liu-yu-gongsun-zan-tao-qian','https://ctext.org/hou-han-shu/liu-yu-gong-sun-zan-tao/zhs'],
  ['bibliographic:ctext:hou-hanshu-yuan-shao','https://ctext.org/hou-han-shu/yuan-shao-liu-biao-lie-zhuan-shang/zh'],
  ['bibliographic:ctext:hou-hanshu-liu-biao','https://ctext.org/hou-han-shu/yuan-shao-liu-biao-lie-zhuan-xia/zh'],
  ['bibliographic:ctext:zhang-lu-primary-passage','https://ctext.org/text.pl?if=gb&node=602325&show=parallel'],
  ['bibliographic:ctext:ming-shi-jishi-benmo-fang-guozhen','https://ctext.org/wiki.pl?chapter=292789&if=gb'],
  ['bibliographic:canada:constitution-acts-1867-1982','https://laws-lois.justice.gc.ca/eng/Const/page-1.html'],
  ['bibliographic:canada:statute-of-westminster-1931','https://www.canada.ca/en/intergovernmental-affairs/services/federation/statute-westminster.html']
]);
const sourceCandidates = sourcePackage.sources || [];
if (sourceCandidates.length !== 9) throw new Error(`expected 9 bibliographic Source candidates, got ${sourceCandidates.length}`);
const candidateKeys = new Set();
for (const source of sourceCandidates) {
  if (!approvedUrls.has(source.candidate_key) || candidateKeys.has(source.candidate_key)) throw new Error(`unexpected/duplicate Source candidate ${source.candidate_key}`);
  candidateKeys.add(source.candidate_key);
  if (baselineSourceKeys.has(source.candidate_key)) throw new Error(`${source.candidate_key}: collides with Baseline A Source key`);
  if (source.source_uuid !== null || source.sha256 !== null || source.bytes !== null) throw new Error(`${source.candidate_key}: branch-only bibliographic Source must not fabricate UUID/hash/bytes`);
  if (source.canonical_url !== approvedUrls.get(source.candidate_key)) throw new Error(`${source.candidate_key}: reviewed canonical URL drift`);
  if (!source.source_type || !String(source.title || '').trim() || !String(source.citation_text || '').trim()) throw new Error(`${source.candidate_key}: incomplete bibliographic record`);
}
if (candidateKeys.size !== approvedUrls.size) throw new Error('reviewed Source candidate set incomplete');

const relationAssertions = manifest.polity_relation_assertions || [];
if (relationAssertions.length !== 10) throw new Error(`expected 10 reviewed Polity relation assertions, got ${relationAssertions.length}`);
const assertionByDecision = new Map(relationAssertions.map((assertion) => [assertion.decision_id, assertion]));
if (assertionByDecision.size !== 10) throw new Error('reviewed relation decision IDs must be unique for the 10 assertion frontier');
const links = sourcePackage.links || [];
if (links.length !== 11) throw new Error(`expected 11 assertion-source links, got ${links.length}`);
const coveredDecisions = new Set();
const uniqueLinkKeys = new Set();
for (const link of links) {
  const assertion = assertionByDecision.get(link.relation_decision_id);
  if (!assertion) throw new Error(`${link.relation_decision_id}: Source link does not map to a reviewed relation assertion`);
  if (assertion.relation_type !== link.relation_type) throw new Error(`${link.relation_decision_id}: relation type/source-link drift`);
  if (!candidateKeys.has(link.source_candidate_key)) throw new Error(`${link.relation_decision_id}: unknown Source candidate ${link.source_candidate_key}`);
  if (!String(link.source_locator_key || '').trim()) throw new Error(`${link.relation_decision_id}: blank source locator`);
  const key = `${link.relation_decision_id}|${link.source_candidate_key}|${link.source_locator_key}`;
  if (uniqueLinkKeys.has(key)) throw new Error(`duplicate assertion-source-locator ${key}`);
  uniqueLinkKeys.add(key);
  coveredDecisions.add(link.relation_decision_id);
}
if (coveredDecisions.size !== 10 || [...assertionByDecision.keys()].some((id) => !coveredDecisions.has(id))) throw new Error('at least one reviewed Polity relation assertion lacks normalized Source prep');
const expectedSummary = {reviewed_relation_assertions:10,new_source_candidates:9,existing_source_uuid_reuses:0,source_links:11,assertions_without_source_link:0,source_uuid_assignments:0,fake_content_materialization_fields:0};
for (const [key, value] of Object.entries(expectedSummary)) if (Number(sourcePackage.result?.[key]) !== value) throw new Error(`Source package summary drift ${key}`);
if (sourcePackage.result?.production_mutation_authorized !== false) throw new Error('Source package cannot authorize Production mutation');

const expectedTables = ['polity_designation_sources','polity_governance_period_sources','polity_identity_relation_sources','polity_relation_sources'].sort();
const expectedSourceIndexes = ['polity_designation_sources_source_idx','polity_governance_period_sources_source_idx','polity_identity_relation_sources_source_idx','polity_relation_sources_source_idx'].sort();
function same(actual, expected, label) { const left=[...actual].sort(); const right=[...expected].sort(); if (JSON.stringify(left)!==JSON.stringify(right)) throw new Error(`${label} mismatch actual=${JSON.stringify(left)} expected=${JSON.stringify(right)}`); }

const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  const prerequisite = await client.query(`select to_regclass('atlas_v2.polity_governance_periods') as governance_periods,to_regclass('atlas_v2.polity_relations') as polity_relations,to_regclass('atlas_v2.polity_designations') as polity_designations,to_regclass('atlas_v2.polity_identity_relations') as identity_relations,to_regclass('atlas_v2.sources') as sources`);
  const prereq = prerequisite.rows[0] || {};
  if (Object.values(prereq).some((value) => !value)) throw new Error(`Stage 2 semantic rehearsal must run before Source/provenance rehearsal: ${JSON.stringify(prereq)}`);

  await client.query(sourceDdl);
  const sourceColumns = await client.query(`select column_name,is_nullable from information_schema.columns where table_schema='atlas_v2' and table_name='sources' and column_name=any($1::text[]) order by column_name`, [['sha256','bytes','canonical_url','citation_text']]);
  const columnMap = Object.fromEntries(sourceColumns.rows.map((row)=>[row.column_name,row.is_nullable]));
  if (Object.keys(columnMap).length !== 4 || Object.values(columnMap).some((nullable)=>nullable !== 'YES')) throw new Error(`Source extension column/nullability drift ${JSON.stringify(columnMap)}`);

  await client.query('BEGIN');
  try {
    const repoSource='00000000-0000-4000-8000-000000002001';
    const bibSource='00000000-0000-4000-8000-000000002002';
    await client.query(`insert into atlas_v2.sources(id,source_key,source_type,title,sha256,bytes) values ($1,'source-model-repo','repository_dataset','Repository source','materialized-hash',10)`,[repoSource]);
    await client.query(`insert into atlas_v2.sources(id,source_key,source_type,title,sha256,bytes,canonical_url,citation_text) values ($1,'source-model-bib','primary_text_digital_edition','Bibliographic source',null,null,'https://example.invalid/source','Reviewed bibliographic citation')`,[bibSource]);

    await client.query('SAVEPOINT partial_materialization_probe');
    let partialRejected=false;
    try { await client.query(`insert into atlas_v2.sources(id,source_key,source_type,title,sha256,bytes,canonical_url) values ('00000000-0000-4000-8000-000000002003','source-model-partial','test','Partial','hash-only',null,'https://example.invalid/partial')`); }
    catch(error){ partialRejected=/sources_content_materialization_pair_check/i.test(String(error?.message||error)); await client.query('ROLLBACK TO SAVEPOINT partial_materialization_probe'); }
    if(!partialRejected) throw new Error('Source hash/bytes partial materialization was not rejected');

    await client.query('SAVEPOINT evidence_identity_probe');
    let emptyRejected=false;
    try { await client.query(`insert into atlas_v2.sources(id,source_key,source_type,title,sha256,bytes,canonical_url,citation_text) values ('00000000-0000-4000-8000-000000002004','source-model-empty','test','Empty',null,null,null,null)`); }
    catch(error){ emptyRejected=/sources_evidence_identity_material_check/i.test(String(error?.message||error)); await client.query('ROLLBACK TO SAVEPOINT evidence_identity_probe'); }
    if(!emptyRejected) throw new Error('Source with no content materialization and no bibliographic evidence was not rejected');
  } finally { await client.query('ROLLBACK'); }

  await client.query(provenanceDdl);
  const tables=await client.query(`select table_name from information_schema.tables where table_schema='atlas_v2' and table_name=any($1::text[]) order by table_name`,[expectedTables]);
  same(tables.rows.map((row)=>row.table_name),expectedTables,'provenance tables');
  const indexes=await client.query(`select indexname from pg_indexes where schemaname='atlas_v2' and indexname=any($1::text[]) order by indexname`,[expectedSourceIndexes]);
  same(indexes.rows.map((row)=>row.indexname),expectedSourceIndexes,'source reverse-lookup indexes');

  const fkRows=await client.query(`select con.conname,confdeltype from pg_constraint con join pg_namespace n on n.oid=con.connamespace where n.nspname='atlas_v2' and con.conname=any($1::text[]) order by con.conname`, [[
    'polity_governance_period_sources_period_id_fkey','polity_governance_period_sources_source_id_fkey','polity_relation_sources_relation_id_fkey','polity_relation_sources_source_id_fkey','polity_designation_sources_designation_id_fkey','polity_designation_sources_source_id_fkey','polity_identity_relation_sources_relation_id_fkey','polity_identity_relation_sources_source_id_fkey'
  ]]);
  if(fkRows.rows.length!==8) throw new Error(`provenance FK contract incomplete ${fkRows.rows.length}`);
  for(const row of fkRows.rows){ const sourceFk=row.conname.endsWith('_source_id_fkey'); if(row.confdeltype!==(sourceFk?'r':'c')) throw new Error(`${row.conname} delete behavior drift`); }

  const primaryKeys=await client.query(`select tc.table_name,json_agg(kcu.column_name order by kcu.ordinal_position) as columns from information_schema.table_constraints tc join information_schema.key_column_usage kcu on tc.constraint_name=kcu.constraint_name and tc.constraint_schema=kcu.constraint_schema where tc.constraint_schema='atlas_v2' and tc.constraint_type='PRIMARY KEY' and tc.table_name=any($1::text[]) group by tc.table_name`,[expectedTables]);
  if(primaryKeys.rows.length!==4) throw new Error('provenance primary-key contract incomplete');
  for(const row of primaryKeys.rows) if(!Array.isArray(row.columns)||row.columns.length!==3||!row.columns.includes('source_id')||!row.columns.includes('source_locator_key')) throw new Error(`provenance PK locator contract drift ${row.table_name}`);

  const legacyActivitySources=await client.query(`select to_regclass('atlas_v2.person_politics_sources') as current_activity_sources`);
  if(!legacyActivitySources.rows[0]?.current_activity_sources) throw new Error('existing person_politics_sources disappeared');

  await client.query('BEGIN');
  try {
    const polityA='00000000-0000-4000-8000-000000001001',polityB='00000000-0000-4000-8000-000000001002',governance='00000000-0000-4000-8000-000000001003',relationType='00000000-0000-4000-8000-000000001004',identityRelationType='00000000-0000-4000-8000-000000001005',source='00000000-0000-4000-8000-000000001006',governancePeriod='00000000-0000-4000-8000-000000001007',polityRelation='00000000-0000-4000-8000-000000001008',designation='00000000-0000-4000-8000-000000001009',identityRelation='00000000-0000-4000-8000-000000001010';
    await client.query(`insert into atlas_v2.polities(id,canonical_key,polity_type,historicity) values ($1,'prov-probe-a','state','historical'),($2,'prov-probe-b','state','historical')`,[polityA,polityB]);
    await client.query(`insert into atlas_v2.governance_contexts(id,canonical_key,governance_type,historicity) values ($1,'prov-probe-government','government','historical')`,[governance]);
    await client.query(`insert into atlas_v2.polity_relation_types(id,code,category,is_active) values ($1,'prov_probe_relation','dependency',true)`,[relationType]);
    await client.query(`insert into atlas_v2.polity_identity_relation_types(id,code,is_active) values ($1,'prov_probe_transition',true)`,[identityRelationType]);
    await client.query(`insert into atlas_v2.sources(id,source_key,source_type,title,sha256,bytes,canonical_url,citation_text) values ($1,'prov-probe-source','bibliographic_reference','Stage 2 provenance probe',null,null,'https://example.invalid/provenance','Provenance rehearsal citation')`,[source]);
    await client.query(`insert into atlas_v2.polity_governance_periods(id,polity_id,governance_context_id,confidence) values ($1,$2,$3,'unknown')`,[governancePeriod,polityA,governance]);
    await client.query(`insert into atlas_v2.polity_relations(id,subject_polity_id,object_polity_id,relation_type_id,confidence) values ($1,$2,$3,$4,'unknown')`,[polityRelation,polityA,polityB,relationType]);
    await client.query(`insert into atlas_v2.polity_designations(id,polity_id,designation_type,confidence) values ($1,$2,'state_form','unknown')`,[designation,polityA]);
    await client.query(`insert into atlas_v2.polity_identity_relations(id,predecessor_polity_id,successor_polity_id,relation_type_id,confidence) values ($1,$2,$3,$4,'unknown')`,[identityRelation,polityA,polityB,identityRelationType]);
    await client.query(`insert into atlas_v2.polity_governance_period_sources values ($1,$2,'section:governance')`,[governancePeriod,source]);
    await client.query(`insert into atlas_v2.polity_relation_sources values ($1,$2,'page:10'),($1,$2,'page:42')`,[polityRelation,source]);
    await client.query(`insert into atlas_v2.polity_designation_sources values ($1,$2,'section:designation')`,[designation,source]);
    await client.query(`insert into atlas_v2.polity_identity_relation_sources values ($1,$2,'section:transition')`,[identityRelation,source]);
    const linked=await client.query(`select (select count(*) from atlas_v2.polity_governance_period_sources)::int as governance_links,(select count(*) from atlas_v2.polity_relation_sources)::int as relation_links,(select count(*) from atlas_v2.polity_designation_sources)::int as designation_links,(select count(*) from atlas_v2.polity_identity_relation_sources)::int as identity_links`);
    const l=linked.rows[0]; if(l.governance_links!==1||l.relation_links!==2||l.designation_links!==1||l.identity_links!==1) throw new Error(`provenance insert probe failed ${JSON.stringify(l)}`);
    await client.query('SAVEPOINT blank_locator_probe');
    let blankRejected=false;
    try{await client.query(`insert into atlas_v2.polity_relation_sources values ($1,$2,'   ')`,[polityRelation,source]);}catch(error){blankRejected=/polity_relation_sources_locator_check/i.test(String(error?.message||error));await client.query('ROLLBACK TO SAVEPOINT blank_locator_probe');}
    if(!blankRejected) throw new Error('blank source locator was not rejected');
    await client.query('SAVEPOINT source_delete_probe');
    let sourceDeleteRejected=false;
    try{await client.query(`delete from atlas_v2.sources where id=$1`,[source]);}catch(error){sourceDeleteRejected=/foreign key constraint/i.test(String(error?.message||error));await client.query('ROLLBACK TO SAVEPOINT source_delete_probe');}
    if(!sourceDeleteRejected) throw new Error('deleting a cited Source was not rejected');
    await client.query(`delete from atlas_v2.polity_relations where id=$1`,[polityRelation]);
    const afterDelete=await client.query(`select count(*)::int as n from atlas_v2.polity_relation_sources where polity_relation_id=$1`,[polityRelation]);
    if(afterDelete.rows[0]?.n!==0) throw new Error('assertion delete did not cascade provenance locators');
  } finally { await client.query('ROLLBACK'); }

  console.log(JSON.stringify({
    marker:'ATLAS_STAGE2_PROVENANCE_REHEARSAL_CURRENT_V2',status:'PASS',production_migration_registered:false,
    baseline_repository_sources:20,reusable_bibliographic_source_uuids:0,reviewed_relation_assertions:10,new_bibliographic_source_candidates:9,prepared_relation_source_links:11,assertions_without_source_link:0,
    source_model_supports_unmaterialized_bibliographic_reference:true,fake_hash_or_bytes_required:false,source_uuid_assignments:0,
    provenance_tables:expectedTables.length,shared_source_identity:true,mandatory_nonblank_locator:true,multiple_locators_per_source_assertion:true,assertion_delete_cascades_links:true,cited_source_delete_restricted:true,existing_activity_source_contract_preserved:true
  },null,2));
} finally { await client.end(); }
