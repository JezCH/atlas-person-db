"use strict";

const fs=require("node:fs");
const path=require("node:path");

const MIGRATION_PATHS=Object.freeze([
  path.resolve(__dirname,"../db/migrations/20261009_youtube_durable_source_catalog.sql"),
  path.resolve(__dirname,"../db/migrations/20261011_youtube_durable_source_complete_catalog.sql")
]);
const SHA256_RE=/^[0-9a-f]{64}$/;
const KINDS=new Set(["manifest","channel_videos","metadata"]);
const MAX_RECORDS=10000;

function requireText(value,code,max=2048){
  const text=String(value ?? "").trim();
  if(!text || text.length>max) throw new Error(code);
  return text;
}
function requireInt(value,code,{min=0,max=Number.MAX_SAFE_INTEGER}={}){
  const n=Number(value);
  if(!Number.isSafeInteger(n) || n<min || n>max) throw new Error(code);
  return n;
}
function normalizeRecord(row){
  if(!row || typeof row!=="object" || Array.isArray(row)) throw new Error("YOUTUBE_SOURCE_ARCHIVE_RECORD_INVALID");
  const objectKey=requireText(row.object_key,"YOUTUBE_SOURCE_ARCHIVE_OBJECT_KEY_REQUIRED",4096);
  const digest=requireText(row.sha256,"YOUTUBE_SOURCE_ARCHIVE_SHA256_REQUIRED",64).toLowerCase();
  if(!SHA256_RE.test(digest)) throw new Error("YOUTUBE_SOURCE_ARCHIVE_SHA256_INVALID");
  const sourceKind=requireText(row.source_kind,"YOUTUBE_SOURCE_ARCHIVE_KIND_REQUIRED",32);
  if(!KINDS.has(sourceKind)) throw new Error("YOUTUBE_SOURCE_ARCHIVE_KIND_INVALID");
  const channelId=row.channel_id==null ? null : requireText(row.channel_id,"YOUTUBE_SOURCE_ARCHIVE_CHANNEL_ID_INVALID",256);
  if((sourceKind==="channel_videos" && channelId===null) ||
     (sourceKind!=="channel_videos" && channelId!==null)){
    throw new Error("YOUTUBE_SOURCE_ARCHIVE_KIND_CHANNEL_MISMATCH");
  }
  return Object.freeze({
    object_key:objectKey,
    sha256:digest,
    byte_count:requireInt(row.byte_count,"YOUTUBE_SOURCE_ARCHIVE_BYTE_COUNT_INVALID",{min:1}),
    source_artifact_id:row.source_artifact_id==null ? null : requireInt(row.source_artifact_id,"YOUTUBE_SOURCE_ARCHIVE_ARTIFACT_ID_INVALID",{min:1}),
    batch_label:requireText(row.batch_label,"YOUTUBE_SOURCE_ARCHIVE_BATCH_LABEL_REQUIRED",128),
    source_kind:sourceKind,
    channel_id:channelId,
    video_rows:row.video_rows==null ? null : requireInt(row.video_rows,"YOUTUBE_SOURCE_ARCHIVE_VIDEO_ROWS_INVALID",{min:0,max:1000000000})
  });
}
function normalizeRecords(value){
  if(!Array.isArray(value) || value.length===0 || value.length>MAX_RECORDS) throw new Error("YOUTUBE_SOURCE_ARCHIVE_RECORDS_INVALID");
  const rows=value.map(normalizeRecord);
  const keys=new Set();
  for(const row of rows){
    if(keys.has(row.object_key)) throw new Error("YOUTUBE_SOURCE_ARCHIVE_DUPLICATE_OBJECT_KEY");
    keys.add(row.object_key);
  }
  return Object.freeze(rows);
}
function equivalent(actual,expected){
  return String(actual.object_key)===expected.object_key &&
    String(actual.sha256).toLowerCase()===expected.sha256 &&
    Number(actual.byte_count)===expected.byte_count &&
    (actual.source_artifact_id==null ? null : Number(actual.source_artifact_id))===expected.source_artifact_id &&
    String(actual.batch_label)===expected.batch_label &&
    String(actual.source_kind)===expected.source_kind &&
    (actual.channel_id==null ? null : String(actual.channel_id))===expected.channel_id &&
    (actual.video_rows==null ? null : Number(actual.video_rows))===expected.video_rows;
}

