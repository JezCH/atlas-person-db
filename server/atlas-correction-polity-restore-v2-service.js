"use strict";

const {
  manifestHash,
  correctionLedgerExists,
  readLedger
} = require("./atlas-correction-ledger-service.js");
const {
  MANIFEST_V2,
  MARKER_V2
} = require("./atlas-correction-manifest-v2-service.js");

const OPERATION_TYPE = "restore_retired_polity";
const SNAPSHOT_SCHEMA = "atlas-correction-polity-restore/v1";
const MAX_OPERATIONS = 20;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireNonEmpty(value, code) {
  const text = String(value == null ? "" : value).trim();
  if (!text) throw new Error(code);
  return text;
}

function requireUuid(value, code) {
  const id = requireNonEmpty(value, code).toLowerCase();
  if (!UUID_RE.test(id)) throw new Error(code);
  return id;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function exactEqual(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function requireRetirement(raw, index) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`CORRECTION_POLITY_RESTORE_OP${index}_RETIREMENT_REQUIRED`);
  }
  return Object.freeze({
    retired_polity_id: requireUuid(raw.retired_polity_id, `CORRECTION_POLITY_RESTORE_OP${index}_POLITY_ID_INVALID`),
    survivor_polity_id: raw.survivor_polity_id == null
      ? null
      : requireUuid(raw.survivor_polity_id, `CORRECTION_POLITY_RESTORE_OP${index}_SURVIVOR_ID_INVALID`),
    canonical_key: requireNonEmpty(raw.canonical_key, `CORRECTION_POLITY_RESTORE_OP${index}_CANONICAL_KEY_REQUIRED`),
    polity_type: requireNonEmpty(raw.polity_type, `CORRECTION_POLITY_RESTORE_OP${index}_POLITY_TYPE_REQUIRED`),
    historicity: requireNonEmpty(raw.historicity, `CORRECTION_POLITY_RESTORE_OP${index}_HISTORICITY_REQUIRED`),
    review_reason: requireNonEmpty(raw.review_reason, `CORRECTION_POLITY_RESTORE_OP${index}_REVIEW_REASON_REQUIRED`),
    source_request_id: requireNonEmpty(raw.source_request_id, `CORRECTION_POLITY_RESTORE_OP${index}_SOURCE_REQUEST_ID_REQUIRED`),
    source_case_id: requireNonEmpty(raw.source_case_id, `CORRECTION_POLITY_RESTORE_OP${index}_SOURCE_CASE_ID_REQUIRED`)
  });
}

function requireRestoreNames(raw, index, polityId) {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(`CORRECTION_POLITY_RESTORE_OP${index}_NAMES_REQUIRED`);
  }
  const names = raw.map((row, nameIndex) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error(`CORRECTION_POLITY_RESTORE_OP${index}_NAME${nameIndex + 1}_OBJECT_REQUIRED`);
    }
    const parent = requireUuid(row.polity_id, `CORRECTION_POLITY_RESTORE_OP${index}_NAME${nameIndex + 1}_POLITY_ID_INVALID`);
    if (parent !== polityId) throw new Error(`CORRECTION_POLITY_RESTORE_OP${index}_NAME${nameIndex + 1}_POLITY_ID_MISMATCH`);
    if (row.is_preferred !== true) throw new Error(`CORRECTION_POLITY_RESTORE_OP${index}_NAME${nameIndex + 1}_MUST_BE_PREFERRED`);
    return Object.freeze({
      id: requireUuid(row.id, `CORRECTION_POLITY_RESTORE_OP${index}_NAME${nameIndex + 1}_ID_INVALID`),
      polity_id: parent,
      locale: requireNonEmpty(row.locale, `CORRECTION_POLITY_RESTORE_OP${index}_NAME${nameIndex + 1}_LOCALE_REQUIRED`),
      name: requireNonEmpty(row.name, `CORRECTION_POLITY_RESTORE_OP${index}_NAME${nameIndex + 1}_NAME_REQUIRED`),
      name_type: requireNonEmpty(row.name_type, `CORRECTION_POLITY_RESTORE_OP${index}_NAME${nameIndex + 1}_TYPE_REQUIRED`),
      is_preferred: true
    });
  }).sort((a,b)=>`${a.locale}\u0000${a.name}`.localeCompare(`${b.locale}\u0000${b.name}`));
  if (new Set(names.map((row)=>row.id)).size !== names.length) throw new Error("CORRECTION_POLITY_RESTORE_NAME_ID_REUSED");
  if (new Set(names.map((row)=>`${row.locale}\u0000${row.name}`)).size !== names.length) throw new Error("CORRECTION_POLITY_RESTORE_NAME_REUSED");
  return Object.freeze(names);
}

