"use strict";

const { Client } = require("pg");

function normalizePem(value) {
  const text = String(value || "").trim();
  return text ? text.replace(/\\n/g, "\n") : null;
}

function postgresSslOptions(env = process.env) {
  const ca = normalizePem(env?.SUPABASE_DB_CA);
  if (ca) {
    return Object.freeze({ ca, rejectUnauthorized: true });
  }
  // Backward-compatible transition mode for the already deployed connection string.
  // Set SUPABASE_DB_CA to enable certificate verification without changing callers.
  return Object.freeze({ rejectUnauthorized: false });
}

async function createPostgresClient(connectionString, { env = process.env } = {}) {
  const client = new Client({
    connectionString,
    ssl: postgresSslOptions(env)
  });
  await client.connect();
  return client;
}

module.exports = Object.freeze({ createPostgresClient, postgresSslOptions, normalizePem });
