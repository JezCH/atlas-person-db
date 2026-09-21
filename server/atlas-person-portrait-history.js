"use strict";

const PORTRAIT_STANDARD_VERSION = "atlas-portrait-standard/v1";
const LEGACY_PORTRAIT_STANDARD_VERSION = "atlas-portrait-standard/legacy-v1";
const CREATION_METHODS = Object.freeze([
  "source_asset",
  "human_reconstruction",
  "ai_generated",
  "ai_assisted",
  "symbolic_composite",
  "legacy_unknown"
]);

function codedError(code, detail = null) {
  const error = new Error(code);
  error.code = code;
  if (detail != null) error.detail = detail;
  return error;
}

function defaultCreationMethod(portraitKind) {
  if (portraitKind === "reconstruction") return "human_reconstruction";
  if (portraitKind === "symbolic") return "symbolic_composite";
  return "source_asset";
}

async function assertPortraitHistorySchema(client) {
  const result = await client.query(`
    select
      to_regclass('atlas_v2.person_portrait_assets')::text as assets,
      to_regclass('atlas_v2.person_portrait_generation_runs')::text as generation_runs,
      to_regclass('atlas_v2.person_portrait_revisions')::text as revisions,
      to_regclass('atlas_v2.person_portrait_revision_sources')::text as revision_sources,
      exists(
        select 1
          from information_schema.columns
         where table_schema='atlas_v2'
           and table_name='person_portraits'
           and column_name='current_revision_id'
      ) as current_revision_column`);
  const row = result.rows?.[0] || {};
  const ready = Boolean(
    row.assets
    && row.generation_runs
    && row.revisions
    && row.revision_sources
    && row.current_revision_column
  );
  if (!ready) throw codedError("PERSON_PORTRAIT_HISTORY_SCHEMA_REQUIRED");
  return Object.freeze({ ready:true });
}

async function ensurePortraitAsset(client, { assetSha256, bytes = null } = {}) {
  const byteCount = Buffer.isBuffer(bytes) ? bytes.length : bytes == null ? null : Number(bytes);
  await client.query(`
    insert into atlas_v2.person_portrait_assets(asset_sha256,media_type,bytes)
    values($1,'image/webp',$2)
    on conflict (asset_sha256) do nothing`, [assetSha256, byteCount]);

  const result = await client.query(`
    select asset_sha256,media_type,bytes
      from atlas_v2.person_portrait_assets
     where asset_sha256=$1`, [assetSha256]);
  if (result.rowCount !== 1) throw codedError("PERSON_PORTRAIT_ASSET_LEDGER_FAILED");
  const row = result.rows[0];
  if (String(row.media_type) !== "image/webp") throw codedError("PERSON_PORTRAIT_ASSET_MEDIA_TYPE_CONFLICT");
  if (byteCount != null && row.bytes != null && Number(row.bytes) !== byteCount) {
    throw codedError("PERSON_PORTRAIT_ASSET_METADATA_CONFLICT");
  }
  if (byteCount != null && row.bytes == null) {
    await client.query(`
      update atlas_v2.person_portrait_assets
         set bytes=$2
       where asset_sha256=$1
         and bytes is null`, [assetSha256, byteCount]);
  }
  return Object.freeze({
    asset_sha256:String(row.asset_sha256),
    media_type:"image/webp",
    bytes:byteCount ?? (row.bytes == null ? null : Number(row.bytes))
  });
}

async function revisionById(client, revisionId) {
  if (!revisionId) return null;
  const result = await client.query(`
    select id::text,person_id::text,asset_sha256,portrait_kind,evidence_level,
           creation_method,portrait_standard_version,generation_run_id::text,
           reconstruction_notes,supersedes_revision_id::text,created_at
      from atlas_v2.person_portrait_revisions
     where id=$1::uuid`, [revisionId]);
  return result.rows?.[0] || null;
}

async function insertRevisionSources(client, revisionId, sourceLinks) {
  for (const row of sourceLinks || []) {
    await client.query(`
      insert into atlas_v2.person_portrait_revision_sources(revision_id,source_id,evidence_role)
      values($1::uuid,$2::uuid,$3)
      on conflict do nothing`, [revisionId, row.source_id, row.evidence_role]);
  }
}

async function insertGenerationRun(client, {
  personId,
  assetSha256,
  generatorProvider,
  generatorModel,
  promptTemplateVersion,
  portraitStandardVersion,
  requestSha256,
  generationSpec,
  reviewNotes = null
}) {
  const result = await client.query(`
    insert into atlas_v2.person_portrait_generation_runs(
      person_id,asset_sha256,generator_provider,generator_model,
      prompt_template_version,portrait_standard_version,request_sha256,
      generation_spec,status,review_notes,reviewed_at
    )
    values($1::uuid,$2,$3,$4,$5,$6,$7,$8::jsonb,'accepted',$9,now())
    returning id::text`, [
      personId,
      assetSha256,
      generatorProvider,
      generatorModel,
      promptTemplateVersion,
      portraitStandardVersion,
      requestSha256,
      JSON.stringify(generationSpec || {}),
      reviewNotes
    ]);
  if (result.rowCount !== 1) throw codedError("PERSON_PORTRAIT_GENERATION_RUN_WRITE_FAILED");
  return String(result.rows[0].id);
}