function requireOperation(raw, index) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("CORRECTION_POLITY_RESTORE_OPERATION_OBJECT_REQUIRED");
  if (String(raw.type || "").trim() !== OPERATION_TYPE) throw new Error("CORRECTION_POLITY_RESTORE_OPERATION_UNSUPPORTED");
  const caseId = requireNonEmpty(raw.case_id, "CORRECTION_POLITY_RESTORE_CASE_ID_REQUIRED");
  const retirement = requireRetirement(raw.expected_retirement, index);
  if (retirement.survivor_polity_id !== null) {
    throw new Error(`CORRECTION_POLITY_RESTORE_OP${index}_SURVIVOR_REDIRECT_REVIEW_REQUIRED`);
  }
  const names = requireRestoreNames(raw.restore_preferred_names, index, retirement.retired_polity_id);
  const locales = names.map((row)=>row.locale);
  if (new Set(locales).size !== locales.length) throw new Error("CORRECTION_POLITY_RESTORE_PREFERRED_LOCALE_REUSED");
  if (!Array.isArray(raw.restore_source_ids) || raw.restore_source_ids.length === 0) {
    throw new Error(`CORRECTION_POLITY_RESTORE_OP${index}_SOURCE_IDS_REQUIRED`);
  }
  const sourceIds = raw.restore_source_ids.map((value,sourceIndex)=>
    requireUuid(value,`CORRECTION_POLITY_RESTORE_OP${index}_SOURCE${sourceIndex + 1}_ID_INVALID`)
  ).sort();
  if (new Set(sourceIds).size !== sourceIds.length) throw new Error("CORRECTION_POLITY_RESTORE_SOURCE_ID_REUSED");
  return Object.freeze({
    type: OPERATION_TYPE,
    case_id: caseId,
    expected_retirement: retirement,
    restore_preferred_names: names,
    restore_source_ids: Object.freeze(sourceIds)
  });
}

function requireManifest(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("CORRECTION_MANIFEST_OBJECT_REQUIRED");
  if (String(raw.schema || "").trim() !== MANIFEST_V2) throw new Error("UNSUPPORTED_CORRECTION_MANIFEST_SCHEMA");
  if (String(raw.review_status || "").trim().toLowerCase() !== "approved") throw new Error("CORRECTION_MANIFEST_NOT_APPROVED");
  const requestId = requireNonEmpty(raw.request_id, "CORRECTION_REQUEST_ID_REQUIRED");
  if (!Array.isArray(raw.operations) || raw.operations.length === 0 || raw.operations.length > MAX_OPERATIONS) {
    throw new Error("CORRECTION_POLITY_RESTORE_OPERATIONS_INVALID");
  }
  const operations = raw.operations.map((operation,index)=>requireOperation(operation,index+1));
  const ids = operations.map((operation)=>operation.expected_retirement.retired_polity_id);
  if (new Set(ids).size !== ids.length) throw new Error("CORRECTION_POLITY_RESTORE_POLITY_REUSED");
  return Object.freeze({ schema: MANIFEST_V2, requestId, operations });
}

