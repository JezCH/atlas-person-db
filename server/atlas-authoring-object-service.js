"use strict";

const crypto = require("node:crypto");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
}

function required(value, field) {
  const valueText = text(value);
  if (!valueText) throw new Error(`${field} is required`);
  return valueText;
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

function requiredUuid(value, field) {
  const normalized = text(value).toLowerCase();
  if (!UUID_RE.test(normalized)) throw new Error(`${field} must be a UUID`);
  return normalized;
}

async function lockKeys(client, keys) {
  for (const key of [...new Set(keys.map(text).filter(Boolean))].sort()) {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [key]);
  }
}

function generatedSourceKey(url) {
  return `bibliographic-url:${crypto.createHash("sha256").update(url).digest("hex").slice(0, 40)}`;
}

async function createSource(client, raw) {
  const title = required(raw?.title, "title");
  const url = canonicalUrl(raw?.canonical_url);
  const sourceKey = text(raw?.source_key) || (url ? generatedSourceKey(url) : "");
  if (!sourceKey) throw new Error("source_key is required when canonical_url is absent");
  const sourceType = text(raw?.source_type) || (url ? "web_bibliographic_reference" : "bibliographic_reference");
  const citationText = text(raw?.citation_text) || title;

  await lockKeys(client, [
    `atlas-source:key:${sourceKey}`,
    ...(url ? [`atlas-source:url:${url}`] : [])
  ]);

  if (url) {
    const byUrl = await client.query(`
      select id::text,source_key
        from atlas_v2.sources
       where canonical_url=$1
       order by id
       limit 2
       for update`, [url]);
    if (byUrl.rows.length > 1) throw new Error("SOURCE_CANONICAL_URL_AMBIGUOUS_REVIEW_REQUIRED");
    if (byUrl.rows.length === 1) {
      return Object.freeze({ entity:"source", id:String(byUrl.rows[0].id).toLowerCase(), source_key:String(byUrl.rows[0].source_key), replay:true });
    }
  }

  const byKey = await client.query(`
    select id::text,source_key,source_type,title,sha256,bytes,canonical_url,citation_text
      from atlas_v2.sources
     where source_key=$1
     for update`, [sourceKey]);
  if (byKey.rows.length === 1) {
    const row = byKey.rows[0];
    const exact = String(row.source_type) === sourceType
      && String(row.title) === title
      && row.sha256 == null
      && row.bytes == null
      && (row.canonical_url == null ? null : String(row.canonical_url)) === url
      && String(row.citation_text) === citationText;
    if (!exact) throw new Error("SOURCE_KEY_CONFLICT");
    return Object.freeze({ entity:"source", id:String(row.id).toLowerCase(), source_key:sourceKey, replay:true });
  }

  const inserted = await client.query(`
    insert into atlas_v2.sources(id,source_key,source_type,title,sha256,bytes,canonical_url,citation_text)
    values(gen_random_uuid(),$1,$2,$3,null,null,$4,$5)
    returning id::text`, [sourceKey, sourceType, title, url, citationText]);
  const id = String(inserted.rows[0]?.id || "").toLowerCase();
  if (!id) throw new Error("SOURCE_CREATE_FAILED");
  return Object.freeze({ entity:"source", id, source_key:sourceKey, replay:false });
}

function normalizePlaceSourceLinks(raw) {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error("PLACE_SOURCE_LINKS_REQUIRED");
  const seen = new Set();
  return Object.freeze(raw.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error(`PLACE_SOURCE_LINK_INVALID:${index + 1}`);
    const sourceId = requiredUuid(item.source_id, `source_links[${index}].source_id`);
    const locator = required(item.source_locator_key ?? item.locator, `source_links[${index}].source_locator_key`);
    const signature = `${sourceId}\u0000${locator}`;
    if (seen.has(signature)) throw new Error("PLACE_SOURCE_LINK_REUSED");
    seen.add(signature);
    return Object.freeze({ source_id:sourceId, source_locator_key:locator });
  }));
}

async function verifyPlaceSources(client, links) {
  for (const link of links) {
    const result = await client.query(`select id::text from atlas_v2.sources where id=$1::uuid`, [link.source_id]);
    if (result.rows.length !== 1) throw new Error("PLACE_SOURCE_ID_UNRESOLVED");
  }
}

async function appendPlaceSources(client, placeId, links) {
  let inserted = 0;
  for (const link of links) {
    const result = await client.query(`
      insert into atlas_v2.place_sources(place_id,source_id,source_locator_key)
      values($1::uuid,$2::uuid,$3)
      on conflict do nothing`, [placeId, link.source_id, link.source_locator_key]);
    inserted += Number(result.rowCount || 0);
  }
  return inserted;
}

async function createPlace(client, raw) {
  const canonicalKey = required(raw?.canonical_key, "canonical_key");
  const canonicalName = required(raw?.canonical_name_en, "canonical_name_en");
  const displayName = required(raw?.display_name_ko, "display_name_ko");
  const placeType = text(raw?.place_type) || "historical_place";
  const historicity = text(raw?.historicity) || "historical";
  const sourceLinks = normalizePlaceSourceLinks(raw?.source_links);

  await lockKeys(client, [`atlas-place:key:${canonicalKey}`]);
  await verifyPlaceSources(client, sourceLinks);

  const existing = await client.query(`
    select p.id::text,p.place_type,p.historicity,
           en.name as canonical_name_en,ko.name as display_name_ko
      from atlas_v2.places p
      left join atlas_v2.place_names en on en.place_id=p.id and en.locale='en' and en.is_preferred=true
      left join atlas_v2.place_names ko on ko.place_id=p.id and ko.locale='ko' and ko.is_preferred=true
     where p.canonical_key=$1
     for update of p`, [canonicalKey]);

  if (existing.rows.length === 1) {
    const row = existing.rows[0];
    const exact = String(row.place_type) === placeType
      && String(row.historicity) === historicity
      && String(row.canonical_name_en) === canonicalName
      && String(row.display_name_ko) === displayName;
    if (!exact) throw new Error("PLACE_CANONICAL_KEY_CONFLICT");
    const added = await appendPlaceSources(client, String(row.id).toLowerCase(), sourceLinks);
    return Object.freeze({ entity:"place", id:String(row.id).toLowerCase(), canonical_key:canonicalKey, replay:added === 0, added_source_links:added });
  }

  const inserted = await client.query(`
    insert into atlas_v2.places(id,canonical_key,place_type,historicity)
    values(gen_random_uuid(),$1,$2,$3)
    returning id::text`, [canonicalKey, placeType, historicity]);
  const id = String(inserted.rows[0]?.id || "").toLowerCase();
  if (!id) throw new Error("PLACE_CREATE_FAILED");
  await client.query(`
    insert into atlas_v2.place_names(id,place_id,locale,name,name_type,is_preferred) values
      (gen_random_uuid(),$1::uuid,'en',$2,'canonical',true),
      (gen_random_uuid(),$1::uuid,'ko',$3,'display',true)`, [id, canonicalName, displayName]);
  await appendPlaceSources(client, id, sourceLinks);
  return Object.freeze({ entity:"place", id, canonical_key:canonicalKey, replay:false, added_source_links:sourceLinks.length });
}

module.exports = Object.freeze({
  UUID_RE,
  canonicalUrl,
  generatedSourceKey,
  createSource,
  normalizePlaceSourceLinks,
  createPlace
});
