"use strict";

const fs = require("node:fs");
const path = require("node:path");

const PUBLICATION_SCHEMA = "atlas-youtube-person-signal-publication/v2";
const SNAPSHOT_ID_RE = /^yt-[A-Za-z0-9._:-]+$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const CHANNEL_STATUS = new Set(["OK","ERR","EMPTY"]);

const YOUTUBE_SIGNAL_MIGRATION_PATHS = Object.freeze([
  path.resolve(__dirname,"../db/migrations/20261007_youtube_person_signal_read_model.sql"),
  path.resolve(__dirname,"../db/migrations/20261008_youtube_discovery_channel_registry.sql"),
  // Keep the non-destructive schema compatibility migration. Never replay the
  // legacy retirement migration: it deletes historical snapshots and ledgers.
  path.resolve(__dirname,"../db/migrations/20261008_youtube_history_reconciliation.sql")
]);

function requireString(value, code, max = 512) {
  const text = String(value ?? "").trim();
  if (!text || text.length > max) throw new Error(code);
  return text;
}

function requireInteger(value, code, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new Error(code);
  return n;
}

function normalizeObject(value, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(code);
  return { ...value };
}

function normalizeThresholdCounts(value) {
  const input = normalizeObject(value,"YOUTUBE_PUBLICATION_THRESHOLD_COUNTS_REQUIRED");
  const output = {};
  for (const threshold of [3,5,10,15,20]) {
    const raw = input[String(threshold)] ?? input[`>=${threshold}`];
    output[String(threshold)] = requireInteger(raw,`YOUTUBE_PUBLICATION_THRESHOLD_${threshold}_INVALID`,{ min:0,max:10000000 });
  }
  return output;
}

function normalizeChannel(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error("YOUTUBE_PUBLICATION_CHANNEL_INVALID");
  const scanStatus = requireString(row.scan_status,"YOUTUBE_PUBLICATION_CHANNEL_STATUS_REQUIRED",16).toUpperCase();
  if (!CHANNEL_STATUS.has(scanStatus)) throw new Error("YOUTUBE_PUBLICATION_CHANNEL_STATUS_INVALID");
  return Object.freeze({
    channel_id:requireString(row.channel_id,"YOUTUBE_PUBLICATION_CHANNEL_ID_REQUIRED",128),
    channel_name:String(row.channel_name ?? "").trim().slice(0,500),
    batch_id:requireString(row.batch_id,"YOUTUBE_PUBLICATION_BATCH_ID_REQUIRED",64),
    scan_status:scanStatus,
    video_count:requireInteger(row.video_count,"YOUTUBE_PUBLICATION_CHANNEL_VIDEO_COUNT_INVALID",{ min:0,max:100000000 })
  });
}

function normalizeSignal(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error("YOUTUBE_PUBLICATION_SIGNAL_INVALID");
  return Object.freeze({
    raw_name:requireString(row.raw_name,"YOUTUBE_PUBLICATION_RAW_NAME_REQUIRED",300),
    rank:requireInteger(row.rank,"YOUTUBE_PUBLICATION_RANK_INVALID",{ min:1,max:10000000 }),
    distinct_channel_count:requireInteger(row.distinct_channel_count,"YOUTUBE_PUBLICATION_SIGNAL_CHANNEL_COUNT_INVALID",{ min:1,max:10000000 }),
    video_count:requireInteger(row.video_count,"YOUTUBE_PUBLICATION_SIGNAL_VIDEO_COUNT_INVALID",{ min:1,max:100000000 })
  });
}

function normalizePublicationPayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("YOUTUBE_PUBLICATION_BODY_REQUIRED");
  if (body.schema !== PUBLICATION_SCHEMA) throw new Error("YOUTUBE_PUBLICATION_SCHEMA_INVALID");
  const fingerprint = requireString(body.publication_fingerprint,"YOUTUBE_PUBLICATION_FINGERPRINT_REQUIRED",64).toLowerCase();
  if (!SHA256_RE.test(fingerprint)) throw new Error("YOUTUBE_PUBLICATION_FINGERPRINT_INVALID");

  const snapshotInput = normalizeObject(body.snapshot,"YOUTUBE_PUBLICATION_SNAPSHOT_REQUIRED");
  const snapshotId = requireString(snapshotInput.snapshot_id,"YOUTUBE_PUBLICATION_SNAPSHOT_ID_REQUIRED",200);
  if (!SNAPSHOT_ID_RE.test(snapshotId)) throw new Error("YOUTUBE_PUBLICATION_SNAPSHOT_ID_INVALID");
  const generatedAt = requireString(snapshotInput.generated_at,"YOUTUBE_PUBLICATION_GENERATED_AT_REQUIRED",100);
  if (Number.isNaN(Date.parse(generatedAt))) throw new Error("YOUTUBE_PUBLICATION_GENERATED_AT_INVALID");

  const sourceState = normalizeObject(snapshotInput.source_state,"YOUTUBE_PUBLICATION_SOURCE_STATE_REQUIRED");
  if (snapshotInput.parser_version === "yt-title-person-reviewed-v5") {
    if (sourceState.additional_title_context_extraction !== true ||
        sourceState.source_name_generation_independent_of_registered_persons !== true ||
        sourceState.title_context_evidence_scope !== "original_channel_video_ids" ||
        sourceState.title_context_personhood !== "source_title_review_candidate_not_verified_person" ||
        !Number.isSafeInteger(sourceState.quality_counters?.accepted_context_cue_video_name_ids) ||
        sourceState.quality_counters.accepted_context_cue_video_name_ids <= 0) {
      throw new Error("YOUTUBE_PUBLICATION_V5_SOURCE_EVIDENCE_GUARDS_REQUIRED");
    }
  }
  const channels = Array.isArray(body.channels) ? body.channels.map(normalizeChannel) : null;
  const signals = Array.isArray(body.signals) ? body.signals.map(normalizeSignal) : null;
  if (!channels || channels.length === 0 || channels.length > 20000) throw new Error("YOUTUBE_PUBLICATION_CHANNELS_INVALID");
  if (!signals || signals.length === 0 || signals.length > 20000) throw new Error("YOUTUBE_PUBLICATION_SIGNALS_INVALID");

  const channelIds = new Set();
  let okCount = 0;
  let okVideoCount = 0;
  for (const channel of channels) {
    if (channelIds.has(channel.channel_id)) throw new Error("YOUTUBE_PUBLICATION_DUPLICATE_CHANNEL_ID");
    channelIds.add(channel.channel_id);
    if (channel.scan_status === "OK") {
      okCount += 1;
      okVideoCount += channel.video_count;
    }
  }

  const rawNames = new Set();
  const ranks = new Set();
  for (const signal of signals) {
    if (rawNames.has(signal.raw_name)) throw new Error("YOUTUBE_PUBLICATION_DUPLICATE_RAW_NAME");
    if (ranks.has(signal.rank)) throw new Error("YOUTUBE_PUBLICATION_DUPLICATE_RANK");
    rawNames.add(signal.raw_name);
    ranks.add(signal.rank);
  }
  const sortedRanks = [...ranks].sort((a,b)=>a-b);
  for (let i=0;i<sortedRanks.length;i+=1) {
    if (sortedRanks[i] !== i+1) throw new Error("YOUTUBE_PUBLICATION_RANK_SEQUENCE_INVALID");
  }

  const thresholdCounts = normalizeThresholdCounts(snapshotInput.threshold_counts);
  for (const threshold of [3,5,10,15,20]) {
    const actual = signals.filter((row)=>row.distinct_channel_count >= threshold).length;
    if (actual !== thresholdCounts[String(threshold)]) {
      throw new Error(`YOUTUBE_PUBLICATION_THRESHOLD_COUNT_MISMATCH_${threshold}`);
    }
  }

  const channelCount = requireInteger(snapshotInput.channel_count,"YOUTUBE_PUBLICATION_CHANNEL_COUNT_INVALID",{ min:1,max:20000 });
  const videoCount = requireInteger(snapshotInput.video_count,"YOUTUBE_PUBLICATION_VIDEO_COUNT_INVALID",{ min:1,max:1000000000 });
  if (channelCount !== okCount) throw new Error("YOUTUBE_PUBLICATION_CHANNEL_COUNT_MISMATCH");
  if (videoCount !== okVideoCount) throw new Error("YOUTUBE_PUBLICATION_VIDEO_COUNT_MISMATCH");

  return Object.freeze({
    publication_fingerprint:fingerprint,
    snapshot:Object.freeze({
      snapshot_id:snapshotId,
      generated_at:generatedAt,
      channel_count:channelCount,
      video_count:videoCount,
      threshold_counts:Object.freeze(thresholdCounts),
      parser_version:requireString(snapshotInput.parser_version,"YOUTUBE_PUBLICATION_PARSER_VERSION_REQUIRED",120),
      source_state:Object.freeze(sourceState)
    }),
    channels:Object.freeze(channels),
    signals:Object.freeze(signals)
  });
}

