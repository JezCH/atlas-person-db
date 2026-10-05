"use strict";

const REGISTRY = require("../atlas-person-domain-registry.js");

const V2_CODES = Object.freeze([...REGISTRY.CODES]);
const V2_CODE_SET = new Set(V2_CODES);
const LEGACY_CODE = "knowledge";
const CONSTRAINT_NAME = "persons_representative_domain_check";

async function constraintState(client) {
  const result = await client.query(
    `select pg_get_constraintdef(c.oid) definition,c.convalidated
       from pg_constraint c
      where c.conrelid='atlas_v2.persons'::regclass
        and c.conname=$1`,
    [CONSTRAINT_NAME]
  );
  if (result.rowCount !== 1) {
    return Object.freeze({ present:false, validated:false, definition:null, v2:false });
  }
  const definition = String(result.rows[0].definition || "");
  return Object.freeze({
    present:true,
    validated:result.rows[0].convalidated === true,
    definition,
    v2:definition.includes("'science'") && !definition.includes("'knowledge'")
  });
}

async function inspectPersonDomainV2Readiness(client) {
  const result = await client.query(
    `select id::text person_id,representative_domain
       from atlas_v2.persons
      where representative_domain is not null
      order by id`
  );

  const counts = {};
  const legacyIds = [];
  const unsupported = [];

  for (const row of result.rows) {
    const domain = String(row.representative_domain);
    const personId = String(row.person_id).toLowerCase();
    counts[domain] = (counts[domain] || 0) + 1;
    if (domain === LEGACY_CODE) legacyIds.push(personId);
    else if (!V2_CODE_SET.has(domain)) unsupported.push({ person_id:personId, representative_domain:domain });
  }

  const constraint = await constraintState(client);
  const schemaV2Ready = constraint.v2
    && constraint.validated
    && legacyIds.length === 0
    && unsupported.length === 0;

  return Object.freeze({
    schema:"atlas-person-domain-v2-readiness/v1",
    assigned:result.rows.length,
    counts:Object.freeze(counts),
    legacy_knowledge_ids:Object.freeze(legacyIds.sort()),
    unsupported:Object.freeze(unsupported),
    constraint,
    schema_v2_ready:schemaV2Ready
  });
}

module.exports = Object.freeze({
  V2_CODES,
  LEGACY_CODE,
  constraintState,
  inspectPersonDomainV2Readiness
});
