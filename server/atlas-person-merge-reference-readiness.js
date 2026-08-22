"use strict";

const PERSON_REFERENCE_POLICY_VERSION = "p10-person-reference-surface/v2";

const EXPECTED_PERSON_FKS = Object.freeze([
  Object.freeze({ key: "atlas_v2.authoring_manifest_runs.person_id", delete_action: "SET NULL" }),
  Object.freeze({ key: "atlas_v2.person_descriptions.person_id", delete_action: "CASCADE" }),
  Object.freeze({ key: "atlas_v2.person_event_participations.person_id", delete_action: "RESTRICT" }),
  Object.freeze({ key: "atlas_v2.person_external_references.person_id", delete_action: "RESTRICT" }),
  Object.freeze({ key: "atlas_v2.person_names.person_id", delete_action: "CASCADE" }),
  Object.freeze({ key: "atlas_v2.person_people_affiliations.person_id", delete_action: "RESTRICT" }),
  Object.freeze({ key: "atlas_v2.person_politics_v2.person_id", delete_action: "RESTRICT" }),
  Object.freeze({ key: "atlas_v2.person_sources.person_id", delete_action: "CASCADE" })
]);
const EXPECTED_RELATIONSHIP_FKS = Object.freeze([
  Object.freeze({ key: "atlas_v2.authoring_manifest_runs.relationship_id", delete_action: "SET NULL" }),
  Object.freeze({ key: "atlas_v2.chronology_claims.person_politics_id", delete_action: "CASCADE" }),
  Object.freeze({ key: "atlas_v2.person_politics_sources.person_politics_id", delete_action: "CASCADE" }),
  Object.freeze({ key: "atlas_v2.relationship_descriptions.person_politics_id", delete_action: "CASCADE" })
]);
const EXPECTED_NON_FK_PERSON_UUID_COLUMNS = Object.freeze([
  "atlas_v2.person_duplicate_candidates.person_high_id",
  "atlas_v2.person_duplicate_candidates.person_low_id",
  "atlas_v2.person_duplicate_reviews.person_high_id",
  "atlas_v2.person_duplicate_reviews.person_low_id",
  "atlas_v2.person_merge_audits.source_person_id",
  "atlas_v2.person_merge_audits.survivor_person_id",
  "atlas_v2.person_profile_mutation_audits.person_id"
]);
const P10_REVALIDATION_REQUIREMENT_PERSON_UUID_COLUMNS = Object.freeze([
  "atlas_v2.person_duplicate_revalidation_requirements.person_high_id",
  "atlas_v2.person_duplicate_revalidation_requirements.person_low_id"
]);
const EXPECTED_NON_FK_RELATIONSHIP_UUID_COLUMNS = Object.freeze([]);
const EXPECTED_USER_TRIGGERS = Object.freeze([
  "atlas_v2.authoring_manifest_runs.authoring_manifest_runs_external_reference_sync"
]);
const DELETE_ACTIONS = Object.freeze({ a:"NO ACTION",r:"RESTRICT",c:"CASCADE",n:"SET NULL",d:"SET DEFAULT" });

