"use strict";

const crypto = require("node:crypto");

const REPAIR_SCHEMA = "atlas-authoritative-ko-repair/v1";
const REPAIR_MARKER = "ATLAS_AUTHORITATIVE_KO_REPAIR_V1";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value, code) {
  const normalized = String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
  if (!normalized) throw new Error(code);
  return normalized;
}

function normalizeRepair(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("KO_REPAIR_OBJECT_REQUIRED");
  if (raw.schema !== REPAIR_SCHEMA) throw new Error("KO_REPAIR_SCHEMA_INVALID");
  if (raw.review_status !== "approved") throw new Error("KO_REPAIR_NOT_APPROVED");
  const repairId = text(raw.repair_id, "KO_REPAIR_ID_REQUIRED");
  const polities = Array.isArray(raw.polities) ? raw.polities.map((item, index) => {
    const id = text(item?.id, `KO_REPAIR_POLITY_ID_REQUIRED:${index + 1}`).toLowerCase();
    if (!UUID_RE.test(id)) throw new Error(`KO_REPAIR_POLITY_ID_INVALID:${index + 1}`);
    return Object.freeze({
      id,
      canonical_key:text(item?.canonical_key, `KO_REPAIR_POLITY_KEY_REQUIRED:${index + 1}`),
      canonical_name_en:text(item?.canonical_name_en, `KO_REPAIR_POLITY_EN_REQUIRED:${index + 1}`),
      display_name_ko:text(item?.display_name_ko, `KO_REPAIR_POLITY_KO_REQUIRED:${index + 1}`)
    });
  }) : [];
  const periodBases = Array.isArray(raw.period_bases) ? raw.period_bases.map((item, index) => Object.freeze({
    code:text(item?.code, `KO_REPAIR_PERIOD_CODE_REQUIRED:${index + 1}`),
    display_name_ko:text(item?.display_name_ko, `KO_REPAIR_PERIOD_KO_REQUIRED:${index + 1}`)
  })) : [];
  if (!polities.length && !periodBases.length) throw new Error("KO_REPAIR_TARGETS_REQUIRED");
  if (new Set(polities.map((item) => item.id)).size !== polities.length) throw new Error("KO_REPAIR_DUPLICATE_POLITY_ID");
  if (new Set(periodBases.map((item) => item.code)).size !== periodBases.length) throw new Error("KO_REPAIR_DUPLICATE_PERIOD_CODE");
  return Object.freeze({ repairId, polities:Object.freeze(polities), periodBases:Object.freeze(periodBases) });
}

async function relationshipDigest(client) {
  const result = await client.query(`
    select id::text,person_id::text,polity_id::text,coalesce(role_id::text,'') as role_id,
           period_basis_id::text,activity_start,activity_end,confidence,chronology_status,
           legacy_source_key,coalesce(notes,'') as notes,content_hash
      from atlas_v2.person_politics_v2
     order by id`);
  const hash = crypto.createHash("sha256");
  for (const row of result.rows) hash.update(JSON.stringify(row));
  return Object.freeze({ count:result.rows.length, sha256:`sha256:${hash.digest("hex")}` });
}

async function ensurePolityKorean(client, target) {
  const entity = await client.query(`
    select p.id::text,p.canonical_key,
           (select n.name from atlas_v2.polity_names n where n.polity_id=p.id and n.locale='en' and n.is_preferred=true order by n.id limit 1) as canonical_name_en,
           (select n.name from atlas_v2.polity_names n where n.polity_id=p.id and n.locale='ko' and n.is_preferred=true order by n.id limit 1) as display_name_ko
      from atlas_v2.polities p
     where p.id=$1::uuid
     for update`, [target.id]);
  if (entity.rows.length !== 1) throw new Error(`KO_REPAIR_POLITY_NOT_FOUND:${target.id}`);
  const row = entity.rows[0];
  if (row.canonical_key !== target.canonical_key) throw new Error(`KO_REPAIR_POLITY_KEY_DRIFT:${target.id}`);
  if (row.canonical_name_en !== target.canonical_name_en) throw new Error(`KO_REPAIR_POLITY_EN_DRIFT:${target.id}`);
  if (row.display_name_ko != null) {
    if (row.display_name_ko !== target.display_name_ko) throw new Error(`KO_REPAIR_POLITY_KO_CONFLICT:${target.id}`);
    return Object.freeze({ id:target.id, disposition:"unchanged", display_name_ko:target.display_name_ko });
  }
  const alias = await client.query(`
    select id::text from atlas_v2.polity_names
     where polity_id=$1::uuid and locale='ko' and name=$2
     order by id limit 1
     for update`, [target.id, target.display_name_ko]);
  if (alias.rows.length) {
    await client.query(`update atlas_v2.polity_names set is_preferred=true where id=$1::uuid`, [alias.rows[0].id]);
    return Object.freeze({ id:target.id, disposition:"promoted", display_name_ko:target.display_name_ko });
  }
  await client.query(`
    insert into atlas_v2.polity_names(id,polity_id,locale,name,name_type,is_preferred)
    values(gen_random_uuid(),$1::uuid,'ko',$2,'display',true)`, [target.id, target.display_name_ko]);
  return Object.freeze({ id:target.id, disposition:"inserted", display_name_ko:target.display_name_ko });
}

