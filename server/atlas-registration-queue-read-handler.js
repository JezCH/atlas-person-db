"use strict";

const { requireDatabaseUrl, sendJson } = require("./atlas-read-http.js");
const { readCurrentRegistrationQueue } = require("./atlas-registration-queue-read-service.js");

function createRegistrationQueueReadHandler({ clientFactory, env = process.env, readQueue = readCurrentRegistrationQueue } = {}) {
  if (typeof clientFactory !== "function") throw new Error("clientFactory is required");
  if (typeof readQueue !== "function") throw new Error("readQueue is required");

  return async function registrationQueueReadHandler(req, res) {
    if (String(req?.method || "GET").toUpperCase() !== "GET") {
      sendJson(res, 405, { ok:false, code:"METHOD_NOT_ALLOWED", error:"method not allowed" });
      return;
    }

    let databaseUrl;
    try {
      databaseUrl = requireDatabaseUrl(env);
    } catch (error) {
      sendJson(res, 503, { ok:false, code:"SERVER_CONFIGURATION_ERROR", error:"Registration queue read service is not configured" });
      return;
    }

    let client = null;
    try {
      client = await clientFactory(databaseUrl);
      const queue = await readQueue({ client });
      sendJson(res, 200, {
        ok:true,
        source:"registration-queue-current-view",
        ...queue
      });
    } catch (error) {
      console.error("ATLAS registration queue read failed", error);
      sendJson(res, client ? 500 : 503, {
        ok:false,
        code:client ? "REGISTRATION_QUEUE_READ_FAILED" : "DATABASE_UNAVAILABLE",
        error:client ? "Registration queue read failed" : "database unavailable"
      });
    } finally {
      if (client && typeof client.end === "function") await client.end();
    }
  };
}

module.exports = Object.freeze({ createRegistrationQueueReadHandler });
