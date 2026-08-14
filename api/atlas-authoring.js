"use strict";

const { createPostgresClient } = require("../server/atlas-postgres-client.js");
const { createHumanAuthoringHandler } = require("../server/atlas-human-authoring-handler.js");

module.exports = createHumanAuthoringHandler({ clientFactory:createPostgresClient });
