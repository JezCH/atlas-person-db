"use strict";

const { createPostgresClient } = require("../server/atlas-postgres-client.js");
const { createHumanAuthoringHandler } = require("../server/atlas-human-authoring-handler.js");

const handler = createHumanAuthoringHandler({ clientFactory:createPostgresClient });

module.exports = async function loggedHumanAuthoringHandler(req, res) {
  const originalEnd = res.end.bind(res);
  res.end = function loggedEnd(body, ...args) {
    if (Number(res.statusCode) >= 400) {
      try {
        const failure = JSON.parse(String(body || "{}"));
        console.error("ATLAS_HUMAN_AUTHORING_FAILURE", JSON.stringify({
          status:Number(res.statusCode),
          code:failure?.code || null,
          failed_index:Number.isInteger(failure?.failed_index) ? failure.failed_index : null,
          manifest_path:failure?.manifest_path || null
        }));
      } catch {
        console.error("ATLAS_HUMAN_AUTHORING_FAILURE", JSON.stringify({ status:Number(res.statusCode), code:"UNPARSEABLE_ERROR_RESPONSE" }));
      }
    }
    return originalEnd(body, ...args);
  };
  return handler(req, res);
};
