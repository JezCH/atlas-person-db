"use strict";

const crypto = require("node:crypto");
const { portraitPathname } = require("./atlas-person-portrait-storage.js");
const {
  PORTRAIT_STANDARD_VERSION,
  CREATION_METHODS,
  defaultCreationMethod,
  assertPortraitHistorySchema,
  ensurePortraitAsset,
  insertGenerationRun,
  insertApprovedRevision,
  backfillLegacyCurrentRevision,
  countAssetReferences
} = require("./atlas-person-portrait-history.js");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_RE = /^[0-9a-f]{64}$/;
const PORTRAIT_KINDS = Object.freeze(["archival", "artwork", "reconstruction", "symbolic"]);
const EVIDENCE_LEVELS = Object.freeze(["direct", "strong", "contextual", "symbolic"]);
const EVIDENCE_ROLES = Object.freeze([
  "facial_reference",
  "clothing_reference",
  "iconography_reference",
  "textual_description",
  "context_reference"
]);
const PORTRAIT_MAX_BYTES = 3 * 1024 * 1024;
const GENERATION_SPEC_MAX_BYTES = 64 * 1024;

function codedError(code, detail = null) {
  const error = new Error(code);
  error.code = code;
  if (detail != null) error.detail = detail;
  return error;
}

function normalizePersonId(value) {
  const personId = String(value || "").trim().toLowerCase();
  if (!UUID_RE.test(personId)) throw codedError("PERSON_PORTRAIT_PERSON_ID_REQUIRED");
  return personId;
}

function normalizeControlled(value, allowed, code) {
  const text = String(value || "").trim().toLowerCase();
  if (!allowed.includes(text)) throw codedError(code);
  return text;
}

function normalizeOptionalText(value, { code, max = 4000, required = false } = {}) {
  const text = value == null ? "" : String(value).trim();
  if (required && !text) throw codedError(code);
  if (text.length > max) throw codedError(code);
  return text || null;
}

