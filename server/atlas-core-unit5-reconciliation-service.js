"use strict";

const crypto=require("node:crypto");
const { normalizeTimelineDisposition }=require("./atlas-person-timeline-service.js");

const MANIFEST_SCHEMA="atlas-core-unit5-non-timeline-reconciliation/v1";
const MARKER="ATLAS_CORE_UNIT5_NON_TIMELINE_RECONCILIATION_V1";

function requireManifest(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("UNIT5_RECONCILIATION_MANIFEST_REQUIRED");
  if (raw.schema !== MANIFEST_SCHEMA) throw new Error("UNIT5_RECONCILIATION_SCHEMA_UNSUPPORTED");
  if (String(raw.review_status || "").toLowerCase() !== "approved") throw new Error("UNIT5_RECONCILIATION_NOT_APPROVED");
  if (raw.authority !== "historical_migration_evidence_only") throw new Error("UNIT5_RECONCILIATION_AUTHORITY_INVALID");
  if (raw.source_path !== "non-timeline-persons.json") throw new Error("UNIT5_RECONCILIATION_SOURCE_INVALID");
  if (!Array.isArray(raw.items) || raw.items.length !== Number(raw.expected_source_count) || raw.items.length !== 124) {
    throw new Error("UNIT5_RECONCILIATION_ITEM_COUNT_INVALID");
  }

  const seenEn=new Set();
  const seenKo=new Set();
  const items=raw.items.map((item,index)=>{
    const canonicalName=String(item?.canonical_name_en || "").normalize("NFC").trim();
    const displayName=String(item?.display_name_ko || "").normalize("NFC").trim();
    const personType=String(item?.person_type || "").trim();
    const historicity=String(item?.historicity || "").trim();
    if (!canonicalName || !displayName || !personType || !historicity) throw new Error(`UNIT5_RECONCILIATION_ITEM_${index + 1}_IDENTITY_INVALID`);
    if (seenEn.has(canonicalName)) throw new Error("UNIT5_RECONCILIATION_EN_NAME_DUPLICATE");
    if (seenKo.has(displayName)) throw new Error("UNIT5_RECONCILIATION_KO_NAME_DUPLICATE");
    seenEn.add(canonicalName);
    seenKo.add(displayName);
    const timeline=normalizeTimelineDisposition(item.timeline_disposition);
    if (timeline.disposition === "timeline") throw new Error("UNIT5_RECONCILIATION_SOURCE_ITEM_MUST_BE_EXCLUDED");
    const evidence=timeline.review_evidence;
    if (evidence?.provenance !== "legacy_non_timeline_registry_migration"
        || evidence?.authority_scope !== "timeline_disposition_review_evidence_only") {
      throw new Error("UNIT5_RECONCILIATION_EVIDENCE_SCOPE_INVALID");
    }
    const legacy=evidence?.legacy_record;
    if (!legacy || legacy.person_name !== canonicalName || legacy.display_name_ko !== displayName || legacy.historicity !== historicity) {
      throw new Error("UNIT5_RECONCILIATION_LEGACY_EVIDENCE_DRIFT");
    }
    if (legacy.timeline_status !== "excluded" || legacy.activity_start != null || legacy.activity_end != null) {
      throw new Error("UNIT5_RECONCILIATION_FAKE_ACTIVITY_FORBIDDEN");
    }
    return Object.freeze({
      canonical_name_en:canonicalName,
      display_name_ko:displayName,
      canonical_key:canonicalName,
      person_type:personType,
      historicity,
      timeline_disposition:timeline
    });
  });
  return Object.freeze({
    schema:MANIFEST_SCHEMA,
    expected_existing_canonical_count:Number(raw.expected_existing_canonical_count),
    expected_missing_canonical_count:Number(raw.expected_missing_canonical_count),
    items:Object.freeze(items)
  });
}

