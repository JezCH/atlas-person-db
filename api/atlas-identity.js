"use strict";

const { Client } = require("pg");
const { createIdentityHandler } = require("../server/atlas-identity-handler.js");

async function clientFactory(connectionString) {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  return client;
}

module.exports = createIdentityHandler({ clientFactory });
