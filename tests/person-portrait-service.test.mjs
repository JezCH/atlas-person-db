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
const OTHER_PERSON = "33333333-3333-4333-8333-333333333333";
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

function nextUuid(prefix, counter) {
  return `${prefix}-0000-4000-8000-${String(counter).padStart(12, "0")}`;
}

function createStateClient({ portrait = null, links = [] } = {}) {
  const state = {
    portrait: portrait ? { ...portrait } : null,
    links:[...links],
    assets:new Map(),
    revisions:new Map(),
    revisionSources:[],
    generations:new Map(),
    revisionCounter:0,
    generationCounter:0,
    transaction:false
  };
  const client = {
    state,
    async query(sql, params = []) {
      const text = normalizeSql(sql);
      if (text.startsWith("begin")) { state.transaction = true; return { rowCount:0, rows:[] }; }
      if (text === "commit") { state.transaction = false; return { rowCount:0, rows:[] }; }
      if (text === "rollback") { state.transaction = false; return { rowCount:0, rows:[] }; }
      if (text.startsWith("select pg_advisory_xact_lock")) return { rowCount:1, rows:[{}] };
      if (text.startsWith("select to_regclass('atlas_v2.person_portrait_assets')")) {
        return {
          rowCount:1,
          rows:[{
            assets:"atlas_v2.person_portrait_assets",
            generation_runs:"atlas_v2.person_portrait_generation_runs",
            revisions:"atlas_v2.person_portrait_revisions",
            revision_sources:"atlas_v2.person_portrait_revision_sources",
            current_revision_column:true
          }]
        };
      }
      if (text.startsWith("select id::text from atlas_v2.persons")) {
        return params[0] === PERSON ? { rowCount:1, rows:[{ id:PERSON }] } : { rowCount:0, rows:[] };
      }
      if (text.startsWith("select person_id::text,asset_sha256,portrait_kind,evidence_level, current_revision_id::text,updated_at from atlas_v2.person_portraits")) {
        return state.portrait ? { rowCount:1, rows:[state.portrait] } : { rowCount:0, rows:[] };
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
      if (text.startsWith("select source_id::text,evidence_role from atlas_v2.person_portrait_sources")) {
        return { rowCount:state.links.length, rows:state.links.map((row) => ({ ...row })) };
      }
      if (text.startsWith("select id::text from atlas_v2.sources where id=any")) {
        return { rowCount:params[0].length, rows:params[0].map((id) => ({ id })) };
      }
      if (text.startsWith("select person_id::text from ( select person_id,asset_sha256 from atlas_v2.person_portraits")) {
        const [personId, sha] = params;
        const owner = [];
        if (state.portrait?.asset_sha256 === sha && state.portrait.person_id !== personId) owner.push(state.portrait.person_id);
        for (const revision of state.revisions.values()) {
          if (revision.asset_sha256 === sha && revision.person_id !== personId) owner.push(revision.person_id);
        }
        return owner.length ? { rowCount:1, rows:[{ person_id:owner.sort()[0] }] } : { rowCount:0, rows:[] };
      }
      if (text.startsWith("insert into atlas_v2.person_portrait_assets")) {
        const [sha,,bytes] = params.length === 3 ? params : [params[0], "image/webp", params[1]];
        if (!state.assets.has(sha)) state.assets.set(sha, { asset_sha256:sha, media_type:"image/webp", bytes:bytes ?? null });
        return { rowCount:1, rows:[] };
      }
      if (text.startsWith("select asset_sha256,media_type,bytes from atlas_v2.person_portrait_assets")) {
        const row = state.assets.get(params[0]);
        return row ? { rowCount:1, rows:[row] } : { rowCount:0, rows:[] };
      }
      if (text.startsWith("update atlas_v2.person_portrait_assets set bytes=")) {
        const row = state.assets.get(params[0]);
        if (row && row.bytes == null) row.bytes = params[1];
        return { rowCount:row ? 1 : 0, rows:[] };
      }
      if (text.startsWith("insert into atlas_v2.person_portrait_generation_runs")) {
        state.generationCounter += 1;
        const id = nextUuid("aaaaaaaa", state.generationCounter);
        state.generations.set(id, {
          id,
          person_id:params[0],
          asset_sha256:params[1],
          generator_provider:params[2],
          generator_model:params[3],
          prompt_template_version:params[4],
          portrait_standard_version:params[5],
          request_sha256:params[6],
          generation_spec:JSON.parse(params[7]),
          status:"accepted",
          review_notes:params[8] ?? null
        });
        return { rowCount:1, rows:[{ id }] };
      }
      if (text.startsWith("insert into atlas_v2.person_portrait_revisions")) {
        state.revisionCounter += 1;
        const id = nextUuid("bbbbbbbb", state.revisionCounter);
        state.revisions.set(id, {
          id,
          person_id:params[0],
          asset_sha256:params[1],
          portrait_kind:params[2],
          evidence_level:params[3],
          creation_method:params[4],
          portrait_standard_version:params[5],
          generation_run_id:params[6] ?? null,
          reconstruction_notes:params[7] ?? null,
          supersedes_revision_id:params[8] ?? null,
          created_at:new Date("2026-09-21T00:00:00Z")
        });
        return { rowCount:1, rows:[{ id }] };
      }
      if (text.startsWith("insert into atlas_v2.person_portrait_revision_sources")) {
        state.revisionSources.push({ revision_id:params[0], source_id:params[1], evidence_role:params[2] });
        return { rowCount:1, rows:[] };
      }
      if (text.startsWith("select id::text,person_id::text,asset_sha256,portrait_kind,evidence_level,")) {
        const row = state.revisions.get(params[0]);
        return row ? { rowCount:1, rows:[row] } : { rowCount:0, rows:[] };
      }
      if (text.startsWith("update atlas_v2.person_portraits set current_revision_id=")) {
        if (!state.portrait || state.portrait.current_revision_id) return { rowCount:0, rows:[] };
        state.portrait.current_revision_id = params[1];
        return { rowCount:1, rows:[{ current_revision_id:params[1] }] };
      }
      if (text.startsWith("insert into atlas_v2.person_portraits(")) {
        state.portrait = {
          person_id:params[0],
          asset_sha256:params[1],
          portrait_kind:params[2],
          evidence_level:params[3],
          current_revision_id:params[4],
          updated_at:new Date("2026-09-21T01:00:00Z")
        };
        return { rowCount:1, rows:[] };
      }
      if (text.startsWith("update atlas_v2.person_portraits set portrait_kind=")) {
        if (!state.portrait) return { rowCount:0, rows:[] };
        state.portrait = {
          ...state.portrait,
          portrait_kind:params[1],
          evidence_level:params[2],
          current_revision_id:params[3],
          updated_at:new Date("2026-09-21T02:00:00Z")
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
            current_revision_id:state.portrait?.current_revision_id ?? null,
            updated_at:state.portrait?.updated_at ?? null
          }]
        };
      }
      if (text.startsWith("select (select count(*)::int from atlas_v2.person_portraits")) {
        const sha = params[0];
        const currentCount = state.portrait?.asset_sha256 === sha ? 1 : 0;
        const revisionCount = [...state.revisions.values()].filter((row) => row.asset_sha256 === sha).length;
        const generationCount = [...state.generations.values()].filter((row) => row.asset_sha256 === sha).length;
        return { rowCount:1, rows:[{
          current_count:currentCount,
          revision_count:revisionCount,
          generation_count:generationCount
        }] };
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

function storageHarness() {
  const removed = [];
  return {
    removed,
    storage:{
      async put(sha) { return { created:true, asset:{ pathname:`portraits/${sha}.webp` } }; },
      async remove(sha) { removed.push(sha); return { deleted:true }; },
      publicUrl:(sha) => `https://blob.example/portraits/${sha}.webp`
    }
  };
}

test("portrait write payload defaults manual reconstruction metadata and computes immutable sha256", () => {
  const bytes = webpBytes();
  const normalized = normalizeWritePayload({
    person_id:PERSON,
    image_base64:bytes.toString("base64"),
    portrait_kind:"reconstruction",
    evidence_level:"strong",
    sources:[{ source_id:SOURCE, evidence_role:"facial_reference" }]
  });
  assert.equal(normalized.asset_sha256, crypto.createHash("sha256").update(bytes).digest("hex"));
  assert.equal(normalized.creation_method, "human_reconstruction");
  assert.equal(normalized.portrait_standard_version, "atlas-portrait-standard/v1");
  assert.equal(normalized.generation, null);
});

test("portrait write payload accepts reproducible AI provenance without making generation canonical by itself", () => {
  const bytes = webpBytes("ai");
  const normalized = normalizeWritePayload({
    person_id:PERSON,
    image_base64:bytes.toString("base64"),
    portrait_kind:"reconstruction",
    evidence_level:"contextual",
    sources:[],
    generation:{
      generator_provider:"openai",
      generator_model:"image-model",
      prompt_template_version:"portrait-prompt/v1",
      generation_spec:{ era:"classical", seed:17 }
    }
  });
  assert.equal(normalized.creation_method, "ai_generated");
  assert.match(normalized.generation.request_sha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(normalized.generation.generation_spec, { era:"classical", seed:17 });
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

test("portrait read returns current projection and revision pointer", async () => {
  const SHA = "a".repeat(64);
  const client = createStateClient({
    portrait:{
      person_id:PERSON,
      asset_sha256:SHA,
      portrait_kind:"artwork",
      evidence_level:"direct",
      current_revision_id:"bbbbbbbb-0000-4000-8000-000000000001",
      updated_at:new Date("2026-09-20T00:00:00Z")
    },
    links:[{ source_id:SOURCE, evidence_role:"facial_reference" }]
  });
  const result = await readPersonPortrait({
    client,
    personId:PERSON,
    storage:{ publicUrl:(sha) => `https://blob.example/portraits/${sha}.webp` }
  });
  assert.equal(result.found, true);
  assert.equal(result.portrait.current_revision_id, "bbbbbbbb-0000-4000-8000-000000000001");
  assert.equal(result.portrait.sources[0].source_id, SOURCE);
});

test("portrait PUT atomically creates asset ledger, approved revision, revision evidence and current projection", async () => {
  const client = createStateClient();
  const { storage, removed } = storageHarness();
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
  assert.ok(result.revision_id);
  assert.equal(client.state.assets.size, 1);
  assert.equal(client.state.revisions.size, 1);
  assert.equal(client.state.revisionSources.length, 1);
  assert.equal(client.state.portrait.current_revision_id, result.revision_id);
  assert.equal(client.state.revisions.get(result.revision_id).creation_method, "human_reconstruction");
  assert.deepEqual(removed, []);
});

test("AI-backed PUT records accepted generation provenance before advancing the current projection", async () => {
  const client = createStateClient();
  const { storage } = storageHarness();
  const service = createPersonPortraitService({ client, storage });
  const result = await service.put({
    person_id:PERSON,
    image_base64:webpBytes("generated").toString("base64"),
    portrait_kind:"reconstruction",
    evidence_level:"contextual",
    creation_method:"ai_generated",
    generation:{
      generator_provider:"openai",
      generator_model:"image-model",
      prompt_template_version:"portrait-prompt/v1",
      generation_spec:{ attire:"period-reviewed" }
    },
    sources:[]
  });
  assert.ok(result.generation_run_id);
  assert.equal(client.state.generations.size, 1);
  const revision = client.state.revisions.get(result.revision_id);
  assert.equal(revision.generation_run_id, result.generation_run_id);
  assert.equal(client.state.generations.get(result.generation_run_id).status, "accepted");
});

test("legacy current portrait is promoted to legacy_unknown revision before an idempotent replay", async () => {
  const SHA = crypto.createHash("sha256").update(webpBytes("legacy")).digest("hex");
  const client = createStateClient({
    portrait:{
      person_id:PERSON,
      asset_sha256:SHA,
      portrait_kind:"artwork",
      evidence_level:"direct",
      current_revision_id:null,
      updated_at:new Date()
    },
    links:[{ source_id:SOURCE, evidence_role:"facial_reference" }]
  });
  const { storage } = storageHarness();
  storage.put = async () => ({ created:false });
  const service = createPersonPortraitService({ client, storage });
  const result = await service.put({
    person_id:PERSON,
    image_base64:webpBytes("legacy").toString("base64"),
    portrait_kind:"artwork",
    evidence_level:"direct",
    sources:[{ source_id:SOURCE, evidence_role:"facial_reference" }]
  });
  assert.equal(result.replay, true);
  assert.equal(client.state.revisions.size, 1);
  const revision = client.state.revisions.get(result.revision_id);
  assert.equal(revision.creation_method, "legacy_unknown");
  assert.equal(revision.portrait_standard_version, "atlas-portrait-standard/legacy-v1");
  assert.equal(client.state.portrait.current_revision_id, result.revision_id);
});

test("metadata PATCH appends a new revision and keeps the prior revision immutable", async () => {
  const SHA = "c".repeat(64);
  const client = createStateClient({
    portrait:{
      person_id:PERSON,
      asset_sha256:SHA,
      portrait_kind:"artwork",
      evidence_level:"direct",
      current_revision_id:null,
      updated_at:new Date()
    },
    links:[{ source_id:SOURCE, evidence_role:"facial_reference" }]
  });
  const { storage } = storageHarness();
  storage.put = async () => { throw new Error("patch must not upload"); };
  const service = createPersonPortraitService({ client, storage });
  const result = await service.patch({
    person_id:PERSON,
    portrait_kind:"reconstruction",
    evidence_level:"strong",
    sources:[{ source_id:SOURCE, evidence_role:"context_reference" }]
  });
  assert.equal(result.replay, false);
  assert.equal(client.state.revisions.size, 2);
  const current = client.state.revisions.get(result.revision_id);
  assert.ok(current.supersedes_revision_id);
  assert.equal(client.state.revisions.get(current.supersedes_revision_id).portrait_kind, "artwork");
  assert.equal(current.portrait_kind, "reconstruction");
});

test("DELETE removes only the current projection and deliberately retains revision history and Blob", async () => {
  const SHA = "d".repeat(64);
  const client = createStateClient({
    portrait:{
      person_id:PERSON,
      asset_sha256:SHA,
      portrait_kind:"symbolic",
      evidence_level:"symbolic",
      current_revision_id:null,
      updated_at:new Date()
    }
  });
  const { storage, removed } = storageHarness();
  storage.put = async () => { throw new Error("not used"); };
  const service = createPersonPortraitService({ client, storage });
  const result = await service.remove(PERSON);
  assert.equal(result.committed, true);
  assert.equal(result.replay, false);
  assert.ok(result.retained_revision_id);
  assert.equal(client.state.portrait, null);
  assert.equal(client.state.revisions.size, 1);
  assert.deepEqual(removed, []);
  assert.equal(result.storage_cleanup.retained_by_history, true);

  const second = await service.remove(PERSON);
  assert.equal(second.replay, true);
});

test("portrait metadata patch fails closed when no portrait exists", async () => {
  const client = createStateClient();
  const { storage } = storageHarness();
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

test("exact asset reuse across another Person revision requires duplicate review", async () => {
  const bytes = webpBytes("duplicate");
  const sha = crypto.createHash("sha256").update(bytes).digest("hex");
  const client = createStateClient();
  client.state.revisions.set("bbbbbbbb-0000-4000-8000-999999999999", {
    id:"bbbbbbbb-0000-4000-8000-999999999999",
    person_id:OTHER_PERSON,
    asset_sha256:sha
  });
  const { storage } = storageHarness();
  const service = createPersonPortraitService({ client, storage });
  await assert.rejects(
    service.put({
      person_id:PERSON,
      image_base64:bytes.toString("base64"),
      portrait_kind:"artwork",
      evidence_level:"direct",
      sources:[]
    }),
    (error) => error?.code === "PERSON_PORTRAIT_ASSET_DUPLICATE_REVIEW_REQUIRED"
  );
});