async function applyYoutubeSignalMigrations(client,{ readFile = fs.readFileSync } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  for (const migrationPath of YOUTUBE_SIGNAL_MIGRATION_PATHS) {
    await client.query(readFile(migrationPath,"utf8"));
  }
  return Object.freeze({ applied:YOUTUBE_SIGNAL_MIGRATION_PATHS.map((p)=>path.basename(p)) });
}

const EXISTING_SNAPSHOT_SQL = `
select snapshot_id, publication_fingerprint
from atlas_v2.youtube_person_signal_snapshots
where snapshot_id=$1
`;

// The publisher must never silently replace known discovery coverage with a
// narrower cumulative artifact. Read these under the publication advisory lock.
const LATEST_GLOBAL_SNAPSHOT_SQL = `
select snapshot_id, channel_count, video_count
from atlas_v2.youtube_person_signal_snapshots
where snapshot_scope='global_reconciled'
order by created_at desc, snapshot_id desc
limit 1
`;

const KNOWN_DISCOVERY_CHANNELS_SQL = `
select channel_id from atlas_v2.youtube_discovery_channels
`;

const PRIOR_RAW_SIGNALS_SQL = `
select raw_name, distinct_channel_count, video_count
from atlas_v2.youtube_person_signals
where snapshot_id=$1
`;

// The public discovery API excludes registered/living/nonperson candidates:
// it is NOT the complete previous raw snapshot. Compare inside the canonical
// DB transaction instead; protect ALL original raw labels and evidence.
function assertPriorRawSignalCoverage(priorRows, incomingSignals) {
  if (!Array.isArray(priorRows) || !priorRows.length) {
    throw new Error("YOUTUBE_PUBLICATION_PRIOR_RAW_SIGNAL_ROWS_REQUIRED");
  }
  const key = value => String(value ?? "").normalize("NFKC").toLowerCase();
  const next = new Map();
  for (const row of incomingSignals) {
    const k = key(row.raw_name);
    if (next.has(k)) throw new Error("YOUTUBE_PUBLICATION_DUPLICATE_RAW_NORMALIZED_NAME");
    next.set(k,row);
  }
  for (const prior of priorRows) {
    const row = next.get(key(prior.raw_name));
    if (!row) throw new Error("YOUTUBE_PUBLICATION_PREVIOUS_RAW_LABEL_LOST: "+prior.raw_name);
    if (Number(row.distinct_channel_count)<Number(prior.distinct_channel_count) ||
        Number(row.video_count)<Number(prior.video_count)) {
      throw new Error("YOUTUBE_PUBLICATION_PREVIOUS_RAW_EVIDENCE_REGRESSION: "+prior.raw_name);
    }
  }
}

const INSERT_SNAPSHOT_SQL = `
insert into atlas_v2.youtube_person_signal_snapshots(
  snapshot_id, generated_at, channel_count, video_count, threshold_counts,
  parser_version, source_state, publication_fingerprint, snapshot_scope
) values ($1,$2,$3,$4,$5::jsonb,$6,$7::jsonb,$8,'global_reconciled')
`;

const INSERT_SIGNALS_SQL = `
insert into atlas_v2.youtube_person_signals(
  snapshot_id, raw_name, rank, distinct_channel_count, video_count
)
select
  $1,
  x.raw_name,
  x.rank,
  x.distinct_channel_count,
  x.video_count
from jsonb_to_recordset($2::jsonb) as x(
  raw_name text,
  rank integer,
  distinct_channel_count integer,
  video_count integer
)
`;

const UPSERT_CHANNELS_SQL = `
insert into atlas_v2.youtube_discovery_channels(
  channel_id, first_seen_batch, first_seen_at, last_seen_batch, last_seen_at,
  latest_channel_name, latest_scan_status, latest_video_count,
  last_snapshot_id, source_artifact_id, updated_at
)
select
  x.channel_id,
  x.batch_id,
  $2::timestamptz,
  x.batch_id,
  $2::timestamptz,
  coalesce(x.channel_name,''),
  x.scan_status,
  x.video_count,
  $3,
  $4,
  now()
from jsonb_to_recordset($1::jsonb) as x(
  channel_id text,
  channel_name text,
  batch_id text,
  scan_status text,
  video_count integer
)
on conflict(channel_id) do update set
  last_seen_batch=excluded.last_seen_batch,
  last_seen_at=excluded.last_seen_at,
  latest_channel_name=excluded.latest_channel_name,
  latest_scan_status=excluded.latest_scan_status,
  latest_video_count=excluded.latest_video_count,
  last_snapshot_id=excluded.last_snapshot_id,
  source_artifact_id=excluded.source_artifact_id,
  updated_at=now()
`;

