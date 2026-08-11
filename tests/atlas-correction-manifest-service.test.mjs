import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  createCorrectionManifestService,
  requireManifest,
  MANIFEST_V1,
  MARKER
} = require("../server/atlas-correction-manifest-service.js");

const KEEP = "11111111-1111-4111-8111-111111111111";
const DROP = "22222222-2222-4222-8222-222222222222";
const PERSON = "33333333-3333-4333-8333-333333333333";
const POLITY = "44444444-4444-4444-8444-444444444444";
const ROLE = "55555555-5555-4555-8555-555555555555";
const BASIS = "66666666-6666-4666-8666-666666666666";

function relationship(id, notes, legacySourceKey) {
  return {
    id,
    person_id: PERSON,
    polity_id: POLITY,
    role_id: ROLE,
    period_basis_id: BASIS,
    activity_start: 10,
    activity_end: 20,
    confidence: "direct_asserted",
    chronology_status: "exact_as_recorded",
    legacy_source_key: legacySourceKey,
    notes,
    source_locator: null,
    content_hash: `hash-${id}`
  };
}

function expected(notes, legacySourceKey) {
  return {
    person_id: PERSON,
    polity_id: POLITY,
    role_id: ROLE,
    period_basis_id: BASIS,
    activity_start: 10,
    activity_end: 20,
    notes,
    legacy_source_key: legacySourceKey
  };
}

function manifest() {
  return {
    schema: MANIFEST_V1,
    request_id: "test:r0:duplicate:v1",
    review_status: "approved",
    operations: [{
      type: "coalesce_relationship",
      keep_relationship_id: KEEP,
      drop_relationship_id: DROP,
      expected_keep: expected("keep note", "keep-source"),
      expected_drop: expected("drop note", "drop-source")
    }]
  };
}

class FakeClient {
  constructor({ ledgerTable = true } = {}) {
    this.relationships = new Map([
      [KEEP, relationship(KEEP, "keep note", "keep-source")],
      [DROP, relationship(DROP, "drop note", "drop-source")]
    ]);
    this.relationshipSources = 2;
    this.ledgerTable = ledgerTable;
    this.ledger = new Map();
    this.txSnapshot = null;
    this.statements = [];
  }

  cloneState() {
    return {
      relationships: new Map([...this.relationships].map(([id, row]) => [id, structuredClone(row)])),
      relationshipSources: this.relationshipSources,
      ledger: new Map([...this.ledger].map(([id, row]) => [id, structuredClone(row)]))
    };
  }

  restoreState(snapshot) {
    this.relationships = snapshot.relationships;
    this.relationshipSources = snapshot.relationshipSources;
    this.ledger = snapshot.ledger;
  }

  async query(sql, params = []) {
    const source = String(sql);
    const text = source.trim().replace(/\s+/g, " ").toLowerCase();
    this.statements.push({ sql: source, params });

    if (text.startsWith("begin isolation level serializable")) {
      this.txSnapshot = this.cloneState();
      return { rows: [], rowCount: 0 };
    }
    if (text === "rollback") {
      if (this.txSnapshot) this.restoreState(this.txSnapshot);
      this.txSnapshot = null;
      return { rows: [], rowCount: 0 };
    }
    if (text === "commit") {
      this.txSnapshot = null;
      return { rows: [], rowCount: 0 };
    }
    if (text.includes("pg_advisory_xact_lock")) return { rows: [], rowCount: 1 };
    if (text.includes("to_regclass('atlas_v2.correction_manifest_runs')")) {
      return { rows: [{ correction_manifest_runs: this.ledgerTable ? "atlas_v2.correction_manifest_runs" : null }], rowCount: 1 };
    }
    if (text.includes("from atlas_v2.correction_manifest_runs") && text.includes("where request_id=$1")) {
      const row = this.ledger.get(String(params[0]));
      return { rows: row ? [structuredClone(row)] : [], rowCount: row ? 1 : 0 };
    }
    if (text.startsWith("insert into atlas_v2.correction_manifest_runs")) {
      const row = {
        request_id: String(params[0]),
        manifest_hash: String(params[1]),
        manifest_schema: String(params[2]),
        result_snapshot: JSON.parse(String(params[3])),
        applied_at: "now"
      };
      this.ledger.set(row.request_id, row);
      return { rows: [], rowCount: 1 };
    }
    if (text.includes("where id=any($1::uuid[])") && text.includes("from atlas_v2.person_politics_v2")) {
      const ids = params[0].map(String);
      const rows = ids.map((id) => this.relationships.get(id)).filter(Boolean).map(structuredClone);
      return { rows, rowCount: rows.length };
    }
    if (text.includes("from atlas_v2.person_politics_v2") && text.includes("where id=$1")) {
      const row = this.relationships.get(String(params[0]));
      return { rows: row ? [structuredClone(row)] : [], rowCount: row ? 1 : 0 };
    }
    if (text.startsWith("select (select count(*)::int from atlas_v2.person_politics_v2)")) {
      return {
        rows: [{
          relationships: this.relationships.size,
          relationship_sources: this.relationshipSources,
          chronology_claims: 0,
          relationship_descriptions: 0
        }],
        rowCount: 1
      };
    }
    if (text.includes("from atlas_v2.person_politics_sources") && text.includes("where person_politics_id=$1")) {
      return { rows: [{ source_id: `source-${params[0]}`, source_locator_key: `locator-${params[0]}` }], rowCount: 1 };
    }
    if (text.includes("from atlas_v2.chronology_claims") || text.includes("from atlas_v2.relationship_descriptions")) {
      return { rows: [], rowCount: 0 };
    }
    throw new Error(`unexpected SQL: ${source}`);
  }
}

