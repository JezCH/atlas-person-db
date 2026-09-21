import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  normalizeWritePayload,
  readPersonPortrait,
  createPersonPortraitService
} = require("../server/atlas-person-portrait-service.js");

const PERSON = "11111111-1111-4111-8111-111111111111";
const SOURCE = "22222222-2222-4222-8222-222222222222";

function webpBytes(text = "portrait") {
  return Buffer.concat([
    Buffer.from("RIFF", "ascii"),
    Buffer.from([0,0,0,0]),
    Buffer.from("WEBP", "ascii"),
    Buffer.from(text)
  ]);
}

function normalizeSql(sql) {
  return String(sql).replace(/\s+/g, " ").trim().toLowerCase();
}

function createStateClient({ portrait = null, links = [] } = {}) {
  const state = { portrait, links:[...links], transaction:false };
  const client = {
    state,
    async query(sql, params = []) {
      const text = normalizeSql(sql);
      if (text.startsWith("begin")) { state.transaction = true; return { rowCount:0, rows:[] }; }
      if (text === "commit") { state.transaction = false; return { rowCount:0, rows:[] }; }
      if (text === "rollback") { state.transaction = false; return { rowCount:0, rows:[] }; }
      if (text.startsWith("select pg_advisory_xact_lock")) return { rowCount:1, rows:[{}] };
      if (text.startsWith("select id::text from atlas_v2.persons")) {
        return params[0] === PERSON ? { rowCount:1, rows:[{ id:PERSON }] } : { rowCount:0, rows:[] };
      }
      if (text.startsWith("select person_id::text,asset_sha256,portrait_kind,evidence_level,updated_at from atlas_v2.person_portraits")) {
        return state.portrait ? { rowCount:1, rows:[state.portrait] } : { rowCount:0, rows:[] };
      }
      if (text.startsWith("select person_id::text from atlas_v2.person_portraits where asset_sha256=")) {
        return { rowCount:0, rows:[] };
      }
      if (text.startsWith("select id::text from atlas_v2.sources where id=any")) {
        return { rowCount:params[0].length, rows:params[0].map((id) => ({ id })) };
      }
      if (text.startsWith("select pps.source_id::text,pps.evidence_role")) {
        return {
          rowCount:state.links.length,
          rows:state.links.map((row) => ({
            ...row,
            source_type:"web",
            title:"Evidence",
            canonical_url:"https://example.com/source",
            citation_text:"Evidence"
          }))
        };
      }
      if (text.startsWith("insert into atlas_v2.person_portraits")) {
        state.portrait = {
          person_id:params[0],
          asset_sha256:params[1],
          portrait_kind:params[2],
          evidence_level:params[3],
          updated_at:new Date("2026-09-20T00:00:00Z")
        };
        return { rowCount:1, rows:[] };
      }
      if (text.startsWith("update atlas_v2.person_portraits set portrait_kind=")) {
        if (!state.portrait) return { rowCount:0, rows:[] };
        state.portrait = {
          ...state.portrait,
          portrait_kind:params[1],
          evidence_level:params[2],
          updated_at:new Date("2026-09-20T01:00:00Z")
        };
        return { rowCount:1, rows:[{ person_id:params[0] }] };
      }
      if (text.startsWith("delete from atlas_v2.person_portrait_sources")) {
        state.links = [];
        return { rowCount:1, rows:[] };
      }
      if (text.startsWith("insert into atlas_v2.person_portrait_sources")) {
        state.links.push({ source_id:params[1], evidence_role:params[2] });
        return { rowCount:1, rows:[] };
      }
      if (text.startsWith("select p.id::text as person_id,")) {
        if (params[0] !== PERSON) return { rowCount:0, rows:[] };
        return {
          rowCount:1,
          rows:[{
            person_id:PERSON,
            asset_sha256:state.portrait?.asset_sha256 ?? null,
            portrait_kind:state.portrait?.portrait_kind ?? null,
            evidence_level:state.portrait?.evidence_level ?? null,
            updated_at:state.portrait?.updated_at ?? null
          }]
        };
      }
      if (text.startsWith("select count(*)::int as count from atlas_v2.person_portraits")) {
        return { rowCount:1, rows:[{ count:state.portrait?.asset_sha256 === params[0] ? 1 : 0 }] };
      }
      if (text.startsWith("delete from atlas_v2.person_portraits")) {
        const existed = Boolean(state.portrait);
        state.portrait = null;
        state.links = [];
        return { rowCount:existed ? 1 : 0, rows:existed ? [{ person_id:PERSON }] : [] };
      }
      throw new Error(`Unexpected SQL: ${text}`);
    }
  };
  return client;
}

test("portrait write payload accepts canonical WebP bytes and computes immutable sha256", () => {
  const bytes = webpBytes();
  const normalized = normalizeWritePayload({
    person_id:PERSON,
    image_base64:bytes.toString("base64"),
    portrait_kind:"reconstruction",
    evidence_level:"strong",
    sources:[{ source_id:SOURCE, evidence_role:"facial_reference" }]
  });
  assert.equal(normalized.asset_sha256, crypto.createHash("sha256").update(bytes).digest("hex"));
  assert.equal(normalized.bytes.equals(bytes), true);
  assert.deepEqual(normalized.sources, [{ source_id:SOURCE, evidence_role:"facial_reference" }]);
});

