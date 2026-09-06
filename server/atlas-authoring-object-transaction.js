"use strict";

const { createSource, createPlace } = require("./atlas-authoring-object-service.js");

function createAuthoringObjectService({ client } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");

  async function mutate(operation, payload) {
    const op = String(operation || "").trim().toLowerCase();
    const executors = Object.freeze({ create_source:createSource, create_place:createPlace });
    const execute = executors[op];
    if (!execute) throw new Error("UNSUPPORTED_AUTHORING_OBJECT_OPERATION");

    await client.query("begin isolation level serializable");
    try {
      const result = await execute(client, payload || {});
      await client.query("commit");
      return Object.freeze({ marker:"ATLAS_AUTHORING_OBJECT_V1", operation:op, committed:true, ...result });
    } catch (error) {
      try { await client.query("rollback"); } catch {}
      throw error;
    }
  }

  return Object.freeze({ mutate });
}

module.exports = Object.freeze({ createAuthoringObjectService });
