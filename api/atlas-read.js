"use strict";

const { createPostgresClient } = require("../server/atlas-postgres-client.js");
const { createNormalizedReadHandler } = require("../server/atlas-normalized-read-handler.js");

module.exports = createNormalizedReadHandler({ clientFactory: createPostgresClient });
