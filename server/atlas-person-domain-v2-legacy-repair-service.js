"use strict";

const REPAIR = require("../contracts/person-domain-v2-legacy-residual-repair-20261004.json");
const REGISTRY = require("../atlas-person-domain-registry.js");
const { setRepresentativeDomainTx } = require("./atlas-person-domain-service.js");

const DOMAIN_CODES = new Set(REGISTRY.CODES);
const TARGETS = Object.freeze(REPAIR.targets.map((target) => Object.freeze({
  person_id:String(target.person_id).toLowerCase(),
  canonical_name_en:String(target.canonical_name_en),
  representative_domain:String(target.representative_domain)
})));
const TARGET_IDS = Object.freeze(TARGETS.map((target) => target.person_id));
const REPAIR_LOCK = "atlas-person-domain-v2-legacy-residual-repair-20261004";

for (const target of TARGETS) {
  if (!DOMAIN_CODES.has(target.representative_domain)) {
    throw new Error(`PERSON_DOMAIN_LEGACY_REPAIR_UNSUPPORTED_TARGET:${target.representative_domain}`);
  }
}

async function loadRows(client, { forUpdate = false } = {}) {
  const result = await client.query(
    `select id::text as person_id, representative_domain
       from atlas_v2.persons
      where id = any($1::uuid[])
      order by id
      ${forUpdate ? "for update" : ""}`,
    [TARGET_IDS]
  );
  return result.rows;
}

function classifyRows(rows) {
  const byId = new Map(rows.map((row) => [
    String(row.person_id).toLowerCase(),
    row.representative_domain == null ? null : String(row.representative_domain)
  ]));
  const missing = TARGETS.filter((target) => !byId.has(target.person_id));
  if (missing.length) {
    throw new Error(`PERSON_DOMAIN_LEGACY_REPAIR_TARGET_NOT_FOUND:${missing.map((item) => item.person_id).join(",")}`);
  }

  const needs_write = [];
  const already_correct = [];
  const conflicts = [];
  for (const target of TARGETS) {
    const current = byId.get(target.person_id);
    const item = Object.freeze({ ...target, current_domain:current });
    if (current === target.representative_domain) already_correct.push(item);
    else if (current == null) needs_write.push(item);
    else conflicts.push(item);
  }

  return Object.freeze({
    schema:"atlas-person-domain-v2-legacy-repair-state/v1",
    target_count:TARGETS.length,
    needs_write_count:needs_write.length,
    already_correct_count:already_correct.length,
    conflict_count:conflicts.length,
    all_correct:already_correct.length === TARGETS.length && needs_write.length === 0 && conflicts.length === 0,
    needs_write:Object.freeze(needs_write),
    already_correct:Object.freeze(already_correct),
    conflicts:Object.freeze(conflicts)
  });
}

async function inspectLegacyDomainRepair(client) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client with query() is required");
  return classifyRows(await loadRows(client));
}

async function applyLegacyDomainRepair(client) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client with query() is required");
  await client.query("begin isolation level serializable");
  try {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [REPAIR_LOCK]);
    const before = classifyRows(await loadRows(client, { forUpdate:true }));
    if (before.conflict_count !== 0) throw new Error("PERSON_DOMAIN_LEGACY_REPAIR_LIVE_CONFLICT");

    const writes = [];
    for (const target of before.needs_write) {
      writes.push(await setRepresentativeDomainTx(client, {
        person_id:target.person_id,
        representative_domain:target.representative_domain,
        request_id:`person-domain-v2-legacy-residual-20261004:${target.person_id}`
      }));
    }

    const after = classifyRows(await loadRows(client));
    if (!after.all_correct) throw new Error("PERSON_DOMAIN_LEGACY_REPAIR_POSTCONDITION_FAILED");
    await client.query("commit");
    return Object.freeze({
      committed:true,
      replay:writes.length === 0,
      repaired_count:writes.length,
      before,
      after,
      writes:Object.freeze(writes)
    });
  } catch (error) {
    try { await client.query("rollback"); } catch {}
    throw error;
  }
}

module.exports = Object.freeze({
  TARGETS,
  TARGET_IDS,
  REPAIR_LOCK,
  classifyRows,
  inspectLegacyDomainRepair,
  applyLegacyDomainRepair
});
