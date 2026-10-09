"use strict";

const {
  normalizeTimelineDisposition,
  currentTimelineDisposition,
  sameTimelineDisposition,
  setTimelineDisposition
} = require("./atlas-person-timeline-service.js");
const {
  manifestHash,
  correctionLedgerExists,
  readLedger
} = require("./atlas-correction-ledger-service.js");

const MANIFEST_V2 = "atlas-correction-manifest/v2";
const MARKER_V2 = "ATLAS_CORRECTION_MANIFEST_V2";
const OPERATION_TYPE = "set_person_timeline_disposition";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function required(value, code) {
  const result=String(value == null ? "" : value).trim();
  if (!result) throw new Error(code);
  return result;
}

function validUuid(value, code) {
  const id=required(value,code).toLowerCase();
  if (!UUID_RE.test(id)) throw new Error(code);
  return id;
}

function parseOperation(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("PERSON_TIMELINE_CORRECTION_OPERATION_REQUIRED");
  if (value.type !== OPERATION_TYPE) throw new Error("PERSON_TIMELINE_CORRECTION_OPERATION_UNSUPPORTED");
  const personId=validUuid(value.person_id,"PERSON_TIMELINE_CORRECTION_PERSON_ID_INVALID");
  const expected=normalizeTimelineDisposition(value.expected_current_disposition);
  if (expected.disposition !== "chronology_unresolved") throw new Error("PERSON_TIMELINE_CORRECTION_EXPECTED_NON_TIMELINE_REQUIRED");
  if (value.replacement_disposition !== "timeline") throw new Error("PERSON_TIMELINE_CORRECTION_REPLACEMENT_INVALID");
  if (!Array.isArray(value.required_activities) || value.required_activities.length !== 3) {
    throw new Error("PERSON_TIMELINE_CORRECTION_THREE_ACTIVITIES_REQUIRED");
  }
  const activities=value.required_activities.map((v)=>{
    if (!Number.isInteger(v?.year) || v.year===0) throw new Error("PERSON_TIMELINE_CORRECTION_ACTIVITY_YEAR_INVALID");
    return Object.freeze({year:v.year,polity_id:validUuid(v.polity_id,"PERSON_TIMELINE_CORRECTION_POLITY_ID_INVALID")});
  });
  if (new Set(activities.map(x=>x.year+"|"+x.polity_id)).size!==3) {
    throw new Error("PERSON_TIMELINE_CORRECTION_ACTIVITY_DUPLICATE");
  }
  return Object.freeze({
    type:OPERATION_TYPE,
    case_id:required(value.case_id,"PERSON_TIMELINE_CORRECTION_CASE_ID_REQUIRED"),
    person_id:personId,
    expected_current_disposition:expected,
    replacement_disposition:"timeline",
    required_activities:Object.freeze(activities)
  });
}

function parseManifest(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("CORRECTION_MANIFEST_OBJECT_REQUIRED");
  if (raw.schema!==MANIFEST_V2 || raw.review_status!=="approved" || raw.production_executable!==true) {
    throw new Error("PERSON_TIMELINE_CORRECTION_MANIFEST_UNAPPROVED");
  }
  if (!Array.isArray(raw.operations) || raw.operations.length!==1) {
    throw new Error("PERSON_TIMELINE_CORRECTION_EXACTLY_ONE_OPERATION");
  }
  return Object.freeze({request_id:required(raw.request_id,"PERSON_TIMELINE_CORRECTION_REQUEST_ID_REQUIRED"),operation:parseOperation(raw.operations[0])});
}

async function verifyThreeActivities(client,operation) {
  const r=await client.query(
    "select id::text,activity_start,activity_end,polity_id::text,chronology_status from atlas_v2.person_politics_v2 where person_id=$1::uuid order by activity_start,id",
    [operation.person_id]
  );
  const rows=r.rows||[];
  if (rows.length!==3) throw new Error("PERSON_TIMELINE_CORRECTION_ACTIVITY_CARDINALITY_DRIFT");
  for (const spec of operation.required_activities) {
    const matching=rows.filter(x=>Number(x.activity_start)===spec.year &&
      Number(x.activity_end)===spec.year && String(x.polity_id).toLowerCase()===spec.polity_id &&
      x.chronology_status==="reviewed");
    if (matching.length!==1) throw new Error("PERSON_TIMELINE_CORRECTION_ACTIVITY_MISMATCH:"+spec.year);
  }
  return Object.freeze(rows.map(x=>Object.freeze({
    id:String(x.id).toLowerCase(),
    year:Number(x.activity_start),
    polity_id:String(x.polity_id).toLowerCase()
  })));
}

