"use strict";

const crypto = require("node:crypto");
const { portraitPathname } = require("./atlas-person-portrait-storage.js");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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

function decodePortraitBase64(value) {
  const text = String(value || "").trim();
  if (!text) throw codedError("PERSON_PORTRAIT_IMAGE_REQUIRED");
  if (text.length > Math.ceil(PORTRAIT_MAX_BYTES / 3) * 4 + 8) throw codedError("PERSON_PORTRAIT_IMAGE_TOO_LARGE");
  if (text.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(text)) throw codedError("PERSON_PORTRAIT_BASE64_INVALID");
  const bytes = Buffer.from(text, "base64");
  if (!bytes.length) throw codedError("PERSON_PORTRAIT_IMAGE_REQUIRED");
  if (bytes.length > PORTRAIT_MAX_BYTES) throw codedError("PERSON_PORTRAIT_IMAGE_TOO_LARGE");
  if (bytes.toString("base64") !== text) throw codedError("PERSON_PORTRAIT_BASE64_INVALID");
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
    if (chunk === "VP8X" && size >= 10) return Object.freeze({ width_px:1 + bytes.readUIntLE(data + 4, 3), height_px:1 + bytes.readUIntLE(data + 7, 3) });
    if (chunk === "VP8 " && size >= 10 && data + 10 <= bytes.length) return Object.freeze({ width_px:bytes.readUInt16LE(data + 6) & 0x3fff, height_px:bytes.readUInt16LE(data + 8) & 0x3fff });
    if (chunk === "VP8L" && size >= 5 && bytes[data] === 0x2f) {
      const b1=bytes[data+1], b2=bytes[data+2], b3=bytes[data+3], b4=bytes[data+4];
      return Object.freeze({ width_px:1 + b1 + ((b2 & 0x3f) << 8), height_px:1 + ((b2 & 0xc0) >> 6) + (b3 << 2) + ((b4 & 0x0f) << 10) });
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

function normalizeWritePayload(payload = {}) {
  const bytes = assertWebp(decodePortraitBase64(payload.image_base64));
  const dimensions = assertPortraitDimensions(webpDimensions(bytes));
  return Object.freeze({
    person_id:normalizePersonId(payload.person_id),
    asset_sha256:assetSha256(bytes),
    bytes,
    width_px:dimensions.width_px,
    height_px:dimensions.height_px
  });
}

async function lockPerson(client, personId) {
  await client.query("select pg_advisory_xact_lock(hashtext($1))", [`atlas-person-portrait:${personId}`]);
  const result = await client.query("select id::text from atlas_v2.persons where id=$1::uuid for update", [personId]);
  if (result.rowCount !== 1) throw codedError("PERSON_PORTRAIT_TARGET_NOT_FOUND");
}

async function currentPortrait(client, personId, { forUpdate = false } = {}) {
  const result = await client.query(`
    select person_id::text,asset_sha256,updated_at
      from atlas_v2.person_portraits
     where person_id=$1::uuid${forUpdate ? " for update" : ""}`, [personId]);
  return result.rows?.[0] || null;
}

async function readPersonPortrait({ client, personId, storage = null } = {}) {
  const normalizedId = normalizePersonId(personId);
  const target = await client.query(`
    select p.id::text as person_id,pp.asset_sha256,pp.updated_at
      from atlas_v2.persons p
      left join atlas_v2.person_portraits pp on pp.person_id=p.id
     where p.id=$1::uuid
     limit 1`, [normalizedId]);
  if (target.rowCount !== 1) return Object.freeze({ found:false, person_id:normalizedId, portrait:null });
  const row = target.rows[0];
  if (!row.asset_sha256) return Object.freeze({ found:true, person_id:normalizedId, portrait:null });
  const sha = String(row.asset_sha256);
  return Object.freeze({
    found:true,
    person_id:normalizedId,
    portrait:Object.freeze({
      asset_sha256:sha,
      asset_pathname:portraitPathname(sha),
      asset_url:storage && typeof storage.publicUrl === "function" ? storage.publicUrl(sha) : null,
      updated_at:row.updated_at == null ? null : new Date(row.updated_at).toISOString()
    })
  });
}

async function assetOwnerOtherThan(client, personId, sha) {
  const result = await client.query(`
    select person_id::text
      from atlas_v2.person_portraits
     where asset_sha256=$2
       and person_id<>$1::uuid
     order by person_id
     limit 1`, [personId, sha]);
  return result.rows?.[0]?.person_id || null;
}

async function blobStillReferenced(client, sha) {
  const result = await client.query("select count(*)::int as count from atlas_v2.person_portraits where asset_sha256=$1", [sha]);
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
  if (!storage || typeof storage.put !== "function" || typeof storage.remove !== "function") throw new Error("portrait storage is required");

  async function read(personId) {
    return readPersonPortrait({ client, personId, storage });
  }

  async function put(payload = {}) {
    const normalized = normalizeWritePayload(payload);
    const stored = await storage.put(normalized.asset_sha256, normalized.bytes);
    let committed = false;
    let replay = false;
    let previousSha = null;
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      await lockPerson(client, normalized.person_id);
      const before = await currentPortrait(client, normalized.person_id, { forUpdate:true });
      previousSha = before?.asset_sha256 ? String(before.asset_sha256) : null;
      const otherOwner = await assetOwnerOtherThan(client, normalized.person_id, normalized.asset_sha256);
      if (otherOwner) throw codedError("PERSON_PORTRAIT_ASSET_DUPLICATE_REVIEW_REQUIRED", { person_id:otherOwner });

      replay = previousSha === normalized.asset_sha256;
      if (!replay) {
        await client.query(`
          insert into atlas_v2.person_portraits(person_id,asset_sha256,updated_at)
          values($1::uuid,$2,now())
          on conflict (person_id) do update
             set asset_sha256=excluded.asset_sha256,updated_at=now()`,
          [normalized.person_id, normalized.asset_sha256]);
      }

      const verify = await currentPortrait(client, normalized.person_id);
      if (!verify || String(verify.asset_sha256) !== normalized.asset_sha256) throw codedError("PERSON_PORTRAIT_VERIFICATION_FAILED");
      await client.query("COMMIT");
      committed = true;
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      if (stored?.created && !(await blobStillReferenced(client, normalized.asset_sha256).catch(() => true))) {
        await cleanupBlob(storage, normalized.asset_sha256);
      }
      throw error;
    }

    let replacedAssetCleanup = Object.freeze({ attempted:false, ok:true });
    if (committed && previousSha && previousSha !== normalized.asset_sha256) {
      const referenced = await blobStillReferenced(client, previousSha);
      if (!referenced) replacedAssetCleanup = await cleanupBlob(storage, previousSha);
    }
    const after = await read(normalized.person_id);
    return Object.freeze({ committed:true, replay, replaced_asset_cleanup:replacedAssetCleanup, ...after });
  }

  async function remove(personId) {
    const normalizedId = normalizePersonId(personId);
    let replay = false;
    let previousSha = null;
    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    try {
      await lockPerson(client, normalizedId);
      const before = await currentPortrait(client, normalizedId, { forUpdate:true });
      if (!before) {
        replay = true;
      } else {
        previousSha = String(before.asset_sha256);
        const deleted = await client.query("delete from atlas_v2.person_portraits where person_id=$1::uuid returning person_id", [normalizedId]);
        if (deleted.rowCount !== 1) throw codedError("PERSON_PORTRAIT_DELETE_FAILED");
        if (await currentPortrait(client, normalizedId)) throw codedError("PERSON_PORTRAIT_DELETE_VERIFICATION_FAILED");
      }
      await client.query("COMMIT");
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      throw error;
    }

    let storageCleanup = Object.freeze({ attempted:false, ok:true });
    if (previousSha && !(await blobStillReferenced(client, previousSha))) storageCleanup = await cleanupBlob(storage, previousSha);
    return Object.freeze({ committed:true, replay, person_id:normalizedId, portrait:null, storage_cleanup:storageCleanup });
  }

  return Object.freeze({ read, put, remove });
}

module.exports = Object.freeze({
  PORTRAIT_MAX_BYTES,
  normalizePersonId,
  decodePortraitBase64,
  assertWebp,
  assetSha256,
  webpDimensions,
  assertPortraitDimensions,
  normalizeWritePayload,
  readPersonPortrait,
  createPersonPortraitService
});