function fkKey(row) {
  const columns = Array.isArray(row.columns) ? row.columns.map(String) : [];
  return `${row.table_schema}.${row.table_name}.${columns.join(",")}`;
}
function normalizeForeignKeys(rows) {
  return (rows || []).map((row) => Object.freeze({
    table_schema:String(row.table_schema),table_name:String(row.table_name),constraint_name:String(row.constraint_name),
    columns:Array.isArray(row.columns) ? row.columns.map(String) : [],
    delete_action:DELETE_ACTIONS[String(row.delete_action_code)] || `UNKNOWN:${row.delete_action_code}`
  })).sort((a,b) => fkKey(a).localeCompare(fkKey(b)) || a.constraint_name.localeCompare(b.constraint_name));
}
async function foreignKeysTo(client,regclass) {
  const result = await client.query(`
    select ns.nspname as table_schema,cls.relname as table_name,con.conname as constraint_name,
           array_agg(att.attname::text order by u.ord) as columns,con.confdeltype as delete_action_code
      from pg_constraint con
      join pg_class cls on cls.oid=con.conrelid
      join pg_namespace ns on ns.oid=cls.relnamespace
      join unnest(con.conkey) with ordinality u(attnum,ord) on true
      join pg_attribute att on att.attrelid=con.conrelid and att.attnum=u.attnum
     where con.contype='f' and con.confrelid=$1::regclass
     group by ns.nspname,cls.relname,con.conname,con.confdeltype
     order by ns.nspname,cls.relname,con.conname`,[regclass]);
  return normalizeForeignKeys(result.rows);
}
async function uuidColumns(client,pattern) {
  const result = await client.query(`
    select table_schema,table_name,column_name from information_schema.columns
     where table_schema='atlas_v2' and data_type='uuid' and column_name ~* $1
     order by table_name,ordinal_position`,[pattern]);
  return (result.rows || []).map((row) => `${row.table_schema}.${row.table_name}.${row.column_name}`);
}
function difference(actual,expected) {
  const expectedSet = new Set(expected);
  return actual.filter((value) => !expectedSet.has(value)).sort();
}
function evaluateFkSurface(label,actualRows,expectedRows,blockers) {
  const actual = new Map(actualRows.map((row) => [fkKey(row),row]));
  const expected = new Map(expectedRows.map((row) => [row.key,row]));
  for (const [key,rule] of expected) {
    const row = actual.get(key);
    if (!row) { blockers.push(`${label}_FK_MISSING:${key}`); continue; }
    if (row.columns.length !== 1) blockers.push(`${label}_FK_NOT_SINGLE_COLUMN:${key}`);
    if (row.delete_action !== rule.delete_action) blockers.push(`${label}_FK_DELETE_ACTION_DRIFT:${key}:${row.delete_action}->${rule.delete_action}`);
  }
  for (const key of actual.keys()) if (!expected.has(key)) blockers.push(`${label}_FK_UNREVIEWED:${key}`);
}

