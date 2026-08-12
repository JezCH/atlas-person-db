import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  MANIFEST_V1_1,
  MARKER_V1_1,
  requireV11Manifest,
  createCorrectionManifestV11Service
} = require("../server/atlas-correction-manifest-v1-1-service.js");

const RETIRE = "11111111-1111-4111-8111-111111111111";
const UPDATE = "22222222-2222-4222-8222-222222222222";
const PERSON = "33333333-3333-4333-8333-333333333333";
const POLITY = "44444444-4444-4444-8444-444444444444";
const ROLE = "55555555-5555-4555-8555-555555555555";
const BASIS = "66666666-6666-4666-8666-666666666666";

function relationship(id, start, end, notes) {
  return {
    id,
    person_id: PERSON,
    polity_id: POLITY,
    role_id: ROLE,
    period_basis_id: BASIS,
    activity_start: start,
    activity_end: end,
    confidence: "direct_asserted",
    chronology_status: "exact_as_recorded",
    legacy_source_key: `legacy:${id}`,
    notes,
    source_locator: {},
    content_hash: `hash:${id}`
  };
}

function expected(start, end, notes, id) {
  return {
    person_id: PERSON,
    polity_id: POLITY,
    role_id: ROLE,
    period_basis_id: BASIS,
    activity_start: start,
    activity_end: end,
    notes,
    legacy_source_key: `legacy:${id}`
  };
}

function manifest() {
  return {
    schema: MANIFEST_V1_1,
    request_id: "test:correction:v1.1",
    review_status: "approved",
    operations: [
      {
        type: "retire_activity",
        relationship_id: RETIRE,
        expected: expected(10, 20, "retire me", RETIRE)
      },
      {
        type: "update_activity_interval",
        relationship_id: UPDATE,
        expected_before: expected(30, 40, "extend me", UPDATE),
        expected_after: expected(30, 50, "extend me", UPDATE)
      }
    ]
  };
}