async function loadRetirement(client, id, { forUpdate=false } = {}) {
  const result = await client.query(
    `select retired_polity_id::text,survivor_polity_id::text,canonical_key,polity_type,historicity,
            review_reason,source_request_id,source_case_id
       from atlas_v2.polity_identity_retirements
      where retired_polity_id=$1::uuid${forUpdate ? " for update" : ""}`,
    [id]
  );
  const row=result.rows?.[0];
  if (!row) return null;
  return Object.freeze({
    retired_polity_id:String(row.retired_polity_id).toLowerCase(),
    survivor_polity_id:row.survivor_polity_id == null ? null : String(row.survivor_polity_id).toLowerCase(),
    canonical_key:String(row.canonical_key),
    polity_type:String(row.polity_type),
    historicity:String(row.historicity),
    review_reason:String(row.review_reason),
    source_request_id:String(row.source_request_id),
    source_case_id:String(row.source_case_id)
  });
}

async function loadRetirementNames(client,id) {
  const result=await client.query(
    `select locale,name,is_preferred
       from atlas_v2.polity_identity_retirement_names
      where retired_polity_id=$1::uuid
      order by locale,name`,
    [id]
  );
  return Object.freeze((result.rows||[]).map((row)=>Object.freeze({
    locale:String(row.locale),
    name:String(row.name),
    is_preferred:Boolean(row.is_preferred)
  })));
}

async function loadPolity(client,id,{forUpdate=false}={}) {
  const result=await client.query(
    `select id::text,canonical_key,polity_type,historicity
       from atlas_v2.polities
      where id=$1::uuid${forUpdate ? " for update" : ""}`,
    [id]
  );
  const row=result.rows?.[0];
  if(!row) return null;
  return Object.freeze({
    id:String(row.id).toLowerCase(),
    canonical_key:String(row.canonical_key),
    polity_type:String(row.polity_type),
    historicity:String(row.historicity)
  });
}

async function loadPreferredNames(client,id) {
  const result=await client.query(
    `select id::text,polity_id::text,locale,name,name_type,is_preferred
       from atlas_v2.polity_names
      where polity_id=$1::uuid and is_preferred=true
      order by locale,name`,
    [id]
  );
  return Object.freeze((result.rows||[]).map((row)=>Object.freeze({
    id:String(row.id).toLowerCase(),
    polity_id:String(row.polity_id).toLowerCase(),
    locale:String(row.locale),
    name:String(row.name),
    name_type:String(row.name_type),
    is_preferred:Boolean(row.is_preferred)
  })));
}

async function loadPolitySourceIds(client,id) {
  const result=await client.query(
    `select source_id::text
       from atlas_v2.polity_sources
      where polity_id=$1::uuid
      order by source_id::text`,
    [id]
  );
  return Object.freeze((result.rows||[]).map((row)=>String(row.source_id).toLowerCase()));
}

async function assertAvailable(client, operation) {
  const retired=operation.expected_retirement;
  if (await loadPolity(client,retired.retired_polity_id,{forUpdate:true})) {
    throw new Error(`CORRECTION_POLITY_RESTORE_TARGET_ALREADY_LIVE:${retired.retired_polity_id}`);
  }
  const keyCollision=await client.query(
    `select id::text from atlas_v2.polities where canonical_key=$1 order by id::text for update`,
    [retired.canonical_key]
  );
  if (keyCollision.rowCount !== 0) throw new Error(`CORRECTION_POLITY_RESTORE_CANONICAL_KEY_COLLISION:${retired.canonical_key}`);
  for (const name of operation.restore_preferred_names) {
    const collision=await client.query(
      `select id::text,polity_id::text from atlas_v2.polity_names
        where locale=$1 and name=$2 order by polity_id,id for update`,
      [name.locale,name.name]
    );
    if (collision.rowCount !== 0) throw new Error(`CORRECTION_POLITY_RESTORE_NAME_COLLISION:${name.locale}:${name.name}`);
  }
}

