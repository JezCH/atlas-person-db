"use strict";

const { createPostgresClient } = require("../server/atlas-postgres-client.js");
const { createIdentityHandler } = require("../server/atlas-identity-handler.js");

module.exports = createIdentityHandler({ clientFactory: createPostgresClient });
