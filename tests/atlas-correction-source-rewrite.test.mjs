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

const SOURCE = "b5331172-bb46-4cd9-b24d-2679803b80db";
const WRONG = "https://www.cambridge.org/core/books/abs/unforgettable-queens-of-islam/razia-sultan-of-india-queen-of-the-world-bilqis-i-jihan/08594FB96A271F2B9E256D6046E3ECA2";
const CORRECT = "https://www.cambridge.org/core/books/abs/unforgettable-queens-of-islam/razia-sultan-of-india-queen-of-the-world-bilqisi-jihan/08594FB96A271F2B9E256D6046E3ECA2";

function source(url = WRONG) {
  return {
    id: SOURCE,
    source_key: "human-authoring:authoring:razia-sultan:delhi-sultanate:1236-1240:v1:2",
    source_type: "web_bibliographic_reference",
    title: "Razia Sultan of India: Queen of the World Bilqis-i Jihan",
    sha256: null,
    bytes: null,
    canonical_url: url,
    citation_text: "Cambridge University Press, The Unforgettable Queens of Islam, chapter 4: Razia became the first and only female sultan of the Delhi Sultanate and ruled a little over three years."
  };
}

function manifest() {
  return {
    schema: MANIFEST_V1_1,
    request_id: "correction:razia-sultan:cambridge-source-url:v1",
    review_status: "approved",
    operations: [{
      type: "rewrite_source",
      source_id: SOURCE,
      expected_before: source(WRONG),
      expected_after: source(CORRECT)
    }]
  };
}

class FakeClient {
  constructor() {
    this.sources = new Map([[SOURCE, source(WRONG)]]);
    this.ledger = new Map();
    this.txSnapshot = null;
  }

  cloneState() {
    return { sources: structuredClone([...this.sources]), ledger: structuredClone([...this.ledger]) };
  }

  restoreState(state) {
    this.sources = new Map(state.sources);
    this.ledger = new Map(state.ledger);
  }

  async query(sql, params = []) {
    const raw = String(sql);
    const text = raw.trim().replace(/\s+/g, " ").toLowerCase();
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
    if (text.includes("from atlas_v2.sources") && text.includes("where id=any($1::uuid[])")) {
      const rows = params[0].map(String).map((id) => this.sources.get(id)).filter(Boolean).map((row) => structuredClone(row));
      return { rows, rowCount: rows.length };
    }
    if (text.includes("from atlas_v2.sources") && text.includes("where id=$1::uuid")) {
      const row = this.sources.get(String(params[0]));
      return { rows: row ? [structuredClone(row)] : [], rowCount: row ? 1 : 0 };
    }
    if (text.startsWith("update atlas_v2.sources")) {
      const id = String(params[0]);
      const row = this.sources.get(id);
      if (!row || row.canonical_url !== params[2]) return { rows: [], rowCount: 0 };
      row.canonical_url = String(params[1]);
      return { rows: [{ id }], rowCount: 1 };
    }
    if (text.startsWith("select (select count(*)::int from atlas_v2.person_politics_v2)")) {
      return { rows: [{ relationships: 0, relationship_sources: 0, chronology_claims: 0, relationship_descriptions: 0 }], rowCount: 1 };
    }
    throw new Error(`unexpected SQL: ${raw}`);
  }
}

test("v1.1 rewrite_source permits only an exact HTTPS canonical_url correction", () => {
  const parsed = requireV11Manifest(manifest());
  assert.equal(parsed.operations[0].type, "rewrite_source");
  assert.equal(parsed.operations[0].source_id, SOURCE);

  const nonUrlDrift = manifest();
  nonUrlDrift.operations[0].expected_after.title = "Different title";
  assert.throws(() => requireV11Manifest(nonUrlDrift), /CORRECTION_REWRITE_SOURCE_NON_URL_DRIFT/);

  const noChange = manifest();
  noChange.operations[0].expected_after.canonical_url = WRONG;
  assert.throws(() => requireV11Manifest(noChange), /CORRECTION_REWRITE_SOURCE_NO_CHANGE/);

  const insecure = manifest();
  insecure.operations[0].expected_after.canonical_url = "http://example.com/source";
  assert.throws(() => requireV11Manifest(insecure), /CORRECTION_REWRITE_SOURCE_HTTPS_URL_REQUIRED/);
});

test("rewrite_source dry-run proves exact before/after and rolls the source row back", async () => {
  const client = new FakeClient();
  const result = await createCorrectionManifestV11Service({ client }).execute(manifest(), { dryRun: true });
  assert.equal(result.marker, MARKER_V1_1);
  assert.equal(result.committed, false);
  assert.equal(result.result.sources_rewritten, 1);
  assert.equal(result.result.operations[0].source_before.canonical_url, WRONG);
  assert.equal(client.sources.get(SOURCE).canonical_url, WRONG);
  assert.equal(client.ledger.size, 0);
});

test("rewrite_source apply is ledgered and exact replay verifies the corrected live source", async () => {
  const client = new FakeClient();
  const service = createCorrectionManifestV11Service({ client });
  const first = await service.execute(manifest(), { dryRun: false });
  assert.equal(first.committed, true);
  assert.equal(first.replay, false);
  assert.equal(first.result.sources_rewritten, 1);
  assert.equal(client.sources.get(SOURCE).canonical_url, CORRECT);
  assert.equal(client.ledger.size, 1);

  const replay = await service.execute(manifest(), { dryRun: false });
  assert.equal(replay.committed, true);
  assert.equal(replay.replay, true);
  assert.equal(client.sources.get(SOURCE).canonical_url, CORRECT);
});