async function ensurePeriodBasisKorean(client, target) {
  const entity = await client.query(`
    select p.id::text,p.code,
           (select n.name from atlas_v2.period_basis_names n where n.period_basis_id=p.id and n.locale='ko' and n.is_preferred=true order by n.id limit 1) as display_name_ko
      from atlas_v2.period_bases p
     where p.code=$1 and p.is_active=true
     for update`, [target.code]);
  if (entity.rows.length !== 1) throw new Error(`KO_REPAIR_PERIOD_NOT_FOUND:${target.code}`);
  const row = entity.rows[0];
  if (row.display_name_ko != null) {
    if (row.display_name_ko !== target.display_name_ko) throw new Error(`KO_REPAIR_PERIOD_KO_CONFLICT:${target.code}`);
    return Object.freeze({ code:target.code, disposition:"unchanged", display_name_ko:target.display_name_ko });
  }
  const alias = await client.query(`
    select id::text from atlas_v2.period_basis_names
     where period_basis_id=$1::uuid and locale='ko' and name=$2
     order by id limit 1
     for update`, [row.id, target.display_name_ko]);
  if (alias.rows.length) {
    await client.query(`update atlas_v2.period_basis_names set is_preferred=true where id=$1::uuid`, [alias.rows[0].id]);
    return Object.freeze({ code:target.code, disposition:"promoted", display_name_ko:target.display_name_ko });
  }
  await client.query(`
    insert into atlas_v2.period_basis_names(id,period_basis_id,locale,name,is_preferred)
    values(gen_random_uuid(),$1::uuid,'ko',$2,true)`, [row.id, target.display_name_ko]);
  return Object.freeze({ code:target.code, disposition:"inserted", display_name_ko:target.display_name_ko });
}

function summarize(rows) {
  return Object.freeze(rows.reduce((acc, row) => {
    acc[row.disposition] = (acc[row.disposition] || 0) + 1;
    return acc;
  }, { inserted:0, promoted:0, unchanged:0 }));
}

function createAuthoritativeKoRepairService({ client } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  return Object.freeze({
    async apply(rawRepair) {
      const repair = normalizeRepair(rawRepair);
      await client.query("begin isolation level serializable");
      try {
        await client.query("select pg_advisory_xact_lock(hashtext($1))", [`atlas-authoritative-ko-repair:${repair.repairId}`]);
        const before = await relationshipDigest(client);
        const polityResults = [];
        for (const target of repair.polities) polityResults.push(await ensurePolityKorean(client, target));
        const periodResults = [];
        for (const target of repair.periodBases) periodResults.push(await ensurePeriodBasisKorean(client, target));
        const after = await relationshipDigest(client);
        if (before.count !== after.count || before.sha256 !== after.sha256) throw new Error("KO_REPAIR_RELATIONSHIP_ROWS_CHANGED");
        await client.query("commit");
        return Object.freeze({
          marker:REPAIR_MARKER,
          schema:REPAIR_SCHEMA,
          repair_id:repair.repairId,
          committed:true,
          locale:"ko",
          polity_targets:polityResults.length,
          period_basis_targets:periodResults.length,
          polity_summary:summarize(polityResults),
          period_basis_summary:summarize(periodResults),
          relationship_guard:Object.freeze({ before, after, unchanged:true }),
          polities:Object.freeze(polityResults),
          period_bases:Object.freeze(periodResults)
        });
      } catch (error) {
        try { await client.query("rollback"); } catch {}
        throw error;
      }
    }
  });
}

module.exports = Object.freeze({
  REPAIR_SCHEMA,
  REPAIR_MARKER,
  normalizeRepair,
  relationshipDigest,
  ensurePolityKorean,
  ensurePeriodBasisKorean,
  createAuthoritativeKoRepairService
});
