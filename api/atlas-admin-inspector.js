"use strict";

const { createPostgresClient } = require("../server/atlas-postgres-client.js");
const { createAdminInspectorHandler } = require("../server/atlas-admin-inspector-handler.js");

module.exports = createAdminInspectorHandler({ clientFactory: createPostgresClient });