async function assertPreflight(client,operation) {
  const retirement=await loadRetirement(client,operation.expected_retirement.retired_polity_id,{forUpdate:true});
  if (!retirement || !exactEqual(retirement,operation.expected_retirement)) {
    throw new Error(`CORRECTION_POLITY_RESTORE_RETIREMENT_DRIFT:${operation.expected_retirement.retired_polity_id}`);
  }
  const retiredNames=await loadRetirementNames(client,retirement.retired_polity_id);
  for (const expected of operation.restore_preferred_names) {
    if (!retiredNames.some((row)=>row.locale===expected.locale && row.name===expected.name && row.is_preferred===true)) {
      throw new Error(`CORRECTION_POLITY_RESTORE_RETIRED_NAME_DRIFT:${retirement.retired_polity_id}:${expected.locale}`);
    }
  }
  for (const sourceId of operation.restore_source_ids) {
    const source=await client.query(`select id::text from atlas_v2.sources where id=$1::uuid`,[sourceId]);
    if (source.rowCount !== 1) throw new Error(`CORRECTION_POLITY_RESTORE_SOURCE_NOT_FOUND:${sourceId}`);
  }
  await assertAvailable(client,operation);
  return Object.freeze({ retirement, retired_names:retiredNames });
}

async function applyOperation(client,operation) {
  const r=operation.expected_retirement;
  await client.query(
    `insert into atlas_v2.polities(id,canonical_key,polity_type,historicity)
     values($1::uuid,$2,$3,$4)`,
    [r.retired_polity_id,r.canonical_key,r.polity_type,r.historicity]
  );
  for (const name of operation.restore_preferred_names) {
    await client.query(
      `insert into atlas_v2.polity_names(id,polity_id,locale,name,name_type,is_preferred)
       values($1::uuid,$2::uuid,$3,$4,$5,true)`,
      [name.id,name.polity_id,name.locale,name.name,name.name_type]
    );
  }
  for (const sourceId of operation.restore_source_ids) {
    await client.query(
      `insert into atlas_v2.polity_sources(polity_id,source_id) values($1::uuid,$2::uuid)`,
      [r.retired_polity_id,sourceId]
    );
  }
  const deleted=await client.query(
    `delete from atlas_v2.polity_identity_retirements
      where retired_polity_id=$1::uuid
      returning retired_polity_id::text`,
    [r.retired_polity_id]
  );
  if (deleted.rowCount !== 1) throw new Error("CORRECTION_POLITY_RESTORE_RETIREMENT_DELETE_COUNT_DRIFT");
}

async function verifyRestored(client,operation) {
  const r=operation.expected_retirement;
  const polity=await loadPolity(client,r.retired_polity_id,{forUpdate:true});
  const expectedPolity={
    id:r.retired_polity_id,
    canonical_key:r.canonical_key,
    polity_type:r.polity_type,
    historicity:r.historicity
  };
  if (!polity || !exactEqual(polity,expectedPolity)) throw new Error(`CORRECTION_POLITY_RESTORE_POLITY_DRIFT:${r.retired_polity_id}`);
  if (await loadRetirement(client,r.retired_polity_id,{forUpdate:true})) {
    throw new Error(`CORRECTION_POLITY_RESTORE_TOMBSTONE_REAPPEARED:${r.retired_polity_id}`);
  }
  const names=await loadPreferredNames(client,r.retired_polity_id);
  if (!exactEqual(names,operation.restore_preferred_names)) {
    throw new Error(`CORRECTION_POLITY_RESTORE_NAMES_DRIFT:${r.retired_polity_id}`);
  }
  const sourceIds=await loadPolitySourceIds(client,r.retired_polity_id);
  if (!exactEqual(sourceIds,operation.restore_source_ids)) {
    throw new Error(`CORRECTION_POLITY_RESTORE_SOURCES_DRIFT:${r.retired_polity_id}`);
  }
  return Object.freeze({ polity, preferred_names:names, source_ids:sourceIds });
}