function normalizeSourceLinks(value) {
  if (value == null) return Object.freeze([]);
  if (!Array.isArray(value)) throw codedError("PERSON_PORTRAIT_SOURCES_INVALID");
  if (value.length > 50) throw codedError("PERSON_PORTRAIT_SOURCES_TOO_MANY");
  const seen = new Set();
  const rows = [];
  for (const item of value) {
    const sourceId = String(item?.source_id || "").trim().toLowerCase();
    if (!UUID_RE.test(sourceId)) throw codedError("PERSON_PORTRAIT_SOURCE_ID_INVALID");
    const evidenceRole = normalizeControlled(
      item?.evidence_role,
      EVIDENCE_ROLES,
      "PERSON_PORTRAIT_EVIDENCE_ROLE_INVALID"
    );
    const key = `${sourceId}:${evidenceRole}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(Object.freeze({ source_id:sourceId, evidence_role:evidenceRole }));
  }
  rows.sort((a,b) => a.source_id.localeCompare(b.source_id) || a.evidence_role.localeCompare(b.evidence_role));
  return Object.freeze(rows);
}

function decodePortraitBase64(value) {
  const text = String(value || "").trim();
  if (!text) throw codedError("PERSON_PORTRAIT_IMAGE_REQUIRED");
  if (text.length > Math.ceil(PORTRAIT_MAX_BYTES / 3) * 4 + 8) {
    throw codedError("PERSON_PORTRAIT_IMAGE_TOO_LARGE");
  }
  if (text.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(text)) {
    throw codedError("PERSON_PORTRAIT_BASE64_INVALID");
  }
  const bytes = Buffer.from(text, "base64");
  if (!bytes.length) throw codedError("PERSON_PORTRAIT_IMAGE_REQUIRED");
  if (bytes.length > PORTRAIT_MAX_BYTES) throw codedError("PERSON_PORTRAIT_IMAGE_TOO_LARGE");
  const canonical = bytes.toString("base64");
  if (canonical !== text) throw codedError("PERSON_PORTRAIT_BASE64_INVALID");
  return bytes;
}

function assertWebp(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 12
      || bytes.toString("ascii", 0, 4) !== "RIFF"
      || bytes.toString("ascii", 8, 12) !== "WEBP") {
    throw codedError("PERSON_PORTRAIT_WEBP_REQUIRED");
  }
  return bytes;
}

function assetSha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function webpDimensions(bytes) {
  assertWebp(bytes);
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const chunk = bytes.toString("ascii", offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const data = offset + 8;
    if (data + size > bytes.length) break;
    if (chunk === "VP8X" && size >= 10) {
      return Object.freeze({
        width_px:1 + bytes.readUIntLE(data + 4, 3),
        height_px:1 + bytes.readUIntLE(data + 7, 3)
      });
    }
    if (chunk === "VP8 " && size >= 10 && data + 10 <= bytes.length) {
      return Object.freeze({
        width_px:bytes.readUInt16LE(data + 6) & 0x3fff,
        height_px:bytes.readUInt16LE(data + 8) & 0x3fff
      });
    }
    if (chunk === "VP8L" && size >= 5 && bytes[data] === 0x2f) {
      const b1=bytes[data+1], b2=bytes[data+2], b3=bytes[data+3], b4=bytes[data+4];
      return Object.freeze({
        width_px:1 + b1 + ((b2 & 0x3f) << 8),
        height_px:1 + ((b2 & 0xc0) >> 6) + (b3 << 2) + ((b4 & 0x0f) << 10)
      });
    }
    offset = data + size + (size % 2);
  }
  throw codedError("PERSON_PORTRAIT_WEBP_DIMENSIONS_INVALID");
}

function assertPortraitDimensions(dimensions) {
  const width = Number(dimensions?.width_px || 0);
  const height = Number(dimensions?.height_px || 0);
  if (width < 320 || height < 400) throw codedError("PERSON_PORTRAIT_DIMENSIONS_TOO_SMALL");
  if (width * 5 !== height * 4) throw codedError("PERSON_PORTRAIT_ASPECT_RATIO_INVALID", { expected:"4:5", width_px:width, height_px:height });
  return Object.freeze({ width_px:width, height_px:height });
}


function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function stableSha256(value) {
  return crypto.createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
}

function normalizePortraitStandardVersion(value) {
  return normalizeOptionalText(
    value == null ? PORTRAIT_STANDARD_VERSION : value,
    { code:"PERSON_PORTRAIT_STANDARD_VERSION_INVALID", max:128, required:true }
  );
}

function normalizeGeneration(value, portraitStandardVersion) {
  if (value == null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw codedError("PERSON_PORTRAIT_GENERATION_INVALID");
  }
  const generatorProvider = normalizeOptionalText(value.generator_provider, {
    code:"PERSON_PORTRAIT_GENERATOR_PROVIDER_REQUIRED", max:128, required:true
  });
  const generatorModel = normalizeOptionalText(value.generator_model, {
    code:"PERSON_PORTRAIT_GENERATOR_MODEL_REQUIRED", max:256, required:true
  });
  const promptTemplateVersion = normalizeOptionalText(value.prompt_template_version, {
    code:"PERSON_PORTRAIT_PROMPT_TEMPLATE_VERSION_REQUIRED", max:128, required:true
  });
  const generationSpec = value.generation_spec == null ? {} : value.generation_spec;
  if (!generationSpec || typeof generationSpec !== "object" || Array.isArray(generationSpec)) {
    throw codedError("PERSON_PORTRAIT_GENERATION_SPEC_INVALID");
  }
  const specJson = JSON.stringify(generationSpec);
  if (Buffer.byteLength(specJson, "utf8") > GENERATION_SPEC_MAX_BYTES) {
    throw codedError("PERSON_PORTRAIT_GENERATION_SPEC_TOO_LARGE");
  }
  const reviewNotes = normalizeOptionalText(value.review_notes, {
    code:"PERSON_PORTRAIT_GENERATION_REVIEW_NOTES_INVALID", max:4000
  });
  let requestSha256 = String(value.request_sha256 || "").trim().toLowerCase();
  if (requestSha256 && !SHA256_RE.test(requestSha256)) {
    throw codedError("PERSON_PORTRAIT_GENERATION_REQUEST_SHA256_INVALID");
  }
  if (!requestSha256) {
    requestSha256 = stableSha256({
      generator_provider:generatorProvider,
      generator_model:generatorModel,
      prompt_template_version:promptTemplateVersion,
      portrait_standard_version:portraitStandardVersion,
      generation_spec:generationSpec
    });
  }
  return Object.freeze({
    generator_provider:generatorProvider,
    generator_model:generatorModel,
    prompt_template_version:promptTemplateVersion,
    portrait_standard_version:portraitStandardVersion,
    request_sha256:requestSha256,
    generation_spec:Object.freeze(canonicalize(generationSpec)),
    review_notes:reviewNotes
  });
}

function normalizeWritePayload(payload = {}) {
  const personId = normalizePersonId(payload.person_id);
  const portraitKind = normalizeControlled(payload.portrait_kind, PORTRAIT_KINDS, "PERSON_PORTRAIT_KIND_INVALID");
  const evidenceLevel = normalizeControlled(payload.evidence_level, EVIDENCE_LEVELS, "PERSON_PORTRAIT_EVIDENCE_LEVEL_INVALID");
  const bytes = assertWebp(decodePortraitBase64(payload.image_base64));
  const sha = assetSha256(bytes);
  const dimensions = assertPortraitDimensions(webpDimensions(bytes));
  const sources = normalizeSourceLinks(payload.sources);
  const portraitStandardVersion = normalizePortraitStandardVersion(payload.portrait_standard_version);
  const generation = normalizeGeneration(payload.generation, portraitStandardVersion);
  const creationMethod = payload.creation_method == null
    ? (generation ? "ai_generated" : defaultCreationMethod(portraitKind))
    : normalizeControlled(payload.creation_method, CREATION_METHODS, "PERSON_PORTRAIT_CREATION_METHOD_INVALID");
  if (["ai_generated","ai_assisted"].includes(creationMethod) && !generation) {
    throw codedError("PERSON_PORTRAIT_GENERATION_REQUIRED");
  }
  if (!["ai_generated","ai_assisted"].includes(creationMethod) && generation) {
    throw codedError("PERSON_PORTRAIT_GENERATION_METHOD_MISMATCH");
  }
  const reconstructionNotes = normalizeOptionalText(payload.reconstruction_notes, {
    code:"PERSON_PORTRAIT_RECONSTRUCTION_NOTES_INVALID", max:8000
  });
  return Object.freeze({
    person_id:personId,
    portrait_kind:portraitKind,
    evidence_level:evidenceLevel,
    asset_sha256:sha,
    bytes,
    width_px:dimensions.width_px,
    height_px:dimensions.height_px,
    sources,
    creation_method:creationMethod,
    portrait_standard_version:portraitStandardVersion,
    reconstruction_notes:reconstructionNotes,
    generation
  });
}

function normalizeMetadataPayload(payload = {}) {
  return Object.freeze({
    person_id:normalizePersonId(payload.person_id),
    portrait_kind:normalizeControlled(payload.portrait_kind, PORTRAIT_KINDS, "PERSON_PORTRAIT_KIND_INVALID"),
    evidence_level:normalizeControlled(payload.evidence_level, EVIDENCE_LEVELS, "PERSON_PORTRAIT_EVIDENCE_LEVEL_INVALID"),
    sources:normalizeSourceLinks(payload.sources)
  });
}

async function lockPerson(client, personId) {
  await client.query("select pg_advisory_xact_lock(hashtext($1))", [`atlas-person-portrait:${personId}`]);
  const result = await client.query(
    "select id::text from atlas_v2.persons where id=$1::uuid for update",
    [personId]
  );
  if (result.rowCount !== 1) throw codedError("PERSON_PORTRAIT_TARGET_NOT_FOUND");
}

async function currentPortrait(client, personId, { forUpdate = false } = {}) {
  const result = await client.query(`
    select person_id::text,asset_sha256,portrait_kind,evidence_level,
           current_revision_id::text,updated_at
      from atlas_v2.person_portraits
     where person_id=$1::uuid${forUpdate ? " for update" : ""}`, [personId]);
  return result.rows?.[0] || null;
}

async function currentSourceLinks(client, personId) {
  const result = await client.query(`
    select pps.source_id::text,pps.evidence_role,
           s.source_type,s.title,s.canonical_url,s.citation_text
      from atlas_v2.person_portrait_sources pps
      join atlas_v2.sources s on s.id=pps.source_id
     where pps.person_id=$1::uuid
     order by pps.source_id,pps.evidence_role`, [personId]);
  return Object.freeze((result.rows || []).map((row) => Object.freeze({
    source_id:String(row.source_id),
    evidence_role:String(row.evidence_role),
    source:Object.freeze({
      source_type:row.source_type == null ? null : String(row.source_type),
      title:row.title == null ? null : String(row.title),
      canonical_url:row.canonical_url == null ? null : String(row.canonical_url),
      citation_text:row.citation_text == null ? null : String(row.citation_text)
    })
  })));
}

function sourceIdentityRows(rows) {
  return (rows || []).map((row) => ({
    source_id:String(row.source_id),
    evidence_role:String(row.evidence_role)
  })).sort((a,b) => a.source_id.localeCompare(b.source_id) || a.evidence_role.localeCompare(b.evidence_role));
}

function sameSourceLinks(left, right) {
  return JSON.stringify(sourceIdentityRows(left)) === JSON.stringify(sourceIdentityRows(right));
}

async function readPersonPortrait({ client, personId, storage = null } = {}) {
  const normalizedId = normalizePersonId(personId);
  const target = await client.query(`
    select p.id::text as person_id,
           pp.asset_sha256,pp.portrait_kind,pp.evidence_level,pp.current_revision_id::text,pp.updated_at
      from atlas_v2.persons p
      left join atlas_v2.person_portraits pp on pp.person_id=p.id
     where p.id=$1::uuid
     limit 1`, [normalizedId]);
  if (target.rowCount !== 1) return Object.freeze({ found:false, person_id:normalizedId, portrait:null });
  const row = target.rows[0];
  if (!row.asset_sha256) return Object.freeze({ found:true, person_id:normalizedId, portrait:null });
  const sources = await currentSourceLinks(client, normalizedId);
  const sha = String(row.asset_sha256);
  return Object.freeze({
    found:true,
    person_id:normalizedId,
    portrait:Object.freeze({
      asset_sha256:sha,
      asset_pathname:portraitPathname(sha),
      asset_url:storage && typeof storage.publicUrl === "function" ? storage.publicUrl(sha) : null,
      portrait_kind:String(row.portrait_kind),
      evidence_level:String(row.evidence_level),
      current_revision_id:row.current_revision_id == null ? null : String(row.current_revision_id),
      updated_at:row.updated_at == null ? null : new Date(row.updated_at).toISOString(),
      sources
    })
  });
}

async function validateSourceIds(client, sourceLinks) {
  const ids = [...new Set((sourceLinks || []).map((row) => row.source_id))];
  if (!ids.length) return;
  const result = await client.query(
    "select id::text from atlas_v2.sources where id=any($1::uuid[]) order by id",
    [ids]
  );
  const found = new Set((result.rows || []).map((row) => String(row.id)));
  const missing = ids.filter((id) => !found.has(id));
  if (missing.length) throw codedError("PERSON_PORTRAIT_SOURCE_NOT_FOUND", { source_ids:missing });
}

async function assetOwnerOtherThan(client, personId, sha) {
  const result = await client.query(`
    select person_id::text
      from (
        select person_id,asset_sha256 from atlas_v2.person_portraits
        union all
        select person_id,asset_sha256 from atlas_v2.person_portrait_revisions
      ) refs
     where asset_sha256=$2
       and person_id<>$1::uuid
     order by person_id
     limit 1`, [personId, sha]);
  return result.rows?.[0]?.person_id || null;
}

async function replaceSourceLinks(client, personId, sourceLinks) {
  await client.query("delete from atlas_v2.person_portrait_sources where person_id=$1::uuid", [personId]);
  for (const row of sourceLinks) {
    await client.query(`
      insert into atlas_v2.person_portrait_sources(person_id,source_id,evidence_role)
      values($1::uuid,$2::uuid,$3)`, [personId, row.source_id, row.evidence_role]);
  }
}

async function verifyWrittenPortrait(client, expected) {
  const row = await currentPortrait(client, expected.person_id);
  if (!row
      || String(row.asset_sha256) !== expected.asset_sha256
      || String(row.portrait_kind) !== expected.portrait_kind
      || String(row.evidence_level) !== expected.evidence_level
      || !row.current_revision_id
      || (expected.current_revision_id && String(row.current_revision_id) !== String(expected.current_revision_id))) {
    throw codedError("PERSON_PORTRAIT_VERIFICATION_FAILED");
  }
  const links = await currentSourceLinks(client, expected.person_id);
  if (!sameSourceLinks(links, expected.sources)) throw codedError("PERSON_PORTRAIT_SOURCE_VERIFICATION_FAILED");
  return row;
}

async function blobStillReferenced(client, sha) {
  try {
    return (await countAssetReferences(client, sha)).total > 0;
  } catch {
    const result = await client.query(
      "select count(*)::int as count from atlas_v2.person_portraits where asset_sha256=$1",
      [sha]
    );
    return Number(result.rows?.[0]?.count || 0) > 0;
  }
}

async function cleanupBlob(storage, sha) {
  if (!sha || !storage || typeof storage.remove !== "function") return Object.freeze({ attempted:false, ok:true });
  try {
    const result = await storage.remove(sha);
    return Object.freeze({ attempted:true, ok:true, result });
  } catch (error) {
    return Object.freeze({ attempted:true, ok:false, code:String(error?.code || error?.message || "PORTRAIT_BLOB_DELETE_FAILED") });
  }
}

function createPersonPortraitService({ client, storage } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client with query() is required");
  if (!storage || typeof storage.put !== "function" || typeof storage.remove !== "function") {
    throw new Error("portrait storage is required");
  }

  async function read(personId) {
    return readPersonPortrait({ client, personId, storage });
  }

  async function put(payload = {}) {
    const normalized = normalizeWritePayload(payload);
    const stored = await storage.put(normalized.asset_sha256, normalized.bytes);
    let committed = false;
    let replay = false;
    let revisionId = null;
    let generationRunId = null;
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      await assertPortraitHistorySchema(client);
      await lockPerson(client, normalized.person_id);
      const before = await currentPortrait(client, normalized.person_id, { forUpdate:true });
      const currentLinks = before ? await currentSourceLinks(client, normalized.person_id) : [];
      const previousRevision = before
        ? await backfillLegacyCurrentRevision(client, {
            personId:normalized.person_id,
            currentPortrait:before,
            currentSources:currentLinks
          })
        : null;

      const otherOwner = await assetOwnerOtherThan(client, normalized.person_id, normalized.asset_sha256);
      if (otherOwner) throw codedError("PERSON_PORTRAIT_ASSET_DUPLICATE_REVIEW_REQUIRED", { person_id:otherOwner });
      await validateSourceIds(client, normalized.sources);

      replay = Boolean(
        before
        && String(before.asset_sha256) === normalized.asset_sha256
        && String(before.portrait_kind) === normalized.portrait_kind
        && String(before.evidence_level) === normalized.evidence_level
        && sameSourceLinks(currentLinks, normalized.sources)
      );

      if (replay) {
        revisionId = String(previousRevision.id);
      } else {
        await ensurePortraitAsset(client, {
          assetSha256:normalized.asset_sha256,
          bytes:normalized.bytes,
          widthPx:normalized.width_px,
          heightPx:normalized.height_px
        });
        if (normalized.generation) {
          generationRunId = await insertGenerationRun(client, {
            personId:normalized.person_id,
            assetSha256:normalized.asset_sha256,
            generatorProvider:normalized.generation.generator_provider,
            generatorModel:normalized.generation.generator_model,
            promptTemplateVersion:normalized.generation.prompt_template_version,
            portraitStandardVersion:normalized.generation.portrait_standard_version,
            requestSha256:normalized.generation.request_sha256,
            generationSpec:normalized.generation.generation_spec,
            reviewNotes:normalized.generation.review_notes
          });
        }
        revisionId = await insertApprovedRevision(client, {
          personId:normalized.person_id,
          assetSha256:normalized.asset_sha256,
          portraitKind:normalized.portrait_kind,
          evidenceLevel:normalized.evidence_level,
          creationMethod:normalized.creation_method,
          portraitStandardVersion:normalized.portrait_standard_version,
          generationRunId,
          reconstructionNotes:normalized.reconstruction_notes,
          supersedesRevisionId:previousRevision?.id || null,
          sourceLinks:normalized.sources
        });

        await client.query(`
          insert into atlas_v2.person_portraits(
            person_id,asset_sha256,portrait_kind,evidence_level,current_revision_id,updated_at
          )
          values($1::uuid,$2,$3,$4,$5::uuid,now())
          on conflict (person_id) do update
            set asset_sha256=excluded.asset_sha256,
                portrait_kind=excluded.portrait_kind,
                evidence_level=excluded.evidence_level,
                current_revision_id=excluded.current_revision_id,
                updated_at=now()`,
          [
            normalized.person_id,
            normalized.asset_sha256,
            normalized.portrait_kind,
            normalized.evidence_level,
            revisionId
          ]);
        await replaceSourceLinks(client, normalized.person_id, normalized.sources);
      }

      await verifyWrittenPortrait(client, {
        ...normalized,
        current_revision_id:revisionId
      });
      await client.query("COMMIT");
      committed = true;
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      if (stored?.created) {
        try {
          const referenced = await blobStillReferenced(client, normalized.asset_sha256);
          if (!referenced) await cleanupBlob(storage, normalized.asset_sha256);
        } catch {}
      }
      throw error;
    }

    const after = await read(normalized.person_id);
    return Object.freeze({
      committed,
      replay,
      revision_id:revisionId,
      generation_run_id:generationRunId,
      storage_created:Boolean(stored?.created),
      historical_assets_retained:true,
      ...after
    });
  }

  async function patch(payload = {}) {
    const normalized = normalizeMetadataPayload(payload);
    let replay = false;
    let revisionId = null;
    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    try {
      await assertPortraitHistorySchema(client);
      await lockPerson(client, normalized.person_id);
      const before = await currentPortrait(client, normalized.person_id, { forUpdate:true });
      if (!before) throw codedError("PERSON_PORTRAIT_NOT_FOUND");
      await validateSourceIds(client, normalized.sources);
      const currentLinks = await currentSourceLinks(client, normalized.person_id);
      const previousRevision = await backfillLegacyCurrentRevision(client, {
        personId:normalized.person_id,
        currentPortrait:before,
        currentSources:currentLinks
      });
      replay = Boolean(
        String(before.portrait_kind) === normalized.portrait_kind
        && String(before.evidence_level) === normalized.evidence_level
        && sameSourceLinks(currentLinks, normalized.sources)
      );

      if (replay) {
        revisionId = String(previousRevision.id);
      } else {
        revisionId = await insertApprovedRevision(client, {
          personId:normalized.person_id,
          assetSha256:String(before.asset_sha256),
          portraitKind:normalized.portrait_kind,
          evidenceLevel:normalized.evidence_level,
          creationMethod:String(previousRevision.creation_method),
          portraitStandardVersion:String(previousRevision.portrait_standard_version),
          generationRunId:previousRevision.generation_run_id || null,
          reconstructionNotes:previousRevision.reconstruction_notes || null,
          supersedesRevisionId:String(previousRevision.id),
          sourceLinks:normalized.sources
        });
        const updated = await client.query(`
          update atlas_v2.person_portraits
             set portrait_kind=$2,
                 evidence_level=$3,
                 current_revision_id=$4::uuid,
                 updated_at=now()
           where person_id=$1::uuid
           returning person_id`,
          [normalized.person_id, normalized.portrait_kind, normalized.evidence_level, revisionId]
        );
        if (updated.rowCount !== 1) throw codedError("PERSON_PORTRAIT_METADATA_UPDATE_FAILED");
        await replaceSourceLinks(client, normalized.person_id, normalized.sources);
      }

      await verifyWrittenPortrait(client, {
        person_id:normalized.person_id,
        asset_sha256:String(before.asset_sha256),
        portrait_kind:normalized.portrait_kind,
        evidence_level:normalized.evidence_level,
        sources:normalized.sources,
        current_revision_id:revisionId
      });
      await client.query("COMMIT");
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      throw error;
    }

    const after = await read(normalized.person_id);
    return Object.freeze({
      committed:true,
      replay,
      revision_id:revisionId,
      storage_unchanged:true,
      ...after
    });
  }

  async function remove(personId) {
    const normalizedId = normalizePersonId(personId);
    let replay = false;
    let retainedRevisionId = null;
    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    try {
      await assertPortraitHistorySchema(client);
      await lockPerson(client, normalizedId);
      const before = await currentPortrait(client, normalizedId, { forUpdate:true });
      if (!before) {
        replay = true;
      } else {
        const currentLinks = await currentSourceLinks(client, normalizedId);
        const previousRevision = await backfillLegacyCurrentRevision(client, {
          personId:normalizedId,
          currentPortrait:before,
          currentSources:currentLinks
        });
        retainedRevisionId = String(previousRevision.id);
        const deleted = await client.query(
          "delete from atlas_v2.person_portraits where person_id=$1::uuid returning person_id",
          [normalizedId]
        );
        if (deleted.rowCount !== 1) throw codedError("PERSON_PORTRAIT_DELETE_FAILED");
        const verify = await currentPortrait(client, normalizedId);
        if (verify) throw codedError("PERSON_PORTRAIT_DELETE_VERIFICATION_FAILED");
      }
      await client.query("COMMIT");
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      throw error;
    }

    return Object.freeze({
      committed:true,
      replay,
      person_id:normalizedId,
      portrait:null,
      retained_revision_id:retainedRevisionId,
      storage_cleanup:Object.freeze({
        attempted:false,
        ok:true,
        retained_by_history:Boolean(retainedRevisionId)
      })
    });
  }

  return Object.freeze({ read, put, patch, remove });
}

module.exports = Object.freeze({
  PORTRAIT_KINDS,
  EVIDENCE_LEVELS,
  EVIDENCE_ROLES,
  PORTRAIT_MAX_BYTES,
  GENERATION_SPEC_MAX_BYTES,
  normalizePersonId,
  normalizeSourceLinks,
  decodePortraitBase64,
  assertWebp,
  assetSha256,
  webpDimensions,
  assertPortraitDimensions,
  normalizeGeneration,
  normalizeWritePayload,
  normalizeMetadataPayload,
  readPersonPortrait,
  createPersonPortraitService
});
