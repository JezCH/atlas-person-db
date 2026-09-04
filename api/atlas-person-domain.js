"use strict";

const { createPostgresClient } = require("../server/atlas-postgres-client.js");
const { createPersonDomainHandler } = require("../server/atlas-person-domain-handler.js");

module.exports = createPersonDomainHandler({ clientFactory:createPostgresClient });
