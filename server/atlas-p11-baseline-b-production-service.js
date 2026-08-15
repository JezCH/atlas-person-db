"use strict";

const {
  inspectBaselineBReadiness,
  captureBaselineB
} = require("./atlas-baseline-b.js");

async function inspectProductionBaselineBReadiness(client, {
  inspectReadiness = inspectBaselineBReadiness
} = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try {
    const readiness = await inspectReadiness(client);
    await client.query("COMMIT");
    return Object.freeze({
      read_only: true,
      database_write_committed: false,
      readiness
    });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    throw error;
  }
}

async function captureProductionBaselineB(client, {
  capture = captureBaselineB
} = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const baseline = await capture(client);
  return Object.freeze({
    read_only: true,
    database_write_committed: false,
    baseline
  });
}

module.exports = Object.freeze({
  inspectProductionBaselineBReadiness,
  captureProductionBaselineB
});