class FakeClient {
  constructor() {
    this.relationships = new Map([
      [RETIRE, relationship(RETIRE, 10, 20, "retire me")],
      [UPDATE, relationship(UPDATE, 30, 40, "extend me")]
    ]);
    this.sources = new Map([[RETIRE, [{ source_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", source_locator_key: "retire:1" }]]]);
    this.claims = new Map([[RETIRE, [{ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", claim_type: "legacy", start_year: 10, end_year: 20 }]]]);
    this.descriptions = new Map([[RETIRE, [{ id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", locale: "en", content: "retired evidence" }]]]);
    this.ledger = new Map();
    this.txSnapshot = null;
  }

  cloneState() {
    return {
      relationships: structuredClone([...this.relationships]),
      sources: structuredClone([...this.sources]),
      claims: structuredClone([...this.claims]),
      descriptions: structuredClone([...this.descriptions]),
      ledger: structuredClone([...this.ledger])
    };
  }

  restoreState(state) {
    this.relationships = new Map(state.relationships);
    this.sources = new Map(state.sources);
    this.claims = new Map(state.claims);
    this.descriptions = new Map(state.descriptions);
    this.ledger = new Map(state.ledger);
  }

  childCount(map) {
    return [...map.values()].reduce((sum, rows) => sum + rows.length, 0);
  }

  async query(sql, params = []) {
    const source = String(sql);
    const text = source.trim().replace(/\s+/g, " ").toLowerCase();

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
      return { rows: [{ correction_manifest_runs: "atlas_v2.correction_manifest_runs" }], rowCount: 1 };
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
      const rows = params[0].map(String).map((id) => this.relationships.get(id)).filter(Boolean).map(structuredClone);
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
          relationship_sources: this.childCount(this.sources),
          chronology_claims: this.childCount(this.claims),
          relationship_descriptions: this.childCount(this.descriptions)
        }],
        rowCount: 1
      };
    }
    if (text.includes("from atlas_v2.person_politics_sources") && text.includes("where person_politics_id=$1")) {
      const rows = structuredClone(this.sources.get(String(params[0])) || []);
      return { rows, rowCount: rows.length };
    }
    if (text.includes("from atlas_v2.chronology_claims") && text.includes("where person_politics_id=$1")) {
      const rows = structuredClone(this.claims.get(String(params[0])) || []);
      return { rows, rowCount: rows.length };
    }
    if (text.includes("from atlas_v2.relationship_descriptions") && text.includes("where person_politics_id=$1")) {
      const rows = structuredClone(this.descriptions.get(String(params[0])) || []);
      return { rows, rowCount: rows.length };
    }
    if (text.startsWith("delete from atlas_v2.person_politics_v2 where id=$1 returning id")) {
      const id = String(params[0]);
      const existed = this.relationships.delete(id);
      if (existed) {
        this.sources.delete(id);
        this.claims.delete(id);
        this.descriptions.delete(id);
      }
      return { rows: existed ? [{ id }] : [], rowCount: existed ? 1 : 0 };
    }
    if (text.startsWith("update atlas_v2.person_politics_v2 set activity_start=$2, activity_end=$3")) {
      const id = String(params[0]);
      const row = this.relationships.get(id);
      if (!row) return { rows: [], rowCount: 0 };
      row.activity_start = Number(params[1]);
      row.activity_end = Number(params[2]);
      return { rows: [{ id }], rowCount: 1 };
    }
    throw new Error(`unexpected SQL: ${source}`);
  }
}

test("v1.1 is deliberately bounded to coalesce, retire and interval update", () => {
  const parsed = requireV11Manifest(manifest());
  assert.equal(parsed.operations.length, 2);

  const unsupported = manifest();
  unsupported.operations[0].type = "relink_relationship";
  assert.throws(() => requireV11Manifest(unsupported), /CORRECTION_OPERATION_UNSUPPORTED/);

  const semanticRewrite = manifest();
  semanticRewrite.operations[1].expected_after.polity_id = "77777777-7777-4777-8777-777777777777";
  assert.throws(() => requireV11Manifest(semanticRewrite), /CORRECTION_UPDATE_INTERVAL_NON_TEMPORAL_DRIFT/);
});

test("v1.1 dry-run performs retirement and interval update then fully rolls back", async () => {
  const client = new FakeClient();
  const result = await createCorrectionManifestV11Service({ client }).execute(manifest(), { dryRun: true });

  assert.equal(result.marker, MARKER_V1_1);
  assert.equal(result.committed, false);
  assert.equal(result.result.relationships_removed, 1);
  assert.equal(result.result.retired_source_links, 1);
  assert.equal(result.result.retired_chronology_claims, 1);
  assert.equal(result.result.retired_relationship_descriptions, 1);
  assert.equal(client.relationships.size, 2);
  assert.equal(client.relationships.get(UPDATE).activity_end, 40);
  assert.ok(client.relationships.has(RETIRE));
  assert.equal(client.ledger.size, 0);
});

test("v1.1 apply preserves retired evidence in immutable result snapshot and replay is idempotent", async () => {
  const client = new FakeClient();
  const service = createCorrectionManifestV11Service({ client });
  const first = await service.execute(manifest(), { dryRun: false });

  assert.equal(first.committed, true);
  assert.equal(first.replay, false);
  assert.equal(client.relationships.has(RETIRE), false);
  assert.equal(client.relationships.get(UPDATE).activity_end, 50);
  assert.equal(first.result.operations[0].relationship_before.sources.length, 1);
  assert.equal(first.result.operations[0].relationship_before.chronology_claims.length, 1);
  assert.equal(first.result.operations[0].relationship_before.relationship_descriptions.length, 1);
  assert.equal(client.ledger.size, 1);

  const replay = await service.execute(manifest(), { dryRun: false });
  assert.equal(replay.replay, true);
  assert.equal(replay.committed, true);
  assert.equal(client.relationships.size, 1);
  assert.equal(client.relationships.get(UPDATE).activity_end, 50);
});