async function lockPerson(client,id) {
  const r=await client.query("select id::text,representative_domain from atlas_v2.persons where id=$1::uuid for update",[id]);
  if (r.rows.length!==1) throw new Error("PERSON_TIMELINE_CORRECTION_PERSON_NOT_FOUND");
  if (r.rows[0].representative_domain!=="religion") throw new Error("PERSON_TIMELINE_CORRECTION_DOMAIN_DRIFT");
}

async function assertLive(client,operation,expected) {
  const live=await currentTimelineDisposition(client,operation.person_id,{forUpdate:true});
  if (!live || !sameTimelineDisposition(live,{person_id:operation.person_id,...expected})) {
    throw new Error("PERSON_TIMELINE_CORRECTION_EXACT_BEFORE_DRIFT");
  }
  return live;
}

function createCorrectionPersonTimelineV2Service({client}={}) {
  if (!client || typeof client.query!=="function") throw new Error("PostgreSQL client is required");
  async function execute(rawManifest,{dryRun=false}={}) {
    const manifest=parseManifest(rawManifest);
    const hash=manifestHash(rawManifest);
    const operation=manifest.operation;
    await client.query("begin isolation level serializable");
    try {
      await client.query("select pg_advisory_xact_lock(hashtext($1))",["atlas-correction-manifest:"+manifest.request_id]);
      const ledger=await readLedger(client,manifest.request_id);
      await lockPerson(client,operation.person_id);
      const activities=await verifyThreeActivities(client,operation);
      if (ledger) {
        if (ledger.manifest_hash!==hash || ledger.manifest_schema!==MANIFEST_V2) {
          throw new Error("PERSON_TIMELINE_CORRECTION_LEDGER_DRIFT");
        }
        await assertLive(client,operation,normalizeTimelineDisposition({disposition:"timeline"}));
        await client.query(dryRun?"rollback":"commit");
        return Object.freeze({
          marker:MARKER_V2,request_id:manifest.request_id,dry_run:Boolean(dryRun),
          committed:!dryRun,replay:true,result:ledger.result_snapshot
        });
      }

      const before=await assertLive(client,operation,operation.expected_current_disposition);
      const changed=await setTimelineDisposition(client,operation.person_id,{
        disposition:"timeline",expected_current_disposition:operation.expected_current_disposition
      });
      if (changed.replay) throw new Error("PERSON_TIMELINE_CORRECTION_UNEXPECTED_REPLAY");
      const after=await assertLive(client,operation,normalizeTimelineDisposition({disposition:"timeline"}));
      const unchanged=await verifyThreeActivities(client,operation);
      if (JSON.stringify(unchanged)!==JSON.stringify(activities)) {
        throw new Error("PERSON_TIMELINE_CORRECTION_ACTIVITY_CHANGED");
      }
      await client.query(
        "insert into atlas_v2.person_profile_mutation_audits(request_id,person_id,operation,before_snapshot,after_snapshot) values($1,$2::uuid,'set_person_timeline_disposition',$3::jsonb,$4::jsonb)",
        [manifest.request_id+":"+operation.case_id,operation.person_id,
          JSON.stringify({timeline_disposition:before}),
          JSON.stringify({timeline_disposition:after})]
      );
      const snapshot=Object.freeze({
        version:1,schema:MANIFEST_V2,marker:MARKER_V2,
        correction_family:"person_timeline_disposition",
        case_id:operation.case_id,person_id:operation.person_id,
        disposition_before:before.disposition,disposition_after:after.disposition,
        verified_activity_ids:activities.map(x=>x.id),
        invariant:"Person identity, representative domain, NamuWiki state and all three source-backed Activity rows unchanged."
      });
      if (dryRun) {
        await client.query("rollback");
        return Object.freeze({
          marker:MARKER_V2,request_id:manifest.request_id,dry_run:true,
          committed:false,replay:false,result:snapshot
        });
      }
      if (!await correctionLedgerExists(client)) throw new Error("CORRECTION_LEDGER_SCHEMA_REQUIRED");
      await client.query(
        "insert into atlas_v2.correction_manifest_runs(request_id,manifest_hash,manifest_schema,result_snapshot) values($1,$2,$3,$4::jsonb)",
        [manifest.request_id,hash,MANIFEST_V2,JSON.stringify(snapshot)]
      );
      await client.query("commit");
      return Object.freeze({
        marker:MARKER_V2,request_id:manifest.request_id,dry_run:false,
        committed:true,replay:false,result:snapshot
      });
    } catch(error) {
      try { await client.query("rollback"); } catch {}
      throw error;
    }
  }
  return Object.freeze({execute});
}

module.exports=Object.freeze({
  OPERATION_TYPE,parseOperation,parseManifest,verifyThreeActivities,
  createCorrectionPersonTimelineV2Service
});