async function loadState(client) {
  const persons=await client.query(`
    select
      p.id::text,
      p.canonical_key,
      p.person_type,
      p.historicity,
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'locale',pn.locale,
            'name',pn.name,
            'name_type',pn.name_type,
            'is_preferred',pn.is_preferred
          )
          order by pn.is_preferred desc,pn.locale,pn.name,pn.id
        )
        from atlas_v2.person_names pn
        where pn.person_id=p.id
      ),'[]'::jsonb) as names,
      (select count(*)::int from atlas_v2.person_politics_v2 pp where pp.person_id=p.id) as activity_count,
      ptd.disposition,
      ptd.reason,
      ptd.basis_code,
      ptd.traditional_year,
      ptd.traditional_year_alternative,
      ptd.review_evidence
    from atlas_v2.persons p
    left join atlas_v2.person_timeline_dispositions ptd on ptd.person_id=p.id
    order by p.id
  `);
  const activityTotal=await client.query("select count(*)::int as count from atlas_v2.person_politics_v2");
  return Object.freeze({
    persons:Object.freeze((persons.rows || []).map((row)=>Object.freeze({
      id:String(row.id).toLowerCase(),
      canonical_key:String(row.canonical_key),
      person_type:String(row.person_type),
      historicity:String(row.historicity),
      names:Array.isArray(row.names) ? row.names : [],
      activity_count:Number(row.activity_count || 0),
      timeline:row.disposition == null ? null : Object.freeze({
        person_id:String(row.id).toLowerCase(),
        disposition:String(row.disposition),
        reason:row.reason == null ? null : String(row.reason),
        basis_code:row.basis_code == null ? null : String(row.basis_code),
        traditional_year:row.traditional_year == null ? null : Number(row.traditional_year),
        traditional_year_alternative:row.traditional_year_alternative == null ? null : Number(row.traditional_year_alternative),
        review_evidence:row.review_evidence && typeof row.review_evidence === "object" && !Array.isArray(row.review_evidence)
          ? row.review_evidence : {}
      })
    }))),
    activity_total:Number(activityTotal.rows?.[0]?.count || 0)
  });
}

function preferredName(person,locale) {
  return person.names.find((row)=>row?.locale===locale && row?.is_preferred===true)?.name || null;
}

function sameJson(left,right) {
  return JSON.stringify(left)===JSON.stringify(right);
}

function expectedTimelineRow(personId,timeline) {
  return {
    person_id:String(personId).toLowerCase(),
    disposition:timeline.disposition,
    reason:timeline.reason,
    basis_code:timeline.basis_code,
    traditional_year:timeline.traditional_year,
    traditional_year_alternative:timeline.traditional_year_alternative,
    review_evidence:timeline.review_evidence
  };
}

