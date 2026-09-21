"use strict";

const crypto = require("node:crypto");
const { portraitPathname } = require("./atlas-person-portrait-storage.js");

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

function normalizeWritePayload(payload = {}) {
  const personId = normalizePersonId(payload.person_id);
  const portraitKind = normalizeControlled(payload.portrait_kind, PORTRAIT_KINDS, "PERSON_PORTRAIT_KIND_INVALID");
  const evidenceLevel = normalizeControlled(payload.evidence_level, EVIDENCE_LEVELS, "PERSON_PORTRAIT_EVIDENCE_LEVEL_INVALID");
  const bytes = assertWebp(decodePortraitBase64(payload.image_base64));
  const sha = assetSha256(bytes);
  const sources = normalizeSourceLinks(payload.sources);
  return Object.freeze({
    person_id:personId,
    portrait_kind:portraitKind,
    evidence_level:evidenceLevel,
    asset_sha256:sha,
    bytes,
    sources
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
    select person_id::text,asset_sha256,portrait_kind,evidence_level,updated_at
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
           pp.asset_sha256,pp.portrait_kind,pp.evidence_level,pp.updated_at
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
      from atlas_v2.person_portraits
     where asset_sha256=$2 and person_id<>$1::uuid
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
      || String(row.evidence_level) !== expected.evidence_level) {
    throw codedError("PERSON_PORTRAIT_VERIFICATION_FAILED");
  }
  const links = await currentSourceLinks(client, expected.person_id);
  if (!sameSourceLinks(links, expected.sources)) throw codedError("PERSON_PORTRAIT_SOURCE_VERIFICATION_FAILED");
  return row;
}

async function blobStillReferenced(client, sha) {
  const result = await client.query(
    "select count(*)::int as count from atlas_v2.person_portraits where asset_sha256=$1",
    [sha]
  );
  return Number(result.rows?.[0]?.count || 0) > 0;
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
    let oldSha = null;
    let committed = false;
    let replay = false;
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      await lockPerson(client, normalized.person_id);
      const before = await currentPortrait(client, normalized.person_id, { forUpdate:true });
      oldSha = before?.asset_sha256 ? String(before.asset_sha256) : null;

      const otherOwner = await assetOwnerOtherThan(client, normalized.person_id, normalized.asset_sha256);
      if (otherOwner) throw codedError("PERSON_PORTRAIT_ASSET_DUPLICATE_REVIEW_REQUIRED", { person_id:otherOwner });
      await validateSourceIds(client, normalized.sources);
      const currentLinks = before ? await currentSourceLinks(client, normalized.person_id) : [];
      replay = Boolean(
        before
        && String(before.asset_sha256) === normalized.asset_sha256
        && String(before.portrait_kind) === normalized.portrait_kind
        && String(before.evidence_level) === normalized.evidence_level
        && sameSourceLinks(currentLinks, normalized.sources)
      );

      if (!replay) {
        await client.query(`
          insert into atlas_v2.person_portraits(person_id,asset_sha256,portrait_kind,evidence_level,updated_at)
          values($1::uuid,$2,$3,$4,now())
          on conflict (person_id) do update
            set asset_sha256=excluded.asset_sha256,
                portrait_kind=excluded.portrait_kind,
                evidence_level=excluded.evidence_level,
                updated_at=now()`,
          [normalized.person_id, normalized.asset_sha256, normalized.portrait_kind, normalized.evidence_level]);
        await replaceSourceLinks(client, normalized.person_id, normalized.sources);
      }

      await verifyWrittenPortrait(client, normalized);
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

    let replacedAssetCleanup = Object.freeze({ attempted:false, ok:true });
    if (committed && oldSha && oldSha !== normalized.asset_sha256) {
      replacedAssetCleanup = await cleanupBlob(storage, oldSha);
    }
    const after = await read(normalized.person_id);
    return Object.freeze({
      committed:true,
      replay,
      storage_created:Boolean(stored?.created),
      replaced_asset_cleanup:replacedAssetCleanup,
      ...after
    });
  }

  async function patch(payload = {}) {
    const normalized = normalizeMetadataPayload(payload);
    let replay = false;
    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    try {
      await lockPerson(client, normalized.person_id);
      const before = await currentPortrait(client, normalized.person_id, { forUpdate:true });
      if (!before) throw codedError("PERSON_PORTRAIT_NOT_FOUND");
      await validateSourceIds(client, normalized.sources);
      const currentLinks = await currentSourceLinks(client, normalized.person_id);
      replay = Boolean(
        String(before.portrait_kind) === normalized.portrait_kind
        && String(before.evidence_level) === normalized.evidence_level
        && sameSourceLinks(currentLinks, normalized.sources)
      );

      if (!replay) {
        const updated = await client.query(`
          update atlas_v2.person_portraits
             set portrait_kind=$2,
                 evidence_level=$3,
                 updated_at=now()
           where person_id=$1::uuid
           returning person_id`,
          [normalized.person_id, normalized.portrait_kind, normalized.evidence_level]
        );
        if (updated.rowCount !== 1) throw codedError("PERSON_PORTRAIT_METADATA_UPDATE_FAILED");
        await replaceSourceLinks(client, normalized.person_id, normalized.sources);
      }

      await verifyWrittenPortrait(client, {
        person_id:normalized.person_id,
        asset_sha256:String(before.asset_sha256),
        portrait_kind:normalized.portrait_kind,
        evidence_level:normalized.evidence_level,
        sources:normalized.sources
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
      storage_unchanged:true,
      ...after
    });
  }

  async function remove(personId) {
    const normalizedId = normalizePersonId(personId);
    let oldSha = null;
    let replay = false;
    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    try {
      await lockPerson(client, normalizedId);
      const before = await currentPortrait(client, normalizedId, { forUpdate:true });
      if (!before) {
        replay = true;
      } else {
        oldSha = String(before.asset_sha256);
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

    const storageCleanup = oldSha ? await cleanupBlob(storage, oldSha) : Object.freeze({ attempted:false, ok:true });
    return Object.freeze({
      committed:true,
      replay,
      person_id:normalizedId,
      portrait:null,
      storage_cleanup:storageCleanup
    });
  }

  return Object.freeze({ read, put, patch, remove });
}

module.exports = Object.freeze({
  PORTRAIT_KINDS,
  EVIDENCE_LEVELS,
  EVIDENCE_ROLES,
  PORTRAIT_MAX_BYTES,
  normalizePersonId,
  normalizeSourceLinks,
  decodePortraitBase64,
  assertWebp,
  assetSha256,
  normalizeWritePayload,
  normalizeMetadataPayload,
  readPersonPortrait,
  createPersonPortraitService
});
