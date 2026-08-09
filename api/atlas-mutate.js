"use strict";

const { Client } = require("pg");
const { createVercelMutationHandler } = require("../server/atlas-vercel-mutation-handler.js");

async function clientFactory(connectionString) {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  return client;
}

module.exports = createVercelMutationHandler({ clientFactory });
