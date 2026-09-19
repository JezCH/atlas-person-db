// Live Correction Apply replay-safety regression.
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const migrations = require("../server/atlas-correction-migrations.js");

function basenameList(paths) {
  return paths.map((entry) => path.basename(entry));
}

test("Correction Apply replays only post-Stage2 schema-safe migrations", () => {
  const fullPostStage2 = basenameList(migrations.POST_STAGE2_MIGRATION_PATHS);
  const replaySafe = basenameList(migrations.CORRECTION_APPLY_POST_STAGE2_MIGRATION_PATHS);

  assert.ok(fullPostStage2.includes("20260823_person_polity_community_reviewed_corrections.sql"));
  assert.ok(fullPostStage2.includes("20260824_person_polity_community_final_corrections.sql"));

  assert.deepEqual(replaySafe, [
    "20260822_person_politics_context_polities.sql",
    "20260906_p11_reviewed_null_relation_constraint.sql"
  ]);
  assert.ok(!replaySafe.includes("20260823_person_polity_community_reviewed_corrections.sql"));
  assert.ok(!replaySafe.includes("20260824_person_polity_community_final_corrections.sql"));
});

test("applyCorrectionMigrations never executes identity-bound historical data rewrites", async () => {
  const executed = [];
  const client = {
    async query(sql) {
      const text = String(sql);
      if (text.includes("to_regclass('atlas_v2.person_polity_relation_types')")) {
        return { rows: [{ relation_catalog: true, relation_column: true }] };
      }
      executed.push(text);
      return { rows: [], rowCount: 0 };
    }
  };

  const readFile = (migrationPath) => `SQL:${path.basename(migrationPath)}`;
  await migrations.applyCorrectionMigrations(client, { readFile });

  assert.ok(executed.some((sql) => sql.includes("20260822_person_politics_context_polities.sql")));
  assert.ok(executed.some((sql) => sql.includes("20260906_p11_reviewed_null_relation_constraint.sql")));
  assert.ok(!executed.some((sql) => sql.includes("20260823_person_polity_community_reviewed_corrections.sql")));
  assert.ok(!executed.some((sql) => sql.includes("20260824_person_polity_community_final_corrections.sql")));
});
