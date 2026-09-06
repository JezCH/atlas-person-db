"use strict";

const { createPostgresClient } = require("../server/atlas-postgres-client.js");
const { createRuntimeCompileHandler } = require("../server/atlas-runtime-compile-handler.js");

module.exports = createRuntimeCompileHandler({ clientFactory:createPostgresClient });