async function publishYoutubePersonSignalSnapshot(client, input) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const payload = normalizePublicationPayload(input);
  const snapshot = payload.snapshot;
  const artifactId = snapshot.source_state?.artifact_id == null
    ? null
    : requireInteger(snapshot.source_state.artifact_id,"YOUTUBE_PUBLICATION_ARTIFACT_ID_INVALID",{ min:1 });

  await client.query("BEGIN");
  try {
    await client.query("select pg_advisory_xact_lock(hashtext('atlas-youtube:person-signal-publish:v2'))");
    const existing = await client.query(EXISTING_SNAPSHOT_SQL,[snapshot.snapshot_id]);
    if (existing.rows?.length) {
      const stored = String(existing.rows[0].publication_fingerprint || "").trim().toLowerCase();
      if (stored === payload.publication_fingerprint) {
        await client.query("ROLLBACK");
        return Object.freeze({
          committed:false,
          idempotent:true,
          snapshot_id:snapshot.snapshot_id,
          channel_count:snapshot.channel_count,
          video_count:snapshot.video_count,
          signal_count:payload.signals.length,
          registry_input_count:payload.channels.length,
          publication_fingerprint:payload.publication_fingerprint
        });
      }
      throw new Error("YOUTUBE_PUBLICATION_SNAPSHOT_ID_CONFLICT");
    }

    const latest = await client.query(LATEST_GLOBAL_SNAPSHOT_SQL);
    const prior = latest.rows?.[0];
    if (prior) {
      if (snapshot.channel_count < Number(prior.channel_count) ||
          snapshot.video_count < Number(prior.video_count)) {
        throw new Error("YOUTUBE_PUBLICATION_CUMULATIVE_REGRESSION");
      }
      // A larger total is not proof that old Channel IDs survived. Protect
      // the immutable cumulative identity set, even when totals increased.
      const known = await client.query(KNOWN_DISCOVERY_CHANNELS_SQL);
      const incomingIds = new Set(payload.channels.map(row=>row.channel_id));
      for (const row of known.rows || []) {
        if (!incomingIds.has(row.channel_id)) {
          throw new Error("YOUTUBE_PUBLICATION_KNOWN_CHANNEL_MISSING");
        }
      }
      if (snapshot.parser_version === "yt-title-person-reviewed-v5") {
        const priorSignals = await client.query(PRIOR_RAW_SIGNALS_SQL,[prior.snapshot_id]);
        assertPriorRawSignalCoverage(priorSignals.rows, payload.signals);
      }
    }

    await client.query(INSERT_SNAPSHOT_SQL,[
      snapshot.snapshot_id,
      snapshot.generated_at,
      snapshot.channel_count,
      snapshot.video_count,
      JSON.stringify(snapshot.threshold_counts),
      snapshot.parser_version,
      JSON.stringify(snapshot.source_state),
      payload.publication_fingerprint
    ]);
    await client.query(INSERT_SIGNALS_SQL,[snapshot.snapshot_id,JSON.stringify(payload.signals)]);
    await client.query(UPSERT_CHANNELS_SQL,[
      JSON.stringify(payload.channels),
      snapshot.generated_at,
      snapshot.snapshot_id,
      artifactId
    ]);
    await client.query("COMMIT");
    return Object.freeze({
      committed:true,
      idempotent:false,
      snapshot_id:snapshot.snapshot_id,
      channel_count:snapshot.channel_count,
      video_count:snapshot.video_count,
      signal_count:payload.signals.length,
      registry_input_count:payload.channels.length,
      publication_fingerprint:payload.publication_fingerprint
    });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    throw error;
  }
}

module.exports=Object.freeze({
  PUBLICATION_SCHEMA,
  YOUTUBE_SIGNAL_MIGRATION_PATHS,
  normalizeThresholdCounts,
  normalizePublicationPayload,
  applyYoutubeSignalMigrations,
  publishYoutubePersonSignalSnapshot,
  EXISTING_SNAPSHOT_SQL,
  LATEST_GLOBAL_SNAPSHOT_SQL,
  KNOWN_DISCOVERY_CHANNELS_SQL,PRIOR_RAW_SIGNALS_SQL,assertPriorRawSignalCoverage,
  INSERT_SNAPSHOT_SQL,
  INSERT_SIGNALS_SQL,
  UPSERT_CHANNELS_SQL
});
