"use strict";

const { createPostgresClient } = require("../server/atlas-postgres-client.js");
const { createAdminSystemStatusHandler } = require("../server/atlas-admin-system-status-handler.js");

module.exports = createAdminSystemStatusHandler({ clientFactory: createPostgresClient });