function planReconciliation(state,manifest) {
  const byPreferredEn=new Map();
  const byCanonicalKey=new Map();
  const byAnyName=new Map();
  for (const person of state.persons) {
    const en=preferredName(person,"en");
    if (en) {
      const list=byPreferredEn.get(en) || [];
      list.push(person);
      byPreferredEn.set(en,list);
    }
    const keyList=byCanonicalKey.get(person.canonical_key) || [];
    keyList.push(person);
    byCanonicalKey.set(person.canonical_key,keyList);
    for (const name of person.names) {
      const list=byAnyName.get(String(name.name)) || [];
      list.push(person);
      byAnyName.set(String(name.name),list);
    }
  }

  const sourceNames=new Set(manifest.items.map((item)=>item.canonical_name_en));
  const reused=[];
  const create=[];
  for (const item of manifest.items) {
    const exact=byPreferredEn.get(item.canonical_name_en) || [];
    if (exact.length > 1) throw new Error(`UNIT5_RECONCILIATION_EN_IDENTITY_AMBIGUOUS:${item.canonical_name_en}`);
    const person=exact[0] || null;
    const keyOwners=byCanonicalKey.get(item.canonical_key) || [];
    if (keyOwners.some((owner)=>!person || owner.id !== person.id)) throw new Error(`UNIT5_RECONCILIATION_CANONICAL_KEY_COLLISION:${item.canonical_name_en}`);

    const enOwners=byAnyName.get(item.canonical_name_en) || [];
    if (enOwners.some((owner)=>!person || owner.id !== person.id)) throw new Error(`UNIT5_RECONCILIATION_EN_NAME_COLLISION:${item.canonical_name_en}`);
    const koOwners=byAnyName.get(item.display_name_ko) || [];
    if (koOwners.some((owner)=>!person || owner.id !== person.id)) throw new Error(`UNIT5_RECONCILIATION_KO_NAME_COLLISION:${item.display_name_ko}`);

    if (!person) {
      create.push(Object.freeze({ id:crypto.randomUUID(), item }));
      continue;
    }
    if (person.person_type !== item.person_type || person.historicity !== item.historicity
        || preferredName(person,"ko") !== item.display_name_ko) {
      throw new Error(`UNIT5_RECONCILIATION_EXISTING_IDENTITY_DRIFT:${item.canonical_name_en}`);
    }
    if (person.activity_count !== 0) throw new Error(`UNIT5_RECONCILIATION_SOURCE_ACTIVITY_PRESENT:${item.canonical_name_en}`);
    if (person.timeline && !sameJson(person.timeline,expectedTimelineRow(person.id,item.timeline_disposition))) {
      throw new Error(`UNIT5_RECONCILIATION_EXISTING_TIMELINE_DRIFT:${item.canonical_name_en}`);
    }
    reused.push(Object.freeze({ id:person.id, item }));
  }

  if (reused.length !== manifest.expected_existing_canonical_count) {
    throw new Error(`UNIT5_RECONCILIATION_EXISTING_COUNT_DRIFT:${reused.length}`);
  }
  if (create.length !== manifest.expected_missing_canonical_count && create.length !== 0) {
    throw new Error(`UNIT5_RECONCILIATION_MISSING_COUNT_DRIFT:${create.length}`);
  }

  for (const person of state.persons) {
    const en=preferredName(person,"en");
    if (sourceNames.has(en)) continue;
    if (person.activity_count < 1) throw new Error(`UNIT5_RECONCILIATION_UNREVIEWED_ZERO_ACTIVITY_PERSON:${person.id}`);
    if (person.timeline && person.timeline.disposition !== "timeline") {
      throw new Error(`UNIT5_RECONCILIATION_NON_SOURCE_EXCLUSION_PRESENT:${person.id}`);
    }
  }

  return Object.freeze({ reused:Object.freeze(reused), create:Object.freeze(create) });
}

async function insertPersons(client,create) {
  if (!create.length) return;
  const params=[];
  const personValues=[];
  create.forEach(({id,item},index)=>{
    const base=index*4;
    personValues.push(`($${base+1}::uuid,$${base+2},$${base+3},$${base+4})`);
    params.push(id,item.canonical_key,item.person_type,item.historicity);
  });
  await client.query(
    `insert into atlas_v2.persons(id,canonical_key,person_type,historicity)
     values ${personValues.join(",")}`,
    params
  );

  const nameParams=[];
  const nameValues=[];
  create.forEach(({id,item})=>{
    const base=nameParams.length;
    nameValues.push(`(gen_random_uuid(),$${base+1}::uuid,'en',$${base+2},'canonical',true)`);
    nameParams.push(id,item.canonical_name_en);
    const baseKo=nameParams.length;
    nameValues.push(`(gen_random_uuid(),$${baseKo+1}::uuid,'ko',$${baseKo+2},'display',true)`);
    nameParams.push(id,item.display_name_ko);
  });
  await client.query(
    `insert into atlas_v2.person_names(id,person_id,locale,name,name_type,is_preferred)
     values ${nameValues.join(",")}`,
    nameParams
  );
}

async function writeExclusions(client,entries) {
  if (!entries.length) return;
  const params=[];
  const values=[];
  entries.forEach(({id,item},index)=>{
    const t=item.timeline_disposition;
    const base=index*7;
    values.push(`($${base+1}::uuid,$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7}::jsonb,now())`);
    params.push(id,t.disposition,t.reason,t.basis_code,t.traditional_year,t.traditional_year_alternative,JSON.stringify(t.review_evidence));
  });
  await client.query(`
    insert into atlas_v2.person_timeline_dispositions(
      person_id,disposition,reason,basis_code,traditional_year,
      traditional_year_alternative,review_evidence,updated_at
    ) values ${values.join(",")}
    on conflict (person_id) do update
      set disposition=excluded.disposition,
          reason=excluded.reason,
          basis_code=excluded.basis_code,
          traditional_year=excluded.traditional_year,
          traditional_year_alternative=excluded.traditional_year_alternative,
          review_evidence=excluded.review_evidence,
          updated_at=now()
  `,params);
}