const SELECT_SQL=`
select object_key,sha256,byte_count,source_artifact_id,batch_label,source_kind,channel_id,video_rows
from atlas_v2.youtube_source_archives
where object_key=any($1::text[])
`;
const READ_ARTIFACT_SQL=`
select object_key,sha256,byte_count,source_artifact_id,batch_label,source_kind,channel_id,video_rows
from atlas_v2.youtube_source_archives
where source_artifact_id=$1
order by object_key
`;
const INSERT_SQL=`
insert into atlas_v2.youtube_source_archives(
  object_key,sha256,byte_count,source_artifact_id,batch_label,source_kind,channel_id,video_rows
)
select x.object_key,x.sha256,x.byte_count,x.source_artifact_id,x.batch_label,x.source_kind,x.channel_id,x.video_rows
from jsonb_to_recordset($1::jsonb) as x(
  object_key text,sha256 text,byte_count bigint,source_artifact_id bigint,batch_label text,
  source_kind text,channel_id text,video_rows integer
)
on conflict(object_key) do nothing
`;

async function applyYoutubeSourceArchiveMigrations(client,{readFile=fs.readFileSync}={}){
  if(!client || typeof client.query!=="function") throw new Error("PostgreSQL client is required");
  for(const migrationPath of MIGRATION_PATHS){
    await client.query(readFile(migrationPath,"utf8"));
  }
  return Object.freeze({applied:MIGRATION_PATHS.map(p=>path.basename(p))});
}

async function publishYoutubeSourceArchiveCatalog(client,input){
  if(!client || typeof client.query!=="function") throw new Error("PostgreSQL client is required");
  const records=normalizeRecords(input?.records);
  const keys=records.map(r=>r.object_key);
  await client.query("BEGIN");
  try{
    await client.query("select pg_advisory_xact_lock(hashtext('atlas-youtube:source-archive-catalog:v1'))");
    const before=(await client.query(SELECT_SQL,[keys])).rows || [];
    const beforeByKey=new Map(before.map(row=>[String(row.object_key),row]));
    for(const expected of records){
      const actual=beforeByKey.get(expected.object_key);
      if(actual && !equivalent(actual,expected)) throw new Error("YOUTUBE_SOURCE_ARCHIVE_EXISTING_MISMATCH");
    }
    const missing=records.filter(row=>!beforeByKey.has(row.object_key));
    if(missing.length){
      await client.query(INSERT_SQL,[JSON.stringify(missing)]);
    }
    const after=(await client.query(SELECT_SQL,[keys])).rows || [];
    if(after.length!==records.length) throw new Error("YOUTUBE_SOURCE_ARCHIVE_READBACK_COUNT_MISMATCH");
    const afterByKey=new Map(after.map(row=>[String(row.object_key),row]));
    for(const expected of records){
      const actual=afterByKey.get(expected.object_key);
      if(!actual || !equivalent(actual,expected)) throw new Error("YOUTUBE_SOURCE_ARCHIVE_READBACK_MISMATCH");
    }
    await client.query("COMMIT");
    return Object.freeze({
      committed:missing.length>0,
      idempotent:missing.length===0,
      verified_count:records.length,
      inserted_count:missing.length,
      existing_count:records.length-missing.length
    });
  }catch(error){
    try{await client.query("ROLLBACK");}catch{}
    throw error;
  }
}

async function readYoutubeSourceArchiveCatalog(client,artifactId){
  if(!client || typeof client.query!=="function") throw new Error("PostgreSQL client is required");
  const id=requireInt(artifactId,"YOUTUBE_SOURCE_ARCHIVE_ARTIFACT_ID_INVALID",{min:1});
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try{
    const rows=(await client.query(READ_ARTIFACT_SQL,[id])).rows || [];
    if(rows.length===0) throw new Error("YOUTUBE_SOURCE_ARCHIVE_CATALOG_EMPTY");
    const records=normalizeRecords(rows);
    await client.query("COMMIT");
    return Object.freeze({artifact_id:id,record_count:records.length,records});
  }catch(error){
    try{await client.query("ROLLBACK");}catch{}
    throw error;
  }
}

module.exports=Object.freeze({
  normalizeRecord,
  normalizeRecords,
  equivalent,
  applyYoutubeSourceArchiveMigrations,
  publishYoutubeSourceArchiveCatalog,
  readYoutubeSourceArchiveCatalog,
  MIGRATION_PATHS,
  SELECT_SQL,
  READ_ARTIFACT_SQL,
  INSERT_SQL,
  MAX_RECORDS
});
