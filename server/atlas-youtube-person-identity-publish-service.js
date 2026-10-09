"use strict";

// Never writes, updates or deletes legacy youtube_person_signals.
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const {GLOBAL_SNAPSHOT_SQL}=require("./atlas-youtube-person-signal-read-service.js");
const {IDENTITY_POLICY}=require("./atlas-youtube-person-identity-read-service.js");

const PUBLICATION_SCHEMA="atlas-youtube-person-identity-publication/v1";
const MIGRATION=path.resolve(__dirname,"../db/migrations/20261010_youtube_person_identity_read_model.sql");
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA=/^sha256:[0-9a-f]{64}$/;
const FINGERPRINT=/^[0-9a-f]{64}$/;
function positiveInt(value,max=1e9){
  const n=Number(value);
  if(!Number.isSafeInteger(n)||n<1||n>max)throw Error("YOUTUBE_IDENTITY_INVALID_COUNT");
  return n;
}
function required(value,max=200){
  const s=String(value??"").trim();
  if(!s||s.length>max)throw Error("YOUTUBE_IDENTITY_REQUIRED_VALUE");
  return s;
}
function hashPayload(p){
  const {identity_snapshot_id,source,summary,persons}=p;
  return crypto.createHash("sha256").update(
    JSON.stringify({identity_snapshot_id,source,summary,persons})
  ).digest("hex");
}
function normalizePublication(input){
  if(!input||input.schema!==PUBLICATION_SCHEMA)throw Error("YOUTUBE_IDENTITY_SCHEMA_INVALID");
  const source=input.source,summary=input.summary;
  if(!source||!summary||!Array.isArray(input.persons))throw Error("YOUTUBE_IDENTITY_BODY_INVALID");
  const id=required(input.identity_snapshot_id);
  if(!/^yt-person-[a-zA-Z0-9._:-]+$/.test(id))throw Error("YOUTUBE_IDENTITY_SNAPSHOT_ID_INVALID");
  const sourceId=required(source.production_snapshot_id);
  if(!/^yt-[a-zA-Z0-9._:-]+$/.test(sourceId))throw Error("YOUTUBE_IDENTITY_SOURCE_ID_INVALID");
  const artifactId=positiveInt(input.artifact_id);
  const artifactDigest=required(input.artifact_digest,80);
  if(!SHA.test(artifactDigest))throw Error("YOUTUBE_IDENTITY_ARTIFACT_DIGEST_INVALID");
  const runId=positiveInt(input.source_run_id);
  const channels=positiveInt(source.successful_channel_count);
  const videos=positiveInt(source.source_video_rows);
  const selected=positiveInt(source.selected_channel_count);
  if(selected<channels)throw Error("YOUTUBE_IDENTITY_SELECTED_REGRESSION");
  const count=positiveInt(summary.person_identities_with_evidence,20000);
  const matched=positiveInt(summary.matched_video_rows);
  if(input.persons.length!==count)throw Error("YOUTUBE_IDENTITY_ROW_COUNT_MISMATCH");
  if(summary.mention_only_title_rows > matched)throw Error("YOUTUBE_IDENTITY_EVIDENCE_INVALID");
  const ids=new Set(),ranks=new Set();
  for(const [idx,row] of input.persons.entries()){
    const personId=required(row.person_id,50);
    if(!UUID.test(personId)||ids.has(personId))throw Error("YOUTUBE_IDENTITY_PERSON_DUPLICATE_OR_INVALID");
    ids.add(personId);
    const rank=positiveInt(row.rank,20000);
    if(rank!==idx+1||ranks.has(rank))throw Error("YOUTUBE_IDENTITY_RANK_INVALID");
    ranks.add(rank);
    const ch=positiveInt(row.distinct_channel_count),vi=positiveInt(row.distinct_video_count);
    if(ch>channels||vi>videos)throw Error("YOUTUBE_IDENTITY_COUNT_EXCEEDS_SOURCE");
    required(row.display_name_basis,300);
    if(!Array.isArray(row.matched_variants)||!row.matched_variants.length)
      throw Error("YOUTUBE_IDENTITY_VARIANTS_REQUIRED");
    if(!row.evidence_rows_by_type||typeof row.evidence_rows_by_type!=="object"||
        Array.isArray(row.evidence_rows_by_type))throw Error("YOUTUBE_IDENTITY_EVIDENCE_TYPE_INVALID");
    for(const variant of row.matched_variants){
      required(variant.raw_name_key,300);
      if(positiveInt(variant.channels)>ch||positiveInt(variant.videos)>vi)
        throw Error("YOUTUBE_IDENTITY_VARIANT_EXCEEDS_UNION");
    }
  }
  const computed=hashPayload(input);
  if(!FINGERPRINT.test(String(input.publication_fingerprint||""))||
      input.publication_fingerprint!==computed)throw Error("YOUTUBE_IDENTITY_FINGERPRINT_MISMATCH");
  return Object.freeze({
    identity_snapshot_id:id,source_snapshot_id:sourceId,artifact_id:artifactId,
    artifact_digest:artifactDigest,source_run_id:runId,
    successful_channels:channels,source_videos:videos,source_selected:selected,
    person_count:count,matched_video_rows:matched,
    fingerprint:computed,persons:input.persons
  });
}
async function applyIdentityMigration(client,{readFile=fs.readFileSync}={}){
  if(!client||typeof client.query!=="function")throw Error("YOUTUBE_IDENTITY_DB_REQUIRED");
  await client.query(readFile(MIGRATION,"utf8"));
  return {applied:path.basename(MIGRATION)};
}
const EXISTS_SQL=[
  "select identity_snapshot_id,publication_fingerprint",
  "from atlas_v2.youtube_person_identity_snapshots where identity_snapshot_id=$1"
].join(" ");
const INSERT_META_SQL=[
  "insert into atlas_v2.youtube_person_identity_snapshots(",
  "identity_snapshot_id,source_snapshot_id,artifact_id,artifact_digest,source_run_id,",
  "extraction_policy,matched_video_rows,person_count,publication_fingerprint",
  ") values ($1,$2,$3,$4,$5,$6,$7,$8,$9)"
].join(" ");
const INSERT_ROWS_SQL=[
  "insert into atlas_v2.youtube_person_identity_signals(",
  "identity_snapshot_id,person_id,display_name_basis,rank,distinct_channel_count,",
  "distinct_video_count,matched_variants,evidence_rows_by_type)",
  "select $1,x.person_id::uuid,x.display_name_basis,x.rank,x.distinct_channel_count,",
  "x.distinct_video_count,x.matched_variants,x.evidence_rows_by_type",
  "from jsonb_to_recordset($2::jsonb) as x(",
  "person_id text,display_name_basis text,rank int,distinct_channel_count int,",
  "distinct_video_count int,matched_variants jsonb,evidence_rows_by_type jsonb)"
].join(" ");
async function publishIdentity(client,input){
  const p=normalizePublication(input);
  await client.query("BEGIN");
  try{
    await client.query("select pg_advisory_xact_lock(hashtext('atlas-youtube:person-identity-publish:v1'))");
    const current=(await client.query(GLOBAL_SNAPSHOT_SQL)).rows?.[0];
    if(!current||String(current.snapshot_id)!==p.source_snapshot_id||
      Number(current.channel_count)!==p.successful_channels||
      Number(current.video_count)!==p.source_videos)
      throw Error("YOUTUBE_IDENTITY_ACTIVE_RAW_SNAPSHOT_MISMATCH");
    const exists=(await client.query(EXISTS_SQL,[p.identity_snapshot_id])).rows||[];
    if(exists.length){
      if(String(exists[0].publication_fingerprint)===p.fingerprint){
        await client.query("ROLLBACK");
        return {committed:false,idempotent:true,identity_snapshot_id:p.identity_snapshot_id,
          source_snapshot_id:p.source_snapshot_id,person_count:p.person_count};
      }
      throw Error("YOUTUBE_IDENTITY_SNAPSHOT_CONFLICT");
    }
    await client.query(INSERT_META_SQL,[
      p.identity_snapshot_id,p.source_snapshot_id,p.artifact_id,p.artifact_digest,
      p.source_run_id,IDENTITY_POLICY,p.matched_video_rows,p.person_count,p.fingerprint
    ]);
    const inserted=await client.query(INSERT_ROWS_SQL,[p.identity_snapshot_id,JSON.stringify(p.persons)]);
    if(inserted.rowCount!==p.person_count)throw Error("YOUTUBE_IDENTITY_INSERT_COUNT_MISMATCH");
    await client.query("COMMIT");
    return {committed:true,idempotent:false,identity_snapshot_id:p.identity_snapshot_id,
      source_snapshot_id:p.source_snapshot_id,person_count:p.person_count,
      matched_video_rows:p.matched_video_rows};
  }catch(error){
    await client.query("ROLLBACK");
    throw error;
  }
}
module.exports=Object.freeze({
  PUBLICATION_SCHEMA,IDENTITY_POLICY,MIGRATION,hashPayload,normalizePublication,
  applyIdentityMigration,publishIdentity,EXISTS_SQL,INSERT_META_SQL,INSERT_ROWS_SQL
});
