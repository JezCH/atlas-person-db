"use strict";

const crypto = require("node:crypto");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DOMAIN_DEFINITIONS = Object.freeze([
  Object.freeze({ code:"ruler", label_ko:"통치·정치 지도자" }),
  Object.freeze({ code:"military", label_ko:"군사" }),
  Object.freeze({ code:"science", label_ko:"학문·과학·사상" }),
  Object.freeze({ code:"technology", label_ko:"기술·공학·발명" }),
  Object.freeze({ code:"commerce", label_ko:"상업·경제·무역" }),
  Object.freeze({ code:"culture", label_ko:"문화·예술" }),
  Object.freeze({ code:"religion", label_ko:"종교" }),
  Object.freeze({ code:"exploration", label_ko:"탐험·항해·개척" })
]);
const DOMAIN_CODES = new Set(DOMAIN_DEFINITIONS.map((item) => item.code));

function normalizePersonId(value) {
  const id = String(value || "").trim().toLowerCase();
  if (!UUID_RE.test(id)) throw new Error("PERSON_DOMAIN_PERSON_ID_REQUIRED");
  return id;
}

function normalizeDomain(value) {
  if (value == null || String(value).trim() === "") return null;
  const domain = String(value).trim().toLowerCase();
  if (!DOMAIN_CODES.has(domain)) throw new Error("PERSON_DOMAIN_VALUE_UNSUPPORTED");
  return domain;
}

async function listRepresentativeDomains(client) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client with query() is required");
  const result = await client.query(`
    select id::text as person_id, representative_domain
      from atlas_v2.persons
     where representative_domain is not null
     order by id
  `);
  const rows = result.rows.map((row) => Object.freeze({
    person_id:String(row.person_id),
    representative_domain:String(row.representative_domain),
    updated_at:null
  }));
  const counts = Object.fromEntries(DOMAIN_DEFINITIONS.map((item) => [item.code, 0]));
  for (const row of rows) counts[row.representative_domain] = (counts[row.representative_domain] || 0) + 1;
  return Object.freeze({
    definitions:DOMAIN_DEFINITIONS,
    rows:Object.freeze(rows),
    counts:Object.freeze(counts),
    assigned:rows.length
  });
}

async function currentDomain(client, personId) {
  const result = await client.query(`
    select representative_domain
      from atlas_v2.persons
     where id=$1::uuid
  `, [personId]);
  if (result.rowCount !== 1) throw new Error("PERSON_DOMAIN_TARGET_NOT_FOUND");
  return result.rows[0]?.representative_domain || null;
}

async function lockPerson(client, personId) {
  await client.query("select pg_advisory_xact_lock(hashtext($1))", [`atlas-person-domain:${personId}`]);
  const result = await client.query(`
    select id::text, representative_domain
      from atlas_v2.persons
     where id=$1::uuid
     for update
  `, [personId]);
  if (result.rowCount !== 1) throw new Error("PERSON_DOMAIN_TARGET_NOT_FOUND");
  return result.rows[0];
}

async function writeAudit(client, { requestId, personId, before, after }) {
  await client.query(`
    insert into atlas_v2.person_profile_mutation_audits(
      request_id, person_id, operation, before_snapshot, after_snapshot
    ) values($1,$2::uuid,'set_person_representative_domain',$3::jsonb,$4::jsonb)
  `, [
    requestId,
    personId,
    JSON.stringify({ representative_domain:before }),
    JSON.stringify({ representative_domain:after })
  ]);
}

async function setRepresentativeDomain(client, { person_id, representative_domain, request_id } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client with query() is required");
  const personId = normalizePersonId(person_id);
  const domain = normalizeDomain(representative_domain);
  const requestId = String(request_id || crypto.randomUUID()).trim();
  if (!requestId) throw new Error("PERSON_DOMAIN_REQUEST_ID_REQUIRED");

  await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
  try {
    const locked = await lockPerson(client, personId);
    const before = locked.representative_domain || null;
    if (before === domain) {
      await client.query("COMMIT");
      return Object.freeze({
        committed:true,
        replay:true,
        request_id:requestId,
        person_id:personId,
        representative_domain:domain,
        before_domain:before
      });
    }

    await client.query(`
      update atlas_v2.persons
         set representative_domain=$2
       where id=$1::uuid
    `, [personId, domain]);

    await writeAudit(client, { requestId, personId, before, after:domain });

    const verified = await currentDomain(client, personId);
    if (verified !== domain) throw new Error("PERSON_DOMAIN_VERIFICATION_FAILED");
    await client.query("COMMIT");

    return Object.freeze({
      committed:true,
      replay:false,
      request_id:requestId,
      person_id:personId,
      representative_domain:domain,
      before_domain:before
    });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    throw error;
  }
}

module.exports = Object.freeze({
  UUID_RE,
  DOMAIN_DEFINITIONS,
  DOMAIN_CODES,
  normalizePersonId,
  normalizeDomain,
  listRepresentativeDomains,
  setRepresentativeDomain
});
