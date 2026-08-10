"use strict";

const { Client } = require("pg");
const { createDuplicateReviewHandler } = require("../server/atlas-duplicate-review-handler.js");

async function clientFactory(connectionString) {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  return client;
}

module.exports = createDuplicateReviewHandler({ clientFactory });