test("portrait write payload rejects bytes that are not WebP", () => {
  const pngLike = Buffer.from("not-a-webp");
  assert.throws(
    () => normalizeWritePayload({
      person_id:PERSON,
      image_base64:pngLike.toString("base64"),
      portrait_kind:"artwork",
      evidence_level:"direct",
      sources:[]
    }),
    /PERSON_PORTRAIT_WEBP_REQUIRED/
  );
});

test("portrait read returns canonical metadata, deterministic asset location and provenance", async () => {
  const SHA = "a".repeat(64);
  const client = createStateClient({
    portrait:{ person_id:PERSON, asset_sha256:SHA, portrait_kind:"artwork", evidence_level:"direct", updated_at:new Date("2026-09-20T00:00:00Z") },
    links:[{ source_id:SOURCE, evidence_role:"facial_reference" }]
  });
  const result = await readPersonPortrait({
    client,
    personId:PERSON,
    storage:{ publicUrl:(sha) => `https://blob.example/portraits/${sha}.webp` }
  });
  assert.equal(result.found, true);
  assert.equal(result.portrait.asset_pathname, `portraits/${SHA}.webp`);
  assert.equal(result.portrait.asset_url, `https://blob.example/portraits/${SHA}.webp`);
  assert.equal(result.portrait.sources[0].source_id, SOURCE);
});

test("portrait service uploads then atomically writes and verifies canonical portrait state", async () => {
  const client = createStateClient();
  const removed = [];
  const storage = {
    async put(sha) { return { created:true, asset:{ pathname:`portraits/${sha}.webp` } }; },
    async remove(sha) { removed.push(sha); return { deleted:true }; },
    publicUrl:(sha) => `https://blob.example/portraits/${sha}.webp`
  };
  const service = createPersonPortraitService({ client, storage });
  const bytes = webpBytes("new");
  const result = await service.put({
    person_id:PERSON,
    image_base64:bytes.toString("base64"),
    portrait_kind:"reconstruction",
    evidence_level:"strong",
    sources:[{ source_id:SOURCE, evidence_role:"context_reference" }]
  });
  assert.equal(result.committed, true);
  assert.equal(result.replay, false);
  assert.equal(result.storage_created, true);
  assert.equal(result.portrait.portrait_kind, "reconstruction");
  assert.equal(result.portrait.sources[0].evidence_role, "context_reference");
  assert.deepEqual(removed, []);
});

test("portrait service delete is idempotent and cleans the old content-addressed asset after commit", async () => {
  const SHA = "b".repeat(64);
  const client = createStateClient({
    portrait:{ person_id:PERSON, asset_sha256:SHA, portrait_kind:"symbolic", evidence_level:"symbolic", updated_at:new Date() }
  });
  const removed = [];
  const storage = {
    async put() { throw new Error("not used"); },
    async remove(sha) { removed.push(sha); return { deleted:true }; },
    publicUrl:() => null
  };
  const service = createPersonPortraitService({ client, storage });
  const first = await service.remove(PERSON);
  assert.equal(first.committed, true);
  assert.equal(first.replay, false);
  assert.deepEqual(removed, [SHA]);
  const second = await service.remove(PERSON);
  assert.equal(second.replay, true);
  assert.deepEqual(removed, [SHA]);
});


test("portrait metadata patch updates kind, evidence and provenance without touching Blob storage", async () => {
  const SHA = "c".repeat(64);
  const client = createStateClient({
    portrait:{ person_id:PERSON, asset_sha256:SHA, portrait_kind:"artwork", evidence_level:"direct", updated_at:new Date() },
    links:[{ source_id:SOURCE, evidence_role:"facial_reference" }]
  });
  let putCalls = 0;
  let removeCalls = 0;
  const storage = {
    async put() { putCalls += 1; throw new Error("metadata patch must not upload"); },
    async remove() { removeCalls += 1; throw new Error("metadata patch must not delete"); },
    publicUrl:(sha) => `https://blob.example/portraits/${sha}.webp`
  };
  const service = createPersonPortraitService({ client, storage });
  const result = await service.patch({
    person_id:PERSON,
    portrait_kind:"reconstruction",
    evidence_level:"strong",
    sources:[{ source_id:SOURCE, evidence_role:"context_reference" }]
  });
  assert.equal(result.committed, true);
  assert.equal(result.replay, false);
  assert.equal(result.storage_unchanged, true);
  assert.equal(result.portrait.asset_sha256, SHA);
  assert.equal(result.portrait.portrait_kind, "reconstruction");
  assert.equal(result.portrait.evidence_level, "strong");
  assert.equal(result.portrait.sources[0].evidence_role, "context_reference");
  assert.equal(putCalls, 0);
  assert.equal(removeCalls, 0);
});

test("portrait metadata patch fails closed when no portrait exists", async () => {
  const client = createStateClient();
  const storage = {
    async put() { throw new Error("not used"); },
    async remove() { throw new Error("not used"); },
    publicUrl:() => null
  };
  const service = createPersonPortraitService({ client, storage });
  await assert.rejects(
    service.patch({
      person_id:PERSON,
      portrait_kind:"symbolic",
      evidence_level:"symbolic",
      sources:[]
    }),
    /PERSON_PORTRAIT_NOT_FOUND/
  );
});
