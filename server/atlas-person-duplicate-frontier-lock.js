"use strict";

const PERSON_DUPLICATE_FRONTIER_LOCK_KEY = "atlas-p10-person-duplicate-frontier/v1";

async function lockPersonDuplicateFrontier(client) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client with query() is required");
  await client.query(`select pg_advisory_xact_lock(hashtext($1))`, [PERSON_DUPLICATE_FRONTIER_LOCK_KEY]);
  return PERSON_DUPLICATE_FRONTIER_LOCK_KEY;
}

module.exports = Object.freeze({
  PERSON_DUPLICATE_FRONTIER_LOCK_KEY,
  lockPersonDuplicateFrontier
});