function createCorrectionPolityRestoreV2Service({client}={}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");

  async function execute(rawManifest,{dryRun=false}={}) {
    const manifest=requireManifest(rawManifest);
    const hash=manifestHash(rawManifest);
    await client.query("begin isolation level serializable");
    try {
      await client.query("select pg_advisory_xact_lock(hashtext($1))",[`atlas-correction-manifest:${manifest.requestId}`]);
      const ledger=await readLedger(client,manifest.requestId);
      if (ledger) {
        if (ledger.manifest_hash !== hash) throw new Error("CORRECTION_REQUEST_ID_COLLISION");
        if (ledger.manifest_schema !== MANIFEST_V2) throw new Error("CORRECTION_LEDGER_SCHEMA_MISMATCH");
        const snapshot=ledger.result_snapshot;
        if (!snapshot || snapshot.schema !== SNAPSHOT_SCHEMA || !Array.isArray(snapshot.operations) || snapshot.operations.length !== manifest.operations.length) {
          throw new Error("CORRECTION_POLITY_RESTORE_LEDGER_RESULT_DRIFT");
        }
        for (const operation of manifest.operations) await verifyRestored(client,operation);
        if (dryRun) await client.query("rollback"); else await client.query("commit");
        return Object.freeze({marker:MARKER_V2,request_id:manifest.requestId,dry_run:Boolean(dryRun),committed:!dryRun,replay:true,result:snapshot});
      }

      const prepared=[];
      for (const operation of manifest.operations) prepared.push(await assertPreflight(client,operation));
      const outcomes=[];
      for (let i=0;i<manifest.operations.length;i+=1) {
        const operation=manifest.operations[i];
        await applyOperation(client,operation);
        const verified=await verifyRestored(client,operation);
        outcomes.push(Object.freeze({
          type:operation.type,
          case_id:operation.case_id,
          restored_polity:verified.polity,
          preferred_names:verified.preferred_names,
          source_ids:verified.source_ids,
          prior_retirement:prepared[i].retirement,
          prior_retirement_names:prepared[i].retired_names
        }));
      }
      const snapshot=Object.freeze({
        version:1,
        schema:SNAPSHOT_SCHEMA,
        marker:MARKER_V2,
        operation_type:OPERATION_TYPE,
        operations:Object.freeze(outcomes)
      });
      if (dryRun) {
        await client.query("rollback");
        return Object.freeze({marker:MARKER_V2,request_id:manifest.requestId,dry_run:true,committed:false,replay:false,result:snapshot});
      }
      if (!await correctionLedgerExists(client)) throw new Error("CORRECTION_LEDGER_SCHEMA_REQUIRED");
      await client.query(
        `insert into atlas_v2.correction_manifest_runs(request_id,manifest_hash,manifest_schema,result_snapshot)
         values($1,$2,$3,$4::jsonb)`,
        [manifest.requestId,hash,MANIFEST_V2,JSON.stringify(snapshot)]
      );
      await client.query("commit");
      return Object.freeze({marker:MARKER_V2,request_id:manifest.requestId,dry_run:false,committed:true,replay:false,result:snapshot});
    } catch(error) {
      try { await client.query("rollback"); } catch {}
      throw error;
    }
  }
  return Object.freeze({execute});
}

module.exports=Object.freeze({
  OPERATION_TYPE,
  SNAPSHOT_SCHEMA,
  MAX_OPERATIONS,
  requireManifest,
  requireOperation,
  loadRetirement,
  loadRetirementNames,
  loadPolity,
  loadPreferredNames,
  loadPolitySourceIds,
  assertPreflight,
  applyOperation,
  verifyRestored,
  createCorrectionPolityRestoreV2Service
});
