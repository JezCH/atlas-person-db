import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createPostgresClient } = require('../server/atlas-postgres-client.js');
const { createAuthoringManifestService } = require('../server/atlas-authoring-manifest-service.js');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function applyManifest({ manifestPath, databaseUrl, migrationPath = path.join(root, 'db/migrations/20260811_authoring_manifest_runs.sql') } = {}) {
  const resolvedManifest = path.resolve(root, String(manifestPath || ''));
  const allowedRoot = path.resolve(root, 'authoring/requests') + path.sep;
  if (!resolvedManifest.startsWith(allowedRoot) || path.extname(resolvedManifest) !== '.json') throw new Error('AUTHORING_MANIFEST_PATH_NOT_ALLOWED');
  if (!/^postgres(?:ql)?:\/\//.test(String(databaseUrl || ''))) throw new Error('SUPABASE_DB_URL is required');

  const manifest = JSON.parse(fs.readFileSync(resolvedManifest, 'utf8'));
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  const client = await createPostgresClient(databaseUrl);
  try {
    await client.query(migrationSql);
    const outcome = await createAuthoringManifestService({ client }).apply(manifest);
    if (outcome?.committed !== true) throw new Error('AUTHORING_MANIFEST_NOT_COMMITTED');
    return outcome;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const manifestPath = process.argv[2] || process.env.ATLAS_AUTHORING_MANIFEST;
  const outcome = await applyManifest({ manifestPath, databaseUrl: process.env.SUPABASE_DB_URL });
  process.stdout.write(`${JSON.stringify(outcome, null, 2)}\n`);
}
