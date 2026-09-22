"use strict";

const { requireDatabaseUrl, sendJson } = require("./atlas-read-http.js");
const {
  RUNTIME_EXCLUSIONS_SCHEMA,
  readRuntimeExclusions
} = require("./atlas-runtime-exclusions-read-service.js");

function createRuntimeExclusionsReadHandler({
  clientFactory,
  env = process.env,
  read = readRuntimeExclusions
} = {}) {
  if (typeof clientFactory !== "function") throw new Error("clientFactory is required");
  if (typeof read !== "function") throw new Error("runtime exclusions reader is required");

  return async function runtimeExclusionsReadHandler(req,res) {
    if (String(req?.method || "GET").toUpperCase() !== "GET") {
      sendJson(res,405,{ ok:false, schema:RUNTIME_EXCLUSIONS_SCHEMA, code:"METHOD_NOT_ALLOWED" });
      return;
    }
    let databaseUrl;
    try {
      databaseUrl=requireDatabaseUrl(env);
    } catch (error) {
      sendJson(res,503,{ ok:false, schema:RUNTIME_EXCLUSIONS_SCHEMA, code:"SERVER_CONFIGURATION_ERROR" });
      return;
    }
    let client=null;
    try {
      client=await clientFactory(databaseUrl);
      const exclusions=await read(client);
      sendJson(res,200,{ ok:true, ...exclusions });
    } catch (error) {
      console.error("ATLAS runtime exclusions read failed",error);
      sendJson(res,client ? 500 : 503,{
        ok:false,
        schema:RUNTIME_EXCLUSIONS_SCHEMA,
        code:client ? "RUNTIME_EXCLUSIONS_READ_FAILED" : "DATABASE_UNAVAILABLE"
      });
    } finally {
      if (client && typeof client.end === "function") await client.end();
    }
  };
}

module.exports = Object.freeze({
  RUNTIME_EXCLUSIONS_SCHEMA,
  createRuntimeExclusionsReadHandler
});
