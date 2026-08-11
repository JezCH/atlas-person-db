"use strict";

const { createPostgresClient } = require("../server/atlas-postgres-client.js");
const { createDuplicateReviewHandler } = require("../server/atlas-duplicate-review-handler.js");

module.exports = createDuplicateReviewHandler({ clientFactory: createPostgresClient });