async function insertApprovedRevision(client, {
  personId,
  assetSha256,
  portraitKind,
  evidenceLevel,
  creationMethod,
  portraitStandardVersion,
  generationRunId = null,
  reconstructionNotes = null,
  supersedesRevisionId = null,
  sourceLinks = []
}) {
  const result = await client.query(`
    insert into atlas_v2.person_portrait_revisions(
      person_id,asset_sha256,portrait_kind,evidence_level,creation_method,
      portrait_standard_version,generation_run_id,reconstruction_notes,supersedes_revision_id
    )
    values($1::uuid,$2,$3,$4,$5,$6,$7::uuid,$8,$9::uuid)
    returning id::text`, [
      personId,
      assetSha256,
      portraitKind,
      evidenceLevel,
      creationMethod,
      portraitStandardVersion,
      generationRunId,
      reconstructionNotes,
      supersedesRevisionId
    ]);
  if (result.rowCount !== 1) throw codedError("PERSON_PORTRAIT_REVISION_WRITE_FAILED");
  const revisionId = String(result.rows[0].id);
  await insertRevisionSources(client, revisionId, sourceLinks);
  return revisionId;
}

async function backfillLegacyCurrentRevision(client, {
  personId,
  currentPortrait,
  currentSources
}) {
  if (!currentPortrait) return null;
  if (currentPortrait.current_revision_id) {
    const existing = await revisionById(client, currentPortrait.current_revision_id);
    if (!existing || String(existing.person_id) !== String(personId)) {
      throw codedError("PERSON_PORTRAIT_CURRENT_REVISION_INVALID");
    }
    return existing;
  }

  await ensurePortraitAsset(client, { assetSha256:String(currentPortrait.asset_sha256) });
  const revisionId = await insertApprovedRevision(client, {
    personId,
    assetSha256:String(currentPortrait.asset_sha256),
    portraitKind:String(currentPortrait.portrait_kind),
    evidenceLevel:String(currentPortrait.evidence_level),
    creationMethod:"legacy_unknown",
    portraitStandardVersion:LEGACY_PORTRAIT_STANDARD_VERSION,
    sourceLinks:currentSources || []
  });
  const updated = await client.query(`
    update atlas_v2.person_portraits
       set current_revision_id=$2::uuid
     where person_id=$1::uuid
       and current_revision_id is null
     returning current_revision_id::text`, [personId, revisionId]);
  if (updated.rowCount !== 1) throw codedError("PERSON_PORTRAIT_LEGACY_BACKFILL_FAILED");
  return revisionById(client, revisionId);
}

async function countAssetReferences(client, assetSha256) {
  const result = await client.query(`
    select
      (select count(*)::int from atlas_v2.person_portraits where asset_sha256=$1) as current_count,
      (select count(*)::int from atlas_v2.person_portrait_revisions where asset_sha256=$1) as revision_count,
      (select count(*)::int from atlas_v2.person_portrait_generation_runs where asset_sha256=$1) as generation_count`,
    [assetSha256]
  );
  const row = result.rows?.[0] || {};
  return Object.freeze({
    current:Number(row.current_count || 0),
    revisions:Number(row.revision_count || 0),
    generations:Number(row.generation_count || 0),
    total:Number(row.current_count || 0) + Number(row.revision_count || 0) + Number(row.generation_count || 0)
  });
}

async function backfillLegacyPortraitHistoryBatch(client, { limit = 200 } = {}) {
  await assertPortraitHistorySchema(client);
  const normalizedLimit = Math.max(1, Math.min(1000, Number(limit) || 200));
  const candidates = await client.query(`
    select person_id::text
      from atlas_v2.person_portraits
     where current_revision_id is null
     order by person_id
     limit $1`, [normalizedLimit]);

  let backfilled = 0;
  for (const row of candidates.rows || []) {
    const personId = String(row.person_id);
    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    try {
      await client.query("select pg_advisory_xact_lock(hashtext($1))", [`atlas-person-portrait:${personId}`]);
      const current = await client.query(`
        select person_id::text,asset_sha256,portrait_kind,evidence_level,current_revision_id::text,updated_at
          from atlas_v2.person_portraits
         where person_id=$1::uuid
         for update`, [personId]);
      if (current.rowCount === 1 && !current.rows[0].current_revision_id) {
        const sources = await client.query(`
          select source_id::text,evidence_role
            from atlas_v2.person_portrait_sources
           where person_id=$1::uuid
           order by source_id,evidence_role`, [personId]);
        await backfillLegacyCurrentRevision(client, {
          personId,
          currentPortrait:current.rows[0],
          currentSources:sources.rows || []
        });
        backfilled += 1;
      }
      await client.query("COMMIT");
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      throw error;
    }
  }

  const remainingResult = await client.query(`
    select count(*)::int as count
      from atlas_v2.person_portraits
     where current_revision_id is null`);
  return Object.freeze({
    scanned:(candidates.rows || []).length,
    backfilled,
    remaining:Number(remainingResult.rows?.[0]?.count || 0)
  });
}

module.exports = Object.freeze({
  PORTRAIT_STANDARD_VERSION,
  LEGACY_PORTRAIT_STANDARD_VERSION,
  CREATION_METHODS,
  defaultCreationMethod,
  assertPortraitHistorySchema,
  ensurePortraitAsset,
  revisionById,
  insertRevisionSources,
  insertGenerationRun,
  insertApprovedRevision,
  backfillLegacyCurrentRevision,
  countAssetReferences,
  backfillLegacyPortraitHistoryBatch
});