async function inspectPersonMergeReferenceReadiness(client) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client with query() is required");
  const requirementTable = await client.query(`select to_regclass('atlas_v2.person_duplicate_revalidation_requirements')::text as requirements`);
  const requirementLedgerPresent = Boolean(requirementTable.rows[0]?.requirements);
  const expectedPersonSnapshots = [
    ...EXPECTED_NON_FK_PERSON_UUID_COLUMNS,
    ...(requirementLedgerPresent ? P10_REVALIDATION_REQUIREMENT_PERSON_UUID_COLUMNS : [])
  ].sort();

  const personFks = await foreignKeysTo(client,"atlas_v2.persons");
  const relationshipFks = await foreignKeysTo(client,"atlas_v2.person_politics_v2");
  const personLikeUuidColumns = await uuidColumns(client,"(^|_)person_id$|person_(low|high)_id$");
  const relationshipLikeUuidColumns = await uuidColumns(client,"person_politics_id$|relationship_id$");
  const personFkColumns = new Set(personFks.flatMap((row) => row.columns.map((column) => `${row.table_schema}.${row.table_name}.${column}`)));
  const relationshipFkColumns = new Set(relationshipFks.flatMap((row) => row.columns.map((column) => `${row.table_schema}.${row.table_name}.${column}`)));
  const nonFkPersonUuidColumns = personLikeUuidColumns.filter((column) => !personFkColumns.has(column)).sort();
  const nonFkRelationshipUuidColumns = relationshipLikeUuidColumns.filter((column) => !relationshipFkColumns.has(column)).sort();

  const triggerResult = await client.query(`
    select n.nspname as table_schema,c.relname as table_name,t.tgname as trigger_name
      from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
     where not t.tgisinternal and n.nspname='atlas_v2' and c.relname=any($1::text[])
     order by n.nspname,c.relname,t.tgname`, [[
      "persons","person_names","person_sources","person_descriptions","person_politics_v2","person_politics_sources",
      "chronology_claims","relationship_descriptions","person_people_affiliations","person_people_affiliation_sources",
      "person_event_participations","person_event_participation_sources","person_external_references","person_profile_mutation_audits",
      "authoring_manifest_runs","person_duplicate_revalidation_requirements"
    ]]);
  const allUserTriggers = (triggerResult.rows || []).map((row) => `${row.table_schema}.${row.table_name}.${row.trigger_name}`);
  const unreviewedUserTriggers = difference(allUserTriggers,EXPECTED_USER_TRIGGERS);
  const missingReviewedUserTriggers = difference(EXPECTED_USER_TRIGGERS,allUserTriggers);

  const blockers = [];
  evaluateFkSurface("PERSON",personFks,EXPECTED_PERSON_FKS,blockers);
  evaluateFkSurface("RELATIONSHIP",relationshipFks,EXPECTED_RELATIONSHIP_FKS,blockers);
  for (const column of difference(nonFkPersonUuidColumns,expectedPersonSnapshots)) blockers.push(`PERSON_UUID_REFERENCE_UNREVIEWED:${column}`);
  for (const column of difference(expectedPersonSnapshots,nonFkPersonUuidColumns)) blockers.push(`PERSON_UUID_SNAPSHOT_MISSING:${column}`);
  for (const column of difference(nonFkRelationshipUuidColumns,EXPECTED_NON_FK_RELATIONSHIP_UUID_COLUMNS)) blockers.push(`RELATIONSHIP_UUID_REFERENCE_UNREVIEWED:${column}`);
  for (const column of difference(EXPECTED_NON_FK_RELATIONSHIP_UUID_COLUMNS,nonFkRelationshipUuidColumns)) blockers.push(`RELATIONSHIP_UUID_SNAPSHOT_MISSING:${column}`);
  for (const trigger of unreviewedUserTriggers) blockers.push(`MERGE_SURFACE_TRIGGER_UNREVIEWED:${trigger}`);
  for (const trigger of missingReviewedUserTriggers) blockers.push(`MERGE_SURFACE_TRIGGER_MISSING:${trigger}`);

  return Object.freeze({
    policy_version:PERSON_REFERENCE_POLICY_VERSION,ready:blockers.length===0,blockers:Object.freeze(blockers.sort()),
    requirement_ledger_present:requirementLedgerPresent,
    expected_non_fk_person_uuid_columns:Object.freeze(expectedPersonSnapshots),
    person_fks:Object.freeze(personFks),relationship_fks:Object.freeze(relationshipFks),
    non_fk_person_uuid_columns:Object.freeze(nonFkPersonUuidColumns),non_fk_relationship_uuid_columns:Object.freeze(nonFkRelationshipUuidColumns),
    user_triggers:Object.freeze(unreviewedUserTriggers),reviewed_user_triggers:Object.freeze(allUserTriggers.filter((trigger) => EXPECTED_USER_TRIGGERS.includes(trigger)))
  });
}
async function assertPersonMergeReferenceReadiness(client) {
  const readiness = await inspectPersonMergeReferenceReadiness(client);
  if (!readiness.ready) {
    const error = new Error(`P10_PERSON_MERGE_REFERENCE_SURFACE_DRIFT:${readiness.blockers.join(";")}`);
    error.code="P10_PERSON_MERGE_REFERENCE_SURFACE_DRIFT"; error.readiness=readiness; throw error;
  }
  return readiness;
}
module.exports=Object.freeze({
  PERSON_REFERENCE_POLICY_VERSION,EXPECTED_PERSON_FKS,EXPECTED_RELATIONSHIP_FKS,
  EXPECTED_NON_FK_PERSON_UUID_COLUMNS,P10_REVALIDATION_REQUIREMENT_PERSON_UUID_COLUMNS,EXPECTED_NON_FK_RELATIONSHIP_UUID_COLUMNS,
  EXPECTED_USER_TRIGGERS,inspectPersonMergeReferenceReadiness,assertPersonMergeReferenceReadiness
});
