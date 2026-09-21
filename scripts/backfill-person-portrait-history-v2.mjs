import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createPostgresClient } = require("../server/atlas-postgres-client.js");
const {
  assertPortraitHistorySchema,
  backfillLegacyPortraitHistoryBatch
} = require("../server/atlas-person-portrait-history.js");

function argValue(name, fallback = null) {
  const prefix = `--${name}=`;
  const token = process.argv.slice(2).find((item) => item.startsWith(prefix));
  return token ? token.slice(prefix.length) : fallback;
}

const execute = process.argv.slice(2).includes("--execute");
const batchSize = Math.max(1, Math.min(1000, Number(argValue("batch-size", "200")) || 200));
const databaseUrl = String(process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || "").trim();
if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) {
  throw new Error("SUPABASE_DB_URL or DATABASE_URL is required");
}

const client = await createPostgresClient(databaseUrl);
try {
  await assertPortraitHistorySchema(client);
  const before = await client.query(`
    select count(*)::int as count
      from atlas_v2.person_portraits
     where current_revision_id is null`);
  const pendingBefore = Number(before.rows?.[0]?.count || 0);

  if (!execute) {
    console.log(JSON.stringify({
      schema:"atlas-person-portrait-history-backfill/v1",
      dry_run:true,
      pending:pendingBefore,
      batch_size:batchSize,
      database_write_committed:false
    }, null, 2));
    process.exitCode = pendingBefore > 0 ? 2 : 0;
  } else {
    let backfilled = 0;
    let remaining = pendingBefore;
    let batches = 0;
    while (remaining > 0) {
      const result = await backfillLegacyPortraitHistoryBatch(client, { limit:batchSize });
      batches += 1;
      backfilled += result.backfilled;
      remaining = result.remaining;
      if (result.scanned === 0 && remaining > 0) {
        throw new Error("PERSON_PORTRAIT_HISTORY_BACKFILL_STALLED");
      }
    }
    console.log(JSON.stringify({
      schema:"atlas-person-portrait-history-backfill/v1",
      dry_run:false,
      pending_before:pendingBefore,
      backfilled,
      remaining,
      batches,
      database_write_committed:backfilled > 0
    }, null, 2));
  }
} finally {
  await client.end();
}
