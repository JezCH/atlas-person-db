"use strict";

const crypto = require("node:crypto");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SOURCE_FIELDS = Object.freeze([
  "id","source_key","source_type","title","author_creator","institution","publisher",
  "publication_date","publication_year","canonical_url","external_identifier",
  "citation_text","citation_metadata","artifact_metadata","sha256","bytes"
]);

function text(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
}

function canonicalUrl(value) {
  const raw = text(value);
  if (!raw) return null;
  let parsed;
  try { parsed = new URL(raw); } catch { throw new Error("SOURCE_CANONICAL_URL_INVALID"); }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("SOURCE_CANONICAL_URL_INVALID");
  parsed.hash = "";
  return parsed.href;
}

function generatedSourceKey(url) {
  return `bibliographic-url:${crypto.createHash("sha256").update(url).digest("hex").slice(0, 40)}`;
}

function requiredUuid(value, code = "SOURCE_ID_INVALID") {
  const id = text(value).toLowerCase();
  if (!UUID_RE.test(id)) throw new Error(code);
  return id;
}

function optionalYear(value) {
  if (value == null || value === "") return null;
  const year = Number(value);
  if (!Number.isInteger(year) || year === 0) throw new Error("SOURCE_PUBLICATION_YEAR_INVALID");
  return year;
}

function optionalJson(value, code) {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) throw new Error(code);
  return value;
}

function normalizeBibliographicSource(raw, { requireKeyWithoutUrl = true } = {}) {
  const title = text(raw?.title);
  if (!title) throw new Error("title is required");
  const url = canonicalUrl(raw?.canonical_url);
  const sourceKey = text(raw?.source_key) || (url ? generatedSourceKey(url) : "");
  if (requireKeyWithoutUrl && !sourceKey) throw new Error("source_key is required when canonical_url is absent");
  const sourceType = text(raw?.source_type) || (url ? "web_bibliographic_reference" : "bibliographic_reference");
  const citationText = text(raw?.citation_text) || title;
  const publicationDate = text(raw?.publication_date) || null;
  const publicationYear = optionalYear(raw?.publication_year);
  if (publicationDate && !/^\d{4}-\d{2}-\d{2}$/.test(publicationDate)) throw new Error("SOURCE_PUBLICATION_DATE_INVALID");
  return Object.freeze({
    source_key:sourceKey,
    source_type:sourceType,
    title,
    author_creator:text(raw?.author_creator) || null,
    institution:text(raw?.institution) || null,
    publisher:text(raw?.publisher) || null,
    publication_date:publicationDate,
    publication_year:publicationYear,
    canonical_url:url,
    external_identifier:text(raw?.external_identifier) || null,
    citation_text:citationText,
    citation_metadata:optionalJson(raw?.citation_metadata, "SOURCE_CITATION_METADATA_INVALID"),
    artifact_metadata:optionalJson(raw?.artifact_metadata, "SOURCE_ARTIFACT_METADATA_INVALID"),
    sha256:raw?.sha256 ?? null,
    bytes:raw?.bytes ?? null
  });
}

async function lockKeys(client, keys) {
  for (const key of [...new Set(keys.map(text).filter(Boolean))].sort()) {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [key]);
  }
}

