"use strict";

const { canonicalUrl, generatedSourceKey, createSource } = require("./atlas-source-service.js");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
}

function required(value, field) {
  const valueText = text(value);
  if (!valueText) throw new Error(`${field} is required`);
  return valueText;
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

async function insertExactPlace(client, raw) {
  const id = requiredUuid(raw?.id, "place.id");
  const canonicalKey = required(raw?.canonical_key, "canonical_key");
  const canonicalName = required(raw?.canonical_name_en, "canonical_name_en");
  const placeType = text(raw?.place_type) || "historical_place";
  const historicity = text(raw?.historicity) || "historical";
  const sourceLinks = normalizePlaceSourceLinks(raw?.source_links);

  await lockKeys(client, [`atlas-place:id:${id}`, `atlas-place:key:${canonicalKey}`]);
  await verifyPlaceSources(client, sourceLinks);

  const byId = await client.query(`
    select p.id::text,p.canonical_key,p.place_type,p.historicity,
           en.name as canonical_name_en
      from atlas_v2.places p
      left join atlas_v2.place_names en on en.place_id=p.id and en.locale='en' and en.is_preferred=true
     where p.id=$1::uuid
     for update of p`, [id]);
  const byKey = await client.query(`
    select p.id::text,p.canonical_key,p.place_type,p.historicity,
           en.name as canonical_name_en
      from atlas_v2.places p
      left join atlas_v2.place_names en on en.place_id=p.id and en.locale='en' and en.is_preferred=true
     where p.canonical_key=$1
     for update of p`, [canonicalKey]);

  if (byId.rows.length > 1 || byKey.rows.length > 1) throw new Error("PLACE_IDENTITY_AMBIGUOUS");
  if (byId.rows.length === 1 || byKey.rows.length === 1) {
    const row = byId.rows[0] || byKey.rows[0];
    if (String(row.id).toLowerCase() !== id
      || String(row.canonical_key) !== canonicalKey
      || String(row.place_type) !== placeType
      || String(row.historicity) !== historicity
      || String(row.canonical_name_en) !== canonicalName) {
      throw new Error("PLACE_EXACT_IDENTITY_CONFLICT");
    }
    const added = await appendPlaceSources(client, id, sourceLinks);
    return Object.freeze({ entity:"place", id, canonical_key:canonicalKey, replay:added === 0, added_source_links:added });
  }

  await client.query(`
    insert into atlas_v2.places(id,canonical_key,place_type,historicity)
    values($1::uuid,$2,$3,$4)`, [id, canonicalKey, placeType, historicity]);
  await client.query(`
    insert into atlas_v2.place_names(id,place_id,locale,name,name_type,is_preferred)
    values(gen_random_uuid(),$1::uuid,'en',$2,'canonical',true)`, [id, canonicalName]);
  await appendPlaceSources(client, id, sourceLinks);
  return Object.freeze({ entity:"place", id, canonical_key:canonicalKey, replay:false, added_source_links:sourceLinks.length });
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
  insertExactPlace,
  createPlace
});
