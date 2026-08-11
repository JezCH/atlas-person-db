"use strict";

const { createPostgresClient } = require("../server/atlas-postgres-client.js");
const { createVercelMutationHandler } = require("../server/atlas-vercel-mutation-handler.js");

module.exports = createVercelMutationHandler({ clientFactory: createPostgresClient });