async function createSource(client, raw, { lock = true, keyCollision = "replay" } = {}) {
  const source = normalizeBibliographicSource(raw);
  if (lock) await lockKeys(client, [
    `atlas-source:key:${source.source_key}`,
    ...(source.canonical_url ? [`atlas-source:url:${source.canonical_url}`] : [])
  ]);

  if (source.canonical_url) {
    const byUrl = await client.query(`
      select id::text,source_key
        from atlas_v2.sources
       where canonical_url=$1
       order by id
       limit 2
       for update`, [source.canonical_url]);
    if (byUrl.rows.length > 1) throw new Error("SOURCE_CANONICAL_URL_AMBIGUOUS_REVIEW_REQUIRED");
    if (byUrl.rows.length === 1) {
      return Object.freeze({ entity:"source", id:String(byUrl.rows[0].id).toLowerCase(), source_key:String(byUrl.rows[0].source_key), replay:true });
    }
  }

  const byKey = await client.query(`
    select id::text,source_key,source_type,title,author_creator,institution,publisher,
           publication_date::text,publication_year,canonical_url,external_identifier,
           citation_text,citation_metadata,artifact_metadata,sha256,bytes
      from atlas_v2.sources
     where source_key=$1
     for update`, [source.source_key]);
  if (byKey.rows.length === 1) {
    if (keyCollision === "error") throw new Error("SOURCE_KEY_CONFLICT");
    const row = byKey.rows[0];
    const exact = SOURCE_FIELDS.filter((field) => field !== "id").every((field) => {
      const left = row[field] ?? null;
      const right = source[field] ?? null;
      if (field === "citation_metadata" || field === "artifact_metadata") return JSON.stringify(left) === JSON.stringify(right);
      return String(left ?? "") === String(right ?? "");
    });
    if (!exact) throw new Error("SOURCE_KEY_CONFLICT");
    return Object.freeze({ entity:"source", id:String(row.id).toLowerCase(), source_key:source.source_key, replay:true });
  }

  const inserted = await client.query(`
    insert into atlas_v2.sources(
      id,source_key,source_type,title,author_creator,institution,publisher,
      publication_date,publication_year,canonical_url,external_identifier,
      citation_text,citation_metadata,artifact_metadata,sha256,bytes
    ) values(
      gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7::date,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14,$15
    ) returning id::text`, [
      source.source_key,source.source_type,source.title,source.author_creator,source.institution,source.publisher,
      source.publication_date,source.publication_year,source.canonical_url,source.external_identifier,
      source.citation_text,source.citation_metadata == null ? null : JSON.stringify(source.citation_metadata),
      source.artifact_metadata == null ? null : JSON.stringify(source.artifact_metadata),source.sha256,source.bytes
    ]);
  const id = String(inserted.rows[0]?.id || "").toLowerCase();
  if (!id) throw new Error("SOURCE_CREATE_FAILED");
  return Object.freeze({ entity:"source", id, source_key:source.source_key, replay:false });
}

async function insertExactSource(client, raw) {
  const id = requiredUuid(raw?.id);
  const source = normalizeBibliographicSource(raw);
  await lockKeys(client, [`atlas-source:id:${id}`,`atlas-source:key:${source.source_key}`,...(source.canonical_url ? [`atlas-source:url:${source.canonical_url}`] : [])]);
  const result = await client.query(`
    insert into atlas_v2.sources(
      id,source_key,source_type,title,author_creator,institution,publisher,
      publication_date,publication_year,canonical_url,external_identifier,
      citation_text,citation_metadata,artifact_metadata,sha256,bytes
    ) values(
      $1::uuid,$2,$3,$4,$5,$6,$7,$8::date,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15,$16
    )`, [
      id,source.source_key,source.source_type,source.title,source.author_creator,source.institution,source.publisher,
      source.publication_date,source.publication_year,source.canonical_url,source.external_identifier,
      source.citation_text,source.citation_metadata == null ? null : JSON.stringify(source.citation_metadata),
      source.artifact_metadata == null ? null : JSON.stringify(source.artifact_metadata),source.sha256,source.bytes
    ]);
  if (result.rowCount != null && result.rowCount !== 1) throw new Error("SOURCE_CREATE_FAILED");
  return Object.freeze({ entity:"source", id, source_key:source.source_key, replay:false });
}

async function rewriteSourceCitation(client, { source_id, expected_canonical_url, expected_citation_text, replacement_citation_text }) {
  const sourceId = requiredUuid(source_id);
  const expectedUrl = canonicalUrl(expected_canonical_url);
  const before = text(expected_citation_text);
  const after = text(replacement_citation_text);
  if (!expectedUrl || !before || !after) throw new Error("SOURCE_CITATION_REWRITE_INVALID");
  const result = await client.query(
    `update atlas_v2.sources
        set citation_text=$1
      where id=$2::uuid
        and canonical_url=$3
        and citation_text=$4
      returning id::text,canonical_url,citation_text`,
    [after, sourceId, expectedUrl, before]
  );
  if (result.rowCount !== 1) throw new Error(`SOURCE_CITATION_UPDATE_COUNT_DRIFT:${sourceId}`);
  return Object.freeze({
    id:String(result.rows[0].id).toLowerCase(),
    canonical_url:String(result.rows[0].canonical_url || ""),
    citation_text:String(result.rows[0].citation_text || "")
  });
}

module.exports = Object.freeze({
  UUID_RE,
  SOURCE_FIELDS,
  canonicalUrl,
  generatedSourceKey,
  normalizeBibliographicSource,
  createSource,
  insertExactSource,
  rewriteSourceCitation
});
