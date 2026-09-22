"use strict";

const { requireDatabaseUrl, sendJson } = require("./atlas-read-http.js");
const {
  RECENT_DELTA_SCHEMA,
  readRecentDelta
} = require("./atlas-recent-delta-read-service.js");

function createRecentDeltaReadHandler({
  clientFactory,
  env = process.env,
  read = readRecentDelta
} = {}) {
  if (typeof clientFactory !== "function") throw new Error("clientFactory is required");
  if (typeof read !== "function") throw new Error("recent delta reader is required");

  return async function recentDeltaReadHandler(req,res) {
    if (String(req?.method || "GET").toUpperCase() !== "GET") {
      sendJson(res,405,{ ok:false, schema:RECENT_DELTA_SCHEMA, code:"METHOD_NOT_ALLOWED" });
      return;
    }
    let databaseUrl;
    try {
      databaseUrl=requireDatabaseUrl(env);
    } catch (error) {
      console.error("ATLAS recent delta configuration error",error);
      sendJson(res,503,{ ok:false, schema:RECENT_DELTA_SCHEMA, code:"SERVER_CONFIGURATION_ERROR" });
      return;
    }
    let client=null;
    try {
      client=await clientFactory(databaseUrl);
      const delta=await read(client);
      sendJson(res,200,{ ok:true, ...delta });
    } catch (error) {
      console.error("ATLAS recent delta read failed",error);
      sendJson(res,client ? 500 : 503,{
        ok:false,
        schema:RECENT_DELTA_SCHEMA,
        code:client ? "RECENT_DELTA_READ_FAILED" : "DATABASE_UNAVAILABLE"
      });
    } finally {
      if (client && typeof client.end === "function") await client.end();
    }
  };
}

module.exports = Object.freeze({
  RECENT_DELTA_SCHEMA,
  createRecentDeltaReadHandler
});
