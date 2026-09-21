"use strict";

const { requireDatabaseUrl, sendJson } = require("./atlas-read-http.js");
const {
  RUNTIME_PUBLICATION_SCHEMA,
  readRuntimePublication
} = require("./atlas-runtime-publication-read-service.js");

function createRuntimePublicationReadHandler({
  clientFactory,
  env = process.env,
  read = readRuntimePublication
} = {}) {
  if (typeof clientFactory !== "function") throw new Error("clientFactory is required");
  if (typeof read !== "function") throw new Error("runtime publication reader is required");

  return async function runtimePublicationReadHandler(req,res) {
    if (String(req?.method || "GET").toUpperCase() !== "GET") {
      sendJson(res,405,{ ok:false, schema:RUNTIME_PUBLICATION_SCHEMA, code:"METHOD_NOT_ALLOWED" });
      return;
    }
    let databaseUrl;
    try {
      databaseUrl=requireDatabaseUrl(env);
    } catch (error) {
      console.error("ATLAS runtime publication configuration error",error);
      sendJson(res,503,{ ok:false, schema:RUNTIME_PUBLICATION_SCHEMA, code:"SERVER_CONFIGURATION_ERROR" });
      return;
    }
    let client=null;
    try {
      client=await clientFactory(databaseUrl);
      const publication=await read(client);
      sendJson(res,200,{ ok:true, ...publication });
    } catch (error) {
      console.error("ATLAS runtime publication read failed",error);
      sendJson(res,client ? 500 : 503,{
        ok:false,
        schema:RUNTIME_PUBLICATION_SCHEMA,
        code:client ? "RUNTIME_PUBLICATION_READ_FAILED" : "DATABASE_UNAVAILABLE"
      });
    } finally {
      if (client && typeof client.end === "function") await client.end();
    }
  };
}

module.exports = Object.freeze({
  RUNTIME_PUBLICATION_SCHEMA,
  createRuntimePublicationReadHandler
});