async function writeTimelineIncluded(client) {
  await client.query(`
    insert into atlas_v2.person_timeline_dispositions(
      person_id,disposition,reason,basis_code,traditional_year,
      traditional_year_alternative,review_evidence,updated_at
    )
    select p.id,'timeline',null,null,null,null,'{}'::jsonb,now()
      from atlas_v2.persons p
     where exists (
       select 1 from atlas_v2.person_politics_v2 pp where pp.person_id=p.id
     )
    on conflict (person_id) do nothing
  `);
}

async function verifyFinalState(client,manifest,beforeActivityTotal,beforePersonCount) {
  const state=await loadState(client);
  if (state.activity_total !== beforeActivityTotal) throw new Error("UNIT5_RECONCILIATION_ACTIVITY_COUNT_CHANGED");
  const expectedAdded=manifest.expected_missing_canonical_count;
  if (state.persons.length !== beforePersonCount + expectedAdded) {
    const replayExpected=beforePersonCount;
    if (state.persons.length !== replayExpected) throw new Error("UNIT5_RECONCILIATION_PERSON_COUNT_DRIFT");
  }
  const sourceNames=new Set(manifest.items.map((item)=>item.canonical_name_en));
  let exclusions=0;
  let timeline=0;
  for (const person of state.persons) {
    if (!person.timeline) throw new Error(`UNIT5_RECONCILIATION_TIMELINE_MISSING:${person.id}`);
    const en=preferredName(person,"en");
    if (sourceNames.has(en)) {
      const item=manifest.items.find((candidate)=>candidate.canonical_name_en===en);
      if (person.activity_count !== 0) throw new Error(`UNIT5_RECONCILIATION_SOURCE_ACTIVITY_PRESENT:${en}`);
      if (!sameJson(person.timeline,expectedTimelineRow(person.id,item.timeline_disposition))) {
        throw new Error(`UNIT5_RECONCILIATION_SOURCE_TIMELINE_DRIFT:${en}`);
      }
      exclusions += 1;
    } else {
      if (person.timeline.disposition !== "timeline") throw new Error(`UNIT5_RECONCILIATION_NON_SOURCE_NOT_TIMELINE:${person.id}`);
      if (person.activity_count < 1) throw new Error(`UNIT5_RECONCILIATION_NON_SOURCE_ZERO_ACTIVITY:${person.id}`);
      timeline += 1;
    }
  }
  if (exclusions !== manifest.items.length) throw new Error("UNIT5_RECONCILIATION_EXCLUSION_COUNT_DRIFT");
  return Object.freeze({
    person_count:state.persons.length,
    timeline_count:timeline,
    exclusion_count:exclusions,
    activity_count:state.activity_total
  });
}

function createUnit5ReconciliationService({client}={}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");

  async function execute(rawManifest,{dryRun=false}={}) {
    const manifest=requireManifest(rawManifest);
    await client.query("begin isolation level serializable");
    try {
      await client.query("select pg_advisory_xact_lock(hashtext($1))",["atlas-core-unit5:non-timeline-reconciliation"]);
      const before=await loadState(client);
      const plan=planReconciliation(before,manifest);
      const replay=plan.create.length===0
        && plan.reused.length===manifest.items.length
        && before.persons.every((person)=>person.timeline != null);

      if (!replay) {
        await insertPersons(client,plan.create);
        await writeExclusions(client,[...plan.reused,...plan.create]);
        await writeTimelineIncluded(client);
      }
      const counts=await verifyFinalState(
        client,
        manifest,
        before.activity_total,
        before.persons.length
      );

      if (dryRun) await client.query("rollback"); else await client.query("commit");
      return Object.freeze({
        marker:MARKER,
        schema:MANIFEST_SCHEMA,
        dry_run:Boolean(dryRun),
        committed:!dryRun,
        replay,
        reused_persons:plan.reused.length,
        created_persons:plan.create.length,
        counts
      });
    } catch(error) {
      try { await client.query("rollback"); } catch {}
      throw error;
    }
  }
  return Object.freeze({execute});
}

module.exports=Object.freeze({
  MANIFEST_SCHEMA,
  MARKER,
  requireManifest,
  loadState,
  planReconciliation,
  createUnit5ReconciliationService
});