async function fakeCoalesce(client, keepId, dropId) {
  assert.ok(client.relationships.has(keepId));
  assert.ok(client.relationships.has(dropId));
  client.relationships.delete(dropId);
  return {
    keep_relationship_id: keepId,
    drop_relationship_id: dropId,
    inserted_source_links: 1,
    collapsed_source_links: 0,
    chronology_claims_moved: 0,
    relationship_descriptions_moved: 0
  };
}

test("correction v1 accepts only reviewed exact-semantic coalesce operations", () => {
  const parsed = requireManifest(manifest());
  assert.equal(parsed.operations.length, 1);
  assert.equal(parsed.operations[0].keep_relationship_id, KEEP);

  const unsupported = manifest();
  unsupported.operations[0].type = "delete_relationship";
  assert.throws(() => requireManifest(unsupported), /CORRECTION_OPERATION_UNSUPPORTED/);

  const semanticMismatch = manifest();
  semanticMismatch.operations[0].expected_drop.polity_id = "77777777-7777-4777-8777-777777777777";
  assert.throws(() => requireManifest(semanticMismatch), /CORRECTION_COALESCE_SEMANTIC_IDENTITY_MISMATCH/);
});

test("dry-run executes the real mutation plan and rolls the transaction back", async () => {
  const client = new FakeClient({ ledgerTable: false });
  const service = createCorrectionManifestService({ client, coalesce: fakeCoalesce });
  const result = await service.execute(manifest(), { dryRun: true });

  assert.equal(result.marker, MARKER);
  assert.equal(result.dry_run, true);
  assert.equal(result.committed, false);
  assert.equal(result.replay, false);
  assert.equal(result.result.relationships_removed, 1);
  assert.equal(client.relationships.size, 2);
  assert.ok(client.relationships.has(KEEP));
  assert.ok(client.relationships.has(DROP));
  assert.equal(client.ledger.size, 0);
  assert.equal(client.statements.at(-1).sql.trim().toLowerCase(), "rollback");
});

test("apply commits one source-preserving coalesce and exact replay is idempotent", async () => {
  const client = new FakeClient({ ledgerTable: true });
  const service = createCorrectionManifestService({ client, coalesce: fakeCoalesce });
  const first = await service.execute(manifest(), { dryRun: false });

  assert.equal(first.committed, true);
  assert.equal(first.replay, false);
  assert.equal(client.relationships.size, 1);
  assert.ok(client.relationships.has(KEEP));
  assert.equal(client.relationships.has(DROP), false);
  assert.equal(client.ledger.size, 1);
  assert.equal(first.result.operations[0].drop_before.relationship.notes, "drop note");

  const replay = await service.execute(manifest(), { dryRun: false });
  assert.equal(replay.committed, true);
  assert.equal(replay.replay, true);
  assert.equal(client.relationships.size, 1);
});

test("exact before-state drift fails closed before coalesce and rolls back", async () => {
  const client = new FakeClient({ ledgerTable: false });
  client.relationships.get(KEEP).notes = "drifted note";
  let coalesceCalls = 0;
  const service = createCorrectionManifestService({
    client,
    async coalesce() { coalesceCalls += 1; throw new Error("must not run"); }
  });

  await assert.rejects(() => service.execute(manifest(), { dryRun: true }), /CORRECTION_KEEP_NOTES_DRIFT/);
  assert.equal(coalesceCalls, 0);
  assert.equal(client.relationships.size, 2);
  assert.equal(client.statements.at(-1).sql.trim().toLowerCase(), "rollback");
});
