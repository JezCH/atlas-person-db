"use strict";

const { Client } = require("pg");
const { createNormalizedReadHandler } = require("../server/atlas-normalized-read-handler.js");

async function clientFactory(connectionString) {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  return client;
}

module.exports = createNormalizedReadHandler({ clientFactory });
