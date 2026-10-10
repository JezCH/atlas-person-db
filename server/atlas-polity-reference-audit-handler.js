"use strict";

const {
  verifyGitHubActionsOidc
} = require("./atlas-audit-github-oidc.js");
const { createPostgresClient } = require("./atlas-postgres-client.js");
const { discoverIdentityReferences } = require("./atlas-destructive-lifecycle-service.js");
const {
  bearerToken,
  requireDeployment
} = require("./atlas-audit-inventory-handler.js");

const MARKER = "ATLAS_POLITY_REFERENCE_AUDIT_V1";
const TARGET_SCHEMA = "atlas_v2";
const TARGET_TABLE = "polities";
const TARGET_COLUMN = "id";
const OWNED_REFERENCE_KEYS = new Set([
  "atlas_v2.polity_names.polity_id",
  "atlas_v2.polity_descriptions.polity_id",
  "atlas_v2.polity_sources.polity_id"
]);

function json(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function quoteIdentifier(value) {
  const text = String(value || "");
  if (!/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(text)) {
    throw new Error("POLITY_REFERENCE_AUDIT_UNSAFE_IDENTIFIER");
  }
  return `"${text}"`;
}

function referenceKey(ref) {
  return `${ref.source_schema}.${ref.source_table}.${ref.source_column}`;
}

function classifyReference(ref) {
  return OWNED_REFERENCE_KEYS.has(referenceKey(ref)) ? "owned" : "external";
}

async function beginReadOnly(client) {
  await client.query("begin isolation level repeatable read read only");
  const readOnly = await client.query("select current_setting('transaction_read_only') as read_only");
  if (readOnly.rows[0]?.read_only !== "on") throw new Error("POLITY_REFERENCE_AUDIT_TRANSACTION_NOT_READ_ONLY");
}

async function queryPolities(client) {
  const result = await client.query(`
      select p.id, p.canonical_key, p.polity_type, p.historicity,
             coalesce((select jsonb_agg(jsonb_build_object(
               'id', pn.id,
               'locale', pn.locale,
               'name', pn.name,
               'name_type', pn.name_type,
               'is_preferred', pn.is_preferred
             ) order by pn.id)
               from atlas_v2.polity_names pn
              where pn.polity_id = p.id), '[]'::jsonb) as names
        from atlas_v2.polities p
       order by p.id`);
  return result.rows;
}

async function discoverPolityReferences(client) {
  let discovered;
  try { discovered = await discoverIdentityReferences(client, {
    targetTable: TARGET_TABLE,
    targetColumn: TARGET_COLUMN,
    semanticColumnPattern: "^polity_id$"
  }); } catch (error) {
    if (error?.message === "DESTRUCTIVE_LIFECYCLE_UNSUPPORTED_FOREIGN_KEY") throw new Error("POLITY_REFERENCE_AUDIT_UNSUPPORTED_FOREIGN_KEY");
    throw error;
  }
  const catalog = discovered.map((row) => {
    const ref = {
      source_schema: String(row.source_schema),
      source_table: String(row.source_table),
      source_column: String(row.source_column),
      constraint_name: row.constraint_name == null ? null : String(row.constraint_name),
      constraint_backed: Boolean(row.constraint_backed)
    };
    ref.classification = classifyReference(ref);
    return ref;
  });
  if (!catalog.some((ref) => referenceKey(ref) === "atlas_v2.person_politics_v2.polity_id")) {
    throw new Error("POLITY_REFERENCE_AUDIT_ACTIVITY_REFERENCE_MISSING");
  }
  return catalog;
}

async function queryReferenceCounts(client, ref) {
  const schema = quoteIdentifier(ref.source_schema);
  const table = quoteIdentifier(ref.source_table);
  const column = quoteIdentifier(ref.source_column);
  const result = await client.query(`
      select ${column}::text as polity_id,
             count(*)::int as reference_count
        from ${schema}.${table}
       where ${column} is not null
       group by ${column}
       order by ${column}`);
  return result.rows.map((row) => ({
    polity_id: String(row.polity_id).toLowerCase(),
    reference_count: Number(row.reference_count || 0)
  }));
}

function referenceCountRecord(ref, count) {
  return Object.freeze({
    source_schema: ref.source_schema,
    source_table: ref.source_table,
    source_column: ref.source_column,
    constraint_name: ref.constraint_name,
    constraint_backed: ref.constraint_backed,
    count
  });
}

async function queryPolityReferenceAudit(client, { includeBrazilDetails = false, includeBrazilPreflight = false, includeBrazilSourceAliases = false, includeBrazilStage2Contract = false, includeBrazilLawSourcePreflight = false, includeRussiaDetails = false } = {}) {
  await beginReadOnly(client);
  try {
    const polities = await queryPolities(client);
    const references = await discoverPolityReferences(client);
    const countsByReference = new Map();

    for (const ref of references) {
      const rows = await queryReferenceCounts(client, ref);
      const byPolity = new Map();
      for (const row of rows) {
        if (byPolity.has(row.polity_id)) throw new Error("POLITY_REFERENCE_AUDIT_DUPLICATE_COUNT_ROW");
        byPolity.set(row.polity_id, row.reference_count);
      }
      countsByReference.set(referenceKey(ref), byPolity);
    }

    const polityIds = new Set(polities.map((row) => String(row.id).toLowerCase()));
    for (const [key, byPolity] of countsByReference.entries()) {
      for (const polityId of byPolity.keys()) {
        if (!polityIds.has(polityId)) {
          const error = new Error("POLITY_REFERENCE_AUDIT_DANGLING_REFERENCE");
          error.reference_key = key;
          error.polity_id = polityId;
          throw error;
        }
      }
    }

    const outputPolities = polities.map((row) => {
      const polityId = String(row.id).toLowerCase();
      const ownedReferences = [];
      const externalReferences = [];
      let ownedTotal = 0;
      let externalTotal = 0;
      for (const ref of references) {
        const count = Number(countsByReference.get(referenceKey(ref))?.get(polityId) || 0);
        const record = referenceCountRecord(ref, count);
        if (ref.classification === "owned") {
          ownedReferences.push(record);
          ownedTotal += count;
        } else {
          externalReferences.push(record);
          externalTotal += count;
        }
      }
      return Object.freeze({
        polity_id: polityId,
        canonical_key: row.canonical_key,
        polity_type: row.polity_type,
        historicity: row.historicity,
        names: Array.isArray(row.names) ? row.names : [],
        owned_reference_total: ownedTotal,
        external_reference_total: externalTotal,
        is_external_orphan: externalTotal === 0,
        owned_references: Object.freeze(ownedReferences),
        external_references: Object.freeze(externalReferences)
      });
    });

    const brazilDetails = includeBrazilDetails ? await queryBrazilDetails(client) : null;
    const brazilPreflight = includeBrazilPreflight ? await queryBrazilPreflight(client) : null;
    const brazilSourceAliases = includeBrazilSourceAliases ? await queryBrazilSourceAliases(client) : null;
    const brazilStage2Contract = includeBrazilStage2Contract ? await queryBrazilStage2Contract(client) : null;
    const brazilLawSourcePreflight = includeBrazilLawSourcePreflight ? await queryBrazilLawSourcePreflight(client) : null;
    const russiaDetails = includeRussiaDetails ? await queryRussiaDetails(client) : null;
    if (includeBrazilDetails && outputPolities.filter((row) => BRAZIL_P2_03E_POLITY_IDS.includes(row.polity_id)).length !== BRAZIL_P2_03E_POLITY_IDS.length) {
      throw new Error("POLITY_REFERENCE_AUDIT_BRAZIL_POLITY_MISSING");
    }
    await client.query("commit");
    return Object.freeze({
      brazil_details: brazilDetails,
      brazil_preflight: brazilPreflight,
      brazil_source_aliases: brazilSourceAliases,
      brazil_stage2_contract: brazilStage2Contract,
      brazil_law_source_preflight: brazilLawSourcePreflight,
      russia_details: russiaDetails,
      complete: true,
      reference_model: "direct_foreign_keys_plus_atlas_v2_polity_id_columns",
      reference_catalog: Object.freeze(references.map((ref) => Object.freeze({ ...ref }))),
      polities: Object.freeze(outputPolities)
    });
  } catch (error) {
    try { await client.query("rollback"); } catch {}
    throw error;
  }
}


const BRAZIL_P2_03E_POLITY_IDS = Object.freeze([
  "efcd0f70-bffe-5464-86e3-b28b3658404b",
  "750bf6be-49e9-4215-95ff-a356ba1831cd",
  "a8b27d54-b180-4d51-a664-dd40b3eed08f"
]);

// P2-03E: exact three-polity evidence in the SAME repeatable-read, read-only
// transaction as the FK census. Never infer timestamps or mutate canonical facts.
async function queryPolityDetails(client, polityIds) {
  const sources = await client.query(`
    select ps.polity_id::text as polity_id,
           ps.source_id::text as source_id, s.source_key, s.source_type,
           s.title, s.canonical_url, s.citation_text
      from atlas_v2.polity_sources ps
      join atlas_v2.sources s on s.id=ps.source_id
     where ps.polity_id=any($1::uuid[])
     order by ps.polity_id::text, ps.source_id::text`, [polityIds]);

  const designations = await client.query(`
    select pd.polity_id::text as polity_id,
           to_jsonb(pd) as designation,
           coalesce((select jsonb_agg(to_jsonb(n) order by n.locale,n.id::text)
              from atlas_v2.polity_designation_names n
             where n.polity_designation_id=pd.id),'[]'::jsonb) as names,
           coalesce((select jsonb_agg(jsonb_build_object(
              'source_id',l.source_id::text,'source_locator_key',l.source_locator_key,
              'source_key',s.source_key,'title',s.title,'canonical_url',s.canonical_url)
              order by l.source_id::text,l.source_locator_key)
              from atlas_v2.polity_designation_sources l
              join atlas_v2.sources s on s.id=l.source_id
             where l.polity_designation_id=pd.id),'[]'::jsonb) as source_links
      from atlas_v2.polity_designations pd
     where pd.polity_id=any($1::uuid[])
     order by pd.polity_id::text,pd.id::text`, [polityIds]);

  const identityRelations = await client.query(`
    select pir.predecessor_polity_id::text as predecessor_polity_id,
           pir.successor_polity_id::text as successor_polity_id,
           to_jsonb(pir) as relation, rt.code as relation_type,
           coalesce((select jsonb_agg(jsonb_build_object(
              'source_id',l.source_id::text,'source_locator_key',l.source_locator_key,
              'source_key',s.source_key,'title',s.title,'canonical_url',s.canonical_url)
              order by l.source_id::text,l.source_locator_key)
              from atlas_v2.polity_identity_relation_sources l
              join atlas_v2.sources s on s.id=l.source_id
             where l.polity_identity_relation_id=pir.id),'[]'::jsonb) as source_links
      from atlas_v2.polity_identity_relations pir
      join atlas_v2.polity_identity_relation_types rt on rt.id=pir.relation_type_id
     where pir.predecessor_polity_id=any($1::uuid[])
        or pir.successor_polity_id=any($1::uuid[])
     order by pir.id::text`, [polityIds]);

  const governance = await client.query(`
    select gp.polity_id::text as polity_id,
           to_jsonb(gp) as period, gc.canonical_key as governance_context_key,
           gc.governance_type,
           coalesce((select jsonb_agg(jsonb_build_object(
             'source_id',l.source_id::text,'source_locator_key',l.source_locator_key,
             'source_key',s.source_key,'title',s.title,'canonical_url',s.canonical_url)
             order by l.source_id::text,l.source_locator_key)
             from atlas_v2.polity_governance_period_sources l
             join atlas_v2.sources s on s.id=l.source_id
            where l.polity_governance_period_id=gp.id),'[]'::jsonb) as source_links
      from atlas_v2.polity_governance_periods gp
      join atlas_v2.governance_contexts gc on gc.id=gp.governance_context_id
     where gp.polity_id=any($1::uuid[])
     order by gp.polity_id::text,gp.id::text`, [polityIds]);

  return Object.freeze({
    polity_ids: polityIds,
    polity_sources: sources.rows,
    designations: designations.rows,
    identity_relations: identityRelations.rows,
    governance_periods: governance.rows
  });
}


const RUSSIA_P2_05B_POLITY_ID = "dd07fc4c-b3ac-59ac-bdf2-9cc190893327";
const RUSSIA_P2_05B_ACTIVITIES = Object.freeze([
  "d6cdaf3b-2eab-4b98-8a17-b9c42342534f",
  "57cdefa5-9a5d-533c-b229-47e398f1d07a",
  "9ec53325-3a97-58a8-a7e7-81a496a47e57"
]);

async function queryBrazilDetails(client) {
  return queryPolityDetails(client, [...BRAZIL_P2_03E_POLITY_IDS]);
}

// Source-linked, exact-UUID Russia inventory for P2-05B. This runs ONLY inside
// the existing OIDC-verified repeatable-read READ ONLY audit transaction.
// It inspects live metadata; it neither infers missing designation rows nor
// assigns day precision to year-only Activities.
async function queryRussiaDetails(client) {
  const polityIds = [RUSSIA_P2_05B_POLITY_ID];
  const [details, activities, activitySources, runtime] = await Promise.all([
    queryPolityDetails(client, polityIds),
    client.query(`
      select a.id::text as activity_id, a.polity_id::text as polity_id,
             to_jsonb(a) as activity
        from atlas_v2.person_politics_v2 a
       where a.polity_id = $1::uuid
       order by a.id::text`, [RUSSIA_P2_05B_POLITY_ID]),
    client.query(`
      select pps.person_politics_id::text as activity_id,
             pps.source_id::text as source_id, pps.source_locator_key,
             s.source_key, s.source_type, s.title, s.canonical_url, s.citation_text
        from atlas_v2.person_politics_sources pps
        join atlas_v2.person_politics_v2 a on a.id=pps.person_politics_id
        join atlas_v2.sources s on s.id=pps.source_id
       where a.polity_id = $1::uuid
       order by pps.person_politics_id::text, pps.source_id::text, pps.source_locator_key`,
      [RUSSIA_P2_05B_POLITY_ID]),
    client.query(`
      select r.polity_id::text as polity_id, to_jsonb(r) as runtime_activity
        from atlas_v2.runtime_person_politics_v1 r
       where r.polity_id = $1::uuid
       order by to_jsonb(r)::text`, [RUSSIA_P2_05B_POLITY_ID])
  ]);
  const activityIds = new Set(activities.rows.map(row => String(row.activity_id).toLowerCase()));
  return Object.freeze({
    ...details,
    activities: activities.rows,
    activity_sources: activitySources.rows,
    runtime_activities: runtime.rows,
    missing_reviewed_activity_ids: RUSSIA_P2_05B_ACTIVITIES.filter(id => !activityIds.has(id)),
    preflight_only: true,
    designation_display_repaired: false
  });
}


const BRAZIL_P2_03G_EXPECTED_ACTIVITIES = Object.freeze({
  "538c90ab-8752-471c-98be-9b388f6c8d9f": {
    "polity_id": "efcd0f70-bffe-5464-86e3-b28b3658404b",
    "activity_start": 1822,
    "activity_end": 1831
  },
  "ae9b7ba9-4c62-508b-b019-2ded901413bc": {
    "polity_id": "efcd0f70-bffe-5464-86e3-b28b3658404b",
    "activity_start": 1840,
    "activity_end": 1889
  },
  "7a021719-8a81-4367-9fd1-64e75f996563": {
    "polity_id": "750bf6be-49e9-4215-95ff-a356ba1831cd",
    "activity_start": 1906,
    "activity_end": 1909
  },
  "e82ebfff-537e-43e0-b1f6-452c1b7cb27c": {
    "polity_id": "a8b27d54-b180-4d51-a664-dd40b3eed08f",
    "activity_start": 1930,
    "activity_end": 1934
  },
  "b1f52253-fcbf-4ba4-a061-37491658bf38": {
    "polity_id": "a8b27d54-b180-4d51-a664-dd40b3eed08f",
    "activity_start": 1934,
    "activity_end": 1945
  },
  "ed7c3548-8dd4-479e-94e4-c6a382264a2d": {
    "polity_id": "a8b27d54-b180-4d51-a664-dd40b3eed08f",
    "activity_start": 1951,
    "activity_end": 1954
  },
  "db3aa305-ff94-460b-a88d-2ed044a4f638": {
    "polity_id": "a8b27d54-b180-4d51-a664-dd40b3eed08f",
    "activity_start": 1961,
    "activity_end": 1964
  },
  "fbd5f4db-fcd1-4782-9b71-56fae2e1e2b7": {
    "polity_id": "a8b27d54-b180-4d51-a664-dd40b3eed08f",
    "activity_start": 1969,
    "activity_end": 1974
  },
  "21feba6a-db22-4ce2-a51e-fdd65f2ca2dd": {
    "polity_id": "a8b27d54-b180-4d51-a664-dd40b3eed08f",
    "activity_start": 1992,
    "activity_end": 1992
  },
  "52a26a9a-110e-413b-b516-960413cc39e4": {
    "polity_id": "a8b27d54-b180-4d51-a664-dd40b3eed08f",
    "activity_start": 1992,
    "activity_end": 1995
  }
});
const BRAZIL_P2_03G_SOURCE_URLS = Object.freeze([
  "https://www2.camara.leg.br/legin/fed/decret/1824-1899/decreto-1-15-novembro-1889-532625-publicacaooriginal-14906-pe.html",
  "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao91.htm",
  "https://www.presidencia.gov.br/ccivil_03/constituicao/constituicao34.htm",
  "https://legis.senado.gov.br/norma/579492/publicacao/15675026",
  "https://www2.camara.leg.br/legin/fed/consti/1960-1969/constituicao-1967-24-janeiro-1967-365194-publicacaooriginal-1-pl.html",
  "https://www2.camara.leg.br/legin/fed/emecon/1960-1969/emendaconstitucional-1-17-outubro-1969-364989-publicacaooriginal-1-pl.html",
  "https://www.planalto.gov.br/ccivil_03/constituicao/constituicaocompilado.htm"
]);

// Read-only, bounded P2-03G preflight. Data are captured in the same
// repeatable-read transaction as existing Production FK/Polity census.
function summarizeBrazilPreflightRows(activities, runtimeRows) {
  const expected = BRAZIL_P2_03G_EXPECTED_ACTIVITIES;
  const actualIds = new Set();
  const matched = [];
  const missing = [];
  const drift = [];
  for (const [activityId, before] of Object.entries(expected)) {
    const found = activities.find(row => String(row.activity_id).toLowerCase() === activityId);
    if (!found) { missing.push(activityId); continue; }
    const observed = found.activity || {};
    if (String(found.polity_id).toLowerCase() !== before.polity_id ||
        Number(observed.activity_start) !== before.activity_start ||
        Number(observed.activity_end) !== before.activity_end) {
      drift.push({ activity_id: activityId, expected: before,
        observed: { polity_id:found.polity_id, activity_start:observed.activity_start, activity_end:observed.activity_end }});
    } else {
      matched.push(activityId);
    }
    actualIds.add(activityId);
  }
  const extra = activities.map(x=>String(x.activity_id).toLowerCase()).filter(id=>!(id in expected));
  const runtimeCounts = Object.fromEntries(BRAZIL_P2_03E_POLITY_IDS.map(id => [
    id, runtimeRows.filter(r=>String(r.polity_id).toLowerCase()===id).length
  ]));
  const authoringCounts = Object.fromEntries(BRAZIL_P2_03E_POLITY_IDS.map(id => [
    id, activities.filter(r=>String(r.polity_id).toLowerCase()===id).length
  ]));
  const runtimeCountParity = BRAZIL_P2_03E_POLITY_IDS.every(id=>runtimeCounts[id]===authoringCounts[id]);
  return Object.freeze({
    expected: Object.keys(expected).length, matched: matched.length,
    missing, drift, extra, authoring_counts:authoringCounts,
    runtime_reference_counts:runtimeCounts, runtime_count_parity:runtimeCountParity,
    authoring_exact_before_match:missing.length===0 && drift.length===0 && extra.length===0
  });
}

async function queryBrazilPreflight(client) {
  const ids=[...BRAZIL_P2_03E_POLITY_IDS];
  const activities=await client.query(`
    select a.id::text as activity_id, a.polity_id::text as polity_id, to_jsonb(a) as activity
      from atlas_v2.person_politics_v2 a
     where a.polity_id=any($1::uuid[]) or a.id=any($2::uuid[])
     order by a.id::text`,[ids,Object.keys(BRAZIL_P2_03G_EXPECTED_ACTIVITIES)]);
  const activitySources=await client.query(`
    select pps.person_politics_id::text as activity_id,
           pps.source_id::text as source_id, pps.source_locator_key,
           s.source_key,s.source_type,s.title,s.canonical_url,s.citation_text
      from atlas_v2.person_politics_sources pps
      join atlas_v2.person_politics_v2 a on a.id=pps.person_politics_id
      join atlas_v2.sources s on s.id=pps.source_id
     where a.polity_id=any($1::uuid[]) or a.id=any($2::uuid[])
     order by pps.person_politics_id::text,pps.source_id::text,pps.source_locator_key`,
    [ids,Object.keys(BRAZIL_P2_03G_EXPECTED_ACTIVITIES)]);
  const runtime=await client.query(`
    select r.polity_id::text as polity_id, to_jsonb(r) as runtime_activity
      from atlas_v2.runtime_person_politics_v1 r
     where r.polity_id=any($1::uuid[])
     order by r.polity_id::text,to_jsonb(r)::text`,[ids]);
  const sourceMatches=await client.query(`
    select s.id::text as id,s.source_key,s.source_type,s.title,
           s.canonical_url,s.citation_text,s.sha256,s.bytes
      from atlas_v2.sources s
     where s.canonical_url=any($1::text[])
     order by s.canonical_url,s.source_key,s.id::text`,[[...BRAZIL_P2_03G_SOURCE_URLS]]);
  const tombstones=await client.query(`
    select to_jsonb(r) as retirement
      from atlas_v2.polity_identity_retirements r
     where r.retired_polity_id=any($1::uuid[])
        or r.survivor_polity_id=any($1::uuid[])
     order by r.retired_polity_id::text`,[ids]);
  const linkColumns=await client.query(`
    select c.table_name,c.column_name,c.data_type
      from information_schema.columns c
     where c.table_schema='atlas_v2'
       and c.column_name=any($1::text[])
     order by c.table_name,c.column_name`,
    [["polity_id","predecessor_polity_id","successor_polity_id",
      "retired_polity_id","survivor_polity_id"]]);
  const summary=summarizeBrazilPreflightRows(activities.rows,runtime.rows);
  return Object.freeze({
    polity_ids:ids,source_candidate_urls:[...BRAZIL_P2_03G_SOURCE_URLS],
    activities:activities.rows,activity_sources:activitySources.rows,
    runtime_activities:runtime.rows,source_matches:sourceMatches.rows,
    retirement_records:tombstones.rows,link_columns:linkColumns.rows,
    summary:Object.freeze({...summary,
      activity_source_links:activitySources.rows.length,
      exact_url_source_matches:sourceMatches.rows.length,
      retired_identity_records:tombstones.rows.length,
      linked_reference_columns:linkColumns.rows.length,
      runtime_row_content_parity_checked:false})
  });
}


const BRAZIL_P2_03H_SOURCE_ALIAS_PATTERN = [
  '5389','5[.]389','h[- ]?733',
  'constitui.{0,60}(1891|1934|1946|1967|1969|1988)',
  'decreto.{0,40}1889','1889.{0,40}decreto',
  'estados unidos do brasil','república federativa do brasil',
  'constituicao91','constituicao34','constituicao67',
  'norma/579492','norma/579493','norma/547253','norma/385329',
  'constituicaocompilado'
].join('|');

// Bounded bibliography candidate search, NOT comprehensive semantic duplicate proof.
// Executes within the existing OIDC verified, repeatable-read, READ ONLY transaction.
async function queryBrazilSourceAliases(client) {
  const pattern=BRAZIL_P2_03H_SOURCE_ALIAS_PATTERN;
  const filter="concat_ws(' ',s.source_key,s.title,s.canonical_url,s.citation_text) ~* $1::text";
  const total=await client.query(`
    select count(*)::int as total from atlas_v2.sources s
    where ${filter}`,[pattern]);
  const matches=await client.query(`
    select s.id::text as source_id,s.source_key,s.source_type,s.title,
           s.canonical_url,s.citation_text,s.sha256,s.bytes
      from atlas_v2.sources s
     where ${filter}
     order by s.source_key,s.id::text
     limit 101`,[pattern]);
  const count=Number(total.rows[0]?.total ?? 0);
  return Object.freeze({
    pattern,total_metadata_matches:count,returned_rows:matches.rows.slice(0,100),
    truncated:count>100,complete:count<=100 && matches.rows.length===count,
    caveat:"Metadata candidate scan only; no claim that absent legal documents cannot be present under generic source keys."
  });
}


async function queryBrazilStage2Contract(client) {
  const constraints=await client.query(`
    select c.conname as constraint_name,c.contype as constraint_type,
           pg_get_constraintdef(c.oid,true) as definition
      from pg_constraint c join pg_class t on t.oid=c.conrelid
      join pg_namespace n on n.oid=t.relnamespace
     where n.nspname='atlas_v2' and t.relname='polity_designations'
     order by c.conname`);
  const boundary=await client.query(`
    select pg_get_functiondef(to_regprocedure(
      'atlas_v2.temporal_boundary_or_unresolved_valid(integer,smallint,smallint,text,text,text)'
    )) as definition`);
  const detail=await client.query(`
    select pg_get_functiondef(to_regprocedure(
      'atlas_v2.temporal_boundary_detail_valid(smallint,smallint,text,text,text)'
    )) as definition`);
  const columns=await client.query(`
    select column_name,data_type,is_nullable from information_schema.columns
     where table_schema='atlas_v2' and table_name='sources'
     order by ordinal_position`);
  const fields=['id','source_key','source_type','title','author_creator','institution',
    'publisher','publication_date','publication_year','canonical_url','external_identifier',
    'citation_text','citation_metadata','artifact_metadata','sha256','bytes'];
  const names=columns.rows.map(x=>x.column_name);
  const type=constraints.rows.find(x=>x.constraint_name==='polity_designations_type_check');
  const temporalFn=boundary.rows[0]?.definition || null;
  const detailFn=detail.rows[0]?.definition || null;
  return Object.freeze({
    complete:Boolean(type && temporalFn && detailFn && fields.every(f=>names.includes(f))),
    designation_constraints:constraints.rows,temporal_boundary_function:temporalFn,
    temporal_detail_function:detailFn,source_columns:columns.rows,
    missing_source_columns:fields.filter(f=>!names.includes(f))
  });
}


const BRAZIL_P2_03K_LAW_SOURCE_KEY = "brazil-law-5389-1968-official";
// Offline UUIDv5 namespace 672fd6c6-f921-5ce9-86dc-c90a8796c53a
// name "p7:source:brazil-law-5389-1968-official". Candidate, NOT registered.
const BRAZIL_P2_03L_LAW_SOURCE_ID_CANDIDATE = "e7ad7bd0-e77c-526b-b7d9-832bcca75dab";
const BRAZIL_P2_03K_OFFICIAL_LAW_URLS = Object.freeze([
  "https://www2.camara.leg.br/legin/fed/lei/1960-1969/lei-5389-22-fevereiro-1968-359075-publicacaooriginal-1-pl.html",
  "https://www2.camara.leg.br/legin/fed/lei/1960-1969/lei-5389-22-fevereiro-1968-359075-norma-pl.html",
  "https://www2.camara.leg.br/legin/fed/lei/1960-1969/lei-5389-22-fevereiro-1968-359075-retificacao-31071-pl.html",
  "https://www.planalto.gov.br/ccivil_03/leis/l5389.htm",
  "https://legis.senado.gov.br/norma/547253",
  "https://legis.senado.gov.br/norma/547253/publicacao/15715169"
]);
const BRAZIL_P2_03K_LAW_METADATA_TERMS = Object.freeze([
  "%5389%","%5.389%","%lei 5 389%","%l5389%","%h-733%"
]);

/**
 * Scoped, metadata-only Source collision preflight: exact URLs + key first,
 * then alternate URLs and JSON bibliographies, then generic catalogue counts.
 * Does not claim semantic exhaustion of external repository_dataset payloads.
 * Executes INSIDE parent REPEATABLE READ READ ONLY OIDC-authenticated transaction.
 */
async function queryBrazilLawSourcePreflight(client) {
  const candidateIdRows=await client.query(`
    select id::text as source_id,source_key,source_type,title,canonical_url
      from atlas_v2.sources where id=$1::uuid limit 1`,
    [BRAZIL_P2_03L_LAW_SOURCE_ID_CANDIDATE]);
  const exact=await client.query(`
    select id::text as source_id,source_key,source_type,title,canonical_url,
           external_identifier,citation_text,institution,publication_date::text
      from atlas_v2.sources
     where source_key=$1::text or canonical_url=any($2::text[])
     order by source_key,id::text
     limit 51`,
    [BRAZIL_P2_03K_LAW_SOURCE_KEY,[...BRAZIL_P2_03K_OFFICIAL_LAW_URLS]]);
  const metadataClause=`lower(concat_ws(' ',source_key,title,canonical_url,
    external_identifier,citation_text,author_creator,institution,publisher,
    citation_metadata::text,artifact_metadata::text)) like any($1::text[])`;
  const [metadataCount,metadataRows,sourceClasses,genericRows]=await Promise.all([
    client.query(`select count(*)::int as total from atlas_v2.sources where ${metadataClause}`,
      [[...BRAZIL_P2_03K_LAW_METADATA_TERMS]]),
    client.query(`select id::text as source_id,source_key,source_type,title,
           canonical_url,external_identifier,citation_text,institution,
           publication_date::text
      from atlas_v2.sources
     where ${metadataClause}
     order by source_key,id::text
     limit 51`,[[...BRAZIL_P2_03K_LAW_METADATA_TERMS]]),
    client.query(`select source_type,count(*)::int as total
      from atlas_v2.sources group by source_type order by total desc,source_type`),
    client.query(`select id::text as source_id,source_key,source_type,title,
           canonical_url,external_identifier
      from atlas_v2.sources
     where lower(source_type) like any($1::text[])
        or lower(source_key) like any($2::text[])
     order by source_key,id::text limit 51`,
      [["%dataset%","%repository%","%legacy%","%import%"],
       ["%dataset%","%repository%","%legacy%","%supplement%"]])
  ]);
  const count=Number(metadataCount.rows[0]?.total ?? 0);
  const metadataTruncated=count>50;
  const exactTruncated=exact.rows.length>50;
  return Object.freeze({
    candidate_source_id:BRAZIL_P2_03L_LAW_SOURCE_ID_CANDIDATE,
    candidate_id_collision_rows:candidateIdRows.rows,
    candidate_id_absent_at_snapshot:candidateIdRows.rows.length===0,
    source_key_candidate:BRAZIL_P2_03K_LAW_SOURCE_KEY,
    official_source_urls:[...BRAZIL_P2_03K_OFFICIAL_LAW_URLS],
    metadata_search_terms:[...BRAZIL_P2_03K_LAW_METADATA_TERMS],
    exact_source_key_or_url_matches:exact.rows.slice(0,50),
    exact_truncated:exactTruncated,
    metadata_match_total:count,
    metadata_candidates:metadataRows.rows.slice(0,50),
    metadata_truncated:metadataTruncated,
    source_type_counts:sourceClasses.rows,
    generic_catalogue_samples:genericRows.rows.slice(0,50),
    generic_catalogue_sample_truncated:genericRows.rows.length>50,
    absence_of_semantically_duplicate_unlabeled_external_payloads_proven:false,
    safe_for_automatic_source_assertion:false,
    catalog_scan_complete:!metadataTruncated && !exactTruncated,
    caveat:"Catalogue metadata, URL and key evidence only. Generic dataset content and alternate unindexed external payloads may contain the same primary law."
  });
}

function statusForError(code) {
  if (code === "DEPLOYMENT_SHA_MISMATCH") return 409;
  if (code === "GITHUB_OIDC_INVALID" || String(code).startsWith("GITHUB_OIDC_")) return 401;
  if (String(code).startsWith("POLITY_REFERENCE_AUDIT_")) return 409;
  if (String(code).startsWith("AUDIT_INVENTORY_DEPLOYMENT_") || code === "AUDIT_INVENTORY_NOT_PRODUCTION") return 403;
  if (code === "SERVER_CONFIGURATION_ERROR") return 503;
  return 500;
}

function createPolityReferenceAuditHandler({ env = process.env, verifyOidc = verifyGitHubActionsOidc, createClient = createPostgresClient } = {}) {
  return async function handler(req, res) {
    if (req.method !== "POST") return json(res, 405, { ok: false, marker: MARKER, code: "METHOD_NOT_ALLOWED" });
    let client = null;
    try {
      const token = bearerToken(req);
      if (!token) throw new Error("GITHUB_OIDC_INVALID");
      const deployment = requireDeployment(req, env);
      await verifyOidc(token, { expectedSha: deployment.actualSha });
      const connectionString = String(env.SUPABASE_DB_URL || "").trim();
      if (!connectionString) throw new Error("SERVER_CONFIGURATION_ERROR");
      client = await createClient(connectionString, { env });
      const includeBrazilDetails = req.body?.include_brazil_details === true;
      const includeBrazilPreflight = req.body?.include_brazil_preflight === true;
      const includeBrazilSourceAliases = req.body?.include_brazil_source_aliases === true;
      const includeBrazilStage2Contract = req.body?.include_brazil_stage2_contract === true;
      const includeBrazilLawSourcePreflight = req.body?.include_brazil_law_source_preflight === true;
      const includeRussiaDetails = req.body?.include_russia_details === true;
      const audit = await queryPolityReferenceAudit(client, { includeBrazilDetails, includeBrazilPreflight, includeBrazilSourceAliases, includeBrazilStage2Contract, includeBrazilLawSourcePreflight, includeRussiaDetails });
      return json(res, 200, {
        ok: true,
        marker: MARKER,
        read_only: true,
        committed: false,
        deployment_sha: deployment.actualSha,
        complete: audit.complete,
        reference_model: audit.reference_model,
        reference_count: audit.reference_catalog.length,
        polity_count: audit.polities.length,
        external_orphan_count: audit.polities.filter((row) => row.is_external_orphan).length,
        reference_catalog: audit.reference_catalog,
        polities: audit.polities,
        ...(includeBrazilDetails ? { brazil_details: audit.brazil_details } : {}),
        ...(includeBrazilPreflight ? { brazil_preflight: audit.brazil_preflight } : {}),
        ...(includeBrazilSourceAliases ? { brazil_source_aliases: audit.brazil_source_aliases } : {}),
        ...(includeBrazilStage2Contract ? { brazil_stage2_contract: audit.brazil_stage2_contract } : {}),
        ...(includeBrazilLawSourcePreflight ? { brazil_law_source_preflight: audit.brazil_law_source_preflight } : {}),
        ...(includeRussiaDetails ? { russia_details: audit.russia_details } : {})
      });
    } catch (error) {
      return json(res, statusForError(error?.message), {
        ok: false,
        marker: MARKER,
        complete: false,
        code: error?.message || "POLITY_REFERENCE_AUDIT_FAILED"
      });
    } finally {
      if (client) { try { await client.end(); } catch {} }
    }
  };
}

module.exports = Object.freeze({
  MARKER,
  OWNED_REFERENCE_KEYS,
  quoteIdentifier,
  referenceKey,
  classifyReference,
  discoverPolityReferences,
  queryReferenceCounts,
  queryPolityReferenceAudit,
  queryBrazilDetails,
  queryRussiaDetails,
  RUSSIA_P2_05B_POLITY_ID,
  RUSSIA_P2_05B_ACTIVITIES,
  queryBrazilPreflight,
  queryBrazilSourceAliases,
  queryBrazilStage2Contract,
  queryBrazilLawSourcePreflight,
  BRAZIL_P2_03K_OFFICIAL_LAW_URLS,
  BRAZIL_P2_03K_LAW_SOURCE_KEY,
  BRAZIL_P2_03L_LAW_SOURCE_ID_CANDIDATE,
  BRAZIL_P2_03K_LAW_METADATA_TERMS,
  BRAZIL_P2_03H_SOURCE_ALIAS_PATTERN,
  summarizeBrazilPreflightRows,
  BRAZIL_P2_03E_POLITY_IDS,
  BRAZIL_P2_03G_EXPECTED_ACTIVITIES,
  BRAZIL_P2_03G_SOURCE_URLS,
  createPolityReferenceAuditHandler,
  statusForError
});
