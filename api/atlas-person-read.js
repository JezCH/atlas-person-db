"use strict";

const { createPostgresClient } = require("../server/atlas-postgres-client.js");
const { createPersonReadHandler } = require("../server/atlas-person-read-handler.js");

module.exports = createPersonReadHandler({ clientFactory: createPostgresClient });
